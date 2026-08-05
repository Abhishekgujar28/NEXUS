# Backend Implementation Documentation

This document explains what the backend does, how it is structured, and how the main request flows work.

> Scope: this file documents the current implementation in the server codebase. No application code was changed.

## 1. What the backend is

The backend is a Node.js + TypeScript Express service for the NEXUS product. It acts as the server-side brain for an AI-powered research and innovation copilot.

Its main responsibilities are:

- User authentication and session management
- Project creation and project membership management
- Research job orchestration for idea exploration
- Retrieval of external research sources from web, GitHub, arXiv, and Semantic Scholar
- Storage of structured research artifacts like evidence, gaps, solutions, and architecture notes
- AI chat support for project-specific questions

The backend is designed to work with a React frontend and a MongoDB/Redis-backed data layer.

---

## 2. Main technologies

The implementation uses:

- Node.js with TypeScript
- Express.js for the HTTP API
- Mongoose for MongoDB access
- Redis via ioredis for optional caching/queue support
- JWT for authentication
- Zod for request validation
- Helmet, CORS, rate limiting, and Morgan for security and observability
- Google Gemini for AI generation
- External APIs for research search

The dependency list is defined in [package.json](../package.json).

---

## 3. High-level architecture

The backend follows a layered structure:

- Entry point: [src/server.ts](../src/server.ts)
- App composition: [src/app.ts](../src/app.ts)
- Routes: [src/routes](../src/routes)
- Controllers: [src/controllers](../src/controllers)
- Models: [src/models](../src/models)
- Middleware: [src/middleware](../src/middleware)
- Integrations: [src/integrations](../src/integrations)
- Research pipeline: [src/research](../src/research)
- Utilities: [src/utils](../src/utils)

### Runtime flow

1. The server starts in [src/server.ts](../src/server.ts).
2. It validates required environment variables.
3. It connects to MongoDB and Redis.
4. It creates the Express app in [src/app.ts](../src/app.ts).
5. Routes are mounted under `/api/v1/*`.
6. Requests flow through middleware, controllers, models, and external services.
7. Errors are passed to a centralized error handler.

---

## 4. Application startup behavior

When the server starts:

- It loads environment variables from `.env` using dotenv.
- It validates that JWT secrets are present.
- It connects to MongoDB using the `MONGODB_URI` value.
- It tries to connect to Redis using the `REDIS_URL` value.
- It starts an HTTP server on the configured port (default `5000`).

The startup configuration comes from [src/core/config.ts](../src/core/config.ts).

### Important startup rules

- JWT secrets are required.
- In production, the secrets must be at least 32 characters long and must not be identical.
- Redis is treated as optional. If it is unavailable, the server still starts, but queue-based features are effectively disabled.

---

## 5. Request lifecycle

A typical backend request follows this pattern:

1. Request enters Express.
2. Security and parsing middleware run.
3. Rate limiting may apply.
4. Authentication middleware may run.
5. Project access middleware may run.
6. The route handler invokes a controller.
7. The controller performs database operations and/or calls external services.
8. The controller returns a JSON response in a consistent shape.
9. Errors are handled centrally.

### Response shape

Most API endpoints return a JSON object with this structure:

```json
{
  "success": true,
  "data": {}
}
```

Errors use a shape like this:

```json
{
  "success": false,
  "error": {
    "message": "...",
    "code": "..."
  }
}
```

---

## 6. Core modules and what they do

### 6.1 Authentication module

Files:

- [src/routes/auth.routes.ts](../src/routes/auth.routes.ts)
- [src/controllers/auth.controller.ts](../src/controllers/auth.controller.ts)
- [src/middleware/auth.middleware.ts](../src/middleware/auth.middleware.ts)
- [src/utils/jwt.ts](../src/utils/jwt.ts)
- [src/models/User.ts](../src/models/User.ts)

What it does:

- Registers new users
- Logs users in
- Refreshes access tokens
- Logs users out
- Returns authenticated user profile information

How it works:

- On registration or login, the controller checks whether the email already exists.
- Passwords are hashed with bcrypt before storage.
- Access and refresh JWTs are generated.
- Refresh tokens are stored on the user document and later verified on refresh requests.

### 6.2 Project module

Files:

- [src/routes/project.routes.ts](../src/routes/project.routes.ts)
- [src/controllers/project.controller.ts](../src/controllers/project.controller.ts)
- [src/middleware/projectAuth.ts](../src/middleware/projectAuth.ts)
- [src/models/Project.ts](../src/models/Project.ts)
- [src/models/ProjectMember.ts](../src/models/ProjectMember.ts)

What it does:

- Creates and manages projects
- Lists projects visible to the current user
- Returns project details
- Updates project metadata
- Soft-deletes projects
- Adds or removes project members
- Returns project-level statistics

How it works:

- The controller checks that the current user is authenticated.
- Access to a project is granted if the user owns it or is a member.
- Project members are stored separately from the main project document.
- Project-level stats are computed from related research data.

### 6.3 Research module

Files:

- [src/routes/research.routes.ts](../src/routes/research.routes.ts)
- [src/controllers/research.controller.ts](../src/controllers/research.controller.ts)
- [src/models/ResearchJob.ts](../src/models/ResearchJob.ts)
- [src/models/ResearchSource.ts](../src/models/ResearchSource.ts)
- [src/models/EvidenceClaim.ts](../src/models/EvidenceClaim.ts)
- [src/models/ExistingSolution.ts](../src/models/ExistingSolution.ts)
- [src/models/InnovationGap.ts](../src/models/InnovationGap.ts)
- [src/research](../src/research)

What it does:

- Creates a research job for a project
- Tracks research progress and stage status
- Stores external sources discovered by providers
- Stores evidence claims, existing solutions, innovation gaps, and architecture-related outputs
- Returns research results back to the frontend

How it works:

- A client calls `/api/v1/research/:id/start` to begin research.
- The controller creates a `ResearchJob` entry and marks the project as `researching`.
- The API exposes query endpoints for job details, sources, evidence, solutions, gaps, architecture, resources, roadmap, and stress-test requests.
- The current codebase contains the orchestration start points and persistence layer, but the actual background worker logic for executing all research stages is not implemented in the visible source tree.

### 6.4 Copilot module

Files:

- [src/routes/copilot.routes.ts](../src/routes/copilot.routes.ts)
- [src/controllers/copilot.controller.ts](../src/controllers/copilot.controller.ts)
- [src/integrations/gemini.ts](../src/integrations/gemini.ts)

What it does:

- Accepts project-scoped chat messages
- Sends the message plus project context to Gemini
- Returns the AI-generated response to the frontend

How it works:

- The controller builds a prompt using the project title, project domain, project description, and the user's message.
- It routes the prompt to the Gemini provider.
- The response is returned as a simple chat answer payload.

---

## 7. Data model overview

The backend relies on MongoDB documents defined under [src/models](../src/models).

### User

Represents an account.

Fields include:

- `name`
- `email`
- `password` (hashed)
- `avatar`
- `plan`
- `refreshToken`

### Project

Represents a workspace or innovation project.

Fields include:

- `title`
- `description`
- `userId`
- `status`
- `domain`
- `projectType`
- `targetUsers`
- `platform`
- `preferredTech`
- `constraints`
- `teamSize`
- `timeline`
- `skillLevel`
- `researchProgress`
- `confidenceScore`
- `healthScore`
- `problemUnderstanding`
- `tags`

### ProjectMember

Stores membership permissions per user and project.

### ResearchJob

Stores the lifecycle state of a research run.

Fields include:

- `projectId`
- `userId`
- `status`
- `progress`
- `stages`
- `sourceCount`
- `error`
- `metadata`

### ResearchSource

Stores a single research source discovered from an external provider.

### EvidenceClaim

Stores a synthesized claim backed by one or more research sources.

### ExistingSolution

Stores a known product or implementation that resembles the current project idea.

### InnovationGap

Stores the opportunities or missing capabilities identified by analysis.

---

## 8. External integrations

### Gemini integration

The backend uses Google Gemini via [src/integrations/gemini.ts](../src/integrations/gemini.ts).

It supports:

- Text generation
- Structured JSON generation
- Embedding generation

The wrapper includes retry logic and response parsing helpers.

### Research providers

The research subsystem implements provider adapters in [src/research/providers](../src/research/providers):

- Serper for web search
- GitHub for repository search
- arXiv for academic papers
- Semantic Scholar for scholarly papers

Each provider normalizes its results into a common shape so the rest of the pipeline can work uniformly.

The deduplication logic is implemented in [src/research/deduplicator.ts](../src/research/deduplicator.ts).

### SSRF protection

The backend uses [src/utils/safeFetch.ts](../src/utils/safeFetch.ts) to prevent outbound requests from reaching private or loopback addresses. This is an important part of the security posture.

---

## 9. Middleware and security behavior

The API uses middleware to enforce security and reliability:

- Helmet for HTTP header hardening
- CORS for allowed origins
- JSON and URL-encoded body parsing
- Rate limiting for general use, auth, and research endpoints
- Authentication middleware to validate JWTs
- Project permission middleware to enforce ownership/member access rules
- Central error handling for consistent failure responses

