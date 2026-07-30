# NEXUS Backend-First Implementation Plan

> **Methodology:** Backend-First — every feature is Postman-testable before the next feature begins.  
> **Rule:** No feature depends on React. No frontend code. Every endpoint is verified via Postman before moving forward.

---

## Phase 0 — Build Fix (MUST DO FIRST)

### Priority: P0 — The server cannot start without this.

**Problem:** `server.ts` imports modules that don't exist yet. `copilot.routes.ts` imports an undefined export.

#### Task 0.1: Stub missing forward-imports in `server.ts`

**Files to create:**
- `src/realtime/socket.ts` — export `initRealtime()` (no-op) + `shutdownRealtime()` (no-op)
- `src/research/queue/worker.ts` — export `startResearchWorker()` (no-op)

**OR** remove the imports from `server.ts` until Phase 4/5.

#### Task 0.2: Fix `copilot.routes.ts` missing export

Add `export const listConversations` stub to `copilot.controller.ts`:
```typescript
export const listConversations = async (req: Request, res: Response) => {
  res.json({ success: true, data: { conversations: [] } });
};
```

#### Task 0.3: Delete dead `.js` shadow files

Remove from `src/research/providers/`:
- `arxiv.provider.js`
- `github.provider.js`
- `semanticScholar.provider.js`
- `webSearch.provider.js`

Remove from `src/research/`:
- `deduplicator.js` (if exists)
- `normalizer.js` (if exists)

#### Acceptance: `npx tsc --noEmit` passes with 0 errors. `npm run dev` starts the server.

#### Postman Verification:
```
GET http://localhost:5000/health
→ 200 { "success": true, "data": { "status": "ok" } }
```

---

## Phase 1 — Verify Existing Auth Endpoints

### Goal: Confirm all 5 auth endpoints work correctly in Postman.

No code changes needed — just verification.

---

### Endpoint 1.1: `POST /api/v1/auth/register`

| Attribute | Value |
|---|---|
| **Purpose** | Create a new user account and return tokens |
| **Authentication** | None |
| **Headers** | `Content-Type: application/json` |
| **Request Body** | `{ "name": "Test User", "email": "test@nexus.io", "password": "SecurePass123!" }` |
| **Validation Rules** | `name`: 2-50 chars, required. `email`: valid email, required. `password`: 8-100 chars, required. |
| **Success Response** | `201 { success: true, data: { user: {...}, accessToken, refreshToken } }` |
| **Error Responses** | `400 VALIDATION_ERROR` (invalid input), `409 CONFLICT` (duplicate email), `429 RATE_LIMITED` |
| **MongoDB Changes** | Creates `User` doc (password bcrypt-hashed), `refreshToken` stored on user |
| **Business Logic** | Hash password → create user → generate access token → generate refresh token → save refresh on user |
| **Related Models** | `User` |
| **Related Services** | `jwt.ts` (token generation), bcrypt (hashing) |
| **Rate Limits** | Auth limiter: 5 requests / 15 minutes |
| **Example Request** | `POST /api/v1/auth/register` with body above |
| **Example Response** | `{ "success": true, "data": { "user": { "_id": "...", "email": "test@nexus.io", "name": "Test User" }, "accessToken": "eyJ...", "refreshToken": "eyJ..." } }` |
| **Edge Cases** | Email case insensitivity (stored lowercase). Name whitespace trimming. Password exactly 8 chars. |
| **Postman Test Cases** | ✅ Register new user → 201. ✅ Register duplicate email → 409. ✅ Register missing name → 400. ✅ Register invalid email → 400. ✅ Register short password (7 chars) → 400. ✅ Response has no `password` field. ✅ Response has no `refreshToken` on user object. ✅ Access token is valid JWT. |

---

### Endpoint 1.2: `POST /api/v1/auth/login`

