# 02 — Database Schema

> **Scope:** Complete MongoDB schema reference — every collection, field, type, index, relationship, and constraint as implemented in the live codebase plus planned collections from the architecture specification.

---

## 1. Purpose

Provide the authoritative reference for every MongoDB collection in NEXUS. Any new model or migration MUST be documented here first, reviewed, and then implemented.

---

## 2. Database Connection

| Parameter | Value |
|---|---|
| **Driver** | Mongoose 8 |
| **Connection** | `config.mongoUri` (default `mongodb://localhost:27017/nexus`) |
| **Retry** | Exponential backoff, 5 attempts (2s, 4s, 8s, 16s, 32s) |
| **Shutdown** | `mongoose.connection.close()` on SIGTERM/SIGINT |
| **File** | `src/core/database.ts` |

---

## 3. Entity Relationship Diagram

```
┌──────────────┐        ┌──────────────────┐        ┌──────────────────┐
│    User      │───1:N──│  ProjectMember   │──N:1───│    Project       │
│              │        │  (junction)      │        │                  │
│  _id         │        │  userId ────────►│        │  _id             │
│  email       │        │  projectId ─────►│        │  userId (owner)  │
│  password    │        │  role            │        │  status          │
│  plan        │        └──────────────────┘        │  problemUnderst. │
│  refreshToken│                                    │  researchProgress│
└──────┬───────┘                                    └──────┬───────────┘
       │                                                   │
       │  1:N                                    1:N       │ 1:N
       ▼                                         ▼         ▼
┌──────────────┐                         ┌───────────────┐ ┌───────────────┐
│ ActivityLog  │                         │ ResearchJob   │ │ResearchSource │
│              │                         │               │ │               │
│ userId       │                         │ projectId     │ │ projectId     │
│ projectId    │                         │ userId        │ │ researchJobId │
│ type         │                         │ status        │ │ provider      │
│ message      │                         │ stages[]      │ │ sourceType    │
└──────────────┘                         │ progress      │ │ title, url    │
                                         └───────────────┘ │ relevanceScore│
                                                           └───────┬───────┘
                                                                   │
                                    ┌──────────────────────────────┤
                                    │              │               │
                              ┌─────▼─────┐ ┌─────▼──────┐ ┌─────▼──────┐
                              │ Evidence  │ │ Existing   │ │ Innovation │
                              │ Claim     │ │ Solution   │ │ Gap        │
                              │           │ │            │ │            │
                              │ projectId │ │ projectId  │ │ projectId  │
                              │ claim     │ │ name       │ │ title      │
                              │ confidence│ │ features[] │ │ category   │
                              │ sourceIds │ │ sourceIds  │ │ impact     │
                              └───────────┘ └────────────┘ └────────────┘
```

---

## 4. Implemented Collections

### 4.1 User

**File:** `src/models/User.ts`  
**Collection name:** `users`  
**TypeScript interface:** `UserDocument`

| Field | Type | Required | Default | Constraints | select |
|---|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary key | Yes |
| `name` | String | Yes | — | trim, minlength: 2, maxlength: 50 | Yes |
| `email` | String | Yes | — | unique, lowercase, trim | Yes |
| `password` | String | Yes | — | minlength: 8 | **`false`** |
| `avatar` | String | No | `''` | — | Yes |
| `plan` | String (enum) | No | `'free'` | `free`, `pro`, `team` | Yes |
| `refreshToken` | String | No | `''` | — | **`false`** |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps | Yes |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps | Yes |

**Indexes:**
- `email`: unique (implicit from schema)

**Instance Methods:**
- `comparePassword(candidate: string): Promise<boolean>` — bcrypt comparison

**Pre-save Hook:**
- If `password` is modified → hash with bcrypt (12 rounds)

**Security Notes:**
- `password` and `refreshToken` are `select: false` — excluded from all queries unless explicitly requested with `.select('+password')` or `.select('+refreshToken')`

---

### 4.2 Project

