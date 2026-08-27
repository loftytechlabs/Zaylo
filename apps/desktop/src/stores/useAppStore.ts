import { create } from 'zustand';
import { api } from '../api/client';
import type {
  HardwareProfile,
  CapabilityProfile,
  Model,
  ModelInstallation,
  DownloadProgress,
  ServerConfiguration,
  RuntimeInstance,
  ServerState,
  ConnectedDevice,
  APIKeyInfo,
  SystemMetricSample,
  StructuredLog,
  ChatMessage,
} from '@local-ai/shared';

export type NavTab =
  | 'overview'
  | 'models'
  | 'playground'
  | 'server'
  | 'devices'
  | 'performance'
  | 'logs'
  | 'benchmark'
  | 'settings';

interface AppStore {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;

  // Onboarding
  showOnboarding: boolean;
  setShowOnboarding: (show: boolean) => void;

  // Hardware & Capabilities
  hardware?: HardwareProfile;
  capabilities?: CapabilityProfile;
  fetchHardware: () => Promise<void>;

  // Server & Lifecycle
  serverState: ServerState;
  serverInstance?: RuntimeInstance;
  serverConfig?: ServerConfiguration;
  lanAddress?: string;
  fetchServerState: () => Promise<void>;
  startServer: (modelId?: string, variantId?: string) => Promise<void>;
  stopServer: () => Promise<void>;
  restartServer: () => Promise<void>;
  updateServerConfig: (config: Partial<ServerConfiguration>) => Promise<void>;

  // Models
  availableModels: Model[];
  installedModels: ModelInstallation[];
  downloads: Record<string, DownloadProgress>;
  fetchModels: () => Promise<void>;
  downloadModel: (modelId: string, variantId: string, downloadUrl?: string, name?: string) => Promise<string>;
  cancelDownload: (downloadId: string) => Promise<void>;
  deleteModel: (installationId: string) => Promise<void>;
  importLocalModel: (filePath?: string, name?: string) => Promise<ModelInstallation | null>;

  // Metrics & Telemetry
  currentMetric?: SystemMetricSample;
  metricHistory: SystemMetricSample[];
  updateMetric: (sample: SystemMetricSample) => void;

  // Logs
  logs: StructuredLog[];
  addLog: (log: StructuredLog) => void;
  fetchLogs: () => Promise<void>;
  clearLogs: () => Promise<void>;

  // Devices & Keys
  devices: ConnectedDevice[];
  apiKeys: APIKeyInfo[];
  fetchDevicesAndKeys: () => Promise<void>;
  createKey: (name: string) => Promise<{ key: APIKeyInfo; rawKey: string }>;
  revokeKey: (keyId: string) => Promise<void>;
  deleteKey: (keyId: string) => Promise<void>;
  revokeDevice: (deviceId: string) => Promise<void>;
  deleteDevice: (deviceId: string) => Promise<void>;

  // Playground Chat State
  playgroundMessages: ChatMessage[];
  isGenerating: boolean;
  activeRequestId?: string;
  generationStats?: { latencyMs: number; tokensPerSec: number; tokenCount: number };
  systemPrompt: string;
  temperature: number;
  topP: number;
  selectedModel: string;
  setSystemPrompt: (prompt: string) => void;
  setTemperature: (t: number) => void;
  setTopP: (p: number) => void;
  setSelectedModel: (m: string) => void;
  addPlaygroundMessage: (msg: ChatMessage) => void;
  updateLastAssistantMessage: (delta: string) => void;
  clearPlayground: () => void;
  sendChatMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  activeTab: 'overview',
  setActiveTab: (tab) => set({ activeTab: tab }),

  showOnboarding: false,
  setShowOnboarding: (show) => set({ showOnboarding: show }),

  serverState: 'STOPPED',
  serverConfig: undefined,
  availableModels: [],
  installedModels: [],
  downloads: {},
  metricHistory: [],
  logs: [],
  devices: [],
  apiKeys: [],

  // Playground Defaults
  playgroundMessages: [
    { role: 'assistant', content: 'Hello! I am your private local AI assistant running on this server. How can I help you today?' },
  ],
  isGenerating: false,
  systemPrompt: 'You are a helpful, fast, and accurate local AI assistant.',
  temperature: 0.7,
  topP: 0.9,
  selectedModel: '',
  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
  setTemperature: (t) => set({ temperature: t }),
  setTopP: (p) => set({ topP: p }),
  setSelectedModel: (m) => set({ selectedModel: m }),

