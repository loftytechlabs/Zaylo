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
  Image as ImageIcon,
  X,
  BookOpen,
  UploadCloud,
  FileText,
  Loader2,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import type { ChatMessageContentPart } from '@local-ai/shared';

function getMessageText(content: string | ChatMessageContentPart[]): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === 'text' ? part.text || '' : ''))
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

function renderMessageContent(content: string | ChatMessageContentPart[]) {
  if (typeof content === 'string') {
    return <div className="whitespace-pre-wrap select-text">{content}</div>;
  }

  if (Array.isArray(content)) {
    return (
      <div className="space-y-2 select-text">
        {content.map((part, idx) => {
          if (part.type === 'image_url') {
            return (
              <div key={idx} className="rounded-lg overflow-hidden border border-zinc-700/60 max-w-xs my-1 bg-black/40">
                <img
                  src={part.image_url.url}
                  alt="User upload"
                  className="max-h-60 w-auto object-contain rounded"
                />
              </div>
            );
          }
          if (part.type === 'text') {
            return (
              <div key={idx} className="whitespace-pre-wrap">
                {part.text}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  return null;
}

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
    ragEnabled,
    ragDocuments,
    pendingImage,
    setSystemPrompt,
    setTemperature,
    setTopP,
    setSelectedModel,
    setRagEnabled,
    setPendingImage,
    fetchRagDocuments,
    addRagDocument,
    deleteRagDocument,
    clearPlayground,
    sendChatMessage,
    stopGeneration,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showRagModal, setShowRagModal] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchRagDocuments();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [playgroundMessages, isGenerating]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !pendingImage) || isGenerating) return;
    const msg = input;
    setInput('');
    sendChatMessage(msg);
  };

  const handleCopy = (content: string | ChatMessageContentPart[], index: number) => {
    navigator.clipboard.writeText(getMessageText(content));
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPendingImage({ dataUrl: reader.result, name: file.name });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              setPendingImage({ dataUrl: reader.result, name: file.name || 'pasted-image.png' });
            }
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingDoc(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const content = await file.text();
        const ext = file.name.split('.').pop()?.toLowerCase() || 'txt';
        await addRagDocument(file.name, content, ext as any);
      }
    } catch (err: any) {
      alert(`Failed to ingest document: ${err.message}`);
    } finally {
      setIsUploadingDoc(false);
      e.target.value = '';
    }
  };

  const isServerReady = serverState === 'RUNNING';

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden relative">
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

            {/* Knowledge RAG Toggle Button */}
            <button
              onClick={() => setShowRagModal(true)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors border ${
                ragEnabled
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-300'
                  : 'bg-[#14161b] border-[#22252c] text-zinc-400 hover:text-zinc-200'
              }`}
              title="Configure Local Document RAG"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>RAG</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                ragEnabled ? 'bg-emerald-800/80 text-emerald-100' : 'bg-zinc-800 text-zinc-400'
              }`}>
                {ragDocuments.length}
              </span>
            </button>

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
                  {renderMessageContent(msg.content)}

                  {!isUser && getMessageText(msg.content) && (
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
          {/* Pending Image Attachment Pill */}
          {pendingImage && (
            <div className="mb-2 flex items-center gap-2 p-1.5 pl-2 bg-[#171a22] border border-blue-500/40 rounded-md w-fit">
              <img
                src={pendingImage.dataUrl}
                alt="Pending upload preview"
                className="w-7 h-7 rounded object-cover border border-zinc-700"
              />
              <span className="text-[11px] text-zinc-200 truncate max-w-[180px]">
                {pendingImage.name}
              </span>
              <button
                type="button"
                onClick={() => setPendingImage(undefined)}
                className="p-1 text-zinc-400 hover:text-zinc-100 transition-colors"
                title="Remove image"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative flex items-center">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={
                isServerReady
                  ? ragEnabled
                    ? 'Type prompt (RAG active)... Paste or attach images (Shift+Enter for newline)'
                    : 'Type prompt... Paste or attach images (Shift+Enter for newline)'
                  : 'Server stopped. Start server to chat.'
              }
              disabled={!isServerReady || isGenerating}
              className="w-full bg-[#13151a] border border-[#23262f] rounded-lg pl-4 pr-32 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 resize-none font-sans"
            />

            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageFileChange}
              accept="image/*"
              className="hidden"
            />

            <div className="absolute right-3 flex items-center gap-1.5">
              {/* Image attach button for Multimodal Vision */}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={!isServerReady || isGenerating}
                className={`p-1.5 rounded-md transition-colors ${
                  pendingImage
                    ? 'bg-blue-900/60 text-blue-300'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#1a1d24]'
                }`}
                title="Attach image for vision models (or paste from clipboard)"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {isGenerating ? (
                <button
                  type="button"
                  onClick={stopGeneration}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-950/50 transition-all animate-pulse"
                  title="Stop generating response"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!isServerReady || (!input.trim() && !pendingImage)}
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

      {/* RAG & Knowledge Base Modal */}
      {showRagModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101217] border border-[#282b36] rounded-xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#20232c] flex items-center justify-between bg-[#14161d]">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">Local Knowledge Base & RAG</h3>
                  <p className="text-[11px] text-zinc-400">Index private documents for offline semantic search</p>
                </div>
              </div>
              <button
                onClick={() => setShowRagModal(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* RAG Toggle */}
              <div className="p-3.5 rounded-lg bg-[#171922] border border-[#252834] flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-zinc-200">Augment Inference with Documents</div>
                  <div className="text-[11px] text-zinc-400">
                    Retrieves top relevant passages and inserts citations into your conversation
                  </div>
                </div>
                <button
                  onClick={() => setRagEnabled(!ragEnabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    ragEnabled ? 'bg-emerald-600' : 'bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      ragEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Upload Drop Zone */}
              <div>
                <input
                  type="file"
                  ref={docInputRef}
                  onChange={handleDocUpload}
                  multiple
                  accept=".txt,.md,.markdown,.json,.csv,.ts,.js,.py,.html,.css"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => docInputRef.current?.click()}
                  disabled={isUploadingDoc}
                  className="w-full border-2 border-dashed border-[#2b2f3e] hover:border-emerald-500/60 rounded-lg p-5 flex flex-col items-center justify-center gap-2 bg-[#14161f]/60 hover:bg-[#14161f] transition-all cursor-pointer group"
                >
                  {isUploadingDoc ? (
                    <>
                      <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                      <span className="text-xs text-zinc-300">Chunking & indexing document...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-6 h-6 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                      <div className="text-xs font-medium text-zinc-300">
                        Click to upload local documents or code
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Supports Markdown (.md), Plaintext (.txt), JSON, CSV, Source Code
                      </div>
                    </>
                  )}
                </button>
              </div>

              {/* Indexed Documents List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                  <span>INDEXED DOCUMENTS ({ragDocuments.length})</span>
                </div>

                {ragDocuments.length === 0 ? (
                  <div className="p-4 rounded-lg bg-[#14161e] border border-[#20232e] text-center text-xs text-zinc-500">
                    No documents indexed yet. Upload documents above to chat with them.
                  </div>
                ) : (
                  <div className="divide-y divide-[#1e212b] border border-[#222532] rounded-lg overflow-hidden bg-[#12141a]">
                    {ragDocuments.map((doc) => (
                      <div key={doc.id} className="p-3 flex items-center justify-between hover:bg-[#181a24] transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-zinc-200 truncate">{doc.name}</div>
                            <div className="text-[10px] text-zinc-400 flex items-center gap-2">
                              <span>{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                              <span>•</span>
                              <span>{doc.chunkCount} chunks</span>
                              <span>•</span>
                              <span className="uppercase text-[9px] px-1 rounded bg-zinc-800 text-zinc-300">{doc.type}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => deleteRagDocument(doc.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded transition-colors"
                          title="Delete document and chunks"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[#20232c] bg-[#14161d] flex justify-end">
              <button
                onClick={() => setShowRagModal(false)}
                className="px-4 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
