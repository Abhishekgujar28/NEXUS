import axios from 'axios';
import { config } from '../../core/config.js';
import { logger } from '../../core/logger.js';

export const searchGitHub = async (query) => {
  try {
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (config.githubToken) headers.Authorization = `token ${config.githubToken}`;
    const { data } = await axios.get('https://api.github.com/search/repositories', {
      params: { q: query, sort: 'stars', order: 'desc', per_page: 10 },
      headers,
    });
    return (data.items || []).map(r => ({
      sourceType: 'repo',
      title: r.full_name,
      url: r.html_url,
      snippet: r.description,
      authors: [r.owner?.login].filter(Boolean),
      publishedAt: r.created_at ? new Date(r.created_at) : null,
      query,
      metadata: { stars: r.stargazers_count, language: r.language, forks: r.forks_count },
    }));
  } catch (err) {
    logger.error('GitHub search failed', { err: err.message });
    return [];
  }
};
