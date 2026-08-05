import type { NormalizedSource } from './providers/ResearchProvider.js';

/**
 * Normalize a URL into a comparison key: lowercased, trailing slash and
 * scheme removed so http/https and slash variants collapse to one entry.
 */
const normalize = (url: string | undefined): string =>
  url?.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\//, '') || '';

/**
 * Remove duplicate sources across providers. Keys on normalized URL, falling
 * back to a lowercased title when a source has no URL. Sources with neither a
 * URL nor a title are dropped.
 */
export const deduplicateSources = (sources: NormalizedSource[]): NormalizedSource[] => {
  const seen = new Set<string>();
  return sources.filter((s) => {
    const key = normalize(s.url) || s.title?.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
