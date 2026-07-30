# 05 — Project Flow

> **Scope:** Complete project lifecycle — creation, configuration, membership management, research integration, soft-delete, and all data relationships.

---

## 1. Purpose

Define how projects are created, managed, shared, and archived in NEXUS. A project is the central organizing entity around which all research, AI analysis, and copilot interactions revolve.

---

## 2. Responsibilities

| Component | Responsibility |
|---|---|
| `project.controller.ts` | CRUD, stats, member management |
| `project.routes.ts` | Route definitions + middleware chains |
| `projectAuth.ts` | Role-based project access enforcement |
| `project.schema.ts` | Zod validation for create, update, addMember |
| `Project.ts` model | Project document schema + indexes |
| `ProjectMember.ts` model | Membership junction table |

---

## 3. Folder Mapping

```
src/
├── controllers/project.controller.ts   # 8 handler functions
├── routes/project.routes.ts            # Route wiring
├── middleware/projectAuth.ts           # Role guard
├── schemas/project.schema.ts          # createProjectSchema, updateProjectSchema, addMemberSchema
├── models/
│   ├── Project.ts                     # Project document
│   └── ProjectMember.ts              # User↔Project junction
```

---

## 4. Project Lifecycle

```
                 ┌──────────┐
                 │  draft    │  ← POST /projects (creation)
                 └────┬─────┘
                      │
             POST /research/:id/start
                      │
                 ┌────▼──────────┐
                 │  researching   │  ← Background worker running
                 └────┬──────────┘
              ┌───────┼─────────┐
              ▼                 ▼
       ┌──────────┐      ┌──────────┐
       │ complete  │      │  failed   │
       └──────────┘      └──────────┘
              │
              ▼ (can restart research)
       ┌──────────────┐
       │  researching  │  ← Re-run
       └──────────────┘

       Any state:
              │
              ▼ DELETE /projects/:id (owner only)
       ┌──────────┐
       │ deleted   │  ← Soft-delete (excluded from listings)
       └──────────┘
```

---

## 5. Project Creation Flow

### 5.1 Sequence Diagram

```
Client              Server                              MongoDB
  │                   │                                    │
  │ POST /projects    │                                    │
  │ { title, desc, ...} │                                 │
  │──────────────────►│                                    │
  │                   │  verifyAuth → req.user             │
  │                   │  validate(createProjectSchema)     │
  │                   │                                    │
  │                   │  Project.create({                  │
  │                   │    ...req.body,                    │
  │                   │    userId: req.user._id            │
  │                   │  })                                │
  │                   │───────────────────────────────────►│
  │                   │◄───────────────────────────────────│ project doc
  │                   │                                    │
  │                   │  ProjectMember.updateOne(          │
  │                   │    { projectId, userId },          │
  │                   │    { $setOnInsert: {               │
  │                   │        role: 'owner',              │
  │                   │        invitedAt: now,             │
  │                   │        joinedAt: now               │
  │                   │    }},                             │
  │                   │    { upsert: true }                │
  │                   │  )                                 │
  │                   │───────────────────────────────────►│
  │                   │◄───────────────────────────────────│
  │                   │                                    │
  │ 201 { project }   │                                    │
  │◄──────────────────│                                    │
```

### 5.2 Validation Rules (`createProjectSchema`)

| Field | Type | Required | Constraints |
|---|---|---|---|
| `title` | string | Yes | 3–100 characters |
| `description` | string | Yes | 10–4000 characters |
| `domain` | string | No | — |
| `projectType` | string | No | — |
| `targetUsers` | string | No | — |
| `platform` | string | No | — |
| `preferredTech` | string[] | No | Array of strings |
| `constraints` | string | No | — |
| `teamSize` | number | No | Integer, 1–100 |
| `timeline` | string | No | — |
| `skillLevel` | enum | No | `beginner`, `intermediate`, `advanced` |
| `tags` | string[] | No | Array of strings |

---

## 6. Project Listing Flow

### 6.1 Access Logic

The `listProjects` controller returns projects where the user is either:
- The owner (`project.userId === req.user._id`), OR
- A member (`ProjectMember` record exists)

### 6.2 Query Construction

```
1. membershipProjectIds = ProjectMember.find({ userId }).distinct('projectId')

2. query = {
     $or: [
       { userId: currentUserId },
       { _id: { $in: membershipProjectIds } }
     ],
     status: status ?? { $ne: 'deleted' }
   }

3. [projects, total] = Promise.all([
     Project.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
     Project.countDocuments(query)
   ])
```

