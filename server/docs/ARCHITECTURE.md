# NEXUS System Architecture

NEXUS is an AI-powered Research & Innovation Copilot that automates deep research, gap analysis, architecture design, and roadmap generation for technical projects.

---

## 1. Component Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                          NEXUS SYSTEM                                 │
├──────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌─────────────────┐   HTTP REST    ┌──────────────────────────────┐ │
│  │  React Frontend │◄──────────────►│       Express API            │ │
│  │  (Vite + TS)    │   WebSocket    │       (Node.js / TS)         │ │
│  └─────────────────┘                └────────────┬─────────────────┘ │
│                                                   │                   │
│                              ┌────────────────────┼──────────────┐   │
│                              │                    │              │   │
│                    ┌─────────▼──────┐  ┌──────────▼──────┐      │   │
│                    │   MongoDB      │  │     Redis        │      │   │
│                    │  (main store)  │  │  (cache/queues)  │      │   │
│                    └────────────────┘  └──────────┬───────┘      │   │
│                                                   │              │   │
│                    ┌──────────────────┐  ┌────────▼──────────┐   │   │
│                    │    ChromaDB      │  │   Bull Workers    │   │   │
│                    │  (vector store)  │  │  (research jobs)  │   │   │
│                    └──────────────────┘  └────────┬──────────┘   │   │
│                                                   │              │   │
│                    ┌──────────────────┐  ┌────────▼──────────┐   │   │
│                    │   Gemini AI      │◄─┤  AI Agent         │   │   │
│                    │  (Google)        │  │  Orchestrator     │   │   │
│                    └──────────────────┘  └───────────────────┘   │   │
│                                                                    │   │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────────────┐ │   │
│  │  Socket.io      │  │  Serper API  │  │  GitHub API          │ │   │
│  │  (progress)     │  │  (web search)│  │  (code search)       │ │   │
│  └─────────────────┘  └──────────────┘  └──────────────────────┘ │   │
│                                                                    │   │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐   │   │
│  │  arXiv API               │  │  Semantic Scholar API        │   │   │
│  │  (academic papers)       │  │  (research papers)           │   │   │
│  └──────────────────────────┘  └──────────────────────────────┘   │   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. MongoDB Collections

### User
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `email` | String | Unique, indexed. User login email. |
| `password` | String | bcrypt hash (12 rounds). Never returned in API responses. |
| `name` | String | Display name. |
| `avatar` | String | Optional URL to profile image. |
| `role` | String | Enum: `user`, `admin`. Default: `user`. |
| `isActive` | Boolean | Soft-disable accounts. Default: `true`. |
| `lastLogin` | Date | Timestamp of most recent successful login. |
| `createdAt` | Date | Auto-managed by Mongoose timestamps. |
| `updatedAt` | Date | Auto-managed by Mongoose timestamps. |

### Project
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `name` | String | Project display name. |
| `description` | String | Short summary of the project. |
| `problemStatement` | String | Full problem statement fed to research agents. |
| `owner` | ObjectId | Ref: User. Project creator. |
| `status` | String | Enum: `active`, `archived`, `deleted`. |
| `researchStatus` | String | Enum: `idle`, `running`, `completed`, `failed`. |
| `tags` | [String] | Searchable tags. |
| `isPublic` | Boolean | Whether non-members can view. Default: `false`. |
| `createdAt` | Date | Auto-managed. |
| `updatedAt` | Date | Auto-managed. |

### ProjectMember
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `project` | ObjectId | Ref: Project. |
| `user` | ObjectId | Ref: User. |
| `role` | String | Enum: `owner`, `editor`, `viewer`. |
| `joinedAt` | Date | When the member was added. |

### ResearchJob
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `project` | ObjectId | Ref: Project. |
| `status` | String | Enum: `queued`, `running`, `completed`, `failed`, `cancelled`. |
| `progress` | Number | 0–100 percentage. |
| `currentAgent` | String | Name of the currently executing agent. |
| `startedAt` | Date | When the job began processing. |
| `completedAt` | Date | When the job finished (success or failure). |
| `error` | String | Optional error message on failure. |
| `metadata` | Object | Arbitrary job metadata (e.g., query counts, token usage). |
| `createdAt` | Date | Auto-managed. |

