import type {
  HardwareProfile,
  CapabilityProfile,
  ModelVariant,
  CompatibilityAnalysis,
  CompatibilityRating,
  GPUBackend,
} from '@local-ai/shared';

export interface CompatibilityEvaluationOptions {
  lowMemoryMode?: boolean;
}

export class CapabilityEngine {
  /**
   * Analyzes hardware profile to produce capability constraints and budgets.
   */
  public static analyzeHardware(hardware: HardwareProfile): CapabilityProfile {
    const supportedBackends: GPUBackend[] = [];
    let hasHardwareAcceleration = false;
    let vramBudgetBytes = 0;

    for (const gpu of hardware.gpus) {
      if (gpu.backend !== 'cpu' && !supportedBackends.includes(gpu.backend)) {
        supportedBackends.push(gpu.backend);
        hasHardwareAcceleration = true;
      }
      if (gpu.vramBytes && gpu.vramBytes > vramBudgetBytes) {
        // Reserve 15% VRAM for OS display buffers if discrete
        vramBudgetBytes = Math.floor(gpu.vramBytes * (gpu.isIntegrated ? 0.7 : 0.85));
      }
    }

    if (supportedBackends.length === 0) {
      supportedBackends.push('cpu');
    }

    // Usable memory budget (reserve minimum 2GB for OS system stability)
    const osReservedRAM = 2 * 1024 * 1024 * 1024;
    const memoryBudgetBytes = Math.max(0, hardware.memory.totalBytes - osReservedRAM);

    // Compute max recommended context window based on memory budget
    let maxRecommendedContext = 4096;
    if (hardware.memory.totalBytes >= 32 * 1024 * 1024 * 1024) {
      maxRecommendedContext = 32768;
    } else if (hardware.memory.totalBytes >= 16 * 1024 * 1024 * 1024) {
      maxRecommendedContext = 8192;
    } else if (hardware.memory.totalBytes <= 8 * 1024 * 1024 * 1024) {
      maxRecommendedContext = 2048;
    }

    return {
      hardware,
      supportedBackends,
      maxRecommendedContext,
      memoryBudgetBytes,
      vramBudgetBytes,
      hasHardwareAcceleration,
      analyzedAt: Date.now(),
    };
  }

