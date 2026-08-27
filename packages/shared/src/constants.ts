import path from 'node:path';
import os from 'node:os';

export const DEFAULT_SERVER_PORT = 8080;
export const DEFAULT_SERVER_HOST = '127.0.0.1';
export const LAN_SERVER_HOST = '0.0.0.0';

export const DEFAULT_CONTEXT_LENGTH = 4096;
export const DEFAULT_MAX_CONCURRENT_REQUESTS = 4;
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_TOP_P = 0.9;

export const PAIRING_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getDefaultAppDataDir(): string {
  const home = os.homedir();
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'LocalAIServer');
  }
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'LocalAIServer');
  }
  return path.join(home, '.local-ai-server');
}

export function getDefaultModelsDir(): string {
  return path.join(getDefaultAppDataDir(), 'models');
}

export function getDefaultRuntimeDir(): string {
  return path.join(getDefaultAppDataDir(), 'runtimes');
}

export function getDefaultDatabasePath(): string {
  return path.join(getDefaultAppDataDir(), 'local-ai.sqlite');
}
