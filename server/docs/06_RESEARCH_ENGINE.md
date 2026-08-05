# 06 — Research Engine

> **Scope:** The complete research pipeline — from job creation through provider search, evidence extraction, gap analysis, architecture generation, and roadmap creation.

---

## 1. Purpose

NEXUS's core value proposition is autonomous research. This document defines every stage of the research pipeline, how providers gather data, how agents process it, and how results flow into MongoDB. Any implementation of the research engine MUST conform to this specification.

---

## 2. Responsibilities

| Component | Responsibility |
|---|---|
| `research.controller.ts` | Job creation, data retrieval endpoints |
| `research.routes.ts` | Route definitions + middleware |
| `research.schema.ts` | Validation for `startResearch` |
| `ResearchJob.ts` model | Pipeline lifecycle tracking |
| `ResearchSource.ts` model | External source persistence |
| `EvidenceClaim.ts` model | Synthesized claims |
| `ExistingSolution.ts` model | Competitive analysis |
| `InnovationGap.ts` model | Opportunity identification |
| `research/providers/*` | External data source adapters |
| `research/deduplicator.ts` | Cross-provider deduplication |
| `[PLANNED] orchestrator/` | Agent sequencing + progress |
| `[PLANNED] workers/` | BullMQ background processing |

---

## 3. Folder Mapping

```
src/
├── controllers/research.controller.ts
├── routes/research.routes.ts
├── schemas/research.schema.ts
├── models/
│   ├── ResearchJob.ts
│   ├── ResearchSource.ts
│   ├── EvidenceClaim.ts
│   ├── ExistingSolution.ts
│   └── InnovationGap.ts
├── research/
│   ├── deduplicator.ts
│   └── providers/
│       ├── ResearchProvider.ts      # Interface
│       ├── serper.provider.ts       # Web search
│       ├── github.provider.ts       # Code search
│       ├── arxiv.provider.ts        # Academic papers
│       └── semanticScholar.provider.ts  # Research papers
├── [PLANNED] orchestrator/
│   └── research.orchestrator.ts
└── [PLANNED] workers/
    ├── queue.ts
    └── research.worker.ts
```

---

## 4. Research Pipeline Overview

```
POST /research/:id/start
         │
         ▼
┌─────────────────────────┐
│  Stage 1: UNDERSTAND    │  ProblemUnderstanding Agent
│  (5% progress)          │  Extract concepts, domain, constraints
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│  Stage 2: PLAN          │  QueryPlanner Agent
│  (15% progress)         │  Generate 10-15 diverse search queries
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│  Stage 3-5: SEARCH      │  DeepSearch Agent
│  (35% progress)         │  Parallel provider execution:
│                         │    ├── Serper (web)
│                         │    ├── GitHub (repos)
│                         │    ├── arXiv (papers)
│                         │    └── Semantic Scholar (papers)
│                         │  Deduplicate → store ResearchSources
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│  Stage 6: ANALYZE       │  ResearchAnalysis Agent
│  (50% progress)         │  Extract EvidenceClaims from sources
│                         │  Identify ExistingSolutions
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│  Stage 7: SOLUTIONS     │  (Part of analysis)
│  (55% progress)         │  Score and catalog existing solutions
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│  Stage 8: GAPS          │  GapFinder Agent
│  (65% progress)         │  Compare solutions vs requirements
│                         │  Identify InnovationGaps
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│  Stage 9: STRESS        │  Critic Agent
│  (75% progress)         │  Challenge findings, find weaknesses
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│  Stage 10: ARCHITECTURE │  Architect Agent
│  (88% progress)         │  Design system architecture
│                         │  Generate tech recommendations
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│  Stage 11: ROADMAP      │  Roadmap Agent
│  (100% progress)        │  Create phased implementation plan
│                         │  Identify risks and resources
└─────────────────────────┘
```

---

## 5. Research Job Lifecycle

