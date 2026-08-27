import { RateLimitError } from '@local-ai/shared';

export class RequestQueue {
  private activeCount = 0;
  private queue: Array<() => void> = [];

  constructor(
    private maxConcurrent: number = 4,
    private maxQueueSize: number = 16
  ) {}

  public getActiveCount(): number {
    return this.activeCount;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public setMaxConcurrent(limit: number): void {
    this.maxConcurrent = Math.max(1, limit);
    this.processNext();
  }

  public async acquire(): Promise<() => void> {
    if (this.activeCount < this.maxConcurrent) {
      this.activeCount++;
      return () => this.release();
    }

    if (this.queue.length >= this.maxQueueSize) {
      throw new RateLimitError('Inference server queue is full. Try again shortly.');
    }

    return new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        this.activeCount++;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    this.activeCount = Math.max(0, this.activeCount - 1);
    this.processNext();
  }

  private processNext(): void {
    if (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    }
  }
}
