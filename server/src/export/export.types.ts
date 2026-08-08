export interface ExportMetadata {
  projectId: string;
  researchJobId: string;
  title: string;
  description: string;
  domain?: string;
  status: string;
  jobStatus: string;
  durationMs?: number;
  startedAt?: Date;
  completedAt?: Date;
  progress: number;
  isPartial: boolean;
  generatedAt: Date;
}

export interface ResearchScopeData {
  problemStatement: string;
  objective?: string;
  targetUsers?: string;
  platform?: string;
  constraints?: string;
  assumptions?: string[];
}

export interface ProviderHealthItem {
  provider: string;
  status: 'fulfilled' | 'failed' | 'skipped';
  count: number;
  latencyMs: number;
  optional?: boolean;
  error?: string;
}

export interface ResearchMethodologyData {
  queryCount: number;
  totalSourcesDiscovered: number;
  uniqueSourcesCount: number;
  providersUsedCount: number;
  durationSeconds: number;
  providerHealth: ProviderHealthItem[];
  searchCategories: string[];
}

export interface SelectedReference {
  refId: number; // 1-indexed reference number: [1], [2], ...
  sourceId: string;
  title: string;
  url?: string;
  provider: string;
  sourceType: string;
  authors?: string[];
  publishedAt?: Date;
  snippet?: string;
}

export interface KeyFindingItem {
  findingNumber: number;
  title: string;
  explanation: string;
  whyItMatters: string;
  supportingEvidence: string;
  category: string;
  confidence: number;
  sourceRefIds: number[];
}

export interface EvidenceClaimExport {
  claim: string;
  category: string;
  confidence: number;
  reasoning?: string;
  supportingSources: string[];
  contradictingSources: string[];
  sourceRefIds: number[];
}

export interface ExistingSolutionExport {
  name: string;
  category: string;
  description: string;
  url?: string;
  features: string[];
  strengths: string[];
  limitations: string[];
  pricingModel?: string;
  technologies: string[];
  sourceRefIds: number[];
}

export interface InnovationGapExport {
  title: string;
  category: string;
  description: string;
  opportunity?: string;
  impact: 'low' | 'medium' | 'high';
  difficulty: 'low' | 'medium' | 'high';
  affectedSolutions: string[];
  sourceRefIds: number[];
}

export interface StressTestItem {
  area: string;
  issue: string;
  severity: 'minor' | 'major' | 'critical';
  suggestion: string;
}

export interface StressTestExport {
  critiques: StressTestItem[];
  overallAssessment?: string;
  confidenceScore?: number;
}

export interface ComponentDesignExport {
  name: string;
  description: string;
  technology: string;
  responsibilities: string[];
}

export interface TechRecommendationExport {
  category: string;
  name: string;
  rationale: string;
  alternatives: string[];
}

export interface ArchitectureExport {
  overview: string;
  components: ComponentDesignExport[];
  dataFlow?: string;
  deploymentModel?: string;
  scalabilityNotes?: string;
  recommendations: TechRecommendationExport[];
  mermaidSource?: string;
  svgDataUri?: string;
  pngBuffer?: Buffer;
}

export interface RoadmapPhaseExport {
  phase: number;
  title: string;
  duration: string;
  milestones: string[];
  deliverables: string[];
  dependencies: string[];
}

export interface RoadmapRiskExport {
  risk: string;
  mitigation: string;
  probability: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

export interface RoadmapExport {
  totalDuration?: string;
  criticalPath: string[];
  phases: RoadmapPhaseExport[];
  risks: RoadmapRiskExport[];
}

export interface RawSourceItem {
  id: string;
  provider: string;
  sourceType: string;
  title: string;
  url?: string;
  authors?: string[];
  publishedAt?: Date;
  snippet?: string;
  content?: string;
  query?: string;
  relevanceScore?: number;
  credibilityScore?: number;
  retrievedAt: Date;
}

export interface ResearchExportData {
  metadata: ExportMetadata;
  scope: ResearchScopeData;
  methodology: ResearchMethodologyData;
  queries: string[];
  keyFindings: KeyFindingItem[];
  claims: EvidenceClaimExport[];
  solutions: ExistingSolutionExport[];
  gaps: InnovationGapExport[];
  stressTests?: StressTestExport;
  architecture?: ArchitectureExport;
  roadmap?: RoadmapExport;
  selectedReferences: SelectedReference[];
  allSources: RawSourceItem[];
}
