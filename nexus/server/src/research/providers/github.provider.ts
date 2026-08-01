import { config } from '../../core/config.js';
import { logger } from '../../core/logger.js';
import { safeFetch } from '../../utils/safeFetch.js';
import { NormalizedSource, ResearchProvider } from './ResearchProvider.js';

export class GitHubProvider implements ResearchProvider {
  readonly name = 'github' as const;

  isConfigured(): boolean {
    return true; // Public endpoint usable with or without token
  }

  /**
   * Works with or without a token. Token raises rate limits.
   * Fine-Grained PATs (github_pat_) use Bearer auth scheme.
   * If token is invalid/expired (401), falls back to unauthenticated public search.
   */
  async search(query: string): Promise<NormalizedSource[]> {
    const perPage = config.research.maxSourcesPerProvider;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`;
    const startTime = Date.now();

    const buildHeaders = (useToken: boolean): Record<string, string> => {
      const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json', 'User-Agent': 'NEXUS-Engine' };
      if (useToken && config.githubToken) {
        headers.Authorization = config.githubToken.startsWith('github_pat_')
          ? `Bearer ${config.githubToken}`
          : `token ${config.githubToken}`;
      }
      return headers;
    };

    let response: any;
    let authUsed = !!config.githubToken;

    try {
      response = await safeFetch(url, { method: 'GET', headers: buildHeaders(true) });
    } catch (err: any) {
      if (authUsed && err?.response?.status === 401) {
        logger.warn('GitHub token invalid/unauthorized (401) — falling back to unauthenticated public search', {
          query,
        });
        authUsed = false;
        response = await safeFetch(url, { method: 'GET', headers: buildHeaders(false) });
      } else {
        logger.error(`GitHub provider request failed [${err?.response?.status || 'ERR'}]: ${err?.message}`, {
          endpoint: url,
          authUsed,
          latencyMs: Date.now() - startTime,
        });
        throw err;
      }
    }

    const latencyMs = Date.now() - startTime;
    const items = response?.data?.items || [];

    logger.info(`GitHub provider succeeded`, {
      endpoint: url,
      authStatus: authUsed ? 'authenticated' : 'unauthenticated',
      statusCode: response?.status,
      latencyMs,
      retrievedCount: items.length,
    });

    return items.map((r: any, i: number): NormalizedSource => ({
      provider: 'github',
      sourceType: 'repo',
      title: r.full_name,
      url: r.html_url,
      authors: [r.owner?.login].filter(Boolean),
      publishedAt: r.created_at ? new Date(r.created_at) : null,
      snippet: r.description || '',
      query,
      metadata: {
        stars: r.stargazers_count,
        forks: r.forks_count,
        language: r.language,
        topics: r.topics || [],
        license: r.license?.spdx_id || null,
        updatedAt: r.pushed_at,
      },
      relevanceScore: Math.max(0, 1 - i * 0.08),
      credibilityScore: Math.min(1, Math.log10((r.stargazers_count || 0) + 1) / 5),
    }));
  }
}
