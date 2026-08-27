import fs from 'node:fs';
import path from 'node:path';
import type { Model, ModelInstallation, DownloadProgress, CompatibilityAnalysis } from '@local-ai/shared';
import { CURATED_MODELS } from './curated.js';
import { ModelDownloader } from './downloader.js';
import { HuggingFaceProvider } from './provider.js';
import { ModelRepository } from '@local-ai/database';
import { CapabilityEngine } from '@local-ai/capabilities';
import type { CapabilityProfile } from '@local-ai/shared';
import { NotFoundError, AppError } from '@local-ai/shared';

export class ModelManager {
  private downloader = new ModelDownloader();
  private hfProvider = new HuggingFaceProvider();
  private activeDownloads = new Map<string, DownloadProgress>();

  constructor(
    private modelRepo: ModelRepository,
    private modelsDir: string
  ) {
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }
    // Seed curated models into database
    this.seedCuratedModels();
  }

  private seedCuratedModels(): void {
    for (const model of CURATED_MODELS) {
      this.modelRepo.upsertModel(model);
    }
  }

  public getAvailableModels(): Model[] {
    return this.modelRepo.getAllModels();
  }

  public getInstalledModels(): ModelInstallation[] {
    return this.modelRepo.getAllInstallations();
  }

  public getModel(id: string): Model | null {
    const all = this.getAvailableModels();
    return all.find((m) => m.id === id) || null;
  }

  public async searchHuggingFace(query: string, limit: number = 8): Promise<Model[]> {
    return this.hfProvider.search(query, limit);
  }

  public getRecommendedModels(capabilities: CapabilityProfile): Array<Model & { analysis: CompatibilityAnalysis }> {
    const models = this.getAvailableModels();
    return models
      .map((m) => {
        const variant = m.variants.find((v) => v.id === m.defaultVariantId) || m.variants[0];
        const analysis = CapabilityEngine.evaluateModelCompatibility(variant, capabilities);
        return { ...m, analysis };
      })
      .sort((a, b) => {
        const score = (r: string) => {
          if (r === 'Excellent') return 4;
          if (r === 'Good') return 3;
          if (r === 'Limited') return 2;
          if (r === 'Not recommended') return 1;
          return 0;
        };
        return score(b.analysis.rating) - score(a.analysis.rating);
      });
  }

  public async startDownload(params: {
    modelId: string;
    variantId: string;
    downloadUrl?: string;
    name?: string;
    onProgress?: (p: DownloadProgress) => void;
  }): Promise<string> {
    const { modelId, variantId } = params;
    let model = this.getModel(modelId);
    let variant = model?.variants.find((v) => v.id === variantId);

    if (!variant && params.downloadUrl) {
      // Dynamic variant
      variant = {
        id: variantId,
        name: params.name || 'Custom Model',
        quantization: 'Q4_K_M',
        format: 'gguf',
        sizeBytes: 1_000_000_000,
        downloadUrl: params.downloadUrl,
        contextLength: 4096,
        estimatedRAMBytes: 2_000_000_000,
        estimatedVRAMBytes: 1_500_000_000,
        gpuLayers: 33,
      };
    }

    if (!variant) {
      throw new NotFoundError(`Model variant ${variantId} not found`);
    }

    const downloadId = `dl_${variantId}_${Date.now()}`;
    const filename = path.basename(new URL(variant.downloadUrl).pathname) || `${variantId}.gguf`;
    const destPath = path.join(this.modelsDir, filename);

    // Check if already installed
    const existing = this.getInstalledModels().find((i) => i.localPath === destPath && fs.existsSync(destPath));
    if (existing) {
      return downloadId;
    }

    const onProgress = (p: DownloadProgress) => {
      this.activeDownloads.set(downloadId, p);
      params.onProgress?.(p);
    };

    // Run download in background
    this.downloader
      .download({
        id: downloadId,
        modelId,
        variantId,
        url: variant.downloadUrl,
        destPath,
        expectedSizeBytes: variant.sizeBytes,
        expectedSha256: variant.sha256,
        onProgress,
      })
      .then((finalPath) => {
        const stats = fs.statSync(finalPath);
        const installation: ModelInstallation = {
          id: `inst_${variantId}`,
          modelId,
          variantId,
          name: model?.name || params.name || filename,
          localPath: finalPath,
          sizeBytes: stats.size,
          installedAt: Date.now(),
          isLoaded: false,
          format: variant!.format,
          quantization: variant!.quantization,
          contextLength: variant!.contextLength,
        };
        this.modelRepo.upsertInstallation(installation);
      })
      .catch((err) => {
        console.error(`Download failed for ${variantId}:`, err.message);
      });

    return downloadId;
  }

  public cancelDownload(downloadId: string): boolean {
    const cancelled = this.downloader.cancel(downloadId);
    this.activeDownloads.delete(downloadId);
    return cancelled;
  }

  public getActiveDownloads(): DownloadProgress[] {
    return Array.from(this.activeDownloads.values());
  }

  public deleteInstallation(installationId: string): boolean {
    const inst = this.modelRepo.getInstallation(installationId);
    if (!inst) throw new NotFoundError(`Installation ${installationId} not found`);

    if (inst.isLoaded) {
      throw new AppError('Cannot delete a model that is currently loaded. Unload it first.', 'MODEL_IN_USE');
    }

    if (fs.existsSync(inst.localPath)) {
      try {
        fs.unlinkSync(inst.localPath);
      } catch (err: any) {
        console.warn(`Failed to delete model file ${inst.localPath}:`, err.message);
      }
    }

    this.modelRepo.deleteInstallation(installationId);
    return true;
  }
}
