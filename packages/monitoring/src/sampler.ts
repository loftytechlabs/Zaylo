import os from 'node:os';
import { EventEmitter } from 'node:events';
import type { SystemMetricSample, SystemPlatform } from '@local-ai/shared';
import { HardwareScanner } from '@local-ai/hardware';
import type { MetricsRepository } from '@local-ai/database';
import type { InferenceService } from '@local-ai/inference';

export class SystemMonitor extends EventEmitter {
  private timer?: NodeJS.Timeout;
  private prevCpuTimes: Array<{ idle: number; total: number }> = [];
  private lastSample?: SystemMetricSample;
  private isSampling = false;

  constructor(
    private metricsRepo?: MetricsRepository,
    private inferenceService?: InferenceService,
    private intervalMs: number = 1000
  ) {
    super();
  }

  public start(): void {
    if (this.timer) return;
    this.prevCpuTimes = this.getCpuTimes();
    
    // Sample immediately
    this.sample();

    this.timer = setInterval(() => {
      this.sample();
    }, this.intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  public getCurrentSample(): SystemMetricSample {
    return this.lastSample || this.createInstantSample();
  }

  public async sample(): Promise<SystemMetricSample> {
    if (this.isSampling) return this.getCurrentSample();
    this.isSampling = true;

    try {
      const platform = process.platform as SystemPlatform;
      const mem = HardwareScanner.detectMemory(platform);
      const cpuPercent = this.calculateCpuPercent();
      
      const inferenceMetrics = this.inferenceService?.getMetrics() || {
        totalRequests: 0,
        activeRequests: 0,
        averageTokensPerSec: 0,
        averageLatencyMs: 0,
      };

      const sample: SystemMetricSample = {
        timestamp: Date.now(),
        cpuPercent: Math.min(100, Math.max(0, parseFloat(cpuPercent.toFixed(1)))),
        memoryUsedBytes: mem.usedBytes,
        memoryTotalBytes: mem.totalBytes,
        activeRequests: inferenceMetrics.activeRequests,
        tokensPerSecond: inferenceMetrics.averageTokensPerSec,
        latencyMs: inferenceMetrics.averageLatencyMs,
      };

      this.lastSample = sample;
      this.emit('sample', sample);
      this.metricsRepo?.addSample(sample);

      return sample;
    } finally {
      this.isSampling = false;
    }
  }

  private createInstantSample(): SystemMetricSample {
    const mem = HardwareScanner.detectMemory(process.platform as SystemPlatform);
    return {
      timestamp: Date.now(),
      cpuPercent: 0,
      memoryUsedBytes: mem.usedBytes,
      memoryTotalBytes: mem.totalBytes,
      activeRequests: 0,
      tokensPerSecond: 0,
      latencyMs: 0,
    };
  }

  private getCpuTimes(): Array<{ idle: number; total: number }> {
    const cpus = os.cpus();
    return cpus.map((cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      return { idle: cpu.times.idle, total };
    });
  }

  private calculateCpuPercent(): number {
    const current = this.getCpuTimes();
    if (this.prevCpuTimes.length === 0 || this.prevCpuTimes.length !== current.length) {
      this.prevCpuTimes = current;
      return 0;
    }

    let totalDiff = 0;
    let idleDiff = 0;

    for (let i = 0; i < current.length; i++) {
      const prev = this.prevCpuTimes[i];
      const cur = current[i];

      const tDiff = cur.total - prev.total;
      const iDiff = cur.idle - prev.idle;

      totalDiff += tDiff;
      idleDiff += iDiff;
    }

    this.prevCpuTimes = current;

    if (totalDiff <= 0) return 0;
    const usage = ((totalDiff - idleDiff) / totalDiff) * 100;
    return usage;
  }
}