### 5.1 Job Creation (`startResearch`)

```typescript
// 1. Verify no active job
const existingJob = await ResearchJob.findOne({
  projectId,
  status: { $in: ['queued', 'running'] }
});
if (existingJob) throw new AppError('...', 409, CONFLICT);

// 2. Create job with all stages
const job = await ResearchJob.create({
  projectId,
  userId,
  status: 'queued',
  progress: 0,
  stages: RESEARCH_STAGES.map(stage => ({
    key: stage.key,
    label: stage.label,
    status: 'pending'
  }))
});

// 3. Mark project as researching
await Project.findByIdAndUpdate(projectId, {
  status: 'researching',
  researchProgress: 0
});
```

### 5.2 Stage State Machine

```
          ┌─────────┐
          │ pending  │  ← Initial state
          └────┬─────┘
               │ Worker picks up stage
          ┌────▼─────┐
          │ running   │  ← startedAt set
          └────┬─────┘
        ┌──────┼──────┐
        ▼      ▼      ▼
  ┌──────────┐ ┌──────┐ ┌─────────┐
  │completed │ │failed│ │ skipped │
  └──────────┘ └──────┘ └─────────┘
  completedAt   note     note
  set           set      set
```

---

## 6. Research Providers

### 6.1 Provider Interface

**File:** `src/research/providers/ResearchProvider.ts`

```typescript
interface ResearchProvider {
  readonly name: ProviderName;
  isConfigured(): boolean;
  search(query: string): Promise<NormalizedSource[]>;
}
```

### 6.2 NormalizedSource Schema

Every provider maps its raw results to this common shape:

```typescript
interface NormalizedSource {
  provider: 'serper' | 'github' | 'arxiv' | 'semanticScholar';
  sourceType: 'paper' | 'article' | 'repo' | 'dataset' | 'api' | 'web';
  title: string;
  url: string;
  authors: string[];
  publishedAt: Date | null;
  snippet: string;
  content?: string;
  query: string;
  metadata: Record<string, unknown>;
  relevanceScore: number;   // 0-1
  credibilityScore: number; // 0-1
}
```

### 6.3 Provider Implementations

#### Serper (Web Search)
**File:** `serper.provider.ts`  
**API:** `POST https://google.serper.dev/search`  
**Config:** `config.serperApiKey` (required)  
**Returns:** Up to 10 `web` type sources  
**Relevance Scoring:** Position-based decay: `1 - (index * 0.08)`  
**Credibility:** Fixed `0.5` (web sources are variable quality)

#### GitHub (Code Search)
**File:** `github.provider.ts`  
**API:** `GET https://api.github.com/search/repositories`  
**Config:** `config.githubToken` (optional — raises rate limits)  
**Returns:** Up to 10 `repo` type sources, sorted by stars  
**Relevance Scoring:** Position-based decay: `1 - (index * 0.08)`  
**Credibility:** Star-based: `min(1, log10(stars + 1) / 5)`  
**Metadata:** `{ stars, forks, language, topics, license, updatedAt }`

#### arXiv (Academic Papers)
**File:** `arxiv.provider.ts`  
**API:** `GET https://export.arxiv.org/api/query`  
**Config:** None required (free public API)  
**Returns:** Up to 10 `paper` type sources  
**Parsing:** XML/Atom → `xml2js.parseStringPromise()`  
**Relevance Scoring:** Position-based decay: `1 - (index * 0.07)`  
**Credibility:** Fixed `0.75` (peer-reviewed)  
**Metadata:** `{ arxivId }`

#### Semantic Scholar
**File:** `semanticScholar.provider.ts`  
**API:** `GET https://api.semanticscholar.org/graph/v1/paper/search`  
**Config:** `config.semanticScholarApiKey` (optional — raises limits)  
**Returns:** Up to `config.research.maxSourcesPerProvider` (10) `paper` sources  
**Relevance Scoring:** Set to `0` (not position-ordered from API)  
**Credibility:** Citation-weighted: `min(1, 0.5 + log10(citations + 1) / 6)`  
**Metadata:** `{ paperId, citationCount, externalIds }`