### ResearchSource
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `project` | ObjectId | Ref: Project. |
| `job` | ObjectId | Ref: ResearchJob. |
| `type` | String | Enum: `web`, `github`, `arxiv`, `semantic_scholar`. |
| `title` | String | Document or page title. |
| `url` | String | Source URL. |
| `content` | String | Raw extracted content. |
| `summary` | String | AI-generated summary. |
| `relevanceScore` | Number | 0–1 relevance to problem statement. |
| `metadata` | Object | Source-specific fields (e.g., stars for GitHub, citations for papers). |
| `createdAt` | Date | Auto-managed. |

### EvidenceClaim
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `project` | ObjectId | Ref: Project. |
| `claim` | String | The extracted claim or finding. |
| `evidence` | String | Supporting text from the source. |
| `source` | ObjectId | Ref: ResearchSource. |
| `confidence` | Number | 0–1 confidence score. |
| `category` | String | Enum: `supporting`, `contradicting`, `neutral`. |
| `createdAt` | Date | Auto-managed. |

### ExistingSolution
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `project` | ObjectId | Ref: Project. |
| `name` | String | Solution or product name. |
| `description` | String | What it does. |
| `url` | String | Optional link to solution. |
| `strengths` | [String] | List of identified strengths. |
| `weaknesses` | [String] | List of identified weaknesses. |
| `relevanceScore` | Number | 0–1 relevance to the problem. |
| `source` | ObjectId | Ref: ResearchSource. |
| `createdAt` | Date | Auto-managed. |

### InnovationGap
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `project` | ObjectId | Ref: Project. |
| `title` | String | Short gap title. |
| `description` | String | Detailed description of the gap. |
| `opportunity` | String | How this gap can be exploited. |
| `difficulty` | String | Enum: `low`, `medium`, `high`. |
| `impact` | String | Enum: `low`, `medium`, `high`. |
| `evidence` | [String] | Supporting evidence strings. |
| `createdAt` | Date | Auto-managed. |

### Architecture
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `project` | ObjectId | Ref: Project. |
| `overview` | String | High-level architecture description. |
| `components` | [Object] | Array of `{ name, description, technology, responsibilities: [String] }`. |
| `dataFlow` | String | Description of data flow between components. |
| `deploymentModel` | String | e.g., containerized microservices, monolith, serverless. |
| `scalabilityNotes` | String | Notes on scaling strategy. |
| `createdAt` | Date | Auto-managed. |
| `updatedAt` | Date | Auto-managed. |

### TechRecommendation
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `project` | ObjectId | Ref: Project. |
| `category` | String | Enum: `frontend`, `backend`, `database`, `infrastructure`, `ai_ml`, `devops`. |
| `name` | String | Technology name. |
| `rationale` | String | Why this technology is recommended. |
| `alternatives` | [String] | Other options considered. |
| `tradeoffs` | String | Known tradeoffs of this choice. |
| `priority` | String | Enum: `must_have`, `should_have`, `nice_to_have`. |
| `createdAt` | Date | Auto-managed. |

### Resource
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `project` | ObjectId | Ref: Project. |
| `type` | String | Enum: `human`, `financial`, `infrastructure`, `time`. |
| `name` | String | Resource name (e.g., "Senior Backend Engineer"). |
| `description` | String | What this resource is needed for. |
| `estimatedCost` | String | Optional cost estimate (e.g., "$5,000/month"). |
| `timeframe` | String | Optional timeframe (e.g., "Months 1–3"). |
| `createdAt` | Date | Auto-managed. |

### Roadmap
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `project` | ObjectId | Ref: Project. |
| `phases` | [Object] | Array of `{ phase: Number, title, duration, milestones: [String], deliverables: [String], dependencies: [String] }`. |
| `totalDuration` | String | e.g., "6 months". |
| `criticalPath` | [String] | Ordered list of critical milestones. |
| `risks` | [Object] | Array of `{ risk, mitigation, probability, impact }`. |
| `createdAt` | Date | Auto-managed. |
| `updatedAt` | Date | Auto-managed. |

### Conversation
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `project` | ObjectId | Ref: Project. |
| `user` | ObjectId | Ref: User. |
| `messages` | [Object] | Array of `{ role: 'user'|'assistant', content: String, timestamp: Date, sources: [ObjectId] }`. |
| `title` | String | Auto-generated from first user message. |
| `createdAt` | Date | Auto-managed. |
| `updatedAt` | Date | Auto-managed. |

