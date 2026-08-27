import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { DownloadProgress } from '@local-ai/shared';
import { InsufficientResourcesError, AppError } from '@local-ai/shared';

export interface DownloadOptions {
  id: string;
  modelId: string;
  variantId: string;
  url: string;
  destPath: string;
  expectedSizeBytes: number;
  expectedSha256?: string;
  onProgress?: (progress: DownloadProgress) => void;
}

export class ModelDownloader {
  private activeTasks = new Map<string, { abortController: AbortController; isCancelled: boolean }>();

  public async download(options: DownloadOptions): Promise<string> {
    const { id, modelId, variantId, url, destPath, expectedSizeBytes, expectedSha256, onProgress } = options;

    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 1. Check disk space before download
    this.verifyDiskSpace(dir, expectedSizeBytes);

    const tempPath = `${destPath}.downloading`;
    let startByte = 0;
    if (fs.existsSync(tempPath)) {
      const stat = fs.statSync(tempPath);
      startByte = stat.size;
    }

    const abortController = new AbortController();
    this.activeTasks.set(id, { abortController, isCancelled: false });

    const filename = path.basename(destPath);
    let downloadedBytes = startByte;
    let totalBytes = expectedSizeBytes;
    const startedAt = Date.now();
    let lastSampleTime = startedAt;
    let lastSampleBytes = downloadedBytes;
    let bytesPerSecond = 0;

    const notifyProgress = (status: DownloadProgress['status'], error?: string) => {
      const now = Date.now();
      const timeDelta = (now - lastSampleTime) / 1000;
      if (timeDelta >= 0.5) {
        const bytesDelta = downloadedBytes - lastSampleBytes;
        bytesPerSecond = bytesDelta / timeDelta;
        lastSampleTime = now;
        lastSampleBytes = downloadedBytes;
      }

      const remainingBytes = Math.max(0, totalBytes - downloadedBytes);
      const estimatedSecondsRemaining = bytesPerSecond > 0 ? Math.round(remainingBytes / bytesPerSecond) : undefined;

      const progress: DownloadProgress = {
        id,
        modelId,
        variantId,
        filename,
        status,
        downloadedBytes,
        totalBytes,
        bytesPerSecond,
        estimatedSecondsRemaining,
        error,
        startedAt,
        updatedAt: now,
      };

      onProgress?.(progress);
    };

    notifyProgress('downloading');

    try {
      const headers: Record<string, string> = {
        'User-Agent': 'LocalAI-Downloader/1.0',
      };

      if (startByte > 0) {
        headers['Range'] = `bytes=${startByte}-`;
      }

      const response = await fetch(url, {
        headers,
        signal: abortController.signal,
      });

      if (!response.ok && response.status !== 206) {
        throw new AppError(`HTTP download failed with status ${response.status}: ${response.statusText}`, 'DOWNLOAD_FAILED');
      }

      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const contentLen = parseInt(contentLengthHeader, 10);
        if (!isNaN(contentLen)) {
          totalBytes = startByte > 0 ? startByte + contentLen : contentLen;
        }
      }

      if (!response.body) {
        throw new AppError('Download response body is empty', 'DOWNLOAD_EMPTY');
      }

      const writeStream = fs.createWriteStream(tempPath, { flags: startByte > 0 ? 'a' : 'w' });
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          writeStream.write(Buffer.from(value));
          downloadedBytes += value.length;
          notifyProgress('downloading');
        }
      }

      await new Promise<void>((resolve, reject) => {
        writeStream.end((err?: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Verification: Checksum if provided
      if (expectedSha256) {
        const actualHash = await this.computeSha256(tempPath);
        if (actualHash.toLowerCase() !== expectedSha256.toLowerCase()) {
          fs.unlinkSync(tempPath);
          throw new AppError(`Checksum verification failed. Expected ${expectedSha256}, got ${actualHash}`, 'CHECKSUM_MISMATCH');
        }
      }

      // Rename temp file to final destination
      if (fs.existsSync(destPath)) {
        fs.unlinkSync(destPath);
      }
      fs.renameSync(tempPath, destPath);

      notifyProgress('completed');
      this.activeTasks.delete(id);
      return destPath;
    } catch (err: any) {
      this.activeTasks.delete(id);
      if (abortController.signal.aborted) {
        if (fs.existsSync(tempPath)) {
          try {
            fs.unlinkSync(tempPath);
          } catch {}
        }
        notifyProgress('cancelled');
        throw new AppError('Download was cancelled by user', 'DOWNLOAD_CANCELLED');
      }

      const errorMessage = err?.message || 'Download failed';
      notifyProgress('failed', errorMessage);
      throw err;
    }
  }

  public cancel(id: string): boolean {
    const task = this.activeTasks.get(id);
    if (task) {
      task.isCancelled = true;
      task.abortController.abort();
      this.activeTasks.delete(id);
      return true;
    }
    return false;
  }

  private verifyDiskSpace(dir: string, requiredBytes: number): void {
    try {
      if (fs.statfsSync) {
        const stat = fs.statfsSync(dir);
        const freeBytes = stat.bavail * stat.bsize;
        const safetyMargin = 500 * 1024 * 1024; // 500 MB buffer
        if (freeBytes < requiredBytes + safetyMargin) {
          const reqGB = (requiredBytes / (1024 * 1024 * 1024)).toFixed(1);
          const availGB = (freeBytes / (1024 * 1024 * 1024)).toFixed(1);
          throw new InsufficientResourcesError(
            `Not enough storage space. Required: ${reqGB} GB, Available: ${availGB} GB.`
          );
        }
      }
    } catch (err) {
      if (err instanceof InsufficientResourcesError) throw err;
      // If statfs is not supported on this platform/FS, proceed
    }
  }

  private computeSha256(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', (data) => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (err) => reject(err));
    });
  }
}
