# 00 — NEXUS Master Specification

> **Version:** 1.0.0  
> **Last Updated:** 2026-07-30  
> **Status:** Living Document — canonical reference for all implementation  
> **Audience:** Every engineer, AI agent, or contractor who touches NEXUS code

---

## 1. Purpose

This document is the **single source of truth** for the NEXUS AI Research & Innovation Platform. Every future implementation — whether performed by a human or an AI agent — MUST conform to the architecture, conventions, and contracts defined here and in its companion documents (`01_SYSTEM_ARCHITECTURE.md` through `16_FRONTEND_INTEGRATION.md`).

---

## 2. Product Identity

| Attribute | Value |
|---|---|
| **Name** | NEXUS |
| **Tagline** | AI Research & Innovation Copilot |
| **Domain** | AI-assisted research automation, gap analysis, architecture design, and roadmap generation |
| **Core Value** | Autonomously research a problem space, identify existing solutions, find innovation gaps, design architecture, and generate actionable roadmaps — all backed by evidence from real sources |
| **Target Users** | Individual developers, startup founders, innovation teams, academic researchers |

---

## 3. Technology Stack

### 3.1 Backend (this repository: `server/`)

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Runtime | Node.js | ≥18 LTS | JavaScript runtime |
| Language | TypeScript | 5.4+ | Strict mode, ESM via `NodeNext` |
| Framework | Express | 4.19 | HTTP API layer |
| Database | MongoDB | via Mongoose 8 | Primary data store |
| Cache / Queue | Redis | via ioredis 5 | BullMQ job queue, caching, rate limiting |
| Vector Store | ChromaDB | via chromadb 1.8 | RAG embedding storage and retrieval |
| AI | Google Gemini | @google/generative-ai 0.21 | Text generation, structured output, embeddings |
| Validation | Zod | 3.23 | Request body validation |
| Auth | jsonwebtoken + bcryptjs | JWT 9 / bcrypt 2.4 | Access/refresh tokens, password hashing |
| Realtime | Socket.io | 4.7 | WebSocket progress + copilot streaming |
| Job Queue | BullMQ | 5.7 | Background research workers |
| HTTP Security | helmet + cors + express-rate-limit | Various | Header hardening, origin restriction, rate limiting |
| Logging | Winston | 3.13 | Structured JSON logging |
| SSRF Guard | Custom `safeFetch` | — | DNS pre-resolution + private IP blocking |
| XML Parsing | xml2js | 0.6 | arXiv API Atom/XML response parsing |

### 3.2 Frontend (planned: `frontend/`)

| Layer | Technology | Purpose |
|---|---|---|
| Framework | React + Vite + TypeScript | SPA with HMR |
| State | Zustand + React Query | Client state + server cache |
| Realtime | socket.io-client | WebSocket consumer |
| HTTP | Axios | API client |
| Routing | React Router v6 | Client-side routing |

### 3.3 Infrastructure

| Service | Purpose |
|---|---|
| MongoDB | Document persistence |
| Redis | Queue backbone, caching, rate limiting (shared store) |
| ChromaDB | Vector similarity search |
| Docker + docker-compose | Local development and production deployment |

---

## 4. Design Principles

1. **Interface-First**: Business logic depends on interfaces (`AIProvider`, `ResearchProvider`), never on concrete implementations. Providers can be swapped without touching pipeline code.
2. **Layered Architecture**: Strict request flow — `Routes → Middleware → Controllers → Services → Models/Integrations`. No layer may skip another.
3. **Fail-Fast Startup**: Missing critical configuration (JWT secrets, database URIs) causes immediate process termination with a descriptive error. No silent fallbacks.
4. **Defensive Error Handling**: All async controller handlers are wrapped in `asyncHandler()` to forward rejected promises to the central `errorHandler` middleware. Express 4 cannot do this natively.
5. **Schema-Validated Input**: Every mutation endpoint validates `req.body` through a Zod schema before the controller executes. No raw `req.body` access in controllers for mutations.
6. **Consistent Response Envelope**: All responses follow `{ success: true, data: {...} }` for success and `{ success: false, error: { message, code } }` for errors. No exceptions.
7. **Soft-Delete Over Hard-Delete**: Documents use status flags (`deleted`) rather than physical removal to maintain referential integrity.
8. **SSRF-Safe Outbound Requests**: All external HTTP calls go through `safeFetch()` which validates hostnames against private IP ranges before connecting.
9. **Role-Based Project Access**: Three-tier role model (`viewer < editor < owner`) enforced at the middleware level via `projectAuth(minimumRole)`.
10. **Background-First for Heavy Work**: AI-intensive operations (research pipelines) run in BullMQ workers, never in the HTTP request cycle.

