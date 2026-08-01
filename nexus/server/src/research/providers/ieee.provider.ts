import { config } from '../../core/config.js';
import { logger } from '../../core/logger.js';
import { safeFetch } from '../../utils/safeFetch.js';
import type { NormalizedSource, ResearchProvider } from './ResearchProvider.js';

interface IeeeAuthor {
  full_name?: string;
  author_name?: string;
}

interface IeeeArticle {
  article_number?: string;
  title?: string;
  abstract?: string;
  authors?: {
    authors?: IeeeAuthor[];
  };
  publication_title?: string;
  publication_year?: string | number;
  doi?: string;
  html_url?: string;
  pdf_url?: string;
  citing_paper_count?: number;
  index_terms?: {
    ieee_terms?: { terms?: string[] };
    author_terms?: { terms?: string[] };
  };
}

const IEEE_SEARCH_URL = 'https://ieeexploreapi.ieee.org/api/v1/search/articles';

export class IeeeProvider implements ResearchProvider {
  readonly name = 'ieee' as const;

  isConfigured(): boolean {
    return !!config.ieeeApiKey;
  }

  /**
   * IEEE Xplore official REST API paper search.
   * Requires IEEE_XPLORE_API_KEY. Errors propagate to Provider Registry.
   */
  async search(query: string): Promise<NormalizedSource[]> {
    if (!this.isConfigured()) {
      logger.debug('IEEE Xplore not configured — skipping paper search');
      return [];
    }

    const startTime = Date.now();
    const maxRecords = config.research.maxSourcesPerProvider;

    let response: any;
    try {
      response = await safeFetch(IEEE_SEARCH_URL, {
        method: 'GET',
        params: {
          apikey: config.ieeeApiKey,
          format: 'json',
          querytext: query,
          max_records: maxRecords,
        },
      });
    } catch (err: any) {
      logger.error(`IEEE Xplore provider request failed [${err?.response?.status || 'ERR'}]: ${err?.message}`, {
        endpoint: IEEE_SEARCH_URL,
        latencyMs: Date.now() - startTime,
        responseData: err?.response?.data,
      });
      throw err;
    }

    const latencyMs = Date.now() - startTime;
    const articles: IeeeArticle[] = response?.data?.articles || [];

    logger.info(`IEEE Xplore provider succeeded`, {
      endpoint: IEEE_SEARCH_URL,
      statusCode: response?.status,
      latencyMs,
      retrievedCount: articles.length,
    });

    return articles
      .filter((a) => a.title)
      .map((a, i): NormalizedSource => {
        const citationCount = a.citing_paper_count ?? 0;
        const authors = (a.authors?.authors || [])
          .map((auth) => auth.full_name || auth.author_name || '')
          .filter(Boolean);

        const keywords = [
          ...(a.index_terms?.ieee_terms?.terms || []),
          ...(a.index_terms?.author_terms?.terms || []),
        ];

        const publishedAt = a.publication_year
          ? new Date(`${a.publication_year}-01-01`)
          : null;

        const url =
          a.html_url ||
          a.pdf_url ||
          (a.doi ? `https://doi.org/${a.doi}` : `https://ieeexplore.ieee.org/document/${a.article_number}`);

        return {
          provider: this.name,
          sourceType: 'paper',
          title: a.title as string,
          url,
          authors,
          publishedAt,
          snippet: a.abstract || '',
          query,
          metadata: {
            articleNumber: a.article_number,
            doi: a.doi || null,
            publicationTitle: a.publication_title || null,
            citationCount,
            keywords,
          },
          relevanceScore: Math.max(0, 1 - i * 0.08),
          credibilityScore: Math.min(1, 0.6 + Math.log10(citationCount + 1) / 5),
        };
      });
  }
}
