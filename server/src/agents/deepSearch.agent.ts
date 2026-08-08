import {
  runResearchProviders,
  listProviderConfiguration,
  type ProviderResult,
  type ProviderOutcome,
} from '../research/providerRegistry.js';
import { NormalizedSource, ProviderName } from '../research/providers/ResearchProvider.js';
import { deduplicateSources } from '../research/deduplicator.js';
import { PlannedQuery } from './prompts/queryPlanner.prompt.js';
import { logger } from '../core/logger.js';

export interface DeepSearchInput {
  queries: PlannedQuery[];
  /**
   * Streaming hook fired each time a provider finishes for any query. Lets the
   * orchestrator persist + emit sources incrementally rather than waiting for
   * the entire search stage. Errors thrown here are swallowed by the registry.
   */
  onProviderComplete?: (result: ProviderResult) => void | Promise<void>;
}

export interface DeepSearchOutput {
  sources: NormalizedSource[];
  totalRetrieved: number;
  totalUnique: number;
  /**
   * One aggregated outcome per provider across all queries — the raw material
   * for the job's provider health summary.
   */
  providerHealth: ProviderOutcome[];
}

export class DeepSearchAgent {
  readonly name = 'DeepSearchAgent';

  /**
   * DeepSearch Agent executes provider queries with bounded concurrency and
   * circuit breaker fault-tolerance.
   */
  async execute(input: DeepSearchInput): Promise<DeepSearchOutput> {
    logger.info(`Executing DeepSearchAgent with ${input.queries.length} planned queries`);

    const preflight = listProviderConfiguration();
    logger.info('[ProviderConfig] Pre-flight Availability:');
    for (const item of preflight) {
      logger.info(
        `  ${item.provider}: ${item.configured ? 'ENABLED' : 'SKIPPED — API key not configured'}`
      );
    }

    const allSources: NormalizedSource[] = [];
    const aggregated = new Map<ProviderName, ProviderOutcome>();
    const disabledProviders = new Set<ProviderName>();
    const consecutiveFailures = new Map<ProviderName, number>();

    const merge = (outcome: ProviderOutcome): void => {
      const prev = aggregated.get(outcome.provider);

      // Track consecutive failures for circuit breaker
      if (outcome.status === 'failed') {
        const fails = (consecutiveFailures.get(outcome.provider) ?? 0) + 1;
        consecutiveFailures.set(outcome.provider, fails);
        if (fails >= 2 && !disabledProviders.has(outcome.provider)) {
          disabledProviders.add(outcome.provider);
          logger.warn(
            `Circuit breaker TRIPPED for provider "${outcome.provider}" after ${fails} consecutive failures — disabling for remaining queries in this run`
          );
        }
      } else if (outcome.status === 'fulfilled') {
        consecutiveFailures.set(outcome.provider, 0);
      }

      if (!prev) {
        aggregated.set(outcome.provider, { ...outcome });
        return;
      }

      // Success on any query wins; latency accumulates; errors kept until a success.
      const status =
        prev.status === 'fulfilled' || outcome.status === 'fulfilled'
          ? 'fulfilled'
          : outcome.status === 'failed' || prev.status === 'failed'
            ? 'failed'
            : 'skipped';

      aggregated.set(outcome.provider, {
        provider: outcome.provider,
        optional: outcome.optional,
        status,
        count: prev.count + outcome.count,
        latencyMs: prev.latencyMs + outcome.latencyMs,
        error: status === 'fulfilled' ? undefined : outcome.error ?? prev.error,
      });
    };

    // Process queries in batches of CONCURRENCY (3 at a time) to stay bounded
    const CONCURRENCY = 3;
    for (let i = 0; i < input.queries.length; i += CONCURRENCY) {
      const batch = input.queries.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.allSettled(
        batch.map((item) =>
          runResearchProviders(item.query, input.onProviderComplete, disabledProviders)
        )
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          allSources.push(...result.value.sources);
          result.value.outcomes.forEach(merge);
        } else {
          logger.warn('Query batch execution error', { error: String(result.reason) });
        }
      }
    }

    const uniqueSources = deduplicateSources(allSources);

    logger.info(
      `DeepSearchAgent completed: ${allSources.length} total, ${uniqueSources.length} unique sources (${disabledProviders.size} providers circuit-broken)`
    );

    return {
      sources: uniqueSources,
      totalRetrieved: allSources.length,
      totalUnique: uniqueSources.length,
      providerHealth: [...aggregated.values()],
    };
  }
}
