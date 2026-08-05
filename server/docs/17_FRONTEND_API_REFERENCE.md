# 17 — Frontend API Reference

> **Source of truth:** live routes, controllers, validation schemas, and Socket.io handlers in `src/`.
> **Last verified against source:** 2026-07-31.

This is the implementation-facing contract for the NEXUS frontend. It documents what the backend currently accepts and returns; it deliberately does not promise planned features that have not been wired into the current API.

## 1. Connection and conventions

```env
# frontend/.env
VITE_API_URL=http://localhost:5000/api/v1
VITE_WS_URL=http://localhost:5000
```

- API base URL: `http://localhost:5000/api/v1`
- Health URL: `http://localhost:5000/health` (outside `/api/v1`)
- Content type: `application/json`
- Protected routes require `Authorization: Bearer <accessToken>`.
- IDs are MongoDB ObjectId strings.
- Dates are JSON ISO-8601 strings.
- Access token default lifetime: 15 minutes. Refresh token default lifetime: 7 days.

Every successful route returns:

```ts
type ApiSuccess<T> = { success: true; data: T };
```

Errors return:

```ts
type ApiFailure = {
  success: false;
  error: {
    message: string;
    code: 'VALIDATION_ERROR' | 'UNAUTHORIZED' | 'FORBIDDEN' |
      'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED' |
      'INTERNAL_ERROR' | 'BAD_GATEWAY';
    details?: Record<string, unknown>; // Present for Zod body-validation failures
  };
};
```

Rate limits are currently in-memory: 100 requests/15 minutes globally, 5 auth requests/15 minutes, and 10 research requests/15 minutes.

## 2. Frontend HTTP client

The backend uses body-based refresh tokens, not cookies. Keep both tokens together, attach only the access token to normal requests, and rotate both tokens whenever refresh succeeds.

```ts
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
});

api.interceptors.request.use((request) => {
  const token = authStore.getState().accessToken;
  if (token) request.headers.Authorization = `Bearer ${token}`;
  return request;
});
```

On one `401`, call `POST /auth/refresh` with `{ refreshToken }`, replace the stored access and refresh tokens with the returned pair, then retry the original request once. If refresh fails, clear local auth state and redirect to login. Do not attempt refresh for the refresh request itself.

## 3. Authentication

No authorization header is needed for register, login, or refresh. Logout and `/me` need an access token.

### `POST /auth/register`

```json
{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "at-least-8-characters" }
```

Validation: name 2–50 chars, valid email, password 8–100 chars.

Returns `201`:

```json
{
  "success": true,
  "data": {
    "user": { "_id": "...", "email": "ada@example.com", "name": "Ada Lovelace" },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### `POST /auth/login`

```json
{ "email": "ada@example.com", "password": "at-least-8-characters" }
```

Returns `200` with the same payload as register. Invalid credentials return `401 UNAUTHORIZED`.

### `POST /auth/refresh`

```json
{ "refreshToken": "..." }
```

Returns `200`:

```json
{ "success": true, "data": { "accessToken": "...", "refreshToken": "..." } }
```

Refresh tokens rotate: replace the old stored refresh token immediately. A later login also invalidates the previous session's refresh token.

### `POST /auth/logout`

Requires auth. No body. Returns `{ "message": "Logged out" }` and invalidates the current user's stored refresh token.

### `GET /auth/me`

Requires auth. Returns:

```json
{ "success": true, "data": { "user": { "_id": "...", "email": "...", "name": "..." } } }
```

## 4. Project API

All routes below require auth. Roles are hierarchical: `viewer < editor < owner`.

| Capability | Required role |
|---|---|
| List accessible projects; read project and research data | viewer |
| Create/update project; start/preview research; test an agent | editor |
| Delete project; add/remove members | owner |

### Project model used by the UI

```ts
type ProjectStatus = 'draft' | 'researching' | 'complete' | 'failed' | 'deleted';
type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

