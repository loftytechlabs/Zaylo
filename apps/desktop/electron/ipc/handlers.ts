import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import type { IPCChannels, IPCEvents } from '@local-ai/protocol';
import { createDatabaseAsync, ServerRepository, ModelRepository, APIKeyRepository, DeviceRepository, MetricsRepository, LogsRepository, BenchmarkRepository } from '@local-ai/database';
import { HardwareScanner } from '@local-ai/hardware';
import { CapabilityEngine } from '@local-ai/capabilities';
import { ModelManager } from '@local-ai/models';
import { KeyManager } from '@local-ai/security';
import { NetworkScanner, DevicePairingManager, generateQrCode } from '@local-ai/network';
import { LlamaRuntime } from '@local-ai/runtime-llama';
import { InferenceService } from '@local-ai/inference';
import { ApiServer } from '@local-ai/server';
import { SystemMonitor } from '@local-ai/monitoring';
import { getDefaultDatabasePath, getDefaultModelsDir, getDefaultRuntimeDir } from '@local-ai/shared';
import type { BenchmarkResult, ServerState } from '@local-ai/shared';

export async function registerIpcHandlers(mainWindow: BrowserWindow) {
  const dbConn = await createDatabaseAsync(getDefaultDatabasePath());
  const serverRepo = new ServerRepository(dbConn.raw);
  const modelRepo = new ModelRepository(dbConn.raw);
  const keyRepo = new APIKeyRepository(dbConn.raw);
  const deviceRepo = new DeviceRepository(dbConn.raw);
  const metricsRepo = new MetricsRepository(dbConn.raw);
  const logsRepo = new LogsRepository(dbConn.raw);
  const benchmarkRepo = new BenchmarkRepository(dbConn.raw);

  let config = serverRepo.getConfig();
  const fs = await import('node:fs');
  const effectiveModelsDir = (config.modelsDirectory && fs.existsSync(config.modelsDirectory))
    ? config.modelsDirectory
    : getDefaultModelsDir();
  const effectiveRuntimeDir = (config.runtimeDirectory && fs.existsSync(config.runtimeDirectory))
    ? config.runtimeDirectory
    : getDefaultRuntimeDir();

  const modelManager = new ModelManager(modelRepo, effectiveModelsDir);
  const keyManager = new KeyManager(keyRepo);
  const pairingManager = new DevicePairingManager(keyManager, deviceRepo);
  const runtime = new LlamaRuntime(effectiveRuntimeDir);
  const inferenceService = new InferenceService(metricsRepo, logsRepo, config.maxConcurrentRequests);
  const monitor = new SystemMonitor(metricsRepo, inferenceService, 1000);

  let apiServer: ApiServer | null = null;
  let serverState: ServerState = 'STOPPED';

  const sendEvent = <K extends keyof IPCEvents>(channel: K, data: IPCEvents[K]) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, data);
    }
  };

  // Setup monitor listener
  monitor.on('sample', (sample) => {
    sendEvent('metrics:update', sample);
  });
  monitor.start();

  // Setup runtime supervisor listener
  runtime.getSupervisor().on('stateChanged', (state, instance) => {
    serverState = state;
    sendEvent('server:state-changed', { state, instance });
  });

  runtime.getSupervisor().on('log', (level, message) => {
    const logObj = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      level: level as any,
      component: 'RUNTIME' as any,
      event: 'RUNTIME_LOG',
      message,
    };
    logsRepo.addLog(logObj);
    sendEvent('logs:new', logObj);
  });

  function handle<K extends keyof IPCChannels>(
    channel: K,
    fn: (req: IPCChannels[K]['request']) => Promise<IPCChannels[K]['response']> | IPCChannels[K]['response']
  ) {
    ipcMain.handle(channel, async (_event, args) => {
      try {
        return await fn(args);
      } catch (err: any) {
        console.error(`IPC Error on [${channel}]:`, err);
        throw err;
      }
    });
  }

  // 1. Hardware & Capabilities
  handle('hardware:get-profile', async () => {
    return HardwareScanner.scan();
  });

  handle('hardware:get-capabilities', async () => {
    const hw = await HardwareScanner.scan();
    return CapabilityEngine.analyzeHardware(hw);
  });

  // 2. Models
  handle('models:list-available', async () => {
    return modelManager.getAvailableModels();
  });

  handle('models:list-installed', async () => {
    return modelManager.getInstalledModels();
  });

  handle('models:search-hf', async ({ query, limit }) => {
    return modelManager.searchHuggingFace(query, limit);
  });

  handle('models:download', async ({ modelId, variantId, downloadUrl, name }) => {
    const downloadId = await modelManager.startDownload({
      modelId,
      variantId,
      downloadUrl,
      name,
      onProgress: (p) => {
        sendEvent('download:progress', p);
      },
    });
    return { downloadId };
  });

  handle('models:cancel-download', async ({ downloadId }) => {
    return modelManager.cancelDownload(downloadId);
  });

  handle('models:delete', async ({ installationId }) => {
    return modelManager.deleteInstallation(installationId);
  });

  handle('models:get-downloads', async () => {
    return modelManager.getActiveDownloads();
  });

  handle('models:select-file', async () => {
    const res = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Local GGUF Model File',
      properties: ['openFile'],
      filters: [{ name: 'GGUF Models', extensions: ['gguf', 'bin'] }],
    });
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0];
  });

  handle('models:import-local', async ({ filePath, name }) => {
    let targetPath = filePath;
    if (!targetPath) {
      const res = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Local GGUF Model File',
        properties: ['openFile'],
        filters: [{ name: 'GGUF Models', extensions: ['gguf', 'bin'] }],
      });
      if (res.canceled || res.filePaths.length === 0) return null;
      targetPath = res.filePaths[0];
    }

    const fs = await import('node:fs');
    const path = await import('node:path');
    if (!fs.existsSync(targetPath)) {
      throw new Error(`File not found at ${targetPath}`);
    }

    const stats = fs.statSync(targetPath);
    const filename = path.basename(targetPath);
    const parsedName = name || filename.replace(/\.gguf$/i, '').replace(/[-_]/g, ' ');
    const modelId = `local_${filename.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

    let quant = 'Q4_K_M';
    const quantMatch = filename.match(/(q\d_[k_0-9a-z]+|f16|f32|q8_0|q4_0|q4_1)/i);
    if (quantMatch) quant = quantMatch[1].toUpperCase();

    const installation = {
      id: `inst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      modelId,
      variantId: `${modelId}_var`,
      name: parsedName,
      localPath: targetPath,
      sizeBytes: stats.size,
      installedAt: Date.now(),
      isLoaded: false,
      format: 'gguf' as const,
      quantization: quant as any,
      contextLength: 4096,
    };

    modelRepo.upsertInstallation(installation);
    return installation;
  });

  // 3. Server & Runtime Lifecycle
  handle('server:get-config', async () => {
    config = serverRepo.getConfig();
    return config;
  });

  handle('server:update-config', async (newConf) => {
    config = { ...config, ...newConf };
    serverRepo.saveConfig(config);
    apiServer?.updateConfig(config);
    return config;
  });

  handle('server:get-state', async () => {
    const lanAddress = NetworkScanner.getPrimaryLANAddress() || undefined;
    return {
      state: serverState,
      instance: runtime.getSupervisor().getInstance(),
      lanAddress,
      port: config.port,
    };
  });

  handle('server:start', async (req) => {
    const modelId = req?.modelId;
    const variantId = req?.variantId;
    const installed = modelManager.getInstalledModels();
    let targetInst = modelId
      ? installed.find((i) => (i.modelId === modelId || i.id === modelId) && (!variantId || i.variantId === variantId))
      : installed.find((i) => i.isLoaded) || installed[0];

    if (!targetInst && installed.length > 0) {
      targetInst = installed[0];
    }

    if (!targetInst) {
      throw new Error('No models are installed. Please download a model first.');
    }

    // Ensure runtime is installed
    const isInstalled = await runtime.isInstalled();
    if (!isInstalled) {
      const installRes = await runtime.install();
      if (!installRes.success) {
        throw new Error(`Failed to install runtime: ${installRes.error}`);
      }
    }

    // Launch runtime process
    const instance = await runtime.start({
      instanceId: `inst_${Date.now()}`,
      modelPath: targetInst.localPath,
      modelName: targetInst.name,
      port: config.port + 1,
      host: '127.0.0.1',
      contextSize: config.contextLimit,
      gpuLayers: config.gpuLayers,
      threads: config.threads,
      runtimeDir: config.runtimeDirectory || getDefaultRuntimeDir(),
      lowMemoryMode: config.lowMemoryMode,
      flashAttention: config.flashAttention,
    });

    modelRepo.setLoadedInstallation(targetInst.id);
    inferenceService.setRuntime(runtime, targetInst.name);

    // Launch Fastify API server
    if (apiServer) {
      await apiServer.stop();
    }

    apiServer = new ApiServer({
      config,
      inferenceService,
      modelManager,
      keyManager,
      deviceRepo,
      pairingManager,
      logsRepo,
    });

    await apiServer.start();
    serverState = 'RUNNING';
    sendEvent('server:state-changed', { state: 'RUNNING', instance });
    return true;
  });

  handle('server:stop', async () => {
    serverState = 'STOPPING';
    sendEvent('server:state-changed', { state: 'STOPPING' });
    
    if (apiServer) {
      await apiServer.stop();
      apiServer = null;
    }
    await runtime.stop();
    inferenceService.setRuntime(undefined, '');
    modelRepo.setLoadedInstallation(undefined);
    serverState = 'STOPPED';
    sendEvent('server:state-changed', { state: 'STOPPED' });
    return true;
  });

  handle('server:restart', async () => {
    const currentInst = modelManager.getInstalledModels().find((i) => i.isLoaded);
    if (apiServer) await apiServer.stop();
    await runtime.stop();
    
    if (currentInst) {
      const instance = await runtime.start({
        instanceId: `inst_${Date.now()}`,
        modelPath: currentInst.localPath,
        modelName: currentInst.name,
        port: config.port + 1,
        host: '127.0.0.1',
        contextSize: config.contextLimit,
        gpuLayers: config.gpuLayers,
        threads: config.threads,
        runtimeDir: config.runtimeDirectory || getDefaultRuntimeDir(),
        lowMemoryMode: config.lowMemoryMode,
        flashAttention: config.flashAttention,
      });
      inferenceService.setRuntime(runtime, currentInst.name);

      apiServer = new ApiServer({
        config,
        inferenceService,
        modelManager,
        keyManager,
        deviceRepo,
        pairingManager,
        logsRepo,
      });
      await apiServer.start();
      serverState = 'RUNNING';
      sendEvent('server:state-changed', { state: 'RUNNING', instance });
    }
    return true;
  });

  handle('server:load-model', async ({ modelId }) => {
    const installed = modelManager.getInstalledModels();
    const target = installed.find((i) => i.modelId === modelId || i.id === modelId);
    if (!target) throw new Error('Model installation not found');

    if (serverState === 'RUNNING') {
      await runtime.stop();
      const instance = await runtime.start({
        instanceId: `inst_${Date.now()}`,
        modelPath: target.localPath,
        modelName: target.name,
        port: config.port + 1,
        host: '127.0.0.1',
        contextSize: config.contextLimit,
        gpuLayers: config.gpuLayers,
        threads: config.threads,
        runtimeDir: config.runtimeDirectory || getDefaultRuntimeDir(),
        lowMemoryMode: config.lowMemoryMode,
        flashAttention: config.flashAttention,
      });
      inferenceService.setRuntime(runtime, target.name);
      modelRepo.setLoadedInstallation(target.id);
      sendEvent('server:state-changed', { state: 'RUNNING', instance });
    }
    return true;
  });

  handle('server:unload-model', async () => {
    await runtime.stop();
    inferenceService.setRuntime(undefined, '');
    modelRepo.setLoadedInstallation(undefined);
    serverState = 'STOPPED';
    sendEvent('server:state-changed', { state: 'STOPPED' });
    return true;
  });

  // 4. Runtime Management
  handle('runtime:check-status', async () => {
    const installed = await runtime.isInstalled();
    const caps = await runtime.detectCapabilities();
    return {
      installed,
      version: caps.version,
      supportedBackends: caps.supportedBackends,
    };
  });

  handle('runtime:install', async () => {
    return runtime.install();
  });

  // 5. Network & Devices
  handle('network:get-interfaces', async () => {
    const interfaces = NetworkScanner.getInterfaces();
    return { interfaces };
  });

  handle('network:get-qr-code', async ({ text }) => {
    const qrDataUrl = await generateQrCode(text);
    return { qrDataUrl };
  });

  handle('devices:list', async () => {
    return deviceRepo.getAll();
  });

  handle('devices:create-pairing-token', async () => {
    const lanAddr = NetworkScanner.getPrimaryLANAddress() || '127.0.0.1';
    const serverUrl = `http://${lanAddr}:${config.port}`;
    return pairingManager.generatePairingToken(serverUrl, config.name);
  });

  handle('devices:revoke', async ({ deviceId }) => {
    deviceRepo.revoke(deviceId);
    return true;
  });

  handle('devices:delete', async ({ deviceId }) => {
    deviceRepo.delete(deviceId);
    return true;
  });

  handle('devices:rename', async ({ deviceId, name }) => {
    deviceRepo.rename(deviceId, name);
    return true;
  });

  // 6. API Keys
  handle('keys:list', async () => {
    return keyManager.listKeys();
  });

  handle('keys:create', async ({ name }) => {
    const { keyInfo, rawKey } = keyManager.generateKey(name);
    return { key: keyInfo, rawKey };
  });

  handle('keys:revoke', async ({ keyId }) => {
    keyManager.revokeKey(keyId);
    return true;
  });

  handle('keys:delete', async ({ keyId }) => {
    keyManager.deleteKey(keyId);
    return true;
  });

  // 7. Metrics & Logs
  handle('metrics:get-current', async () => {
    return monitor.getCurrentSample();
  });

  handle('metrics:get-history', async ({ limit = 60 }) => {
    return metricsRepo.getRecentSamples(limit);
  });

  handle('logs:get-recent', async ({ limit = 100, level, component }) => {
    return logsRepo.getRecent(limit, level, component);
  });

  handle('logs:clear', async () => {
    logsRepo.clear();
    return true;
  });

  // 8. Inference Playground
  handle('inference:chat', async (req) => {
    if (req.stream) {
      const chunks = inferenceService.chatStream(req, '127.0.0.1');
      let finalResponse: any = null;
      for await (const chunk of chunks) {
        sendEvent('inference:chunk', { requestId: chunk.id, chunk });
        finalResponse = chunk;
      }
      return finalResponse;
    }
    return inferenceService.chat(req, '127.0.0.1');
  });

  handle('inference:abort', async ({ requestId }) => {
    return inferenceService.abortRequest(requestId);
  });

  // 9. Benchmark
  handle('benchmark:run', async ({ modelId, promptTokens = 50, genTokens = 100 }) => {
    const installed = modelManager.getInstalledModels();
    const target = modelId
      ? installed.find((i) => i.modelId === modelId || i.id === modelId)
      : installed.find((i) => i.isLoaded) || installed[0];
    if (!target) throw new Error('No model installed to benchmark. Please install a model first.');

    // Auto-start runtime / load model if not currently loaded
    const isLoaded = inferenceService.getRuntime() && inferenceService.getModelName() === target.name;
    if (!isLoaded) {
      const isInstalled = await runtime.isInstalled();
      if (!isInstalled) {
        const installRes = await runtime.install();
        if (!installRes.success) {
          throw new Error(`Failed to install runtime: ${installRes.error}`);
        }
      }

      const instance = await runtime.start({
        instanceId: `inst_${Date.now()}`,
        modelPath: target.localPath,
        modelName: target.name,
        port: config.port + 1,
        host: '127.0.0.1',
        contextSize: config.contextLimit,
        gpuLayers: config.gpuLayers,
        threads: config.threads,
        runtimeDir: config.runtimeDirectory || getDefaultRuntimeDir(),
        lowMemoryMode: config.lowMemoryMode,
        flashAttention: config.flashAttention,
      });

      modelRepo.setLoadedInstallation(target.id);
      inferenceService.setRuntime(runtime, target.name);

      if (apiServer) {
        await apiServer.stop();
      }
      apiServer = new ApiServer({
        config,
        inferenceService,
        modelManager,
        keyManager,
        deviceRepo,
        pairingManager,
        logsRepo,
      });
      await apiServer.start();

      serverState = 'RUNNING';
      sendEvent('server:state-changed', { state: 'RUNNING', instance });
    }

    const warmupReq = {
      model: target.name,
      messages: [{ role: 'user' as const, content: 'Hi' }],
      max_tokens: 5,
    };
    await inferenceService.chat(warmupReq, '127.0.0.1');

    const promptText = 'Write a concise technical summary explaining how local language model inference works on CPUs and GPUs with quantization.';
    const benchReq = {
      model: target.name,
      messages: [{ role: 'user' as const, content: promptText }],
      max_tokens: genTokens,
      temperature: 0.2,
    };

    const startTime = Date.now();
    let firstTokenTime: number | null = null;
    let tokens = 0;

    for await (const chunk of inferenceService.chatStream(benchReq, '127.0.0.1')) {
      if (!firstTokenTime) firstTokenTime = Date.now();
      if (chunk.choices[0]?.delta?.content) tokens++;
    }

    const endTime = Date.now();
    const ttft = (firstTokenTime || endTime) - startTime;
    const genDurationSec = (endTime - (firstTokenTime || startTime)) / 1000;
    const genTokPerSec = genDurationSec > 0 ? tokens / genDurationSec : 0;
    const promptTokPerSec = ttft > 0 ? (promptTokens / (ttft / 1000)) : 0;

    const result: BenchmarkResult = {
      id: `bench_${Date.now()}`,
      modelId: target.modelId,
      variantId: target.variantId,
      modelName: target.name,
      timestamp: Date.now(),
      promptTokens,
      completionTokens: tokens,
      promptProcessingTokensPerSec: parseFloat(promptTokPerSec.toFixed(1)),
      generationTokensPerSec: parseFloat(genTokPerSec.toFixed(1)),
      timeToFirstTokenMs: ttft,
      totalDurationMs: endTime - startTime,
      peakMemoryBytes: target.sizeBytes + 500 * 1024 * 1024,
    };

    benchmarkRepo.save(result);
    return result;
  });

  handle('benchmark:get-history', async () => {
    return benchmarkRepo.getAll();
  });

  // 10. App & System
  handle('app:get-version', async () => {
    return '1.0.0';
  });

  handle('app:select-directory', async ({ defaultPath }) => {
    const res = await dialog.showOpenDialog(mainWindow, {
      defaultPath,
      properties: ['openDirectory', 'createDirectory'],
    });
    return res.canceled ? null : res.filePaths[0];
  });

  handle('app:open-external', async ({ url }) => {
    shell.openExternal(url);
  });
}
