import React from 'react';
import {
  Server,
  Cpu,
  HardDrive,
  Activity,
  Zap,
  Smartphone,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

export const OverviewView: React.FC = () => {
  const {
    serverState,
    serverInstance,
    serverConfig,
    hardware,
    currentMetric,
    installedModels,
    devices,
    logs,
    setActiveTab,
  } = useAppStore();

  const totalRamGb = hardware ? (hardware.memory.totalBytes / 1e9).toFixed(1) : '16.0';
  const usedRamGb = currentMetric ? (currentMetric.memoryUsedBytes / 1e9).toFixed(1) : '0.0';
  const cpuPercent = currentMetric ? currentMetric.cpuPercent.toFixed(1) : '0.0';
  const tokPerSec = currentMetric ? currentMetric.tokensPerSecond.toFixed(1) : '0.0';
  const latencyMs = currentMetric ? currentMetric.latencyMs : 0;
  const activeRequests = currentMetric ? currentMetric.activeRequests : 0;

  const primaryGpu = hardware?.primaryGPU;

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto overflow-y-auto h-[calc(100vh-4rem)]">
      {/* Top Banner / Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Server Status Card */}
        <div className="p-5 rounded-lg bg-[#111317] border border-[#22252c] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-2">
              <span>INFERENCE SERVER</span>
              <Server className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="flex items-center gap-2.5 my-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  serverState === 'RUNNING'
                    ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                    : serverState === 'STARTING'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-zinc-600'
                }`}
              />
              <span className="text-xl font-bold tracking-tight text-zinc-100">{serverState}</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#1c1f26] flex items-center justify-between text-xs">
            <span className="text-zinc-500">Port {serverConfig?.port || 8080}</span>
            <span className="text-zinc-400 font-mono">{serverConfig?.lanEnabled ? 'LAN Active' : 'Localhost Only'}</span>
          </div>
        </div>

        {/* 2. Loaded Model Card */}
        <div className="p-5 rounded-lg bg-[#111317] border border-[#22252c] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-2">
              <span>LOADED MODEL</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl font-bold tracking-tight text-zinc-100 truncate my-2">
              {serverInstance?.modelName || (installedModels.length > 0 ? 'Ready to load' : 'No models installed')}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#1c1f26] flex items-center justify-between text-xs">
            <span className="text-zinc-500">
              {serverInstance ? `${serverInstance.gpuLayersOffloaded} GPU Layers` : `${installedModels.length} Installed`}
            </span>
            <button
              onClick={() => setActiveTab('models')}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Manage Models →
            </button>
          </div>
        </div>

        {/* 3. Connected Devices Card */}
        <div className="p-5 rounded-lg bg-[#111317] border border-[#22252c] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-2">
              <span>CONNECTED DEVICES</span>
              <Smartphone className="w-4 h-4 text-purple-400" />
            </div>
            {(() => {
              const onlineCount = devices.filter((d) => !d.isRevoked && Date.now() - d.lastRequestAt < 45000).length;
              return (
                <div className="text-xl font-bold tracking-tight text-zinc-100 my-2 flex items-baseline gap-2">
                  <span>{onlineCount}</span>
                  <span className="text-xs font-normal text-zinc-400 font-sans">
                    {onlineCount === 1 ? 'Device Online' : 'Devices Online'}
                  </span>
                </div>
              );
            })()}
          </div>
          <div className="mt-4 pt-3 border-t border-[#1c1f26] flex items-center justify-between text-xs">
            <span className="text-zinc-500">{serverConfig?.lanEnabled ? 'LAN Active' : 'LAN Disabled'}</span>
            <button
              onClick={() => setActiveTab('devices')}
              className="text-purple-400 hover:text-purple-300 font-medium"
            >
              Manage Devices →
            </button>
          </div>
        </div>
      </div>

      {/* Compute & Telemetry Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Compute Resource Gauges */}
        <div className="p-6 rounded-lg bg-[#111317] border border-[#22252c] space-y-6">
          <div className="flex items-center justify-between border-b border-[#1c1f26] pb-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">Host Compute Utilization</h2>
            <span className="text-[11px] text-zinc-500 font-mono">Real OS telemetry</span>
          </div>

          <div className="space-y-4">
            {/* CPU */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-zinc-500" />
                  CPU Load
                </span>
                <span className="text-zinc-200 font-bold">{cpuPercent}%</span>
              </div>
              <div className="h-2 w-full bg-[#1c1f26] rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, parseFloat(cpuPercent)))}%` }}
                />
              </div>
              <div className="mt-1 text-[11px] text-zinc-500 truncate">
                {hardware?.cpu.model || 'Multi-core CPU'}
              </div>
            </div>

            {/* RAM */}
            <div>
              <div className="flex justify-between text-xs font-mono mb-1.5">
                <span className="text-zinc-400 flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                  System Memory (RAM)
                </span>
                <span className="text-zinc-200 font-bold">
                  {usedRamGb} / {totalRamGb} GB
                </span>
              </div>
              <div className="h-2 w-full bg-[#1c1f26] rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      100,
                      (parseFloat(usedRamGb) / (parseFloat(totalRamGb) || 1)) * 100
                    )}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                {hardware ? `${(hardware.memory.availableBytes / 1e9).toFixed(1)} GB available for models` : ''}
              </div>
            </div>

            {/* GPU if available */}
            {primaryGpu && (
              <div>
                <div className="flex justify-between text-xs font-mono mb-1.5">
                  <span className="text-zinc-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    GPU: {primaryGpu.model}
                  </span>
                  <span className="text-zinc-200 font-bold">{primaryGpu.backend.toUpperCase()}</span>
                </div>
                <div className="text-[11px] text-zinc-500">
                  {primaryGpu.vramBytes
                    ? `${(primaryGpu.vramBytes / 1e9).toFixed(1)} GB Dedicated VRAM`
                    : 'Hardware Acceleration Active'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Live Inference Performance Card */}
        <div className="p-6 rounded-lg bg-[#111317] border border-[#22252c] space-y-6">
          <div className="flex items-center justify-between border-b border-[#1c1f26] pb-3">
            <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">Live Inference Performance</h2>
            <span className="text-[11px] text-zinc-500 font-mono">Real-time throughput</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded bg-[#0e1013] border border-[#1d2027]">
              <div className="text-zinc-500 text-xs font-mono">GENERATION SPEED</div>
              <div className="text-2xl font-bold text-zinc-100 font-mono mt-1">
                {tokPerSec} <span className="text-xs font-normal text-zinc-400">tok/s</span>
              </div>
            </div>

            <div className="p-4 rounded bg-[#0e1013] border border-[#1d2027]">
              <div className="text-zinc-500 text-xs font-mono">LATENCY</div>
              <div className="text-2xl font-bold text-zinc-100 font-mono mt-1">
                {latencyMs} <span className="text-xs font-normal text-zinc-400">ms</span>
              </div>
            </div>

            <div className="p-4 rounded bg-[#0e1013] border border-[#1d2027]">
              <div className="text-zinc-500 text-xs font-mono">ACTIVE REQUESTS</div>
              <div className="text-2xl font-bold text-zinc-100 font-mono mt-1">{activeRequests}</div>
            </div>

            <div className="p-4 rounded bg-[#0e1013] border border-[#1d2027]">
              <div className="text-zinc-500 text-xs font-mono">CONCURRENCY LIMIT</div>
              <div className="text-2xl font-bold text-zinc-100 font-mono mt-1">
                {serverConfig?.maxConcurrentRequests || 4}
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => setActiveTab('playground')}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
            >
              Open Interactive Playground →
            </button>
          </div>
        </div>
      </div>

      {/* Recent System Activity Log */}
      <div className="p-6 rounded-lg bg-[#111317] border border-[#22252c] space-y-4">
        <div className="flex items-center justify-between border-b border-[#1c1f26] pb-3">
          <h2 className="text-xs font-mono uppercase tracking-wider text-zinc-400">Live Activity Feed</h2>
          <button onClick={() => setActiveTab('logs')} className="text-xs text-blue-400 hover:text-blue-300">
            View All Logs →
          </button>
        </div>

        {logs.length === 0 ? (
          <div className="text-xs text-zinc-500 py-4 text-center">No system events logged yet.</div>
        ) : (
          <div className="space-y-2 font-mono text-xs max-h-48 overflow-y-auto">
            {logs.slice(0, 6).map((log) => (
              <div key={log.id} className="flex items-start gap-3 p-2 rounded bg-[#0d0f12]">
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    log.level === 'ERROR'
                      ? 'bg-rose-950 text-rose-300'
                      : log.level === 'WARN'
                      ? 'bg-amber-950 text-amber-300'
                      : 'bg-zinc-800 text-zinc-300'
                  }`}
                >
                  {log.level}
                </span>
                <span className="text-zinc-500 text-[11px]">[{log.component}]</span>
                <span className="text-zinc-300 flex-1 truncate">{log.message}</span>
                <span className="text-zinc-600 text-[10px]">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
