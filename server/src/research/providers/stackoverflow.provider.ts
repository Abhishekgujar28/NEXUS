import { ResearchProvider, NormalizedSource, ProviderName } from './ResearchProvider.js';
import { safeFetch } from '../../utils/safeFetch.js';
import { logger } from '../../core/logger.js';

export class StackOverflowProvider implements ResearchProvider {
  readonly name: ProviderName = 'stackoverflow';

  isConfigured(): boolean {
    return true; // Public Stack Exchange API
  }

  async search(query: string): Promise<NormalizedSource[]> {
    try {
      const url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=5`;
      const response = await safeFetch(url, { timeout: 5000 });
      if (response.status !== 200) return [];

      const data = response.data as any;
      if (!data || !data.items) return [];

      return data.items.map((item: any) => ({
        provider: this.name,
        sourceType: 'discussion',
        title: item.title,
        url: item.link,
        authors: [item.owner?.display_name || 'StackOverflow User'],
        publishedAt: item.creation_date ? new Date(item.creation_date * 1000) : null,
        snippet: `Score: ${item.score} | Answers: ${item.answer_count} | Views: ${item.view_count}`,
        query,
        metadata: { tags: item.tags, isAnswered: item.is_answered },
        relevanceScore: item.is_answered ? 0.85 : 0.7,
        credibilityScore: Math.min(0.9, 0.5 + item.score * 0.02),
      }));
    } catch (err) {
      logger.warn('StackOverflowProvider search failed', { error: (err as Error).message });
      return [];
    }
  }
}
