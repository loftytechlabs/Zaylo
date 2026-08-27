import React, { useState } from 'react';
import {
  Settings,
  Folder,
  Save,
  Check,
  Layers,
  Zap,
  HardDrive,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { api } from '../../api/client';

export const SettingsView: React.FC = () => {
  const { serverConfig, updateServerConfig } = useAppStore();

  const [port, setPort] = useState(serverConfig?.port || 8080);
  const [maxConcurrency, setMaxConcurrency] = useState(serverConfig?.maxConcurrentRequests || 4);
  const [contextLimit, setContextLimit] = useState(serverConfig?.contextLimit || 4096);
  const [gpuLayers, setGpuLayers] = useState(serverConfig?.gpuLayers ?? 99);
  const [threads, setThreads] = useState(serverConfig?.threads || 6);
  const [lowMemoryMode, setLowMemoryMode] = useState(serverConfig?.lowMemoryMode || false);
  const [flashAttention, setFlashAttention] = useState(serverConfig?.flashAttention ?? true);
  const [modelsDir, setModelsDir] = useState(serverConfig?.modelsDirectory || '');
  const [runtimeDir, setRuntimeDir] = useState(serverConfig?.runtimeDirectory || '');
  const [saved, setSaved] = useState(false);

  const handleSelectModelsDir = async () => {
    const dir = await api.invoke('app:select-directory', { defaultPath: modelsDir });
    if (dir) setModelsDir(dir);
  };

  const handleSelectRuntimeDir = async () => {
    const dir = await api.invoke('app:select-directory', { defaultPath: runtimeDir });
    if (dir) setRuntimeDir(dir);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateServerConfig({
        port,
        maxConcurrentRequests: maxConcurrency,
        contextLimit,
        gpuLayers,
        threads,
        lowMemoryMode,
        flashAttention,
        modelsDirectory: modelsDir,
        runtimeDirectory: runtimeDir,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#202227] pb-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Settings className="w-4 h-4 text-blue-400" />
            Server & Runtime Configuration
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Configure system ports, memory streaming modes, thread concurrency, and storage paths.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm"
        >
          {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          <span>{saved ? 'Saved ✓' : 'Save Changes'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* 1. Low-Memory Layer Streaming Mode Card */}
        <div className="p-6 rounded-xl bg-gradient-to-r from-[#12151d] via-[#111318] to-[#16121f] border border-blue-900/40 space-y-5 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-zinc-100">Low-Memory Layer Streaming Mode</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                  lowMemoryMode ? 'bg-blue-950 text-blue-300 border border-blue-800/60' : 'bg-zinc-800 text-zinc-400'
                }`}>
                  {lowMemoryMode ? 'ACTIVE' : 'STANDARD'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
                Enables 8-bit quantized key-value tensor caching (<code className="font-mono text-zinc-300">-ctk q8_0 -ctv q8_0</code>) and Flash Attention. Allows running larger <strong>7B, 8B, 12B, and 14B models</strong> on machines with low physical RAM (e.g. 8GB RAM) with minimal memory footprint.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={lowMemoryMode}
                onChange={(e) => setLowMemoryMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs font-mono">
            <div className="p-3 rounded-lg bg-[#0c0e12] border border-[#1e222d] space-y-1">
              <span className="text-zinc-500 text-[10px] block">ACTIVE RAM SAVINGS</span>
              <span className="text-emerald-400 font-semibold">~60% to 70% Less Working RAM</span>
              <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                Sequential forward pass reads layer weights on-demand from disk.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[#0c0e12] border border-[#1e222d] space-y-1">
              <span className="text-zinc-500 text-[10px] block">SPEED CHARACTERISTICS</span>
              <span className="text-blue-300 font-semibold">Fast on NVMe / Apple Unified Memory</span>
              <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                Yields 8–25+ tok/s while preventing out-of-memory crashes.
              </p>
            </div>
          </div>
        </div>

        {/* 2. Compute & Acceleration */}
        <div className="p-6 rounded-lg bg-[#111317] border border-[#22252c] space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Compute & Hardware Acceleration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-medium">GPU Offload Layers</label>
              <input
                type="number"
                min="0"
                max="999"
                value={gpuLayers}
                onChange={(e) => setGpuLayers(parseInt(e.target.value, 10))}
                className="w-full bg-[#0d0f12] border border-[#23262f] rounded px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-zinc-500">99 = Offload all layers to GPU</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-medium">CPU Threads</label>
              <input
                type="number"
                min="1"
                max="64"
                value={threads}
                onChange={(e) => setThreads(parseInt(e.target.value, 10))}
                className="w-full bg-[#0d0f12] border border-[#23262f] rounded px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-zinc-500">Physical cores allocation</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-medium">Default Context Limit</label>
              <input
                type="number"
                min="512"
                max="131072"
                step="512"
                value={contextLimit}
                onChange={(e) => setContextLimit(parseInt(e.target.value, 10))}
                className="w-full bg-[#0d0f12] border border-[#23262f] rounded px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-zinc-500">Tokens in context window</span>
            </div>
          </div>

          {/* Flash Attention Toggle */}
          <div className="pt-2 border-t border-[#1c1f26] flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-400" />
                Flash Attention Kernel
              </div>
              <p className="text-[11px] text-zinc-500">
                Reduces KV cache memory footprint by 50% using optimized tiled matrix kernels.
              </p>
            </div>
            <input
              type="checkbox"
              checked={flashAttention}
              onChange={(e) => setFlashAttention(e.target.checked)}
              className="rounded border-[#2a2f3d] bg-[#1a1d26] text-blue-500"
            />
          </div>
        </div>

        {/* 3. Network & Concurrency */}
        <div className="p-6 rounded-lg bg-[#111317] border border-[#22252c] space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400">Networking & Queue</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-medium">Server Port</label>
              <input
                type="number"
                min="1024"
                max="65535"
                value={port}
                onChange={(e) => setPort(parseInt(e.target.value, 10))}
                className="w-full bg-[#0d0f12] border border-[#23262f] rounded px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-zinc-500">Default: 8080 (Inference API: /v1)</span>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-medium">Max Concurrent Requests</label>
              <input
                type="number"
                min="1"
                max="32"
                value={maxConcurrency}
                onChange={(e) => setMaxConcurrency(parseInt(e.target.value, 10))}
                className="w-full bg-[#0d0f12] border border-[#23262f] rounded px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
              />
              <span className="text-[11px] text-zinc-500">Limits concurrency to prevent memory spikes</span>
            </div>
          </div>
        </div>

        {/* 4. File Storage Paths */}
        <div className="p-6 rounded-lg bg-[#111317] border border-[#22252c] space-y-4">
          <h3 className="text-xs font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            File Storage Locations
          </h3>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-medium">Models Storage Directory</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={modelsDir}
                  onChange={(e) => setModelsDir(e.target.value)}
                  className="flex-1 bg-[#0d0f12] border border-[#23262f] rounded px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSelectModelsDir}
                  className="px-3 py-2 bg-[#1b1e25] hover:bg-[#232731] border border-[#282c37] rounded text-xs text-zinc-300 flex items-center gap-1.5"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Browse</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-zinc-300 font-medium">Runtime Binaries Directory</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={runtimeDir}
                  onChange={(e) => setRuntimeDir(e.target.value)}
                  className="flex-1 bg-[#0d0f12] border border-[#23262f] rounded px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSelectRuntimeDir}
                  className="px-3 py-2 bg-[#1b1e25] hover:bg-[#232731] border border-[#282c37] rounded text-xs text-zinc-300 flex items-center gap-1.5"
                >
                  <Folder className="w-3.5 h-3.5" />
                  <span>Browse</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
