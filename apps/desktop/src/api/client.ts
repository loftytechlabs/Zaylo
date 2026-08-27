import type { IPCChannels, IPCEvents } from '@local-ai/protocol';

export interface AppAPI {
  invoke<K extends keyof IPCChannels>(
    channel: K,
    args: IPCChannels[K]['request']
  ): Promise<IPCChannels[K]['response']>;
  on<E extends keyof IPCEvents>(
    event: E,
    listener: (data: IPCEvents[E]) => void
  ): () => void;
}

function getBridge() {
  if (typeof window !== 'undefined') {
    const win = window as any;
    if (win.electronAPI && typeof win.electronAPI.invoke === 'function') {
      return win.electronAPI;
    }
    if (win.api && typeof win.api.invoke === 'function') {
      return win.api;
    }
  }
  return null;
}

export const api: AppAPI = {
  invoke(channel, args) {
    const bridge = getBridge();
    if (bridge) {
      return bridge.invoke(channel, args);
    }
    return Promise.resolve(null as any);
  },
  on(event, listener) {
    const bridge = getBridge();
    if (bridge) {
      return bridge.on(event, listener);
    }
    return () => {};
  },
};
