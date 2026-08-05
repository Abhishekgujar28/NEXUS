/**
 * Options for {@link retry}. When omitted, values fall back to the defaults
 * below, which preserve the original `retry(fn, maxAttempts, baseDelay)`
 * behaviour for existing callers.
 */
export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  /** Cap on any single backoff delay (defends against huge Retry-After values). */
  maxDelayMs?: number;
  /** Honour a `Retry-After` header (seconds or HTTP-date) on 429/503 responses. */
  respectRetryAfter?: boolean;
  /**
   * Decide whether an error is worth retrying. Defaults to: retry network
   * errors, timeouts, 429 and 5xx; never retry 400/401/403/404/422.
   */
  isRetryable?: (err: any) => boolean;
  /** Observability hook fired before each backoff sleep. */
  onRetry?: (info: { attempt: number; delayMs: number; status?: number; error: unknown }) => void;
}

const statusOf = (err: any): number | undefined =>
  err?.response?.status ?? err?.status ?? err?.statusCode;

/** Default retry predicate: transient failures only. */
const defaultIsRetryable = (err: any): boolean => {
  const status = statusOf(err);
  // No HTTP status → network error / timeout / DNS: transient, retry.
  if (status === undefined) return true;
  if (status === 429) return true; // rate limited
  if (status >= 500 && status <= 599) return true; // upstream server error
  // 400/401/403/404/422 and other 4xx are client/config errors: never retry.
  return false;
};

/**
 * Parse a `Retry-After` header into milliseconds. Supports both the
 * delta-seconds form ("120") and the HTTP-date form. Returns undefined if
 * absent or unparseable.
 */
const parseRetryAfter = (err: any): number | undefined => {
  const header =
    err?.response?.headers?.['retry-after'] ??
    err?.response?.headers?.['Retry-After'];
  if (header === undefined || header === null) return undefined;
  const asNumber = Number(header);
  if (Number.isFinite(asNumber)) return Math.max(0, asNumber * 1000);
  const asDate = Date.parse(String(header));
  if (!Number.isNaN(asDate)) return Math.max(0, asDate - Date.now());
  return undefined;
};

/**
 * Retry an async function with exponential backoff and jitter.
 *
 * Backwards compatible: `retry(fn)`, `retry(fn, maxAttempts)` and
 * `retry(fn, maxAttempts, baseDelay)` all still work. Pass a {@link RetryOptions}
 * object for provider-specific policies (Retry-After, custom retryable
 * predicate, delay caps, etc.).
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  optionsOrMaxAttempts: RetryOptions | number = {},
  baseDelayArg = 500
): Promise<T> => {
  const opts: RetryOptions =
    typeof optionsOrMaxAttempts === 'number'
      ? { maxAttempts: optionsOrMaxAttempts, baseDelayMs: baseDelayArg }
      : optionsOrMaxAttempts;

  const maxAttempts = opts.maxAttempts ?? 3;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 30000;
  const respectRetryAfter = opts.respectRetryAfter ?? true;
  const isRetryable = opts.isRetryable ?? defaultIsRetryable;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastErr = err;
      const status = statusOf(err);

      // Non-retryable (client/config error) or out of attempts → give up now.
      if (!isRetryable(err) || attempt >= maxAttempts) {
        throw err;
      }

      // Exponential backoff with full jitter, capped at maxDelayMs.
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jittered = Math.random() * backoff;

      // A 429/503 with Retry-After overrides the computed backoff (still capped).
      let delayMs = jittered;
      if (respectRetryAfter && (status === 429 || status === 503)) {
        const retryAfter = parseRetryAfter(err);
        if (retryAfter !== undefined) delayMs = Math.min(maxDelayMs, retryAfter);
      }

      opts.onRetry?.({ attempt, delayMs, status, error: err });
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw lastErr;
};