The backend is not a fully hardened enterprise API by itself, but it already includes several important safety layers.

---

## 10. API surface

The backend currently exposes these main endpoints:

| Area | Method | Route | Purpose |
| --- | --- | --- | --- |
| Health | GET | `/health` | Basic service health check |
| Auth register | POST | `/api/v1/auth/register` | Create account |
| Auth login | POST | `/api/v1/auth/login` | Sign in |
| Auth logout | POST | `/api/v1/auth/logout` | Revoke refresh token |
| Auth refresh | POST | `/api/v1/auth/refresh` | Refresh JWTs |
| Auth me | GET | `/api/v1/auth/me` | Get current user |
| Project list | GET | `/api/v1/projects` | List accessible projects |
| Project create | POST | `/api/v1/projects` | Create project |
| Project get | GET | `/api/v1/projects/:id` | Get project details |
| Project update | PUT | `/api/v1/projects/:id` | Update project |
| Project delete | DELETE | `/api/v1/projects/:id` | Soft delete |
| Project stats | GET | `/api/v1/projects/:id/stats` | Get research counts |
| Project members | POST | `/api/v1/projects/:id/members` | Add member |
| Project member remove | DELETE | `/api/v1/projects/:id/members/:userId` | Remove member |
| Research start | POST | `/api/v1/research/:id/start` | Start research job |
| Research job | GET | `/api/v1/research/:id/job` | Get job status |
| Research sources | GET | `/api/v1/research/:id/sources` | Get sources |
| Research evidence | GET | `/api/v1/research/:id/evidence` | Get evidence |
| Research solutions | GET | `/api/v1/research/:id/solutions` | Get solutions |
| Research gaps | GET | `/api/v1/research/:id/gaps` | Get gaps |
| Research architecture | GET | `/api/v1/research/:id/architecture` | Get architecture notes |
| Research resources | GET | `/api/v1/research/:id/resources` | Get resources |
| Research roadmap | GET | `/api/v1/research/:id/roadmap` | Get roadmap |
| Research stress test | POST | `/api/v1/research/:id/stresstest` | Accept stress test request |
| Copilot chat | POST | `/api/v1/copilot/:id/chat` | Ask AI questions for a project |
| Copilot history | GET | `/api/v1/copilot/:id/history` | Get history |
| Copilot conversations | GET | `/api/v1/copilot/:id/conversations` | Conversation endpoint |

---

## 11. How the backend really works in practice

### A. Authentication flow

1. The frontend sends credentials to `/api/v1/auth/login`.
2. The controller validates the email/password.
3. The server compares the password with the stored bcrypt hash.
4. If valid, it returns access and refresh JWTs.
5. Subsequent requests include the access token in the `Authorization` header.
6. The authentication middleware validates the token and attaches the user to the request.

### B. Project flow

1. A user creates a project.
2. The project is stored in MongoDB.
3. The creator is added as the owner in `ProjectMember`.
4. The frontend can later read the project, update it, and invite collaborators.

### C. Research flow

1. The user triggers a research job from the frontend.
2. The backend creates a `ResearchJob` and marks the project as researching.
3. The API exposes endpoints to fetch job progress and research artifacts.
4. External providers can be called to gather sources.
5. The system stores the results as structured documents.

### D. AI flow

1. The frontend sends a chat message for a project.
2. The backend wraps the message with a prompt containing the project context.
3. Gemini generates a response.
4. The response is returned to the client.

---

## 12. Current implementation status and observations

The backend is a solid foundation for a research copilot, but some parts appear to be only partially wired up.

### Observed strengths

- Clear separation between routes, controllers, and models
- JWT-based auth flow
- Project-based authorization model
- External provider abstraction
- SSRF-safe fetch wrapper
- Centralized error handling

### Observed gaps or incomplete areas

- The visible source tree contains the startup and storage pieces for research orchestration, but no obvious background worker implementation is present for executing the full research pipeline.
- The copilot route imports `listConversations`, but the controller does not define that export in the current source file.
- The current copilot history endpoint returns an empty list rather than persisted conversation data.
- The research pipeline appears to be scaffolded around stored models, but the actual step-by-step research execution logic is not present in the code that was inspected.

These observations do not mean the backend is unusable; they indicate that the project is in an early-to-mid implementation stage with important core infrastructure already present.

---

## 13. Summary

In short, the backend is a modular Express application that provides:

- Secure user authentication
- Project and team management
- Research job orchestration
- Evidence and solution persistence
- AI-assisted project chat
- Integration with external research providers

It is best understood as a service layer for an AI research workspace that stores project context, runs research workflows, and returns structured outputs to the frontend.
