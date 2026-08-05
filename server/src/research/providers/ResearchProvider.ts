export type SourceType = 'paper' | 'article' | 'repo' | 'dataset' | 'api' | 'web' | 'patent' | 'talk' | 'package' | 'rfc' | 'advisory' | 'discussion';
export type ProviderName =
  | 'serper'
  | 'github'
  | 'arxiv'
  | 'semanticScholar'
  | 'stackoverflow'
  | 'reddit'
  | 'devto'
  | 'medium'
  | 'hackerNews'
  | 'googlePatents'
  | 'youtubeTalks'
  | 'docsScraper'
  | 'npm'
  | 'pypi'
  | 'dockerHub'
  | 'awesomeLists'
  | 'datasets'
  | 'securityAdvisories'
  | 'rfcs'
  | 'ieee'
  | 'openAlex';

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
