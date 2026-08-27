export function getWebChatHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Zaylo — Web & Mobile Chat</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    :root {
      --bg: #090a0d;
      --card-bg: #111318;
      --card-border: #21252f;
      --accent: #2563eb;
      --accent-hover: #3b82f6;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --bubble-user: #1e2433;
      --bubble-user-border: #2b354b;
      --bubble-bot: #141720;
      --bubble-bot-border: #222736;
      --code-bg: #0b0c10;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      height: 100dvh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* Header */
    header {
      background: rgba(17, 19, 24, 0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--card-border);
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      z-index: 10;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 10px;
      flex: 1;
      min-width: 0;
    }

    .server-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 10px #10b981;
      animation: pulse 2s infinite;
      flex-shrink: 0;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    .brand-title {
      font-size: 14px;
      font-weight: 700;
      letter-spacing: -0.2px;
      color: #fff;
      white-space: nowrap;
    }

    .model-selector {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      background: #161820;
      border: 1px solid var(--card-border);
      padding: 4px 8px;
      border-radius: 6px;
      color: #60a5fa;
      max-width: 220px;
      outline: none;
      cursor: pointer;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }

    .icon-btn {
      background: #191c24;
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      border-radius: 7px;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .icon-btn:hover {
      background: #232734;
      color: #fff;
      border-color: #3b4255;
    }

    /* Chat Container */
    #chat-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      scroll-behavior: smooth;
    }

    .msg-wrap {
      display: flex;
      gap: 12px;
      max-width: 850px;
      width: 100%;
      margin: 0 auto;
    }

    .msg-wrap.user {
      justify-content: flex-end;
    }

    .avatar {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
    }

    .avatar.assistant {
      background: linear-gradient(135deg, #1e3a8a, #3b82f6);
      color: #fff;
      border: 1px solid #3b82f6;
    }

    .avatar.user {
      background: #27272a;
      color: #e4e4e7;
    }

    .bubble {
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.6;
      max-width: 85%;
      word-break: break-word;
    }

    .msg-wrap.user .bubble {
      background: var(--bubble-user);
      border: 1px solid var(--bubble-user-border);
      color: #f3f4f6;
      border-bottom-right-radius: 4px;
    }

    .msg-wrap.assistant .bubble {
      background: var(--bubble-bot);
      border: 1px solid var(--bubble-bot-border);
      color: #e5e7eb;
      border-bottom-left-radius: 4px;
      width: 100%;
    }

    /* Markdown Styling */
    .bubble pre {
      background: var(--code-bg);
      border: 1px solid var(--card-border);
      border-radius: 8px;
      padding: 12px;
      margin: 10px 0;
      overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
    }

    .bubble code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 12px;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 5px;
      border-radius: 4px;
    }

    .bubble pre code {
      background: transparent;
      padding: 0;
    }

    .bubble p {
      margin-bottom: 8px;
    }

    .bubble p:last-child {
      margin-bottom: 0;
    }

    .bubble ul, .bubble ol {
      margin-left: 20px;
      margin-bottom: 8px;
    }

    /* Telemetry Tag */
    .telemetry-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 10px;
      color: #93c5fd;
      background: rgba(37, 99, 235, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      padding: 2px 8px;
      border-radius: 6px;
      margin-top: 10px;
    }

    /* Input Footer */
    footer {
      background: rgba(17, 19, 24, 0.95);
      backdrop-filter: blur(12px);
      border-top: 1px solid var(--card-border);
      padding: 12px 16px;
      z-index: 10;
    }

    .input-wrapper {
      max-width: 850px;
      margin: 0 auto;
      display: flex;
      align-items: flex-end;
      gap: 8px;
      background: #141720;
      border: 1px solid #282e3d;
      border-radius: 12px;
      padding: 6px 10px;
      transition: border-color 0.2s;
    }

    .input-wrapper:focus-within {
      border-color: #3b82f6;
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.3);
    }

    textarea {
      flex: 1;
      background: transparent;
      border: none;
      color: #fff;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.5;
      padding: 6px 4px;
      resize: none;
      max-height: 140px;
      outline: none;
    }

    textarea::placeholder {
      color: #6b7280;
    }

    .send-btn {
      background: var(--accent);
      border: none;
      color: #fff;
      border-radius: 8px;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .send-btn:hover:not(:disabled) {
      background: var(--accent-hover);
    }

    .send-btn.stop-btn {
      background: #dc2626 !important;
      box-shadow: 0 0 12px rgba(220, 38, 38, 0.5);
    }

    .send-btn.stop-btn:hover {
      background: #ef4444 !important;
    }

    .send-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    /* Blinking Cursor */
    .cursor {
      display: inline-block;
      width: 6px;
      height: 14px;
      background: #60a5fa;
      vertical-align: middle;
      margin-left: 3px;
      animation: blink 1s infinite;
    }

    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(6px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 50;
      padding: 16px;
    }

    .modal-overlay.open {
      display: flex;
    }

    .modal-card {
      background: #11141c;
      border: 1px solid #282f3f;
      border-radius: 14px;
      max-width: 440px;
      width: 100%;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.6);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-title {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-group label {
      font-size: 12px;
      color: var(--text-muted);
      font-weight: 600;
    }

    .form-group input, .form-group textarea {
      background: #0b0d13;
      border: 1px solid #232a39;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      color: #fff;
      outline: none;
      font-family: inherit;
    }

    .form-group input:focus, .form-group textarea:focus {
      border-color: var(--accent);
    }

    .modal-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 4px;
    }

    .btn-secondary {
      background: #1c212d;
      border: 1px solid #2c3447;
      color: #d1d5db;
      padding: 8px 14px;
      border-radius: 7px;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-primary {
      background: var(--accent);
      border: none;
      color: #fff;
      padding: 8px 14px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
  </style>
</head>
<body>

  <!-- Top Header -->
  <header>
    <div class="brand-section">
      <div class="server-dot" title="Server Online"></div>
      <svg width="22" height="22" viewBox="0 0 1000 1000" style="margin-right: 2px; flex-shrink: 0;">
        <polygon points="340,240 600,240 450,400 190,400" fill="#60a5fa" />
        <polygon points="700,240 810,240 270,800 160,800" fill="#3b82f6" />
        <polygon points="410,640 670,640 520,800 260,800" fill="#60a5fa" />
      </svg>
      <span class="brand-title">Zaylo</span>
      <select id="model-select" class="model-selector" onchange="onModelChange(this.value)">
        <option value="default">Default Model</option>
      </select>
    </div>

    <div class="header-actions">
      <button class="icon-btn" onclick="clearConversation()" title="Clear Chat">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18m-2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
      <button class="icon-btn" onclick="openSettings()" title="Settings & Key">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
      </button>
    </div>
  </header>

  <!-- Messages List -->
  <main id="chat-container">
    <div class="msg-wrap assistant">
      <div class="avatar assistant">AI</div>
      <div class="bubble">
        Hello! I am Zaylo, your private local AI assistant running directly on this server. How can I help you?
      </div>
    </div>
  </main>

  <!-- Input Area -->
  <footer>
    <div class="input-wrapper">
      <textarea
        id="prompt-input"
        rows="1"
        placeholder="Type a message... (Shift+Enter for new line)"
        onkeydown="handleKeyDown(event)"
        oninput="autoResize(this)"
      ></textarea>
      <button class="send-btn" id="send-btn" onclick="handleSendOrStop()" title="Send Message">
        <svg id="send-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
      </button>
    </div>
  </footer>

  <!-- Settings Modal -->
  <div class="modal-overlay" id="settings-modal">
    <div class="modal-card">
      <div class="modal-header">
        <h3 class="modal-title">Connection & API Key</h3>
        <button class="icon-btn" onclick="closeSettings()">&times;</button>
      </div>

      <div class="form-group">
        <label>API Key (Starts with lcl_...)</label>
        <input type="text" id="api-key-input" placeholder="lcl_xxxxxxxxxxxxxxxx" />
        <span style="font-size: 11px; color: #9ca3af;">Click + Quick Gen in the desktop app Server & API tab to generate a key.</span>
      </div>

      <div class="form-group">
        <label>System Prompt</label>
        <textarea id="system-prompt-input" rows="3" placeholder="You are a helpful AI assistant."></textarea>
      </div>

      <div class="modal-actions">
        <button class="btn-secondary" onclick="closeSettings()">Cancel</button>
        <button class="btn-primary" onclick="saveSettings()">Save & Connect</button>
      </div>
    </div>
  </div>

  <script>
    const chatContainer = document.getElementById('chat-container');
    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-btn');
    const modelSelect = document.getElementById('model-select');
    const settingsModal = document.getElementById('settings-modal');
    const apiKeyInput = document.getElementById('api-key-input');
    const systemPromptInput = document.getElementById('system-prompt-input');

    let isGenerating = false;
    let abortController = null;
    let messages = [];
    let selectedModel = localStorage.getItem('local_ai_selected_model') || 'default';

    // Parse URL params for key=... or pair=... from QR pairing
    const urlParams = new URLSearchParams(window.location.search);
    const keyParam = urlParams.get('key') || urlParams.get('token');
    if (keyParam && keyParam.startsWith('lcl_') && !keyParam.includes('...')) {
      localStorage.setItem('local_ai_key', keyParam);
    }

    const pairParam = urlParams.get('pair');
    if (pairParam) {
      const devName = /iPhone|iPad|iPod/i.test(navigator.userAgent)
        ? 'iPhone'
        : /Android/i.test(navigator.userAgent)
        ? 'Android'
        : 'Mobile Web';
      fetch('/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairingToken: pairParam, deviceName: devName })
      })
        .then(function(r) { return r.json(); })
        .then(function(data) {
          if (data && data.apiKey) {
            localStorage.setItem('local_ai_key', data.apiKey);
            apiKeyInput.value = data.apiKey;
          }
        })
        .catch(function() {});
    }

    // Load initial settings
    apiKeyInput.value = localStorage.getItem('local_ai_key') || '';
    systemPromptInput.value = localStorage.getItem('local_ai_system_prompt') || 'You are a helpful, fast, and accurate local AI assistant.';

    async function loadModelsAndHealth() {
      try {
        const apiKey = localStorage.getItem('local_ai_key');
        const headers = apiKey ? { 'Authorization': 'Bearer ' + apiKey } : {};

        const [healthRes, modelsRes] = await Promise.all([
          fetch('/health', { headers }).catch(() => null),
          fetch('/v1/models', { headers }).catch(() => null),
        ]);

        let activeName = '';
        if (healthRes && healthRes.ok) {
          const healthData = await healthRes.json();
          activeName = healthData.activeModel || '';
          if (activeName && (!selectedModel || selectedModel === 'default')) {
            selectedModel = activeName;
          }
        }

        let modelOptions = [];
        if (modelsRes && modelsRes.ok) {
          const modelsData = await modelsRes.json();
          const list = modelsData && modelsData.data ? modelsData.data : [];
          if (list.length > 0) {
            modelOptions = list.map(function(m) {
              const isSel = m.id === selectedModel ? 'selected' : '';
              return '<option value="' + m.id + '" ' + isSel + '>' + m.id + '</option>';
            });
          }
        }

        if (modelOptions.length === 0 && activeName) {
          modelOptions.push('<option value="' + activeName + '" selected>' + activeName + '</option>');
        }

        if (modelOptions.length > 0) {
          modelSelect.innerHTML = modelOptions.join('');
        } else {
          modelSelect.innerHTML = '<option value="default">Local Model (Active)</option>';
        }
      } catch (err) {
        modelSelect.innerHTML = '<option value="default">Local Model</option>';
      }
    }

    loadModelsAndHealth();
    setInterval(loadModelsAndHealth, 8000);

    // Heartbeat ping while Web Chat tab is active
    function sendHeartbeat() {
      const apiKey = localStorage.getItem('local_ai_key');
      const headers = apiKey ? { 'Authorization': 'Bearer ' + apiKey } : {};
      fetch('/heartbeat', { headers }).catch(() => {});
    }
    sendHeartbeat();
    setInterval(sendHeartbeat, 6000);

    function onModelChange(val) {
      selectedModel = val;
      localStorage.setItem('local_ai_selected_model', val);
    }

    function autoResize(el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 140) + 'px';
    }

    function handleKeyDown(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendOrStop();
      }
    }

    function openSettings() {
      apiKeyInput.value = localStorage.getItem('local_ai_key') || '';
      settingsModal.classList.add('open');
    }

    function closeSettings() {
      settingsModal.classList.remove('open');
    }

    function saveSettings() {
      const key = apiKeyInput.value.trim();
      localStorage.setItem('local_ai_key', key);
      localStorage.setItem('local_ai_system_prompt', systemPromptInput.value.trim());
      closeSettings();
      loadModelsAndHealth();
    }

    function clearConversation() {
      messages = [];
      chatContainer.innerHTML = \`
        <div class="msg-wrap assistant">
          <div class="avatar assistant">AI</div>
          <div class="bubble">Chat cleared. What would you like to explore next?</div>
        </div>
      \`;
    }

    function appendMessage(role, text) {
      const wrap = document.createElement('div');
      wrap.className = \`msg-wrap \${role}\`;

      const avatar = document.createElement('div');
      avatar.className = \`avatar \${role}\`;
      avatar.innerText = role === 'user' ? 'U' : 'AI';

      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      if (role === 'user') {
        bubble.innerText = text;
      } else {
        bubble.innerHTML = marked.parse(text);
      }

      if (role === 'assistant') {
        wrap.appendChild(avatar);
        wrap.appendChild(bubble);
      } else {
        wrap.appendChild(bubble);
      }

      chatContainer.appendChild(wrap);
      chatContainer.scrollTop = chatContainer.scrollHeight;
      return bubble;
    }

    function handleSendOrStop() {
      if (isGenerating) {
        stopGeneration();
      } else {
        sendMessage();
      }
    }

    function stopGeneration() {
      if (abortController) {
        abortController.abort();
      }
    }

    function setButtonGenerating(generating) {
      isGenerating = generating;
      if (generating) {
        sendBtn.classList.add('stop-btn');
        sendBtn.title = 'Stop response';
        sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="3"/></svg>';
      } else {
        sendBtn.classList.remove('stop-btn');
        sendBtn.title = 'Send Message';
        sendBtn.innerHTML = '<svg id="send-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
      }
    }

    async function sendMessage() {
      const text = promptInput.value.trim();
      if (!text || isGenerating) return;

      promptInput.value = '';
      promptInput.style.height = 'auto';
      setButtonGenerating(true);

      // Append user bubble
      appendMessage('user', text);
      messages.push({ role: 'user', content: text });

      // Create assistant bubble with cursor
      const wrap = document.createElement('div');
      wrap.className = 'msg-wrap assistant';
      wrap.innerHTML = \`
        <div class="avatar assistant">AI</div>
        <div class="bubble"><span class="content"></span><span class="cursor"></span></div>
      \`;
      chatContainer.appendChild(wrap);
      chatContainer.scrollTop = chatContainer.scrollHeight;

      const contentEl = wrap.querySelector('.content');
      const cursorEl = wrap.querySelector('.cursor');

      let accumulated = '';
      const startTime = Date.now();
      let tokenCount = 0;

      const systemPrompt = localStorage.getItem('local_ai_system_prompt') || '';
      const reqMessages = [];
      if (systemPrompt) reqMessages.push({ role: 'system', content: systemPrompt });
      reqMessages.push(...messages);

      const apiKey = localStorage.getItem('local_ai_key');
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) {
        headers['Authorization'] = \`Bearer \${apiKey}\`;
      }

      abortController = new AbortController();

      try {
        const response = await fetch('/v1/chat/completions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: selectedModel || 'default',
            messages: reqMessages,
            stream: true,
            temperature: 0.7,
          }),
          signal: abortController.signal,
        });

        if (response.status === 401) {
          contentEl.innerHTML = \`
            <div style="color: #f87171; font-weight: 600; margin-bottom: 8px;">Authentication Required</div>
            <div style="font-size: 12px; color: #9ca3af; margin-bottom: 12px;">This server requires a valid API key. Click below to enter your key.</div>
            <button onclick="openSettings()" style="padding: 6px 12px; background: #2563eb; color: #fff; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">Enter API Key</button>
          \`;
          openSettings();
          return;
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData?.error?.message || \`HTTP \${response.status}\`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;
            const dataStr = trimmed.replace(/^data:\\s*/, '');
            if (dataStr === '[DONE]') continue;

            try {
              const parsed = JSON.parse(dataStr);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                accumulated += delta;
                tokenCount++;
                contentEl.innerHTML = marked.parse(accumulated);
                chatContainer.scrollTop = chatContainer.scrollHeight;
              }
            } catch {}
          }
        }

        messages.push({ role: 'assistant', content: accumulated });

        // Add telemetry tag
        const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
        const tokPerSec = durationSec > 0 ? (tokenCount / durationSec).toFixed(1) : 0;
        const tag = document.createElement('div');
        tag.className = 'telemetry-tag';
        tag.innerText = \`⚡ \${tokPerSec} tok/s • \${durationSec}s • \${tokenCount} tokens\`;
        wrap.querySelector('.bubble').appendChild(tag);

      } catch (err) {
        if (err.name === 'AbortError') {
          if (accumulated) {
            messages.push({ role: 'assistant', content: accumulated });
            const tag = document.createElement('div');
            tag.className = 'telemetry-tag';
            tag.innerText = \`⏹ Stopped by user • \${tokenCount} tokens\`;
            wrap.querySelector('.bubble').appendChild(tag);
          } else {
            contentEl.innerHTML = \`<span style="color: #9ca3af; font-style: italic;">[Generation stopped]</span>\`;
          }
        } else {
          contentEl.innerHTML = \`<span style="color: #f87171;">[Error: \${err.message}]</span>\`;
        }
      } finally {
        if (cursorEl) cursorEl.remove();
        setButtonGenerating(false);
        promptInput.focus();
      }
    }
  </script>
</body>
</html>`;
}
