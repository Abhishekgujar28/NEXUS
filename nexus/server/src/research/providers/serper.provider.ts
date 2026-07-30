import { config } from '../../core/config.js';
import { logger } from '../../core/logger.js';
import { safeFetch } from '../../utils/safeFetch.js';
import { NormalizedSource, ResearchProvider } from './ResearchProvider.js';

export class SerperProvider implements ResearchProvider {
  readonly name = 'serper' as const;

  isConfigured(): boolean {
    return !!config.serperApiKey;
  }

  /**
   * Errors are intentionally propagated so the Provider Registry can apply
   * retry, timeout and failure-isolation uniformly across all providers.
   * A missing API key is not an error — it yields an empty result set.
   */
  async search(query: string): Promise<NormalizedSource[]> {
    if (!this.isConfigured()) {
      logger.debug('Serper not configured — skipping web search');
      return [];
    }
    const { data } = await safeFetch('https://google.serper.dev/search', {
      method: 'POST',
      data: { q: query, num: config.research.maxSourcesPerProvider },
      headers: { 'X-API-KEY': config.serperApiKey, 'Content-Type': 'application/json' },
    });
    return (data.organic || []).map((r: any, i: number): NormalizedSource => ({
      provider: 'serper',
      sourceType: 'web',
      title: r.title || 'Untitled',
      url: r.link || '',
      authors: [],
      publishedAt: r.date ? new Date(r.date) : null,
      snippet: r.snippet || '',
      query,
      metadata: { position: r.position ?? i + 1 },
      relevanceScore: Math.max(0, 1 - i * 0.08),
      credibilityScore: 0.5,
    }));
  }
}
