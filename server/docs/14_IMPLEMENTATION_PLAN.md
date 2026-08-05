# 14 — Implementation Plan

> **Scope:** Phased implementation roadmap — ordered by dependency, with effort estimates, deliverables, acceptance criteria, and the critical path from current state to production readiness.

---

## 1. Purpose

Provide a sequenced, dependency-aware implementation plan that takes NEXUS from its current partially-implemented state to a fully functional platform. Each phase has clear deliverables and acceptance criteria so that any engineer or AI agent can execute them independently.

---

## 2. Current State Summary

| Component | Status | Key Files |
|---|---|---|
| Express server + config | ✅ Complete | `server.ts`, `app.ts`, `core/*` |
| Authentication (register/login/logout/refresh/me) | ✅ Complete | `auth.controller.ts`, `auth.middleware.ts` |
| Project CRUD + membership | ✅ Complete | `project.controller.ts`, `projectAuth.ts` |
| Research endpoints (start + data retrieval) | ✅ Complete | `research.controller.ts` |
| Copilot chat (basic, no RAG) | ✅ Complete | `copilot.controller.ts` |
| Zod validation schemas | ✅ Complete | `schemas/*.ts` |
| Error handling + AppError | ✅ Complete | `core/errors.ts`, `errorHandler.middleware.ts` |
| Gemini AI provider | ✅ Complete | `integrations/gemini.ts` |
| Research providers (Serper, GitHub, arXiv, Semantic Scholar) | ✅ Complete | `research/providers/*.ts` |
| Source deduplication | ✅ Complete | `research/deduplicator.ts` |
| `safeFetch` SSRF protection | ✅ Complete | `utils/safeFetch.ts` |
| Provider registry | ❌ Not started | Planned: `providers/registry.ts` |
| Source normalizer | ❌ Not started | Planned: `research/normalizer.ts` |
| AI agents (8 research + copilot) | ❌ Not started | Planned: `agents/*.ts` |
| Research orchestrator | ❌ Not started | Planned: `orchestrator/research.orchestrator.ts` |
| BullMQ worker | ❌ Not started | Planned: `workers/*.ts` |
| RAG pipeline | ❌ Not started | Planned: `rag/*.ts` |
| WebSocket (Socket.io) | ❌ Not started | Planned: `socket/*.ts` |
| Conversation persistence | ❌ Not started | Planned: `models/Conversation.ts` |
| Notification system | ❌ Not started | Planned: `models/Notification.ts` |
| ActivityLog wiring | ❌ Not started | Model exists, not used |
| Tests | ❌ Not started | Planned: `tests/` |
| Frontend | ❌ Not started | Planned: `frontend/` |

---

## 3. Phase Plan

### Phase 1 — Provider Registry + Normalizer (Days 1-2)

**Goal:** Complete the research data acquisition layer.

**Deliverables:**
| File | Description |
|---|---|
| `src/research/normalizer.ts` | Map raw provider results to `ResearchSource` fields |
| `src/research/providers/registry.ts` | Provider instantiation, concurrent search, timeout, dedup |

**Acceptance Criteria:**
- [ ] `ProviderRegistry.search(query)` calls all configured providers concurrently
- [ ] Each provider is wrapped in `retry()` with `providerTimeoutMs` timeout
- [ ] Failed providers return `[]` without failing the registry
- [ ] Results are deduplicated via `deduplicateSources()`
- [ ] `normalizeSource()` maps `NormalizedSource` → `ResearchSource` model fields
- [ ] Unit tests pass for registry and normalizer

**Dependencies:** None (providers already exist)

---

### Phase 2 — AI Agent Framework (Days 3-5)

**Goal:** Implement the base agent and all 8 research agents.

**Deliverables:**
| File | Description |
|---|---|
| `src/agents/base.agent.ts` | Abstract base with `execute()`, `buildPrompt()`, `getSystemPrompt()` |
| `src/agents/prompts/*.prompt.ts` | System prompts for all 9 agents |
| `src/agents/problemUnderstanding.agent.ts` | Stage 1: Idea decomposition |
| `src/agents/queryPlanner.agent.ts` | Stage 2: Search query generation |
| `src/agents/deepSearch.agent.ts` | Stage 3: Multi-provider search |
| `src/agents/researchAnalysis.agent.ts` | Stage 4: Evidence extraction |
| `src/agents/gapFinder.agent.ts` | Stage 5: Gap identification |
| `src/agents/critic.agent.ts` | Stage 6: Stress testing |
| `src/agents/architect.agent.ts` | Stage 7: Architecture design |
| `src/agents/roadmap.agent.ts` | Stage 8: Roadmap generation |

**Acceptance Criteria:**
- [ ] Each agent extends `BaseAgent<TInput, TOutput>`
- [ ] Each agent uses `generateStructured<T>()` for typed output
- [ ] Each agent has a dedicated system prompt
- [ ] `DeepSearchAgent` uses `ProviderRegistry` (from Phase 1)
- [ ] Unit tests verify prompt building and output parsing
- [ ] All agents handle Gemini errors gracefully

