# 04 — Authentication Flow

> **Scope:** Complete authentication and authorization architecture — JWT lifecycle, token management, password security, middleware chain, session strategy, and all edge cases.

---

## 1. Purpose

Define every aspect of NEXUS identity management so that any engineer implementing auth-related features produces consistent, secure behavior. This document is the canonical reference for how users prove their identity, how tokens are issued and rotated, and how authorization decisions are made.

---

## 2. Responsibilities

| Component | Responsibility |
|---|---|
| `auth.controller.ts` | Register, login, logout, refresh, me |
| `auth.middleware.ts` | Extract + verify JWT from `Authorization` header |
| `projectAuth.ts` | Enforce role-based project access |
| `jwt.ts` | Token generation (sign) and verification |
| `auth.schema.ts` | Zod input validation for auth endpoints |
| `User.ts` model | Password hashing, comparison, token storage |
| `rateLimit.middleware.ts` | Auth endpoint throttling (5/15min) |

---

## 3. Folder Mapping

```
src/
├── controllers/auth.controller.ts    # register, login, logout, refresh, me
├── routes/auth.routes.ts             # Route definitions + middleware chain
├── middleware/
│   ├── auth.middleware.ts            # verifyAuth — JWT verification
│   └── projectAuth.ts               # projectAuth(role) — RBAC
├── schemas/auth.schema.ts           # registerSchema, loginSchema, refreshSchema
├── models/User.ts                   # UserDocument interface + schema
├── utils/jwt.ts                     # generateAccessToken, generateRefreshToken, verifyToken
└── core/config.ts                   # JWT secrets + expiry config
```

---

## 4. Token Architecture

### 4.1 Token Types

| Token | Signing Key | Default TTL | Payload | Purpose |
|---|---|---|---|---|
| Access Token | `JWT_SECRET` | 15 minutes | `{ userId, email }` | Authenticate API requests |
| Refresh Token | `JWT_REFRESH_SECRET` | 7 days | `{ userId }` | Obtain new access tokens |

### 4.2 Token Generation

```
generateAccessToken({ userId, email })
  → jwt.sign(payload, config.jwt.secret, { expiresIn: '15m' })

generateRefreshToken({ userId })
  → jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: '7d' })
```

### 4.3 Token Verification

```
verifyToken(token, isRefresh = false)
  → jwt.verify(token, isRefresh ? refreshSecret : secret)
  → returns JwtPayload or throws
```

### 4.4 Token Rotation Flow

```
Client                    Server                    MongoDB
  │                         │                         │
  │  POST /auth/refresh     │                         │
  │  { refreshToken: OLD }  │                         │
  │────────────────────────►│                         │
  │                         │                         │
  │                         │  1. Verify OLD token    │
  │                         │     (jwt.verify with    │
  │                         │      refreshSecret)     │
  │                         │                         │
  │                         │  2. User.findById       │
  │                         │     .select('+refreshToken')
  │                         │────────────────────────►│
  │                         │◄────────────────────────│
  │                         │                         │
  │                         │  3. Compare OLD token   │
  │                         │     with stored value   │
  │                         │     (mismatch → 401)    │
  │                         │                         │
  │                         │  4. Generate NEW        │
  │                         │     refresh token       │
  │                         │                         │
  │                         │  5. user.refreshToken   │
  │                         │     = NEW token         │
  │                         │     user.save()         │
  │                         │────────────────────────►│
  │                         │                         │
  │                         │  6. Generate NEW        │
  │                         │     access token        │
  │                         │                         │
  │  200 { accessToken,     │                         │
  │        refreshToken }   │                         │
  │◄────────────────────────│                         │
  │                         │                         │
  │  OLD refresh token is   │                         │
  │  now invalid (stored    │                         │
  │  value changed)         │                         │
```

**Implicit invalidation:** When a new refresh token is stored, the old one no longer matches `user.refreshToken`, so any attempt to reuse it returns 401.

---

## 5. Password Security

