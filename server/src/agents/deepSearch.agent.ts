import {
  runResearchProviders,
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
   * DeepSearch Agent executes provider queries and aggregates normalized sources.
   * Provider outcomes are merged across every query so a provider that fails on
   * one query but succeeds on another is reported as fulfilled overall.
   */
  async execute(input: DeepSearchInput): Promise<DeepSearchOutput> {
    logger.info(`Executing DeepSearchAgent with ${input.queries.length} planned queries`);

    const allSources: NormalizedSource[] = [];
    const aggregated = new Map<ProviderName, ProviderOutcome>();

    const merge = (outcome: ProviderOutcome): void => {
      const prev = aggregated.get(outcome.provider);
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

    for (const item of input.queries) {
      try {
        const { sources, outcomes } = await runResearchProviders(
          item.query,
          input.onProviderComplete
        );
        allSources.push(...sources);
        outcomes.forEach(merge);
      } catch (err) {
        // runResearchProviders is designed never to reject, but stay defensive.
        logger.warn(`DeepSearch failed for query: "${item.query}"`, {
          error: (err as Error).message,
        });
      }
    }

    const uniqueSources = deduplicateSources(allSources);

    logger.info(
      `DeepSearchAgent completed: ${allSources.length} total, ${uniqueSources.length} unique sources`
    );

    return {
      sources: uniqueSources,
      totalRetrieved: allSources.length,
      totalUnique: uniqueSources.length,
      providerHealth: [...aggregated.values()],
    };
  }
}