interface Project {
  _id: string;
  title: string;
  description: string;
  userId: string;
  status: ProjectStatus;
  domain?: string;
  projectType?: string;
  targetUsers?: string;
  platform?: string;
  preferredTech: string[];
  constraints?: string;
  teamSize?: number;
  timeline?: string;
  skillLevel?: SkillLevel;
  researchProgress: number;
  confidenceScore: number;
  healthScore: number;
  problemUnderstanding?: unknown;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
```

### `GET /projects?page=1&limit=10&status=draft`

Lists projects owned by or shared with the caller, newest updated first. `page` defaults to 1; `limit` defaults to 10 and is capped at 50. Omit `status` to exclude deleted projects.

```ts
type ProjectList = { items: Project[]; pagination: { page: number; limit: number; total: number } };
```

### `POST /projects`

Requires auth; the caller becomes the owner. Required fields are `title` (3–100 chars) and `description` (10–4000 chars).

```json
{
  "title": "NEXUS Copilot",
  "description": "An AI research copilot for software projects.",
  "domain": "developer tools",
  "projectType": "SaaS",
  "targetUsers": "software teams",
  "platform": "web",
  "preferredTech": ["React", "Node.js"],
  "constraints": "Small team",
  "teamSize": 3,
  "timeline": "3 months",
  "skillLevel": "intermediate",
  "tags": ["AI", "research"]
}
```

`preferredTech` may also be a comma-separated string. Returns `201` with a `Project`.

### `GET /projects/:projectId`

Viewer or above. Returns a `Project`.

### `PUT /projects/:projectId`

Editor or above. Accepts any subset of the create-project body. Returns the updated `Project`.

### `DELETE /projects/:projectId`

Owner only. This is a soft delete. Returns:

```json
{ "success": true, "data": { "id": "...", "status": "deleted" } }
```

### `GET /projects/:projectId/stats`

Viewer or above. Returns:

```ts
{
  sourceCount: number;
  gapCount: number;
  solutionCount: number;
  lastJobStatus: ResearchJobStatus | null;
  lastJobProgress: number | null;
  lastJobUpdatedAt: string | null;
}
```

### `POST /projects/:projectId/members`

Owner only. The invited user must already have an account.

```json
{ "email": "member@example.com", "role": "viewer" }
```

`role` is `viewer` or `editor`; ownership cannot be transferred through this route. Returns `201` with the membership record.

### `DELETE /projects/:projectId/members/:userId`

Owner only. Returns `{ "userId": "...", "removed": true }`.

## 5. Research API

Base path: `/research/:projectId`. Every research route requires viewer access and uses the research rate limiter. Mutating routes require editor access.

### Job and stage types

```ts
type ResearchJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

interface ResearchStage {
  key: 'understand' | 'plan' | 'search_web' | 'search_papers' | 'search_github' |
    'analyze' | 'solutions' | 'gaps' | 'stress' | 'architecture' | 'roadmap';
  label: string;
  status: StageStatus;
  startedAt?: string;
  completedAt?: string;
  note?: string;
}

interface ResearchJob {
  _id: string;
  projectId: string;
  userId: string;
  status: ResearchJobStatus;
  progress: number;
  stages: ResearchStage[];
  sourceCount: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: unknown;
  createdAt: string;
  updatedAt: string;
}
```

### `POST /research/:projectId/start`

Editor or above. Body is optional; send `{}`. The accepted `force` field currently **does not** override an existing queued/running job.

Returns `202`:

```json
{ "success": true, "data": { "jobId": "...", "status": "queued" } }
```

If research is already queued or running, returns `409 CONFLICT`. Start a job then poll its status; Socket events are supplementary only.

### `GET /research/:projectId/job`

Returns the latest `ResearchJob` for the project. It returns `404` when the project has never been researched.

Polling recommendation: refetch every 3–5 seconds while status is `queued` or `running`, stop for a terminal status.

### `GET /research/:projectId/sources?page=1&limit=20&type=paper`

Returns paginated research sources. Limit defaults to 20 and is capped at 100. `type` is an optional source type filter: `paper`, `article`, `repo`, `dataset`, `api`, or `web`.

```ts
interface ResearchSource {
  _id: string;
  projectId: string;
  researchJobId?: string;
  provider: 'serper' | 'github' | 'arxiv' | 'semanticScholar';
  sourceType: 'paper' | 'article' | 'repo' | 'dataset' | 'api' | 'web';
  title: string;
  url?: string;
  authors: string[];
  publishedAt?: string;
  snippet?: string;
  content?: string;
  query?: string;
  metadata?: unknown;
  relevanceScore: number;
  credibilityScore: number;
  retrievedAt: string;
  createdAt: string;
}
```

Response: `{ items: ResearchSource[], pagination: { page, limit, total } }`.

### Research result reads

| Route | Returns |
|---|---|
| `GET /research/:projectId/evidence` | Array of evidence-claim documents |
| `GET /research/:projectId/solutions` | Array of existing-solution documents |
| `GET /research/:projectId/gaps` | Array of innovation-gap documents |
| `GET /research/:projectId/architecture` | `{ architecture, recommendations, preferredTech, constraints }` |
| `GET /research/:projectId/resources` | `{ resources }` — currently usually an empty array unless supplied by a future agent output |
| `GET /research/:projectId/roadmap` | `{ roadmap }` |

`architecture`, `recommendations`, and `roadmap` are AI-produced structured data stored under `Project.problemUnderstanding`. Render them defensively: fields may be absent until research finishes or if a job fails.

### `POST /research/:projectId/preview`

Editor or above. Runs configured search providers synchronously without saving data or creating a job. Intended for an internal preview/debug UI.

```json
{ "query": "AI research tools for software teams" }
```

Query must be 1–500 chars. Returns `{ query, providers, outcomes, total, sources }`.

### `POST /research/:projectId/test-agent`

Editor or above. Internal development tool, not a normal product action.

```json
{ "agent": "problemUnderstanding" }
```

The schema accepts all eight agent names, but the current controller only runs `problemUnderstanding` and `queryPlanner`; other names return `400 VALIDATION_ERROR`.

### `POST /research/:projectId/stresstest`

Editor or above. Currently checks that evidence exists and returns an accepted message; it does not yet execute the Critic agent. Treat this as unavailable for the main user flow.

## 6. Copilot API

Base path: `/copilot/:projectId`. Every route requires viewer access.

### `POST /copilot/:projectId/chat`

```json
{
  "message": "What is the best first release scope?",
  "conversationId": "optional-existing-conversation-id"
}
```

`message` is required (1–8000 chars). Omit `conversationId` to create a new conversation. The endpoint waits for the full AI answer; it is not token-streaming.

Returns:

```ts
{
  conversationId: string;
  answer: string;
  citations: Array<{ index: number; title: string; url: string; sourceType: string }>;
}
```

RAG retrieval can fail gracefully: a successful answer may legitimately have an empty `citations` array.

### `GET /copilot/:projectId/conversations`

Returns the caller's conversations for the project, newest updated first:

```ts
{
  projectId: string;
  conversations: Array<{
    _id: string;
    title: string;
    messageCount: number;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

### `GET /copilot/:projectId/history?conversationId=:id`

Without `conversationId`, returns the caller's most recently updated conversation. With it, returns that conversation if it belongs to the caller and project. A missing conversation returns a successful response with `conversationId: null` and `messages: []`.

```ts
{
  projectId: string;
  conversationId: string | null;
  messages: Array<{
    _id: string;
    role: 'user' | 'assistant';
    content: string;
    citations?: Array<{ index: number; title: string; url: string; sourceType: string }>;
    createdAt: string;
  }>;
}
```

## 7. Notifications API

All notification routes require auth.

| Method and route | Description |
|---|---|
| `GET /notifications?read=true&page=1&limit=20` | List the caller's notifications. `read` is optional. |
| `PUT /notifications/:notificationId/read` | Mark one notification read. |
| `PUT /notifications/read-all` | Mark all of the caller's unread notifications read. |

List result:

```ts
{
  items: Array<{
    _id: string;
    title: string;
    message: string;
    type: 'research_complete' | 'research_failed' | 'member_added' | 'system';
    read: boolean;
    data?: Record<string, unknown>;
    createdAt: string;
  }>;
  unreadCount: number;
  pagination: { page: number; limit: number; total: number; pages: number };
}
```

The notification UI may be built now, but the current research workflow does not yet create completion/failure notifications automatically.

## 8. System / AI-provider routes

| Route | Current behavior | Frontend guidance |
|---|---|---|
| `GET /system/providers` | Provider enablement, health, latency, and models | Use only for an internal diagnostics screen. |
| `GET /system/ai-config` | Model registry, available models, provider statuses | Use only for an internal diagnostics screen. |
| `PATCH /system/providers` | Updates in-memory provider flags, e.g. `{ "gemini": false }` | Do not expose in a normal client UI. This route currently lacks authorization and must be secured before production. |

## 9. Socket.io contract

Connect to `VITE_WS_URL`, not the `/api/v1` URL. Send the current access token during the handshake.

```ts
import { io } from 'socket.io-client';

const socket = io(import.meta.env.VITE_WS_URL!, {
  auth: { token: accessToken },
  transports: ['websocket', 'polling'],
});

socket.emit('project:join', { projectId }, (result) => {
  // result is { success: true, data: { room, projectId } } or { success: false, error }
});
```

The server authenticates the token, automatically joins `user:<userId>`, and permits a project room only for its owner/member.

| Direction | Event | Payload |
|---|---|---|
| Client → server | `project:join` | `{ projectId }` |
| Client → server | `project:leave` | `{ projectId }` |
| Server → client | `project:joined` / `project:left` | `{ projectId, room }` |
| Server → client | `research:progress` | `{ jobId, stage, stageLabel, progress, message }` |
| Server → client | `research:complete` | `{ jobId, projectId, durationMs? }` |
| Server → client | `research:failed` | `{ jobId, projectId, error }` |
| Server → client | `notification:new` | notification summary |

**Important current limitation:** research work runs in a separate worker process. Its Socket.io emitter is not shared with the API process, so research progress events are not reliable until a shared Socket.io adapter/event bridge is added. Always poll `GET /research/:projectId/job` while a job is active; use Socket events only as an optional immediate refresh signal.

There are no currently implemented `copilot:token` or `copilot:complete` events. Display the answer from the HTTP chat response.

## 10. Recommended page-to-API mapping

| Screen | Calls | Refresh strategy |
|---|---|---|
| App bootstrap | `GET /auth/me`, then refresh if needed | Once at app start |
| Login/register | `POST /auth/login` or `/auth/register` | Store tokens and user, then route to dashboard |
| Dashboard | `GET /projects` | Invalidate after project create/update/research starts |
| Project settings | `GET`/`PUT /projects/:id`, stats, membership routes | Invalidate project and project list after mutation |
| Research workspace | Job, sources, evidence, solutions, gaps, architecture, roadmap | Poll job every 3–5 seconds while active; fetch artifacts after completion |
| Copilot | conversations, history, chat | Append successful chat response locally, then invalidate conversation queries |
| Notification tray | `GET /notifications`, read routes | Refetch after `notification:new` or on screen focus |

## 11. UI-state rules

- `queued` / `running`: show progress UI and disable the Start Research button.
- `completed`: show research tabs and enable Copilot context features.
- `failed`: show `job.error` with a retry action that calls `/start` again.
- `draft`: show project intake form and Start Research call-to-action.
- `deleted`: route the user back to the dashboard.
- `403`: show a permission message; do not present edit/delete controls to viewers.
- `409` from research start: refetch the job instead of showing a generic error.
- `429`: show a retry-later message and respect the rate-limit response headers if present.

## 12. Known backend behavior to account for

1. The API returns refresh tokens in JSON, so frontend token storage is presently part of the trust boundary. Do not log token values.
2. The project role is not returned in normal project responses. If the UI needs to hide controls exactly by role, it must either infer owner status from `project.userId === currentUser._id` or wait for a dedicated membership/permissions endpoint.
3. `GET /research/:projectId/resources` may be empty; do not make rendering it a prerequisite for the research page.
4. ChromaDB should be configured for durable RAG in a multi-process deployment. The default in-memory vector fallback is not shared between API and worker processes.
5. System provider routes need backend authorization before any production frontend exposes them.