### 6.3 Pagination

| Parameter | Default | Min | Max |
|---|---|---|---|
| `page` | 1 | 1 | — |
| `limit` | 10 | 1 | 50 |

---

## 7. Membership Management

### 7.1 Role Model

```
┌─────────────────────────────────────────────┐
│              Project                         │
│                                              │
│  userId ──► Owner (implicit, from Project)   │
│                                              │
│  ProjectMember records:                      │
│    ┌──────────┬────────────┐                │
│    │  userId  │   role     │                │
│    ├──────────┼────────────┤                │
│    │  user_A  │  owner     │  ← created on  │
│    │  user_B  │  editor    │     project    │
│    │  user_C  │  viewer    │     creation   │
│    └──────────┴────────────┘                │
└─────────────────────────────────────────────┘
```

### 7.2 Add Member Flow

```
Client                   Server                    MongoDB
  │                        │                         │
  │ POST /:id/members      │                         │
  │ { email, role }        │                         │
  │───────────────────────►│                         │
  │                        │ verifyAuth              │
  │                        │ projectAuth('owner')    │
  │                        │ validate(addMemberSchema)│
  │                        │                         │
  │                        │ User.findOne({email})   │
  │                        │────────────────────────►│
  │                        │◄────────────────────────│ user (or null→404)
  │                        │                         │
  │                        │ Check: is user the      │
  │                        │ project owner?           │
  │                        │ (yes → 409 CONFLICT)    │
  │                        │                         │
  │                        │ ProjectMember.findOne   │
  │                        │ ({projectId, userId})   │
  │                        │────────────────────────►│
  │                        │◄────────────────────────│ existing (→409)
  │                        │                         │  or null (ok)
  │                        │                         │
  │                        │ ProjectMember.create    │
  │                        │ ({projectId, userId,    │
  │                        │   role, invitedAt,      │
  │                        │   joinedAt})            │
  │                        │────────────────────────►│
  │                        │◄────────────────────────│ membership doc
  │                        │                         │
  │ 201 { membership }     │                         │
  │◄───────────────────────│                         │
```

### 7.3 Remove Member Flow

```
Client                   Server                    MongoDB
  │                        │                         │
  │ DELETE /:id/members/:u │                         │
  │───────────────────────►│                         │
  │                        │ verifyAuth              │
  │                        │ projectAuth('owner')    │
  │                        │                         │
  │                        │ ProjectMember           │
  │                        │ .findOneAndDelete({     │
  │                        │   projectId: id,        │
  │                        │   userId: u,            │
  │                        │   role: { $ne: 'owner' }│  ← Cannot remove owner
  │                        │ })                      │
  │                        │────────────────────────►│
  │                        │◄────────────────────────│ deleted (or null→404)
  │                        │                         │
  │ 200 { removed: true }  │                         │
  │◄───────────────────────│                         │
```

### 7.4 Membership Security Rules

| Rule | Enforcement |
|---|---|
| Only `owner` can add members | `projectAuth('owner')` middleware |
| Only `owner` can remove members | `projectAuth('owner')` middleware |
| Cannot assign `owner` role via API | `addMemberSchema` restricts to `editor` / `viewer` |
| Cannot remove the owner | Query filter `role: { $ne: 'owner' }` |
| Duplicate prevention | Application-level check + compound unique index |

---

## 8. Project Stats

### 8.1 Query Strategy

All four queries execute in parallel via `Promise.all`:

```
[sourceCount, gapCount, solutionCount, lastJob] = Promise.all([
  ResearchSource.countDocuments({ projectId }),
  InnovationGap.countDocuments({ projectId }),
  ExistingSolution.countDocuments({ projectId }),
  ResearchJob.findOne({ projectId }).sort({ createdAt: -1 })
    .select('status progress updatedAt')
])
```

### 8.2 Response Shape

```json
{
  "sourceCount": 47,
  "gapCount": 8,
  "solutionCount": 12,
  "lastJobStatus": "completed" | null,
  "lastJobProgress": 100 | null,
  "lastJobUpdatedAt": "2026-07-20T14:30:00Z" | null
}
```

---

## 9. Project Update Flow

### 9.1 Validation

`updateProjectSchema` is `createProjectSchema.partial()` — all fields are optional. Only provided fields are updated.

### 9.2 Database Operation

```typescript
Project.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })
```

- `new: true`: Returns the updated document
- `runValidators: true`: Mongoose schema validators run on the update

---

## 10. Project Deletion Flow

