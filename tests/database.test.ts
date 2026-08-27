import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  createDatabaseAsync,
  ServerRepository,
  ModelRepository,
  APIKeyRepository,
  DeviceRepository,
  MetricsRepository,
  LogsRepository,
} from '@local-ai/database';

describe('Database Repositories', () => {
  let tempDbPath: string;
  let dbConn: Awaited<ReturnType<typeof createDatabaseAsync>>;

  beforeEach(async () => {
    tempDbPath = path.join(os.tmpdir(), `test-local-ai-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.sqlite`);
    dbConn = await createDatabaseAsync(tempDbPath);
  });

  afterEach(() => {
    dbConn.close();
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {}
    }
  });

  it('should initialize and persist Server configuration', () => {
    const serverRepo = new ServerRepository(dbConn.raw);
    const config = serverRepo.getConfig();
    expect(config.port).toBe(8080);
    expect(config.lanEnabled).toBe(false);
    expect(config.lowMemoryMode).toBe(false);
    expect(config.flashAttention).toBe(true);

    serverRepo.saveConfig({
      ...config,
      port: 9000,
      lanEnabled: true,
      lowMemoryMode: true,
      flashAttention: true,
      maxConcurrentRequests: 8,
    });

    const updated = serverRepo.getConfig();
    expect(updated.port).toBe(9000);
    expect(updated.lanEnabled).toBe(true);
    expect(updated.lowMemoryMode).toBe(true);
    expect(updated.flashAttention).toBe(true);
    expect(updated.maxConcurrentRequests).toBe(8);
  });

  it('should persist and retrieve API keys', () => {
    const keyRepo = new APIKeyRepository(dbConn.raw);
    const created = keyRepo.create('key_1', 'Test Client', 'lcl_1234...', 'hash_abc');
    expect(created.name).toBe('Test Client');
    expect(created.isRevoked).toBe(false);

    const found = keyRepo.findByHashedKey('hash_abc');
    expect(found).toBeDefined();
    expect(found?.name).toBe('Test Client');

    keyRepo.revoke('key_1');
    const afterRevoke = keyRepo.findByHashedKey('hash_abc');
    expect(afterRevoke).toBeNull();
  });

  it('should record device activity', () => {
    const devRepo = new DeviceRepository(dbConn.raw);
    const dev = devRepo.recordActivity('192.168.1.100', 'Mozilla/5.0 iPhone', 'My iPhone');
    expect(dev.ipAddress).toBe('192.168.1.100');
    expect(dev.requestCount).toBe(1);

    const dev2 = devRepo.recordActivity('192.168.1.100');
    expect(dev2.requestCount).toBe(2);

    const all = devRepo.getAll();
    expect(all.length).toBe(1);
  });

  it('should log structured events and clear them', () => {
    const logsRepo = new LogsRepository(dbConn.raw);
    logsRepo.addLog({
      id: 'log_1',
      timestamp: Date.now(),
      level: 'INFO',
      component: 'SERVER',
      event: 'STARTED',
      message: 'Server started successfully on port 8080',
    });

    const logs = logsRepo.getRecent(10);
    expect(logs.length).toBe(1);
    expect(logs[0].message).toContain('Server started');

    logsRepo.clear();
    expect(logsRepo.getRecent(10).length).toBe(0);
  });
});
