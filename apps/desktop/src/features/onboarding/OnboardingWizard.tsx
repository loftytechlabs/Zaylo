import React, { useState } from 'react';
import {
  Sparkles,
  Cpu,
  HardDrive,
  Zap,
  Download,
  CheckCircle2,
  Wifi,
  X,
  FolderOpen,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

export const OnboardingWizard: React.FC = () => {
  const {
    showOnboarding,
    setShowOnboarding,
    hardware,
    capabilities,
    availableModels,
    downloadModel,
    importLocalModel,
    startServer,
    updateServerConfig,
    setActiveTab,
  } = useAppStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [selectedModelId, setSelectedModelId] = useState<string>('smollm2-135m-instruct');
  const [isDownloading, setIsDownloading] = useState(false);
  const [enableLan, setEnableLan] = useState(false);
  const [isStartingServer, setIsStartingServer] = useState(false);

  if (!showOnboarding) return null;

  const handleDownloadAndStart = async () => {
    setIsDownloading(true);
    try {
      const model = availableModels.find((m) => m.id === selectedModelId) || availableModels[0];
      const variant = model.variants[0];

      await downloadModel(model.id, variant.id, variant.downloadUrl, model.name);
      setStep(5);
    } catch (err: any) {
      alert(`Setup error: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSelectLocalFile = async () => {
    try {
      const result = await importLocalModel();
      if (result) {
        setStep(5);
      }
    } catch (err: any) {
      alert(`Import error: ${err.message}`);
    }
  };

  const handleCompleteSetup = async () => {
    setIsStartingServer(true);
    try {
      if (enableLan) {
        await updateServerConfig({ lanEnabled: true });
      }
      await startServer();
      setShowOnboarding(false);
      setActiveTab('playground');
    } catch (err: any) {
      alert(`Server start error: ${err.message}`);
      setShowOnboarding(false);
    } finally {
      setIsStartingServer(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#111317] border border-[#262a34] rounded-xl p-8 space-y-6 shadow-2xl relative">
        <button
          onClick={() => setShowOnboarding(false)}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Step Indicator */}
        <div className="flex items-center justify-between text-xs font-mono text-zinc-500 border-b border-[#1c1f26] pb-3">
          <span>STEP {step} OF 6</span>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? 'w-6 bg-blue-500' : s < step ? 'w-2 bg-emerald-500' : 'w-2 bg-zinc-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* STEP 1: WELCOME */}
        {step === 1 && (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100">Welcome to Zaylo</h2>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Convert this computer into a high-performance, private OpenAI-compatible AI inference server accessible from any device on your local network.
            </p>
            <div className="pt-4">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
              >
                Scan Hardware & Setup →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: HARDWARE DETECTION */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Hardware Detection</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Real host hardware specifications detected:</p>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded bg-[#0d0f12] border border-[#1d2027] flex items-center justify-between">
                <span className="text-zinc-400 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-400" />
                  CPU
                </span>
                <span className="text-zinc-200">
                  {hardware?.cpu.model} ({hardware?.cpu.physicalCores} Cores)
                </span>
              </div>

              <div className="p-3 rounded bg-[#0d0f12] border border-[#1d2027] flex items-center justify-between">
                <span className="text-zinc-400 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  System RAM
                </span>
                <span className="text-zinc-200">
                  {hardware ? `${(hardware.memory.availableBytes / 1e9).toFixed(1)} GB Free / ${(hardware.memory.totalBytes / 1e9).toFixed(1)} GB Total` : ''}
                </span>
              </div>

              {hardware?.primaryGPU && (
                <div className="p-3 rounded bg-[#0d0f12] border border-[#1d2027] flex items-center justify-between">
                  <span className="text-zinc-400 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    GPU Acceleration
                  </span>
                  <span className="text-zinc-200">
                    {hardware.primaryGPU.model} ({hardware.primaryGPU.backend.toUpperCase()})
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
              >
                View Capability Analysis →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CAPABILITY ANALYSIS */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Capability Profile</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Calculated based on actual available RAM and compute:</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded bg-[#0d0f12] border border-[#1d2027]">
                <span className="text-zinc-500 text-[10px] block">MEMORY BUDGET</span>
                <span className="text-zinc-200 font-bold text-sm">
                  {capabilities ? `${(capabilities.memoryBudgetBytes / 1e9).toFixed(1)} GB` : ''}
                </span>
              </div>

              <div className="p-3 rounded bg-[#0d0f12] border border-[#1d2027]">
                <span className="text-zinc-500 text-[10px] block">MAX RECOMMENDED CONTEXT</span>
                <span className="text-zinc-200 font-bold text-sm">
                  {capabilities?.maxRecommendedContext} tokens
                </span>
              </div>
            </div>

            <div className="p-4 rounded bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>
                Your host hardware is verified and ready to run local LLM models with zero external cloud dependencies.
              </span>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
              >
                Back
              </button>
              <button
                onClick={() => setStep(4)}
                className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
              >
                Select Starter Model →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: MODEL DOWNLOAD OR LOCAL FILE SELECTION */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Select or Download Starter Model</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Select a local GGUF file already on your computer or download one:</p>
            </div>

            {/* Option A: Select existing local file */}
            <div className="p-4 rounded-lg bg-[#0d0f12] border border-blue-500/40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-zinc-200 flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-blue-400" />
                  Have an existing GGUF model on this computer?
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Choose any GGUF model file on your drive (e.g. Caden SQL, Llama, Mistral) to use immediately.
              </p>
              <button
                onClick={handleSelectLocalFile}
                className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium inline-flex items-center gap-2 transition-colors mt-1"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Select Local GGUF File...</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
              <div className="flex-1 h-px bg-[#20232a]" />
              <span>OR DOWNLOAD A CURATED MODEL</span>
              <div className="flex-1 h-px bg-[#20232a]" />
            </div>

            <div className="space-y-2.5">
              {[
                {
                  id: 'smollm2-135m-instruct',
                  name: 'SmolLM2 135M Instruct',
                  size: '145 MB',
                  desc: 'Fastest download, ultra-lightweight, ideal for immediate verification.',
                },
                {
                  id: 'qwen2.5-0.5b-instruct',
                  name: 'Qwen 2.5 0.5B Instruct',
                  size: '468 MB',
                  desc: 'High quality compact reasoning model with multilingual support.',
                },
              ].map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedModelId(m.id)}
                  className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                    selectedModelId === m.id
                      ? 'bg-blue-950/40 border-blue-500/80 ring-1 ring-blue-500/40'
                      : 'bg-[#0d0f12] border-[#22252c] hover:border-[#30343f]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-200">{m.name}</span>
                    <span className="font-mono text-zinc-400">{m.size}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{m.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(3)}
                className="px-4 py-2 rounded bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
              >
                Back
              </button>
              <button
                onClick={handleDownloadAndStart}
                disabled={isDownloading}
                className="flex items-center gap-2 px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownloading ? 'Downloading Model...' : 'Download & Continue →'}</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: LAN CONFIGURATION */}
        {step === 5 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">Network Exposure</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Configure how other devices access your server:</p>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => setEnableLan(false)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  !enableLan
                    ? 'bg-blue-950/40 border-blue-500/80 ring-1 ring-blue-500/40'
                    : 'bg-[#0d0f12] border-[#22252c]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200">Localhost Only (127.0.0.1)</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    Default
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Only applications running on this machine can connect.
                </p>
              </div>

              <div
                onClick={() => setEnableLan(true)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  enableLan
                    ? 'bg-purple-950/40 border-purple-500/80 ring-1 ring-purple-500/40'
                    : 'bg-[#0d0f12] border-[#22252c]'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-200 flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-purple-400" />
                    Enable Local Network (LAN) Access
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-900/60 text-purple-300">
                    Multi-Device
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 mt-1">
                  Allows phones, laptops, and tablets on your Wi-Fi to use your local AI server with API keys or QR pairing.
                </p>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep(4)}
                className="px-4 py-2 rounded bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
              >
                Back
              </button>
              <button
                onClick={() => setStep(6)}
                className="px-5 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
              >
                Review & Launch →
              </button>
            </div>
          </div>
        )}

        {/* STEP 6: READY */}
        {step === 6 && (
          <div className="space-y-4 text-center py-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-zinc-100">Your AI Server is Ready!</h2>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Your inference runtime is configured, model is ready, and the OpenAI-compatible API server is ready to launch.
            </p>
            <div className="pt-4">
              <button
                onClick={handleCompleteSetup}
                disabled={isStartingServer}
                className="px-6 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
              >
                {isStartingServer ? 'Starting Server...' : 'Launch Server & Open Playground →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
