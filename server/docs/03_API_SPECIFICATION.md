# 03 — API Specification

> **Scope:** Complete REST API reference for every endpoint in the NEXUS backend — request format, response format, authentication requirements, validation, error responses, and sequence diagrams.

---

## 1. Purpose

Serve as the single authoritative API contract between the NEXUS backend and any consumer (frontend, mobile, third-party). Every endpoint's URL, method, headers, body, query parameters, response shape, and error cases are defined here.

---

## 2. Base URL & Conventions

| Attribute | Value |
|---|---|
| **Base URL** | `http://localhost:5000` (dev) |
| **API Prefix** | `/api/v1` |
| **Content-Type** | `application/json` |
| **Body Limit** | 2 MB |
| **Auth Header** | `Authorization: Bearer <accessToken>` |

### 2.1 Response Envelope

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "message": "Human-readable message",
    "code": "ERROR_CODE"
  }
}
```

**Validation Error (400):**
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "email": ["Invalid email"]
      }
    }
  }
}
```

### 2.2 Pagination Envelope

```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 42
    }
  }
}
```

---

## 3. Health Check

### `GET /health`

| Attribute | Value |
|---|---|
| Auth | None |
| Rate Limit | General (100/15min) |

**Response (200):**
```json
{ "success": true, "data": { "status": "ok" } }
```

---

## 4. Authentication Endpoints — `/api/v1/auth`

**Rate Limit:** Auth limiter (5 requests / 15 minutes)

### 4.1 `POST /api/v1/auth/register`

**Purpose:** Create a new user account and issue tokens.

| Attribute | Value |
|---|---|
| Auth | None |
| Rate Limit | Auth (5/15min) |
| Validation | `registerSchema` |

**Request Body:**
```json
{
  "name": "John Doe",          // string, 2-50 chars, required
  "email": "john@example.com", // valid email, required
  "password": "securePass123"  // string, 8-100 chars, required
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "email": "john@example.com",
      "name": "John Doe"
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Errors:**

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid name/email/password |
| 409 | `CONFLICT` | Email already registered |
| 429 | `RATE_LIMITED` | Too many requests |

**Sequence Diagram:**
```
Client                    Server                    MongoDB
  │                         │                         │
  │  POST /auth/register    │                         │
  │  { name, email, pass }  │                         │
  │────────────────────────►│                         │
  │                         │  authLimiter check      │
  │                         │  validate(registerSchema)│
  │                         │                         │
  │                         │  User.findOne({email})  │
  │                         │────────────────────────►│
  │                         │◄────────────────────────│ null (ok)
  │                         │                         │
  │                         │  User.create(...)       │
  │                         │  (pre-save: bcrypt hash)│
  │                         │────────────────────────►│
  │                         │◄────────────────────────│ user doc
  │                         │                         │
  │                         │  generateAccessToken()  │
  │                         │  generateRefreshToken() │
  │                         │  user.refreshToken=token│
  │                         │  user.save()            │
  │                         │────────────────────────►│
  │                         │◄────────────────────────│
  │                         │                         │
  │  201 { user, tokens }   │                         │
  │◄────────────────────────│                         │
```

---

### 4.2 `POST /api/v1/auth/login`

**Purpose:** Authenticate with credentials and receive tokens.

| Attribute | Value |
|---|---|
| Auth | None |
| Rate Limit | Auth (5/15min) |
| Validation | `loginSchema` |

**Request Body:**
```json
{
  "email": "john@example.com",  // valid email, required
  "password": "securePass123"   // string, min 1, required
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "email": "john@example.com",
      "name": "John Doe"
    },
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."
  }
}
```

**Errors:**

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing/invalid fields |
| 401 | `UNAUTHORIZED` | Wrong email or password (non-enumerating message) |
| 429 | `RATE_LIMITED` | Too many attempts |

**Sequence Diagram:**
```
Client                    Server                    MongoDB
  │                         │                         │
  │  POST /auth/login       │                         │
  │  { email, password }    │                         │
  │────────────────────────►│                         │
  │                         │  authLimiter check      │
  │                         │  validate(loginSchema)  │
  │                         │                         │
  │                         │  User.findOne({email})  │
  │                         │  .select('+password')   │
  │                         │────────────────────────►│
  │                         │◄────────────────────────│ user (or null→401)
  │                         │                         │
  │                         │  user.comparePassword() │
  │                         │  (bcrypt.compare)       │
  │                         │  false → throw 401      │
  │                         │                         │
  │                         │  generateAccessToken()  │
  │                         │  generateRefreshToken() │
  │                         │  user.refreshToken=token│
  │                         │  user.save()            │
  │                         │────────────────────────►│
  │                         │                         │
  │  200 { user, tokens }   │                         │
  │◄────────────────────────│                         │
