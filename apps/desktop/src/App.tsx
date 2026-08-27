import React, { useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { useAppStore } from './stores/useAppStore';

import { api } from './api/client';
import { OverviewView } from './features/overview/OverviewView';
import { ModelsView } from './features/models/ModelsView';
import { PlaygroundView } from './features/playground/PlaygroundView';
import { ServerApiView } from './features/server-api/ServerApiView';
import { DevicesView } from './features/devices/DevicesView';
import { PerformanceView } from './features/performance/PerformanceView';
import { LogsView } from './features/logs/LogsView';
import { BenchmarkView } from './features/benchmark/BenchmarkView';
import { SettingsView } from './features/settings/SettingsView';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';
import type { SystemMetricSample, StructuredLog } from '@local-ai/shared';

export const App: React.FC = () => {
  const {
    activeTab,
    fetchHardware,
    fetchServerState,
    fetchModels,
    fetchLogs,
    fetchDevicesAndKeys,
    updateMetric,
    addLog,
  } = useAppStore();

  useEffect(() => {
    // Initial data fetch
    fetchHardware();
    fetchServerState();
    fetchModels();
    fetchLogs();
    fetchDevicesAndKeys();

    // Subscribe to typed IPC events
    const unsubMetrics = api.on('metrics:update', (sample: SystemMetricSample) => {
      updateMetric(sample);
    });

    const unsubLogs = api.on('logs:new', (log: StructuredLog) => {
      addLog(log);
    });

    const unsubState = api.on('server:state-changed', () => {
      fetchServerState();
      fetchModels();
    });

    const unsubDownloads = api.on('download:progress', () => {
      fetchModels();
    });

    return () => {
      unsubMetrics?.();
      unsubLogs?.();
      unsubState?.();
      unsubDownloads?.();
    };
  }, []);

  return (
    <div className="flex h-screen w-screen bg-[#090a0b] text-zinc-100 overflow-hidden select-none font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main className="flex-1 overflow-hidden bg-[#090a0b]">
          {activeTab === 'overview' && <OverviewView />}
          {activeTab === 'models' && <ModelsView />}
          {activeTab === 'playground' && <PlaygroundView />}
          {activeTab === 'server' && <ServerApiView />}
          {activeTab === 'devices' && <DevicesView />}
          {activeTab === 'performance' && <PerformanceView />}
          {activeTab === 'logs' && <LogsView />}
          {activeTab === 'benchmark' && <BenchmarkView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Guided First-Launch Onboarding Wizard */}
      <OnboardingWizard />
    </div>
  );
};
