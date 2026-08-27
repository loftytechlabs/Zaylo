import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const servers = sqliteTable('servers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  port: integer('port').notNull().default(8080),
  host: text('host').notNull().default('127.0.0.1'),
  lanEnabled: integer('lan_enabled', { mode: 'boolean' }).notNull().default(false),
  activeModelId: text('active_model_id'),
  activeVariantId: text('active_variant_id'),
  maxConcurrentRequests: integer('max_concurrent_requests').notNull().default(4),
  contextLimit: integer('context_limit').notNull().default(4096),
  gpuLayers: integer('gpu_layers').notNull().default(99),
  threads: integer('threads').notNull().default(6),
  temperature: real('temperature').notNull().default(0.7),
  topP: real('top_p').notNull().default(0.9),
  autoStartOnBoot: integer('auto_start_on_boot', { mode: 'boolean' }).notNull().default(false),
  autoLoadModel: integer('auto_load_model', { mode: 'boolean' }).notNull().default(true),
  modelsDirectory: text('models_directory').notNull(),
  runtimeDirectory: text('runtime_directory').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const models = sqliteTable('models', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  publisher: text('publisher').notNull(),
  description: text('description').notNull(),
  parameterCount: text('parameter_count').notNull(),
  capabilities: text('capabilities').notNull(), // JSON array
  variants: text('variants').notNull(), // JSON array
  defaultVariantId: text('default_variant_id').notNull(),
  tags: text('tags').notNull(), // JSON array
  createdAt: integer('created_at').notNull(),
});

export const modelInstallations = sqliteTable('model_installations', {
  id: text('id').primaryKey(),
  modelId: text('model_id').notNull(),
  variantId: text('variant_id').notNull(),
  name: text('name').notNull(),
  localPath: text('local_path').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  sha256: text('sha256'),
  installedAt: integer('installed_at').notNull(),
  isLoaded: integer('is_loaded', { mode: 'boolean' }).notNull().default(false),
  format: text('format').notNull(),
  quantization: text('quantization').notNull(),
  contextLength: integer('context_length').notNull(),
});

export const apiKeys = sqliteTable('api_keys', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  prefix: text('prefix').notNull(),
  hashedKey: text('hashed_key').notNull(),
  createdAt: integer('created_at').notNull(),
  lastUsedAt: integer('last_used_at'),
  isRevoked: integer('is_revoked', { mode: 'boolean' }).notNull().default(false),
});

export const devices = sqliteTable('devices', {
  id: text('id').primaryKey(),
  ipAddress: text('ip_address').notNull(),
  userAgent: text('user_agent'),
  deviceName: text('device_name').notNull(),
  pairedAt: integer('paired_at').notNull(),
  lastRequestAt: integer('last_request_at').notNull(),
  requestCount: integer('request_count').notNull().default(0),
  isRevoked: integer('is_revoked', { mode: 'boolean' }).notNull().default(false),
});

export const requests = sqliteTable('requests', {
  id: text('id').primaryKey(),
  timestamp: integer('timestamp').notNull(),
  modelId: text('model_id').notNull(),
  clientIp: text('client_ip').notNull(),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  latencyMs: integer('latency_ms').notNull(),
  tokensPerSec: real('tokens_per_sec').notNull().default(0),
  statusCode: integer('status_code').notNull(),
  isStreaming: integer('is_streaming', { mode: 'boolean' }).notNull().default(false),
  errorMessage: text('error_message'),
});

export const performanceSamples = sqliteTable('performance_samples', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  timestamp: integer('timestamp').notNull(),
  cpuPercent: real('cpu_percent').notNull(),
  memoryUsedBytes: integer('memory_used_bytes').notNull(),
  memoryTotalBytes: integer('memory_total_bytes').notNull(),
  gpuPercent: real('gpu_percent'),
  vramUsedBytes: integer('vram_used_bytes'),
  vramTotalBytes: integer('vram_total_bytes'),
  activeRequests: integer('active_requests').notNull(),
  tokensPerSecond: real('tokens_per_second').notNull(),
  latencyMs: real('latency_ms').notNull(),
});

export const serverEvents = sqliteTable('server_events', {
  id: text('id').primaryKey(),
  timestamp: integer('timestamp').notNull(),
  level: text('level').notNull(),
  component: text('component').notNull(),
  event: text('event').notNull(),
  message: text('message').notNull(),
  requestId: text('request_id'),
  modelId: text('model_id'),
  meta: text('meta'), // JSON
});

export const downloads = sqliteTable('downloads', {
  id: text('id').primaryKey(),
  modelId: text('model_id').notNull(),
  variantId: text('variant_id').notNull(),
  filename: text('filename').notNull(),
  status: text('status').notNull(),
  downloadedBytes: integer('downloaded_bytes').notNull(),
  totalBytes: integer('total_bytes').notNull(),
  bytesPerSecond: real('bytes_per_second').notNull().default(0),
  error: text('error'),
  startedAt: integer('started_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const benchmarkResults = sqliteTable('benchmark_results', {
  id: text('id').primaryKey(),
  modelId: text('model_id').notNull(),
  variantId: text('variant_id').notNull(),
  modelName: text('model_name').notNull(),
  timestamp: integer('timestamp').notNull(),
  promptTokens: integer('prompt_tokens').notNull(),
  completionTokens: integer('completion_tokens').notNull(),
  promptProcessingTokensPerSec: real('prompt_processing_tokens_per_sec').notNull(),
  generationTokensPerSec: real('generation_tokens_per_sec').notNull(),
  timeToFirstTokenMs: real('time_to_first_token_ms').notNull(),
  totalDurationMs: real('total_duration_ms').notNull(),
  peakMemoryBytes: integer('peak_memory_bytes').notNull(),
});

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
