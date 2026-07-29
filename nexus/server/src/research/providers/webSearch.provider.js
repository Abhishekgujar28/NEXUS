import axios from 'axios';
import { config } from '../../core/config.js';
import { logger } from '../../core/logger.js';

export const searchWeb = async (query) => {
  if (!config.serperApiKey) {
    logger.warn('SERPER_API_KEY not set, skipping web search');
    return [];
  }
  try {
    const { data } = await axios.post('https://google.serper.dev/search', { q: query, num: 10 }, {
      headers: { 'X-API-KEY': config.serperApiKey, 'Content-Type': 'application/json' },
    });
    return (data.organic || []).map(r => ({
      sourceType: 'web',
      title: r.title,
      url: r.link,
      snippet: r.snippet,
      publishedAt: r.date ? new Date(r.date) : null,
      query,
      metadata: { position: r.position },
    }));
  } catch (err) {
    logger.error('Web search failed', { err: err.message });
    return [];
  }
};
