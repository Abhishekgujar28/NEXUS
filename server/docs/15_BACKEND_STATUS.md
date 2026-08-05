# 15 — Backend Status Audit

> **Scope:** Component-by-component status of every backend module — what is implemented, what is scaffolded, what is missing, and what has bugs or technical debt.
>
> **Last Updated:** 2026-07-30

---

## 1. Purpose

Provide a living audit of the NEXUS backend's implementation status. Before working on any component, check this document first to understand what exists, what's broken, and what needs to be built.

---

## 2. Status Legend

| Symbol | Meaning |
|---|---|
| ✅ | Fully implemented and functional |
| ⚠️ | Implemented with known issues or gaps |
| 🔨 | Partially implemented / scaffolded |
| ❌ | Not yet started |
| 🐛 | Has a known bug |

---

## 3. Component Status Matrix

### 3.1 Infrastructure Layer

| Component | File | Status | Notes |
|---|---|---|---|
| Entry point | `server.ts` | ✅ | Clean — no forward-imports, starts correctly |
| App factory | `app.ts` | ✅ | Middleware stack correct, routes mounted |
| Config | `core/config.ts` | ✅ | `validateConfig()`, typed config object, all env vars loaded |
| Database | `core/database.ts` | ✅ | Exponential backoff retry (5 attempts), graceful shutdown |
| Redis | `core/redis.ts` | ✅ | Non-fatal connection (server starts without Redis) |
| Logger | `core/logger.ts` | ✅ | Winston, JSON in prod, colorised in dev |
| Errors | `core/errors.ts` | ✅ | `AppError` class + `ErrorCodes` enum |

**Issues:**
- ✅ ~~FIXED~~ `server.ts` no longer has forward-imports. Build is clean.

---

### 3.2 Authentication

| Component | File | Status | Notes |
|---|---|---|---|
| Auth controller | `controllers/auth.controller.ts` | ✅ | register, login, logout, refresh, me |
| Auth middleware | `middleware/auth.middleware.ts` | ✅ | JWT verification, user attachment |
| JWT utilities | `utils/jwt.ts` | ✅ | generate, verify (access + refresh) |
| Auth schemas | `schemas/auth.schema.ts` | ✅ | register, login, refresh validation |
| Auth routes | `routes/auth.routes.ts` | ✅ | All 5 routes mounted correctly |
| User model | `models/User.ts` | ✅ | bcrypt, comparePassword, select:false |

**Issues:**
- ⚠️ Refresh token stored as plaintext in `User.refreshToken` field. Architecture spec says httpOnly cookie + Redis blacklist. Current implementation is functional but less secure.
- ⚠️ Single-session per user: new login overwrites refresh token, silently invalidating previous sessions.

---

### 3.3 Project Management

| Component | File | Status | Notes |
|---|---|---|---|
| Project controller | `controllers/project.controller.ts` | ✅ | All 8 handlers |
| Project auth middleware | `middleware/projectAuth.ts` | ✅ | Role hierarchy enforced |
| Project schemas | `schemas/project.schema.ts` | ✅ | create, update, addMember |
| Project routes | `routes/project.routes.ts` | ✅ | All routes mounted |
| Project model | `models/Project.ts` | ✅ | Full schema with indexes |
| ProjectMember model | `models/ProjectMember.ts` | ✅ | Compound unique index |

**Issues:**
- ⚠️ Controller duplicates `projectAuth` checks via internal `assertCanAccessProject()` (unnecessary DB queries)
- ⚠️ `problemUnderstanding` field is `Schema.Types.Mixed` — no type safety for architecture/roadmap data
- ⚠️ Soft-delete does not cascade (running jobs not cancelled, no cleanup)

---

### 3.4 Research Data Layer

| Component | File | Status | Notes |
|---|---|---|---|
| Research controller | `controllers/research.controller.ts` | ✅ | Start job + 9 data retrieval endpoints + `previewResearchSources` (Phase 3) |
| Research routes | `routes/research.routes.ts` | ✅ | All routes mounted, incl. `POST /preview` |
| Research schemas | `schemas/research.schema.ts` | ✅ | startResearch, previewResearch, copilotChat |
| ResearchJob model | `models/ResearchJob.ts` | ✅ | 11 stages, status enum |
| ResearchSource model | `models/ResearchSource.ts` | ✅ | Provider enum, compound indexes |
| EvidenceClaim model | `models/EvidenceClaim.ts` | ✅ | Multi-score system |
| ExistingSolution model | `models/ExistingSolution.ts` | ✅ | Features, strengths, limitations |
| InnovationGap model | `models/InnovationGap.ts` | ✅ | 8 categories, impact/difficulty |
| ActivityLog model | `models/ActivityLog.ts` | 🔨 | Model defined, NOT wired |

