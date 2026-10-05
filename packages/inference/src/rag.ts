import crypto from 'node:crypto';
import type { DocumentInfo, DocumentChunk, RagSearchResult, DocumentType, ChatMessage } from '@local-ai/shared';
import type { DocumentRepository } from '@local-ai/database';

export interface RagEngineOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export class RagEngine {
  private chunkSize: number;
  private chunkOverlap: number;

  constructor(
    private docRepo: DocumentRepository,
    options?: RagEngineOptions
  ) {
    this.chunkSize = options?.chunkSize || 600;
    this.chunkOverlap = options?.chunkOverlap || 100;
  }

  /**
   * Split text into overlapping chunks, respecting paragraphs and sentences
   */
  public chunkText(text: string): string[] {
    const cleaned = text.replace(/\r\n/g, '\n').trim();
    if (!cleaned) return [];
    if (cleaned.length <= this.chunkSize) return [cleaned];

    const chunks: string[] = [];
    let start = 0;

    while (start < cleaned.length) {
      let end = start + this.chunkSize;

      if (end >= cleaned.length) {
        chunks.push(cleaned.substring(start).trim());
        break;
      }

      // Try to break at a paragraph boundary
      let breakPoint = cleaned.lastIndexOf('\n\n', end);
      if (breakPoint > start + this.chunkOverlap) {
        end = breakPoint + 2;
      } else {
        // Try to break at a sentence boundary
        breakPoint = cleaned.lastIndexOf('. ', end);
        if (breakPoint > start + this.chunkOverlap) {
          end = breakPoint + 2;
        } else {
          // Try to break at a newline
          breakPoint = cleaned.lastIndexOf('\n', end);
          if (breakPoint > start + this.chunkOverlap) {
            end = breakPoint + 1;
          } else {
            // Try to break at a space
            breakPoint = cleaned.lastIndexOf(' ', end);
            if (breakPoint > start + this.chunkOverlap) {
              end = breakPoint + 1;
            }
          }
        }
      }

      const chunk = cleaned.substring(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }

      start = end - this.chunkOverlap;
      if (start >= cleaned.length) break;
    }

    return chunks;
  }

  /**
   * Ingest and index a document into SQLite
   */
  public async ingestDocument(
    name: string,
    content: string,
    type: DocumentType = 'txt',
    computeEmbedding?: (text: string) => Promise<number[] | undefined>
  ): Promise<DocumentInfo> {
    const docId = `doc_${crypto.randomBytes(8).toString('hex')}`;
    const rawChunks = this.chunkText(content);

    const doc: DocumentInfo = {
      id: docId,
      name,
      type,
      sizeBytes: Buffer.byteLength(content, 'utf-8'),
      chunkCount: rawChunks.length,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const chunks: DocumentChunk[] = [];
    for (let i = 0; i < rawChunks.length; i++) {
      const chunkText = rawChunks[i];
      let embedding: number[] | undefined;
      if (computeEmbedding) {
        try {
          embedding = await computeEmbedding(chunkText);
        } catch {
          // Graceful fallback to lexical search
        }
      }

      chunks.push({
        id: `chk_${docId}_${i}`,
        documentId: docId,
        chunkIndex: i,
        content: chunkText,
        embedding,
        tokenCount: Math.max(1, Math.ceil(chunkText.length / 4)),
      });
    }

    this.docRepo.createDocument(doc);
    if (chunks.length > 0) {
      this.docRepo.insertChunks(chunks);
    }

    return doc;
  }

  /**
   * Search indexed document chunks using BM25 lexical scoring + cosine vector similarity
   */
  public async search(
    query: string,
    limit: number = 4,
    documentIds?: string[],
    queryEmbedding?: number[]
  ): Promise<RagSearchResult[]> {
    const allChunks = this.docRepo.getAllChunksWithDocName();
    if (allChunks.length === 0) return [];

    const filtered = documentIds && documentIds.length > 0
      ? allChunks.filter((c) => documentIds.includes(c.documentId))
      : allChunks;

    if (filtered.length === 0) return [];

    // 1. BM25 / TF-IDF sparse lexical scoring
    const queryTerms = this.tokenize(query);
    const N = filtered.length;

    // Document frequencies (DF) for query terms
    const dfMap = new Map<string, number>();
    for (const term of queryTerms) {
      let count = 0;
      for (const chunk of filtered) {
        if (chunk.content.toLowerCase().includes(term)) count++;
      }
      dfMap.set(term, count);
    }

    const scored: Array<{
      chunk: typeof filtered[0];
      lexicalScore: number;
      denseScore: number;
      totalScore: number;
    }> = [];

    const k1 = 1.2;
    const b = 0.75;
    const avgDocLength = filtered.reduce((acc, c) => acc + c.content.length, 0) / (N || 1);

    for (const chunk of filtered) {
      const contentLower = chunk.content.toLowerCase();
      let lexicalScore = 0;

      for (const term of queryTerms) {
        const matches = (contentLower.match(new RegExp(`\\b${term}\\b`, 'g')) || []).length;
        if (matches > 0) {
          const df = dfMap.get(term) || 1;
          const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
          const tf = (matches * (k1 + 1)) / (matches + k1 * (1 - b + b * (chunk.content.length / avgDocLength)));
          lexicalScore += idf * tf;
        }
      }

      // 2. Dense vector cosine similarity (if embeddings present)
      let denseScore = 0;
      if (queryEmbedding && chunk.embedding && chunk.embedding.length === queryEmbedding.length) {
        denseScore = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      }

      // Hybrid combination
      const totalScore = queryEmbedding && chunk.embedding
        ? denseScore * 0.7 + Math.min(1, lexicalScore / 10) * 0.3
        : lexicalScore;

      scored.push({
        chunk,
        lexicalScore,
        denseScore,
        totalScore,
      });
    }

    return scored
      .filter((s) => s.totalScore > 0)
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit)
      .map((s) => ({
        chunkId: s.chunk.id,
        documentId: s.chunk.documentId,
        documentName: s.chunk.documentName,
        content: s.chunk.content,
        score: parseFloat(s.totalScore.toFixed(4)),
        chunkIndex: s.chunk.chunkIndex,
      }));
  }

  /**
   * Augment chat messages with retrieved document snippets
   */
  public augmentMessages(messages: ChatMessage[], searchResults: RagSearchResult[]): ChatMessage[] {
    if (searchResults.length === 0) return messages;

    const contextSection = searchResults
      .map((r, i) => `[Source ${i + 1}: ${r.documentName} (Section ${r.chunkIndex + 1})]\n${r.content}`)
      .join('\n\n---\n\n');

    const ragSystemPrompt = `You have access to the following relevant context extracted from private local documents. Use this information to inform your answer. When stating facts from the context, mention the source document name.\n\n=== RELEVANT CONTEXT ===\n${contextSection}\n=== END OF CONTEXT ===`;

    const augmented: ChatMessage[] = [];
    const hasSystemMsg = messages.some((m) => m.role === 'system');

    if (hasSystemMsg) {
      for (const m of messages) {
        if (m.role === 'system') {
          const sysContent = typeof m.content === 'string' ? m.content : '';
          augmented.push({
            ...m,
            content: `${sysContent}\n\n${ragSystemPrompt}`.trim(),
          });
        } else {
          augmented.push(m);
        }
      }
    } else {
      augmented.push({
        role: 'system',
        content: ragSystemPrompt,
      });
      augmented.push(...messages);
    }

    return augmented;
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}
