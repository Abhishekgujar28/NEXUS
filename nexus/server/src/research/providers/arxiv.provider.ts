import { parseStringPromise } from 'xml2js';
import { config } from '../../core/config.js';
import { safeFetch } from '../../utils/safeFetch.js';
import { NormalizedSource, ResearchProvider } from './ResearchProvider.js';

export class ArxivProvider implements ResearchProvider {
  readonly name = 'arxiv' as const;

  isConfigured(): boolean {
    return true; // free, no key required
  }

  /**
   * Errors propagate to the registry, which owns retry / timeout / isolation.
   */
  async search(query: string): Promise<NormalizedSource[]> {
    const maxResults = config.research.maxSourcesPerProvider;
    const { data } = await safeFetch(
      `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=${maxResults}&sortBy=relevance`,
      { method: 'GET', responseType: 'text' }
    );
    const parsed = await parseStringPromise(data, { explicitArray: false });
    const entries = parsed?.feed?.entry;
    if (!entries) return [];
    const list = Array.isArray(entries) ? entries : [entries];
    return list.map((e: any, i: number): NormalizedSource => ({
      provider: 'arxiv',
      sourceType: 'paper',
      title: (e.title || '').replace(/\s+/g, ' ').trim(),
      url: e.id || '',
      authors: Array.isArray(e.author) ? e.author.map((a: any) => a.name) : [e.author?.name].filter(Boolean),
      publishedAt: e.published ? new Date(e.published) : null,
      snippet: (e.summary || '').replace(/\s+/g, ' ').trim(),
      query,
      metadata: { arxivId: e.id?.split('/').pop() },
      relevanceScore: Math.max(0, 1 - i * 0.07),
      credibilityScore: 0.75,
    }));
  }
}
