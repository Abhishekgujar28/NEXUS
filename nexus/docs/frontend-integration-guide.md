# NEXUS — Frontend Integration Guide

> **Source of truth for frontend developers.** Every endpoint, response shape, enum,
> socket event, and data contract documented here was extracted directly from the
> backend source code. Backend is the authority — frontend adapts.

---

## 1. Backend Overview

NEXUS is a **multi-agent AI Research & Engineering Workspace**. The backend is a
Node.js/Express/TypeScript server backed by:

- **MongoDB** (Mongoose) — persistent storage (13 models)
- **Redis + BullMQ** — async research job queue
- **ChromaDB / MemoryVectorStore** — RAG vector storage
- **Socket.IO** — real-time research progress
- **7 AI providers** — OpenRouter, Gemini, OpenAI, Anthropic, Groq, DeepSeek, Together

### Architecture Pattern

```
Express API → Controller → Service/Model → Response Envelope
                             ↓ (research)
                        BullMQ Queue → Worker → ResearchOrchestrator
                             ↓ (11 AI agents)
                        Socket.IO → Frontend
```

---

## 2. Backend Folder Structure

```
server/src/
├── core/           # config, database, redis, logger, errors
├── models/         # 13 Mongoose models
├── routes/         # 6 route files (auth, projects, research, copilot, notifications, system)
├── controllers/    # 6 controllers
├── schemas/        # Zod validation schemas
├── middleware/     # auth, projectAuth, rateLimiter, validation, errorHandler
├── agents/         # 9 AI agents + base class + prompts/
├── orchestrator/   # ResearchOrchestrator (11-stage pipeline)
├── workers/        # BullMQ worker + queue definition
├── research/       # Provider registry + 4 search providers + deduplicator
├── integrations/   # AIRouter, AIProvider interface, 7 adapter providers, modelRegistry
├── rag/            # chunker, embedder, chroma.client, retriever, pipeline
├── socket/         # Socket.IO server + handlers
├── utils/          # jwt, asyncHandler, retry, safeFetch
├── app.ts          # Express middleware + route mounting
└── server.ts       # HTTP server + graceful shutdown
```

---

## 3. API Endpoints — Complete Reference

**Base URL**: `/api/v1`

### 3.1 Authentication — `/api/v1/auth`

| Method | Path | Body | Response `data` | Auth | Rate Limit |
|--------|------|------|-----------------|------|------------|
| POST | `/register` | `{ name, email, password }` | `{ user: User, accessToken, refreshToken }` | Public | Yes |
| POST | `/login` | `{ email, password }` | `{ user: User, accessToken, refreshToken }` | Public | Yes |
| POST | `/logout` | `{ refreshToken }` | `{ message: string }` | JWT | — |
| POST | `/refresh` | `{ refreshToken }` | `{ accessToken, refreshToken }` | Public | — |
| GET | `/me` | — | `{ user: User }` | JWT | — |

**Validation** (Zod):
- `name`: 1–60 chars, trimmed
- `email`: valid email, lowercased
- `password`: 8–128 chars

### 3.2 Projects — `/api/v1/projects`

| Method | Path | Body/Params | Response `data` | Auth |
|--------|------|-------------|-----------------|------|
| GET | `/` | `?page&limit&status` | `PagedResult<Project>` | JWT |
| POST | `/` | `{ title, description, domain?, projectType?, targetUsers?, platform?, preferredTech?, constraints?, teamSize?, timeline?, skillLevel? }` | `Project` | JWT |
| GET | `/:id` | — | `Project` | JWT + member |
| PUT | `/:id` | Partial `{ title?, description?, ... }` | `Project` | JWT + editor+ |
| DELETE | `/:id` | — | `{ id, status: 'deleted' }` | JWT + owner |
| GET | `/:id/stats` | — | `ProjectStats` | JWT + member |
| POST | `/:id/members` | `{ email, role? }` | member doc | JWT + owner |
| DELETE | `/:id/members/:userId` | — | `{ message }` | JWT + owner |

**ProjectStats shape**:
```typescript
{
  sourceCount: number;
  gapCount: number;
  solutionCount: number;
  lastJobStatus: JobStatus | null;
  lastJobProgress: number | null;
  lastJobUpdatedAt: string | null;
}
```

### 3.3 Research — `/api/v1/research/:projectId`

