# NEXUS Backend Audit

**Audit date:** 2026-07-29
**Scope:** `server/` backend only (read-only inspection). No code was written, modified, or executed against a database.
**Sources reviewed:** `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md`, `package.json`, `tsconfig.json`, and all `src/**` source code. (`README.md` does not exist in the repository; `.env.example` and `.gitignore` live at the `nexus/` root, outside the connected `server/` folder, and could not be read.)

---

## 1. Executive Summary

The NEXUS backend is a TypeScript + Express + Mongoose application with a clean, conventional layout (core / middleware / models / schemas / controllers / routes / utils / integrations). Contrary to the framing of the request, **Project Management (Phase 3) is already substantially implemented**, along with authentication (Phase 2), the infrastructure skeleton (Phase 1), and thin, stubbed versions of the research and copilot REST surfaces.

However, the codebase is **not stable enough to safely build new features on top of yet**, for three reasons:

1. **A codebase-wide async error-handling bug.** Every controller `throw`s `AppError` inside `async` functions that are registered directly on Express 4 routes with no async wrapper. Express 4 does **not** forward rejected promises to the error handler, so every error path (invalid login, duplicate email, not-found, forbidden, conflict) results in an unhandled promise rejection and a hung request instead of a clean JSON error. Happy paths work; error paths do not.
2. **Insecure auth defaults and a design divergence.** JWT signing secrets fall back to hardcoded strings, there is no startup validation, and the refresh-token mechanism documented in `ARCHITECTURE.md` (httpOnly cookies + Redis rotation/blacklist) is **not** what was built — tokens are returned in the JSON body and stored as a single plaintext field on the user.
3. **Heavy duplication / dead code.** Almost every module exists twice — a legacy `.js` copy and the live `.ts` file — and several `.ts` modules (research providers, `ActivityLog`) are orphaned. This creates a real risk of editing the wrong file.

The AI/research engine that defines the product (agents, orchestrator, RAG, background workers, WebSockets, notifications) is **entirely absent** despite its dependencies (`bullmq`, `chromadb`, `socket.io`, `ioredis`) being installed. The research endpoints create job records that nothing ever processes.

**Bottom line:** the foundation is architecturally sound but has correctness and security landmines. Fix the async-handler bug, the JWT-secret handling, and the refresh-token strategy, and remove the duplicate `.js` tree *before* extending features. Project Management does not need to be built from scratch — it needs hardening and validation gaps closed.

---

## 2. Current Backend Architecture

- **Runtime / language:** Node.js, TypeScript (ESM, `module: NodeNext`, `strict: true`), run in dev via `tsx watch src/server.ts`; production build via `tsc` to `dist/`.
- **Framework:** Express 4.19.
- **Data store:** MongoDB via Mongoose 8. A `connectDB` helper retries with exponential backoff (5 attempts).
- **Cache/queue (declared, not used):** Redis via `ioredis` (lazy connect, failure is non-fatal). No code reads or writes Redis beyond connecting.
- **AI:** Google Gemini via `@google/generative-ai`, wrapped behind an `AIProvider` interface (`generate`, `generateStructured`, `embed`) with retry logic. Model: `gemini-1.5-flash`; embeddings `text-embedding-004`.
- **Validation:** Zod schemas via a `validate(schema)` middleware (validates `req.body` only).
- **Security middleware:** `helmet()` (defaults), `cors()` restricted to `FRONTEND_URL` with credentials, `express-rate-limit` (in-memory), an SSRF-guarded `safeFetch`.
- **Logging:** Winston (JSON in prod, colourised in dev).
- **Error handling:** Central `errorHandler` Express error middleware + an `AppError` class with an `ErrorCodes` enum.

**Request flow:** `server.ts` → helmet → cors → morgan → json/urlencoded → general rate limiter → route routers (`/api/v1/auth`, `/api/v1/projects`, `/api/v1/research/:id`, `/api/v1/copilot/:id`) → 404 fallthrough → `errorHandler`.

**Not wired in (despite being planned/declared):** Socket.io server, BullMQ queue/worker, ChromaDB client, AI agents, orchestrator, RAG pipeline, cookie parsing, notifications, conversation persistence.

---

## 3. Existing Folder Structure

Live TypeScript source (the code that actually runs):

