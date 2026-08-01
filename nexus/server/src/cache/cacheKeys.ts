import { createHash } from 'crypto';

export const TTL_MAP = {
  SEARCH_QUERY: 24 * 60 * 60, // 24 hours
  SEARCH_PROVIDER: 12 * 60 * 60, // 12 hours
  AI_OUTPUT: 6 * 60 * 60, // 6 hours
  ARCHITECTURE: 48 * 60 * 60, // 48 hours
  TECH_STACK: 72 * 60 * 60, // 72 hours
  COMPETITOR: 24 * 60 * 60, // 24 hours
  GAP_ANALYSIS: 24 * 60 * 60, // 24 hours
  RAG_EMBEDDING: 12 * 60 * 60, // 12 hours
};

export const hashKey = (input: string): string => {
  return createHash('sha256').update(input.trim().toLowerCase()).digest('hex');
};

export const buildCacheKey = (namespace: string, payload: any): string => {
  const hash = typeof payload === 'string' ? hashKey(payload) : hashKey(JSON.stringify(payload));
  return `cache:${namespace}:${hash}`;
};