```

---

### 4.3 `POST /api/v1/auth/logout`

**Purpose:** Revoke the current user's refresh token.

| Attribute | Value |
|---|---|
| Auth | **Required** (Bearer token) |
| Rate Limit | General |
| Validation | None |

**Request Body:** None required.

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Logged out" }
}
```

**Sequence Diagram:**
```
Client                    Server                    MongoDB
  │                         │                         │
  │  POST /auth/logout      │                         │
  │  Authorization: Bearer  │                         │
  │────────────────────────►│                         │
  │                         │  verifyAuth → req.user  │
  │                         │                         │
  │                         │  User.findByIdAndUpdate  │
  │                         │  (userId, {refreshToken:''})│
  │                         │────────────────────────►│
  │                         │◄────────────────────────│
  │                         │                         │
  │  200 { message }        │                         │
  │◄────────────────────────│                         │
```

---

### 4.4 `POST /api/v1/auth/refresh`

**Purpose:** Exchange a valid refresh token for a new access + refresh token pair.

| Attribute | Value |
|---|---|
| Auth | None (token in body) |
| Rate Limit | Auth (5/15min) |
| Validation | `refreshSchema` |

**Request Body:**
```json
{
  "refreshToken": "eyJhbGci..."  // string, min 1, required
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...(new)",
    "refreshToken": "eyJhbGci...(new)"
  }
}
```

**Errors:**

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing refresh token |
| 401 | `UNAUTHORIZED` | Invalid / expired / mismatched token |

---

### 4.5 `GET /api/v1/auth/me`

**Purpose:** Return the authenticated user's profile.

| Attribute | Value |
|---|---|
| Auth | **Required** |
| Rate Limit | General |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "665a1b2c3d4e5f6a7b8c9d0e",
      "email": "john@example.com",
      "name": "John Doe"
    }
  }
}
```

---

## 5. Project Endpoints — `/api/v1/projects`

**Auth:** All endpoints require `verifyAuth`.

### 5.1 `GET /api/v1/projects`

**Purpose:** List projects the current user owns or is a member of.

| Attribute | Value |
|---|---|
| Auth | **Required** |
| Rate Limit | General |
| Project Auth | None (filters by user) |

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number (min: 1) |
| `limit` | number | `10` | Items per page (max: 50) |
| `status` | string | — | Filter by project status |

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "_id": "...",
        "title": "AI Health Monitor",
        "description": "...",
        "status": "draft",
        "userId": "...",
        "domain": "healthcare",
        "researchProgress": 0,
        "createdAt": "2026-07-15T10:00:00Z",
        "updatedAt": "2026-07-15T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3
    }
  }
}
```

**Database Interactions:**
1. `ProjectMember.find({ userId }).distinct('projectId')` — get member project IDs
2. `Project.find({ $or: [owner, member], status ≠ deleted })` — paginated query
3. `Project.countDocuments(query)` — total count

---

### 5.2 `POST /api/v1/projects`

**Purpose:** Create a new project.

| Attribute | Value |
|---|---|
| Auth | **Required** |
| Validation | `createProjectSchema` |

