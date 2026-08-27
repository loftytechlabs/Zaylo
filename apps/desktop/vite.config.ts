import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import path from 'node:path';
import fs from 'node:fs';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main/index.ts',
        onstart(options) {
          // Ensure static preload.cjs is copied into dist-electron
          const preloadSrc = path.resolve(__dirname, 'electron/preload.cjs');
          const preloadDestDir = path.resolve(__dirname, 'dist-electron');
          const preloadNestedDir = path.resolve(__dirname, 'dist-electron/preload');
          if (fs.existsSync(preloadSrc)) {
            if (!fs.existsSync(preloadDestDir)) fs.mkdirSync(preloadDestDir, { recursive: true });
            if (!fs.existsSync(preloadNestedDir)) fs.mkdirSync(preloadNestedDir, { recursive: true });
            fs.copyFileSync(preloadSrc, path.join(preloadDestDir, 'preload.cjs'));
            fs.copyFileSync(preloadSrc, path.join(preloadNestedDir, 'index.cjs'));
          }
          options.startup();
        },
        vite: {
          build: {
            outDir: 'dist-electron/main',
            rollupOptions: {
              external: ['sql.js', 'electron', 'node:sqlite', 'better-sqlite3'],
            },
          },
        },
      },
    ]),
    {
      name: 'copy-preload-plugin',
      closeBundle() {
        const preloadSrc = path.resolve(__dirname, 'electron/preload.cjs');
        const preloadDestDir = path.resolve(__dirname, 'dist-electron');
        const preloadNestedDir = path.resolve(__dirname, 'dist-electron/preload');
        if (fs.existsSync(preloadSrc)) {
          if (!fs.existsSync(preloadDestDir)) fs.mkdirSync(preloadDestDir, { recursive: true });
          if (!fs.existsSync(preloadNestedDir)) fs.mkdirSync(preloadNestedDir, { recursive: true });
          fs.copyFileSync(preloadSrc, path.join(preloadDestDir, 'preload.cjs'));
          fs.copyFileSync(preloadSrc, path.join(preloadNestedDir, 'index.cjs'));
        }
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
});