  fetchHardware: async () => {
    try {
      const [hardware, capabilities] = await Promise.all([
        api.invoke('hardware:get-profile', undefined),
        api.invoke('hardware:get-capabilities', undefined),
      ]);
      set({ hardware, capabilities });
    } catch (err) {
      console.error('Failed to fetch hardware profile:', err);
    }
  },

  fetchServerState: async () => {
    try {
      const [stateRes, config] = await Promise.all([
        api.invoke('server:get-state', undefined),
        api.invoke('server:get-config', undefined),
      ]);
      set({
        serverState: stateRes.state,
        serverInstance: stateRes.instance,
        lanAddress: stateRes.lanAddress,
        serverConfig: config,
      });
      if (stateRes.instance?.modelName && !get().selectedModel) {
        set({ selectedModel: stateRes.instance.modelName });
      }
    } catch (err) {
      console.error('Failed to fetch server state:', err);
    }
  },

  startServer: async (modelId, variantId) => {
    try {
      set({ serverState: 'STARTING' });
      await api.invoke('server:start', { modelId, variantId });
      await get().fetchServerState();
    } catch (err) {
      console.error('Failed to start server:', err);
      await get().fetchServerState();
      throw err;
    }
  },

  stopServer: async () => {
    try {
      set({ serverState: 'STOPPING' });
      await api.invoke('server:stop', undefined);
      await get().fetchServerState();
    } catch (err) {
      console.error('Failed to stop server:', err);
      await get().fetchServerState();
      throw err;
    }
  },

  restartServer: async () => {
    try {
      set({ serverState: 'STARTING' });
      await api.invoke('server:restart', undefined);
      await get().fetchServerState();
    } catch (err) {
      console.error('Failed to restart server:', err);
      await get().fetchServerState();
      throw err;
    }
  },

  updateServerConfig: async (config) => {
    try {
      const updated = await api.invoke('server:update-config', config);
      set({ serverConfig: updated });
    } catch (err) {
      console.error('Failed to update config:', err);
      throw err;
    }
  },

  fetchModels: async () => {
    try {
      const [available, installed, downloadsList] = await Promise.all([
        api.invoke('models:list-available', undefined),
        api.invoke('models:list-installed', undefined),
        api.invoke('models:get-downloads', undefined),
      ]);
      const dlMap: Record<string, DownloadProgress> = {};
      for (const d of downloadsList || []) {
        dlMap[d.id] = d;
      }
      set({ availableModels: available || [], installedModels: installed || [], downloads: dlMap });
    } catch (err) {
      console.error('Failed to fetch models:', err);
    }
  },

  downloadModel: async (modelId, variantId, downloadUrl, name) => {
    const res = await api.invoke('models:download', { modelId, variantId, downloadUrl, name });
    return res.downloadId;
  },

  cancelDownload: async (downloadId) => {
    await api.invoke('models:cancel-download', { downloadId });
    const next = { ...get().downloads };
    delete next[downloadId];
    set({ downloads: next });
  },

  deleteModel: async (installationId) => {
    await api.invoke('models:delete', { installationId });
    await get().fetchModels();
  },

  importLocalModel: async (filePath, name) => {
    const inst = await api.invoke('models:import-local', { filePath, name });
    if (inst) {
      await get().fetchModels();
    }
    return inst;
  },

  updateMetric: (sample) => {
    set((state) => {
      const history = [...state.metricHistory, sample];
      if (history.length > 60) history.shift();
      return { currentMetric: sample, metricHistory: history };
    });
  },

  addLog: (log) => {
    set((state) => ({
      logs: [log, ...state.logs].slice(0, 300),
    }));
  },