**Request Body:**
```json
{
  "title": "AI Health Monitor",         // 3-100 chars, required
  "description": "An AI-powered...",    // 10-4000 chars, required
  "domain": "healthcare",              // optional
  "projectType": "web app",            // optional
  "targetUsers": "doctors, patients",  // optional
  "platform": "web",                   // optional
  "preferredTech": ["React", "Node.js"], // optional string array
  "constraints": "HIPAA compliance",   // optional
  "teamSize": 3,                       // 1-100, optional
  "timeline": "3 months",             // optional
  "skillLevel": "intermediate",        // beginner|intermediate|advanced, optional
  "tags": ["ai", "health"]            // string array, optional
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "title": "AI Health Monitor",
    "status": "draft",
    "userId": "...",
    ...
  }
}
```

**Side Effects:**
- Creates `ProjectMember` with role `owner` for the creator (upsert)

---

### 5.3 `GET /api/v1/projects/:id`

| Auth | `verifyAuth` + `projectAuth('viewer')` |
|---|---|

**Response (200):** Full project document.

---

### 5.4 `PUT /api/v1/projects/:id`

| Auth | `verifyAuth` + `projectAuth('editor')` |
|---|---|
| Validation | `updateProjectSchema` (partial) |

**Response (200):** Updated project document.

---

### 5.5 `DELETE /api/v1/projects/:id`

| Auth | `verifyAuth` + `projectAuth('owner')` |
|---|---|

**Response (200):**
```json
{
  "success": true,
  "data": { "id": "...", "status": "deleted" }
}
```

**Behavior:** Soft-delete — sets `status: 'deleted'`. Does NOT cascade to related documents.

---

### 5.6 `GET /api/v1/projects/:id/stats`

| Auth | `verifyAuth` + `projectAuth('viewer')` |
|---|---|

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sourceCount": 47,
    "gapCount": 8,
    "solutionCount": 12,
    "lastJobStatus": "completed",
    "lastJobProgress": 100,
    "lastJobUpdatedAt": "2026-07-20T14:30:00Z"
  }
}
```

**Database Interactions (parallel):**
1. `ResearchSource.countDocuments({ projectId })`
2. `InnovationGap.countDocuments({ projectId })`
3. `ExistingSolution.countDocuments({ projectId })`
4. `ResearchJob.findOne({ projectId }).sort({ createdAt: -1 })`

---

### 5.7 `POST /api/v1/projects/:id/members`

| Auth | `verifyAuth` + `projectAuth('owner')` |
|---|---|
| Validation | `addMemberSchema` |

**Request Body:**
```json
{
  "email": "collaborator@example.com",  // valid email, required
  "role": "editor"                      // editor|viewer, default: viewer
}
```

**Response (201):** Created `ProjectMember` document.

**Errors:**

| Status | Code | Condition |
|---|---|---|
| 404 | `NOT_FOUND` | Email not found in users |
| 409 | `CONFLICT` | User is already the project owner |
| 409 | `CONFLICT` | User is already a project member |

**Security:** The `addMemberSchema` restricts `role` to `editor` or `viewer` only — `owner` cannot be assigned through this endpoint.

---

### 5.8 `DELETE /api/v1/projects/:id/members/:userId`

| Auth | `verifyAuth` + `projectAuth('owner')` |
|---|---|

**Response (200):**
```json
{
  "success": true,
  "data": { "userId": "...", "removed": true }
}
```

**Guard:** Cannot remove the owner (query filters `role: { $ne: 'owner' }`).

---

## 6. Research Endpoints — `/api/v1/research/:id`

**Auth:** All endpoints require `verifyAuth` + `projectAuth('viewer')` + `researchLimiter`.  
**Note:** The `:id` is the **project ID**, not the research job ID. It is passed via `mergeParams: true` from the mount path in `app.ts`.

### 6.1 `POST /api/v1/research/:id/start`

**Purpose:** Create a queued research job for the project.

| Auth | `verifyAuth` + `projectAuth('editor')` |
|---|---|
| Validation | `startResearchSchema` |
| Rate Limit | Research (10/15min) |

**Request Body:**
```json
{
  "force": false  // boolean, optional, default: false
}
```

**Response (202):**
```json
{
  "success": true,
  "data": {
    "jobId": "665a1b2c3d4e5f6a7b8c9d0e",
    "status": "queued"
  }
}
```

**Errors:**

| Status | Code | Condition |
|---|---|---|
| 404 | `NOT_FOUND` | Project not found or deleted |
| 409 | `CONFLICT` | Another job is already queued or running |

**Side Effects:**
1. Creates `ResearchJob` with status `queued` and all 11 stages as `pending`
2. Updates `Project.status` to `researching` and `researchProgress` to `0`
3. **[PLANNED]** Adds job to BullMQ `research` queue

**Sequence Diagram:**
```
Client              Server                     MongoDB            [PLANNED] Redis/BullMQ
  │                   │                          │                       │
  │ POST /start       │                          │                       │
  │──────────────────►│                          │                       │
  │                   │ verifyAuth               │                       │
  │                   │ projectAuth('editor')    │                       │
  │                   │ validate                 │                       │
  │                   │                          │                       │
  │                   │ ResearchJob.findOne      │                       │
  │                   │ (running/queued check)   │                       │
  │                   │─────────────────────────►│                       │
  │                   │◄─────────────────────────│ null (ok)             │
  │                   │                          │                       │
  │                   │ ResearchJob.create       │                       │
  │                   │─────────────────────────►│                       │
  │                   │◄─────────────────────────│ job doc               │
  │                   │                          │                       │
  │                   │ Project.findByIdAndUpdate │                       │
  │                   │ (status: researching)    │                       │
  │                   │─────────────────────────►│                       │
  │                   │                          │                       │
  │                   │ [PLANNED] queue.add()    │                       │
  │                   │─────────────────────────────────────────────────►│
  │                   │                          │                       │
  │ 202 { jobId }     │                          │                       │
  │◄──────────────────│                          │                       │
