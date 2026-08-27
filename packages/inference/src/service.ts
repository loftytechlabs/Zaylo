import crypto from 'node:crypto';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
} from '@local-ai/shared';
import { ModelNotLoadedError, ValidationError } from '@local-ai/shared';
import { ChatCompletionRequestSchema } from '@local-ai/shared';
import type { InferenceRuntime } from '@local-ai/runtimes';
import { RequestQueue } from './queue.js';
import { MetricsRepository, LogsRepository } from '@local-ai/database';
import { createChatCompletionResponse } from '@local-ai/protocol';

export interface InferenceMetrics {
  totalRequests: number;
  activeRequests: number;
  averageTokensPerSec: number;
  averageLatencyMs: number;
}

export class InferenceService {
  private queue: RequestQueue;
  private currentRuntime?: InferenceRuntime;
  private currentModelName: string = '';
  private activeAbortControllers = new Map<string, AbortController>();
  
  // Rolling metrics
  private totalRequests = 0;
  private recentTokensPerSec: number[] = [];
  private recentLatencies: number[] = [];

  constructor(
    private metricsRepo?: MetricsRepository,
    private logsRepo?: LogsRepository,
    maxConcurrent: number = 4
  ) {
    this.queue = new RequestQueue(maxConcurrent);
  }

  public setRuntime(runtime?: InferenceRuntime, modelName?: string): void {
    this.currentRuntime = runtime;
    this.currentModelName = modelName || '';
  }

  public getRuntime(): InferenceRuntime | undefined {
    return this.currentRuntime;
  }

  public getModelName(): string {
    return this.currentModelName;
  }

  public setMaxConcurrency(max: number): void {
    this.queue.setMaxConcurrent(max);
  }

  public abortRequest(requestId: string): boolean {
    const controller = this.activeAbortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.activeAbortControllers.delete(requestId);
      return true;
    }
    return false;
  }

  public async *chatStream(
    request: ChatCompletionRequest,
    clientIp: string = '127.0.0.1',
    externalSignal?: AbortSignal
  ): AsyncIterable<ChatCompletionResponse> {
    const parsed = ChatCompletionRequestSchema.safeParse(request);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors.map((e) => e.message).join(', '));
    }

    if (!this.currentRuntime) {
      throw new ModelNotLoadedError('No inference model is currently loaded');
    }

    const release = await this.queue.acquire();
    const requestId = `chatcmpl-${crypto.randomBytes(12).toString('hex')}`;
    const abortController = new AbortController();
    this.activeAbortControllers.set(requestId, abortController);

    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let completionTokens = 0;
    let accumulatedContent = '';

    // If external signal aborts, abort our internal controller
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => abortController.abort());
    }

    try {
      this.totalRequests++;
      const stream = this.currentRuntime.chatStream(request, abortController.signal);

      for await (const chunk of stream) {
        if (!firstTokenTime) {
          firstTokenTime = Date.now();
        }

        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          completionTokens++;
          accumulatedContent += delta;
        }

        // Ensure chunk contains ID
        chunk.id = requestId;
        chunk.model = this.currentModelName || request.model;
        yield chunk;
      }

      const endTime = Date.now();
      const latencyMs = endTime - startTime;
      const durationSec = (endTime - (firstTokenTime || startTime)) / 1000;
      const tokensPerSec = durationSec > 0 ? completionTokens / durationSec : 0;

      // Update rolling metrics
      this.recordMetricsSample(tokensPerSec, latencyMs);

      // Estimate prompt tokens roughly (4 chars per token)
      const promptText = request.messages.map((m) => m.content).join(' ');
      const promptTokens = Math.max(1, Math.ceil(promptText.length / 4));

      this.metricsRepo?.logRequest({
        id: requestId,
        modelId: this.currentModelName || request.model,
        clientIp,
        promptTokens,
        completionTokens,
        latencyMs,
        tokensPerSec,
        statusCode: 200,
        isStreaming: true,
      });
    } catch (err: any) {
      const endTime = Date.now();
      const latencyMs = endTime - startTime;
      this.metricsRepo?.logRequest({
        id: requestId,
        modelId: this.currentModelName || request.model,
        clientIp,
        promptTokens: 0,
        completionTokens,
        latencyMs,
        tokensPerSec: 0,
        statusCode: err?.statusCode || 500,
        isStreaming: true,
        errorMessage: err?.message,
      });
      throw err;
    } finally {
      this.activeAbortControllers.delete(requestId);
      release();
    }
  }

  public async chat(
    request: ChatCompletionRequest,
    clientIp: string = '127.0.0.1',
    signal?: AbortSignal
  ): Promise<ChatCompletionResponse> {
    const requestId = `chatcmpl-${crypto.randomBytes(12).toString('hex')}`;
    let accumulatedContent = '';
    let finishReason: 'stop' | 'length' = 'stop';
    const startTime = Date.now();

    for await (const chunk of this.chatStream(request, clientIp, signal)) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) accumulatedContent += delta;
      if (chunk.choices[0]?.finish_reason) {
        finishReason = chunk.choices[0].finish_reason as any;
      }
    }

    const promptText = request.messages.map((m) => m.content).join(' ');
    const promptTokens = Math.max(1, Math.ceil(promptText.length / 4));
    const completionTokens = Math.max(1, Math.ceil(accumulatedContent.length / 4));

    return createChatCompletionResponse({
      id: requestId,
      model: this.currentModelName || request.model,
      created: Math.floor(startTime / 1000),
      message: {
        role: 'assistant',
        content: accumulatedContent,
      },
      finishReason,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    });
  }

  public async embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse> {
    if (!this.currentRuntime) {
      throw new ModelNotLoadedError('No inference model is currently loaded');
    }
    return this.currentRuntime.embeddings(request);
  }

  public getMetrics(): InferenceMetrics {
    const avgTok = this.recentTokensPerSec.length > 0
      ? this.recentTokensPerSec.reduce((a, b) => a + b, 0) / this.recentTokensPerSec.length
      : 0;

    const avgLat = this.recentLatencies.length > 0
      ? this.recentLatencies.reduce((a, b) => a + b, 0) / this.recentLatencies.length
      : 0;

    return {
      totalRequests: this.totalRequests,
      activeRequests: this.queue.getActiveCount(),
      averageTokensPerSec: parseFloat(avgTok.toFixed(1)),
      averageLatencyMs: Math.round(avgLat),
    };
  }

  private recordMetricsSample(tokPerSec: number, latencyMs: number): void {
    if (tokPerSec > 0) {
      this.recentTokensPerSec.push(tokPerSec);
      if (this.recentTokensPerSec.length > 20) this.recentTokensPerSec.shift();
    }
    if (latencyMs > 0) {
      this.recentLatencies.push(latencyMs);
      if (this.recentLatencies.length > 20) this.recentLatencies.shift();
    }
  }
}
