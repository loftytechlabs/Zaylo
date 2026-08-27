#!/usr/bin/env node
import { Command } from 'commander';
import { createDatabaseAsync, ServerRepository, ModelRepository, APIKeyRepository, DeviceRepository, MetricsRepository, LogsRepository } from '@local-ai/database';
import { HardwareScanner } from '@local-ai/hardware';
import { CapabilityEngine } from '@local-ai/capabilities';
import { ModelManager } from '@local-ai/models';
import { KeyManager } from '@local-ai/security';
import { NetworkScanner, DevicePairingManager } from '@local-ai/network';
import { LlamaRuntime } from '@local-ai/runtime-llama';
import { InferenceService } from '@local-ai/inference';
import { ApiServer } from '@local-ai/server';
import { SystemMonitor } from '@local-ai/monitoring';
import { getDefaultDatabasePath, getDefaultModelsDir, getDefaultRuntimeDir } from '@local-ai/shared';

const program = new Command();
program
  .name('zaylo')
  .description('Zaylo AI Server Platform CLI — Turn your computer into a private AI inference server')
  .version('1.0.0');

async function initCore() {
  const dbConn = await createDatabaseAsync(getDefaultDatabasePath());
  const serverRepo = new ServerRepository(dbConn.raw);
  const modelRepo = new ModelRepository(dbConn.raw);
  const keyRepo = new APIKeyRepository(dbConn.raw);
  const deviceRepo = new DeviceRepository(dbConn.raw);
  const metricsRepo = new MetricsRepository(dbConn.raw);
  const logsRepo = new LogsRepository(dbConn.raw);

  const config = serverRepo.getConfig();
  const modelManager = new ModelManager(modelRepo, config.modelsDirectory || getDefaultModelsDir());
  const keyManager = new KeyManager(keyRepo);
  const pairingManager = new DevicePairingManager(keyManager, deviceRepo);
  const runtime = new LlamaRuntime(config.runtimeDirectory || getDefaultRuntimeDir());
  const inferenceService = new InferenceService(metricsRepo, logsRepo, config.maxConcurrentRequests);
  const monitor = new SystemMonitor(metricsRepo, inferenceService, 1000);

  return {
    dbConn,
    serverRepo,
    modelRepo,
    keyRepo,
    deviceRepo,
    metricsRepo,
    logsRepo,
    config,
    modelManager,
    keyManager,
    pairingManager,
    runtime,
    inferenceService,
    monitor,
  };
}

