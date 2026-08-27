export type SystemPlatform = 'darwin' | 'linux' | 'win32';
export type Architecture = 'x64' | 'arm64' | 'ia32' | 'arm';

export type GPUBackend = 'metal' | 'cuda' | 'rocm' | 'vulkan' | 'directx' | 'cpu';

export interface GPUInfo {
  vendor: string;
  model: string;
  vramBytes?: number;
  driverVersion?: string;
  backend: GPUBackend;
  isIntegrated: boolean;
}

export interface CPUInfo {
  model: string;
  architecture: Architecture;
  physicalCores: number;
  logicalThreads: number;
  baseFrequencyHz?: number;
}

export interface MemoryInfo {
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
}

export interface DiskInfo {
  mount: string;
  totalBytes: number;
  availableBytes: number;
  usedBytes: number;
}

export interface HardwareProfile {
  platform: SystemPlatform;
  osRelease: string;
  hostname: string;
  cpu: CPUInfo;
  memory: MemoryInfo;
  gpus: GPUInfo[];
  primaryGPU?: GPUInfo;
  disks: DiskInfo[];
  detectedAt: number;
}

export type CompatibilityRating =
  | 'Excellent'
  | 'Good'
  | 'Limited'
  | 'Not recommended'
  | 'Unsupported';

export interface CompatibilityAnalysis {
  rating: CompatibilityRating;
  reason: string;
  estimatedMemoryBytes: number;
  availableMemoryBytes: number;
  canFitInVRAM: boolean;
  recommendedContextLimit: number;
  recommendedGpuLayers: number;
}

export interface CapabilityProfile {
  hardware: HardwareProfile;
  supportedBackends: GPUBackend[];
  maxRecommendedContext: number;
  memoryBudgetBytes: number;
  vramBudgetBytes: number;
  hasHardwareAcceleration: boolean;
  analyzedAt: number;
}

export type ModelFormat = 'gguf' | 'onnx' | 'safetensors';
export type ModelQuantization = 'Q4_K_M' | 'Q4_K_S' | 'Q5_K_M' | 'Q8_0' | 'F16' | 'F32' | 'None';

export type ModelCapability =
  | 'TEXT_GENERATION'
  | 'CHAT'
  | 'EMBEDDINGS'
  | 'VISION'
  | 'AUDIO'
  | 'SPEECH_TO_TEXT'
  | 'IMAGE_GENERATION';

export interface ModelVariant {
  id: string;
  name: string;
  quantization: ModelQuantization;
  format: ModelFormat;
  sizeBytes: number;
  downloadUrl: string;
  sha256?: string;
  contextLength: number;
  estimatedRAMBytes: number;
  estimatedVRAMBytes: number;
  gpuLayers: number;
}

export interface Model {
  id: string;
  name: string;
  publisher: string;
  description: string;
  parameterCount: string; // e.g. "135M", "3B", "7B"
  capabilities: ModelCapability[];
  variants: ModelVariant[];
  defaultVariantId: string;
  tags: string[];
}

export interface ModelInstallation {
  id: string;
  modelId: string;
  variantId: string;
  name: string;
  localPath: string;
  sizeBytes: number;
  sha256?: string;
  installedAt: number;
  isLoaded: boolean;
  format: ModelFormat;
  quantization: ModelQuantization;
  contextLength: number;
}

export type DownloadStatus = 'pending' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface DownloadProgress {
  id: string;
  modelId: string;
  variantId: string;
  filename: string;
  status: DownloadStatus;
  downloadedBytes: number;
  totalBytes: number;
  bytesPerSecond: number;
  estimatedSecondsRemaining?: number;
  error?: string;
  startedAt: number;
  updatedAt: number;
}

export type ServerState =
  | 'STOPPED'
  | 'STARTING'
  | 'RUNNING'
  | 'DEGRADED'
  | 'STOPPING'
  | 'CRASHED'
  | 'ERROR';

export interface ServerConfiguration {
  id: string;
  name: string;
  port: number;
  host: string;
  lanEnabled: boolean;
  activeModelId?: string;
  activeVariantId?: string;
  maxConcurrentRequests: number;
  contextLimit: number;
  gpuLayers: number;
  threads: number;
  temperature: number;
  topP: number;
  autoStartOnBoot: boolean;
  autoLoadModel: boolean;
  lowMemoryMode: boolean;
  flashAttention: boolean;
  modelsDirectory: string;
  runtimeDirectory: string;
}

export interface RuntimeInstance {
  id: string;
  runtimeId: string;
  pid?: number;
  port: number;
  state: ServerState;
  modelPath: string;
  modelName: string;
  loadedAt?: number;
  gpuLayersOffloaded: number;
  allocatedVRAMBytes?: number;
  allocatedRAMBytes?: number;
  error?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  stop?: string | string[];
  presence_penalty?: number;
  frequency_penalty?: number;
  user?: string;
}

export interface ChatCompletionChoice {
  index: number;
  message?: ChatMessage;
  delta?: {
    role?: string;
    content?: string;
  };
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface ChatCompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion' | 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: ChatCompletionUsage;
}

export interface EmbeddingRequest {
  model: string;
  input: string | string[];
  user?: string;
}

export interface EmbeddingData {
  object: 'embedding';
  index: number;
  embedding: number[];
}

export interface EmbeddingResponse {
  object: 'list';
  data: EmbeddingData[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  family: 'IPv4' | 'IPv6';
  internal: boolean;
  type: 'wifi' | 'ethernet' | 'loopback' | 'other';
  mac?: string;
}

export interface ConnectedDevice {
  id: string;
  ipAddress: string;
  userAgent?: string;
  deviceName: string;
  pairedAt: number;
  lastRequestAt: number;
  requestCount: number;
  isRevoked: boolean;
}

export interface PairingTokenInfo {
  token: string;
  serverUrl: string;
  serverName: string;
  expiresAt: number;
  qrDataUrl: string;
}

export interface APIKeyInfo {
  id: string;
  name: string;
  prefix: string; // e.g. "lcl_3a9f..."
  rawKey?: string; // full raw key for user convenience on local server
  createdAt: number;
  lastUsedAt?: number;
  isRevoked: boolean;
}

export interface SystemMetricSample {
  timestamp: number;
  cpuPercent: number;
  memoryUsedBytes: number;
  memoryTotalBytes: number;
  gpuPercent?: number;
  vramUsedBytes?: number;
  vramTotalBytes?: number;
  activeRequests: number;
  tokensPerSecond: number;
  latencyMs: number;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export type LogComponent = 'SERVER' | 'RUNTIME' | 'INFERENCE' | 'NETWORK' | 'SYSTEM' | 'SECURITY';

export interface StructuredLog {
  id: string;
  timestamp: number;
  level: LogLevel;
  component: LogComponent;
  event: string;
  message: string;
  requestId?: string;
  modelId?: string;
  meta?: Record<string, unknown>;
}

export interface BenchmarkResult {
  id: string;
  modelId: string;
  variantId: string;
  modelName: string;
  timestamp: number;
  promptTokens: number;
  completionTokens: number;
  promptProcessingTokensPerSec: number;
  generationTokensPerSec: number;
  timeToFirstTokenMs: number;
  totalDurationMs: number;
  peakMemoryBytes: number;
}