**Issues:**
- ✅ ~~FIXED~~ `startResearch` now enqueues the job onto the BullMQ `research` queue (`workers/researchQueue.ts`) after persisting it, with rollback to `failed` if enqueue fails (Phase 4).
- ✅ ~~FIXED~~ Queued research jobs are now consumed by the standalone worker (`workers/research.worker.ts`), which runs the Provider Registry, persists sources, and drives the job/project to a terminal state. AI-analysis stages are marked `skipped` until the agent/orchestrator phase.

---

### 3.5 Research Providers

| Component | File | Status | Notes |
|---|---|---|---|
| Provider interface | `providers/ResearchProvider.ts` | ✅ | `NormalizedSource` + `ResearchProvider` interface |
| Serper provider | `providers/serper.provider.ts` | ✅ | Web search, API key required |
| GitHub provider | `providers/github.provider.ts` | ✅ | Repo search, token optional |
| arXiv provider | `providers/arxiv.provider.ts` | ✅ | Paper search, XML parsing |
| Semantic Scholar provider | `providers/semanticScholar.provider.ts` | ✅ | Paper search, typed interfaces |
| Deduplicator | `research/deduplicator.ts` | ✅ | URL/title-based dedup |
| Normalizer | (per-provider) | ✅ | Each provider emits `NormalizedSource` directly — no separate normalizer module needed |
| Provider registry | `research/providerRegistry.ts` | ✅ | Concurrency + retry + timeout + failure isolation + merge + dedup |

**Issues:**
- ✅ ~~FIXED~~ Dead `.js` shadow files removed from all `src/` directories
- ✅ ~~FIXED~~ Provider Registry coordinates concurrent provider execution (Phase 3)
- ℹ️ Normalization is done inside each provider's `search()` (they return `NormalizedSource[]`), so a standalone `normalizer.ts` was intentionally not created — this avoids a redundant transformation layer.
- ℹ️ Providers refactored to **propagate** errors; resilience (retry/timeout/isolation) is owned centrally by the registry, not duplicated per provider.

---

### 3.5a Background Workers (Phase 4)

| Component | File | Status | Notes |
|---|---|---|---|
| Research queue (producer) | `workers/researchQueue.ts` | ✅ | BullMQ `Queue`, shared `research` queue name + `ResearchJobPayload`, `jobId` pinned to `researchJobId` for idempotency, exponential backoff, bounded history. Reuses app IORedis connection. |
| Research worker (consumer) | `workers/research.worker.ts` | ✅ | Standalone process. Runs Provider Registry, `insertMany` sources, marks search stages `completed` and AI stages `skipped`, drives job/project to terminal state. Dedicated IORedis (`maxRetriesPerRequest: null`), graceful SIGTERM/SIGINT shutdown, concurrency from config. |

**Issues:**
- ℹ️ AI-analysis stages (evidence/solutions/gaps/architecture/roadmap) are deliberately marked `skipped` — the agent/orchestrator/RAG phase is not yet implemented. They are NOT faked.
- ⚠️ Not yet verified by build/run in this environment (see Build Status).

---

### 3.6 AI Integration

| Component | File | Status | Notes |
|---|---|---|---|
| AI provider interface | `integrations/AIProvider.ts` | ✅ | `generate`, `generateStructured`, `embed` |
| Gemini implementation | `integrations/gemini.ts` | ✅ | All 3 methods with retry |
| `extractJson()` helper | `integrations/gemini.ts` | ✅ | Strips markdown fences |

**Issues:**
- None — this layer is solid

---

### 3.7 Copilot

| Component | File | Status | Notes |
|---|---|---|---|
| Copilot controller | `controllers/copilot.controller.ts` | ⚠️ | `chatWithCopilot` works; `getCopilotHistory` + `listConversations` return empty stubs |
| Copilot routes | `routes/copilot.routes.ts` | ✅ | All 3 routes mounted correctly |

**Issues:**
- ✅ ~~FIXED~~ `listConversations` export added as stub (returns empty array).
- ⚠️ `getCopilotHistory` returns hardcoded empty array
- ⚠️ No RAG context integration
- ⚠️ No conversation persistence
- ⚠️ No streaming (synchronous response)

---

### 3.8 Middleware

