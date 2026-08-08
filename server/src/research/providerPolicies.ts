import { config } from '../core/config.js';
import type { ProviderName } from './providers/ResearchProvider.js';

/**
 * Per-provider resilience policy.
 *
 * Every provider is time-boxed and retried independently so that one slow or
 * flaky upstream can never delay or fail the whole research job. Policies are
 * intentionally explicit per provider rather than one global knob, because the
 * failure modes differ wildly:
 *
 *  - arXiv is prone to slow responses / hangs → short timeout, few retries so a
 *    timeout fails fast instead of stalling the pipeline.
 *  - Semantic Scholar aggressively rate-limits (HTTP 429) → longer backoff, more
 *    attempts, honours Retry-After, and a per-provider request spacing gate.
 *  - IEEE is a paid/subscription API that commonly returns 403 → treated as an
 *    optional provider whose failure is isolated and never blocks the job.
 */
export interface ProviderPolicy {
  /** Hard wall-clock budget for a single attempt. */
  timeoutMs: number;
  /** Total attempts (1 = no retry). */
  maxAttempts: number;
  /** Base delay for exponential backoff between attempts. */
  baseDelayMs: number;
  /** Upper bound on any single backoff delay. */
  maxDelayMs: number;
  /** Honour an upstream `Retry-After` header on 429/503 responses. */
  respectRetryAfter: boolean;
  /**
   * Minimum spacing between successive requests to this provider. 0 disables
   * spacing. Used to stay under strict public rate limits (e.g. Semantic
   * Scholar's ~1 req/sec unauthenticated ceiling).
   */
  minIntervalMs: number;
  /**
   * Optional providers are "nice to have": their failure is isolated, logged,
   * and surfaced in the health summary, but never counts against the job. A
   * research job succeeds as long as at least one provider (optional or not)
   * returns results.
   */
  optional: boolean;
}

const DEFAULT_POLICY: ProviderPolicy = {
  timeoutMs: config.research.providerTimeoutMs,
  maxAttempts: config.research.jobAttempts,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  respectRetryAfter: true,
  minIntervalMs: 0,
  optional: true,
};

/**
 * Explicit per-provider overrides. Anything omitted falls back to
 * DEFAULT_POLICY. Providers not listed here still get sane defaults.
 */
const PROVIDER_POLICY_OVERRIDES: Partial<Record<ProviderName, Partial<ProviderPolicy>>> = {
  // Web search — needs a key; when present it is fast and reliable.
  serper: { timeoutMs: 10000, maxAttempts: 3, baseDelayMs: 500, optional: false },

  // GitHub — usually fast; token only raises rate limits.
  github: { timeoutMs: 10000, maxAttempts: 3, baseDelayMs: 600 },

  // arXiv — historically slow and prone to hangs. Fail FAST so a stuck arXiv
  // request never delays the rest of the pipeline.
  arxiv: { timeoutMs: 7000, maxAttempts: 2, baseDelayMs: 400, maxDelayMs: 2000 },

  // Semantic Scholar — heavy 429 rate limiting. Bounded retries so query loops finish quickly.
  semanticScholar: {
    timeoutMs: 10000,
    maxAttempts: 2,
    baseDelayMs: 1000,
    maxDelayMs: 4000,
    respectRetryAfter: true,
    minIntervalMs: 1100,
  },

  stackoverflow: { timeoutMs: 6000, maxAttempts: 2, baseDelayMs: 400 },
  npm: { timeoutMs: 6000, maxAttempts: 2, baseDelayMs: 400 },

  // IEEE Xplore — paid API; 403 (access/subscription/inactive) is permanent and must be
  // isolated. Single attempt, never retry 403.
  ieee: { timeoutMs: 8000, maxAttempts: 1, baseDelayMs: 400, optional: true },
};

/** Resolve the effective policy for a provider (override merged over defaults). */
export const getProviderPolicy = (provider: ProviderName): ProviderPolicy => ({
  ...DEFAULT_POLICY,
  ...(PROVIDER_POLICY_OVERRIDES[provider] ?? {}),
});

/**
 * Minimal per-provider request-spacing gate. Serializes only the *timing* of
 * requests (not the requests themselves): each `acquire()` resolves no sooner
 * than `minIntervalMs` after the previously scheduled one. This is the
 * provider-specific rate-limiting layer that keeps us under strict public
 * ceilings without a heavyweight token-bucket dependency.
 */
class IntervalGate {
  private nextAvailable = 0;
  constructor(private readonly minIntervalMs: number) {}

  async acquire(): Promise<void> {
    if (this.minIntervalMs <= 0) return;
    const now = Date.now();
    const scheduledAt = Math.max(now, this.nextAvailable);
    this.nextAvailable = scheduledAt + this.minIntervalMs;
    const wait = scheduledAt - now;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
}

const gates = new Map<ProviderName, IntervalGate>();

/** Lazily create and reuse the rate-limit gate for a provider. */
export const acquireRateLimit = async (provider: ProviderName): Promise<void> => {
  let gate = gates.get(provider);
  if (!gate) {
    gate = new IntervalGate(getProviderPolicy(provider).minIntervalMs);
    gates.set(provider, gate);
  }
  await gate.acquire();
};
