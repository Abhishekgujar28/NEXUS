# NEXUS Implementation Plan

A 17-phase plan to build NEXUS — the AI-powered Research & Innovation Copilot. Phases are ordered by dependency; frontend phases (13–16) can run in parallel with backend phases where noted.

---

## Phase 1: Project Setup & Infrastructure

**Description:** Initialize the monorepo structure, configure TypeScript, ESLint, and set up the Express server skeleton with MongoDB and Redis connections.

**Files created:**
- `package.json`
- `tsconfig.json`
- `.eslintrc`
- `src/server.ts`
- `src/config/database.ts`
- `src/config/redis.ts`
- `src/middleware/errorHandler.ts`

**Dependencies:** None

**Estimated effort:** 1 day

---

## Phase 2: Authentication System

**Description:** Implement JWT authentication with register/login/logout/refresh flows, bcrypt password hashing, and auth middleware.

**Files created:**
- `src/models/User.ts`
- `src/controllers/auth.controller.ts`
- `src/routes/auth.routes.ts`
- `src/middleware/auth.ts`
- `src/utils/jwt.ts`

**Dependencies:** Phase 1

**Estimated effort:** 1 day

---

## Phase 3: Project Management

**Description:** CRUD operations for projects, project membership management, and project-level authorization middleware.

**Files created:**
- `src/models/Project.ts`
- `src/models/ProjectMember.ts`
- `src/controllers/project.controller.ts`
- `src/routes/project.routes.ts`
- `src/middleware/projectAuth.ts`

**Dependencies:** Phase 2

**Estimated effort:** 1 day

---

## Phase 4: Research Providers

**Description:** Implement search providers for web (Serper), GitHub, arXiv, and Semantic Scholar, plus the SSRF-safe fetch utility.

**Files created:**
- `src/providers/serper.provider.ts`
- `src/providers/github.provider.ts`
- `src/providers/arxiv.provider.ts`
- `src/providers/semanticScholar.provider.ts`
- `src/providers/index.ts`
- `src/utils/safeFetch.ts`

**Dependencies:** Phase 1

**Estimated effort:** 2 days

---

## Phase 5: AI Integration (Gemini Client)

**Description:** Gemini API client wrapper for text generation and embeddings, with retry logic and token counting.

**Files created:**
- `src/ai/gemini.client.ts`
- `src/ai/types.ts`

**Dependencies:** Phase 1

**Estimated effort:** 1 day

---

## Phase 6: Agent Prompts

**Description:** Write all system prompts and prompt templates for the 8 research agents and the copilot.

**Files created:**
- `src/agents/prompts/problemUnderstanding.prompt.ts`
- `src/agents/prompts/queryPlanner.prompt.ts`
- `src/agents/prompts/deepSearch.prompt.ts`
- `src/agents/prompts/researchAnalysis.prompt.ts`
- `src/agents/prompts/gapFinder.prompt.ts`
- `src/agents/prompts/critic.prompt.ts`
- `src/agents/prompts/architect.prompt.ts`
- `src/agents/prompts/roadmap.prompt.ts`
- `src/agents/prompts/copilot.prompt.ts`

**Dependencies:** Phase 5

**Estimated effort:** 2 days

---

## Phase 7: AI Agents

**Description:** Implement all 8 research agents plus the copilot agent as classes extending a shared base agent.

**Files created:**
- `src/agents/base.agent.ts`
- `src/agents/problemUnderstanding.agent.ts`
- `src/agents/queryPlanner.agent.ts`
- `src/agents/deepSearch.agent.ts`
- `src/agents/researchAnalysis.agent.ts`
- `src/agents/gapFinder.agent.ts`
- `src/agents/critic.agent.ts`
- `src/agents/architect.agent.ts`
- `src/agents/roadmap.agent.ts`
- `src/agents/copilot.agent.ts`

**Dependencies:** Phases 4, 5, 6

**Estimated effort:** 3 days

---

## Phase 8: Agent Orchestrator

**Description:** Orchestrator class that runs the agents in sequence, handles errors, and emits progress events.

**Files created:**
- `src/orchestrator/research.orchestrator.ts`

**Dependencies:** Phase 7

**Estimated effort:** 1 day

---

## Phase 9: RAG Pipeline

**Description:** ChromaDB integration, document chunking, embedding generation, similarity search, and context assembly.

**Files created:**
- `src/rag/chroma.client.ts`
- `src/rag/chunker.ts`
- `src/rag/embedder.ts`
- `src/rag/retriever.ts`
- `src/rag/pipeline.ts`

**Dependencies:** Phase 5

**Estimated effort:** 2 days

---

## Phase 10: Background Workers

**Description:** Bull queue setup, the research worker processor, and job lifecycle management.

**Files created:**
- `src/workers/queue.ts`
- `src/workers/research.worker.ts`
- `src/models/ResearchJob.ts`