| Aspect | Implementation |
|---|---|
| Algorithm | bcrypt |
| Salt Rounds | 12 |
| Hashing Trigger | Mongoose `pre('save')` hook, guarded by `isModified('password')` |
| Comparison | `user.comparePassword(candidate)` → `bcrypt.compare()` |
| Storage | `password` field with `select: false` — excluded from all queries by default |
| Transport | HTTPS in production; never logged or returned in responses |

### 5.1 Password Flow

```
Registration:
  plaintext → validate(min 8 chars) → pre-save hook → bcrypt.hash(12 rounds) → MongoDB

Login:
  plaintext → User.findOne({email}).select('+password') → bcrypt.compare() → match/reject

Change Password (planned):
  oldPassword → compare → newPassword → hash → save
```

---

## 6. Authentication Middleware (`verifyAuth`)

**File:** `src/middleware/auth.middleware.ts`

### 6.1 Execution Flow

```
Incoming Request
      │
      ▼
┌──────────────────────────────────────┐
│ 1. Extract token from               │
│    Authorization: Bearer <token>     │
│    No header → throw 401             │
└──────────┬───────────────────────────┘
           │
┌──────────▼───────────────────────────┐
│ 2. jwt.verify(token, JWT_SECRET)     │
│    Invalid/expired → throw 401       │
└──────────┬───────────────────────────┘
           │
┌──────────▼───────────────────────────┐
│ 3. User.findById(decoded.userId)     │
│    .select('-password -refreshToken')│
│    Not found → throw 401             │
└──────────┬───────────────────────────┘
           │
┌──────────▼───────────────────────────┐
│ 4. Attach to request:               │
│    req.user = { _id, email, name }   │
│    req.auth = decoded JwtPayload     │
└──────────┬───────────────────────────┘
           │
┌──────────▼───────────────────────────┐
│ 5. next()                            │
└──────────────────────────────────────┘
```

### 6.2 Error Handling

```typescript
catch (err) {
  if (err instanceof AppError && err.isOperational) return next(err);
  next(new AppError('Invalid token', 401, ErrorCodes.UNAUTHORIZED));
}
```

- Operational `AppError`s (e.g., "No token provided", "User not found") are forwarded as-is
- Non-operational errors (e.g., `jwt.verify` failures) are wrapped in a generic 401

---

## 7. Authorization Middleware (`projectAuth`)

**File:** `src/middleware/projectAuth.ts`

### 7.1 Role Hierarchy

```
viewer (priority 1) < editor (priority 2) < owner (priority 3)
```

### 7.2 Execution Flow

```
projectAuth(minimumRole)
      │
      ▼
┌──────────────────────────────────────┐
│ 1. Check req.user._id exists         │
│    Missing → 401 UNAUTHORIZED        │
└──────────┬───────────────────────────┘
           │
┌──────────▼───────────────────────────┐
│ 2. Extract projectId from req.params.id │
│    Missing → 400 VALIDATION_ERROR    │
└──────────┬───────────────────────────┘
           │
┌──────────▼───────────────────────────┐
│ 3. Project.findById(projectId)       │
│    .select('userId status')          │
│    Not found or deleted → 404        │
└──────────┬───────────────────────────┘
           │
┌──────────▼───────────────────────────┐
│ 4. Determine currentRole:            │
│    a. project.userId === user._id    │
│       → currentRole = 'owner'        │
│    b. else: ProjectMember.findOne    │
│       ({ projectId, userId })        │
│       → currentRole = membership.role│
│    c. No match → currentRole = null  │
└──────────┬───────────────────────────┘
           │
┌──────────▼───────────────────────────┐
│ 5. Compare priorities:               │
│    rolePriority[currentRole] >=      │
│    rolePriority[minimumRole]         │
│    → Insufficient → 403 FORBIDDEN    │
└──────────┬───────────────────────────┘
           │
┌──────────▼───────────────────────────┐
│ 6. req.projectRole = currentRole     │
│    next()                            │
└──────────────────────────────────────┘
```

### 7.3 Permission Matrix