// 1. Status
program
  .command('status')
  .description('Display hardware, runtime, server, and model status')
  .action(async () => {
    const { config, modelManager, runtime } = await initCore();
    console.log('\n=== LOCAL AI SERVER STATUS ===\n');

    const hw = await HardwareScanner.scan();
    CapabilityEngine.analyzeHardware(hw);
    const isRuntimeInstalled = await runtime.isInstalled();
    const installedModels = modelManager.getInstalledModels();
    const lanAddr = NetworkScanner.getPrimaryLANAddress();

    console.log(`Host:            ${hw.hostname} (${hw.platform} ${hw.cpu.architecture})`);
    console.log(`CPU:             ${hw.cpu.model} (${hw.cpu.physicalCores} cores, ${hw.cpu.logicalThreads} threads)`);
    console.log(`RAM:             ${(hw.memory.availableBytes / 1e9).toFixed(1)} GB free / ${(hw.memory.totalBytes / 1e9).toFixed(1)} GB total`);
    if (hw.primaryGPU) {
      console.log(`GPU:             ${hw.primaryGPU.model} (${hw.primaryGPU.backend.toUpperCase()}${hw.primaryGPU.vramBytes ? `, ${(hw.primaryGPU.vramBytes / 1e9).toFixed(1)} GB VRAM` : ''})`);
    }
    console.log(`Runtime:         llama.cpp (${isRuntimeInstalled ? '✓ Installed' : '✕ Not Installed'})`);
    console.log(`Server Endpoint: http://${config.lanEnabled ? (lanAddr || '0.0.0.0') : '127.0.0.1'}:${config.port}/v1`);
    console.log(`LAN Mode:        ${config.lanEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`Installed Models: ${installedModels.length}`);
    console.log('');
  });

// 2. Models
program
  .command('models')
  .description('List installed and available models with memory compatibility')
  .action(async () => {
    const { modelManager } = await initCore();
    const hw = await HardwareScanner.scan();
    const caps = CapabilityEngine.analyzeHardware(hw);
    const recommended = modelManager.getRecommendedModels(caps);
    const installed = modelManager.getInstalledModels();

    console.log('\n=== INSTALLED MODELS ===\n');
    if (installed.length === 0) {
      console.log('No models installed yet. Run `local-ai install <modelId>` to download one.');
    } else {
      for (const m of installed) {
        console.log(`• ${m.name} [${m.quantization}] (${(m.sizeBytes / 1e9).toFixed(2)} GB) — ${m.localPath}`);
      }
    }

    console.log('\n=== AVAILABLE / RECOMMENDED MODELS ===\n');
    for (const m of recommended) {
      const ratingColor = m.analysis.rating === 'Excellent' || m.analysis.rating === 'Good' ? '✓' : '⚠';
      console.log(`${ratingColor} ${m.id.padEnd(28)} [${m.parameterCount.padEnd(5)}] Rating: ${m.analysis.rating}`);
      console.log(`   ${m.analysis.reason}`);
    }
    console.log('');
  });

// 3. Install
program
  .command('install <modelId>')
  .description('Download and install a model by ID')
  .action(async (modelId) => {
    const { modelManager } = await initCore();
    const model = modelManager.getModel(modelId);
    if (!model) {
      console.error(`Error: Model '${modelId}' not found in catalog.`);
      process.exit(1);
    }

    const variant = model.variants[0];
    console.log(`\nDownloading ${model.name} (${(variant.sizeBytes / 1e6).toFixed(0)} MB)...`);

    await modelManager.startDownload({
      modelId: model.id,
      variantId: variant.id,
      onProgress: (p) => {
        const pct = ((p.downloadedBytes / p.totalBytes) * 100).toFixed(1);
        const mb = (p.downloadedBytes / 1e6).toFixed(1);
        const totalMb = (p.totalBytes / 1e6).toFixed(1);
        const speed = (p.bytesPerSecond / 1e6).toFixed(2);
        process.stdout.write(`\rProgress: [${pct}%] ${mb}/${totalMb} MB (${speed} MB/s) `);
      },
    });

    console.log('\n✓ Model downloaded and installed successfully!\n');
  });

// 4. Start Server
program
  .command('start')
  .description('Start the inference server and API daemon')
  .option('-p, --port <number>', 'Port to listen on', parseInt)
  .option('-m, --model <id>', 'Model ID to load')
  .option('--lan', 'Enable LAN access')
  .action(async (opts) => {
    const { config, modelManager, keyManager, deviceRepo, pairingManager, runtime, inferenceService, logsRepo } = await initCore();

    if (opts.port) config.port = opts.port;
    if (opts.lan) config.lanEnabled = true;

    const isInstalled = await runtime.isInstalled();
    if (!isInstalled) {
      console.log('Installing llama.cpp runtime...');
      const inst = await runtime.install();
      if (!inst.success) {
        console.error(`Failed to install runtime: ${inst.error}`);
        process.exit(1);
      }
      console.log('✓ Runtime installed');
    }

    const installed = modelManager.getInstalledModels();
    let targetInstallation = opts.model
      ? installed.find((i) => i.modelId === opts.model || i.id === opts.model)
      : installed[0];

    if (!targetInstallation) {
      console.log('No model installed. Installing SmolLM2 135M as default...');
      await modelManager.startDownload({
        modelId: 'smollm2-135m-instruct',
        variantId: 'smollm2-135m-q8_0',
        onProgress: (p) => {
          process.stdout.write(`\rDownloading starter model: ${((p.downloadedBytes / p.totalBytes) * 100).toFixed(1)}% `);
        },
      });
      targetInstallation = modelManager.getInstalledModels()[0];
    }

    console.log(`\nLoading model: ${targetInstallation.name}...`);
    await runtime.start({
      instanceId: `rt_${Date.now()}`,
      modelPath: targetInstallation.localPath,
      modelName: targetInstallation.name,
      port: config.port + 1,
      host: '127.0.0.1',
      contextSize: config.contextLimit,
      gpuLayers: config.gpuLayers,
      threads: config.threads,
      runtimeDir: config.runtimeDirectory || getDefaultRuntimeDir(),
    });

    inferenceService.setRuntime(runtime, targetInstallation.name);

    const server = new ApiServer({
      config,
      inferenceService,
      modelManager,
      keyManager,
      deviceRepo,
      pairingManager,
      logsRepo,
    });

    await server.start();
    const lanAddr = NetworkScanner.getPrimaryLANAddress();
    const baseUrl = `http://${config.lanEnabled ? (lanAddr || '0.0.0.0') : '127.0.0.1'}:${config.port}/v1`;

    console.log(`\n======================================================`);
    console.log(`● LOCAL AI SERVER RUNNING`);
    console.log(`======================================================`);
    console.log(`Active Model:    ${targetInstallation.name}`);
    console.log(`Base URL:        ${baseUrl}`);
    console.log(`OpenAI API:      ${baseUrl}/chat/completions`);
    console.log(`LAN Mode:        ${config.lanEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`======================================================\n`);
    console.log('Press Ctrl+C to stop server.\n');

    process.on('SIGINT', async () => {
      console.log('\nStopping server...');
      await server.stop();
      await runtime.stop();
      process.exit(0);
    });
  });

program.parse();
