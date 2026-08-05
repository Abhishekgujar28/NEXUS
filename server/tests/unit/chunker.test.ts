import { describe, it } from 'node:test';
import assert from 'node:assert';
import { chunkSource } from '../../src/rag/chunker.js';

describe('RAG Chunker Unit Tests', () => {
  it('should split long text into multiple chunks with correct metadata', () => {
    const longText = Array(200).fill('This is a sentence for testing RAG chunking algorithm.').join(' ');
    const sourceInput = {
      _id: '507f1f77bcf86cd799439022',
      projectId: '507f1f77bcf86cd799439011',
      sourceType: 'article',
      title: 'Long Research Article',
      url: 'https://example.com/long-article',
      provider: 'serper',
      relevanceScore: 0.85,
      content: longText,
    };

    const chunks = chunkSource(sourceInput);
    assert.ok(chunks.length > 1);

    for (let i = 0; i < chunks.length; i++) {
      assert.strictEqual(chunks[i].metadata.projectId, '507f1f77bcf86cd799439011');
      assert.strictEqual(chunks[i].metadata.sourceId, '507f1f77bcf86cd799439022');
      assert.strictEqual(chunks[i].metadata.chunkIndex, i);
      assert.strictEqual(chunks[i].metadata.title, 'Long Research Article');
    }
  });

  it('should handle empty or missing content gracefully by using snippet', () => {
    const sourceInput = {
      _id: '507f1f77bcf86cd799439023',
      projectId: '507f1f77bcf86cd799439011',
      sourceType: 'paper',
      title: 'Abstract Only Paper',
      url: 'https://arxiv.org/abs/1234',
      provider: 'arxiv',
      snippet: 'This is the paper snippet abstract.',
    };

    const chunks = chunkSource(sourceInput);
    assert.strictEqual(chunks.length, 1);
    assert.ok(chunks[0].text.includes('This is the paper snippet abstract.'));
  });

  it('should return empty array when source text is completely empty', () => {
    const sourceInput = {
      _id: '507f1f77bcf86cd799439024',
      projectId: '507f1f77bcf86cd799439011',
      sourceType: 'article',
      title: '',
      url: 'https://example.com/empty',
      provider: 'web',
      content: '',
      snippet: '',
    };

    const chunks = chunkSource(sourceInput);
    assert.strictEqual(chunks.length, 0);
  });
});