```

---

### 6.2 `GET /api/v1/research/:id/job`

**Purpose:** Get the latest research job for the project.

**Response (200):** Full `ResearchJob` document including all stages.

---

### 6.3 `GET /api/v1/research/:id/sources`

**Purpose:** Paginated list of research sources.

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | number | `1` | Page number |
| `limit` | number | `20` | Items per page (max: 100) |
| `type` | string | — | Filter by `sourceType` |

**Response (200):** Paginated `{ items, pagination }` envelope.

---

### 6.4 `GET /api/v1/research/:id/evidence`

**Response (200):** `{ data: EvidenceClaim[] }` — all claims for the project, sorted by `createdAt` descending.

### 6.5 `GET /api/v1/research/:id/solutions`

**Response (200):** `{ data: ExistingSolution[] }` — sorted by `createdAt` descending.

### 6.6 `GET /api/v1/research/:id/gaps`

**Response (200):** `{ data: InnovationGap[] }` — sorted by `createdAt` descending.

### 6.7 `GET /api/v1/research/:id/architecture`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "architecture": { ... } | null,
    "recommendations": [ ... ],
    "preferredTech": ["React", "Node.js"],
    "constraints": "HIPAA compliance" | null
  }
}
```

### 6.8 `GET /api/v1/research/:id/resources`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "resources": [ ... ]
  }
}
```

### 6.9 `GET /api/v1/research/:id/roadmap`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "roadmap": { ... } | null
  }
}
```

### 6.10 `POST /api/v1/research/:id/stresstest`