| Attribute | Value |
|---|---|
| **Purpose** | Authenticate with email/password, receive tokens |
| **Authentication** | None |
| **Headers** | `Content-Type: application/json` |
| **Request Body** | `{ "email": "test@nexus.io", "password": "SecurePass123!" }` |
| **Validation Rules** | `email`: valid email, required. `password`: min 1, required. |
| **Success Response** | `200 { success: true, data: { user, accessToken, refreshToken } }` |
| **Error Responses** | `400 VALIDATION_ERROR`, `401 UNAUTHORIZED` (bad credentials), `429 RATE_LIMITED` |
| **MongoDB Changes** | Updates `User.refreshToken` with new token |
| **Business Logic** | Find user by email → compare password (bcrypt) → generate tokens → save refresh token |
| **Related Models** | `User` |
| **Rate Limits** | Auth limiter: 5 requests / 15 minutes |
| **Example Request** | `POST /api/v1/auth/login` |
| **Example Response** | Same shape as register |
| **Edge Cases** | Non-existent email returns same 401 as wrong password (no enumeration). Email case insensitive. |
| **Postman Test Cases** | ✅ Login with correct creds → 200 + tokens. ✅ Login wrong password → 401. ✅ Login non-existent email → 401 (same message). ✅ Login missing email → 400. ✅ Login empty password → 400. |

---

### Endpoint 1.3: `POST /api/v1/auth/refresh`

| Attribute | Value |
|---|---|
| **Purpose** | Exchange valid refresh token for new token pair |
| **Authentication** | None (token in body) |
| **Headers** | `Content-Type: application/json` |
| **Request Body** | `{ "refreshToken": "eyJ..." }` |
| **Validation Rules** | `refreshToken`: string, min 1, required |
| **Success Response** | `200 { success: true, data: { accessToken, refreshToken } }` |
| **Error Responses** | `400 VALIDATION_ERROR`, `401 UNAUTHORIZED` (invalid/expired/mismatched) |
| **MongoDB Changes** | Updates `User.refreshToken` with new token (rotation) |
| **Business Logic** | Verify refresh JWT → find user → compare stored token → generate new pair → save new refresh |
| **Edge Cases** | Old refresh token rejected after rotation. Expired refresh → 401. |
| **Postman Test Cases** | ✅ Valid refresh → 200 + new tokens. ✅ Old token after refresh → 401. ✅ Random string → 401. ✅ Missing refreshToken → 400. |

---

### Endpoint 1.4: `POST /api/v1/auth/logout`

| Attribute | Value |
|---|---|
| **Purpose** | Revoke refresh token |
| **Authentication** | **Required** (Bearer token) |
| **Headers** | `Authorization: Bearer <accessToken>` |
| **Request Body** | None |
| **Success Response** | `200 { success: true, data: { message: "Logged out" } }` |
| **Error Responses** | `401 UNAUTHORIZED` (no/invalid token) |
| **MongoDB Changes** | Sets `User.refreshToken` to `''` |
| **Postman Test Cases** | ✅ Logout with valid token → 200. ✅ Logout without token → 401. ✅ Refresh after logout → 401 (token cleared). |

---

### Endpoint 1.5: `GET /api/v1/auth/me`

| Attribute | Value |
|---|---|
| **Purpose** | Return current user's profile |
| **Authentication** | **Required** |
| **Headers** | `Authorization: Bearer <accessToken>` |
| **Success Response** | `200 { success: true, data: { user: { _id, name, email, avatar, plan } } }` |
| **Error Responses** | `401 UNAUTHORIZED` |
| **Postman Test Cases** | ✅ Valid token → 200 + user. ✅ No token → 401. ✅ Expired token → 401. ✅ No password in response. ✅ No refreshToken in response. |

---

## Phase 2 — Verify Existing Project Endpoints

### Goal: Confirm all 8 project endpoints work correctly in Postman.

---

### Endpoint 2.1: `POST /api/v1/projects` — Create Project

| Attribute | Value |
|---|---|
| **Purpose** | Create a new innovation project |
| **Authentication** | Required |
| **Validation Rules** | `title`: 3-100, required. `description`: 10-4000, required. `teamSize`: int 1-100. `skillLevel`: beginner/intermediate/advanced. |
| **Success Response** | `201 { success: true, data: { _id, title, status: 'draft', ... } }` |
| **MongoDB Changes** | Creates `Project` doc + `ProjectMember` (role: owner) via upsert |
| **Postman Test Cases** | ✅ Valid project → 201. ✅ Status is 'draft'. ✅ Missing title → 400. ✅ Description too short (<10) → 400. ✅ TeamSize 0 → 400. ✅ TeamSize 101 → 400. ✅ Invalid skillLevel → 400. |

