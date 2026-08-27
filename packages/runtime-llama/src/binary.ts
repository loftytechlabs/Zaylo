import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import os from 'node:os';
import { AppError } from '@local-ai/shared';

export class LlamaBinaryManager {
  constructor(private runtimeDir: string) {
    if (!fs.existsSync(this.runtimeDir)) {
      fs.mkdirSync(this.runtimeDir, { recursive: true });
    }
  }

  public getCustomBinaryPath(): string {
    const isWin = process.platform === 'win32';
    const ext = isWin ? '.exe' : '';
    return path.join(this.runtimeDir, 'llama', `llama-server${ext}`);
  }

  public async findBinary(): Promise<string | null> {
    const customPath = this.getCustomBinaryPath();
    if (fs.existsSync(customPath)) {
      return customPath;
    }

    // Check system paths
    const candidates = [
      'llama-server',
      '/opt/homebrew/bin/llama-server',
      '/usr/local/bin/llama-server',
      '/usr/bin/llama-server',
      path.join(os.homedir(), '.local', 'bin', 'llama-server'),
    ];

    for (const candidate of candidates) {
      try {
        const cmd = process.platform === 'win32' ? `where ${candidate}` : `which ${candidate}`;
        const resolved = execSync(cmd, { encoding: 'utf-8', timeout: 1000 }).trim().split('\n')[0];
        if (resolved && fs.existsSync(resolved)) {
          return resolved;
        }
      } catch {
        if (fs.existsSync(candidate)) return candidate;
      }
    }

    return null;
  }

  public async install(): Promise<{ success: boolean; path?: string; error?: string }> {
    const destDir = path.join(this.runtimeDir, 'llama');
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const platform = process.platform;
    const arch = process.arch;

    // If macOS with brew available, try brew install
    if (platform === 'darwin') {
      try {
        execSync('which brew', { encoding: 'utf-8', timeout: 1000 });
        try {
          execSync('brew install llama.cpp', { encoding: 'utf-8', timeout: 300000 });
          const found = await this.findBinary();
          if (found) return { success: true, path: found };
        } catch {
          // Fall through to direct binary download
        }
      } catch {
        // brew not installed, fallback to binary download
      }
    }

    // Direct GitHub release download for llama.cpp prebuilt releases
    try {
      let assetName = '';
      if (platform === 'darwin') {
        assetName = arch === 'arm64' ? 'llama-b4800-bin-macos-arm64.zip' : 'llama-b4800-bin-macos-x64.zip';
      } else if (platform === 'linux') {
        assetName = 'llama-b4800-bin-ubuntu-x64.zip';
      } else if (platform === 'win32') {
        assetName = 'llama-b4800-bin-win-avx2-x64.zip';
      } else {
        throw new AppError(`Unsupported platform for auto-install: ${platform} ${arch}`);
      }

      const releaseUrl = `https://github.com/ggerganov/llama.cpp/releases/download/b4800/${assetName}`;
      const zipPath = path.join(destDir, 'llama-release.zip');

      const res = await fetch(releaseUrl);
      if (!res.ok) {
        throw new AppError(`Failed to download llama.cpp release: ${res.statusText}`);
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(zipPath, buffer);

      // Extract zip
      if (platform === 'win32') {
        execSync(`powershell -command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`);
      } else {
        execSync(`unzip -o "${zipPath}" -d "${destDir}"`);
        const serverBin = path.join(destDir, 'llama-server');
        if (fs.existsSync(serverBin)) {
          fs.chmodSync(serverBin, 0o755);
        }
      }

      try {
        fs.unlinkSync(zipPath);
      } catch {}

      const found = await this.findBinary();
      if (found) {
        return { success: true, path: found };
      }
      return { success: false, error: 'Installed files did not contain executable llama-server' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to install llama.cpp runtime' };
    }
  }
}
