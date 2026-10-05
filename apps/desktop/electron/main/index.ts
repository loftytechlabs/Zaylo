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

function getWindowIconPath(): string | undefined {
  const isWin = process.platform === 'win32';
  const iconFileName = isWin ? 'icon.ico' : 'icon.png';

  const candidates = [
    // Production dist path (inside asar or appPath)
    path.join(app.getAppPath(), 'dist', iconFileName),
    path.join(app.getAppPath(), 'dist', 'icon.ico'),
    path.join(app.getAppPath(), 'dist', 'icon.png'),
    // Relative to dist-electron
    path.resolve(__dirname, '../dist', iconFileName),
    path.resolve(__dirname, '../dist', 'icon.ico'),
    path.resolve(__dirname, '../dist', 'icon.png'),
    // Dev build & public folders
    path.join(app.getAppPath(), 'public', iconFileName),
    path.join(app.getAppPath(), 'public', 'icon.ico'),
    path.join(app.getAppPath(), 'public', 'icon.png'),
    path.join(app.getAppPath(), 'build', iconFileName),
    path.join(app.getAppPath(), 'build', 'icon.ico'),
    path.join(app.getAppPath(), 'build', 'icon.png'),
    path.resolve(__dirname, '../../build', iconFileName),
    path.resolve(__dirname, '../../build', 'icon.ico'),
    path.resolve(__dirname, '../../build', 'icon.png'),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c;
    }
  }
  return undefined;
}

async function createWindow() {
  const preloadPath = getPreloadPath();
  const iconPath = getWindowIconPath();
  console.log('[Electron Main] Preload Script Verified:', preloadPath);
  if (iconPath) {
    console.log('[Electron Main] Window Icon Verified:', iconPath);
  }

  mainWindow = new BrowserWindow({
    width: 1380,
    height: 880,
    minWidth: 1100,
    minHeight: 700,
    title: 'Zaylo',
    icon: iconPath,
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

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.zaylo.ai');
  }
  return createWindow();
});

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
