import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@local-ai/shared': path.resolve(__dirname, './packages/shared/src'),
      '@local-ai/protocol': path.resolve(__dirname, './packages/protocol/src'),
      '@local-ai/database': path.resolve(__dirname, './packages/database/src'),
      '@local-ai/hardware': path.resolve(__dirname, './packages/hardware/src'),
      '@local-ai/capabilities': path.resolve(__dirname, './packages/capabilities/src'),
      '@local-ai/models': path.resolve(__dirname, './packages/models/src'),
      '@local-ai/runtimes': path.resolve(__dirname, './packages/runtimes/src'),
      '@local-ai/runtime-llama': path.resolve(__dirname, './packages/runtime-llama/src'),
      '@local-ai/inference': path.resolve(__dirname, './packages/inference/src'),
      '@local-ai/server': path.resolve(__dirname, './packages/server/src'),
      '@local-ai/network': path.resolve(__dirname, './packages/network/src'),
      '@local-ai/security': path.resolve(__dirname, './packages/security/src'),
      '@local-ai/monitoring': path.resolve(__dirname, './packages/monitoring/src'),
    },
  },
});
