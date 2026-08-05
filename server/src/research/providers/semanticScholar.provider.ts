import { config } from '../../core/config.js';
import { logger } from '../../core/logger.js';
import { safeFetch } from '../../utils/safeFetch.js';
import type { NormalizedSource, ResearchProvider } from './ResearchProvider.js';

interface SemanticScholarAuthor {
  name?: string;
}

interface SemanticScholarPaper {
  paperId?: string;
  title?: string;
  url?: string;
  abstract?: string;
  authors?: SemanticScholarAuthor[];
  year?: number;
  citationCount?: number;
  externalIds?: Record<string, unknown>;
}

const SEARCH_URL = 'https://api.semanticscholar.org/graph/v1/paper/search';

/**
 * Semantic Scholar academic paper provider. Works without an API key,
 * though a key raises rate limits.
 */
export class SemanticScholarProvider implements ResearchProvider {
  readonly name = 'semanticScholar' as const;

  isConfigured(): boolean {
    // Public endpoint is usable without a key.
    return true;
  }

  /**
   * Errors propagate to the registry, which owns retry / timeout / isolation.
   */
  async search(query: string): Promise<NormalizedSource[]> {
    const startTime = Date.now();
    const headers: Record<string, string> = { 'User-Agent': 'NEXUS-Engine' };
    if (config.semanticScholarApiKey) headers['x-api-key'] = config.semanticScholarApiKey;
    let authUsed = !!config.semanticScholarApiKey;

    let response: any;
    try {
      response = await safeFetch(SEARCH_URL, {
        method: 'GET',
        params: {
          query,
          limit: config.research.maxSourcesPerProvider,
          fields: 'title,authors,year,abstract,url,citationCount,externalIds',
        },
        headers,
      });
    } catch (err: any) {
      if (authUsed && err?.response?.status === 403) {
        logger.warn('Semantic Scholar key rejected (403) — falling back to unauthenticated public API', { query });
        authUsed = false;
        delete headers['x-api-key'];
        response = await safeFetch(SEARCH_URL, {
          method: 'GET',
          params: {
            query,
            limit: config.research.maxSourcesPerProvider,
            fields: 'title,authors,year,abstract,url,citationCount,externalIds',
          },
          headers,
        });
      } else {
        logger.error(`Semantic Scholar provider request failed [${err?.response?.status || 'ERR'}]: ${err?.message}`, {
          endpoint: SEARCH_URL,
          authUsed,
          latencyMs: Date.now() - startTime,
        });
        throw err;
      }
    }

    const latencyMs = Date.now() - startTime;
    const papers: SemanticScholarPaper[] = response?.data?.data ?? [];

    logger.info(`Semantic Scholar provider succeeded`, {
      endpoint: SEARCH_URL,
      authStatus: authUsed ? 'authenticated' : 'unauthenticated',
      statusCode: response?.status,
      latencyMs,
      retrievedCount: papers.length,
    });

    return papers
      .filter((p) => p.title)
      .map((p) => {
        const citations = p.citationCount ?? 0;
        return {
          provider: this.name,
          sourceType: 'paper',
          title: p.title as string,
          url: p.url || (p.paperId ? `https://www.semanticscholar.org/paper/${p.paperId}` : ''),
          authors: (p.authors ?? []).map((a) => a.name ?? '').filter(Boolean),
          publishedAt: p.year ? new Date(`${p.year}-01-01`) : null,
          snippet: p.abstract ?? '',
          query,
          metadata: {
            paperId: p.paperId,
            citationCount: citations,
            externalIds: p.externalIds ?? {},
          },
          relevanceScore: 0,
          // Citation-weighted credibility, capped at 1.
          credibilityScore: Math.min(1, 0.5 + Math.log10(citations + 1) / 6),
        } satisfies NormalizedSource;
      });
  }
}