| Operation | Required Role | Endpoint |
|---|---|---|
| View project | `viewer` | `GET /projects/:id` |
| View stats | `viewer` | `GET /projects/:id/stats` |
| Update project | `editor` | `PUT /projects/:id` |
| Start research | `editor` | `POST /research/:id/start` |
| Stress test | `editor` | `POST /research/:id/stresstest` |
| Delete project | `owner` | `DELETE /projects/:id` |
| Add member | `owner` | `POST /projects/:id/members` |
| Remove member | `owner` | `DELETE /projects/:id/members/:userId` |
| View research data | `viewer` | All `GET /research/:id/*` |
| Copilot chat | `viewer` | `POST /copilot/:id/chat` |

---

## 8. Route Middleware Chains

### 8.1 Auth Routes (`auth.routes.ts`)

```
POST /register  → authLimiter → validate(registerSchema) → asyncHandler(register)
POST /login     → authLimiter → validate(loginSchema)    → asyncHandler(login)
POST /logout    → verifyAuth                              → asyncHandler(logout)
POST /refresh   → authLimiter → validate(refreshSchema)  → asyncHandler(refresh)
GET  /me        → verifyAuth                              → asyncHandler(me)
```

### 8.2 Project Routes (`project.routes.ts`)

```
router.use(verifyAuth)   ← applied to ALL project routes

GET    /               → asyncHandler(listProjects)
POST   /               → validate(createProject) → asyncHandler(createProject)
GET    /:id            → projectAuth('viewer')   → asyncHandler(getProject)
PUT    /:id            → projectAuth('editor') → validate(updateProject) → asyncHandler(updateProject)
DELETE /:id            → projectAuth('owner')    → asyncHandler(deleteProject)
GET    /:id/stats      → projectAuth('viewer')   → asyncHandler(getProjectStats)
POST   /:id/members    → projectAuth('owner') → validate(addMember) → asyncHandler(addProjectMember)
DELETE /:id/members/:u → projectAuth('owner')    → asyncHandler(removeProjectMember)
```

### 8.3 Research Routes (`research.routes.ts`)

```
router.use(verifyAuth, projectAuth('viewer'), researchLimiter)  ← base chain

POST /start       → projectAuth('editor') → validate(startResearch) → asyncHandler(startResearch)
GET  /job         → asyncHandler(getResearchJob)
GET  /sources     → asyncHandler(getResearchSources)
GET  /evidence    → asyncHandler(getEvidence)
GET  /solutions   → asyncHandler(getSolutions)
GET  /gaps        → asyncHandler(getGaps)
GET  /architecture→ asyncHandler(getArchitecture)
GET  /resources   → asyncHandler(getResources)
GET  /roadmap     → asyncHandler(getRoadmap)
POST /stresstest  → projectAuth('editor') → asyncHandler(stressTestResearch)
```

### 8.4 Copilot Routes (`copilot.routes.ts`)

```
router.use(verifyAuth, projectAuth('viewer'))  ← base chain

POST /chat           → validate(copilotChatSchema) → asyncHandler(chatWithCopilot)
GET  /conversations  → asyncHandler(listConversations)
GET  /history        → asyncHandler(getCopilotHistory)
```

---

## 9. Express Request Augmentation

**File:** `src/types/express.d.ts`

```typescript
declare global {
  namespace Express {
    interface Request {
      user?: {
        _id: string;
        email: string;
        name?: string;
      };
      auth?: JwtPayload;
      projectRole?: 'owner' | 'editor' | 'viewer';
    }
  }
}
```

| Property | Set By | Contains |
|---|---|---|
| `req.user` | `verifyAuth` | User identity (safe to return to client) |
| `req.auth` | `verifyAuth` | Raw JWT payload (userId, email, iat, exp) |
| `req.projectRole` | `projectAuth` | Resolved role for the current project |

---

## 10. Session Strategy

### 10.1 Current Implementation

| Aspect | Status |
|---|---|
| Access token transport | `Authorization: Bearer` header |
| Refresh token transport | JSON body (in request and response) |
| Server-side storage | `User.refreshToken` field (single value) |
| Multi-session | **NOT supported** — new login overwrites the refresh token |
| Token blacklist | **NOT implemented** — relies on storage match |
| Cookie-based refresh | **NOT implemented** (planned in architecture) |

