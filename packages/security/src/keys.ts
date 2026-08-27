import crypto from 'node:crypto';
import type { APIKeyInfo } from '@local-ai/shared';
import { APIKeyRepository } from '@local-ai/database';

export class KeyManager {
  constructor(private keyRepo: APIKeyRepository) {}

  public generateKey(name: string): { keyInfo: APIKeyInfo; rawKey: string } {
    const rawSecret = crypto.randomBytes(20).toString('hex');
    const rawKey = `lcl_${rawSecret}`;
    const prefix = rawKey.substring(0, 10) + '...';
    const hashedKey = this.hashKey(rawKey);
    const id = `key_${crypto.randomBytes(6).toString('hex')}`;

    const keyInfo = this.keyRepo.create(id, name, prefix, hashedKey, rawKey);
    return {
      keyInfo,
      rawKey,
    };
  }

  public validateKey(rawKey: string): APIKeyInfo | null {
    if (!rawKey || !rawKey.startsWith('lcl_')) return null;
    const hashed = this.hashKey(rawKey);
    const key = this.keyRepo.findByHashedKey(hashed);
    if (!key || key.isRevoked) return null;

    this.keyRepo.touch(key.id);
    return key;
  }

  public revokeKey(keyId: string): void {
    this.keyRepo.revoke(keyId);
  }

  public deleteKey(keyId: string): void {
    this.keyRepo.delete(keyId);
  }

  public listKeys(): APIKeyInfo[] {
    return this.keyRepo.getAll();
  }

  public hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }
}