**File:** `src/models/Project.ts`  
**Collection name:** `projects`

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary key |
| `title` | String | Yes | — | trim, minlength: 3, maxlength: 100 |
| `description` | String | Yes | — | minlength: 10, maxlength: 4000 |
| `userId` | ObjectId (ref: User) | Yes | — | indexed |
| `status` | String (enum) | No | `'draft'` | `draft`, `researching`, `complete`, `failed`, `deleted` |
| `domain` | String | No | — | — |
| `projectType` | String | No | — | — |
| `targetUsers` | String | No | — | — |
| `platform` | String | No | — | — |
| `preferredTech` | [String] | No | `[]` | — |
| `constraints` | String | No | — | — |
| `teamSize` | Number | No | — | min: 1, max: 100 |
| `timeline` | String | No | — | — |
| `skillLevel` | String (enum) | No | — | `beginner`, `intermediate`, `advanced` |
| `researchProgress` | Number | No | `0` | min: 0, max: 100 |
| `confidenceScore` | Number | No | `0` | min: 0, max: 100 |
| `healthScore` | Number | No | `0` | min: 0, max: 100 |
| `problemUnderstanding` | Mixed | No | — | Unstructured AI output blob |
| `tags` | [String] | No | — | — |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

**Indexes:**
- `userId` (single)
- `{ userId: 1, updatedAt: -1 }` (compound — project listing sorted by recency)

**Notes:**
- `problemUnderstanding` is `Schema.Types.Mixed` — holds structured AI output: `{ architecture, recommendations, resources, roadmap }`. This trades queryability for flexibility.
- `status: 'deleted'` is a soft-delete flag. Queries should filter `status !== 'deleted'` unless explicitly requesting deleted records.

---

### 4.3 ProjectMember

**File:** `src/models/ProjectMember.ts`  
**Collection name:** `projectmembers`

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary key |
| `projectId` | ObjectId (ref: Project) | Yes | — | indexed |
| `userId` | ObjectId (ref: User) | Yes | — | — |
| `role` | String (enum) | No | `'viewer'` | `owner`, `editor`, `viewer` |
| `invitedAt` | Date | No | `Date.now` | — |
| `joinedAt` | Date | No | — | — |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

**Indexes:**
- `projectId` (single)
- `{ projectId: 1, userId: 1 }` (compound unique — prevents duplicate memberships)

**Role Hierarchy:**
```
viewer (1) < editor (2) < owner (3)
```

---

### 4.4 ResearchJob

**File:** `src/models/ResearchJob.ts`  
**Collection name:** `researchjobs`  
**Exported constant:** `RESEARCH_STAGES`

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary key |
| `projectId` | ObjectId (ref: Project) | Yes | — | indexed |
| `userId` | ObjectId (ref: User) | Yes | — | — |
| `status` | String (enum) | No | `'queued'` | `queued`, `running`, `completed`, `failed`, `cancelled` |
| `progress` | Number | No | `0` | min: 0, max: 100 |
| `stages` | [StageSchema] | No | — | See sub-schema below |
| `sourceCount` | Number | No | `0` | — |
| `startedAt` | Date | No | — | — |
| `completedAt` | Date | No | — | — |
| `error` | String | No | — | Failure message |
| `cancelRequested` | Boolean | No | `false` | — |
| `metadata` | Mixed | No | — | Arbitrary job metadata |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

**Stage Sub-Schema (embedded, `_id: false`):**

| Field | Type | Default | Constraints |
|---|---|---|---|
| `key` | String | — | Stage identifier |
| `label` | String | — | Human-readable name |
| `status` | String (enum) | `'pending'` | `pending`, `running`, `completed`, `failed`, `skipped` |
| `startedAt` | Date | — | — |
| `completedAt` | Date | — | — |
| `note` | String | — | Status message |

**Research Stages (11 stages):**

| # | Key | Label |
|---|---|---|
| 1 | `understand` | Understanding Idea |
| 2 | `plan` | Planning Queries |
| 3 | `search_web` | Searching Web |
| 4 | `search_papers` | Searching Papers |
| 5 | `search_github` | Searching GitHub |
| 6 | `analyze` | Analyzing Evidence |
| 7 | `solutions` | Finding Solutions |
| 8 | `gaps` | Discovering Gaps |
| 9 | `stress` | Stress Testing |
| 10 | `architecture` | Designing Architecture |
| 11 | `roadmap` | Generating Roadmap |

