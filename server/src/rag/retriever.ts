import { queryVectorStore, VectorSearchResult } from './chroma.client.js';
import { embedText } from './embedder.js';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

export interface RankedChunk extends VectorSearchResult {
  hybridScore: number;
  keywordScore: number;
}

/**
 * Tokenize and normalize text into unique lowercase term tokens.
 */
const tokenize = (text: string): string[] => {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((t) => t.length > 2)
    )
  );
};

/**
 * Compute keyword overlap score (0 to 1) between candidate chunk text and query terms.
 */
const computeKeywordOverlap = (chunkText: string, queryTerms: string[]): number => {
  if (queryTerms.length === 0) return 0;
  const chunkTerms = new Set(tokenize(chunkText));
  let matchCount = 0;

  for (const term of queryTerms) {
    if (chunkTerms.has(term)) matchCount++;
  }

  return matchCount / queryTerms.length;
};

/**
 * Perform vector search and apply hybrid reranking (0.7 * similarity + 0.3 * keyword_overlap).
 */
export const retrieveAndRerank = async (
  projectId: string,
  queryText: string,
  topK = config.rag.topK
): Promise<RankedChunk[]> => {
  logger.info(`RAG Retrieve & Rerank for project [${projectId}], query: "${queryText.slice(0, 40)}..."`);

  // 1. Embed query
  const queryEmbedding = await embedText(queryText);

  // 2. Vector search (retrieve topK candidates)
  const candidates = await queryVectorStore(projectId, queryEmbedding, topK * 2);
  if (candidates.length === 0) return [];

  // 3. Hybrid Reranking
  const queryTerms = tokenize(queryText);
  const ranked: RankedChunk[] = candidates.map((cand) => {
    const keywordScore = computeKeywordOverlap(cand.text, queryTerms);
    const hybridScore = 0.7 * cand.similarity + 0.3 * keywordScore;
    return {
      ...cand,
      keywordScore,
      hybridScore,
    };
  });

  ranked.sort((a, b) => b.hybridScore - a.hybridScore);
  const topResults = ranked.slice(0, topK);

  logger.info(`Retrieved and reranked ${topResults.length} RAG chunks`);
  return topResults;
};
