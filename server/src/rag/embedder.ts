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
  batchSize = 50
): Promise<ChunkWithEmbedding[]> => {
  if (chunks.length === 0) return [];

  logger.info(`Embedding ${chunks.length} chunks in batches of ${batchSize} (concurrency=3)`);
  const results: ChunkWithEmbedding[] = [];
  const batches: ChunkData[][] = [];

  for (let i = 0; i < chunks.length; i += batchSize) {
    batches.push(chunks.slice(i, i + batchSize));
  }

  const CONCURRENCY = 3;
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const window = batches.slice(i, i + CONCURRENCY);
    await Promise.all(
      window.map(async (batch) => {
        try {
          const texts = batch.map((c) => c.text);
          const embeddings = await aiProvider.embedBatch!(texts);

          for (let j = 0; j < batch.length; j++) {
            const embedding = embeddings[j] ?? new Array(1536).fill(0);
            results.push({ ...batch[j], embedding });
          }
        } catch (err) {
          logger.warn(`Failed to embed chunk batch`, { error: (err as Error).message });
        }
      })
    );
  }

  return results;
};