---

## 5. Canonical Folder Structure

```
server/
├── package.json
├── tsconfig.json
├── .env                           # Local environment (never committed)
├── docs/                          # ← YOU ARE HERE — architecture docs
│   ├── 00_MASTER_SPEC.md
│   ├── 01_SYSTEM_ARCHITECTURE.md
│   ├── ... (16 more docs)
│   └── CLAUDE_RULES.md
├── src/
│   ├── server.ts                  # Entry point: validates config, connects DB/Redis, starts HTTP
│   ├── app.ts                     # Express app factory: middleware stack, route mounting
│   │
│   ├── core/                      # Infrastructure layer (no business logic)
│   │   ├── config.ts              # Environment loading + validateConfig()
│   │   ├── database.ts            # MongoDB connection with exponential backoff
│   │   ├── redis.ts               # ioredis client (lazy, non-fatal failure)
│   │   ├── logger.ts              # Winston: JSON in prod, colorised in dev
│   │   └── errors.ts              # AppError class + ErrorCodes enum
│   │
│   ├── types/                     # Global TypeScript declarations
│   │   └── express.d.ts           # Express.Request augmentation (user, auth, projectRole)
│   │
│   ├── middleware/                 # Express middleware
│   │   ├── auth.middleware.ts      # JWT verification → req.user
│   │   ├── projectAuth.ts          # Role-based project access guard
│   │   ├── validate.middleware.ts  # Zod schema validation
│   │   ├── errorHandler.middleware.ts  # Central error → JSON response
│   │   └── rateLimit.middleware.ts # general / research / auth rate limiters
│   │
│   ├── schemas/                   # Zod validation schemas
│   │   ├── auth.schema.ts          # register, login, refresh
│   │   ├── project.schema.ts       # createProject, updateProject, addMember
│   │   └── research.schema.ts      # startResearch, copilotChat
│   │
│   ├── models/                    # Mongoose models (MongoDB collections)
│   │   ├── User.ts                 # User accounts + bcrypt + comparePassword
│   │   ├── Project.ts              # Innovation projects + problemUnderstanding blob
│   │   ├── ProjectMember.ts        # User↔Project membership + role
│   │   ├── ResearchJob.ts          # Research pipeline lifecycle + stages
│   │   ├── ResearchSource.ts       # External sources discovered by providers
│   │   ├── EvidenceClaim.ts        # Synthesized claims with confidence scores
│   │   ├── ExistingSolution.ts     # Known competing products/implementations
│   │   ├── InnovationGap.ts        # Identified opportunities + impact/difficulty
│   │   └── ActivityLog.ts          # Audit trail (model exists, not wired)
│   │
│   ├── controllers/               # Request handlers (business logic)
│   │   ├── auth.controller.ts
│   │   ├── project.controller.ts
│   │   ├── research.controller.ts
│   │   └── copilot.controller.ts
│   │
│   ├── routes/                    # Express router definitions
│   │   ├── auth.routes.ts
│   │   ├── project.routes.ts
│   │   ├── research.routes.ts
│   │   └── copilot.routes.ts
│   │
│   ├── integrations/              # External service adapters
│   │   ├── AIProvider.ts           # Interface: generate, generateStructured, embed
│   │   └── gemini.ts               # GeminiProvider implementation + singleton
│   │
│   ├── research/                  # Research pipeline components
│   │   ├── deduplicator.ts         # URL/title-based cross-provider dedup
│   │   └── providers/              # Data source adapters
│   │       ├── ResearchProvider.ts  # Interface: NormalizedSource + search()
│   │       ├── serper.provider.ts   # Web search via Serper API
│   │       ├── github.provider.ts   # GitHub repository search
│   │       ├── arxiv.provider.ts    # arXiv academic paper search
│   │       └── semanticScholar.provider.ts  # Semantic Scholar paper search
│   │
│   ├── utils/                     # Shared utilities
│   │   ├── asyncHandler.ts         # Promise.resolve(fn(...)).catch(next)
│   │   ├── jwt.ts                  # Token generation + verification
│   │   ├── retry.ts                # Generic retry with exponential backoff
│   │   └── safeFetch.ts            # SSRF-guarded outbound HTTP
│   │
│   ├── agents/                    # [PLANNED] AI agent implementations
│   │   ├── base.agent.ts
│   │   ├── prompts/               # System prompts for each agent
│   │   └── *.agent.ts             # 8 research agents + copilot agent
│   │
│   ├── orchestrator/              # [PLANNED] Research pipeline coordinator
│   │   └── research.orchestrator.ts
│   │
│   ├── workers/                   # [PLANNED] BullMQ background processors
│   │   ├── queue.ts               # Queue definition + connection
│   │   └── research.worker.ts     # Job processor
│   │
│   ├── rag/                       # [PLANNED] RAG pipeline
│   │   ├── chroma.client.ts       # ChromaDB connection
│   │   ├── chunker.ts             # Document chunking
│   │   ├── embedder.ts            # Embedding generation
│   │   ├── retriever.ts           # Similarity search + reranking
│   │   └── pipeline.ts            # End-to-end query→context→generation
│   │
│   └── socket/                    # [PLANNED] WebSocket layer
│       ├── socket.server.ts       # Socket.io server + auth
│       └── handlers.ts            # Event handlers + room management
│
└── dist/                          # TypeScript compilation output
```