| Method | Path | Body | Response `data` | Auth |
|--------|------|------|-----------------|------|
| POST | `/start` | `{ force?: boolean }` | `{ jobId, status: 'queued' }` (202) | JWT + editor+ |
| GET | `/job` | — | `ResearchJob` | JWT + member |
| GET | `/sources` | `?page&limit&type` | `PagedResult<ResearchSource>` | JWT + member |
| GET | `/evidence` | — | `EvidenceClaim[]` | JWT + member |
| GET | `/solutions` | — | `ExistingSolution[]` | JWT + member |
| GET | `/gaps` | — | `InnovationGap[]` | JWT + member |
| GET | `/architecture` | — | `{ architecture, recommendations, preferredTech?, constraints? }` | JWT + member |
| GET | `/resources` | — | `{ resources: ResourceRecommendation[] }` | JWT + member |
| GET | `/roadmap` | — | `{ roadmap: Roadmap \| null }` | JWT + member |
| POST | `/stresstest` | — | `{ assumptions }` | JWT + editor+ |
| POST | `/preview` | `{ title, description }` | `{ queries }` | JWT |
| POST | `/test-agent` | `{ agent, input }` | `{ result }` | JWT |

**Start Research rules**:
- Returns `409` if a job is already `queued` or `running`
- Returns `202 Accepted` on success (async processing via BullMQ)
- `force: true` allows re-running even with a completed job

### 3.4 Copilot — `/api/v1/copilot/:projectId`

| Method | Path | Body | Response `data` | Auth |
|--------|------|------|-----------------|------|
| POST | `/chat` | `{ message, conversationId? }` | `{ conversationId, answer }` | JWT + member |
| GET | `/conversations` | — | `Conversation[]` | JWT + member |
| GET | `/history` | `?conversationId` | `{ projectId, items: CopilotMessage[] }` | JWT + member |

### 3.5 Notifications — `/api/v1/notifications`

| Method | Path | Body | Response `data` | Auth |
|--------|------|------|-----------------|------|
| GET | `/` | `?page&limit&read` | `PagedResult<Notification>` | JWT |
| PUT | `/:id/read` | — | `Notification` | JWT |
| PUT | `/read-all` | — | `{ modifiedCount }` | JWT |

### 3.6 System — `/api/v1/system`

| Method | Path | Body | Response `data` | Auth |
|--------|------|------|-----------------|------|
| GET | `/providers` | — | `ProviderHealthStatus[]` | Public |
| GET | `/ai-config` | — | `{ providers, defaultProvider, taskRegistry }` | Public |
| PATCH | `/providers` | `AdminProviderSettings` | `AdminProviderSettings` | Public (admin) |

---

## 4. Response Envelope Format

**Every** response follows this structure:

```typescript
// Success
{
  success: true,
  data: T
}

// Error
{
  success: false,
  error: {
    message: string,
    code: string     // e.g. 'NOT_FOUND', 'VALIDATION_ERROR', 'UNAUTHORIZED'
  }
}
```

**Error codes** (from `core/errors.ts`):
```
VALIDATION_ERROR | NOT_FOUND | DUPLICATE | UNAUTHORIZED | FORBIDDEN
INTERNAL_ERROR | BAD_GATEWAY | RATE_LIMITED
```

**HTTP status codes used**: 200, 201, 202, 400, 401, 403, 404, 409, 429, 500, 502, 503

---

## 5. Data Models — Complete Type Definitions

### User
```typescript
{
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  plan?: 'free' | 'pro' | 'team';
}
```

### Project
```typescript
{
  _id: string;
  title: string;
  description: string;
  userId: string;
  status: 'draft' | 'researching' | 'complete' | 'failed' | 'deleted';
  domain?: string;
  projectType?: string;
  targetUsers?: string;
  platform?: string;
  preferredTech?: string;
  constraints?: string;
  teamSize?: number;
  timeline?: string;
  skillLevel?: 'beginner' | 'intermediate' | 'advanced';
  researchProgress: number;        // 0-100
  confidenceScore?: number;        // 0-100 (set after critic agent)
  healthScore?: number;
  problemUnderstanding?: {
    definition?: { ... };          // ProblemUnderstanding output
    architecture?: ProjectArchitecture;
    recommendations?: ProjectRecommendation[];
    roadmap?: Roadmap;
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
  };
  tags?: string[];
  createdAt: string;               // ISO 8601
  updatedAt: string;
}
```