### Endpoint 2.2: `GET /api/v1/projects` — List Projects

| **Postman Test Cases** | ✅ Returns owned projects. ✅ Returns member projects. ✅ Excludes deleted projects. ✅ Pagination works (page=2). ✅ Status filter works. |

### Endpoint 2.3: `GET /api/v1/projects/:id` — Get Project

| **Postman Test Cases** | ✅ Owner → 200. ✅ Member (viewer) → 200. ✅ Non-member → 403. ✅ Invalid ID format → 500. ✅ Non-existent ID → 404. |

### Endpoint 2.4: `PUT /api/v1/projects/:id` — Update Project

| **Postman Test Cases** | ✅ Editor can update → 200. ✅ Viewer cannot update → 403. ✅ Owner can update → 200. ✅ Non-member → 403. ✅ Partial update (only title) → 200 with other fields unchanged. |

### Endpoint 2.5: `DELETE /api/v1/projects/:id` — Delete Project

| **Postman Test Cases** | ✅ Owner → soft delete (status='deleted'). ✅ Editor → 403. ✅ Viewer → 403. ✅ Deleted project excluded from list. |

### Endpoint 2.6: `GET /api/v1/projects/:id/stats` — Project Stats

| **Postman Test Cases** | ✅ Returns sourceCount, gapCount, solutionCount, lastJobStatus. ✅ All zero for fresh project. ✅ Viewer can access → 200. |

### Endpoint 2.7: `POST /api/v1/projects/:id/members` — Add Member

| **Postman Test Cases** | ✅ Owner adds editor → 201. ✅ Owner adds viewer → 201. ✅ Non-existent email → 404. ✅ Already a member → 409. ✅ Adding owner email → 409. ✅ role='owner' → 400 (Zod rejects). ✅ Editor cannot add member → 403. |

### Endpoint 2.8: `DELETE /api/v1/projects/:id/members/:userId` — Remove Member

| **Postman Test Cases** | ✅ Owner removes editor → 200. ✅ Cannot remove owner → 404 (filtered out). ✅ Editor cannot remove → 403. |

---

## Phase 3 — Provider Registry + Normalizer (NEW CODE)

### Goal: Build `ProviderRegistry` and `normalizer.ts` — testable via a new admin endpoint.

**Create a temporary test endpoint:**

### Endpoint 3.1: `POST /api/v1/research/:id/test-providers` (temporary, remove later)

| Attribute | Value |
|---|---|
| **Purpose** | Execute provider search and return raw normalized results (development only) |
| **Authentication** | Required + `projectAuth('editor')` |
| **Request Body** | `{ "query": "machine learning healthcare", "providers": ["arxiv", "semanticScholar"] }` |
| **Success Response** | `200 { success: true, data: { sources: NormalizedSource[], providerResults: { provider, count, durationMs }[] } }` |
| **MongoDB Changes** | None (dry run) |
| **Business Logic** | ProviderRegistry.search(query, selectedProviders) → dedup → return |
| **Postman Test Cases** | ✅ arXiv returns papers. ✅ Semantic Scholar returns papers. ✅ GitHub returns repos (if token set). ✅ Serper returns web results (if key set). ✅ Unconfigured provider returns empty. ✅ Invalid query returns empty. ✅ Results are deduplicated. ✅ All results have NormalizedSource shape. ✅ Each result has provider, sourceType, title, url. |

---

## Phase 4 — AI Agent Framework (NEW CODE)

### Goal: Build base agent + all 8 research agents. Test via endpoint.

### Endpoint 4.1: `POST /api/v1/research/:id/test-agent` (temporary)

