import type { Model, ModelVariant } from '@local-ai/shared';

export interface ModelProvider {
  id: string;
  search(query: string, limit?: number): Promise<Model[]>;
  getModel(id: string): Promise<Model | null>;
}

export class HuggingFaceProvider implements ModelProvider {
  public readonly id = 'huggingface';

  public async search(query: string, limit: number = 10): Promise<Model[]> {
    try {
      const searchUrl = `https://huggingface.co/api/models?search=${encodeURIComponent(query + ' GGUF')}&limit=${limit}&full=true`;
      const res = await fetch(searchUrl, { headers: { 'User-Agent': 'LocalAI-Server' } });
      if (!res.ok) return [];

      const items = (await res.json()) as any[];
      const results: Model[] = [];

      for (const item of items) {
        const repoId = item.id || item.modelId;
        if (!repoId) continue;

        const parts = repoId.split('/');
        const publisher = parts.length > 1 ? parts[0] : 'Community';
        const name = parts.length > 1 ? parts[1] : repoId;

        // Parse siblings for .gguf files
        const siblings: Array<{ rfilename: string }> = item.siblings || [];
        const ggufFiles = siblings.filter((s) => s.rfilename.endsWith('.gguf'));
        if (ggufFiles.length === 0) continue;

        const variants: ModelVariant[] = [];
        for (const file of ggufFiles.slice(0, 5)) {
          const filename = file.rfilename;
          const quantMatch = filename.match(/(Q4_K_M|Q4_K_S|Q5_K_M|Q8_0|F16|F32|Q4_0|Q4_1)/i);
          const quantization = (quantMatch ? quantMatch[1].toUpperCase() : 'Q4_K_M') as any;
          const variantId = `${repoId.replace(/[^a-zA-Z0-9]/g, '-')}-${quantization}`.toLowerCase();

          variants.push({
            id: variantId,
            name: `${quantization} Quantization`,
            quantization,
            format: 'gguf',
            sizeBytes: 2_000_000_000, // Estimated baseline if not returned
            downloadUrl: `https://huggingface.co/${repoId}/resolve/main/${filename}`,
            contextLength: 4096,
            estimatedRAMBytes: 3_000_000_000,
            estimatedVRAMBytes: 2_500_000_000,
            gpuLayers: 33,
          });
        }

        if (variants.length === 0) continue;

        results.push({
          id: repoId.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase(),
          name: name.replace(/-GGUF$/i, '').replace(/_/g, ' '),
          publisher,
          description: item.description || `Community model ${repoId} from Hugging Face`,
          parameterCount: 'Custom',
          capabilities: ['TEXT_GENERATION', 'CHAT'],
          tags: item.tags || ['gguf', 'huggingface'],
          variants,
          defaultVariantId: variants[0].id,
        });
      }

      return results;
    } catch {
      return [];
    }
  }

  public async getModel(id: string): Promise<Model | null> {
    const results = await this.search(id, 1);
    return results.length > 0 ? results[0] : null;
  }
}
