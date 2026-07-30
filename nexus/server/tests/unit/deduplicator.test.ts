import { describe, it } from 'node:test';
import assert from 'node:assert';
import { deduplicateSources } from '../../src/research/deduplicator.js';
import { NormalizedSource } from '../../src/research/providers/ResearchProvider.js';

describe('Deduplicator Unit Tests', () => {
  it('should deduplicate sources with identical normalized URLs', () => {
    const sources: NormalizedSource[] = [
      {
        provider: 'serper',
        sourceType: 'article',
        title: 'Title A',
        url: 'https://example.com/article1',
        snippet: 'Snippet 1',
        query: 'query 1',
        relevanceScore: 0.8,
        credibilityScore: 0.9,
      },
      {
        provider: 'arxiv',
        sourceType: 'paper',
        title: 'Title A Duplicate',
        url: 'http://example.com/article1/', // http vs https and trailing slash difference
        snippet: 'Snippet 2',
        query: 'query 2',
        relevanceScore: 0.7,
        credibilityScore: 0.8,
      },
    ];

    const deduplicated = deduplicateSources(sources);
    assert.strictEqual(deduplicated.length, 1);
    assert.strictEqual(deduplicated[0].url, 'https://example.com/article1');
  });

  it('should deduplicate sources by title when URL is empty', () => {
    const sources: NormalizedSource[] = [
      {
        provider: 'arxiv',
        sourceType: 'paper',
        title: 'Attention Is All You Need',
        url: '',
        snippet: 'Transformer paper',
        query: 'transformer',
        relevanceScore: 0.95,
        credibilityScore: 0.99,
      },
      {
        provider: 'semanticScholar',
        sourceType: 'paper',
        title: 'ATTENTION IS ALL YOU NEED',
        url: '',
        snippet: 'Transformer paper duplicate',
        query: 'transformer',
        relevanceScore: 0.90,
        credibilityScore: 0.95,
      },
    ];

    const deduplicated = deduplicateSources(sources);
    assert.strictEqual(deduplicated.length, 1);
    assert.strictEqual(deduplicated[0].title, 'Attention Is All You Need');
  });

  it('should retain distinct sources', () => {
    const sources: NormalizedSource[] = [
      {
        provider: 'arxiv',
        sourceType: 'paper',
        title: 'Paper One',
        url: 'https://arxiv.org/abs/1',
        snippet: 'Snippet 1',
        query: 'q1',
        relevanceScore: 0.8,
        credibilityScore: 0.8,
      },
      {
        provider: 'github',
        sourceType: 'repository',
        title: 'Repo Two',
        url: 'https://github.com/repo2',
        snippet: 'Snippet 2',
        query: 'q2',
        relevanceScore: 0.9,
        credibilityScore: 0.9,
      },
    ];

    const deduplicated = deduplicateSources(sources);
    assert.strictEqual(deduplicated.length, 2);
  });
});