```
server/
├── package.json                     # scripts reference a non-existent worker file
├── tsconfig.json
├── docs/
│   ├── ARCHITECTURE.md
│   └── IMPLEMENTATION_PLAN.md
└── src/
    ├── server.ts                    # entry point
    ├── core/
    │   ├── config.ts                # env config (hardcoded secret fallbacks)
    │   ├── database.ts              # Mongo connect + retry
    │   ├── redis.ts                 # ioredis client (connected, otherwise unused)
    │   ├── logger.ts                # winston
    │   └── errors.ts                # AppError + ErrorCodes
    ├── types/
    │   └── express.d.ts             # Request augmentation (user, auth, projectRole)
    ├── middleware/
    │   ├── auth.middleware.ts       # verifyAuth (Bearer token)
    │   ├── projectAuth.ts           # projectAuth(role) membership check
    │   ├── validate.middleware.ts   # Zod body validation
    │   ├── errorHandler.middleware.ts
    │   └── rateLimit.middleware.ts  # general/research/auth limiters (in-memory)
    ├── schemas/
    │   ├── auth.schema.ts
    │   ├── project.schema.ts
    │   └── research.schema.ts       # startResearch + copilotChat schemas
    ├── models/
    │   ├── User.ts
    │   ├── Project.ts
    │   ├── ProjectMember.ts
    │   ├── ResearchJob.ts
    │   ├── ResearchSource.ts
    │   ├── EvidenceClaim.ts
    │   ├── ExistingSolution.ts
    │   ├── InnovationGap.ts
    │   └── ActivityLog.ts           # ORPHANED — never imported
    ├── controllers/
    │   ├── auth.controller.ts
    │   ├── project.controller.ts
    │   ├── research.controller.ts   # creates jobs; no processor
    │   └── copilot.controller.ts    # calls Gemini synchronously; history stubbed
    ├── routes/
    │   ├── auth.routes.ts
    │   ├── project.routes.ts
    │   ├── research.routes.ts
    │   └── copilot.routes.ts
    ├── integrations/
    │   ├── AIProvider.ts            # interface
    │   └── gemini.ts                # GeminiProvider (live singleton `aiProvider`)
    ├── utils/
    │   ├── jwt.ts
    │   ├── retry.ts
    │   └── safeFetch.ts             # SSRF guard
    └── research/
        └── providers/
            ├── ResearchProvider.ts  # interface
            ├── serper.provider.ts   # ORPHANED — not wired to anything
            ├── github.provider.ts   # ORPHANED
            └── arxiv.provider.ts    # ORPHANED
```

**Legacy/dead duplicate `.js` tree (shadow copies, not compiled or run):**
`core/{config,database,redis,logger,errors}.js`, `utils/{jwt,response,retry,safeFetch}.js`, `middleware/{auth,validate,errorHandler,rateLimit}.middleware.js`, `schemas/{auth,project,research}.schema.js`, `models/{User,Project,ProjectMember,ResearchJob,ResearchSource,EvidenceClaim}.js`, `research/providers/{webSearch,github,arxiv,semanticScholar}.provider.js`, `research/{normalizer,deduplicator}.js`.

Notes:
- `utils/response.js` exists only as `.js` and is imported by nothing → dead.
- `research/normalizer.js`, `research/deduplicator.js`, and `semanticScholar.provider.js` exist **only** as `.js` (no `.ts`) → not part of the live codebase.
- **Missing directories that the plan expects:** `workers/`, `socket/`, `agents/`, `orchestrator/`, `rag/`, and any tests dir. Phase 1 planned `src/config/` but the code uses `src/core/`.

---

## 4. Authentication Audit

Implementation lives in `auth.controller.ts`, `auth.routes.ts`, `utils/jwt.ts`, `middleware/auth.middleware.ts`, `models/User.ts`, `schemas/auth.schema.ts`.

