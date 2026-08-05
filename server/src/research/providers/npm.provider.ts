import { ResearchProvider, NormalizedSource, ProviderName } from './ResearchProvider.js';
import { safeFetch } from '../../utils/safeFetch.js';
import { logger } from '../../core/logger.js';

export class NpmProvider implements ResearchProvider {
  readonly name: ProviderName = 'npm';

  isConfigured(): boolean {
    return true; // Public NPM registry API
  }

  async search(query: string): Promise<NormalizedSource[]> {
    try {
      const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=5`;
      const response = await safeFetch(url, { timeout: 5000 });
      if (response.status !== 200) return [];

      const data = response.data as any;
      if (!data || !data.objects) return [];

      return data.objects.map((obj: any) => {
        const pkg = obj.package;
        return {
          provider: this.name,
          sourceType: 'package',
          title: `NPM Package: ${pkg.name}`,
          url: pkg.links?.npm || `https://www.npmjs.com/package/${pkg.name}`,
          authors: pkg.publisher?.username ? [pkg.publisher.username] : [],
          publishedAt: pkg.date ? new Date(pkg.date) : null,
          snippet: pkg.description || `NPM package ${pkg.name} v${pkg.version}`,
          query,
          metadata: { version: pkg.version, keywords: pkg.keywords },
          relevanceScore: obj.score?.final ?? 0.8,
          credibilityScore: 0.9,
        };
      });
    } catch (err) {
      logger.warn('NpmProvider search failed', { error: (err as Error).message });
      return [];
    }
  }
}
