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
    path.join(app.getAppPath(), 'dist-electron/preload/index.cjs'),
    path.join(app.getAppPath(), 'dist-electron/preload.cjs'),
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
    const indexPath = fs.existsSync(path.join(app.getAppPath(), 'dist/index.html'))
      ? path.join(app.getAppPath(), 'dist/index.html')
      : path.join(appRoot, '../dist/index.html');
    await mainWindow.loadFile(indexPath);
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
