import { logger } from '../core/logger.js';
import { retry } from '../utils/retry.js';
import { deduplicateSources } from './deduplicator.js';
import { getProviderPolicy, acquireRateLimit } from './providerPolicies.js';
import { sanitizeSources } from './sourceValidator.js';
import { ArxivProvider } from './providers/arxiv.provider.js';
import { GitHubProvider } from './providers/github.provider.js';
import { SemanticScholarProvider } from './providers/semanticScholar.provider.js';
import { SerperProvider } from './providers/serper.provider.js';
import { StackOverflowProvider } from './providers/stackoverflow.provider.js';
import { NpmProvider } from './providers/npm.provider.js';
import { IeeeProvider } from './providers/ieee.provider.js';
import type {
  NormalizedSource,
  ProviderName,
  ResearchProvider,
} from './providers/ResearchProvider.js';

/**
 * Per-provider outcome, surfaced so callers can report which providers ran,
 * which were skipped (not configured), and which failed — without any single
 * provider ever failing the overall research job.
 *
 * `optional` records whether the provider's failure is allowed to count against
 * the job. `latencyMs` is the wall-clock time the provider took (including all
 * retries), so the orchestrator can build a health summary.
 */
export interface ProviderOutcome {
  provider: ProviderName;
  status: 'fulfilled' | 'failed' | 'skipped';
  count: number;
  latencyMs: number;
  optional: boolean;
  error?: string;
}

/** A provider's outcome bundled with the sources it produced. */
export type ProviderResult = ProviderOutcome & { sources: NormalizedSource[] };

/**
 * Fired the moment a provider finishes (success, failure, or skip), before the
 * rest of the providers complete. This is the streaming hook: the orchestrator
 * uses it to persist + emit sources incrementally instead of waiting for the
 * slowest provider.
 */
export type ProviderCompleteCallback = (result: ProviderResult) => void | Promise<void>;

export interface RegistrySearchResult {
  sources: NormalizedSource[];
  outcomes: ProviderOutcome[];
}

/**
 * All providers known to the system. Instantiated once and reused. Order is
 * cosmetic — providers run concurrently.
 */
const ALL_PROVIDERS: readonly ResearchProvider[] = [
  new SerperProvider(),
  new GitHubProvider(),
  new ArxivProvider(),
  new SemanticScholarProvider(),
  new StackOverflowProvider(),
  new NpmProvider(),
  new IeeeProvider(),
];

/**
 * Reject a provider call that exceeds the configured budget. The losing promise
 * is abandoned (the provider result is simply ignored) so one slow provider can
 * never stall the whole job.
 */