| Auth | `verifyAuth` + `projectAuth('editor')` |
|---|---|

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Stress test request accepted",
    "projectId": "..."
  }
}
```

**Error:** Returns 400 if no evidence claims exist for the project.

---

## 7. Copilot Endpoints — `/api/v1/copilot/:id`

**Auth:** All endpoints require `verifyAuth` + `projectAuth('viewer')`.

### 7.1 `POST /api/v1/copilot/:id/chat`

**Purpose:** Send a message to the AI copilot with project context.

| Attribute | Value |
|---|---|
| Validation | `copilotChatSchema` |

**Request Body:**
```json
{
  "message": "What architecture should I use?",  // 1-8000 chars, required
  "conversationId": "conv-abc-123"               // 1-200 chars, optional
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv-abc-123",
    "answer": "Based on your project requirements..."
  }
}
```

**Errors:**

| Status | Code | Condition |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Empty or missing message |
| 503 | `BAD_GATEWAY` | Gemini API key not configured |

**Sequence Diagram:**
```
Client              Server                    Gemini API           MongoDB
  │                   │                          │                   │
  │ POST /chat        │                          │                   │
  │ { message }       │                          │                   │
  │──────────────────►│                          │                   │
  │                   │ verifyAuth + projectAuth │                   │
  │                   │ validate(copilotChat)    │                   │
  │                   │                          │                   │
  │                   │ aiProvider.isConfigured() │                   │
  │                   │ (false → throw 503)      │                   │
  │                   │                          │                   │
  │                   │ Project.findById         │                   │
  │                   │ (.select title,desc,domain)                  │
  │                   │─────────────────────────────────────────────►│
  │                   │◄─────────────────────────────────────────────│
  │                   │                          │                   │
  │                   │ Build prompt:            │                   │
  │                   │ title + domain + desc    │                   │
  │                   │ + user message           │                   │
  │                   │                          │                   │
  │                   │ aiProvider.generate()    │                   │
  │                   │─────────────────────────►│                   │
  │                   │◄─────────────────────────│ answer text       │
  │                   │                          │                   │
  │ 200 { answer }    │                          │                   │
  │◄──────────────────│                          │                   │
```

---

### 7.2 `GET /api/v1/copilot/:id/conversations`

**Purpose:** List conversations for the project.

**Response (200):** Currently returns an empty result (stub — `Conversation` model not yet implemented).

### 7.3 `GET /api/v1/copilot/:id/history`

**Purpose:** Get conversation history.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "projectId": "...",
    "items": []
  }
}
```

**Status:** Stub — returns empty array. Full implementation requires the `Conversation` model.

---

## 8. Error Reference

### 8.1 Global Error Codes

| Code | HTTP | Description |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Zod validation failure |
| `UNAUTHORIZED` | 401 | Missing/invalid/expired token |
| `FORBIDDEN` | 403 | Insufficient role for operation |
| `NOT_FOUND` | 404 | Resource does not exist |
| `CONFLICT` | 409 | Duplicate resource or state conflict |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `BAD_GATEWAY` | 502/503 | External service unavailable |

### 8.2 Rate Limit Headers

When rate limited, `express-rate-limit` returns:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 900
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1722345678
```

---

## 9. Security Summary per Endpoint Group

| Group | Auth | Rate Limit | Validation | Project Auth |
|---|---|---|---|---|
| Health | None | General | None | None |
| Auth (register/login/refresh) | None | Auth (5/15min) | Zod | None |
| Auth (logout/me) | Bearer | General | None | None |
| Projects (list/create) | Bearer | General | Zod (create) | None |
| Projects (CRUD) | Bearer | General | Zod (update) | viewer/editor/owner |
| Projects (members) | Bearer | General | Zod (add) | owner |
| Research (reads) | Bearer | Research (10/15min) | None | viewer |
| Research (mutations) | Bearer | Research (10/15min) | Zod | editor |
| Copilot | Bearer | General | Zod (chat) | viewer |

---

## 10. Future Improvements

1. **OpenAPI/Swagger Generation**: Auto-generate from Zod schemas + route metadata
2. **Cursor-Based Pagination**: Replace offset pagination for large collections
3. **ETags & Conditional Requests**: `If-None-Match` for cached reads
4. **Batch Operations**: `POST /projects/batch` for bulk actions
5. **Webhooks**: Event notifications for third-party integrations
6. **API Versioning**: Header-based (`Accept: application/vnd.nexus.v2+json`) or path-based
7. **Response Filtering**: `?fields=title,status` for sparse fieldsets

---

## 11. Testing Strategy

| Test Type | Scope | Tool |
|---|---|---|
| Contract tests | Validate response shapes match this spec | Supertest + Vitest |
| Auth tests | Verify all auth flows | Supertest against test DB |
| Permission tests | Verify role enforcement | Parameterized tests per role |
| Validation tests | Verify Zod rejection | Send invalid payloads |
| Rate limit tests | Verify throttling | Burst requests |
| Error tests | Verify error envelope shape | Trigger each error code |
