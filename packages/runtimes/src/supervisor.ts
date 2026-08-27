import { EventEmitter } from 'node:events';
import type { ServerState, RuntimeInstance } from '@local-ai/shared';

export interface SupervisorEvents {
  stateChanged: (state: ServerState, instance?: RuntimeInstance) => void;
  log: (level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string) => void;
  crashed: (error: Error) => void;
}

export class ProcessSupervisor extends EventEmitter {
  private state: ServerState = 'STOPPED';
  private currentInstance?: RuntimeInstance;

  public getState(): ServerState {
    return this.state;
  }

  public getInstance(): RuntimeInstance | undefined {
    return this.currentInstance;
  }

  public setState(state: ServerState, instance?: RuntimeInstance): void {
    if (this.state !== state || this.currentInstance !== instance) {
      this.state = state;
      this.currentInstance = instance;
      this.emit('stateChanged', state, instance);
    }
  }

  public handleProcessExit(code: number | null, signal: string | null): void {
    if (this.state === 'STOPPING' || this.state === 'STOPPED') {
      this.setState('STOPPED');
    } else {
      const msg = `Runtime process exited unexpectedly (code: ${code}, signal: ${signal})`;
      this.emit('log', 'ERROR', msg);
      if (this.currentInstance) {
        this.currentInstance.error = msg;
        this.currentInstance.state = 'CRASHED';
      }
      this.setState('CRASHED', this.currentInstance);
      this.emit('crashed', new Error(msg));
    }
  }
}
