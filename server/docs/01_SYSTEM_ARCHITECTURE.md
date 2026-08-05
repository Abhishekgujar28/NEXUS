# 01 — System Architecture

> **Scope:** High-level component diagram, layered architecture, request lifecycle, data flow, and observability for the NEXUS backend.

---

## 1. Purpose

Define the structural blueprint of the NEXUS backend so that every module, service, and integration is placed in the correct architectural layer, communicates through defined contracts, and can be reasoned about independently.

---

## 2. Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              NEXUS PLATFORM                                     │
│                                                                                 │
│  ┌──────────────┐    REST / WS     ┌───────────────────────────────────────┐   │
│  │              │◄────────────────►│           Express API Server           │   │
│  │  React SPA   │                  │  (app.ts + server.ts)                  │   │
│  │  (Vite+TS)   │                  │                                        │   │
│  └──────────────┘                  │  ┌──────────┐ ┌──────────┐ ┌────────┐ │   │
│                                    │  │  Routes  │→│ Middleware│→│ Ctrls  │ │   │
│                                    │  └──────────┘ └──────────┘ └───┬────┘ │   │
│                                    └────────────────────────────────┬───────┘   │
│                                                                     │           │
│           ┌─────────────────────────────────────────────────────────┤           │
│           │                    SERVICE LAYER                        │           │
│           │                                                         │           │
│  ┌────────▼────────┐  ┌───────────────────┐  ┌──────────────────┐  │           │
│  │   AI Provider   │  │  Research Pipeline │  │   RAG Pipeline   │  │           │
│  │  (Gemini)       │  │  (Orchestrator +   │  │  (ChromaDB +     │  │           │
│  │                 │  │   8 Agents)        │  │   Embeddings)    │  │           │
│  └────────┬────────┘  └────────┬──────────┘  └────────┬─────────┘  │           │
│           │                    │                       │            │           │
│  ┌────────▼────────┐  ┌───────▼───────────┐  ┌───────▼──────────┐ │           │
│  │  Gemini API     │  │  Research         │  │   ChromaDB       │ │           │
│  │  (Google Cloud) │  │  Providers        │  │   (Vector Store) │ │           │
│  └─────────────────┘  │  ┌──────────────┐ │  └──────────────────┘ │           │
│                        │  │ Serper (Web) │ │                       │           │
│                        │  │ GitHub (Code)│ │                       │           │
│                        │  │ arXiv (Papers│ │                       │           │
│                        │  │ Sem.Scholar  │ │                       │           │
│                        │  └──────────────┘ │                       │           │
│                        └───────────────────┘                       │           │
│                                                                     │           │
│  ┌─────────────────┐  ┌────────────────────┐  ┌─────────────────┐ │           │
│  │  MongoDB        │  │  Redis             │  │  Socket.io      │ │           │
│  │  (Mongoose 8)   │  │  (ioredis)         │  │  (Realtime)     │ │           │
│  │  Primary Store  │  │  Queue + Cache     │  │  Progress/Chat  │ │           │
│  └─────────────────┘  └─────────┬──────────┘  └─────────────────┘ │           │
│                                 │                                   │           │
│                        ┌────────▼──────────┐                       │           │
│                        │  BullMQ Worker    │                       │           │
│                        │  (research.worker)│                       │           │
│                        └───────────────────┘                       │           │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Architectural Layers

### Layer 1 — Transport (Routes)
**Responsibility:** Define HTTP endpoints, map methods to middleware chains and controllers.  
**Folder:** `src/routes/`  
**Rules:**
- Each domain gets its own router file
- Routers import middleware and controller handlers
- Routes must use `asyncHandler()` to wrap every async controller
- Route-level middleware applies authentication + authorization + validation in order

### Layer 2 — Middleware
**Responsibility:** Cross-cutting request processing (auth, validation, rate limiting, error handling).  
**Folder:** `src/middleware/`  
**Rules:**
- Middleware MUST call `next()` or `next(err)` — never send a response directly (except `validate` which returns 400 on parse failure)
- `errorHandler` is the terminal middleware and sends the final error response
- Middleware order in `app.ts`: security → parsing → rate limiting → routes → 404 → errorHandler

### Layer 3 — Controllers
**Responsibility:** Orchestrate request processing: read validated input, invoke services/models, format responses.  
**Folder:** `src/controllers/`  
**Rules:**
- Controllers are `async` functions receiving `(req: Request, res: Response)`
- Controllers throw `AppError` for domain errors — never call `res.status(xxx).json()` for errors
- Controllers return data in the `{ success: true, data: {...} }` envelope
- Controllers MUST NOT contain database query logic beyond simple CRUD — complex queries belong in services

### Layer 4 — Services (Planned)
**Responsibility:** Domain business logic that spans multiple models or integrations.  
**Folder:** `src/services/` (to be created)  
**Rules:**
- Services are plain async functions or classes
- Services depend on model imports and integration interfaces
- Services never access `req` or `res` — they receive typed arguments and return typed results

### Layer 5 — Models
**Responsibility:** MongoDB schema definitions, indexes, instance methods, and statics.  
**Folder:** `src/models/`  
**Rules:**
- Each model in its own file, PascalCase, singular name
- Schemas use TypeScript generics for compile-time field safety
- Sensitive fields (`password`, `refreshToken`) use `select: false`
- Indexes are declared on the schema, not managed externally

### Layer 6 — Integrations
**Responsibility:** External service adapters behind clean interfaces.  
**Folder:** `src/integrations/`  
**Rules:**
- Each external service has a TypeScript interface and a concrete implementation
- Integrations are instantiated as singletons and exported
- Integrations include retry logic and graceful degradation

### Layer 7 — Infrastructure (Core)
**Responsibility:** Database connections, configuration, logging, error definitions.  
**Folder:** `src/core/`  
**Rules:**
- No business logic in core — only plumbing
- `config.ts` is the single point for all environment variable access
- `logger.ts` is the single logging interface — no `console.log`

---

## 4. Request Lifecycle

```
                     Incoming HTTP Request
                            │
                            ▼
                    ┌───────────────┐
                    │   helmet()    │  Security headers (CSP, HSTS, etc.)
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │   cors()      │  Origin validation, credentials
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │   morgan()    │  Request logging (dev/combined)
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │  json/url     │  Body parsing (2MB limit)
                    │  encoded      │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ generalLimiter│  100 req/15min global rate limit
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │  Router Match │  /api/v1/auth | /projects | /research | /copilot
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
        ┌─────▼──────┐ ┌───▼────┐ ┌──────▼────────┐
        │ authLimiter│ │verifyAuth│ │ projectAuth() │
        └─────┬──────┘ └───┬────┘ └──────┬────────┘
              │             │             │
        ┌─────▼─────────────▼─────────────▼──┐
        │         validate(zodSchema)         │
        └─────────────────┬───────────────────┘
                          │
                ┌─────────▼─────────┐
                │  asyncHandler(    │
                │    controller     │
                │  )                │
                └─────────┬─────────┘
                          │
               ┌──────────▼──────────┐
               │  Controller Logic   │
               │  (Models, Services, │
               │   Integrations)     │
               └──────────┬──────────┘
                          │
            ┌─────────────┼─────────────┐
            │ Success                   │ Error (throw AppError)
            │                           │
    ┌───────▼───────┐           ┌───────▼───────┐
    │ res.json({    │           │ errorHandler  │
    │   success:true│           │ middleware    │
    │   data: ...   │           │ (catches err) │
    │ })            │           └───────┬───────┘
    └───────────────┘                   │
                                ┌───────▼───────┐
                                │ res.json({    │
                                │  success:false│
                                │  error: ...   │
                                │ })            │
                                └───────────────┘
```

---

## 5. Data Flow Patterns

### 5.1 Synchronous Read (e.g., GET /projects/:id)

```
Client → verifyAuth → projectAuth('viewer') → getProject controller
                                                    │
                                               Project.findById(id)
                                                    │
                                               res.json({ success: true, data: project })
```

### 5.2 Synchronous Write (e.g., POST /projects)

```
Client → verifyAuth → validate(createProjectSchema) → createProject controller
                                                           │
                                                      Project.create({...req.body, userId})
                                                      ProjectMember.updateOne(upsert: owner)
                                                           │
                                                      res.status(201).json({ success: true, data: project })
```

### 5.3 Asynchronous Job (e.g., POST /research/:id/start)

```
Client → verifyAuth → projectAuth('editor') → validate → startResearch controller
                                                             │
                                                        ResearchJob.create(status: 'queued')
                                                        Project.update(status: 'researching')
                                                        [PLANNED] researchQueue.add('research', payload)
                                                             │
                                                        res.status(202).json({ jobId, status: 'queued' })

    ─── Background (separate process) ───

BullMQ Worker picks up job → ResearchOrchestrator.run()
    → Agent 1 (ProblemUnderstanding) → emit progress via Socket.io
    → Agent 2 (QueryPlanner) → emit progress
    → Agent 3 (DeepSearch) → call providers → store ResearchSources
    → Agent 4 (ResearchAnalysis) → store EvidenceClaims
    → Agent 5 (GapFinder) → store InnovationGaps
    → Agent 6 (Critic) → store stress test results
    → Agent 7 (Architect) → store architecture on Project.problemUnderstanding
    → Agent 8 (Roadmap) → store roadmap
    → ResearchJob.update(status: 'completed', progress: 100)
    → Project.update(status: 'complete')
    → emit research:complete via Socket.io
```

### 5.4 Copilot Chat (Current: Synchronous; Planned: Streamed)

```
Client → verifyAuth → projectAuth('viewer') → validate(copilotChatSchema)
                                                    │
                                               chatWithCopilot controller
                                                    │
                                               Project.findById (context)
                                               [PLANNED] RAG retriever (relevant chunks)
                                               aiProvider.generate(prompt + context)
                                                    │
                                               [PLANNED] Stream via Socket.io copilot:token
                                               res.json({ conversationId, answer })
```

---

## 6. Module Dependency Graph

```
                            server.ts
                               │
                        ┌──────┼──────┐
                        ▼      ▼      ▼
                     app.ts  core/  core/
                       │    config  database
                       │      │       │
              ┌────────┼──────┼───────┼──────────┐
              ▼        ▼      ▼       ▼          ▼
           routes/  middleware/  core/errors  core/redis
              │        │
              ▼        ▼
         controllers/  schemas/
              │
      ┌───────┼───────┐
      ▼       ▼       ▼
   models/  integrations/  utils/
              │
              ▼
    research/providers/
```

**Key dependency rules:**
- `core/` depends on nothing except Node.js built-ins and npm packages
- `middleware/` depends on `core/`, `models/`, `utils/`
- `controllers/` depend on `models/`, `integrations/`, `core/errors`
- `routes/` depend on `controllers/`, `middleware/`, `schemas/`, `utils/asyncHandler`
- `integrations/` depend on `core/config`, `utils/retry`
- `research/providers/` depend on `core/config`, `core/logger`, `utils/safeFetch`
- **No circular dependencies** are permitted

---

## 7. Observability

### 7.1 Logging (Winston)

| Environment | Format | Level |
|---|---|---|
| Development | Colorised console, `timestamp level: message {meta}` | `debug` |
| Production | JSON structured logs | `info` |

**Log categories:**
- Server lifecycle: startup, shutdown, connection events
- Request logging: via Morgan (`dev` format in dev, `combined` in prod)
- Error logging: 5xx errors with stack traces
- Integration logging: provider failures, Gemini retries

### 7.2 Health Check

```
GET /health
Response: { success: true, data: { status: 'ok' } }
```

**Future enhancement:** Include MongoDB connection state, Redis connection state, and queue metrics.

### 7.3 Metrics (Planned)

| Metric | Type | Description |
|---|---|---|
| `http_request_duration_seconds` | Histogram | Request latency by route |
| `research_jobs_total` | Counter | Jobs created, by status |
| `research_job_duration_seconds` | Histogram | End-to-end research time |
| `ai_generation_duration_seconds` | Histogram | Gemini API call latency |
| `provider_search_duration_seconds` | Histogram | Per-provider search time |
| `active_websocket_connections` | Gauge | Current WebSocket count |

---

## 8. Deployment Architecture

### 8.1 Development (Local)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Express    │────►│   MongoDB    │     │   Redis      │
│   (port 5000)│     │   (27017)    │     │   (6379)     │
└──────────────┘     └──────────────┘     └──────────────┘
       │                                          │
       │              ┌──────────────┐           │
       └─────────────►│   ChromaDB   │◄──────────┘
                      │   (8000)     │
                      └──────────────┘
```

### 8.2 Production (Planned)

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Nginx   │────►│  Express ×N  │────►│  MongoDB     │     │  Redis       │
│  (443)   │     │  (Cluster)   │     │  (Atlas/     │     │  (Managed)   │
└──────────┘     └──────────────┘     │   Replica)   │     └──────────────┘
                        │             └──────────────┘            │
                        │             ┌──────────────┐           │
                        │             │  ChromaDB    │           │
                        │             │  (Docker)    │           │
                        │             └──────────────┘           │
                        │                                        │
                 ┌──────▼────────┐                              │
                 │  BullMQ Worker│◄─────────────────────────────┘
                 │  (separate    │
                 │   process)    │
                 └───────────────┘
```

---

## 9. Error Architecture

### 9.1 Error Class Hierarchy

```
Error (native)
  └── AppError (src/core/errors.ts)
        ├── statusCode: number
        ├── code: string (from ErrorCodes)
        └── isOperational: boolean (always true)
```

### 9.2 Error Codes

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Input validation failure |
| `UNAUTHORIZED` | 401 | Authentication required or failed |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource or state conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `BAD_GATEWAY` | 502/503 | External service unavailable |

### 9.3 Error Response Contract

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error description",
    "code": "ERROR_CODE_ENUM"
  }
}
```

- Validation errors additionally include `details` from Zod's `flatten()` output.
- Stack traces are logged server-side but NEVER returned to clients.
- Non-`AppError` exceptions are caught by `errorHandler`, logged as 500, and returned with the raw `err.message` (to be hardened in production to a generic message).

---

## 10. Security Layer Summary

*(See `11_SECURITY.md` for full details)*

| Layer | Technology | Purpose |
|---|---|---|
| Headers | Helmet | CSP, HSTS, X-Frame-Options, etc. |
| CORS | cors middleware | Restrict to `FRONTEND_URL` |
| Rate Limiting | express-rate-limit | Per-IP request throttling |
| Authentication | JWT (access + refresh) | Identity verification |
| Authorization | projectAuth middleware | Role-based project access |
| Validation | Zod schemas | Input sanitization |
| SSRF | safeFetch | Outbound request guard |
| Password | bcrypt (12 rounds) | Credential hashing |
| Config | validateConfig() | Fail-fast on missing secrets |

---

## 11. Future Improvements

1. **Service Layer Extraction**: Move complex business logic from controllers into dedicated service classes
2. **CQRS Pattern**: Separate read/write models for high-traffic read endpoints
3. **API Versioning Strategy**: Formal deprecation policy for v1→v2 migration
4. **Circuit Breaker**: Wrap external provider calls in circuit breakers for resilience
5. **Request Correlation IDs**: Generate `X-Request-Id` and propagate through all log entries
6. **Graceful Degradation**: Feature flags for optional services (ChromaDB, Redis)
7. **OpenAPI/Swagger**: Auto-generate API documentation from route definitions
8. **Health Check Depth**: Include DB/Redis/ChromaDB connectivity in `/health`

---

## 12. Dependencies

| Module | Depends On | Depended On By |
|---|---|---|
| `core/config` | `dotenv` | Everything |
| `core/database` | `mongoose`, `core/config`, `core/logger` | `server.ts` |
| `core/redis` | `ioredis`, `core/config`, `core/logger` | `server.ts`, workers |
| `core/errors` | — | Middleware, controllers |
| `core/logger` | `winston`, `core/config` | Everything |
| `middleware/auth` | `utils/jwt`, `models/User`, `core/errors` | Routes |
| `middleware/projectAuth` | `models/Project`, `models/ProjectMember`, `core/errors` | Routes |
| `middleware/validate` | `zod` | Routes |
| `utils/asyncHandler` | — | Routes |
| `utils/jwt` | `jsonwebtoken`, `core/config` | `middleware/auth`, `controllers/auth` |
| `utils/safeFetch` | `axios`, `dns`, `net`, `core/errors` | Research providers |
| `integrations/gemini` | `@google/generative-ai`, `core/config`, `utils/retry` | Controllers, agents |

---

## 13. Testing Strategy

*(See `12_TESTING.md` for full details)*

| Layer | Test Type | Tool |
|---|---|---|
| Models | Unit | Vitest + mongodb-memory-server |
| Utils | Unit | Vitest |
| Controllers | Integration | Supertest + Vitest |
| Middleware | Unit | Vitest (mock req/res/next) |
| Routes | Integration | Supertest |
| Providers | Unit | Vitest + MSW (Mock Service Worker) |
| E2E | End-to-End | Supertest against full stack |