| Component | File | Status | Notes |
|---|---|---|---|
| Auth middleware | `middleware/auth.middleware.ts` | ✅ | JWT + user lookup |
| Project auth | `middleware/projectAuth.ts` | ✅ | Role hierarchy |
| Validation | `middleware/validate.middleware.ts` | ✅ | Zod parse + 400 response |
| Error handler | `middleware/errorHandler.middleware.ts` | ⚠️ | Works but may leak details in production |
| Rate limiter | `middleware/rateLimit.middleware.ts` | ✅ | 3 tiers (general/auth/research) |

---

### 3.9 Utilities

| Component | File | Status | Notes |
|---|---|---|---|
| asyncHandler | `utils/asyncHandler.ts` | ✅ | Promise wrapping for Express |
| JWT | `utils/jwt.ts` | ✅ | Generate + verify |
| Retry | `utils/retry.ts` | ✅ | Generic retry with exponential backoff |
| safeFetch | `utils/safeFetch.ts` | ✅ | SSRF protection with DNS pre-resolution |

---

### 3.10 AI Agents & Orchestrator

| Component | File | Status | Notes |
|---|---|---|---|
| Base agent | `agents/base.agent.ts` | ✅ | Abstract base agent with structured generation & error handling |
| 8 research agents | `agents/*.agent.ts` | ✅ | ProblemUnderstanding, QueryPlanner, DeepSearch, ResearchAnalysis, GapFinder, Critic, Architect, Roadmap |
| Agent prompts | `agents/prompts/*.prompt.ts` | ✅ | Typed system & user prompt templates for all 8 agents |
| Research orchestrator | `orchestrator/research.orchestrator.ts` | ✅ | Sequential execution of 8 agents, progress updates, MongoDB persistence |
| Copilot agent | `agents/copilot.agent.ts` | ✅ | Conversational AI agent for project context |
| Agent test endpoint | `controllers/research.controller.ts` | ✅ | `POST /research/:id/test-agent` for single-agent testing |

---

### 3.11 WebSocket Layer

| Component | File | Status | Notes |
|---|---|---|---|
| Socket.io server | `socket/socket.server.ts` | ✅ | Handshake JWT auth, room emission helpers, progress events |
| Socket handlers | `socket/handlers.ts` | ✅ | `project:join`, `project:leave`, user room management |

---

### 3.12 RAG Pipeline

| Component | File | Status | Notes |
|---|---|---|---|
| Chunker | `rag/chunker.ts` | ✅ | Sliding-window text chunker (chunkSize: 1200, overlap: 150) |
| Embedder | `rag/embedder.ts` | ✅ | Gemini float embeddings with batch processing |
| Vector Store | `rag/chroma.client.ts` | ✅ | ChromaDB client + MemoryVectorStore fallback |
| Retriever & Reranker | `rag/retriever.ts` | ✅ | Hybrid score (0.7 vector + 0.3 keyword overlap) |
| Pipeline Orchestrator | `rag/pipeline.ts` | ✅ | `indexResearchSources` & `assembleRagContext` with citations |

---

### 3.13 Copilot & Conversations

| Component | File | Status | Notes |
|---|---|---|---|
| Conversation model | `models/Conversation.ts` | ✅ | Multi-turn chat history with RAG citations |
| Copilot controller | `controllers/copilot.controller.ts` | ✅ | RAG context assembly, multi-turn history, listing & fetching |

---

### 3.14 Notifications

| Component | File | Status | Notes |
|---|---|---|---|
| Notification model | `models/Notification.ts` | ✅ | User notification schema with unread indexes |
| Notification controller | `controllers/notification.controller.ts` | ✅ | `listNotifications`, `markRead`, `markAllRead`, real-time Socket emission |
| Notification routes | `routes/notification.routes.ts` | ✅ | Mounted at `/api/v1/notifications` |

---

### 3.15 Test Suite

| Component | File | Status | Notes |
|---|---|---|---|
| Unit Test Suite | `tests/unit/*.test.ts` | ✅ | JWT, Retry, Deduplicator, Chunker, Retriever tests (100% pass) |
| Integration Test Suite | `tests/integration/*.test.ts` | ✅ | Health & Express API endpoint integration tests (100% pass) |

---

### 3.16 Remaining Components

| Component | Status | Reference |
|---|---|---|
| Frontend | ❌ | `16_FRONTEND_INTEGRATION.md` |
| Docker deployment | ❌ | `14_IMPLEMENTATION_PLAN.md` |

---

## 4. Build Status

