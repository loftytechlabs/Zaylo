import { spawn, ChildProcess, execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import {
  AppError,
  RuntimeInstance,
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
} from '@local-ai/shared';
import {
  InferenceRuntime,
  RuntimeCapabilities,
  RuntimeConfig,
  RuntimeHealth,
  ProcessSupervisor,
} from '@local-ai/runtimes';
import { LlamaBinaryManager } from './binary.js';

export class LlamaRuntime implements InferenceRuntime {
  public readonly id = 'llama.cpp';
  public readonly name = 'llama.cpp Native Engine';

  private supervisor: ProcessSupervisor;
  private childProcess?: ChildProcess;
  private binaryPath?: string;
  private currentConfig?: RuntimeConfig;
  private startTime?: number;

  constructor(private runtimeDir: string) {
    this.supervisor = new ProcessSupervisor();
  }

  public getSupervisor(): ProcessSupervisor {
    return this.supervisor;
  }

  public async detectCapabilities(): Promise<RuntimeCapabilities> {
    const isWin = process.platform === 'win32';
    const isMac = process.platform === 'darwin';
    const backends: string[] = ['cpu'];
    if (isMac) backends.push('metal');
    if (!isMac && !isWin) backends.push('cuda');

    return {
      supportedFormats: ['gguf'],
      supportedBackends: backends,
      supportsEmbeddings: true,
      supportsStreaming: true,
      version: 'b4800',
    };
  }

  public async isInstalled(): Promise<boolean> {
    const binManager = new LlamaBinaryManager(this.runtimeDir);
    const found = await binManager.findBinary();
    return Boolean(found);
  }

  public async install(): Promise<{ success: boolean; path?: string; error?: string }> {
    const binManager = new LlamaBinaryManager(this.runtimeDir);
    return binManager.install();
  }

  public async start(config: RuntimeConfig): Promise<RuntimeInstance> {
    if (!this.binaryPath) {
      const binManager = new LlamaBinaryManager(this.runtimeDir);
      const found = await binManager.findBinary();
      if (!found) {
        throw new AppError('llama-server binary is not installed or could not be found.', 'RUNTIME_NOT_FOUND');
      }
      this.binaryPath = found;
    }

    if (this.childProcess) {
      await this.stop();
    }

    this.currentConfig = config;
    const contextLength = config.lowMemoryMode
      ? Math.min(config.contextSize || 2048, 2048)
      : (config.contextSize || 4096);

    const resolvedModelPath = path.resolve(config.modelPath);
    const args = [
      '-m', resolvedModelPath,
      '-c', String(contextLength),
      '-ngl', String(config.gpuLayers),
      '-t', String(config.threads),
      '--host', '127.0.0.1',
      '--port', String(config.port),
      '--metrics',
    ];

    if (config.lowMemoryMode) {
      args.push('-fa');
      args.push('-ctk', 'q8_0');
      args.push('-ctv', 'q8_0');
    } else if (config.flashAttention !== false) {
      args.push('-fa');
    }

    this.supervisor.setState('STARTING');

    return new Promise<RuntimeInstance>((resolve, reject) => {
      let started = false;
      const recentStderr: string[] = [];

      const timeoutTimer = setTimeout(() => {
        if (!started) {
          this.stop();
          const detail = recentStderr.slice(-5).join(' ');
          const err = new AppError(`llama-server startup timed out after 30 seconds. ${detail}`, 'RUNTIME_TIMEOUT');
          this.supervisor.setState('ERROR');
          reject(err);
        }
      }, 30000);

      try {
        const binDir = path.dirname(this.binaryPath!);
        const child = spawn(this.binaryPath!, args, {
          cwd: binDir,
          stdio: ['ignore', 'pipe', 'pipe'],
          env: {
            ...process.env,
            PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}`,
            GGML_METAL_PATH_RESOURCES: this.binaryPath ? this.binaryPath.replace(/llama-server$/, '') : undefined,
          },
        });

        this.childProcess = child;
        this.startTime = Date.now();

        const instance: RuntimeInstance = {
          id: config.instanceId,
          runtimeId: this.id,
          pid: child.pid,
          port: config.port,
          state: 'STARTING',
          modelPath: config.modelPath,
          modelName: config.modelName,
          gpuLayersOffloaded: config.gpuLayers,
          loadedAt: Date.now(),
        };

        const checkReadyOutput = (text: string) => {
          if (
            text.includes('HTTP server is listening') ||
            text.includes('main: server is listening') ||
            text.includes('listening on http://') ||
            text.includes('model loaded')
          ) {
            if (!started) {
              started = true;
              clearTimeout(timeoutTimer);
              instance.state = 'RUNNING';
              this.supervisor.setState('RUNNING', instance);
              resolve(instance);
            }
          }
        };

        child.stdout?.on('data', (data: Buffer) => {
          const text = data.toString('utf-8');
          this.supervisor.emit('log', 'DEBUG', `[llama-server stdout] ${text.trim()}`);
          checkReadyOutput(text);
        });

        child.stderr?.on('data', (data: Buffer) => {
          const text = data.toString('utf-8');
          recentStderr.push(text.trim());
          if (recentStderr.length > 20) recentStderr.shift();

          this.supervisor.emit('log', 'INFO', `[llama-server] ${text.trim()}`);
          checkReadyOutput(text);
        });

        child.on('error', (err) => {
          clearTimeout(timeoutTimer);
          this.supervisor.emit('log', 'ERROR', `Failed to spawn llama-server: ${err.message}`);
          this.supervisor.setState('ERROR');
          if (!started) {
            started = true;
            reject(err);
          }
        });

        child.on('exit', (code, signal) => {
          clearTimeout(timeoutTimer);
          this.childProcess = undefined;
          this.supervisor.handleProcessExit(code, signal);
          if (!started) {
            started = true;
            const errMsg = recentStderr.slice(-5).join(' ') || `llama-server exited with code ${code}`;
            reject(new AppError(`llama-server process failed to start: ${errMsg}`, 'RUNTIME_START_FAILED'));
          }
        });

        // Background health check polling as a secondary readiness confirmation
        this.pollHealthUntilReady(config.port, 60)
          .then((isReady) => {
            if (isReady && !started) {
              started = true;
              clearTimeout(timeoutTimer);
              instance.state = 'RUNNING';
              this.supervisor.setState('RUNNING', instance);
              resolve(instance);
            }
          })
          .catch(() => {});
      } catch (err: any) {
        clearTimeout(timeoutTimer);
        this.supervisor.setState('ERROR');
        reject(err);
      }
    });
  }

  public async stop(): Promise<void> {
    if (!this.childProcess) {
      this.supervisor.setState('STOPPED');
      return;
    }

    const pid = this.childProcess.pid;
    this.supervisor.setState('STOPPING');

    return new Promise<void>((resolve) => {
      let isResolved = false;
      const done = () => {
        if (!isResolved) {
          isResolved = true;
          this.childProcess = undefined;
          this.supervisor.setState('STOPPED');
          resolve();
        }
      };

      this.childProcess?.once('exit', done);

      try {
        if (pid) {
          process.kill(pid, 'SIGINT');
        }
      } catch {}

      setTimeout(() => {
        try {
          if (this.childProcess && pid) {
            process.kill(pid, 'SIGKILL');
          }
        } catch {}
        done();
      }, 3000);
    });
  }

  public async health(): Promise<RuntimeHealth> {
    const isRunning = this.supervisor.getState() === 'RUNNING';
    if (!isRunning || !this.currentConfig) {
      return {
        isHealthy: false,
        state: this.supervisor.getState(),
        modelLoaded: false,
      };
    }

    try {
      const res = await fetch(`http://127.0.0.1:${this.currentConfig.port}/health`);
      const healthData = (await res.json()) as any;
      const metricsRes = await fetch(`http://127.0.0.1:${this.currentConfig.port}/metrics`).catch(() => null);
      const metricsData = metricsRes ? await metricsRes.json().catch(() => null) : null;

      return {
        isHealthy: healthData.status === 'ok' || healthData.status === 'loading model',
        state: this.supervisor.getState(),
        modelLoaded: Boolean(this.currentConfig?.modelName),
        vramUsedBytes: metricsData?.vram_used_bytes,
        ramUsedBytes: metricsData?.ram_used_bytes,
        uptimeSeconds: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      };
    } catch (err: any) {
      return {
        isHealthy: false,
        state: 'DEGRADED',
        modelLoaded: false,
        error: err.message,
      };
    }
  }

  public async *chatStream(
    request: ChatCompletionRequest,
    signal?: AbortSignal
  ): AsyncIterable<ChatCompletionResponse> {
    if (!this.currentConfig) {
      throw new AppError('llama-server is not running or ready', 'RUNTIME_NOT_READY');
    }

    const res = await fetch(`http://127.0.0.1:${this.currentConfig.port}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: true }),
      signal,
    });

    if (!res.ok || !res.body) {
      const errText = await res.text().catch(() => 'Unknown upstream error');
      throw new AppError(`Upstream llama-server error (${res.status}): ${errText}`, 'UPSTREAM_ERROR');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') return;
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.substring(6));
            yield data;
          } catch {}
        }
      }
    }
  }

  public async embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.currentConfig) {
      throw new AppError('llama-server is not running or ready', 'RUNTIME_NOT_READY');
    }

    const res = await fetch(`http://127.0.0.1:${this.currentConfig.port}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => 'Unknown error');
      throw new AppError(`Upstream embeddings error: ${errText}`, 'UPSTREAM_ERROR');
    }

    return res.json() as Promise<EmbeddingResponse>;
  }

  private async pollHealthUntilReady(port: number, maxAttempts = 30): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/health`);
        if (res.ok) {
          const data = (await res.json()) as any;
          if (data.status === 'ok') {
            return true;
          }
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  }
}
