import crypto from 'node:crypto';
import QRCode from 'qrcode';
import type { PairingTokenInfo } from '@local-ai/shared';
import { PAIRING_TOKEN_TTL_MS } from '@local-ai/shared';
import { KeyManager } from '@local-ai/security';
import { DeviceRepository } from '@local-ai/database';
import { AppError } from '@local-ai/shared';

export async function generateQrCode(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    margin: 2,
    width: 280,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  });
}

interface ActiveToken {
  token: string;
  serverUrl: string;
  serverName: string;
  expiresAt: number;
}

export class DevicePairingManager {
  private activeTokens = new Map<string, ActiveToken>();

  constructor(
    private keyManager: KeyManager,
    private deviceRepo: DeviceRepository
  ) {}

  public async generatePairingToken(serverUrl: string, serverName: string): Promise<PairingTokenInfo> {
    // Clean expired
    const now = Date.now();
    for (const [k, v] of this.activeTokens.entries()) {
      if (v.expiresAt <= now) this.activeTokens.delete(k);
    }

    const token = `pair_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = now + PAIRING_TOKEN_TTL_MS;

    this.activeTokens.set(token, {
      token,
      serverUrl,
      serverName,
      expiresAt,
    });

    const directUrl = `${serverUrl}/?pair=${token}`;

    const qrDataUrl = await QRCode.toDataURL(directUrl, {
      margin: 2,
      width: 280,
      color: {
        dark: '#18181b',
        light: '#ffffff',
      },
    });

    return {
      token,
      serverUrl,
      serverName,
      expiresAt,
      qrDataUrl,
    };
  }

  public completePairing(token: string, deviceName: string, clientIp: string): { apiKey: string; serverUrl: string } {
    const record = this.activeTokens.get(token);
    if (!record || record.expiresAt <= Date.now()) {
      throw new AppError('Pairing token is invalid or has expired', 'INVALID_PAIRING_TOKEN', 400);
    }

    this.activeTokens.delete(token);

    // Register device in repository
    this.deviceRepo.recordActivity(clientIp, 'Mobile/Pairing Client', deviceName);

    // Generate local API key for device
    const { rawKey } = this.keyManager.generateKey(`Paired: ${deviceName}`);

    return {
      apiKey: rawKey,
      serverUrl: record.serverUrl,
    };
  }
}