---

## 6. Naming Conventions

| Category | Convention | Example |
|---|---|---|
| Files | `camelCase` with purpose suffix | `auth.controller.ts`, `auth.routes.ts` |
| Models | `PascalCase`, singular | `User.ts`, `ResearchJob.ts` |
| Schemas | `camelCase` with `.schema.ts` suffix | `auth.schema.ts` |
| Middleware | `camelCase` with `.middleware.ts` suffix | `auth.middleware.ts` |
| Providers | `camelCase` with `.provider.ts` suffix | `serper.provider.ts` |
| Interfaces | `PascalCase` | `AIProvider`, `ResearchProvider` |
| Controllers | Named exports, `async` functions | `export const login = async (req, res) => {}` |
| Routes | `Router()` instances, default export | `export default router;` |
| Environment | `SCREAMING_SNAKE_CASE` | `JWT_SECRET`, `MONGODB_URI` |
| DB Fields | `camelCase` | `projectId`, `userId`, `refreshToken` |
| API Paths | `kebab-case` or `camelCase` nouns | `/api/v1/auth/me`, `/api/v1/research/:id/stresstest` |
| Error Codes | `SCREAMING_SNAKE_CASE` | `VALIDATION_ERROR`, `UNAUTHORIZED` |

---

## 7. Import Conventions

- **ESM with `.js` extensions**: TypeScript is compiled with `module: NodeNext`. All relative imports MUST use `.js` extension (e.g., `import { config } from './core/config.js'`).
- **No default imports for utilities**: Use named exports. Default exports are reserved for Mongoose models and route routers.
- **Interface-only imports use `type`**: `import type { NormalizedSource } from './ResearchProvider.js'`.

---

