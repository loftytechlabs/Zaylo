import type {
  ServerState,
  RuntimeInstance,
  ChatCompletionRequest,
  ChatCompletionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
} from '@local-ai/shared';

export interface RuntimeConfig {
  instanceId: string;
  modelPath: string;
  modelName: string;
  port: number;
  host: string;
  contextSize: number;
  gpuLayers: number;
  threads: number;
  runtimeDir: string;
  lowMemoryMode?: boolean;
  flashAttention?: boolean;
}

export interface RuntimeHealth {
  isHealthy: boolean;
  state: ServerState;
  modelLoaded: boolean;
  vramUsedBytes?: number;
  ramUsedBytes?: number;
  uptimeSeconds?: number;
  error?: string;
}

export interface RuntimeCapabilities {
  supportedFormats: string[];
  supportedBackends: string[];
  supportsEmbeddings: boolean;
  supportsStreaming: boolean;
  version?: string;
}

export interface InferenceRuntime {
  id: string;
  name: string;

  detectCapabilities(): Promise<RuntimeCapabilities>;
  isInstalled(): Promise<boolean>;
  install(): Promise<{ success: boolean; path?: string; error?: string }>;
  start(config: RuntimeConfig): Promise<RuntimeInstance>;
  stop(): Promise<void>;
  health(): Promise<RuntimeHealth>;
  chatStream(request: ChatCompletionRequest, signal?: AbortSignal): AsyncIterable<ChatCompletionResponse>;
  embeddings(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
