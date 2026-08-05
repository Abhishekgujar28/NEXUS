import { ChunkWithEmbedding } from './embedder.js';
import { ChunkMetadata } from './chunker.js';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

export interface VectorSearchResult {
  id: string;
  text: string;
  metadata: ChunkMetadata;
  distance: number; // 0 (identical) to 2 (opposite)
  similarity: number; // 0 to 1
}

/**
 * Cosine Similarity calculation between two float arrays.
 */
export const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

/**
 * In-Memory Vector Store Fallback when ChromaDB server is not running or vectorStore is set to 'memory'.
 */
class MemoryVectorStore {
  private store = new Map<string, ChunkWithEmbedding[]>();

  async upsert(projectId: string, chunks: ChunkWithEmbedding[]): Promise<void> {
    const existing = this.store.get(projectId) || [];
    const chunkMap = new Map<string, ChunkWithEmbedding>();

    for (const c of existing) chunkMap.set(c.id, c);
    for (const c of chunks) chunkMap.set(c.id, c);

    this.store.set(projectId, Array.from(chunkMap.values()));
    logger.info(`[MemoryVectorStore] Upserted ${chunks.length} chunks for project ${projectId}`);
  }

  async query(projectId: string, queryEmbedding: number[], topK: number): Promise<VectorSearchResult[]> {
    const chunks = this.store.get(projectId) || [];
    if (chunks.length === 0) return [];

    const scored = chunks.map((chunk) => {
      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
      return {
        id: chunk.id,
        text: chunk.text,
        metadata: chunk.metadata,
        distance: 1 - similarity,
        similarity,
      };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, topK);
  }

  async clear(projectId: string): Promise<void> {
    this.store.delete(projectId);
  }
}

const memoryStore = new MemoryVectorStore();

/**
 * Upsert chunks into Vector Store (ChromaDB or Memory Fallback).
 */
export const upsertChunks = async (
  projectId: string,
  chunks: ChunkWithEmbedding[]
): Promise<void> => {
  if (chunks.length === 0) return;

  if (config.vectorStore === 'memory') {
    await memoryStore.upsert(projectId, chunks);
    return;
  }

  try {
    const { ChromaClient } = await import('chromadb');
    const client = new ChromaClient({ path: config.chromaUrl });
    const collectionName = `nexus_project_${projectId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const collection = await client.getOrCreateCollection({ name: collectionName });

    await collection.upsert({
      ids: chunks.map((c) => c.id),
      embeddings: chunks.map((c) => c.embedding),
      documents: chunks.map((c) => c.text),
      metadatas: chunks.map((c) => ({
        projectId: c.metadata.projectId,
        sourceId: c.metadata.sourceId,
        chunkIndex: c.metadata.chunkIndex,
        sourceType: c.metadata.sourceType,
        title: c.metadata.title,
        url: c.metadata.url,
        provider: c.metadata.provider,
        relevanceScore: c.metadata.relevanceScore,
      })) as any,
    });

    logger.info(`[ChromaDB] Upserted ${chunks.length} chunks into collection ${collectionName}`);
  } catch (err) {
    logger.warn(`ChromaDB unavailable, falling back to MemoryVectorStore`, {
      error: (err as Error).message,
    });
    await memoryStore.upsert(projectId, chunks);
  }
};

/**
 * Query Vector Store for nearest neighbors.
 */
export const queryVectorStore = async (
  projectId: string,
  queryEmbedding: number[],
  topK = config.rag.topK
): Promise<VectorSearchResult[]> => {
  if (config.vectorStore === 'memory') {
    return memoryStore.query(projectId, queryEmbedding, topK);
  }

  try {
    const { ChromaClient } = await import('chromadb');
    const client = new ChromaClient({ path: config.chromaUrl });
    const collectionName = `nexus_project_${projectId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    const collection = await (client as any).getCollection({ name: collectionName });

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
    });

    const items: VectorSearchResult[] = [];
    if (results.documents[0]) {
      for (let i = 0; i < results.documents[0].length; i++) {
        const dist = results.distances?.[0]?.[i] ?? 0.5;
        const sim = 1 - dist;
        items.push({
          id: results.ids[0][i],
          text: results.documents[0][i] || '',
          metadata: (results.metadatas[0]?.[i] as unknown as ChunkMetadata) || {},
          distance: dist,
          similarity: sim,
        });
      }
    }

    return items;
  } catch (err) {
    logger.warn(`ChromaDB query failed, querying MemoryVectorStore fallback`, {
      error: (err as Error).message,
    });
    return memoryStore.query(projectId, queryEmbedding, topK);
  }
};
