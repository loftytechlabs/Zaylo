import type { IDatabase } from './db.js';
import type {
  ServerConfiguration,
  Model,
  ModelInstallation,
  APIKeyInfo,
  ConnectedDevice,
  SystemMetricSample,
  StructuredLog,
  BenchmarkResult,
} from '@local-ai/shared';
import {
  DEFAULT_SERVER_PORT,
  DEFAULT_SERVER_HOST,
  DEFAULT_CONTEXT_LENGTH,
  DEFAULT_MAX_CONCURRENT_REQUESTS,
  DEFAULT_TEMPERATURE,
  DEFAULT_TOP_P,
  getDefaultModelsDir,
  getDefaultRuntimeDir,
} from '@local-ai/shared';

export class ServerRepository {
  constructor(private db: IDatabase) {}

  getConfig(): ServerConfiguration {
    const row = this.db.prepare('SELECT * FROM servers LIMIT 1').get() as any;
    if (row) {
      return {
        id: row.id,
        name: row.name,
        port: Number(row.port),
        host: row.host,
        lanEnabled: Boolean(row.lan_enabled),
        activeModelId: row.active_model_id || undefined,
        activeVariantId: row.active_variant_id || undefined,
        maxConcurrentRequests: Number(row.max_concurrent_requests),
        contextLimit: Number(row.context_limit),
        gpuLayers: Number(row.gpu_layers),
        threads: Number(row.threads),
        temperature: Number(row.temperature),
        topP: Number(row.top_p),
        autoStartOnBoot: Boolean(row.auto_start_on_boot),
        autoLoadModel: Boolean(row.auto_load_model),
        lowMemoryMode: Boolean(row.low_memory_mode),
        flashAttention: row.flash_attention !== undefined ? Boolean(row.flash_attention) : true,
        modelsDirectory: row.models_directory,
        runtimeDirectory: row.runtime_directory,
      };
    }

    const defaultConfig: ServerConfiguration = {
      id: 'default',
      name: 'Zaylo',
      port: DEFAULT_SERVER_PORT,
      host: DEFAULT_SERVER_HOST,
      lanEnabled: false,
      maxConcurrentRequests: DEFAULT_MAX_CONCURRENT_REQUESTS,
      contextLimit: DEFAULT_CONTEXT_LENGTH,
      gpuLayers: 99,
      threads: 6,
      temperature: DEFAULT_TEMPERATURE,
      topP: DEFAULT_TOP_P,
      autoStartOnBoot: false,
      autoLoadModel: true,
      lowMemoryMode: false,
      flashAttention: true,
      modelsDirectory: getDefaultModelsDir(),
      runtimeDirectory: getDefaultRuntimeDir(),
    };

    this.saveConfig(defaultConfig);
    return defaultConfig;
  }