| Attribute | Value |
|---|---|
| **Purpose** | Execute a single agent and return its raw output |
| **Authentication** | Required + `projectAuth('editor')` |
| **Request Body** | `{ "agent": "problemUnderstanding" }` |
| **Success Response** | `200 { data: { agent, durationMs, output: {...} } }` |
| **Postman Test Cases** | ✅ problemUnderstanding returns structured concepts. ✅ queryPlanner returns search queries. ✅ Invalid agent name → 400. ✅ Gemini not configured → 503. |

---

## Phase 5 — Research Orchestrator + Worker (NEW CODE)

### Goal: Full pipeline execution via BullMQ. Test via existing `POST /research/:id/start`.

### Endpoint 5.1: `POST /api/v1/research/:id/start` (update existing)

| Attribute | Value |
|---|---|
| **Purpose** | Queue a full research pipeline job |
| **Authentication** | Required + `projectAuth('editor')` |
| **Request Body** | `{ "force": false }` |
| **Success Response** | `202 { data: { jobId, status: 'queued' } }` |
| **MongoDB Changes** | Creates `ResearchJob`, updates `Project.status='researching'` |
| **Business Logic** | Check no active job → create job → add to BullMQ → return jobId |
| **Postman Test Cases** | ✅ Start → 202 + jobId. ✅ Double start → 409. ✅ GET /job shows status progression. ✅ After completion: GET /sources returns data. ✅ After completion: GET /evidence returns data. ✅ After completion: GET /gaps returns data. ✅ After completion: GET /architecture returns data. ✅ After completion: GET /roadmap returns data. ✅ Project.status → 'complete'. ✅ ResearchJob.progress → 100. ✅ All 11 stages → 'completed'. |

---

## Phase 6 — WebSocket Layer (NEW CODE)

### Goal: Research progress and copilot streaming. Test via Socket.io client in Postman (or wscat).

### Socket Event Tests:

| Test | How to verify |
|---|---|
| Connection with valid JWT | wscat connects successfully |
| Connection with invalid JWT | Connection rejected |
| Join project room | `project:joined` event received |
| Research progress | `research:progress` events during pipeline |
| Research complete | `research:complete` event after pipeline |

---

## Phase 7 — RAG Pipeline (NEW CODE)

### Goal: Embed and retrieve research sources. Test via copilot endpoint.

### Endpoint 7.1: `POST /api/v1/copilot/:id/chat` (update existing)

| Attribute | Value |
|---|---|
| **Purpose** | Chat with RAG-enhanced copilot |
| **Request Body** | `{ "message": "What existing solutions compete with this idea?" }` |
| **Success Response** | `200 { data: { conversationId, answer: "Based on the research sources..." } }` |
| **Business Logic** | Load project → RAG retrieve → build prompt → generate → persist conversation → return |
| **Postman Test Cases** | ✅ Chat returns contextual answer. ✅ Answer references research sources. ✅ ConversationId is consistent across messages. ✅ GET /history returns conversation. ✅ GET /conversations lists conversations. ✅ Empty project → still works (no RAG context). |

---

## Phase 8 — Notifications (NEW CODE)

### Endpoint 8.1: `GET /api/v1/notifications`

| Attribute | Value |
|---|---|
| **Purpose** | List user's notifications |
| **Authentication** | Required |
| **Query Params** | `?read=false&page=1&limit=20` |
| **Success Response** | `200 { data: { items: [...], pagination: {...} } }` |
| **Postman Test Cases** | ✅ Returns notifications for user. ✅ Unread filter works. ✅ Pagination works. |

### Endpoint 8.2: `PUT /api/v1/notifications/:id/read`

| **Postman Test Cases** | ✅ Marks notification as read → 200. ✅ Already read → 200 (idempotent). ✅ Other user's notification → 403. |

---

## Execution Rules

1. **Complete Phase 0** before anything else — the server must start.
2. **Phases 1-2** are verification only — run Postman tests against existing endpoints.
3. **Phases 3-8** are new code — each phase produces working, Postman-verified endpoints.
4. **No phase can begin** until the previous phase's Postman tests all pass.
5. **No frontend code** at any point.
6. **Update `15_BACKEND_STATUS.md`** after each phase completes.
7. **Update `CLAUDE_HANDOFF.md`** at the end of each session.