### 10.2 Planned Improvements

1. **httpOnly Refresh Cookie**: Refresh token set as `httpOnly, Secure, SameSite=Strict` cookie
2. **Multi-Session Support**: Array of hashed refresh tokens on User or separate `Session` collection
3. **Redis Token Blacklist**: Revoked tokens stored in Redis with TTL matching token expiry
4. **Forced Logout All Sessions**: Clear all stored refresh tokens for a user

---

## 11. Security Considerations

| Concern | Current Status | Risk |
|---|---|---|
| JWT secret strength | Validated at startup (`validateConfig`) | ✅ Mitigated |
| Password hashing | bcrypt, 12 rounds, `select: false` | ✅ Secure |
| Token in response body | Refresh token in JSON body (XSS exposure) | ⚠️ Medium |
| Single session per user | New login silently invalidates previous | ⚠️ Low |
| Credential enumeration | Generic "Invalid email or password" | ✅ Mitigated |
| Rate limiting | Auth endpoints: 5/15min | ✅ Mitigated |
| Timing attacks | `bcrypt.compare` is constant-time | ✅ Mitigated |
| Token expiry | Access: 15min, Refresh: 7d, enforced by JWT | ✅ Mitigated |

---

## 12. Error Handling

| Scenario | Status | Code | Message |
|---|---|---|---|
| Missing `Authorization` header | 401 | `UNAUTHORIZED` | No token provided |
| Malformed token | 401 | `UNAUTHORIZED` | Invalid token |
| Expired access token | 401 | `UNAUTHORIZED` | Invalid token (jwt.verify throws) |
| User deleted after token issued | 401 | `UNAUTHORIZED` | User not found |
| Wrong password | 401 | `UNAUTHORIZED` | Invalid email or password |
| Email not registered | 401 | `UNAUTHORIZED` | Invalid email or password |
| Duplicate email | 409 | `CONFLICT` | Email already in use |
| Missing refresh token | 400 | `VALIDATION_ERROR` | Zod validation |
| Expired refresh token | 401 | `UNAUTHORIZED` | Invalid refresh token |
| Refresh token mismatch | 401 | `UNAUTHORIZED` | Invalid refresh token |
| Insufficient project role | 403 | `FORBIDDEN` | Insufficient project permission |
| Project not found | 404 | `NOT_FOUND` | Project not found |

---

## 13. Testing Strategy

| Test | Description | Priority |
|---|---|---|
| Register happy path | Valid input → 201 + tokens | P0 |
| Register duplicate email | Same email → 409 | P0 |
| Login happy path | Correct creds → 200 + tokens | P0 |
| Login wrong password | Bad password → 401 | P0 |
| Login wrong email | Unknown email → 401 | P0 |
| Refresh happy path | Valid token → new tokens | P0 |
| Refresh with old token | After rotation → 401 | P0 |
| Logout authenticated | Revoke token → 200 | P1 |
| Access with expired token | Expired JWT → 401 | P0 |
| Protected route without token | No header → 401 | P0 |
| ProjectAuth owner access | Owner → allowed | P0 |
| ProjectAuth viewer on edit | Viewer on PUT → 403 | P0 |
| ProjectAuth non-member | No membership → 403 | P0 |
| Rate limiting | 6th auth request → 429 | P1 |

---

## 14. Future Improvements

1. **OAuth 2.0 / SSO**: Google, GitHub social login
2. **Multi-Factor Authentication**: TOTP-based 2FA
3. **Account Lockout**: Lock after N failed attempts
4. **Password Reset**: Email-based reset flow with time-limited tokens
5. **`isActive` Flag**: Soft-disable accounts without deletion
6. **`lastLogin` Tracking**: Update timestamp on successful login
7. **Admin Role**: Global `role` field (`user`/`admin`) on User model
8. **Audit Trail**: Log all auth events to `ActivityLog`
