import { config } from '../../core/config.js';
import { safeFetch } from '../../utils/safeFetch.js';
import { NormalizedSource, ResearchProvider } from './ResearchProvider.js';

export class GitHubProvider implements ResearchProvider {
  readonly name = 'github' as const;

  isConfigured(): boolean {
    return !!config.githubToken;
  }

  /**
   * Works without a token (rate-limited); a token just raises limits, so this
   * provider is always eligible to run. Errors propagate to the registry,
   * which owns retry / timeout / failure-isolation.
   */
  async search(query: string): Promise<NormalizedSource[]> {
    const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
    if (config.githubToken) headers.Authorization = `token ${config.githubToken}`;
    const perPage = config.research.maxSourcesPerProvider;
    const { data } = await safeFetch(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perPage}`,
      { method: 'GET', headers }
    );
    return (data.items || []).map((r: any, i: number): NormalizedSource => ({
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