| Concern | Status | Detail |
|---|---|---|
| **Register** | Partial | `POST /register` checks for existing email (409 on conflict), creates user, issues access + refresh tokens, persists refresh token on the user, returns 201. Duplicate-email error path is broken by the async-throw bug (see §7). |
| **Login** | Partial | `POST /login` looks up by email, `comparePassword` via bcrypt, issues tokens. Correct generic "Invalid email or password" for both unknown-email and bad-password (no user enumeration). Error path hangs due to async-throw bug. |
| **Logout** | Partial / weak | `POST /logout` is **not authenticated** and only revokes if the client sends `refreshToken` in the body; it finds the user by that token and blanks it. If the body is omitted, nothing is revoked and the token stays valid until expiry. |
| **Current user (`/me`)** | Working | `GET /me` behind `verifyAuth`; returns `req.user` (`_id`, `email`, `name`). |
| **Access tokens** | Working | JWT signed with `JWT_SECRET`, `expiresIn` default `15m`. Payload `{ userId, email }`. |
| **Refresh tokens** | Working (happy path), diverges from design | JWT signed with `JWT_REFRESH_SECRET`, default `7d`. `POST /refresh` reads token from **body**, verifies, checks it equals the stored value, rotates it, returns new access + refresh tokens in the body. |
| **Password hashing** | Working | bcrypt, 12 rounds, in a Mongoose `pre('save')` hook guarded by `isModified('password')`. Matches the documented cost factor. |
| **Cookies** | **Missing** | No `cookie-parser`, no cookie is ever set or read. The documented httpOnly + Secure + SameSite=Strict refresh cookie does not exist. |
| **Auth middleware** | Working | `verifyAuth` reads `Authorization: Bearer <token>`, verifies, loads the user (excluding `password`/`refreshToken`), attaches `req.user` and `req.auth`. Falls back to a generic 401 on any verify failure. |
| **Authorization** | Partial | `projectAuth(minimumRole)` resolves the caller's project role (owner via `project.userId`, else `ProjectMember` lookup) and enforces a `viewer < editor < owner` priority. No global RBAC (no `admin`/`role` on the user). |
| **Token expiration** | Working | Enforced by `jsonwebtoken` via `expiresIn`. |
| **Token rotation / revocation** | Partial | Rotation happens on `/refresh` (old token no longer matches the stored value, so it's implicitly invalidated). But storage is a **single** `refreshToken` field on the user → only one active session per user; a second login silently invalidates the first. No Redis blacklist as documented. Revocation on logout is conditional (see above). |
| **Duplicate email handling** | Partial | Application-level `findOne` check returns 409; `email` also has a unique index as a backstop. The 409 response is undeliverable until the async-throw bug is fixed. |
| **Invalid credentials handling** | Partial | Correct 401 with a non-enumerating message, but the response never reaches the client due to the async-throw bug. |

**User model mismatch vs. `ARCHITECTURE.md`:** the doc specifies `role` (`user`/`admin`), `isActive`, and `lastLogin`. The actual model has none of these; instead it has `plan` (`free`/`pro`/`team`) and `refreshToken`. There is no soft-disable (`isActive`) check anywhere, and no `lastLogin` tracking.

**Field exposure risk:** `password` and `refreshToken` are **not** declared `select: false`. Controllers strip them manually when building responses, but any future incidental query (e.g. `User.findOne({ email })`, as `login` already does) loads the bcrypt hash and a usable refresh token into memory and could accidentally serialize them.

---

## 5. Database Audit

**Connection:** single Mongoose connection with exponential-backoff retry (`core/database.ts`). No connection pooling options, no `strictQuery` config, no graceful shutdown / disconnect handling.

**Models present (9):** `User`, `Project`, `ProjectMember`, `ResearchJob`, `ResearchSource`, `EvidenceClaim`, `ExistingSolution`, `InnovationGap`, `ActivityLog`.

**Indexes:** reasonable coverage — `User.email` unique; `Project.userId` + compound `{ userId, updatedAt }`; `ProjectMember` compound unique `{ projectId, userId }`; `ResearchJob` indexes on `projectId`, `status`, and `{ projectId, status }`; `ResearchSource` `{ projectId, provider }` and `{ projectId, url }`; `ActivityLog` `{ projectId, createdAt }`.

**Schema observations / problems:**

- **Naming divergence from docs.** The architecture uses `project`/`user`/`owner`/`name`/`problemStatement`; the code uses `projectId`/`userId`/`title`/`description` and stores richer intake fields (`domain`, `projectType`, `targetUsers`, `platform`, `preferredTech`, `constraints`, `teamSize`, `timeline`, `skillLevel`). Any doc-driven frontend contract will not match.
- **Status enums differ.** `Project.status` is `draft|researching|complete|failed|deleted` (docs said `active|archived|deleted` + a separate `researchStatus`). `ResearchJob` stages are an 11-item pipeline vs. the docs' 8 agents.
- **Untyped models.** Most schemas are created without a TypeScript generic (`new mongoose.Schema({...})`), so documents are effectively `any` in controllers — no compile-time safety on field access (`project.userId`, `project.status`, `project.problemUnderstanding.architecture`, etc.).
- **`Mixed` overloading.** Architecture/roadmap/resources/recommendations are stashed under `Project.problemUnderstanding` (a `Schema.Types.Mixed`) instead of the dedicated `Architecture`, `Roadmap`, `TechRecommendation`, `Resource` collections the docs describe. This trades queryability and validation for convenience.
- **Missing documented collections.** No `Architecture`, `TechRecommendation`, `Resource`, `Roadmap`, `Conversation`, or `Notification` models exist.
- **`ActivityLog` is dead.** Defined and indexed but never written or read anywhere.
- **No soft-delete cascade.** Deleting a project sets `status: 'deleted'` but leaves members, jobs, sources, evidence, gaps, and solutions orphaned.

---

## 6. API Endpoints Currently Available

`success/data` envelope is used throughout (errors: `{ success:false, error:{ message, code } }`). "Working" below means the happy path functions; note the global caveat that **controller error paths (throwing `AppError`) currently hang** because of the async-handler bug (§7), so any row marked "working" still has an unreliable failure path unless it uses `next(err)`.

### Auth — `/api/v1/auth`
| Method | Path | Auth required | Purpose | Status |
|---|---|---|---|---|
| POST | `/register` | No | Create account, return user + tokens | Partial (dup-email error path broken) |
| POST | `/login` | No | Authenticate, return user + tokens | Partial (invalid-cred error path broken) |
| POST | `/logout` | No | Revoke refresh token if supplied in body | Partial / weak |
| POST | `/refresh` | No (token in body) | Rotate refresh token, issue new access token | Working (differs from documented cookie design) |
| GET | `/me` | Yes | Return current user | Working |

### Projects — `/api/v1/projects`
| Method | Path | Auth required | Purpose | Status |
|---|---|---|---|---|
| GET | `/` | Yes | List projects owned or joined by the user (paginated) | Working |
| POST | `/` | Yes | Create project + owner membership | Working |
| GET | `/:id` | Yes + viewer | Get project | Working |
| PUT | `/:id` | Yes + editor | Update project | Working |
| DELETE | `/:id` | Yes + owner | Soft-delete (`status: deleted`) | Working |
| GET | `/:id/stats` | Yes + viewer | Source/gap/solution counts + last job | Working |
| POST | `/:id/members` | Yes + owner | Add member by email | Partial (no body validation; role unrestricted) |
| DELETE | `/:id/members/:userId` | Yes + owner | Remove non-owner member | Working |

### Research — `/api/v1/research/:id`  (all: auth + `projectAuth('viewer')` + research limiter)
| Method | Path | Auth required | Purpose | Status |
|---|---|---|---|---|
| POST | `/start` | Yes + viewer | Create a `queued` ResearchJob | Partial — no worker ever runs it (job stays queued forever) |
| GET | `/job` | Yes + viewer | Latest job status/progress | Working (data never advances) |
| GET | `/sources` | Yes + viewer | Paginated ResearchSources | Working (always empty) |
| GET | `/evidence` | Yes + viewer | EvidenceClaims | Working (always empty) |
| GET | `/solutions` | Yes + viewer | ExistingSolutions | Working (always empty) |
| GET | `/gaps` | Yes + viewer | InnovationGaps | Working (always empty) |
| GET | `/architecture` | Yes + viewer | Reads `Project.problemUnderstanding.architecture` | Working (always empty) |
| GET | `/resources` | Yes + viewer | Reads `problemUnderstanding.resources` | Working (always empty) |
| GET | `/roadmap` | Yes + viewer | Reads `problemUnderstanding.roadmap` | Working (always empty) |
| POST | `/stresstest` | Yes + viewer | Accepts request if evidence exists | Stub (does nothing) |

### Copilot — `/api/v1/copilot/:id`  (all: auth + `projectAuth('viewer')`)
| Method | Path | Auth required | Purpose | Status |
|---|---|---|---|---|
| POST | `/chat` | Yes + viewer | One-shot Gemini answer with project context | Partial — synchronous (no Socket.io streaming), no persistence, requires `GEMINI_API_KEY` |
| GET | `/history` | Yes + viewer | Conversation history | Stub (returns `[]`) |

### Misc
| Method | Path | Auth required | Purpose | Status |
|---|---|---|---|---|
| GET | `/health` | No | Liveness probe | Working |
| any | (unmatched) | — | 404 via `AppError` | Working |

---

## 7. Security Findings

### CRITICAL

**C1 — Hardcoded fallback JWT secrets, no startup validation.**
`core/config.ts` defaults `JWT_SECRET` to `'dev-secret-change-in-prod'` and `JWT_REFRESH_SECRET` to `'dev-refresh-secret'`. If either env var is unset in production, all tokens are forgeable by anyone who reads the source. Nothing fails fast when secrets are missing. *Fix: require these at boot; refuse to start without strong secrets.*

**C2 — Async controller errors are never delivered (correctness + availability).**
Controllers are `async` and `throw new AppError(...)`, but they are registered directly on Express 4 routes (e.g. `router.post('/login', ..., login)`) with **no** try/catch or async wrapper. Express 4 does not route rejected promises to `errorHandler`, so every throwing path becomes an unhandled promise rejection: the client request hangs with no response, and accumulating unhandled rejections can destabilize the process. This affects invalid login, duplicate registration, all not-found/forbidden/conflict paths, and copilot/research guard clauses. *Fix: an `asyncHandler` wrapper (or Express 5) so thrown errors reach the error middleware.*

### HIGH

**H1 — Refresh-token strategy is weaker than documented.** Tokens are returned in the JSON body (so a browser client must store them in JS, exposing them to XSS) and persisted as a single **plaintext** `refreshToken` field. There is no httpOnly/Secure/SameSite cookie and no Redis blacklist. A database read yields immediately usable long-lived tokens. Only one session per user is possible. *Fix: move to httpOnly cookies, hash stored tokens, and support multi-session revocation.*

**H2 — `password` and `refreshToken` are not `select:false`.** They load by default on any unprojected query (e.g. `login`'s `User.findOne({ email })`). One careless `res.json(user)` leaks a bcrypt hash and a valid refresh token. *Fix: `select:false` on both, opt in explicitly where needed.*

**H3 — `addProjectMember` has no input validation and no role restriction.** The route has no Zod schema; `email` and `role` come straight from the body, and `role` can be any of `owner|editor|viewer` (a caller could grant `owner`). *Fix: add a schema and constrain assignable roles.*

### MEDIUM

**M1 — Rate limiting is in-memory and proxy-unaware.** `express-rate-limit` uses the default memory store, so limits reset on restart and are not shared across instances. `app.set('trust proxy', ...)` is not configured, so behind a reverse proxy all clients share the proxy IP (over-limiting) or `X-Forwarded-For` handling is undefined. *Fix: Redis store + correct trust-proxy setting.*

**M2 — Helmet uses defaults only.** The documented custom CSP / HSTS-with-preload / referrer policy is not configured. Defaults are reasonable for an API but do not match the stated security posture.

**M3 — Logout does not reliably revoke.** Unauthenticated and dependent on the client volunteering the refresh token in the body; otherwise the token remains valid until natural expiry.

**M4 — Over-permissive research authorization.** `POST /research/:id/start` requires only `viewer`. Once the pipeline is real, any viewer can trigger expensive AI jobs. *Fix: require `editor`/`owner` for mutations.*

**M5 — No disabled-account concept.** The `isActive` soft-disable from the docs is absent, so there is no way to lock out a compromised or offboarded account short of deleting it.

### LOW

**L1 — SSRF guard is incomplete.** `safeFetch` resolves only the first `dns.lookup` address (single family) and there is a TOCTOU gap between the check and Axios re-resolving the host, leaving partial DNS-rebinding exposure. It also does not block additional reserved ranges (e.g. `100.64.0.0/10` CGNAT). Good baseline, not airtight. (Moot until providers are wired in.)

**L2 — Error responses echo `err.message` for non-`AppError` failures.** A stray Mongoose/driver error would surface its raw message with a 500. Stacks are logged, not returned, so impact is limited.

**L3 — `express.urlencoded({ extended: true })` and a 2 MB JSON limit** are enabled without a clear need for URL-encoded bodies on a JSON API; minor attack-surface trim.

---

## 8. Architecture vs Actual Implementation

| Feature | Planned (docs) | Actual | Status | Notes |
|---|---|---|---|---|
| Project setup / infra (Phase 1) | Express + Mongo + Redis + errorHandler, `src/config/`, ESLint | Present under `src/core/`; no ESLint | PARTIAL | Folder named `core` not `config`; no lint config exists |
| Authentication (Phase 2) | JWT access+refresh, cookie refresh + Redis rotation, bcrypt | JWT both, bcrypt 12, DB-stored plaintext refresh, no cookies/Redis | DIFFERENT FROM DOCUMENTATION | Works in dev; see §4/§7 |
| Auth error/edge handling | Clean 4xx responses | Throws in async handlers → hang | BROKEN | C2 |
| Project management (Phase 3) | CRUD + members + projectAuth | Fully present incl. stats + membership | COMPLETE (needs hardening) | Member add lacks validation (H3) |
| User model fields | `role`, `isActive`, `lastLogin` | `plan`, `refreshToken` (none of the three) | DIFFERENT FROM DOCUMENTATION | RBAC + soft-disable missing |
| Research providers (Phase 4) | Serper/GitHub/arXiv/Semantic Scholar + index | `.ts` for Serper/GitHub/arXiv exist but unused; Semantic Scholar only as legacy `.js`; no `index` | PARTIAL / orphaned | Not imported anywhere |
| Gemini client (Phase 5) | Text + embeddings + retry | `GeminiProvider` implements generate/structured/embed + retry | COMPLETE | Solid; behind clean interface |
| Agent prompts (Phase 6) | 9 prompt files | none | MISSING | — |
| AI agents (Phase 7) | 8 research agents + copilot | none | MISSING | — |
| Orchestrator (Phase 8) | `research.orchestrator.ts` | none | MISSING | — |
| RAG pipeline (Phase 9) | Chroma + chunk/embed/retrieve | none (`chromadb` installed, unused) | MISSING | — |
| Background workers (Phase 10) | BullMQ queue + worker | none; `package.json` points at missing `src/workers/research.worker.ts` | MISSING / BROKEN | `worker` script will crash |
| WebSocket layer (Phase 11) | Socket.io + rooms + progress events | none (`socket.io` installed, unused) | MISSING | Copilot cannot stream |
| REST API routes (Phase 12) | research + copilot controllers/routes/schemas | present but stubbed | PARTIAL | Endpoints return empty/placeholder data |
| Evidence extraction | EvidenceClaim from sources | model only; no producer | MISSING (model COMPLETE) | — |
| Existing-solution analysis | ExistingSolution | model only; no producer | MISSING (model COMPLETE) | — |
| Innovation-gap detection | InnovationGap | model only; no producer | MISSING (model COMPLETE) | — |
| Critic / stress test | Critic agent | `POST /stresstest` returns "accepted" only | STUB | No logic |
| Architecture generation | `Architecture` collection | folded into `Project.problemUnderstanding` (Mixed); no generator | MISSING / DIFFERENT | — |
| Roadmap generation | `Roadmap` collection | folded into `problemUnderstanding`; no generator | MISSING / DIFFERENT | — |
| Project-aware copilot | Stateful, RAG, streamed | one-shot Gemini call w/ basic project context, no RAG, no history | PARTIAL | `history` returns `[]` |
| Notifications | `Notification` model + events | none | MISSING | — |
| Conversations | `Conversation` model | none | MISSING | copilot not persisted |
| Real-time progress | Socket.io events | none | MISSING | — |
| Activity log | `ActivityLog` written on actions | model exists, never used | MISSING (model orphaned) | — |

---

## 9. Missing Backend Foundation

The following foundational pieces are required before the product's core value (autonomous research) can function at all:

- **Background job processing (BullMQ worker + queue).** Currently `POST /research/:id/start` writes a `queued` job that no process ever picks up. The `worker`/`worker:prod` npm scripts reference `src/workers/research.worker.ts`, which does not exist — running them crashes.
- **AI agent layer + orchestrator + prompts** (Phases 6–8). Nothing consumes the Gemini client or the research providers.
- **Provider wiring.** The `.ts` providers are implemented but imported by nothing; there is no `providers/index` aggregator or search service.
- **RAG pipeline + ChromaDB client** (Phase 9) for the copilot and analysis agents.
- **WebSocket layer** (Phase 11) for progress and copilot streaming.
- **Persistence for copilot** (`Conversation`) and **notifications** (`Notification`).
- **Cookie parsing** if the documented refresh-cookie flow is to be honored.
- **Environment validation** (fail-fast on missing/weak secrets and keys).
- **Test harness and lint config** — there is no test framework, no test files, and no ESLint configuration in the project (Phase 1 planned `.eslintrc`).
- **Graceful shutdown** (close HTTP server, Mongo, Redis on SIGTERM) and DB cleanup/cascade on project delete.

---

## 10. Technical Debt

- **Duplicate `.js`/`.ts` shadow tree.** ~25 modules exist twice. `tsx`/`tsc` run only the `.ts` files (`allowJs` is off), so the `.js` copies are dead weight that invites editing the wrong file and muddies diffs. Some (`utils/response.js`, `research/normalizer.js`, `research/deduplicator.js`, `semanticScholar.provider.js`) exist only as `.js` and are unreachable.
- **Orphaned live code.** `models/ActivityLog.ts` and all three `research/providers/*.ts` are never imported.
- **Untyped Mongoose models** (no schema generics) erase most compile-time safety in controllers.
- **Duplicated authorization work.** Project controllers re-run their own `assertCanAccessProject` even though the route already applied `projectAuth`, doubling DB round-trips per request.
- **Inconsistent response shapes.** Some endpoints return `{ data: { items, pagination } }`, others `{ data: [...] }` (evidence/solutions/gaps), others `{ data: <doc> }`. No shared response helper is used (`utils/response.js` is dead).
- **Unused dependencies for the current feature set:** `bullmq`, `chromadb`, `socket.io`, `uuid`, `xml2js`, and effectively `ioredis` (connected but otherwise unused). Fine to keep for upcoming phases, but they inflate the install and imply capabilities that don't exist yet.
- **Config drift from docs** across model field names, status enums, and storage strategy (`problemUnderstanding` Mixed blob vs. dedicated collections). Whichever is canonical, the docs and code should be reconciled to avoid frontend contract confusion.
- **`server.ts` mounts routers on `/api/v1/research/:id` and `/api/v1/copilot/:id`** (param in the mount path + `mergeParams`). It works, but nesting research/copilot under the projects router would be more conventional and less error-prone.
- **No graceful shutdown, no request-id/correlation logging, no `/health` DB/redis depth check.**

---

## 11. Recommended Fixes Before New Features

Ordered by priority. (Listed as recommendations only — no changes were made.)

1. **Fix async error handling (C2).** Introduce an `asyncHandler` wrapper (or migrate to Express 5) and apply it to every controller so thrown `AppError`s reach `errorHandler`. Without this, error responses are unreliable across the whole API, including the already-built project endpoints.
2. **Enforce secrets & validate env at boot (C1).** Refuse to start if `JWT_SECRET`/`JWT_REFRESH_SECRET` are missing or equal to the dev defaults; validate all critical env with a schema.
3. **Lock down token/credential exposure (H1, H2).** Add `select:false` to `password` and `refreshToken`; decide on and implement the refresh-token transport (httpOnly cookie recommended, matching the docs) and store hashed refresh tokens with multi-session support.
4. **Validate and constrain `addProjectMember` (H3).** Add a Zod schema; disallow assigning `owner` via this route.
5. **Harden logout & session revocation (M3).** Authenticate logout and revoke server-side regardless of body contents.
6. **Rate-limit correctly (M1).** Move to a shared (Redis) store and set `trust proxy` appropriately.
7. **Remove the duplicate `.js` tree and orphaned modules.** Delete the legacy `.js` shadows (and `utils/response.js`, `research/normalizer.js`, `research/deduplicator.js`, `semanticScholar.provider.js`), or move them out of `src/`, to eliminate wrong-file edits. *(Deferred — audit only; nothing deleted.)*
8. **Reconcile models with docs.** Either add `role`/`isActive`/`lastLogin` to `User` and the documented collections, or update `ARCHITECTURE.md` to match the implemented shape. Add `select:false`, schema generics, and a soft-disable check.
9. **Type the Mongoose models** with document interfaces for compile-time safety.
10. **Add ESLint + a test harness** (neither exists) and wire a minimal CI gate (typecheck + lint + a couple of auth/project tests).
11. **Tighten helmet config and the SSRF guard (M2, L1)** to match the documented posture before any outbound provider calls go live.

---

## 12. Recommended Next Backend Phase

**First, a correction to the premise:** Project Management (Phase 3) is *already built* — models, CRUD, membership, stats, and `projectAuth` all exist. You do not need to start it; you need to (a) close its validation/authorization gaps and (b) fix the foundation bugs that also affect it.

**Recommended sequence:**

1. **Phase 0 — Foundation hardening (1–2 days).** Items 1–7 above (async handler, secret enforcement, token/credential exposure, member validation, logout, rate limiting, dead-code removal). This is prerequisite to *anything* else because the async-handler bug silently breaks every error path, including the project endpoints you already rely on.

2. **Then the research execution engine — Phases 10 → 4-wiring → 7 → 8.** This is where the product's actual value lives, and it is the biggest gap. Concretely: build the **BullMQ queue + `src/workers/research.worker.ts`** (the npm scripts already expect it), **wire the existing providers** behind a search service, then implement the **agents** (the Gemini client from Phase 5 is ready) and the **orchestrator** that advances `ResearchJob.stages` and populates `ResearchSource`/`EvidenceClaim`/`ExistingSolution`/`InnovationGap`. Right now `POST /research/start` produces a job that nothing consumes, so every downstream research/copilot read returns empty — closing this loop unlocks the entire read surface that is already implemented.

3. **Then Phase 11 (WebSockets)** for live progress + copilot streaming, followed by **Phase 9 (RAG)** to make the copilot project-aware, and finally **Conversation/Notification persistence**.

**Why this order:** the foundation fixes are cheap and unblock reliable behaviour everywhere; the worker + orchestrator is the highest-value missing capability and is what turns the already-built REST surface from empty stubs into a working product; real-time and RAG are enhancements layered on top of a functioning pipeline.

---

## 13. Files That Would Need Changes

Listed for planning only — **no files were modified.**

**Foundation & security fixes**
- `src/core/config.ts` — enforce/validate secrets and required env.
- `src/server.ts` — apply async handler wiring, add `cookie-parser` (if adopting cookie refresh), set `trust proxy`, add graceful shutdown.
- `src/utils/asyncHandler.ts` — *new* wrapper (does not exist yet).
- `src/controllers/auth.controller.ts` — wrap handlers; cookie-based refresh; reliable revocation.
- `src/controllers/project.controller.ts`, `research.controller.ts`, `copilot.controller.ts` — wrap handlers.
- `src/models/User.ts` — `select:false` on `password`/`refreshToken`; add `role`/`isActive`/`lastLogin` if reconciling with docs; hash stored refresh tokens.
- `src/middleware/auth.middleware.ts` — optional `isActive` check.
- `src/middleware/rateLimit.middleware.ts` — shared store + `standardHeaders`.
- `src/schemas/project.schema.ts` (+ `project.routes.ts`) — add member-add schema; restrict assignable role.
- `src/utils/safeFetch.ts` — resolve/validate all addresses; broaden reserved-range checks.

**Dead code / hygiene (removal candidates)**
- All legacy `.js` shadow files under `src/core`, `src/utils`, `src/middleware`, `src/schemas`, `src/models`, `src/research`.
- `src/utils/response.js`, `src/research/normalizer.js`, `src/research/deduplicator.js`, `src/research/providers/semanticScholar.provider.js` (only exist as `.js`, unreachable).
- `src/models/ActivityLog.ts` — wire it up or remove.

**New foundation for the next phase (files to create)**
- `src/workers/queue.ts`, `src/workers/research.worker.ts` (already referenced by `package.json`).
- `src/research/providers/index.ts` + a search service that imports the existing providers.
- `src/agents/*` (base + 8 agents + copilot), `src/agents/prompts/*`.
- `src/orchestrator/research.orchestrator.ts`.
- `src/socket/*` (Socket.io server + handlers).
- `src/rag/*` (Chroma client, chunker, embedder, retriever, pipeline).
- `src/models/Conversation.ts`, `src/models/Notification.ts` (and optionally the documented `Architecture`/`Roadmap`/`TechRecommendation`/`Resource` models).
- ESLint config + a `test/` suite (neither exists).

**Docs to reconcile**
- `docs/ARCHITECTURE.md` — align model field names, status enums, refresh-token strategy, and storage approach with the implementation (or vice-versa).

---

### Appendix — Safe checks (could not be executed)

The isolated Linux sandbox used for running commands failed to start during this session (VM image unavailable), so `tsc`, lint, tests, and build could **not** be run live. Static findings in lieu of execution:

- **Build (`npm run build` → `tsc`):** the live `.ts` tree looks internally consistent (imports resolve, `express.d.ts` augmentation is included). Not verified by execution.
- **Typecheck:** `strict` is on; untyped Mongoose docs mean many field accesses are `any` (no errors, but no safety). Not verified by execution.
- **Lint:** **no ESLint config or dependency exists** — there is no `lint` script to run.
- **Tests:** **no test framework, no test files, no `test` script** — nothing to run.
- **`npm run worker` / `worker:prod`:** would fail immediately — `src/workers/research.worker.ts` does not exist.

Re-run `npm run build` in a working environment to confirm a clean compile before starting the next phase.
