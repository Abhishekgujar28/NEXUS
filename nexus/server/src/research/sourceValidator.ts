import { logger } from '../core/logger.js';
import type { NormalizedSource } from './providers/ResearchProvider.js';

/**
 * Coerce any provider-supplied value into a *valid* Date or null.
 *
 * Providers build dates from wildly inconsistent upstream fields — ISO strings,
 * bare years ("2021-01-01"), unix seconds, free-text ("3 days ago"). `new Date()`
 * happily returns an `Invalid Date` object for garbage, and an Invalid Date is
 * still `typeof object` and truthy, so it slips past `?? null` checks and reaches
 * Mongo, where it triggers a CastError and aborts the whole bulkWrite.
 *
 * This function is the single choke point that guarantees an invalid date can
 * never crash a persistence call: anything that isn't a real, finite Date
 * becomes null.
 */
export const toValidDate = (value: unknown): Date | null => {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
};

const asString = (value: unknown, max = 20000): string => {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  return s.length > max ? s.slice(0, max) : s;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : String(v ?? '').trim()))
    .filter((v) => v.length > 0);
};

/** Clamp a score into the [0, 1] range the schema enforces; default when NaN. */
const clampScore = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
};

/**
 * Validate and sanitize a single normalized source into a shape guaranteed to
 * satisfy the ResearchSource schema. Returns null when the source is
 * unusable (e.g. no title — the model requires one), so callers can drop it
 * rather than fail the write.
 *
 * This NEVER throws: it is the last line of defence between untrusted upstream
 * data and MongoDB.
 */
export const sanitizeNormalizedSource = (
  raw: NormalizedSource
): NormalizedSource | null => {
  try {
    const title = asString(raw?.title, 1000).replace(/\s+/g, ' ').trim();
    if (!title) {
      // The schema marks `title` required; a titleless source can't persist.
      return null;
    }

    return {
      provider: raw.provider,
      sourceType: raw.sourceType,
      title,
      url: asString(raw?.url, 2048).trim(),
      authors: asStringArray(raw?.authors),
      // The critical fix: invalid dates become null instead of Invalid Date.
      publishedAt: toValidDate(raw?.publishedAt),
      snippet: asString(raw?.snippet, 20000),
      content: raw?.content !== undefined ? asString(raw.content, 100000) : undefined,
      query: asString(raw?.query, 1000),
      metadata:
        raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : {},
      relevanceScore: clampScore(raw?.relevanceScore, 0),
      credibilityScore: clampScore(raw?.credibilityScore, 0),
    };
  } catch (err) {
    logger.warn('Dropping malformed research source during sanitization', {
      provider: (raw as any)?.provider,
      error: (err as Error).message,
    });
    return null;
  }
};

/**
 * Sanitize a batch, dropping any unusable entries. Logs a single summary line
 * when sources are dropped so silent data loss is observable.
 */
export const sanitizeSources = (sources: NormalizedSource[]): NormalizedSource[] => {
  const clean: NormalizedSource[] = [];
  let dropped = 0;
  for (const s of sources) {
    const sanitized = sanitizeNormalizedSource(s);
    if (sanitized) clean.push(sanitized);
    else dropped++;
  }
  if (dropped > 0) {
    logger.debug(`Sanitizer dropped ${dropped}/${sources.length} unusable source(s)`);
  }
  return clean;
};
