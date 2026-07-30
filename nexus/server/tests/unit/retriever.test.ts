import { describe, it } from 'node:test';
import assert from 'node:assert';
import { cosineSimilarity } from '../../src/rag/chroma.client.js';

describe('RAG Retriever & Vector Similarity Unit Tests', () => {
  it('should return 1 for identical vector direction', () => {
    const vecA = [0.5, 0.5, 0.5, 0.5];
    const vecB = [0.5, 0.5, 0.5, 0.5];

    const similarity = cosineSimilarity(vecA, vecB);
    assert.strictEqual(Math.round(similarity * 1000) / 1000, 1);
  });

  it('should return 0 for orthogonal vectors', () => {
    const vecA = [1, 0, 0];
    const vecB = [0, 1, 0];

    const similarity = cosineSimilarity(vecA, vecB);
    assert.strictEqual(similarity, 0);
  });

  it('should return -1 for opposite vectors', () => {
    const vecA = [1, 0];
    const vecB = [-1, 0];

    const similarity = cosineSimilarity(vecA, vecB);
    assert.strictEqual(Math.round(similarity), -1);
  });

  it('should handle zero or empty vectors gracefully', () => {
    const vecA: number[] = [];
    const vecB: number[] = [];

    const similarity = cosineSimilarity(vecA, vecB);
    assert.strictEqual(similarity, 0);
  });
});
