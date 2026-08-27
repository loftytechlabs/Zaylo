import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createDatabaseAsync, ServerRepository, ModelRepository, APIKeyRepository, DeviceRepository, MetricsRepository, LogsRepository } from '@local-ai/database';
import { ModelManager } from '@local-ai/models';
import { KeyManager } from '@local-ai/security';
import { DevicePairingManager } from '@local-ai/network';
import { InferenceService } from '@local-ai/inference';
import { ApiServer } from '@local-ai/server';
import type { InferenceRuntime, RuntimeCapabilities, RuntimeHealth, RuntimeConfig } from '@local-ai/runtimes';
import type { ChatCompletionRequest, ChatCompletionResponse, EmbeddingRequest, EmbeddingResponse, RuntimeInstance } from '@local-ai/shared';
import { createChatCompletionChunk } from '@local-ai/protocol';

class MockRuntime implements InferenceRuntime {
  public readonly id = 'mock';
  public readonly name = 'Mock Runtime';

  async detectCapabilities(): Promise<RuntimeCapabilities> {
    return {
      supportedFormats: ['gguf'],
      supportedBackends: ['cpu'],
      supportsEmbeddings: true,
      supportsStreaming: true,
      version: '1.0.0',
    };
  }

  async isInstalled(): Promise<boolean> {
    return true;
  }

  async install(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async start(config: RuntimeConfig): Promise<RuntimeInstance> {
    return {
      id: config.instanceId,
      runtimeId: this.id,
      port: config.port,
      state: 'RUNNING',
      modelPath: config.modelPath,
      modelName: config.modelName,
      gpuLayersOffloaded: config.gpuLayers,
      loadedAt: Date.now(),
    };
  }

  async stop(): Promise<void> {}

  async health(): Promise<RuntimeHealth> {
    return {
      isHealthy: true,
      state: 'RUNNING',
      modelLoaded: true,
      uptimeSeconds: 100,
    };
  }

  async *chatStream(request: ChatCompletionRequest): AsyncIterable<ChatCompletionResponse> {
    yield createChatCompletionChunk({
      id: 'chunk_1',
      model: request.model,
      delta: { role: 'assistant', content: 'Local ' },
    });
    yield createChatCompletionChunk({
      id: 'chunk_2',
      model: request.model,
      delta: { content: 'AI ' },
    });
    yield createChatCompletionChunk({
      id: 'chunk_3',
      model: request.model,
      delta: { content: 'Response.' },
      finishReason: 'stop',
    });
  }

  async embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    return {
      object: 'list',
      data: [{ object: 'embedding', index: 0, embedding: [0.1, 0.2, 0.3] }],
      model: request.model,
      usage: { prompt_tokens: 5, total_tokens: 5 },
    };
  }
}

describe('ApiServer', () => {
  let tempDbPath: string;
  let tempModelsDir: string;
  let tempRuntimeDir: string;
  let dbConn: Awaited<ReturnType<typeof createDatabaseAsync>>;
  let server: ApiServer;
  let keyManager: KeyManager;
  let port: number;

  beforeEach(async () => {
    port = 18000 + Math.floor(Math.random() * 1000);
    const tmp = os.tmpdir();
    tempDbPath = path.join(tmp, `test-srv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.sqlite`);
    tempModelsDir = path.join(tmp, `test-models-${Date.now()}`);
    tempRuntimeDir = path.join(tmp, `test-rt-${Date.now()}`);

    dbConn = await createDatabaseAsync(tempDbPath);
    const serverRepo = new ServerRepository(dbConn.raw);
    const modelRepo = new ModelRepository(dbConn.raw);
    const keyRepo = new APIKeyRepository(dbConn.raw);
    const deviceRepo = new DeviceRepository(dbConn.raw);
    const metricsRepo = new MetricsRepository(dbConn.raw);
    const logsRepo = new LogsRepository(dbConn.raw);

    const config = serverRepo.getConfig();
    config.port = port;
    config.modelsDirectory = tempModelsDir;
    config.runtimeDirectory = tempRuntimeDir;

    const modelManager = new ModelManager(modelRepo, tempModelsDir);
    keyManager = new KeyManager(keyRepo);
    const pairingManager = new DevicePairingManager(keyManager, deviceRepo);
    const inferenceService = new InferenceService(metricsRepo, logsRepo, 4);

    const mockRuntime = new MockRuntime();
    inferenceService.setRuntime(mockRuntime, 'Mock Model 7B');

    server = new ApiServer({
      config,
      inferenceService,
      modelManager,
      keyManager,
      deviceRepo,
      pairingManager,
      logsRepo,
    });

    await server.start();
  });

  afterEach(async () => {
    await server.stop();
    dbConn.close();
    try {
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
      if (fs.existsSync(tempModelsDir)) fs.rmSync(tempModelsDir, { recursive: true, force: true });
      if (fs.existsSync(tempRuntimeDir)) fs.rmSync(tempRuntimeDir, { recursive: true, force: true });
    } catch {}
  });

  it('should serve mobile and desktop web chat UI on / and /chat', async () => {
    const resRoot = await fetch(`http://127.0.0.1:${port}/`);
    expect(resRoot.status).toBe(200);
    expect(resRoot.headers.get('content-type')).toContain('text/html');
    const htmlRoot = await resRoot.text();
    expect(htmlRoot).toContain('Zaylo');
    expect(htmlRoot).toContain('chat-container');

    const resChat = await fetch(`http://127.0.0.1:${port}/chat`);
    expect(resChat.status).toBe(200);
    expect(resChat.headers.get('content-type')).toContain('text/html');
  });

  it('should respond 200 on /health', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe('ok');
    expect(data.activeModel).toBe('Mock Model 7B');
  });

  it('should list models on /v1/models', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/v1/models`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.object).toBe('list');
  });

  it('should handle OpenAI non-streaming chat completions', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'default',
        messages: [{ role: 'user', content: 'Hello' }],
        stream: false,
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.object).toBe('chat.completion');
    expect(data.choices[0].message.content).toBe('Local AI Response.');
  });

  it('should handle OpenAI streaming chat completions with SSE', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'default',
        messages: [{ role: 'user', content: 'Hello stream' }],
        stream: true,
      }),
    });

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');

    const text = await res.text();
    expect(text).toContain('data:');
    expect(text).toContain('[DONE]');
    expect(text).toContain('Local');
    expect(text).toContain('Response.');
  });

  it('should require authentication when LAN mode is enabled and request lacks key', async () => {
    server.updateConfig({ lanEnabled: true });

    // Unauthorized request
    const unauthedRes = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'default',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    });
    expect(unauthedRes.status).toBe(401);

    // Authorized request with generated key
    const { rawKey } = keyManager.generateKey('Test Key');
    const authedRes = await fetch(`http://127.0.0.1:${port}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${rawKey}`,
      },
      body: JSON.stringify({
        model: 'default',
        messages: [{ role: 'user', content: 'Hello authed' }],
      }),
    });
    expect(authedRes.status).toBe(200);
  });
});
