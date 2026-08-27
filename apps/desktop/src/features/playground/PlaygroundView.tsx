import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Square,
  Trash2,
  Settings2,
  Bot,
  User,
  Zap,
  Clock,
  Check,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';

export const PlaygroundView: React.FC = () => {
  const {
    playgroundMessages,
    isGenerating,
    generationStats,
    systemPrompt,
    temperature,
    topP,
    selectedModel,
    installedModels,
    serverState,
    serverInstance,
    setSystemPrompt,
    setTemperature,
    setTopP,
    setSelectedModel,
    clearPlayground,
    sendChatMessage,
    stopGeneration,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [playgroundMessages, isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;
    const msg = input;
    setInput('');
    sendChatMessage(msg);
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const isServerReady = serverState === 'RUNNING';

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Main Chat Studio */}
      <div className="flex-1 flex flex-col justify-between bg-[#090a0c] border-r border-[#202227]">
        {/* Top Chat Bar */}
        <div className="h-12 border-b border-[#202227] px-6 flex items-center justify-between bg-[#0e1013]">
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-zinc-400">MODEL:</span>
            <select
              value={selectedModel || serverInstance?.modelName || ''}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-[#181a20] border border-[#282b34] rounded px-2 py-1 text-xs font-mono text-zinc-200 focus:outline-none"
            >
              {installedModels.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.name} ({m.quantization})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            {/* Live generation stats */}
            {generationStats && (
              <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-400">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Zap className="w-3 h-3" />
                  {generationStats.tokensPerSec} tok/s
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-500" />
                  {generationStats.latencyMs} ms
                </span>
                <span className="text-zinc-500">{generationStats.tokenCount} tokens</span>
              </div>
            )}

            <button
              onClick={clearPlayground}
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-300 hover:bg-[#1a1c22] transition-colors"
              title="Clear conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded transition-colors ${
                showSettings ? 'bg-[#22252e] text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="Toggle inference parameters"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Server Warning if not running */}
        {!isServerReady && (
          <div className="mx-6 mt-4 p-3 rounded-md bg-amber-950/40 border border-amber-800/50 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Server is currently {serverState.toLowerCase()}. Start server from the header to enable inference.</span>
            </div>
          </div>
        )}

        {/* Chat Message List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans">
          {playgroundMessages.map((msg, index) => {
            const isUser = msg.role === 'user';
            return (
              <div key={index} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-md bg-blue-950/80 border border-blue-800/40 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[78%] rounded-lg px-4 py-3 text-xs leading-relaxed group relative ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-[#14161b] text-zinc-200 border border-[#22252c] rounded-bl-none font-sans'
                  }`}
                >
                  <div className="whitespace-pre-wrap select-text">{msg.content}</div>

                  {!isUser && msg.content && (
                    <button
                      onClick={() => handleCopy(msg.content, index)}
                      className="absolute right-2 top-2 p-1 rounded bg-[#1c1f26] text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy response"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-[#202227] bg-[#0c0d10]">
          <form onSubmit={handleSubmit} className="relative flex items-center">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={isServerReady ? 'Type a prompt... (Shift+Enter for newline)' : 'Server stopped. Start server to chat.'}
              disabled={!isServerReady || isGenerating}
              className="w-full bg-[#13151a] border border-[#23262f] rounded-lg pl-4 pr-24 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none font-sans"
            />
            <div className="absolute right-3 flex items-center gap-2">
              {isGenerating ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-950/50 transition-all animate-pulse"
                  title="Stop generating response"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!isServerReady || !input.trim()}
                  className="p-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {/* Right Drawer: Inference Parameters */}
      {showSettings && (
        <aside className="w-72 bg-[#0c0d10] p-6 space-y-6 select-none overflow-y-auto border-l border-[#202227]">
          <div className="text-xs font-mono uppercase tracking-wider text-zinc-400 pb-2 border-b border-[#202227]">
            Inference Parameters
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 font-medium">System Prompt</label>
            <textarea
              rows={4}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full bg-[#13151a] border border-[#23262f] rounded-md p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 resize-none font-mono"
            />
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">Temperature</span>
              <span className="text-zinc-200 font-bold">{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-blue-500 bg-zinc-800"
            />
          </div>

          {/* Top P */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-zinc-400">Top P</span>
              <span className="text-zinc-200 font-bold">{topP.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full accent-blue-500 bg-zinc-800"
            />
          </div>
        </aside>
      )}
    </div>
  );
};