**Indexes:**
- `projectId` (single)
- `status` (single)
- `{ projectId: 1, status: 1 }` (compound)

---

### 4.5 ResearchSource

**File:** `src/models/ResearchSource.ts`  
**Collection name:** `researchsources`

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary key |
| `projectId` | ObjectId (ref: Project) | Yes | — | indexed |
| `researchJobId` | ObjectId (ref: ResearchJob) | No | — | indexed |
| `provider` | String (enum) | Yes | — | `serper`, `github`, `arxiv`, `semanticScholar` |
| `sourceType` | String (enum) | Yes | — | `paper`, `article`, `repo`, `dataset`, `api`, `web` |
| `title` | String | Yes | — | — |
| `url` | String | No | — | — |
| `authors` | [String] | No | — | — |
| `publishedAt` | Date | No | — | — |
| `snippet` | String | No | — | Short excerpt |
| `content` | String | No | — | Full extracted content |
| `query` | String | No | — | Search query that found this source |
| `metadata` | Mixed | No | — | Provider-specific fields |
| `relevanceScore` | Number | No | `0` | min: 0, max: 1 |
| `credibilityScore` | Number | No | `0` | min: 0, max: 1 |
| `retrievedAt` | Date | No | `Date.now` | — |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

**Indexes:**
- `{ projectId: 1, provider: 1 }` (compound)
- `{ projectId: 1, url: 1 }` (compound — enables dedup queries)

---

### 4.6 EvidenceClaim

**File:** `src/models/EvidenceClaim.ts`  
**Collection name:** `evidenceclaims`

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary key |
| `projectId` | ObjectId (ref: Project) | Yes | — | indexed |
| `claim` | String | Yes | — | The extracted claim |
| `supportingSourceIds` | [ObjectId] (ref: ResearchSource) | No | — | Sources supporting this claim |
| `contradictingSourceIds` | [ObjectId] (ref: ResearchSource) | No | — | Sources contradicting this claim |
| `confidence` | Number | No | `0` | min: 0, max: 1 |
| `reasoning` | String | No | — | AI reasoning explanation |
| `sourceQuality` | Number | No | `0` | min: 0, max: 1 |
| `relevance` | Number | No | `0` | min: 0, max: 1 |
| `freshness` | Number | No | `0` | min: 0, max: 1 |
| `evidenceScore` | Number | No | `0` | min: 0, max: 1 |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

---

### 4.7 ExistingSolution

**File:** `src/models/ExistingSolution.ts`  
**Collection name:** `existingsolutions`

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary key |
| `projectId` | ObjectId (ref: Project) | Yes | — | indexed |
| `name` | String | Yes | — | Solution name |
| `description` | String | No | — | — |
| `url` | String | No | — | — |
| `features` | [String] | No | — | — |
| `strengths` | [String] | No | — | — |
| `limitations` | [String] | No | — | — |
| `technologies` | [String] | No | — | — |
| `similarityScore` | Number | No | `0` | min: 0, max: 1 |
| `sourceIds` | [ObjectId] (ref: ResearchSource) | No | — | Evidence sources |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

---

### 4.8 InnovationGap

**File:** `src/models/InnovationGap.ts`  
**Collection name:** `innovationgaps`

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary key |
| `projectId` | ObjectId (ref: Project) | Yes | — | indexed |
| `title` | String | Yes | — | — |
| `description` | String | No | — | — |
| `opportunity` | String | No | — | How this gap can be exploited |
| `category` | String (enum) | No | `'feature'` | `feature`, `technical`, `cost`, `ux`, `integration`, `scalability`, `user`, `research` |
| `impact` | String (enum) | No | `'medium'` | `low`, `medium`, `high` |
| `difficulty` | String (enum) | No | `'medium'` | `low`, `medium`, `high` |
| `confidence` | Number | No | `0` | min: 0, max: 1 |
| `evidenceSourceIds` | [ObjectId] (ref: ResearchSource) | No | — | — |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Auto | Mongoose timestamps |

