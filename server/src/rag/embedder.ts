import { aiProvider } from '../integrations/gemini.js';
import { ChunkData } from './chunker.js';
import { logger } from '../core/logger.js';
import { AppError, ErrorCodes } from '../core/errors.js';

export interface ChunkWithEmbedding extends ChunkData {
  embedding: number[];
}

/**
 * Generate embedding vector for a single string using Gemini text-embedding-004.
 */
export const embedText = async (text: string): Promise<number[]> => {
  if (!aiProvider.isConfigured()) {
    throw new AppError('Gemini API is not configured for embeddings', 503, ErrorCodes.BAD_GATEWAY);
  }
  return aiProvider.embed(text);
};

/**
 * Generate embeddings for an array of ChunkData in batches to respect rate limits.
 */
export const embedBatch = async (
  chunks: ChunkData[],
  batchSize = 10
): Promise<ChunkWithEmbedding[]> => {
  if (chunks.length === 0) return [];

  logger.info(`Embedding batch of ${chunks.length} chunks via Gemini embedder`);
  const results: ChunkWithEmbedding[] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const batchEmbeddings = await Promise.all(
      batch.map(async (chunk) => {
        try {
          const embedding = await embedText(chunk.text);
          return { ...chunk, embedding };
        } catch (err) {
          logger.warn(`Failed to embed chunk ${chunk.id}`, { error: (err as Error).message });
          return null;
        }
      })
    );

    for (const item of batchEmbeddings) {
      if (item) results.push(item);
    }
  }

  return results;
};