### ResearchJob
```typescript
{
  _id: string;
  projectId: string;
  userId?: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;                // 0-100
  stages: ResearchStage[];         // always 11 entries
  sourceCount?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  cancelRequested?: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
```

### ResearchStage
```typescript
{
  key: 'understand' | 'plan' | 'search_web' | 'search_papers' | 'search_github'
     | 'analyze' | 'solutions' | 'gaps' | 'stress' | 'architecture' | 'roadmap';
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  note?: string;
}
```

**Stage labels** (from `RESEARCH_STAGES` constant):
```
understand    → "Problem Understanding"
plan          → "Query Planning"
search_web    → "Web Research"
search_papers → "Academic Papers"
search_github → "Code & Repos"
analyze       → "Research Analysis"
solutions     → "Existing Solutions"
gaps          → "Gap Analysis"
stress        → "Stress Testing"
architecture  → "Architecture Design"
roadmap       → "Roadmap Planning"
```

### ResearchSource
```typescript
{
  _id: string;
  projectId: string;
  researchJobId?: string;
  provider: 'serper' | 'github' | 'arxiv' | 'semanticScholar';
  sourceType: 'paper' | 'article' | 'repo' | 'dataset' | 'api' | 'web';
  title: string;
  url?: string;
  authors?: string[];
  publishedAt?: string;
  snippet?: string;
  content?: string;
  query?: string;
  metadata?: Record<string, unknown>;
  relevanceScore: number;          // 0-1
  credibilityScore: number;        // 0-1
  retrievedAt?: string;
  createdAt: string;
}
```

### EvidenceClaim
```typescript
{
  _id: string;
  projectId: string;
  claim: string;
  supportingSourceIds?: string[];
  contradictingSourceIds?: string[];
  confidence: number;              // 0-1
  reasoning?: string;
  category?: string;
  sourceQuality?: number;          // 0-1
  relevance?: number;              // 0-1
  freshness?: number;              // 0-1
  evidenceScore?: number;          // 0-1
  createdAt: string;
}
```

### ExistingSolution
```typescript
{
  _id: string;
  projectId: string;
  name: string;
  description?: string;
  url?: string;
  category?: string;
  features?: string[];
  strengths?: string[];
  limitations?: string[];
  pricingModel?: string;
  technologies?: string[];
  similarityScore?: number;
  relevanceScore?: number;
  sourceIds?: string[];
  createdAt: string;
}
```

### InnovationGap
```typescript
{
  _id: string;
  projectId: string;
  title: string;
  description?: string;
  opportunity?: string;
  category?: 'feature' | 'technical' | 'cost' | 'ux' | 'integration'
            | 'scalability' | 'user' | 'research';
  impact: 'low' | 'medium' | 'high';
  difficulty: 'low' | 'medium' | 'high';
  confidence: number;              // 0-1
  affectedSolutions?: string[];
  evidenceSourceIds?: string[];
  createdAt: string;
}
```

### ProjectArchitecture
```typescript
{
  overview?: string;
  components?: Array<{
    name: string;
    description?: string;
    technology?: string;
    responsibilities?: string[];
    purpose?: string;
    dependencies?: string[];
    category?: 'frontend' | 'backend' | 'database' | 'ai' | 'vector'
              | 'queue' | 'cache' | 'external' | string;
  }>;
  dataFlow?: string;
  deploymentModel?: string;
  scalabilityNotes?: string;
}
```

### ProjectRecommendation
```typescript
{
  category?: string;
  name: string;
  rationale?: string;
  alternatives?: string[];
  tradeoffs?: string;
  priority?: 'must_have' | 'should_have' | 'nice_to_have';
}
```

### Roadmap
```typescript
{
  phases?: Array<{
    phase: number;
    title: string;
    duration?: string;
    milestones?: string[];
    deliverables?: string[];
    dependencies?: string[];
    tasks?: string[];
  }>;
  totalDuration?: string;
  criticalPath?: string[];
  risks?: Array<{
    risk: string;
    mitigation?: string;
    probability?: 'low' | 'medium' | 'high';
    impact?: 'low' | 'medium' | 'high';
  }>;
}
```

