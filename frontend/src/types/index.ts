/**
 * Domain types for NEXUS. Mirrors backend Mongoose models but shaped
 * for consumption by React components — MongoDB _id is exposed as _id
 * (string), timestamps as ISO strings.
 */

export type ID = string;

export interface User {
  _id: ID;
  name: string;
  email: string;
  avatar?: string;
  plan?: 'free' | 'pro' | 'team';
}

export type ProjectStatus = 'draft' | 'researching' | 'complete' | 'failed' | 'deleted';

export interface ProjectRecommendation {
  category?: string;
  name: string;
  rationale?: string;
  alternatives?: string[];
  tradeoffs?: string;
  priority?: 'must_have' | 'should_have' | 'nice_to_have';
}

export interface ProjectArchitectureComponent {
  name: string;
  description?: string;
  technology?: string;
  responsibilities?: string[];
  purpose?: string;
  dependencies?: string[];
  category?: 'frontend' | 'backend' | 'database' | 'ai' | 'vector' | 'queue' | 'cache' | 'external' | string;
}

export interface ProjectArchitecture {
  overview?: string;
  components?: ProjectArchitectureComponent[];
  dataFlow?: string;
  deploymentModel?: string;
  scalabilityNotes?: string;
}

export interface RoadmapPhase {
  phase: number;
  title: string;
  duration?: string;
  milestones?: string[];
  deliverables?: string[];
  dependencies?: string[];
  tasks?: string[];
}

export interface RoadmapRisk {
  risk: string;
  mitigation?: string;
  probability?: 'low' | 'medium' | 'high';
  impact?: 'low' | 'medium' | 'high';
}

export interface Roadmap {
  phases?: RoadmapPhase[];
  totalDuration?: string;
  criticalPath?: string[];
  risks?: RoadmapRisk[];
}

export interface ResourceRecommendation {
  type?: 'human' | 'financial' | 'infrastructure' | 'time' | string;
  name: string;
  description?: string;
  estimatedCost?: string;
  timeframe?: string;
  url?: string;
}

export interface ProblemUnderstanding {
  keyConcepts?: string[];
  domain?: string;
  constraints?: string[];
  successCriteria?: string[];
  assumptions?: Array<{
    assumption: string;
    risk?: string;
    severity?: 'low' | 'medium' | 'high';
    evidence?: string;
    mitigation?: string;
  }>;
  architecture?: ProjectArchitecture;
  recommendations?: ProjectRecommendation[];
  resources?: ResourceRecommendation[];
  roadmap?: Roadmap;
}

export interface Project {
  _id: ID;
  title: string;
  description: string;
  userId: ID;
  status: ProjectStatus;
  domain?: string;
  projectType?: string;
  targetUsers?: string;
  platform?: string;
  preferredTech?: string;
  constraints?: string;
  teamSize?: number;
  timeline?: string;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  researchProgress: number;
  confidenceScore?: number;
  healthScore?: number;
  problemUnderstanding?: ProblemUnderstanding;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectStats {
  sourceCount: number;
  gapCount: number;
  solutionCount: number;
  lastJobStatus: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | null;
  lastJobProgress: number | null;
  lastJobUpdatedAt: string | null;
}

export type ResearchStageKey =
  | 'understand'
  | 'plan'
  | 'search'
  | 'analyze'
  | 'solutions'
  | 'gaps'
  | 'stress'
  | 'architecture'
  | 'roadmap';

export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface ResearchStage {
  key: ResearchStageKey;
  label: string;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  note?: string;
}

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface ResearchJob {
  _id: ID;
  projectId: ID;
  status: JobStatus;
  progress: number;
  stages: ResearchStage[];
  sourceCount?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  cancelRequested?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SourceProvider =
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

export type SourceType =
  | 'paper'
  | 'article'
  | 'repo'
  | 'dataset'
  | 'api'
  | 'web'
  | 'patent'
  | 'talk'
  | 'package'
  | 'rfc'
  | 'advisory'
  | 'discussion';

export interface ResearchSource {
  _id: ID;
  projectId: ID;
  researchJobId?: ID;
  provider: SourceProvider;
  sourceType: SourceType;
  title: string;
  url?: string;
  authors?: string[];
  publishedAt?: string;
  snippet?: string;
  content?: string;
  query?: string;
  metadata?: Record<string, unknown>;
  relevanceScore: number;
  credibilityScore: number;
  retrievedAt?: string;
  createdAt: string;
}

export interface EvidenceClaim {
  _id: ID;
  projectId: ID;
  claim: string;
  supportingSourceIds?: ID[];
  contradictingSourceIds?: ID[];
  confidence: number;
  reasoning?: string;
  sourceQuality?: number;
  relevance?: number;
  freshness?: number;
  evidenceScore?: number;
  createdAt: string;
}

export interface ExistingSolution {
  _id: ID;
  projectId: ID;
  name: string;
  description?: string;
  url?: string;
  features?: string[];
  strengths?: string[];
  limitations?: string[];
  technologies?: string[];
  similarityScore?: number;
  sourceIds?: ID[];
  createdAt: string;
}

export interface InnovationGap {
  _id: ID;
  projectId: ID;
  title: string;
  description?: string;
  opportunity?: string;
  category?: 'feature' | 'technical' | 'cost' | 'ux' | 'integration' | 'scalability' | 'user' | 'research';
  impact: 'low' | 'medium' | 'high';
  difficulty: 'low' | 'medium' | 'high';
  confidence: number;
  evidenceSourceIds?: ID[];
  createdAt: string;
}

export interface CopilotMessage {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  citations?: Array<{ index: number; title: string; url: string; sourceType: string }>;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface PagedResult<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number };
}