---

### 4.9 ActivityLog

**File:** `src/models/ActivityLog.ts`  
**Collection name:** `activitylogs`  
**Status:** Model defined, NOT wired — no code writes to this collection

| Field | Type | Required | Default | Constraints |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | Auto | Primary key |
| `projectId` | ObjectId (ref: Project) | No | — | indexed |
| `userId` | ObjectId (ref: User) | No | — | — |
| `type` | String (enum) | Yes | — | `project_created`, `research_started`, `research_completed`, `research_failed`, `research_cancelled`, `gap_discovered`, `architecture_generated`, `roadmap_generated`, `task_completed`, `member_added` |
| `message` | String | No | — | — |
| `metadata` | Mixed | No | — | — |
| `createdAt` | Date | Auto | Auto | Mongoose timestamps |

**Indexes:**
- `{ projectId: 1, createdAt: -1 }` (compound)

---

## 5. Planned Collections (Not Yet Implemented)

### 5.1 Conversation (Planned)

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `projectId` | ObjectId (ref: Project) | — |
| `userId` | ObjectId (ref: User) | — |
| `messages` | [{ role, content, timestamp, sourceIds }] | Chat history |
| `title` | String | Auto-generated from first message |
| `createdAt` / `updatedAt` | Date | Timestamps |

### 5.2 Notification (Planned)

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Primary key |
| `userId` | ObjectId (ref: User) | Recipient |
| `type` | String (enum) | `research_complete`, `research_failed`, `member_added`, `mention` |
| `title` | String | Short title |
| `message` | String | Full body |
| `data` | Mixed | Payload: `{ projectId, jobId }` |
| `read` | Boolean | Default: `false` |
| `createdAt` | Date | Timestamp |

---

## 6. Schema Divergences from `ARCHITECTURE.md`

The original `ARCHITECTURE.md` documented a different schema than what was implemented. The **implemented code** (above) is the canonical reference. Key divergences:

| Aspect | `ARCHITECTURE.md` Says | Code Implements |
|---|---|---|
| User.role | `user` / `admin` | Not present — uses `plan` instead |
| User.isActive | Soft-disable flag | Not present |
| User.lastLogin | Timestamp | Not present |
| Project field names | `name`, `owner`, `problemStatement` | `title`, `userId`, `description` |
| Project.status | `active` / `archived` / `deleted` | `draft` / `researching` / `complete` / `failed` / `deleted` |
| Architecture storage | Separate `Architecture` collection | `Project.problemUnderstanding.architecture` (Mixed) |
| Roadmap storage | Separate `Roadmap` collection | `Project.problemUnderstanding.roadmap` (Mixed) |
| Refresh token storage | Redis blacklist + httpOnly cookie | `User.refreshToken` field (DB-stored) |
| EvidenceClaim structure | `source` (single ref), `category` | `supportingSourceIds[]`, `contradictingSourceIds[]`, multi-score |

---

## 7. Index Strategy

### Current Indexes

| Collection | Index | Type | Purpose |
|---|---|---|---|
| `users` | `{ email: 1 }` | Unique | Login lookup |
| `projects` | `{ userId: 1 }` | Single | User's projects |
| `projects` | `{ userId: 1, updatedAt: -1 }` | Compound | Sorted listing |
| `projectmembers` | `{ projectId: 1 }` | Single | Member lookup |
| `projectmembers` | `{ projectId: 1, userId: 1 }` | Compound Unique | Dedup membership |
| `researchjobs` | `{ projectId: 1 }` | Single | Job lookup |
| `researchjobs` | `{ status: 1 }` | Single | Status filtering |
| `researchjobs` | `{ projectId: 1, status: 1 }` | Compound | Active job check |
| `researchsources` | `{ projectId: 1, provider: 1 }` | Compound | Provider filtering |
| `researchsources` | `{ projectId: 1, url: 1 }` | Compound | Dedup by URL |
| `activitylogs` | `{ projectId: 1, createdAt: -1 }` | Compound | Activity feed |

### Recommended Future Indexes