### ResourceRecommendation
```typescript
{
  type?: 'human' | 'financial' | 'infrastructure' | 'time' | string;
  name: string;
  description?: string;
  estimatedCost?: string;
  timeframe?: string;
  url?: string;
}
```

### CopilotMessage
```typescript
{
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sourceIds?: string[];
  streaming?: boolean;
}
```

### Notification
```typescript
{
  _id: string;
  userId: string;
  type: 'research_complete' | 'research_failed' | 'member_added' | 'system';
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}
```

### PagedResult
```typescript
{
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

---

## 6. WebSocket Events — Complete Catalog

**Transport**: Socket.IO
**Connection**: `io(SOCKET_URL, { auth: { token: accessToken } })`

### 6.1 Server → Client Events

| Event | Room | Payload | When |
|-------|------|---------|------|
| `research:progress` | `project:{id}` | `{ jobId, stage, stageLabel, progress, message }` | Each stage transition |
| `research:complete` | `project:{id}` | `{ jobId, projectId, durationMs }` | Pipeline finishes successfully |
| `research:failed` | `project:{id}` | `{ jobId, projectId, error }` | Pipeline fails after retries |
| `notification:new` | `user:{id}` | `Notification` | New notification created |

### 6.2 Client → Server Events

| Event | Payload | Response |
|-------|---------|----------|
| `project:join` | `{ projectId }` | Ack callback: `{ joined: true, room }` |
| `project:leave` | `{ projectId }` | — |

### 6.3 Connection Authentication

Socket.IO middleware extracts JWT from:
1. `socket.handshake.auth.token`
2. `socket.handshake.headers.authorization` (Bearer)

On auth failure: `socket.disconnect(true)`.

### 6.4 Room Management

- Users join `project:{projectId}` rooms on navigating to a project
- Users are auto-joined to `user:{userId}` on connection (for notifications)
- `project:join` validates project membership via `projectAuth` middleware

---

## 7. Enums — Complete Reference

### ProjectStatus
```
'draft' | 'researching' | 'complete' | 'failed' | 'deleted'
```

### JobStatus
```
'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
```

### StageStatus
```
'pending' | 'running' | 'completed' | 'failed' | 'skipped'
```

### ResearchStageKey
```
'understand' | 'plan' | 'search_web' | 'search_papers' | 'search_github'
| 'analyze' | 'solutions' | 'gaps' | 'stress' | 'architecture' | 'roadmap'
```

### SourceProvider
```
'serper' | 'github' | 'arxiv' | 'semanticScholar'
```

### SourceType
```
'paper' | 'article' | 'repo' | 'dataset' | 'api' | 'web'
```

### GapCategory
```
'feature' | 'technical' | 'cost' | 'ux' | 'integration' | 'scalability' | 'user' | 'research'
```

### Impact / Difficulty / Severity
```
'low' | 'medium' | 'high'
```

### Probability (Roadmap Risk)
```
'low' | 'medium' | 'high'
```

### Priority (Recommendation)
```
'must_have' | 'should_have' | 'nice_to_have'
```

### SkillLevel
```
'beginner' | 'intermediate' | 'advanced'
```

### UserPlan
```
'free' | 'pro' | 'team'
```

### ProjectMember Role
```
'owner' | 'editor' | 'viewer'
```

### NotificationType
```
'research_complete' | 'research_failed' | 'member_added' | 'system'
```

---

## 8. Authentication Flow

1. **Register/Login** → receives `{ accessToken, refreshToken }`
2. Tokens stored in `localStorage` key `nexus.tokens.v1`
3. Every API request adds `Authorization: Bearer {accessToken}`
4. On **401** response: interceptor calls `POST /auth/refresh` with stored `refreshToken`
5. If refresh succeeds: retries original request with new token
6. If refresh fails: clears tokens, redirects to `/login`
7. **Socket.IO** sends token via `auth: { token: accessToken }`

### Token Storage
```typescript
// Key: 'nexus.tokens.v1'
{ accessToken: string | null, refreshToken: string | null }
```

---

## 9. Error Handling Patterns

### API Error Extraction
```typescript
import { apiErrorMessage } from '@/lib/api';
// Returns human-readable string from:
//   response.data.error.message → response.data.message → axiosError.message → fallback
```

### Error States by Status Code
| Code | Meaning | Frontend Behavior |
|------|---------|-------------------|
| 400 | Validation error | Show field-level or form-level error |
| 401 | Token expired/invalid | Auto-refresh, then redirect if fails |
| 403 | Insufficient role | Show "no permission" message |
| 404 | Not found | Show empty state or redirect |
| 409 | Conflict (duplicate start) | Show "already running" toast |
| 429 | Rate limited | Show retry-after message |
| 500 | Server error | Show generic error message |
| 502 | AI provider down | Show "AI unavailable" message |
| 503 | Service not configured | Show configuration needed message |

---

## 10. Loading States

| Page/Component | Loading Pattern |
|----------------|-----------------|
| **Project list** | 6-card skeleton grid |
| **Project page** | Title + description + tab bar skeleton |
| **Research timeline** | 6 circle+line skeletons |
| **Sources list** | 5 card skeletons |
| **Evidence list** | 4 card skeletons |
| **Solutions list** | 3 card skeletons |
| **Gaps list** | 4 card skeletons |
| **Architecture** | Header + body skeleton |
| **Roadmap** | Header + 3 phase skeletons |
| **Resources** | 4 row skeletons |
| **Build mode** | Progress bar + 2-column skeleton |
| **Copilot** | Empty state with suggested questions |

---

## 11. Empty States

| Page | Condition | Message Pattern |
|------|-----------|-----------------|
| Dashboard | No projects | "No projects yet" + create CTA |
| Sources | No sources | "Run research to discover sources" |
| Evidence | No claims | "Evidence claims are extracted from research" |
| Solutions | No solutions | "NEXUS catalogs existing products after research" |
| Gaps | No gaps | "Run research to discover innovation gaps" |
| Architecture | No architecture | "Complete a research run to see architecture" |
| Roadmap | No roadmap | "NEXUS generates a phased roadmap after research" |
| Resources | No resources | "Complete a research run to discover resources" |
| Stress test | No results | "Run a stress test after research completes" |
| Build mode | No tasks | "Build mode unlocks after roadmap" |
| Copilot | No messages | Suggested question chips |
| Research | No job | "Start a research job to see progress" |

---

## 12. Polling vs Real-time

| Data | Strategy | Interval | Condition |
|------|----------|----------|-----------|
| **Project list (sidebar)** | Polling | 5s | Any project `researching` |
| **Project detail** | React Query | 5s refetch | `status === 'researching'` |
| **Research job** | Polling | 3s | `status === 'running' \|\| 'queued'` |
| **Research progress** | Socket.IO | Real-time | `research:progress` event |
| **Research complete** | Socket.IO | Real-time | `research:complete` event |
| **Research failure** | Socket.IO | Real-time | `research:failed` event |
| **Notifications** | Socket.IO | Real-time | `notification:new` event |
| **All other data** | React Query | 30s stale time | Standard query caching |

---

## 13. Route Protection

### Public Routes
- `/` — Landing page
- `/login` — Auth (guest only)
- `/register` — Auth (guest only)

### Protected Routes (require auth)
- `/app` — Dashboard
- `/new` — New project
- `/projects/:id/*` — Project detail + all tabs
- `/team` — Team activity
- `/settings` — User settings
- `/discoveries` — Cross-project feed (planned)
- `/library` — All projects (planned)

### Guest Guard
If `authed` → redirect to `/app`

### Protected Guard
If `guest` → redirect to `/login`

---

## 14. State Management

### Zustand Stores
- **`useAuthStore`** — user, status, login/register/logout/init
  - Persisted to `localStorage` key `nexus.auth.v1` (user field only)

### React Query Keys
```
['projects']                    — project list
['projects', 'sidebar']         — sidebar project list (limit 40)
['projects', 'all']             — all projects (team page)
['project', projectId]          — single project
['project-stats', projectId]    — project stats
['research-job', projectId]     — research job
['sources', projectId, filter]  — sources with filter
['evidence', projectId]         — evidence claims
['solutions', projectId]        — existing solutions
['gaps', projectId]             — innovation gaps
['architecture', projectId]     — architecture + recommendations
['resources', projectId]        — resource recommendations
['roadmap', projectId]          — roadmap
```

### localStorage Keys
```
nexus.tokens.v1     — JWT tokens
nexus.auth.v1       — Zustand auth persistence
nexus:pinned-projects — Pinned project IDs (array)
```

---

## 15. Frontend Data Flow

```
User Action → React Query Mutation → API Call → Backend
    ↓                                              ↓
Component ← React Query Cache ← API Response ← Backend
                                                   ↓ (async)
                                              BullMQ Worker
                                                   ↓
                                         Socket.IO Event ← ResearchOrchestrator
                                                   ↓
                                    Frontend Socket Handler → React Query Invalidation
```

---

## 16. Component → Endpoint Mapping

| Frontend Page/Component | Backend Endpoints Used |
|--------------------------|----------------------|
| `LoginPage` | `POST /auth/login` |
| `RegisterPage` | `POST /auth/register` |
| `DashboardPage` | `GET /projects` |
| `NewProjectPage` | `POST /projects` |
| `ProjectPage` | `GET /projects/:id`, `GET /projects/:id/stats`, `POST /research/:id/start` |
| `OverviewTab` | (uses project prop from parent) |
| `ResearchProgressTab` | `GET /research/:id/job` |
| `SourcesTab` | `GET /research/:id/sources` |
| `EvidenceTab` | `GET /research/:id/evidence` |
| `SolutionsTab` | `GET /research/:id/solutions` |
| `GapsTab` | `GET /research/:id/gaps` |
| `StressTestTab` | `GET /projects/:id`, `POST /research/:id/stresstest` |
| `ArchitectureTab` | `GET /research/:id/architecture` |
| `ResourcesTab` | `GET /research/:id/resources` |
| `RoadmapTab` | `GET /research/:id/roadmap` |
| `BuildModeTab` | `GET /research/:id/roadmap`, `GET /research/:id/architecture`, `GET /research/:id/resources` |
| `CopilotTab` | `POST /copilot/:id/chat`, `GET /copilot/:id/history` |
| `TeamActivityPage` | `GET /projects` (infers activity) |
| `SettingsPage` | (reads auth store, no API calls yet) |
| `AppLayout (sidebar)` | `GET /projects` |
| `CommandMenu` | `GET /projects` |
| Socket listeners | `research:progress`, `research:complete`, `research:failed` |

---

## 17. API Usage Examples

### Start Research
```typescript
import { researchService } from '@/lib/services';

const { jobId, status } = await researchService.start(projectId);
// Returns 202, status will be 'queued'
// Worker picks up async, emits socket events
```

### Fetch Paginated Sources
```typescript
const { items, pagination } = await researchService.sources(projectId, {
  page: 1,
  limit: 20,
  type: 'paper'  // optional filter
});
```

### Send Copilot Message
```typescript
const { conversationId, answer } = await copilotService.chat(
  projectId,
  'What should I build first?',
  existingConversationId  // undefined for new conversation
);
```

### Listen for Research Progress
```typescript
import { getSocket, joinProjectRoom } from '@/lib/socket';

joinProjectRoom(projectId);
const socket = getSocket();

socket.on('research:progress', (payload) => {
  // { jobId, stage, stageLabel, progress, message }
  queryClient.invalidateQueries(['research-job', projectId]);
});

socket.on('research:complete', (payload) => {
  // { jobId, projectId, durationMs }
  queryClient.invalidateQueries(['project', projectId]);
  toast.success('Research complete!');
});
```

---

## 18. Design System Quick Reference

### Colors
- **Background**: `hsl(var(--background))` — dark: `40 8% 5%`
- **Foreground**: `hsl(var(--foreground))` — dark: `44 20% 92%`
- **Accent**: Citrine `#B4D024` — used sparingly
- **Success**: Moss `#8DB37C`
- **Warning**: Amber `#F5C563`
- **Danger**: Clay `#E8927A`

### Typography
- **Display**: `Instrument Serif` — used for `NEXUS` logo and hero
- **Body**: `Inter` — all UI text
- **Mono**: `JetBrains Mono` — code and technical labels

### Component Classes
- `.text-display` — display font
- `.eyebrow` — uppercase 2xs label
- `.mono-label` — monospace uppercase label
- `.surface-card` — raised card surface
- `.tabular` — tabular numbers for scores/percentages
- `.scrollbar-thin` — thin scrollbar styling

### Animations
- `animate-fade-in` — 200ms opacity
- `animate-fade-in-up` — 220ms opacity + translateY
- `animate-accent-pulse` — citrine glow pulse (research activity)
- `animate-shimmer` — skeleton loading shimmer