const withTimeout = async <T>(
  fn: () => Promise<T>,
  ms: number,
  label: string
): Promise<T> => {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Provider "${label}" timed out after ${ms}ms`)),
      ms
    );
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    clearTimeout(timer!);
  }
};

/**
 * Run a single provider with its own timeout + retry + rate-limit policy. Any
 * failure is caught and converted into a "failed" outcome with zero sources —
 * this is the failure-isolation boundary, so this function never rejects.
 *
 * Every attempt is time-boxed and rate-limited independently using the
 * provider's resolved {@link ProviderPolicy}, so arXiv can fail fast while
 * Semantic Scholar backs off gently and stays under its rate ceiling.
 */
const runProvider = async (
  provider: ResearchProvider,
  query: string,
  disabledProviders?: Set<ProviderName>
): Promise<ProviderResult> => {
  const policy = getProviderPolicy(provider.name);
  const start = Date.now();

  if (disabledProviders?.has(provider.name)) {
    logger.debug(`Provider "${provider.name}" disabled by circuit breaker — skipping`);
    return {
      provider: provider.name,
      status: 'skipped',
      count: 0,
      latencyMs: 0,
      optional: policy.optional,
      error: 'Circuit breaker: provider disabled for this run',
      sources: [],
    };
  }

  if (!provider.isConfigured()) {
    logger.debug(`Provider "${provider.name}" not configured — skipping`);
    return {
      provider: provider.name,
      status: 'skipped',
      count: 0,
      latencyMs: 0,
      optional: policy.optional,
      sources: [],
    };
  }

  try {
    const raw = await retry(
      () =>
        withTimeout(
          async () => {
            // Provider-specific request spacing (e.g. Semantic Scholar ~1/sec).
            await acquireRateLimit(provider.name);
            return provider.search(query);
          },
          policy.timeoutMs,
          provider.name
        ),
      {
        maxAttempts: policy.maxAttempts,
        baseDelayMs: policy.baseDelayMs,
        maxDelayMs: policy.maxDelayMs,
        respectRetryAfter: policy.respectRetryAfter,
        onRetry: ({ attempt, delayMs, status }) =>
          logger.debug(
            `Provider "${provider.name}" retry ${attempt}/${policy.maxAttempts} ` +
              `in ${Math.round(delayMs)}ms (status=${status ?? 'n/a'})`
          ),
      }
    );

    // Sanitize at the boundary so invalid dates / malformed fields can never
    // reach persistence and crash a bulkWrite.
    const sources = sanitizeSources(raw);
    return {
      provider: provider.name,
      status: 'fulfilled',
      count: sources.length,
      latencyMs: Date.now() - start,
      optional: policy.optional,
      sources,
    };
  } catch (err) {
    const status = (err as any)?.response?.status ?? (err as any)?.status;
    if (disabledProviders && (status === 403 || status === 401 || status === 429)) {
      disabledProviders.add(provider.name);
      logger.warn(
        `Immediate circuit breaker TRIPPED for "${provider.name}" (status=${status ?? 'ERR'}) — disabling for remaining queries in run`
      );
    }

    const message = err instanceof Error ? err.message : String(err);
    // Optional providers (IEEE 403, etc.) fail quietly and never block the job;
    // required providers log at error level.
    const detail =
      `Provider "${provider.name}" failed after retries` +
      `${policy.optional ? ' (optional — isolated)' : ''}: ${message}`;
    if (policy.optional) logger.warn(detail);
    else logger.error(detail);
    return {
      provider: provider.name,
      status: 'failed',
      count: 0,
      latencyMs: Date.now() - start,
      optional: policy.optional,
      error: message,
      sources: [],
    };
  }
};

/**
 * The Provider Registry: the single orchestration entry point for research.
 *
 * - Auto-detects which providers are configured (via isConfigured()).
 * - Executes every eligible provider concurrently.
 * - Retries, time-boxes and rate-limits each provider independently per policy.
 * - Isolates failures so one provider can never fail the whole job.
 * - Sanitizes every source before it leaves the registry.
 * - Optionally streams each provider's result as it completes via `onComplete`.
 * - Merges, deduplicates and returns a clean, normalized source array.
 */
export const runResearchProviders = async (
  query: string,
  onComplete?: ProviderCompleteCallback,
  disabledProviders?: Set<ProviderName>
): Promise<RegistrySearchResult> => {
  const trimmed = query.trim();
  if (!trimmed) return { sources: [], outcomes: [] };

  const outcomes: ProviderOutcome[] = [];
  const merged: NormalizedSource[] = [];

  // Each provider resolves independently; fire the streaming callback the
  // instant it finishes rather than awaiting the slowest one.
  const settled = await Promise.allSettled(
    ALL_PROVIDERS.map(async (p) => {
      const result = await runProvider(p, trimmed, disabledProviders);
      if (onComplete) {
        try {
          await onComplete(result);
        } catch (cbErr) {
          logger.error(
            `onProviderComplete callback threw for "${result.provider}": ` +
              `${(cbErr as Error).message}`
          );
        }
      }
      return result;
    })
  );

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      const { sources, ...outcome } = result.value;
      outcomes.push(outcome);
      merged.push(...sources);
    } else {
      // Should be unreachable given runProvider's contract, but stay safe.
      logger.error(`Unexpected provider rejection: ${String(result.reason)}`);
    }
  }

  const sources = deduplicateSources(merged);
  logger.debug(
    `Research providers finished: ${merged.length} raw → ${sources.length} deduped ` +
      `(${outcomes.map((o) => `${o.provider}:${o.status}:${o.count}:${o.latencyMs}ms`).join(', ')})`
  );

  return { sources, outcomes };
};

/**
 * Whether a set of provider outcomes represents a successful search: the job
 * succeeds as long as at least one provider returned sources. A run where every
 * provider was skipped (nothing configured) or failed is a genuine failure.
 */
export const isSearchSuccessful = (outcomes: ProviderOutcome[]): boolean =>
  outcomes.some((o) => o.status === 'fulfilled' && o.count > 0);

/**
 * Snapshot of which providers are currently eligible to run. Useful for
 * diagnostics and for the preview endpoint response.
 */
export const listProviderConfiguration = (): { provider: ProviderName; configured: boolean }[] =>
  ALL_PROVIDERS.map((p) => ({ provider: p.name, configured: p.isConfigured() }));