## 8. Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | Runtime environment |
| `PORT` | No | `5000` | HTTP server port |
| `FRONTEND_URL` | No | `http://localhost:5173` | CORS allowed origin |
| `MONGODB_URI` | Yes (implicit) | `mongodb://localhost:27017/nexus` | MongoDB connection string |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | **Yes** | — | Access token signing key |
| `JWT_REFRESH_SECRET` | **Yes** | — | Refresh token signing key |
| `JWT_EXPIRES_IN` | No | `15m` | Access token TTL |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token TTL |
| `GEMINI_API_KEY` | No* | — | Google Gemini API key (*required for AI features) |
| `SERPER_API_KEY` | No | — | Serper web search API key |
| `GITHUB_TOKEN` | No | — | GitHub personal access token |
| `SEMANTIC_SCHOLAR_API_KEY` | No | — | Semantic Scholar API key |
| `CHROMA_URL` | No | `http://localhost:8000` | ChromaDB server URL |
| `VECTOR_STORE` | No | `memory` | Vector store backend: `memory` or `chroma` |
| `RAG_CHUNK_SIZE` | No | `1200` | RAG chunk size in characters |
| `RAG_CHUNK_OVERLAP` | No | `150` | RAG chunk overlap in characters |
| `RAG_TOP_K` | No | `8` | RAG retrieval top-K results |
| `RAG_MAX_CONTEXT_CHARS` | No | `12000` | Max context chars for RAG assembly |
| `RESEARCH_WORKER_CONCURRENCY` | No | `2` | Concurrent research jobs per worker |
| `RESEARCH_JOB_ATTEMPTS` | No | `2` | Max retry attempts per research job |
| `PROVIDER_TIMEOUT_MS` | No | `15000` | Per-provider search timeout |
| `MAX_SOURCES_PER_PROVIDER` | No | `10` | Max results per provider per query |
| `COPILOT_HISTORY_WINDOW` | No | `10` | Conversation history window size |

---

## 9. Cross-Cutting Concerns

### 9.1 Error Handling
All errors flow through `AppError` → `errorHandler` middleware. See `11_SECURITY.md` §Error Handling for the full contract.

### 9.2 Logging
Winston logger with structured JSON in production, colorised console in development. All 5xx errors are logged with stack traces. See `01_SYSTEM_ARCHITECTURE.md` §Observability.

### 9.3 Security
Twelve-layer security model. See `11_SECURITY.md` for the complete security architecture.

### 9.4 Testing
Test pyramid: unit → integration → E2E. See `12_TESTING.md` for the strategy.

---

## 10. Document Index

| # | Document | Scope |
|---|---|---|
| 00 | `00_MASTER_SPEC.md` | This file — canonical reference |
| 01 | `01_SYSTEM_ARCHITECTURE.md` | Component diagram, layers, data flow, observability |
| 02 | `02_DATABASE_SCHEMA.md` | All MongoDB collections, indexes, relationships |
| 03 | `03_API_SPECIFICATION.md` | Complete REST API reference |
| 04 | `04_AUTH_FLOW.md` | Authentication and authorization flows |
| 05 | `05_PROJECT_FLOW.md` | Project lifecycle and membership management |
| 06 | `06_RESEARCH_ENGINE.md` | Research pipeline stages and data flow |
| 07 | `07_AI_AGENTS.md` | Agent architecture, prompts, orchestration |
| 08 | `08_RAG_PIPELINE.md` | Retrieval-Augmented Generation pipeline |
| 09 | `09_WEBSOCKET.md` | Socket.io events, rooms, authentication |
| 10 | `10_BACKGROUND_WORKERS.md` | BullMQ queue, worker lifecycle, error recovery |
| 11 | `11_SECURITY.md` | Complete security architecture |
| 12 | `12_TESTING.md` | Testing strategy, coverage targets |
| 13 | `13_POSTMAN_COLLECTION.md` | API testing collection reference |
| 14 | `14_IMPLEMENTATION_PLAN.md` | Phased implementation roadmap |
| 15 | `15_BACKEND_STATUS.md` | Current status audit of every component |
| 16 | `16_FRONTEND_INTEGRATION.md` | Frontend ↔ backend integration guide |
| — | `CLAUDE_RULES.md` | Rules for AI agents working on this codebase |

---

## 11. Version History

| Version | Date | Author | Changes |
|---|---|---|---|
| 1.0.0 | 2026-07-30 | NEXUS Architecture Team | Initial comprehensive documentation suite |
