const normalize = (url) => url?.toLowerCase().replace(/\/$/, '').replace(/^https?:\/\//, '') || '';

export const deduplicateSources = (sources) => {
  const seen = new Set();
  return sources.filter(s => {
    const key = normalize(s.url) || s.title?.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};
