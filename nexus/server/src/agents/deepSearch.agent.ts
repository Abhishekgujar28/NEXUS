import { runResearchProviders } from '../research/providerRegistry.js';
import { NormalizedSource } from '../research/providers/ResearchProvider.js';
import { deduplicateSources } from '../research/deduplicator.js';
import { PlannedQuery } from './prompts/queryPlanner.prompt.js';
import { logger } from '../core/logger.js';

export interface DeepSearchInput {
  queries: PlannedQuery[];
}

export interface DeepSearchOutput {
  sources: NormalizedSource[];
  totalRetrieved: number;
  totalUnique: number;
}

export class DeepSearchAgent {
  readonly name = 'DeepSearchAgent';

  /**
   * DeepSearch Agent executes provider queries concurrently and aggregates normalized sources.
   */
  async execute(input: DeepSearchInput): Promise<DeepSearchOutput> {
    logger.info(`Executing DeepSearchAgent with ${input.queries.length} planned queries`);

    const allSources: NormalizedSource[] = [];

    // Group or run query searches concurrently in batches
    for (const item of input.queries) {
      try {
        const { sources } = await runResearchProviders(item.query);
        allSources.push(...sources);
      } catch (err) {
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
    };
  }
}