**Dependencies:** Phase 1

---

### Phase 3 — Research Orchestrator (Day 6)

**Goal:** Sequence agents and manage pipeline state.

**Deliverables:**
| File | Description |
|---|---|
| `src/orchestrator/research.orchestrator.ts` | Sequential agent execution, progress tracking, error handling |

**Acceptance Criteria:**
- [ ] Orchestrator runs all 8 agents in sequence
- [ ] Each stage updates `ResearchJob.stages[].status`
- [ ] Each stage updates `ResearchJob.progress`
- [ ] Critical stage failure → job fails
- [ ] Non-critical stage failure → skip and continue
- [ ] `cancelRequested` check between stages
- [ ] Each agent's output is persisted to the correct model/field

**Dependencies:** Phase 2

---

### Phase 4 — WebSocket Layer (Day 7)

**Goal:** Real-time progress and events.

**Deliverables:**
| File | Description |
|---|---|
| `src/socket/socket.server.ts` | Socket.io server, auth middleware, room management |
| `src/socket/handlers.ts` | Event handlers for join/leave/progress |

**Acceptance Criteria:**
- [ ] Socket.io server attaches to HTTP server
- [ ] JWT authentication on handshake
- [ ] `project:join` / `project:leave` with access check
- [ ] `research:progress`, `research:complete`, `research:failed` events emitted
- [ ] Events scoped to project rooms
- [ ] Fix `server.ts` forward-import (`initRealtime` / `shutdownRealtime`)

**Dependencies:** None (can parallel with Phase 2-3)

---

### Phase 5 — BullMQ Workers (Day 8)

**Goal:** Background job processing.

**Deliverables:**
| File | Description |
|---|---|
| `src/workers/queue.ts` | Queue definition with Redis connection |
| `src/workers/research.worker.ts` | Worker entry point, job processor |

**Acceptance Criteria:**
- [ ] Worker starts as separate process (`npm run worker`)
- [ ] Worker connects to MongoDB + Redis
- [ ] Worker processes `research` queue jobs
- [ ] Worker calls `ResearchOrchestrator.run()`
- [ ] Progress events emitted via Redis pub/sub → Socket.io
- [ ] Stalled job detection and retry
- [ ] Graceful shutdown on SIGTERM
- [ ] Fix `server.ts` forward-import (`startResearchWorker`)
- [ ] Update `research.controller.ts` `startResearch` to add job to queue

**Dependencies:** Phases 3, 4

---

### Phase 6 — RAG Pipeline (Days 9-10)

**Goal:** Context-aware copilot with research data.

**Deliverables:**
| File | Description |
|---|---|
| `src/rag/chroma.client.ts` | ChromaDB connection + collection management |
| `src/rag/chunker.ts` | Sliding-window document chunking |
| `src/rag/embedder.ts` | Batch embedding generation |
| `src/rag/retriever.ts` | Vector search + hybrid reranking |
| `src/rag/pipeline.ts` | End-to-end query → context → generation |

**Acceptance Criteria:**
- [ ] Sources chunked with configurable size/overlap
- [ ] Chunks embedded via Gemini `text-embedding-004`
- [ ] Chunks stored in ChromaDB (or memory fallback)
- [ ] Retrieval returns top-K relevant chunks for a query
- [ ] Hybrid reranking (vector + keyword)
- [ ] Context assembly respects `maxContextChars`
- [ ] RAG indexing triggered after research completes
- [ ] Memory fallback works when ChromaDB is unavailable

**Dependencies:** Phase 5 (triggers indexing after research)

---

### Phase 7 — Copilot Enhancement (Day 11)

**Goal:** Upgrade copilot with RAG, history, and streaming.

**Deliverables:**
| File | Description |
|---|---|
| `src/models/Conversation.ts` | Conversation document schema |
| `src/agents/copilot.agent.ts` | Full copilot agent with RAG + history |
| Update `copilot.controller.ts` | Use new agent, persist conversations |

**Acceptance Criteria:**
- [ ] Conversation model stores message history
- [ ] Copilot retrieves RAG context before generation
- [ ] Copilot includes conversation history (last N messages)
- [ ] Copilot streams tokens via Socket.io
- [ ] `GET /copilot/:id/history` returns real conversation data
- [ ] `GET /copilot/:id/conversations` returns conversation list
- [ ] Fix `listConversations` import in `copilot.routes.ts`

**Dependencies:** Phases 4, 6

---

### Phase 8 — Notifications + Activity Log (Day 12)

**Goal:** User notifications and audit trail.

