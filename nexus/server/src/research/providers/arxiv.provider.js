import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { logger } from '../../core/logger.js';

export const searchArxiv = async (query) => {
  try {
    const { data } = await axios.get('https://export.arxiv.org/api/query', {
      params: { search_query: `all:${query}`, max_results: 10, sortBy: 'relevance' },
    });
    const parsed = await parseStringPromise(data, { explicitArray: false });
    const entries = parsed?.feed?.entry;
    if (!entries) return [];
    const list = Array.isArray(entries) ? entries : [entries];
    return list.map(e => ({
      sourceType: 'paper',
      title: e.title?.replace(/\s+/g, ' ').trim(),
      url: e.id,
      snippet: e.summary?.replace(/\s+/g, ' ').trim(),
      authors: Array.isArray(e.author) ? e.author.map(a => a.name) : [e.author?.name].filter(Boolean),
      publishedAt: e.published ? new Date(e.published) : null,
      query,
      metadata: { arxivId: e.id?.split('/').pop() },
    }));
  } catch (err) {
    logger.error('arXiv search failed', { err: err.message });
    return [];
  }
};