| TypeScript compilation | ✅ Passes | `npx tsc --noEmit` → 0 errors |
| `npm run dev` / `npx tsx src/server.ts` | ✅ Verified | Server starts on port 5000 |
| `npm run build` | ✅ Passes | Clean build |
| `npm run worker` | ✅ Ready | `workers/research.worker.ts` invokes `ResearchOrchestrator` |
| `npm test` | ✅ Passes | `npm test` runs 17 unit & integration tests (100% pass rate) |

**Phase 0 complete:** Build fixed on 2026-07-30. `listConversations` stub added. Dead `.js` files removed.

**Phase 4 (2026-07-30):** BullMQ research queue (`workers/researchQueue.ts`) + standalone worker (`workers/research.worker.ts`) implemented; `startResearch` enqueues jobs with fallback.

**AI Agents & Orchestrator Phase (2026-07-30):** BaseAgent, 8 research agents + Copilot agent, prompt templates, ResearchOrchestrator, and `POST /test-agent` endpoint fully implemented & type checked cleanly (`npx tsc --noEmit` → 0 errors).

**WebSocket, RAG, Copilot & Notifications Phase (2026-07-30):** Socket.io server & handlers, RAG pipeline (chunker, embedder, ChromaDB/Memory store, hybrid reranker), multi-turn Conversation model & Copilot enhancement, and Notification system fully implemented, mounted, and verified via REST API tests (`npx tsc --noEmit` → 0 errors).

**Automated Test Suite Phase (2026-07-30):** Unit test suite (`tests/unit/`) & Integration test suite (`tests/integration/`) implemented and executing cleanly via `npm test` (`17 passed, 0 failed`).

---

## 5. Security Audit

| Finding | Severity | Status |
|---|---|---|
| `.env` contains real Gemini API key | 🔴 Critical | Must rotate before deployment |
| `.env` JWT secrets are public JWT examples | 🔴 Critical | Must replace with unique secrets |
| JWT secrets are identical | 🟡 Medium | `validateConfig` catches this in production |
| Refresh token in response body (not httpOnly cookie) | 🟡 Medium | Functional but less secure |
| Error handler may leak internal messages in production | 🟡 Medium | Needs generic 5xx message |
| `asyncHandler` coverage | 🟢 Low | Appears consistently applied |
| Rate limiting | 🟢 OK | 3 tiers configured |
| SSRF protection | 🟢 OK | safeFetch with DNS validation |
| Helmet security headers | 🟢 OK | Applied globally |
| CORS restriction | 🟢 OK | Restricted to FRONTEND_URL |

---

## 6. Technical Debt Inventory

| Item | Priority | Effort | Description |
|---|---|---|---|
| Remove dead `.js` files | P0 | 5 min | Delete `*.provider.js`, `deduplicator.js`, etc. |
| Fix `server.ts` imports | P0 | 30 min | Stub or remove non-existent module imports |
| Fix `copilot.routes.ts` import | P0 | 10 min | Add `listConversations` export or stub |
| Rotate `.env` secrets | P0 | 10 min | Generate new JWT secrets, rotate Gemini key |
| Type `problemUnderstanding` | P1 | 2 hrs | Replace `Mixed` with typed sub-schema |
| Remove duplicate auth checks | P1 | 1 hr | Remove `assertCanAccessProject()` from controllers |
| Production error masking | P1 | 30 min | Generic 5xx messages in production |
| Soft-delete cascade | P2 | 2 hrs | Cancel jobs, write activity log on delete |
| Multi-session support | P2 | 4 hrs | Array of refresh tokens or Session model |
| Cookie-based refresh | P2 | 2 hrs | httpOnly cookie for refresh token |

---

## 7. Dependency Versions

| Package | Version | Status |
|---|---|---|
| express | 4.19.2 | ✅ Current |
| mongoose | 8.4.4 | ✅ Current |
| jsonwebtoken | 9.0.2 | ✅ Current |
| bcryptjs | 2.4.3 | ✅ Current |
| zod | 3.23.8 | ✅ Current |
| bullmq | 5.7.0 | ✅ Current (unused) |
| socket.io | 4.7.5 | ✅ Current (unused) |
| chromadb | 1.8.1 | ✅ Current (unused) |
| @google/generative-ai | 0.21.0 | ✅ Current |
| ioredis | 5.4.1 | ✅ Current |
| winston | 3.13.0 | ✅ Current |
| helmet | 7.1.0 | ✅ Current |
| cors | 2.8.5 | ✅ Current |
| xml2js | 0.6.2 | ✅ Current |
| typescript | 5.4.5 | ✅ Current |
