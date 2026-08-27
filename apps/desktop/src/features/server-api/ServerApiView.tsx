import React, { useState, useEffect } from 'react';
import {
  Server,
  Key,
  Copy,
  Check,
  Plus,
  Trash2,
  Code2,
  Wifi,
  Smartphone,
  QrCode,
  ExternalLink,
  Play,
} from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { api } from '../../api/client';

export const ServerApiView: React.FC = () => {
  const {
    serverState,
    serverConfig,
    lanAddress,
    apiKeys,
    installedModels,
    createKey,
    revokeKey,
    deleteKey,
    updateServerConfig,
    startServer,
  } = useAppStore();

  const [activeCodeLang, setActiveCodeLang] = useState<'curl' | 'python' | 'node'>('curl');
  const [newKeyName, setNewKeyName] = useState('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedMobileUrl, setCopiedMobileUrl] = useState(false);
  const [copiedRowKeyId, setCopiedRowKeyId] = useState<string | null>(null);

  // Editable snippet parameters
  const [selectedKeyText, setSelectedKeyText] = useState('');
  const [selectedModelText, setSelectedModelText] = useState('');
  const [customPrompt, setCustomPrompt] = useState('Explain quantum computing in one sentence.');

  // QR Code State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [includeKeyInQr, setIncludeKeyInQr] = useState(true);

  // Load and preserve persistent default raw key
  useEffect(() => {
    const savedDefaultKey = localStorage.getItem('default_raw_api_key');
    if (savedDefaultKey && !savedDefaultKey.includes('...')) {
      setSelectedKeyText(savedDefaultKey);
      setGeneratedKey(savedDefaultKey);
    } else if (apiKeys && apiKeys.length > 0) {
      const active = apiKeys.find((k) => !k.isRevoked && k.rawKey && !k.rawKey.includes('...'));
      if (active?.rawKey) {
        setSelectedKeyText(active.rawKey);
        setGeneratedKey(active.rawKey);
        localStorage.setItem('default_raw_api_key', active.rawKey);
      }
    }
  }, [apiKeys]);

  const hostIp = serverConfig?.lanEnabled && lanAddress ? lanAddress : '127.0.0.1';
  const port = serverConfig?.port || 8080;
  const webChatUrl = `http://${hostIp}:${port}`;
  const apiEndpointUrl = `http://${hostIp}:${port}/v1`;

  // Initialize selected model from loaded or first installed model
  useEffect(() => {
    if (!selectedModelText) {
      const loaded = installedModels.find((m) => m.isLoaded);
      if (loaded) {
        setSelectedModelText(loaded.name);
      } else if (installedModels.length > 0) {
        setSelectedModelText(installedModels[0].name);
      } else {
        setSelectedModelText('default');
      }
    }
  }, [installedModels, selectedModelText]);

  // Load QR code when requested
  useEffect(() => {
    const generateQr = async () => {
      // Use full raw generated key if available, otherwise just web URL
      const keyToUse = generatedKey || selectedKeyText;
      const isValidRawKey = keyToUse && !keyToUse.includes('...');
      const urlToEncode = includeKeyInQr && isValidRawKey
        ? `${webChatUrl}/?key=${keyToUse}`
        : webChatUrl;

      try {
        const res = await api.invoke('network:get-qr-code', { text: urlToEncode });
        setQrDataUrl(res?.qrDataUrl || null);
      } catch (err) {
        console.error('Failed to generate QR code:', err);
      }
    };

    if (showQrModal) {
      generateQr();
    }
  }, [showQrModal, includeKeyInQr, webChatUrl, generatedKey, selectedKeyText]);

  const handleCreateKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newKeyName.trim() || `Client Key (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`;
    try {
      const res = await createKey(name);
      setGeneratedKey(res.rawKey);
      setSelectedKeyText(res.rawKey);
      localStorage.setItem('default_raw_api_key', res.rawKey);
      setNewKeyName('');
      setIsCreatingKey(false);
    } catch (err: any) {
      alert(`Key creation failed: ${err.message}`);
    }
  };

  const handleDeleteKey = async (keyId: string, prefix: string) => {
    try {
      await deleteKey(keyId);
      const saved = localStorage.getItem('default_raw_api_key');
      if (saved && (saved.startsWith(prefix.replace('...', '')) || selectedKeyText === saved)) {
        localStorage.removeItem('default_raw_api_key');
        setSelectedKeyText('');
        setGeneratedKey(null);
      }
    } catch (err: any) {
      alert(`Failed to delete key: ${err.message}`);
    }
  };

  const handleCopyRowKey = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRowKeyId(id);
    setTimeout(() => setCopiedRowKeyId(null), 2000);
  };

  const handleToggleLan = async (enabled: boolean) => {
    try {
      await updateServerConfig({ lanEnabled: enabled });
    } catch (err: any) {
      alert(`Failed to update LAN configuration: ${err.message}`);
    }
  };

  // If no unmasked key is typed yet, show helper text or the generated key
  const effectiveKey = selectedKeyText.trim() || (generatedKey || 'lcl_click_quick_gen_to_create_key');
  const effectiveModel = selectedModelText || 'default';

  const codeSnippets = {
    curl: `curl ${apiEndpointUrl}/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${effectiveKey}" \\
  -d '{
    "model": "${effectiveModel}",
    "messages": [
      { "role": "user", "content": "${customPrompt.replace(/"/g, '\\"')}" }
    ],
    "temperature": 0.7,
    "stream": true
  }'`,
    python: `from openai import OpenAI

client = OpenAI(
    base_url="${apiEndpointUrl}",
    api_key="${effectiveKey}"
)

response = client.chat.completions.create(
    model="${effectiveModel}",
    messages=[
        {"role": "user", "content": "${customPrompt.replace(/"/g, '\\"')}"}
    ],
    stream=True
)

for chunk in response:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
print()`,
    node: `import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: '${apiEndpointUrl}',
  apiKey: '${effectiveKey}',
});

const stream = await client.chat.completions.create({
  model: '${effectiveModel}',
  messages: [{ role: 'user', content: '${customPrompt.replace(/'/g, "\\'")}' }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
`,
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto overflow-y-auto h-[calc(100vh-4rem)]">
      {/* 1. Mobile & Web Chat Access Banner */}
      <div className="p-6 rounded-xl bg-gradient-to-r from-blue-950/40 via-[#121622] to-purple-950/30 border border-blue-800/40 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-400" />
              <h2 className="text-base font-bold text-zinc-100">Mobile & LAN Web Chat Interface</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-900/60 text-blue-300 border border-blue-700/40">
                PHONE & TABLET
              </span>
            </div>
            <p className="text-xs text-zinc-400 max-w-2xl">
              Open this link in Safari on your iPhone, Chrome on Android, iPad, or any laptop connected to your Wi-Fi to chat with your local AI models with live token streaming.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowQrModal(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#181d28] hover:bg-[#222938] border border-blue-700/50 text-blue-300 text-xs font-semibold transition-colors shadow-sm"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan Phone QR</span>
            </button>

            <button
              onClick={() => {
                const target = (generatedKey || selectedKeyText) && !selectedKeyText.includes('...')
                  ? `${webChatUrl}/?key=${generatedKey || selectedKeyText}`
                  : webChatUrl;
                window.open(target, '_blank');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors shadow-md"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Web Chat</span>
            </button>
          </div>
        </div>

        {/* Server Stopped Warning */}
        {serverState !== 'RUNNING' && (
          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>Server is currently <strong>STOPPED</strong>. Click Start Server to enable this URL on your phone and browser.</span>
            </div>
            <button
              onClick={() => startServer()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-sm transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Server</span>
            </button>
          </div>
        )}

        {/* Copyable Phone URL Bar */}
        <div className="p-3 rounded-lg bg-[#0b0d12] border border-[#202532] flex items-center justify-between font-mono text-xs text-zinc-200">
          <div className="flex items-center gap-2 truncate">
            <span className="text-zinc-500 select-none text-[11px]">URL:</span>
            <span className="text-blue-300 select-all font-semibold">{webChatUrl}</span>
          </div>

          <button
            onClick={() => {
              navigator.clipboard.writeText(webChatUrl);
              setCopiedMobileUrl(true);
              setTimeout(() => setCopiedMobileUrl(false), 2000);
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#181c26] hover:bg-[#242938] text-xs text-zinc-300 hover:text-white transition-colors"
          >
            {copiedMobileUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-sans font-medium">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="font-sans">Copy Phone URL</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Endpoint & LAN Configuration Card */}
      <div className="p-6 rounded-lg bg-[#111317] border border-[#22252c] space-y-6">
        <div className="flex items-center justify-between border-b border-[#1c1f26] pb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Server className="w-4 h-4 text-blue-400" />
              OpenAI-Compatible API Endpoint
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Connect external apps, LangChain, Cursor, Open WebUI, and Python scripts using standard OpenAI SDK clients.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {serverConfig?.lowMemoryMode && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-blue-950 text-blue-300 border border-blue-800/50">
                LOW-RAM STREAMING
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                serverState === 'RUNNING' ? 'bg-emerald-950 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {serverState}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Base URL Box */}
          <div className="p-4 rounded-md bg-[#0c0d10] border border-[#1d2027] space-y-2">
            <span className="text-[11px] font-mono text-zinc-500 block">BASE API URL</span>
            <div className="flex items-center justify-between font-mono text-xs text-zinc-100">
              <span className="select-all">{apiEndpointUrl}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(apiEndpointUrl);
                  setCopiedSnippet(true);
                  setTimeout(() => setCopiedSnippet(false), 2000);
                }}
                className="p-1 rounded hover:bg-[#1a1c22] text-zinc-400"
              >
                {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* LAN Access Toggle */}
          <div className="p-4 rounded-md bg-[#0c0d10] border border-[#1d2027] flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <Wifi className="w-3.5 h-3.5 text-purple-400" />
                LAN Network Access
              </div>
              <p className="text-[11px] text-zinc-500">
                {serverConfig?.lanEnabled
                  ? `Exposed on ${lanAddress || '0.0.0.0'}. Local API authentication required.`
                  : 'Bound strictly to localhost (127.0.0.1).'}
              </p>
            </div>

            <button
              onClick={() => handleToggleLan(!serverConfig?.lanEnabled)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                serverConfig?.lanEnabled
                  ? 'bg-purple-950 text-purple-300 border border-purple-800'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {serverConfig?.lanEnabled ? 'Enabled ✓' : 'Disabled'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. Interactive Code Examples with Live API Key Editing & Model Dropdown */}
      <div className="p-6 rounded-lg bg-[#111317] border border-[#22252c] space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1c1f26] pb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-blue-400" />
              Live Interactive Client Snippets
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select a model from your installed models list, click <strong>+ Quick Gen</strong> to get a working key, and copy the ready-to-run snippet.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#0c0d10] p-1 rounded-md border border-[#1e2026]">
            {(['curl', 'python', 'node'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setActiveCodeLang(lang)}
                className={`px-3 py-1 rounded text-xs font-mono capitalize transition-colors ${
                  activeCodeLang === lang ? 'bg-[#1e2129] text-blue-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {lang === 'node' ? 'Node.js' : lang}
              </button>
            ))}
          </div>
        </div>

        {/* Live Snippet Parameter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-[#0d0f13] border border-[#1f222b]">
          {/* API Key Selector / Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="text-zinc-400 font-medium">API Key in Snippet:</label>
              <button
                type="button"
                onClick={() => handleCreateKey()}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40"
              >
                <Plus className="w-3 h-3" />
                + Quick Gen
              </button>
            </div>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={selectedKeyText}
                onChange={(e) => {
                  setSelectedKeyText(e.target.value);
                  if (e.target.value.startsWith('lcl_')) {
                    localStorage.setItem('default_raw_api_key', e.target.value);
                  }
                }}
                placeholder="Click + Quick Gen or paste full lcl_... key"
                className="flex-1 bg-[#13161c] border border-[#232732] rounded px-3 py-1.5 text-xs font-mono text-emerald-300 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
              />
              {selectedKeyText && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedKeyText);
                    setCopiedKey(true);
                    setTimeout(() => setCopiedKey(false), 2000);
                  }}
                  className="px-2.5 py-1.5 rounded bg-[#181a20] border border-[#242834] text-zinc-300 hover:text-white flex items-center gap-1 text-xs shrink-0"
                  title="Copy active API Key"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-zinc-400" />}
                </button>
              )}
            </div>
          </div>

          {/* Model Name Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-medium block">Select Model:</label>
            <select
              value={selectedModelText}
              onChange={(e) => setSelectedModelText(e.target.value)}
              className="w-full bg-[#13161c] border border-[#232732] rounded px-3 py-1.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-blue-500"
            >
              {installedModels.length === 0 ? (
                <option value="default">default (No models installed yet)</option>
              ) : (
                installedModels.map((m) => (
                  <option key={m.id} value={m.name}>
                    {m.name} {m.isLoaded ? '★ (Loaded)' : ''}
                  </option>
                ))
              )}
              <option value="default">default (Current Server Active)</option>
            </select>
          </div>

          {/* Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-400 font-medium block">Test Prompt:</label>
            <input
              type="text"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Type test prompt..."
              className="w-full bg-[#13161c] border border-[#232732] rounded px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Code Box */}
        <div className="relative rounded-md bg-[#090a0c] border border-[#1e2026] p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
          <pre>{codeSnippets[activeCodeLang]}</pre>
          <button
            onClick={() => {
              navigator.clipboard.writeText(codeSnippets[activeCodeLang]);
              setCopiedSnippet(true);
              setTimeout(() => setCopiedSnippet(false), 2000);
            }}
            className="absolute top-3 right-3 p-1.5 rounded bg-[#181a20] text-zinc-400 hover:text-zinc-200 flex items-center gap-1.5"
            title="Copy code snippet"
          >
            {copiedSnippet ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-[11px] font-sans font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px] font-sans">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4. API Key Management Table */}
      <div className="p-6 rounded-lg bg-[#111317] border border-[#22252c] space-y-5">
        <div className="flex items-center justify-between border-b border-[#1c1f26] pb-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              API Keys Management
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Keys are secret tokens. For security, full keys are displayed once when generated.
            </p>
          </div>

          <button
            onClick={() => setIsCreatingKey(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Generate Key</span>
          </button>
        </div>

        {/* Inline Create Key Form */}
        {isCreatingKey && (
          <form onSubmit={handleCreateKey} className="p-4 rounded-md bg-[#0c0d10] border border-[#242731] flex gap-3">
            <input
              type="text"
              placeholder="Key Name (e.g. My Phone, Python Script, Open WebUI)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 bg-[#13151a] border border-[#23262f] rounded px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-4 py-1.5 rounded bg-blue-600 text-white text-xs font-medium hover:bg-blue-500"
            >
              Save Key
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingKey(false)}
              className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Show newly generated raw key once */}
        {generatedKey && (
          <div className="p-4 rounded-md bg-emerald-950/40 border border-emerald-800/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <Check className="w-4 h-4" />
              API Key Generated Successfully & Injected Into Snippets
            </div>
            <p className="text-[11px] text-zinc-400">
              This complete unmasked key is now active in your code snippets above. Copy and save it now:
            </p>
            <div className="flex items-center justify-between p-2 rounded bg-[#0b0c0e] font-mono text-xs text-emerald-300">
              <span className="select-all">{generatedKey}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generatedKey);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button
              onClick={() => setGeneratedKey(null)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Keys Table */}
        <div className="border border-[#1e2026] rounded-md overflow-hidden font-mono text-xs">
          <table className="w-full text-left">
            <thead className="bg-[#0e1013] text-zinc-500 text-[11px] border-b border-[#1e2026]">
              <tr>
                <th className="py-2.5 px-4">NAME</th>
                <th className="py-2.5 px-4">PREFIX</th>
                <th className="py-2.5 px-4">CREATED</th>
                <th className="py-2.5 px-4">STATUS</th>
                <th className="py-2.5 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2026] text-zinc-300">
              {apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-zinc-500 font-sans">
                    No API keys created yet. Click <strong>+ Quick Gen</strong> above to generate a working key instantly.
                  </td>
                </tr>
              ) : (
                apiKeys.map((k) => {
                  const isActive = (generatedKey && generatedKey.startsWith(k.prefix.replace('...', ''))) ||
                    (selectedKeyText && selectedKeyText.startsWith(k.prefix.replace('...', '')));
                  return (
                    <tr key={k.id} className="hover:bg-[#13151a]">
                      <td className="py-3 px-4 font-sans font-medium text-zinc-200 flex items-center gap-2">
                        <span>{k.name}</span>
                        {isActive && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-950 text-blue-300 border border-blue-800/60 font-mono">
                            DEFAULT
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            const rawToCopy = (k.rawKey && !k.rawKey.includes('...'))
                              ? k.rawKey
                              : ((generatedKey && !generatedKey.includes('...')) ? generatedKey : (selectedKeyText || k.prefix));
                            handleCopyRowKey(rawToCopy, k.id);
                          }}
                          className="flex items-center gap-2 hover:text-blue-300 font-mono transition-colors text-left group"
                          title="Click to copy full key"
                        >
                          <span className="underline decoration-dotted decoration-zinc-600 group-hover:decoration-blue-400">
                            {k.prefix}
                          </span>
                          {copiedRowKeyId === k.id ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-sans font-semibold">
                              <Check className="w-3 h-3" />
                              Copied!
                            </span>
                          ) : (
                            <Copy className="w-3 h-3 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-zinc-500">{new Date(k.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        {k.isRevoked ? (
                          <span className="text-rose-400 text-[11px] font-medium">Revoked</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!k.isRevoked && (
                            <button
                              onClick={() => revokeKey(k.id)}
                              className="text-[11px] text-amber-500 hover:text-amber-400 px-2 py-0.5 rounded bg-amber-950/30 border border-amber-800/40"
                              title="Revoke key authorization"
                            >
                              Revoke
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteKey(k.id, k.prefix)}
                            className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                            title="Delete API key permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Mobile QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#12141a] border border-[#282d3a] rounded-2xl p-6 max-w-sm w-full space-y-5 shadow-2xl text-center">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-zinc-100 flex items-center justify-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-400" />
                Scan to Open on Mobile
              </h3>
              <p className="text-xs text-zinc-400">
                Point your iPhone or Android camera at this QR code to start chatting immediately.
              </p>
            </div>

            {/* QR Image Box */}
            <div className="p-4 bg-white rounded-xl mx-auto w-fit shadow-inner">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Mobile QR Code" className="w-56 h-56 block mx-auto" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-zinc-500 text-xs font-mono">
                  Generating QR...
                </div>
              )}
            </div>

            <div className="text-xs font-mono text-zinc-400 select-all p-2 rounded bg-[#0b0c0f] border border-[#1e222d] break-all">
              {includeKeyInQr && (generatedKey || selectedKeyText) && !selectedKeyText.includes('...')
                ? `${webChatUrl}/?key=${generatedKey || selectedKeyText}`
                : webChatUrl}
            </div>

            <label className="flex items-center justify-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeKeyInQr}
                onChange={(e) => setIncludeKeyInQr(e.target.checked)}
                className="rounded border-[#2a2f3d] bg-[#1a1d26] text-blue-500"
              />
              <span>Include API Key in QR Link</span>
            </label>

            <button
              onClick={() => setShowQrModal(false)}
              className="w-full py-2 bg-[#1c202a] hover:bg-[#252b38] text-zinc-200 text-xs font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
