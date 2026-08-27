import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createDatabaseAsync, APIKeyRepository } from '@local-ai/database';
import { KeyManager, SecretRedactor } from '@local-ai/security';

describe('Security & Redaction', () => {
  let tempDbPath: string;
  let dbConn: Awaited<ReturnType<typeof createDatabaseAsync>>;
  let keyManager: KeyManager;

  beforeEach(async () => {
    tempDbPath = path.join(os.tmpdir(), `test-sec-${Date.now()}.sqlite`);
    dbConn = await createDatabaseAsync(tempDbPath);
    keyManager = new KeyManager(new APIKeyRepository(dbConn.raw));
  });

  afterEach(() => {
    dbConn.close();
    if (fs.existsSync(tempDbPath)) {
      try {
        fs.unlinkSync(tempDbPath);
      } catch {}
    }
  });

  it('should generate valid lcl_ keys and validate them', () => {
    const { keyInfo, rawKey } = keyManager.generateKey('Laptop');
    expect(rawKey.startsWith('lcl_')).toBe(true);
    expect(keyInfo.prefix.startsWith('lcl_')).toBe(true);

    const valid = keyManager.validateKey(rawKey);
    expect(valid).toBeDefined();
    expect(valid?.id).toBe(keyInfo.id);

    const invalid = keyManager.validateKey('lcl_invalid_token_1234567890');
    expect(invalid).toBeNull();
  });

  it('should redact sensitive keys and bearer tokens from logs', () => {
    const sensitiveLog = 'Request with key lcl_a1b2c3d4e5f678901234567890 and Bearer secret_token_xyz';
    const sanitized = SecretRedactor.redact(sensitiveLog);

    expect(sanitized).not.toContain('lcl_a1b2c3d4e5f678901234567890');
    expect(sanitized).not.toContain('secret_token_xyz');
    expect(sanitized).toContain('lcl_••••••••••••');
    expect(sanitized).toContain('Bearer ••••••••');
  });

  it('should sanitize authorization headers', () => {
    const headers = {
      'content-type': 'application/json',
      authorization: 'Bearer lcl_12345678901234567890',
      'x-api-key': 'secret_key',
    };

    const sanitized = SecretRedactor.sanitizeHeaders(headers);
    expect(sanitized['content-type']).toBe('application/json');
    expect(sanitized['authorization']).toBe('••••••••');
    expect(sanitized['x-api-key']).toBe('••••••••');
  });
});