  saveConfig(config: ServerConfiguration): void {
    const stmt = this.db.prepare(`
      INSERT INTO servers (
        id, name, port, host, lan_enabled, active_model_id, active_variant_id,
        max_concurrent_requests, context_limit, gpu_layers, threads, temperature, top_p,
        auto_start_on_boot, auto_load_model, low_memory_mode, flash_attention, models_directory, runtime_directory, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        port = excluded.port,
        host = excluded.host,
        lan_enabled = excluded.lan_enabled,
        active_model_id = excluded.active_model_id,
        active_variant_id = excluded.active_variant_id,
        max_concurrent_requests = excluded.max_concurrent_requests,
        context_limit = excluded.context_limit,
        gpu_layers = excluded.gpu_layers,
        threads = excluded.threads,
        temperature = excluded.temperature,
        top_p = excluded.top_p,
        auto_start_on_boot = excluded.auto_start_on_boot,
        auto_load_model = excluded.auto_load_model,
        low_memory_mode = excluded.low_memory_mode,
        flash_attention = excluded.flash_attention,
        models_directory = excluded.models_directory,
        runtime_directory = excluded.runtime_directory,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      config.id,
      config.name,
      config.port,
      config.host,
      config.lanEnabled ? 1 : 0,
      config.activeModelId || null,
      config.activeVariantId || null,
      config.maxConcurrentRequests,
      config.contextLimit,
      config.gpuLayers,
      config.threads,
      config.temperature,
      config.topP,
      config.autoStartOnBoot ? 1 : 0,
      config.autoLoadModel ? 1 : 0,
      config.lowMemoryMode ? 1 : 0,
      config.flashAttention ? 1 : 0,
      config.modelsDirectory,
      config.runtimeDirectory,
      Date.now()
    );
  }
}

export class ModelRepository {
  constructor(private db: IDatabase) {}

  getAllModels(): Model[] {
    const rows = this.db.prepare('SELECT * FROM models').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      publisher: r.publisher,
      description: r.description,
      parameterCount: r.parameter_count,
      capabilities: JSON.parse(r.capabilities),
      variants: JSON.parse(r.variants),
      defaultVariantId: r.default_variant_id,
      tags: JSON.parse(r.tags),
    }));
  }

  upsertModel(model: Model): void {
    const stmt = this.db.prepare(`
      INSERT INTO models (
        id, name, publisher, description, parameter_count, capabilities, variants, default_variant_id, tags, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        publisher = excluded.publisher,
        description = excluded.description,
        parameter_count = excluded.parameter_count,
        capabilities = excluded.capabilities,
        variants = excluded.variants,
        default_variant_id = excluded.default_variant_id,
        tags = excluded.tags
    `);

    stmt.run(
      model.id,
      model.name,
      model.publisher,
      model.description,
      model.parameterCount,
      JSON.stringify(model.capabilities),
      JSON.stringify(model.variants),
      model.defaultVariantId,
      JSON.stringify(model.tags),
      Date.now()
    );
  }

  getAllInstallations(): ModelInstallation[] {
    const rows = this.db.prepare('SELECT * FROM model_installations').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      modelId: r.model_id,
      variantId: r.variant_id,
      name: r.name,
      localPath: r.local_path,
      sizeBytes: Number(r.size_bytes),
      sha256: r.sha256 || undefined,
      installedAt: Number(r.installed_at),
      isLoaded: Boolean(r.is_loaded),
      format: r.format as any,
      quantization: r.quantization as any,
      contextLength: Number(r.context_length),
    }));
  }

  getInstallation(id: string): ModelInstallation | null {
    const r = this.db.prepare('SELECT * FROM model_installations WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      modelId: r.model_id,
      variantId: r.variant_id,
      name: r.name,
      localPath: r.local_path,
      sizeBytes: Number(r.size_bytes),
      sha256: r.sha256 || undefined,
      installedAt: Number(r.installed_at),
      isLoaded: Boolean(r.is_loaded),
      format: r.format as any,
      quantization: r.quantization as any,
      contextLength: Number(r.context_length),
    };
  }

  upsertInstallation(inst: ModelInstallation): void {
    const stmt = this.db.prepare(`
      INSERT INTO model_installations (
        id, model_id, variant_id, name, local_path, size_bytes, sha256, installed_at, is_loaded, format, quantization, context_length
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        local_path = excluded.local_path,
        size_bytes = excluded.size_bytes,
        sha256 = excluded.sha256,
        is_loaded = excluded.is_loaded
    `);

    stmt.run(
      inst.id,
      inst.modelId,
      inst.variantId,
      inst.name,
      inst.localPath,
      inst.sizeBytes,
      inst.sha256 || null,
      inst.installedAt,
      inst.isLoaded ? 1 : 0,
      inst.format,
      inst.quantization,
      inst.contextLength
    );
  }

  deleteInstallation(id: string): void {
    this.db.prepare('DELETE FROM model_installations WHERE id = ?').run(id);
  }

  setLoadedInstallation(loadedId?: string): void {
    this.db.prepare('UPDATE model_installations SET is_loaded = 0').run();
    if (loadedId) {
      this.db.prepare('UPDATE model_installations SET is_loaded = 1 WHERE id = ?').run(loadedId);
    }
  }
}

export class APIKeyRepository {
  constructor(private db: IDatabase) {}

  getAll(): APIKeyInfo[] {
    const rows = this.db.prepare('SELECT * FROM api_keys').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      prefix: r.prefix,
      rawKey: r.raw_key || r.prefix,
      createdAt: Number(r.created_at),
      lastUsedAt: r.last_used_at ? Number(r.last_used_at) : undefined,
      isRevoked: Boolean(r.is_revoked),
    }));
  }

  findByHashedKey(hashedKey: string): (APIKeyInfo & { hashedKey: string }) | null {
    const r = this.db.prepare('SELECT * FROM api_keys WHERE hashed_key = ?').get(hashedKey) as any;
    if (!r || r.is_revoked) return null;
    return {
      id: r.id,
      name: r.name,
      prefix: r.prefix,
      rawKey: r.raw_key || r.prefix,
      createdAt: Number(r.created_at),
      lastUsedAt: r.last_used_at ? Number(r.last_used_at) : undefined,
      isRevoked: Boolean(r.is_revoked),
      hashedKey: r.hashed_key,
    };
  }

  create(id: string, name: string, prefix: string, hashedKey: string, rawKey?: string): APIKeyInfo {
    const createdAt = Date.now();
    this.db
      .prepare('INSERT INTO api_keys (id, name, prefix, hashed_key, raw_key, created_at, is_revoked) VALUES (?, ?, ?, ?, ?, ?, 0)')
      .run(id, name, prefix, hashedKey, rawKey || null, createdAt);

    return {
      id,
      name,
      prefix,
      rawKey,
      createdAt,
      isRevoked: false,
    };
  }

  touch(id: string): void {
    this.db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?').run(Date.now(), id);
  }

  revoke(id: string): void {
    this.db.prepare('UPDATE api_keys SET is_revoked = 1 WHERE id = ?').run(id);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM api_keys WHERE id = ?').run(id);
  }
}

export function parseDeviceName(userAgent?: string, ip?: string): string {
  if (!userAgent) return ip ? `Device (${ip})` : 'Unknown Device';
  const ua = userAgent.toLowerCase();

  if (ua.includes('iphone')) {
    const match = userAgent.match(/OS (\d+[_\d]*)/i);
    const osVer = match ? ` (iOS ${match[1].replace(/_/g, '.')})` : '';
    return `Apple iPhone${osVer}`;
  }
  if (ua.includes('ipad')) {
    return 'Apple iPad';
  }
  if (ua.includes('android')) {
    if (ua.includes('samsung') || ua.includes('sm-')) return 'Samsung Galaxy';
    if (ua.includes('pixel')) return 'Google Pixel';
    if (ua.includes('xiaomi') || ua.includes('redmi') || ua.includes('poco')) return 'Xiaomi Device';
    if (ua.includes('oneplus')) return 'OnePlus Device';
    return 'Android Device';
  }
  if (ua.includes('macintosh') || ua.includes('mac os x')) {
    return 'MacBook / macOS Client';
  }
  if (ua.includes('windows')) {
    return 'Windows PC Client';
  }
  if (ua.includes('linux') && !ua.includes('android')) {
    return 'Linux Client';
  }
  if (ua.includes('curl')) {
    return 'cURL / Script';
  }
  if (ua.includes('python')) {
    return 'Python SDK Client';
  }
  return ip ? `Device (${ip})` : 'Web Client';
}

export class DeviceRepository {
  constructor(private db: IDatabase) {}

  getAll(): ConnectedDevice[] {
    const rows = this.db.prepare('SELECT * FROM devices').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      ipAddress: r.ip_address,
      userAgent: r.user_agent || undefined,
      deviceName: r.device_name || parseDeviceName(r.user_agent, r.ip_address),
      pairedAt: Number(r.paired_at),
      lastRequestAt: Number(r.last_request_at),
      requestCount: Number(r.request_count),
      isRevoked: Boolean(r.is_revoked),
    }));
  }

  recordActivity(ipAddress: string, userAgent?: string, defaultDeviceName?: string): ConnectedDevice {
    const existing = this.db.prepare('SELECT * FROM devices WHERE ip_address = ?').get(ipAddress) as any;
    const now = Date.now();
    const detectedName = defaultDeviceName || parseDeviceName(userAgent, ipAddress);

    if (existing) {
      const isGenericName = !existing.device_name ||
        existing.device_name.startsWith('Device (') ||
        existing.device_name.startsWith('Client (') ||
        existing.device_name === 'Web Client' ||
        existing.device_name === 'Mobile Device';
      const finalName = (isGenericName && detectedName) ? detectedName : existing.device_name;

      this.db
        .prepare('UPDATE devices SET last_request_at = ?, request_count = request_count + 1, user_agent = ?, device_name = ? WHERE id = ?')
        .run(now, userAgent || existing.user_agent, finalName, existing.id);

      return {
        id: existing.id,
        ipAddress: existing.ip_address,
        userAgent: userAgent || existing.user_agent || undefined,
        deviceName: finalName,
        pairedAt: Number(existing.paired_at),
        lastRequestAt: now,
        requestCount: Number(existing.request_count) + 1,
        isRevoked: Boolean(existing.is_revoked),
      };
    }

    const id = `dev_${Math.random().toString(36).substring(2, 10)}`;
    const name = detectedName || `Device (${ipAddress})`;
    this.db
      .prepare('INSERT INTO devices (id, ip_address, user_agent, device_name, paired_at, last_request_at, request_count, is_revoked) VALUES (?, ?, ?, ?, ?, ?, 1, 0)')
      .run(id, ipAddress, userAgent || null, name, now, now);

    return {
      id,
      ipAddress,
      userAgent,
      deviceName: name,
      pairedAt: now,
      lastRequestAt: now,
      requestCount: 1,
      isRevoked: false,
    };
  }

  rename(id: string, name: string): void {
    this.db.prepare('UPDATE devices SET device_name = ? WHERE id = ?').run(name, id);
  }

  revoke(id: string): void {
    this.db.prepare('UPDATE devices SET is_revoked = 1 WHERE id = ?').run(id);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM devices WHERE id = ?').run(id);
  }
}

export class MetricsRepository {
  constructor(private db: IDatabase) {}

  addSample(sample: SystemMetricSample): void {
    this.db
      .prepare(`
        INSERT INTO performance_samples (
          timestamp, cpu_percent, memory_used_bytes, memory_total_bytes, gpu_percent, vram_used_bytes, vram_total_bytes, active_requests, tokens_per_second, latency_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        sample.timestamp,
        sample.cpuPercent,
        sample.memoryUsedBytes,
        sample.memoryTotalBytes,
        sample.gpuPercent || null,
        sample.vramUsedBytes || null,
        sample.vramTotalBytes || null,
        sample.activeRequests,
        sample.tokensPerSecond,
        sample.latencyMs
      );

    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.db.prepare('DELETE FROM performance_samples WHERE timestamp < ?').run(cutoff);
  }

  getRecentSamples(limit: number = 60): SystemMetricSample[] {
    const rows = this.db
      .prepare('SELECT * FROM performance_samples ORDER BY timestamp DESC LIMIT ?')
      .all(limit) as any[];

    return rows.reverse().map((r) => ({
      timestamp: Number(r.timestamp),
      cpuPercent: Number(r.cpu_percent),
      memoryUsedBytes: Number(r.memory_used_bytes),
      memoryTotalBytes: Number(r.memory_total_bytes),
      gpuPercent: r.gpu_percent ? Number(r.gpu_percent) : undefined,
      vramUsedBytes: r.vram_used_bytes ? Number(r.vram_used_bytes) : undefined,
      vramTotalBytes: r.vram_total_bytes ? Number(r.vram_total_bytes) : undefined,
      activeRequests: Number(r.active_requests),
      tokensPerSecond: Number(r.tokens_per_second),
      latencyMs: Number(r.latency_ms),
    }));
  }

  logRequest(data: {
    id: string;
    modelId: string;
    clientIp: string;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
    tokensPerSec: number;
    statusCode: number;
    isStreaming: boolean;
    errorMessage?: string;
  }): void {
    this.db
      .prepare(`
        INSERT INTO requests (
          id, timestamp, model_id, client_ip, prompt_tokens, completion_tokens, latency_ms, tokens_per_sec, status_code, is_streaming, error_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        data.id,
        Date.now(),
        data.modelId,
        data.clientIp,
        data.promptTokens,
        data.completionTokens,
        data.latencyMs,
        data.tokensPerSec,
        data.statusCode,
        data.isStreaming ? 1 : 0,
        data.errorMessage || null
      );
  }
}

export class LogsRepository {
  constructor(private db: IDatabase) {}

  addLog(log: StructuredLog): void {
    this.db
      .prepare(`
        INSERT INTO server_events (id, timestamp, level, component, event, message, request_id, model_id, meta)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        log.id,
        log.timestamp,
        log.level,
        log.component,
        log.event,
        log.message,
        log.requestId || null,
        log.modelId || null,
        log.meta ? JSON.stringify(log.meta) : null
      );
  }

  getRecent(limit: number = 100, level?: string, component?: string): StructuredLog[] {
    let query = 'SELECT * FROM server_events';
    const params: any[] = [];
    const conditions: string[] = [];

    if (level && level !== 'ALL') {
      conditions.push('level = ?');
      params.push(level);
    }
    if (component && component !== 'ALL') {
      conditions.push('component = ?');
      params.push(component);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);

    const rows = this.db.prepare(query).all(...params) as any[];
    return rows.map((r) => ({
      id: r.id,
      timestamp: Number(r.timestamp),
      level: r.level,
      component: r.component,
      event: r.event,
      message: r.message,
      requestId: r.request_id || undefined,
      modelId: r.model_id || undefined,
      meta: r.meta ? JSON.parse(r.meta) : undefined,
    }));
  }

  clear(): void {
    this.db.prepare('DELETE FROM server_events').run();
  }
}

export class BenchmarkRepository {
  constructor(private db: IDatabase) {}

  save(result: BenchmarkResult): void {
    this.db
      .prepare(`
        INSERT INTO benchmark_results (
          id, model_id, variant_id, model_name, timestamp, prompt_tokens, completion_tokens,
          prompt_processing_tokens_per_sec, generation_tokens_per_sec, time_to_first_token_ms,
          total_duration_ms, peak_memory_bytes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        result.id,
        result.modelId,
        result.variantId,
        result.modelName,
        result.timestamp,
        result.promptTokens,
        result.completionTokens,
        result.promptProcessingTokensPerSec,
        result.generationTokensPerSec,
        result.timeToFirstTokenMs,
        result.totalDurationMs,
        result.peakMemoryBytes
      );
  }

  getAll(): BenchmarkResult[] {
    const rows = this.db.prepare('SELECT * FROM benchmark_results ORDER BY timestamp DESC').all() as any[];
    return rows.map((r) => ({
      id: r.id,
      modelId: r.model_id,
      variantId: r.variant_id,
      modelName: r.model_name,
      timestamp: Number(r.timestamp),
      promptTokens: Number(r.prompt_tokens),
      completionTokens: Number(r.completion_tokens),
      promptProcessingTokensPerSec: Number(r.prompt_processing_tokens_per_sec),
      generationTokensPerSec: Number(r.generation_tokens_per_sec),
      timeToFirstTokenMs: Number(r.time_to_first_token_ms),
      totalDurationMs: Number(r.total_duration_ms),
      peakMemoryBytes: Number(r.peak_memory_bytes),
    }));
  }
}
