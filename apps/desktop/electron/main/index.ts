import { app, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { registerIpcHandlers } from '../ipc/handlers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appRoot = path.join(__dirname, '..');

let mainWindow: BrowserWindow | null = null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

function getPreloadPath(): string {
  // Check candidates in order of reliability
  const candidates = [
    path.resolve(__dirname, 'preload.cjs'),
    path.resolve(__dirname, '../preload.cjs'),
    path.resolve(__dirname, '../preload/index.cjs'),
    path.resolve(__dirname, '../../electron/preload.cjs'),
    path.resolve(__dirname, '../../../electron/preload.cjs'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }

  // Fallback: write it inline if somehow missing
  const fallbackPath = path.resolve(__dirname, 'preload.cjs');
  const code = `const { contextBridge, ipcRenderer } = require('electron');
const api = {
  invoke(channel, args) { return ipcRenderer.invoke(channel, args); },
  on(event, listener) {
    const handler = (_e, data) => listener(data);
    ipcRenderer.on(event, handler);
    return () => { ipcRenderer.removeListener(event, handler); };
  }
};
contextBridge.exposeInMainWorld('electronAPI', api);
contextBridge.exposeInMainWorld('api', api);
`;
  try {
    fs.writeFileSync(fallbackPath, code);
    return fallbackPath;
  } catch {}

  return candidates[0];
}

async function createWindow() {
  const preloadPath = getPreloadPath();
  console.log('[Electron Main] Preload Script Verified:', preloadPath);

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1100,
    minHeight: 700,
    title: 'Zaylo',
    backgroundColor: '#0c0d0e',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: process.platform === 'darwin' ? { x: 16, y: 10 } : undefined,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:') || url.startsWith('http:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  await registerIpcHandlers(mainWindow);

  if (VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    await mainWindow.loadFile(path.join(appRoot, '../dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
