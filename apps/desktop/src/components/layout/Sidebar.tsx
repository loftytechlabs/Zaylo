import React from 'react';
import {
  LayoutDashboard,
  Boxes,
  MessageSquare,
  Server,
  Smartphone,
  Activity,
  Terminal,
  Gauge,
  Settings,
} from 'lucide-react';
import { useAppStore, NavTab } from '../../stores/useAppStore';

interface NavItem {
  id: NavTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, serverState, installedModels, devices } = useAppStore();

  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'models', label: 'Models', icon: Boxes, badge: installedModels.length },
    { id: 'playground', label: 'Playground', icon: MessageSquare },
    { id: 'server', label: 'Server & API', icon: Server },
    { id: 'devices', label: 'Devices', icon: Smartphone, badge: devices.length > 0 ? devices.length : undefined },
    { id: 'performance', label: 'Performance', icon: Activity },
    { id: 'logs', label: 'Logs', icon: Terminal },
    { id: 'benchmark', label: 'Benchmark', icon: Gauge },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0e1013] border-r border-[#202227] flex flex-col justify-between select-none shrink-0 h-screen">
      <div>
        {/* macOS Traffic Lights Header & Drag Spacer */}
        <div className="h-8 shrink-0 w-full [-webkit-app-region:drag]" />

        {/* Brand */}
        <div className="px-5 pb-3.5 pt-0.5 flex items-center gap-3 border-b border-[#202227]">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center p-1.5 shrink-0 overflow-hidden">
            <img src="/logo.png" alt="Zaylo Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="font-semibold text-sm tracking-wide text-zinc-100">Zaylo</div>
            <div className="text-[11px] text-zinc-500 font-mono">v1.0.1 • AI Engine</div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1b1e24] text-zinc-100 border border-[#2e323b]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#14161a]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </div>
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#252830] text-zinc-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-[#202227] bg-[#0b0c0e]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                serverState === 'RUNNING'
                  ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                  : serverState === 'STARTING'
                  ? 'bg-amber-500 animate-pulse'
                  : serverState === 'ERROR' || serverState === 'CRASHED'
                  ? 'bg-rose-500'
                  : 'bg-zinc-600'
              }`}
            />
            <span className="text-xs font-medium text-zinc-300 font-mono">{serverState}</span>
          </div>
          <span className="text-[11px] text-zinc-500 font-mono">100% Real</span>
        </div>
      </div>
    </aside>
  );
};
