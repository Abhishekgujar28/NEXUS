import axios from 'axios';
import { config } from '../../core/config.js';
import { logger } from '../../core/logger.js';

export const searchSemanticScholar = async (query) => {
  try {
    const headers = {};
    if (config.semanticScholarApiKey) headers['x-api-key'] = config.semanticScholarApiKey;
    const { data } = await axios.get('https://api.semanticscholar.org/graph/v1/paper/search', {
      params: { query, limit: 10, fields: 'title,authors,year,abstract,url,citationCount,externalIds' },
      headers,
    });
    return (data.data || []).map(p => ({
      sourceType: 'paper',
      title: p.title,
      url: p.url || `https://www.semanticscholar.org/paper/${p.paperId}`,
      snippet: p.abstract,
      authors: (p.authors || []).map(a => a.name),
      publishedAt: p.year ? new Date(`${p.year}-01-01`) : null,
      query,
      metadata: { citationCount: p.citationCount, paperId: p.paperId },
    }));
  } catch (err) {
    logger.error('Semantic Scholar search failed', { err: err.message });
    return [];
  }
};
