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
| Research controller | `controllers/research.controller.ts` | ✅ | Start job + 9 data retrieval endpoints |
| Research routes | `routes/research.routes.ts` | ✅ | All routes mounted |
| Research schemas | `schemas/research.schema.ts` | ✅ | startResearch, copilotChat |
| ResearchJob model | `models/ResearchJob.ts` | ✅ | 11 stages, status enum |
| ResearchSource model | `models/ResearchSource.ts` | ✅ | Provider enum, compound indexes |
| EvidenceClaim model | `models/EvidenceClaim.ts` | ✅ | Multi-score system |
| ExistingSolution model | `models/ExistingSolution.ts` | ✅ | Features, strengths, limitations |
| InnovationGap model | `models/InnovationGap.ts` | ✅ | 8 categories, impact/difficulty |
| ActivityLog model | `models/ActivityLog.ts` | 🔨 | Model defined, NOT wired |

**Issues:**
- ⚠️ `startResearch` creates `ResearchJob` and updates `Project.status` but does NOT add to BullMQ queue (worker not implemented)
- ⚠️ Research jobs are created with status `queued` but nothing processes them

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
| Normalizer | `research/normalizer.ts` | ❌ | Not yet created |
| Provider registry | `providers/registry.ts` | ❌ | Not yet created |

**Issues:**
- ✅ ~~FIXED~~ Dead `.js` shadow files removed from all `src/` directories
- ⚠️ No registry to coordinate concurrent provider execution

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

### 3.10 Unimplemented Components

| Component | Status | Reference |
|---|---|---|
| Base agent | ❌ | `07_AI_AGENTS.md` |
| 8 research agents | ❌ | `07_AI_AGENTS.md` |
| Agent prompts | ❌ | `07_AI_AGENTS.md` |
| Research orchestrator | ❌ | `06_RESEARCH_ENGINE.md` |
| BullMQ queue + worker | ❌ | `10_BACKGROUND_WORKERS.md` |
| Socket.io server | ❌ | `09_WEBSOCKET.md` |
| RAG pipeline (chroma, chunker, embedder, retriever) | ❌ | `08_RAG_PIPELINE.md` |
| Conversation model | ❌ | `02_DATABASE_SCHEMA.md` |
| Notification model + routes | ❌ | `02_DATABASE_SCHEMA.md` |
| Copilot agent | ❌ | `07_AI_AGENTS.md` |
| Test suite | ❌ | `12_TESTING.md` |
| Frontend | ❌ | `16_FRONTEND_INTEGRATION.md` |
| Docker deployment | ❌ | `14_IMPLEMENTATION_PLAN.md` |

---

## 4. Build Status

| Check | Status | Notes |
|---|---|---|
| TypeScript compilation | ✅ Passes | `npx tsc --noEmit` → 0 errors |
| `npm run dev` / `npx tsx src/server.ts` | ✅ Passes | Server starts on port 5000 |
| `npm run build` | ✅ Passes | Same as above |
| `npm run worker` | 🐛 Fails | Worker file does not exist |
| `npm test` | ❌ | No test configuration or test files |

**Phase 0 complete:** Build fixed on 2026-07-30. `listConversations` stub added. Dead `.js` files removed.

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
