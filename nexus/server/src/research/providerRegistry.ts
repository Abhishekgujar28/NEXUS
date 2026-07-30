import { config } from '../core/config.js';
import { logger } from '../core/logger.js';
import { retry } from '../utils/retry.js';
import { deduplicateSources } from './deduplicator.js';
import { ArxivProvider } from './providers/arxiv.provider.js';
import { GitHubProvider } from './providers/github.provider.js';
import { SemanticScholarProvider } from './providers/semanticScholar.provider.js';
import { SerperProvider } from './providers/serper.provider.js';
import type {
  NormalizedSource,
  ProviderName,
  ResearchProvider,
} from './providers/ResearchProvider.js';

/**
 * Per-provider outcome, surfaced so callers can report which providers ran,
 * which were skipped (not configured), and which failed — without any single
 * provider ever failing the overall research job.
 */
export interface ProviderOutcome {
  provider: ProviderName;
  status: 'fulfilled' | 'failed' | 'skipped';
  count: number;
  error?: string;
}

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
 * Run a single provider with retry + timeout applied to each attempt. Any
 * failure is caught and converted into a "failed" outcome with zero sources —
 * this is the failure-isolation boundary, so this function never rejects.
 */
const runProvider = async (provider: ResearchProvider, query: string): Promise<ProviderOutcome & { sources: NormalizedSource[] }> => {
  if (!provider.isConfigured()) {
    logger.debug(`Provider "${provider.name}" not configured — skipping`);
    return { provider: provider.name, status: 'skipped', count: 0, sources: [] };
  }

  try {
    const sources = await retry(
      () =>
        withTimeout(
          () => provider.search(query),
          config.research.providerTimeoutMs,
          provider.name
        ),
      config.research.jobAttempts
    );
    return {
      provider: provider.name,
      status: 'fulfilled',
      count: sources.length,
      sources,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Provider "${provider.name}" failed after retries: ${message}`);
    return { provider: provider.name, status: 'failed', count: 0, error: message, sources: [] };
  }
};

/**
 * The Provider Registry: the single orchestration entry point for research.
 *
 * - Auto-detects which providers are configured (via isConfigured()).
 * - Executes every eligible provider concurrently.
 * - Retries and time-boxes each provider independently.
 * - Isolates failures so one provider can never fail the whole job.
 * - Merges, deduplicates and returns a clean, normalized source array.
 */
export const runResearchProviders = async (query: string): Promise<RegistrySearchResult> => {
  const trimmed = query.trim();
  if (!trimmed) return { sources: [], outcomes: [] };

  // Promise.allSettled is belt-and-braces: runProvider already never rejects,
  // but this guarantees isolation even if that contract is ever broken.
  const settled = await Promise.allSettled(
    ALL_PROVIDERS.map((p) => runProvider(p, trimmed))
  );

  const outcomes: ProviderOutcome[] = [];
  const merged: NormalizedSource[] = [];

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
      `(${outcomes.map((o) => `${o.provider}:${o.status}:${o.count}`).join(', ')})`
  );

  return { sources, outcomes };
};

/**
 * Snapshot of which providers are currently eligible to run. Useful for
 * diagnostics and for the preview endpoint response.
 */
export const listProviderConfiguration = (): { provider: ProviderName; configured: boolean }[] =>
  ALL_PROVIDERS.map((p) => ({ provider: p.name, configured: p.isConfigured() }));
