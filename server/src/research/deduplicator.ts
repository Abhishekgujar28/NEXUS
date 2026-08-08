import type { NormalizedSource } from './providers/ResearchProvider.js';

/**
 * Extract canonical identity key for deduplication.
 * Handles DOI, arXiv, GitHub repos, URL canonicalization, and normalized title fallback.
 */
const getCanonicalKey = (source: NormalizedSource): string => {
  const metadata = source.metadata ?? {};

  // 1. Check for DOI in metadata or URL
  if (typeof metadata.doi === 'string' && metadata.doi.trim()) {
    return `doi:${metadata.doi.trim().toLowerCase()}`;
  }
  const doiMatch = source.url?.match(/doi\.org\/(10\.\d{4,9}\/[-._;()/:A-Z0-9]+)/i);
  if (doiMatch?.[1]) {
    return `doi:${doiMatch[1].toLowerCase()}`;
  }

  // 2. Check for arXiv ID
  if (typeof metadata.paperId === 'string' && metadata.paperId.startsWith('arXiv:')) {
    return `arxiv:${metadata.paperId.replace(/^arXiv:/i, '').toLowerCase()}`;
  }
  const arxivMatch = source.url?.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5}|[a-z\-]+(?:\.[A-Z]{2})?\/\d{7})/i);
  if (arxivMatch?.[1]) {
    return `arxiv:${arxivMatch[1].toLowerCase()}`;
  }

  // 3. Check for GitHub repository (owner/repo)
  const ghMatch = source.url?.match(/github\.com\/([^\/]+\/[^\/#?]+)/i);
  if (ghMatch?.[1]) {
    const repo = ghMatch[1].replace(/\.git$/i, '').toLowerCase();
    return `github:${repo}`;
  }

  // 4. Normalized URL (strip protocol, www, query params, trailing slashes)
  if (source.url?.trim()) {
    try {
      const u = new URL(source.url.trim());
      const cleanHost = u.hostname.replace(/^www\./i, '').toLowerCase();
      const cleanPath = u.pathname.replace(/\/$/, '').toLowerCase();
      return `url:${cleanHost}${cleanPath}`;
    } catch {
      const raw = source.url
        .toLowerCase()
        .replace(/^https?:\/\//i, '')
        .replace(/^www\./i, '')
        .replace(/[?#].*$/, '')
        .replace(/\/$/, '');
      if (raw) return `url:${raw}`;
    }
  }

  // 5. Title normalization fallback (strip non-alphanumeric, lowercase)
  const cleanTitle = source.title
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();

  return cleanTitle ? `title:${cleanTitle}` : '';
};

/**
 * Remove duplicate sources across providers using multi-attribute canonical keying.
 */
export const deduplicateSources = (sources: NormalizedSource[]): NormalizedSource[] => {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const key = getCanonicalKey(s);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