### 6.4 Provider Error Handling

All providers wrap their search logic in try/catch:
- On failure, log the error and return `[]` (empty results)
- A failed provider MUST NOT crash the pipeline
- Each provider uses `safeFetch()` for SSRF protection

---

## 7. Deduplication

**File:** `src/research/deduplicator.ts`

### 7.1 Algorithm

```
deduplicateSources(sources: NormalizedSource[]): NormalizedSource[]

1. For each source:
   a. Compute key = normalizeUrl(source.url) || source.title.toLowerCase()
   b. If no key → drop the source
   c. If key already seen → drop (duplicate)
   d. Otherwise → add key to seen set, keep source
```

### 7.2 URL Normalization

```
normalize(url)
  → lowercase
  → strip trailing slash
  → strip protocol (http:// or https://)
```

This collapses `https://github.com/repo/` and `http://github.com/repo` into the same key.

---

## 8. Research Data Retrieval Endpoints

All read endpoints follow this pattern:

```
Client → verifyAuth → projectAuth('viewer') → researchLimiter → controller
                                                                    │
                                                              ensureProjectAccessible(projectId)
                                                                    │
                                                              Query MongoDB
                                                                    │
                                                              res.json({ success: true, data: ... })
```

### 8.1 Endpoint → Data Mapping

| Endpoint | Source | Query |
|---|---|---|
| `GET /job` | `ResearchJob` | Latest job, sorted by `createdAt` desc |
| `GET /sources` | `ResearchSource` | Paginated, filterable by `sourceType` |
| `GET /evidence` | `EvidenceClaim` | All for project, sorted by `createdAt` desc |
| `GET /solutions` | `ExistingSolution` | All for project, sorted by `createdAt` desc |
| `GET /gaps` | `InnovationGap` | All for project, sorted by `createdAt` desc |
| `GET /architecture` | `Project` | `problemUnderstanding.architecture` + `recommendations` |
| `GET /resources` | `Project` | `problemUnderstanding.resources` |
| `GET /roadmap` | `Project` | `problemUnderstanding.roadmap` |

---

## 9. Planned: Provider Registry

**File to create:** `src/research/providers/registry.ts`

```
ProviderRegistry:
  1. Instantiate all 4 providers
  2. Filter to isConfigured() === true
  3. For a given query:
     a. Run all configured providers concurrently
     b. Each wrapped in retry() + timeout (config.research.providerTimeoutMs)
     c. Failed/timed-out providers yield [] (do NOT fail the run)
     d. Flatten all results
     e. Apply deduplicateSources()
     f. Return NormalizedSource[]
```

---

## 10. Planned: Research Orchestrator

**File to create:** `src/orchestrator/research.orchestrator.ts`

### 10.1 Orchestrator Flow

```
ResearchOrchestrator.run(projectId, jobId, emitter):

  for each stage in RESEARCH_STAGES:
    1. Update stage.status = 'running', stage.startedAt = now
    2. Update job.progress = stageProgressMap[stage.key]
    3. Emit 'research:progress' via Socket.io

    try:
      4. Execute agent for this stage
      5. Update stage.status = 'completed', stage.completedAt = now
    catch:
      6. Update stage.status = 'failed', stage.note = error.message
      7. Check if stage is critical (understand, search, analyze)
         → If critical: fail entire job
         → If non-critical: log and continue

  8. Update job.status = 'completed', job.completedAt = now
  9. Update project.status = 'complete', project.researchProgress = 100
  10. Emit 'research:complete'
```

### 10.2 Progress Mapping