### 10.1 Soft-Delete Strategy

```typescript
Project.findByIdAndUpdate(id, { status: 'deleted' }, { new: true })
```

- The project document is NOT physically removed
- `listProjects` filters `status: { $ne: 'deleted' }` by default
- Related documents (members, jobs, sources, evidence, gaps, solutions) are NOT cascaded

### 10.2 Known Gap: No Cascade

When a project is soft-deleted:
- `ProjectMember` records persist (allows undo)
- `ResearchJob` records persist (may still be `running` — should be cancelled)
- All research artifacts persist

**Required improvement:** Cancel any running jobs and write an `ActivityLog` entry.

---

## 11. Data Relationships

```
Project (1)
    │
    ├── ProjectMember (N) ── via projectId
    │       └── User (1) ── via userId
    │
    ├── ResearchJob (N) ── via projectId
    │       └── ResearchSource (N) ── via researchJobId
    │
    ├── ResearchSource (N) ── via projectId
    ├── EvidenceClaim (N) ── via projectId
    ├── ExistingSolution (N) ── via projectId
    ├── InnovationGap (N) ── via projectId
    └── ActivityLog (N) ── via projectId (planned)
```

---

## 12. Error Handling

| Scenario | Status | Code | Message |
|---|---|---|---|
| Auth required | 401 | `UNAUTHORIZED` | Authentication required |
| Project not found | 404 | `NOT_FOUND` | Project not found |
| Project deleted | 404 | `NOT_FOUND` | Project not found |
| Insufficient role | 403 | `FORBIDDEN` | Insufficient project permission |
| User email not found (add member) | 404 | `NOT_FOUND` | User not found for provided email |
| User is project owner (add member) | 409 | `CONFLICT` | User is already the project owner |
| User is already member | 409 | `CONFLICT` | User is already a project member |
| Member not found (remove) | 404 | `NOT_FOUND` | Project member not found |
| Validation failure | 400 | `VALIDATION_ERROR` | Zod details |

---

## 13. Controller Helper Functions

### `ensureUserId(req)`
Extracts `req.user._id` or throws 401. Used by all project controller handlers.

### `assertCanAccessProject(projectId, userId)`
Verifies the user is either the owner or a member. Used internally by some handlers as a secondary check (note: this duplicates the `projectAuth` middleware check — see Technical Debt below).

---

## 14. Technical Debt

1. **Duplicated Authorization**: `assertCanAccessProject()` in controllers re-runs the same checks that `projectAuth` middleware already performed, doubling DB queries per request
2. **No Cascade on Delete**: Soft-delete does not cancel running jobs or clean up related data
3. **Untyped Project Model**: `Project.ts` schema lacks TypeScript generic, so field access is `any`
4. **`problemUnderstanding` Blob**: Architecture, roadmap, and resources are stored as `Schema.Types.Mixed` instead of typed sub-schemas
5. **No Ownership Transfer**: There is no endpoint to transfer project ownership

---

## 15. Future Improvements

1. **Project Templates**: Pre-configured project types with default fields
2. **Project Archiving**: Separate `archived` status with restore capability
3. **Ownership Transfer**: `PUT /projects/:id/owner` endpoint
4. **Member Role Update**: `PUT /projects/:id/members/:userId` to change roles
5. **Project Duplication**: `POST /projects/:id/clone`
6. **Activity Feed**: Wire `ActivityLog` writes into all mutation handlers
7. **Tags Search**: Full-text search on project tags
8. **Public Projects**: `isPublic` flag for read-only access without membership

---

## 16. Testing Strategy

| Test | Description | Priority |
|---|---|---|
| Create project | Valid input → 201 + owner membership | P0 |
| List projects | Returns owned + member projects | P0 |
| List excludes deleted | Deleted projects not in list | P0 |
| Get project as viewer | Member with viewer role → 200 | P0 |
| Get project as non-member | No membership → 403 | P0 |
| Update as editor | Editor role → 200 | P0 |
| Update as viewer | Viewer role → 403 | P0 |
| Delete as owner | Owner → soft-delete | P0 |
| Delete as editor | Editor → 403 | P0 |
| Add member | Valid email + role → 201 | P0 |
| Add member: owner role | role=owner → 400 (Zod) | P0 |
| Add member: duplicate | Already member → 409 | P1 |
| Remove member | Owner removes editor → 200 | P1 |
| Remove owner | Cannot remove self → 404 | P1 |
| Stats query | Returns correct counts | P1 |
| Pagination | page/limit work correctly | P1 |