### Notification
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `user` | ObjectId | Ref: User. Recipient. |
| `type` | String | Enum: `research_complete`, `research_failed`, `member_added`, `mention`. |
| `title` | String | Short notification title. |
| `message` | String | Full notification body. |
| `data` | Object | Arbitrary payload (e.g., `{ projectId, jobId }`). |
| `read` | Boolean | Whether the user has seen it. Default: `false`. |
| `createdAt` | Date | Auto-managed. |

### ActivityLog
| Field | Type | Description |
|-------|------|-------------|
| `_id` | ObjectId | Primary key |
| `user` | ObjectId | Ref: User. Actor. |
| `project` | ObjectId | Optional ref: Project. |
| `action` | String | Enum: `project_created`, `research_started`, `research_completed`, `member_added`, `member_removed`, `project_archived`, `copilot_chat`. |
| `details` | Object | Action-specific details. |
| `ipAddress` | String | Client IP for audit trail. |
| `userAgent` | String | Client user-agent string. |
| `createdAt` | Date | Auto-managed. |

---

## 3. RAG Pipeline

```
ResearchSource documents
        │
        ▼
┌───────────────────┐
│  1. Chunking      │  512-token chunks, 50-token overlap (sliding window)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  2. Embedding     │  Gemini text-embedding-004 → 768-dim float vectors
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  3. ChromaDB      │  Upsert with metadata: { sourceId, projectId,
│     Upsert        │    chunkIndex, type, title, url }
└────────┬──────────┘
         │
    [Query time]
         │
         ▼
┌───────────────────┐
│  4. Query Embed   │  User query → Gemini text-embedding-004
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  5. Retrieval     │  Top-K=10 nearest neighbors, filtered by projectId
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  6. Reranking     │  Score = 0.7 × vector_similarity + 0.3 × BM25_keyword
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  7. Context       │  Top 5 chunks assembled with [Source N] citations
│     Assembly      │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  8. Generation    │  context + query → Gemini → streamed response
└───────────────────┘
```

---

## 4. AI Agent Pipeline

### Research Pipeline (sequential, 8 agents)

```
problemStatement
      │
      ▼
┌─────────────────────────┐
│ 1. ProblemUnderstanding │  Extracts key concepts, domain, constraints,
│    Agent                │  success criteria → structured ProblemDefinition
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 2. QueryPlanner Agent   │  Generates 10–15 diverse search queries across
│                         │  web / academic / code dimensions
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 3. DeepSearch Agent     │  Executes queries in PARALLEL across:
│                         │  Serper (web) │ GitHub │ arXiv │ Semantic Scholar
│                         │  Deduplicates, stores as ResearchSources
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 4. ResearchAnalysis     │  Reads all sources, extracts EvidenceClaims,
│    Agent                │  identifies ExistingSolutions, scores relevance
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 5. GapFinder Agent      │  Compares solutions vs. requirements,
│                         │  identifies InnovationGaps with difficulty/impact
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 6. Critic Agent         │  Reviews all prior outputs, identifies weaknesses,
│                         │  inconsistencies, missing perspectives
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 7. Architect Agent      │  Designs Architecture + TechRecommendations
│                         │  based on gaps, critique, and requirements
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│ 8. Roadmap Agent        │  Creates phased Roadmap with milestones,
│                         │  Resources, risk assessment
└─────────────────────────┘
```

### Copilot Agent (stateful, per-conversation)

- Maintains full conversation history in the Conversation collection
- Retrieves relevant context via RAG pipeline (filtered to project)
- Streams token-by-token responses via Socket.io
- Can reference any research artifact (sources, gaps, architecture, roadmap)
- Supports follow-up questions, clarifications, and "what if" explorations

---

## 5. API Routes

### Auth — `/api/v1/auth`

| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/register` | `{ name, email, password }` | Create account. Returns user + accessToken. Sets refreshToken cookie. |
| POST | `/login` | `{ email, password }` | Authenticate. Returns accessToken. Sets httpOnly refreshToken cookie. |
| POST | `/logout` | — | Clears refreshToken cookie, invalidates token in Redis. |
| POST | `/refresh` | — | Reads refreshToken cookie, returns new accessToken. Rotates refresh token. |
| GET | `/me` | — | Returns current user profile (requires auth). |

### Projects — `/api/v1/projects`

| Method | Path | Body / Query | Description |
|--------|------|-------------|-------------|
| GET | `/` | `?page&limit&status` | List projects where user is owner or member. |
| POST | `/` | `{ name, description, problemStatement, tags, isPublic }` | Create project. |
| GET | `/:id` | — | Get project details. |
| PUT | `/:id` | `{ name, description, ... }` | Update project fields. |
| DELETE | `/:id` | — | Soft-delete (sets status: deleted). |
| GET | `/:id/stats` | — | Source count, gap count, solution count, last job status. |
| POST | `/:id/members` | `{ email, role }` | Add member by email. |
| DELETE | `/:id/members/:userId` | — | Remove member. |

### Research — `/api/v1/research/:id`

| Method | Path | Body / Query | Description |
|--------|------|-------------|-------------|
| POST | `/start` | — | Enqueue research job. Returns `{ jobId }`. |
| GET | `/job` | — | Current job status, progress, currentAgent. |
| GET | `/sources` | `?type&page&limit` | Paginated list of ResearchSources. |
| GET | `/evidence` | — | All EvidenceClaims for project. |
| GET | `/solutions` | — | All ExistingSolutions for project. |
| GET | `/gaps` | — | All InnovationGaps for project. |
| GET | `/architecture` | — | Architecture document + TechRecommendations. |
| GET | `/resources` | — | Resource recommendations. |
| GET | `/roadmap` | — | Roadmap with phases and risks. |
| POST | `/stresstest` | — | Re-run Critic agent on existing research. |

### Copilot — `/api/v1/copilot/:id`

| Method | Path | Body / Query | Description |
|--------|------|-------------|-------------|
| POST | `/chat` | `{ message, conversationId? }` | Send message. Streams response via Socket.io event `copilot:token`. |
| GET | `/history` | `?conversationId&page&limit` | Paginated conversation history. |

---

## 6. Background Job Architecture

```
POST /research/:id/start
        │
        ▼
┌───────────────────┐
│  Bull Queue       │  "research" queue, backed by Redis
│  (add job)        │  payload: { projectId, userId, jobId }
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│  research.worker  │  Concurrency: 2 jobs per worker instance
│  (Bull processor) │  Retries: 3 attempts, exponential backoff
└────────┬──────────┘
         │
         ▼
┌───────────────────────────┐
│  ResearchOrchestrator     │  Runs agents 1–8 in sequence
│  .run(projectId, jobId)   │  Updates ResearchJob.progress after each agent
└────────┬──────────────────┘
         │  emits via Socket.io
         ▼
┌───────────────────┐
│  Socket.io        │  Room: project:{projectId}
│  Events:          │
│  research:progress│  { agent, progress, message }
│  research:complete│  { jobId }
│  research:error   │  { jobId, error }
└───────────────────┘
```

Agent progress mapping:
| Agent | Progress % |
|-------|-----------|
| ProblemUnderstanding | 5% |
| QueryPlanner | 15% |
| DeepSearch | 35% |
| ResearchAnalysis | 50% |
| GapFinder | 65% |
| Critic | 75% |
| Architect | 88% |
| Roadmap | 100% |

---

## 7. Security Architecture

### Authentication
- Access tokens: JWT, signed with `JWT_SECRET`, expires in 15 minutes
- Refresh tokens: JWT, signed with `JWT_REFRESH_SECRET`, expires in 7 days, stored in httpOnly + Secure + SameSite=Strict cookie
- Refresh token rotation: each `/refresh` call invalidates the old token (stored in Redis blacklist) and issues a new one
- Passwords: bcrypt with 12 salt rounds

### HTTP Security (helmet)
- `Content-Security-Policy` — restricts script/style sources
- `Strict-Transport-Security` — enforces HTTPS
- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: no-referrer`

### CORS
- Origin restricted to `FRONTEND_URL` environment variable
- Credentials: true (required for cookie-based refresh tokens)

### Rate Limiting (express-rate-limit)
| Scope | Limit | Window |
|-------|-------|--------|
| General API | 100 requests | 15 minutes |
| Research endpoints | 10 requests | 15 minutes |
| Auth endpoints | 5 requests | 15 minutes |

### SSRF Protection
`safeFetch(url)` utility validates URLs before any outbound HTTP request:
- Rejects private IP ranges: `10.x.x.x`, `172.16–31.x.x`, `192.168.x.x`, `127.x.x.x`, `::1`
- Rejects non-HTTP(S) schemes
- Rejects hostnames resolving to private IPs (DNS rebinding protection)

### Input Validation
- All request bodies validated with Zod schemas before reaching controllers
- Validation errors return structured 400 responses

### Authorization
- `authenticate` middleware verifies JWT on all protected routes
- `projectAuth(role)` middleware verifies project membership and minimum role before any project-scoped operation
