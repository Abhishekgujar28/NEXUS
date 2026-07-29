export type SourceType = 'paper' | 'article' | 'repo' | 'dataset' | 'api' | 'web';
export type ProviderName = 'serper' | 'github' | 'arxiv' | 'semanticScholar';

export interface NormalizedSource {
  provider: ProviderName;
  sourceType: SourceType;
  title: string;
  url: string;
  authors: string[];
  publishedAt: Date | null;
  snippet: string;
  content?: string;
  query: string;
  metadata: Record<string, unknown>;
  relevanceScore: number;
  credibilityScore: number;
}

/**
 * ResearchProvider interface — every source adapter implements this so
 * providers can be added, removed, or swapped without touching pipeline logic.
 */
export interface ResearchProvider {
  readonly name: ProviderName;
  isConfigured(): boolean;
  search(query: string): Promise<NormalizedSource[]>;
}