  /**
   * Evaluates how well a specific model variant runs on the machine.
   */
  public static evaluateModelCompatibility(
    variant: ModelVariant,
    capabilities: CapabilityProfile,
    options?: CompatibilityEvaluationOptions
  ): CompatibilityAnalysis {
    const isLowMemory = Boolean(options?.lowMemoryMode);
    const totalRAM = capabilities.hardware.memory.totalBytes;
    const availableRAM = capabilities.hardware.memory.availableBytes;
    const vramBudget = capabilities.vramBudgetBytes;
    const modelSizeBytes = variant.sizeBytes;

    // KV Cache + Runtime memory calculation
    const contextLimit = isLowMemory
      ? Math.min(variant.contextLength || 2048, 2048)
      : Math.min(variant.contextLength || 4096, capabilities.maxRecommendedContext);

    // Flash Attention & Quantized KV cache cuts KV memory by ~60% in low memory mode
    const kvCacheMultiplier = isLowMemory ? 0.4 : 1.0;
    const kvCacheBytes = Math.floor((contextLimit / 1024) * 512 * 1024 * 1024 * kvCacheMultiplier);

    // In Low-Memory Layer Streaming mode, active working set in RAM is ~35% of model weights + KV cache
    const activeWorkingSetBytes = isLowMemory
      ? Math.floor(modelSizeBytes * 0.35 + kvCacheBytes)
      : Math.floor(modelSizeBytes * 1.15 + kvCacheBytes);

    const estimatedMemoryBytes = Math.floor(modelSizeBytes * 1.15 + kvCacheBytes);

    let canFitInVRAM = false;
    let recommendedGpuLayers = 0;

    if (capabilities.hasHardwareAcceleration && vramBudget > 0) {
      if (estimatedMemoryBytes <= vramBudget) {
        canFitInVRAM = true;
        recommendedGpuLayers = variant.gpuLayers || 99;
      } else {
        // Partial offload
        const fraction = Math.min(1, Math.max(0, vramBudget / estimatedMemoryBytes));
        recommendedGpuLayers = Math.floor((variant.gpuLayers || 33) * fraction);
      }
    }

    let rating: CompatibilityRating;
    let reason: string;

    const estGB = (estimatedMemoryBytes / (1024 * 1024 * 1024)).toFixed(1);
    const activeGB = (activeWorkingSetBytes / (1024 * 1024 * 1024)).toFixed(1);
    const availGB = (availableRAM / (1024 * 1024 * 1024)).toFixed(1);
    const totalGB = (totalRAM / (1024 * 1024 * 1024)).toFixed(1);
    const vramGB = (vramBudget / (1024 * 1024 * 1024)).toFixed(1);

    if (isLowMemory) {
      if (activeWorkingSetBytes <= availableRAM) {
        if (canFitInVRAM) {
          rating = 'Excellent';
          reason = `Low-Memory Mode: Fits in GPU VRAM with Flash Attention enabled.`;
        } else if (recommendedGpuLayers > 0) {
          rating = 'Good';
          reason = `Low-Memory Mode: Supported via Disk Layer Paging & Flash Attention (~${activeGB} GB active RAM vs ${availGB} GB free).`;
        } else {
          rating = 'Good';
          reason = `Low-Memory Mode: Dynamic layer paging from disk (~${activeGB} GB active working set fits in ${availGB} GB free RAM).`;
        }
      } else if (activeWorkingSetBytes <= totalRAM) {
        rating = 'Limited';
        reason = `Low-Memory Mode: Tight memory (~${activeGB} GB active working set vs ${availGB} GB free). Generation speed will depend on SSD paging.`;
      } else {
        rating = 'Unsupported';
        reason = `Model active working set (~${activeGB} GB) exceeds total system memory (${totalGB} GB).`;
      }
    } else {
      if (estimatedMemoryBytes > totalRAM) {
        rating = 'Unsupported';
        reason = `Estimated memory requirement (${estGB} GB) exceeds total system memory (${totalGB} GB). Enable Low-Memory Mode to stream from disk.`;
      } else if (estimatedMemoryBytes > availableRAM + 1024 * 1024 * 1024) {
        rating = 'Not recommended';
        reason = `Required memory (${estGB} GB) exceeds currently available free RAM (${availGB} GB). Enable Low-Memory Mode to stream layers from disk.`;
      } else if (canFitInVRAM) {
        rating = 'Excellent';
        reason = `Fits fully in high-speed GPU memory (${estGB} GB estimated vs ${vramGB} GB usable VRAM) with GPU acceleration.`;
      } else if (estimatedMemoryBytes <= capabilities.memoryBudgetBytes * 0.7) {
        if (recommendedGpuLayers > 0) {
          rating = 'Excellent';
          reason = `Fits comfortably with ${recommendedGpuLayers} layers offloaded to GPU and ample memory headroom (${availGB} GB free).`;
        } else {
          rating = 'Good';
          reason = `Fits smoothly in system RAM (${estGB} GB of ${availGB} GB available) using CPU multi-threading.`;
        }
      } else if (estimatedMemoryBytes <= capabilities.memoryBudgetBytes * 0.9) {
        rating = 'Good';
        reason = `Fits within memory budget with moderate headroom (${estGB} GB / ${availGB} GB available).`;
      } else {
        rating = 'Limited';
        reason = `Tight memory headroom (${estGB} GB / ${availGB} GB available). May experience lower token generation speed under load.`;
      }
    }

    return {
      rating,
      reason,
      estimatedMemoryBytes: isLowMemory ? activeWorkingSetBytes : estimatedMemoryBytes,
      availableMemoryBytes: availableRAM,
      canFitInVRAM,
      recommendedContextLimit: contextLimit,
      recommendedGpuLayers,
    };
  }
}
