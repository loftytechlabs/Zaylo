import type {
  HardwareProfile,
  CapabilityProfile,
  Model,
  ModelInstallation,
  DownloadProgress,
  ServerConfiguration,
  RuntimeInstance,
  ServerState,
  ConnectedDevice,
  PairingTokenInfo,
  APIKeyInfo,
  SystemMetricSample,
  StructuredLog,
  BenchmarkResult,
  ChatCompletionRequest,
  ChatCompletionResponse,
} from '@local-ai/shared';

export interface IPCChannels {
  // Hardware & Capabilities
  'hardware:get-profile': { request: void; response: HardwareProfile };
  'hardware:get-capabilities': { request: void; response: CapabilityProfile };

  // Models
  'models:list-available': { request: void; response: Model[] };
  'models:list-installed': { request: void; response: ModelInstallation[] };
  'models:search-hf': { request: { query: string; limit?: number }; response: Model[] };
  'models:download': { request: { modelId: string; variantId: string; downloadUrl?: string; name?: string }; response: { downloadId: string } };
  'models:cancel-download': { request: { downloadId: string }; response: boolean };
  'models:delete': { request: { installationId: string }; response: boolean };
  'models:get-downloads': { request: void; response: DownloadProgress[] };
  'models:import-local': { request: { filePath?: string; name?: string }; response: ModelInstallation | null };
  'models:select-file': { request: void; response: string | null };

  // Server & Runtime Lifecycle
  'server:get-config': { request: void; response: ServerConfiguration };
  'server:update-config': { request: Partial<ServerConfiguration>; response: ServerConfiguration };
  'server:get-state': { request: void; response: { state: ServerState; instance?: RuntimeInstance; lanAddress?: string; port: number } };
  'server:start': { request: { modelId?: string; variantId?: string }; response: boolean };
  'server:stop': { request: void; response: boolean };
  'server:restart': { request: void; response: boolean };
  'server:load-model': { request: { modelId: string; variantId?: string }; response: boolean };
  'server:unload-model': { request: void; response: boolean };

  // Runtime Management
  'runtime:check-status': { request: void; response: { installed: boolean; version?: string; path?: string; supportedBackends: string[] } };
  'runtime:install': { request: void; response: { success: boolean; path?: string; error?: string } };

  // Network & Devices
  'network:get-interfaces': { request: void; response: { interfaces: Array<{ name: string; address: string; family: string; type: string }> } };
  'network:get-qr-code': { request: { text: string }; response: { qrDataUrl: string } };
  'devices:list': { request: void; response: ConnectedDevice[] };
  'devices:create-pairing-token': { request: void; response: PairingTokenInfo };
  'devices:revoke': { request: { deviceId: string }; response: boolean };
  'devices:delete': { request: { deviceId: string }; response: boolean };
  'devices:rename': { request: { deviceId: string; name: string }; response: boolean };

  // API Keys
  'keys:list': { request: void; response: APIKeyInfo[] };
  'keys:create': { request: { name: string }; response: { key: APIKeyInfo; rawKey: string } };
  'keys:revoke': { request: { keyId: string }; response: boolean };
  'keys:delete': { request: { keyId: string }; response: boolean };

  // Metrics & Logs
  'metrics:get-current': { request: void; response: SystemMetricSample };
  'metrics:get-history': { request: { limit?: number }; response: SystemMetricSample[] };
  'logs:get-recent': { request: { limit?: number; level?: string; component?: string }; response: StructuredLog[] };
  'logs:clear': { request: void; response: boolean };

  // Inference Playground
  'inference:chat': { request: ChatCompletionRequest; response: ChatCompletionResponse };
  'inference:abort': { request: { requestId: string }; response: boolean };

  // Benchmark
  'benchmark:run': { request: { modelId?: string; variantId?: string; promptTokens?: number; genTokens?: number }; response: BenchmarkResult };
  'benchmark:get-history': { request: void; response: BenchmarkResult[] };

  // App & System
  'app:get-version': { request: void; response: string };
  'app:select-directory': { request: { defaultPath?: string }; response: string | null };
  'app:open-external': { request: { url: string }; response: void };
}

export interface IPCEvents {
  'metrics:update': SystemMetricSample;
  'logs:new': StructuredLog;
  'server:state-changed': { state: ServerState; instance?: RuntimeInstance };
  'download:progress': DownloadProgress;
  'inference:chunk': { requestId: string; chunk: ChatCompletionResponse };
}