**Deliverables:**
| File | Description |
|---|---|
| `src/models/Notification.ts` | Notification document schema |
| `src/controllers/notification.controller.ts` | CRUD for notifications |
| `src/routes/notification.routes.ts` | Notification endpoints |
| Wire `ActivityLog` writes | Into auth, project, research controllers |

**Acceptance Criteria:**
- [ ] Notifications created on research complete/fail, member added
- [ ] Notifications delivered via Socket.io `notification:new`
- [ ] `GET /notifications` with read/unread filtering
- [ ] `PUT /notifications/:id/read` marks as read
- [ ] ActivityLog entries written for all key operations

**Dependencies:** Phase 4

---

### Phase 9 — Reliability + Hardening (Days 13-14)

**Goal:** Production-ready error handling and security.

**Deliverables:**
- Generic error messages for 5xx in production
- `asyncHandler` audit (verify all routes wrapped)
- Cookie-based refresh tokens (httpOnly, Secure, SameSite)
- `trust proxy` configuration for load balancers
- Health check depth (DB + Redis + ChromaDB status)
- Remove dead `.js` shadow files
- Rotate checked-in secrets in `.env`

**Acceptance Criteria:**
- [ ] No internal error details leaked in production responses
- [ ] All async controllers wrapped in `asyncHandler`
- [ ] Refresh tokens in httpOnly cookies
- [ ] Health check reports infrastructure status
- [ ] No dead files in `src/`
- [ ] `.env` has placeholder values, real secrets in `.env.local`

**Dependencies:** All prior phases

---

### Phase 10 — Test Suite (Days 15-17)

**Goal:** Comprehensive test coverage.

**Deliverables:**
- Unit tests for all utils, middleware, models
- Integration tests for all API endpoints
- Provider tests with MSW mocks
- E2E test for full user journey
- CI pipeline configuration

**Acceptance Criteria:**
- [ ] Overall coverage ≥ 80%
- [ ] All tests pass in CI
- [ ] No flaky tests
- [ ] Coverage report generated

**Dependencies:** All prior phases

---

### Phase 11 — Frontend Foundation (Days 18-20)

**Goal:** React SPA with routing and state management.

*(See `16_FRONTEND_INTEGRATION.md` for details)*

**Dependencies:** None (parallel with backend phases)

---

### Phase 12 — Docker + Deployment (Days 21-22)

**Goal:** Containerized deployment.

**Deliverables:**
- `Dockerfile` (backend)
- `docker-compose.yml` (full stack: API, Worker, MongoDB, Redis, ChromaDB)
- `docker-compose.prod.yml` (production with Nginx)
- `.dockerignore`

**Dependencies:** All prior phases

---

## 4. Timeline Summary

| Phase | Name | Duration | Start After |
|---|---|---|---|
| 1 | Provider Registry + Normalizer | 2 days | — |
| 2 | AI Agent Framework | 3 days | Phase 1 |
| 3 | Research Orchestrator | 1 day | Phase 2 |
| 4 | WebSocket Layer | 1 day | — (parallel) |
| 5 | BullMQ Workers | 1 day | Phases 3, 4 |
| 6 | RAG Pipeline | 2 days | Phase 5 |
| 7 | Copilot Enhancement | 1 day | Phases 4, 6 |
| 8 | Notifications + Activity | 1 day | Phase 4 |
| 9 | Reliability + Hardening | 2 days | All prior |
| 10 | Test Suite | 3 days | All prior |
| 11 | Frontend Foundation | 3 days | — (parallel) |
| 12 | Docker + Deployment | 2 days | All prior |
| **Total** | | **~22 days** | **~5 weeks** |

---

## 5. Critical Path

```
Phase 1 → Phase 2 → Phase 3 → Phase 5 → Phase 6 → Phase 7 → Phase 9 → Phase 10
                                  ↑
                           Phase 4 (parallel)
```

The longest path is **Phase 1→2→3→5→6→7→9→10** at approximately 15 working days.

---

## 6. Risk Register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Gemini API rate limits | Medium | High | Implement aggressive caching, use free-tier providers |
| ChromaDB stability | Low | Medium | Memory fallback, graceful degradation |
| BullMQ/Redis failures | Low | High | Retry logic, stalled job detection |
| Complex prompt engineering | High | Medium | Iterative prompt tuning, test with diverse inputs |
| Token context limits | Medium | Medium | Batched processing, content truncation |
| Scope creep | High | Medium | Strict acceptance criteria per phase |

---

## 7. Build Integrity Issues to Resolve

These must be fixed in Phase 5 or earlier:

| Issue | File | Resolution |
|---|---|---|
| Forward-import `initRealtime`/`shutdownRealtime` | `server.ts` | Create in Phase 4 |
| Forward-import `startResearchWorker` | `server.ts` | Create in Phase 5 |
| Import `listConversations` | `copilot.routes.ts` | Create in Phase 7 |
| Dead `.js` shadow files | `src/research/providers/` | Manual deletion |