| Stage Key | Label | Progress % |
|---|---|---|
| `understand` | Understanding Idea | 5% |
| `plan` | Planning Queries | 15% |
| `search_web` | Searching Web | 25% |
| `search_papers` | Searching Papers | 30% |
| `search_github` | Searching GitHub | 35% |
| `analyze` | Analyzing Evidence | 50% |
| `solutions` | Finding Solutions | 55% |
| `gaps` | Discovering Gaps | 65% |
| `stress` | Stress Testing | 75% |
| `architecture` | Designing Architecture | 88% |
| `roadmap` | Generating Roadmap | 100% |

---

## 11. Data Flow Through the Pipeline

```
                                         MongoDB writes
                                              │
Project.description  ──────►  Agent 1  ──────┤── (no direct write)
                                              │
Agent 1 output       ──────►  Agent 2  ──────┤── (no direct write)
                                              │
Agent 2 queries      ──────►  Agent 3  ──────┤── ResearchSource.insertMany()
 + Providers                                  │
                                              │
ResearchSources      ──────►  Agent 4  ──────┤── EvidenceClaim.insertMany()
                                              │── ExistingSolution.insertMany()
                                              │
EvidenceClaims +     ──────►  Agent 5  ──────┤── InnovationGap.insertMany()
ExistingSolutions                             │
                                              │
All prior data       ──────►  Agent 6  ──────┤── (stress test notes on job)
                                              │
Gaps + Critique      ──────►  Agent 7  ──────┤── Project.problemUnderstanding
                                              │     .architecture
                                              │     .recommendations
                                              │
Architecture +       ──────►  Agent 8  ──────┤── Project.problemUnderstanding
Requirements                                  │     .roadmap
                                              │     .resources
```

---

## 12. Error Handling

| Scenario | Status | Code | Behavior |
|---|---|---|---|
| Project not found/deleted | 404 | `NOT_FOUND` | Throw before any DB write |
| Job already running/queued | 409 | `CONFLICT` | Block concurrent jobs |
| No evidence for stress test | 400 | `VALIDATION_ERROR` | Reject stress test |
| Provider failure | — | — | Return `[]`, log error, continue |
| Agent failure (critical) | — | — | Fail job, emit `research:error` |
| Agent failure (non-critical) | — | — | Skip stage, continue |
| Gemini API error | — | — | Retry 3x with backoff, then fail |

---

## 13. Security

- All research endpoints require `verifyAuth` + `projectAuth('viewer')`
- Mutations (`start`, `stresstest`) require `projectAuth('editor')`
- Research rate limit: 10 requests / 15 minutes
- All provider outbound requests go through `safeFetch()` (SSRF protection)
- Provider API keys are validated at configuration time, not at request time

---

## 14. Testing Strategy

| Test | Description | Priority |
|---|---|---|
| Start research: happy path | Creates job + updates project status | P0 |
| Start research: concurrent | Returns 409 if job running | P0 |
| Get job: returns latest | Most recent by createdAt | P0 |
| Provider: Serper | Mock API response, verify normalization | P1 |
| Provider: GitHub | Mock API response, verify metadata | P1 |
| Provider: arXiv | Mock XML response, verify parsing | P1 |
| Provider: error handling | Provider throws → returns [] | P0 |
| Deduplication | Same URL from 2 providers → 1 result | P0 |
| Stats query | Correct counts after data insertion | P1 |
| Architecture retrieval | Returns problemUnderstanding.architecture | P1 |

---

## 15. Future Improvements

1. **Job Cancellation**: `POST /research/:id/cancel` to set `cancelRequested = true`
2. **Incremental Research**: Re-run only new/changed stages
3. **Custom Queries**: Allow user-specified search queries alongside AI-generated ones
4. **Source Verification**: Validate URL accessibility before storing
5. **Content Extraction**: Fetch and parse full page content from source URLs
6. **Confidence Calibration**: ML-based confidence scoring replacing heuristics
7. **Provider Pluggability**: Admin-configurable provider list
8. **Research Templates**: Pre-built research configurations per domain