| Collection | Index | Purpose |
|---|---|---|
| `evidenceclaims` | `{ projectId: 1 }` | Evidence listing (high volume) |
| `existingsolutions` | `{ projectId: 1 }` | Solution listing |
| `innovationgaps` | `{ projectId: 1 }` | Gap listing |
| `conversations` | `{ projectId: 1, userId: 1 }` | User's conversations |
| `notifications` | `{ userId: 1, read: 1, createdAt: -1 }` | Notification feed |

---

## 8. Data Lifecycle

### 8.1 Project Deletion Cascade (Current vs. Required)

**Current:** Setting `project.status = 'deleted'` does NOT cascade to related documents. Members, jobs, sources, evidence, gaps, and solutions are orphaned.

**Required cascade (to implement):**

```
Project soft-delete (status: 'deleted')
    ├── ProjectMember: leave intact (for undo)
    ├── ResearchJob: cancel any running → 'cancelled'
    ├── ResearchSource: leave intact (for undo)
    ├── EvidenceClaim: leave intact
    ├── ExistingSolution: leave intact
    ├── InnovationGap: leave intact
    └── ActivityLog: write 'project_archived' entry
```

### 8.2 Research Job Lifecycle

```
                 ┌──────────┐
                 │  queued   │  ← POST /research/:id/start
                 └────┬─────┘
                      │ Worker picks up
                 ┌────▼─────┐
                 │ running   │  ← Stages execute sequentially
                 └────┬─────┘
              ┌───────┼────────┐
              ▼                ▼
       ┌──────────┐    ┌──────────┐
       │completed │    │ failed   │
       └──────────┘    └──────────┘
              ▲                ▲
              │                │
       ┌──────────┐           │
       │cancelled │ ←─ cancelRequested = true during running
       └──────────┘
```

---

## 9. Validation Layer (Zod Schemas)

| Schema | File | Used By | Validates |
|---|---|---|---|
| `registerSchema` | `auth.schema.ts` | `POST /auth/register` | `{ name: 2-50, email: valid, password: 8-100 }` |
| `loginSchema` | `auth.schema.ts` | `POST /auth/login` | `{ email: valid, password: min 1 }` |
| `refreshSchema` | `auth.schema.ts` | `POST /auth/refresh` | `{ refreshToken: min 1 }` |
| `createProjectSchema` | `project.schema.ts` | `POST /projects` | Full project fields with constraints |
| `updateProjectSchema` | `project.schema.ts` | `PUT /projects/:id` | Partial of createProjectSchema |
| `addMemberSchema` | `project.schema.ts` | `POST /projects/:id/members` | `{ email: valid, role: editor|viewer }` |
| `startResearchSchema` | `research.schema.ts` | `POST /research/:id/start` | `{ force?: boolean }` |
| `copilotChatSchema` | `research.schema.ts` | `POST /copilot/:id/chat` | `{ message: 1-8000, conversationId?: 1-200 }` |

---

## 10. Error Handling in Database Operations

| Scenario | Error | Status |
|---|---|---|
| Document not found | `AppError('...not found', 404, NOT_FOUND)` | 404 |
| Duplicate email (unique index) | `AppError('Email already in use', 409, CONFLICT)` | 409 |
| Duplicate member (unique compound) | `AppError('User is already a project member', 409, CONFLICT)` | 409 |
| Invalid ObjectId format | Mongoose CastError → caught by errorHandler → 500 | 500 |
| Validation failure (Mongoose) | Mongoose ValidationError → caught by errorHandler → 500 | 500 |

---

## 11. Future Improvements

1. **TypeScript Interfaces for All Models**: Every model should use `Schema<TDocument>` generics for compile-time field safety
2. **Soft-Delete Cascade**: Implement project deletion cascade as documented in §8.1
3. **TTL Indexes**: Add TTL on notifications (auto-expire after 90 days)
4. **Text Indexes**: Add text index on `ResearchSource.title` + `ResearchSource.snippet` for search
5. **Schema Versioning**: Add `__v` strategy for schema migrations
6. **Read Replicas**: Configure Mongoose read preference for scalable reads