**Dependencies:** Phases 8, 9

**Estimated effort:** 1 day

---

## Phase 11: WebSocket Layer

**Description:** Socket.io server with authenticated connections, room management, and progress event emission.

**Files created:**
- `src/socket/socket.server.ts`
- `src/socket/handlers.ts`

**Dependencies:** Phases 2, 10

**Estimated effort:** 1 day

---

## Phase 12: REST API Routes

**Description:** All research and copilot API routes, controllers, Zod validation schemas, and rate limiting middleware.

**Files created:**
- `src/controllers/research.controller.ts`
- `src/controllers/copilot.controller.ts`
- `src/routes/research.routes.ts`
- `src/routes/copilot.routes.ts`
- `src/schemas/research.schema.ts`
- `src/middleware/rateLimiter.ts`

**Dependencies:** Phases 3, 10, 11

**Estimated effort:** 2 days

---

## Phase 13: Frontend Foundation

**Description:** Vite + React + TypeScript setup, Tailwind CSS, React Router, and base layout components.

**Files created:**
- `frontend/package.json`
- `frontend/vite.config.ts`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/layouts/AppLayout.tsx`
- `frontend/src/layouts/AuthLayout.tsx`

**Dependencies:** None (can run in parallel with backend)

**Estimated effort:** 1 day

---

## Phase 14: Frontend State & Services

**Description:** Zustand stores, Axios API client, Socket.io client, and React Query setup.

**Files created:**
- `frontend/src/stores/auth.store.ts`
- `frontend/src/stores/project.store.ts`
- `frontend/src/services/api.ts`
- `frontend/src/services/socket.ts`
- `frontend/src/hooks/useResearch.ts`

**Dependencies:** Phase 13

**Estimated effort:** 2 days

---

## Phase 15: UI Components

**Description:** Reusable component library — buttons, forms, modals, cards, progress indicators, and research-specific cards.

**Files created:**
- `frontend/src/components/ui/Button.tsx`
- `frontend/src/components/ui/Input.tsx`
- `frontend/src/components/ui/Modal.tsx`
- `frontend/src/components/ui/Card.tsx`
- `frontend/src/components/ui/Badge.tsx`
- `frontend/src/components/ui/Spinner.tsx`
- `frontend/src/components/ui/ProgressBar.tsx`
- `frontend/src/components/research/SourceCard.tsx`
- `frontend/src/components/research/GapCard.tsx`
- `frontend/src/components/research/SolutionCard.tsx`
- `frontend/src/components/research/EvidenceCard.tsx`

**Dependencies:** Phase 13

**Estimated effort:** 2 days

---

## Phase 16: Feature Pages

**Description:** All application pages — auth (login/register), dashboard, project detail, research view (all tabs), and copilot chat.

**Files created:**
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/RegisterPage.tsx`
- `frontend/src/pages/DashboardPage.tsx`
- `frontend/src/pages/ProjectPage.tsx`
- `frontend/src/pages/ResearchPage.tsx`
- `frontend/src/pages/CopilotPage.tsx`

**Dependencies:** Phases 14, 15

**Estimated effort:** 3 days

---

## Phase 17: Docker & Deployment

**Description:** Dockerfiles for backend and frontend, docker-compose for the full stack (MongoDB, Redis, ChromaDB), and nginx reverse proxy configuration.

**Files created:**
- `Dockerfile` (backend)
- `frontend/Dockerfile`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `nginx/nginx.conf`
- `.dockerignore`

**Dependencies:** All previous phases

**Estimated effort:** 1 day

---

## Summary

| Phase | Name | Effort (days) | Cumulative |
|-------|------|--------------|------------|
| 1 | Project Setup & Infrastructure | 1 | 1 |
| 2 | Authentication System | 1 | 2 |
| 3 | Project Management | 1 | 3 |
| 4 | Research Providers | 2 | 5 |
| 5 | AI Integration (Gemini Client) | 1 | 6 |
| 6 | Agent Prompts | 2 | 8 |
| 7 | AI Agents | 3 | 11 |
| 8 | Agent Orchestrator | 1 | 12 |
| 9 | RAG Pipeline | 2 | 14 |
| 10 | Background Workers | 1 | 15 |
| 11 | WebSocket Layer | 1 | 16 |
| 12 | REST API Routes | 2 | 18 |
| 13 | Frontend Foundation | 1 | 19 |
| 14 | Frontend State & Services | 2 | 21 |
| 15 | UI Components | 2 | 23 |
| 16 | Feature Pages | 3 | 26 |
| 17 | Docker & Deployment | 1 | 27 |
| **Total** | | **28** | **~6 weeks** |

Note: total effort is approximately 28 person-days (~6 weeks for a single developer). With backend and frontend work parallelized across two developers, calendar time compresses to roughly 3–4 weeks.