  fetchLogs: async () => {
    try {
      const logs = await api.invoke('logs:get-recent', { limit: 100 });
      set({ logs: logs || [] });
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  },

  clearLogs: async () => {
    await api.invoke('logs:clear', undefined);
    set({ logs: [] });
  },

  fetchDevicesAndKeys: async () => {
    try {
      const [devices, apiKeys] = await Promise.all([
        api.invoke('devices:list', undefined),
        api.invoke('keys:list', undefined),
      ]);

      // If no active keys exist, auto-create a default primary key on startup
      if (!apiKeys || apiKeys.filter((k: any) => !k.isRevoked).length === 0) {
        const created = await api.invoke('keys:create', { name: 'Default Primary Key' });
        if (created?.rawKey) {
          localStorage.setItem('default_raw_api_key', created.rawKey);
        }
        const refreshedKeys = await api.invoke('keys:list', undefined);
        set({ devices: devices || [], apiKeys: refreshedKeys || [] });
      } else {
        set({ devices: devices || [], apiKeys: apiKeys || [] });
      }
    } catch (err) {
      console.error('Failed to fetch devices and keys:', err);
    }
  },

  createKey: async (name) => {
    const res = await api.invoke('keys:create', { name });
    if (res?.rawKey) {
      localStorage.setItem('default_raw_api_key', res.rawKey);
    }
    await get().fetchDevicesAndKeys();
    return res;
  },

  revokeKey: async (keyId) => {
    await api.invoke('keys:revoke', { keyId });
    await get().fetchDevicesAndKeys();
  },

  deleteKey: async (keyId) => {
    await api.invoke('keys:delete', { keyId });
    await get().fetchDevicesAndKeys();
  },

  revokeDevice: async (deviceId) => {
    await api.invoke('devices:revoke', { deviceId });
    await get().fetchDevicesAndKeys();
  },

  deleteDevice: async (deviceId) => {
    await api.invoke('devices:delete', { deviceId });
    await get().fetchDevicesAndKeys();
  },

  addPlaygroundMessage: (msg) => {
    set((state) => ({ playgroundMessages: [...state.playgroundMessages, msg] }));
  },

  updateLastAssistantMessage: (delta) => {
    set((state) => {
      const msgs = [...state.playgroundMessages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + delta };
      } else {
        msgs.push({ role: 'assistant', content: delta });
      }
      return { playgroundMessages: msgs };
    });
  },

  clearPlayground: () => {
    set({
      playgroundMessages: [],
      generationStats: undefined,
    });
  },

  sendChatMessage: async (content) => {
    const state = get();
    if (state.isGenerating || !content.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: content.trim() };
    const allMsgs: ChatMessage[] = [];
    if (state.systemPrompt.trim()) {
      allMsgs.push({ role: 'system', content: state.systemPrompt.trim() });
    }
    allMsgs.push(...state.playgroundMessages, userMsg);

    set((s) => ({
      playgroundMessages: [...s.playgroundMessages, userMsg, { role: 'assistant', content: '' }],
      isGenerating: true,
      generationStats: undefined,
    }));

    const startTime = Date.now();
    let tokenCount = 0;

    try {
      const response = await api.invoke('inference:chat', {
        model: state.selectedModel || 'default',
        messages: allMsgs,
        temperature: state.temperature,
        top_p: state.topP,
        stream: false,
      });

      const endTime = Date.now();
      const contentOut = response.choices[0]?.message?.content || '';
      tokenCount = response.usage?.completion_tokens || Math.max(1, Math.ceil(contentOut.length / 4));
      const latencyMs = endTime - startTime;
      const tokPerSec = latencyMs > 0 ? (tokenCount / (latencyMs / 1000)) : 0;

      set((s) => {
        const msgs = [...s.playgroundMessages];
        msgs[msgs.length - 1] = { role: 'assistant', content: contentOut };
        return {
          playgroundMessages: msgs,
          isGenerating: false,
          generationStats: {
            latencyMs,
            tokensPerSec: parseFloat(tokPerSec.toFixed(1)),
            tokenCount,
          },
        };
      });
    } catch (err: any) {
      set((s) => {
        const msgs = [...s.playgroundMessages];
        msgs[msgs.length - 1] = {
          role: 'assistant',
          content: `[Error: ${err?.message || 'Inference request failed'}]`,
        };
        return {
          playgroundMessages: msgs,
          isGenerating: false,
        };
      });
    }
  },

  stopGeneration: () => {
    const requestId = get().activeRequestId;
    if (requestId) {
      api.invoke('inference:abort', { requestId });
    }
    set({ isGenerating: false });
  },
}));
