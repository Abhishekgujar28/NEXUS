# 11 — Security Architecture

> **Scope:** Complete security model — twelve-layer defense, authentication security, SSRF protection, input validation, rate limiting, HTTP hardening, secrets management, and threat model.

---

## 1. Purpose

Define every security layer in the NEXUS backend. This document serves as the security reference for code reviews, penetration testing scoping, and compliance verification. Every security-relevant implementation decision is documented here.

---

## 2. Security Layers Overview

```
Layer 1:  HTTPS / TLS Termination         (Nginx/Load Balancer)
Layer 2:  HTTP Security Headers            (Helmet)
Layer 3:  CORS Origin Restriction          (cors middleware)
Layer 4:  Rate Limiting                    (express-rate-limit)
Layer 5:  Body Parsing Limits              (Express json/urlencoded)
Layer 6:  Input Validation                 (Zod schemas)
Layer 7:  Authentication                   (JWT verification)
Layer 8:  Authorization                    (Role-based project access)
Layer 9:  Password Security               (bcrypt hashing)
Layer 10: SSRF Protection                  (safeFetch utility)
Layer 11: Error Information Leakage        (errorHandler middleware)
Layer 12: Configuration Security           (validateConfig)
```

---

## 3. Layer 1 — TLS / HTTPS

| Aspect | Status | Detail |
|---|---|---|
| Enforcement | **Planned** (production only) | Nginx reverse proxy with TLS termination |
| HSTS | Enabled via Helmet | `Strict-Transport-Security: max-age=15552000; includeSubDomains` |
| Certificate | Production | Let's Encrypt or managed cloud certificate |

---

## 4. Layer 2 — HTTP Security Headers (Helmet)

**File:** `src/app.ts` — `app.use(helmet())`

Helmet applies these headers by default:

| Header | Value | Purpose |
|---|---|---|
| `Content-Security-Policy` | Default restrictive | Prevent XSS via script/style injection |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME-type sniffing |
| `X-Frame-Options` | `SAMEORIGIN` | Prevent clickjacking |
| `X-XSS-Protection` | `0` | Defer to CSP (modern approach) |
| `Strict-Transport-Security` | `max-age=15552000; includeSubDomains` | Force HTTPS |
| `Referrer-Policy` | `no-referrer` | Prevent referrer leakage |
| `X-DNS-Prefetch-Control` | `off` | Privacy protection |
| `X-Download-Options` | `noopen` | IE-specific download protection |
| `X-Permitted-Cross-Domain-Policies` | `none` | Flash/PDF policy restriction |

---

## 5. Layer 3 — CORS

**File:** `src/app.ts`

```typescript
cors({
  origin: config.frontendUrl,    // e.g., 'http://localhost:5173'
  credentials: true              // Required for cookie-based auth (planned)
})
```

| Aspect | Value |
|---|---|
| Allowed Origin | `FRONTEND_URL` environment variable only |
| Credentials | `true` (enables `Access-Control-Allow-Credentials`) |
| Methods | All standard methods (GET, POST, PUT, DELETE, OPTIONS) |
| Preflight Cache | Browser default (varies) |

**Risk:** If `FRONTEND_URL` is set to `*`, all origins are allowed. Production MUST use a specific origin.

---

## 6. Layer 4 — Rate Limiting

**File:** `src/middleware/rateLimit.middleware.ts`

| Limiter | Scope | Limit | Window | Applied To |
|---|---|---|---|---|
| `generalLimiter` | Global | 100 requests | 15 minutes | All routes via `app.use()` |
| `authLimiter` | Auth endpoints | 5 requests | 15 minutes | `POST /auth/register`, `/login`, `/refresh` |
| `researchLimiter` | Research endpoints | 10 requests | 15 minutes | All `/research/*` routes |

**Key-By:** Client IP address (`req.ip`)

**Response when limited (429):**
```json
{
  "success": false,
  "error": {
    "message": "Too many requests",
    "code": "RATE_LIMITED"
  }
}
```

**Headers returned:**
```
Retry-After: 900
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: <timestamp>
```

**Consideration:** In production with a load balancer, configure `app.set('trust proxy', 1)` to use `X-Forwarded-For` for accurate client IP detection.

---

## 7. Layer 5 — Body Parsing Limits

**File:** `src/app.ts`

```typescript
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
```

- Maximum request body: 2 MB
- Exceeding returns 413 `Payload Too Large`
- Protects against DoS via large payloads

---

## 8. Layer 6 — Input Validation (Zod)

**File:** `src/middleware/validate.middleware.ts`

### 8.1 Validation Flow

```
validate(zodSchema)
    │
    ▼
┌──────────────────────┐
│ zodSchema.parse(     │
│   req.body           │
│ )                    │
└──────────┬───────────┘
    Success │           Failure
    │       │           │
    │  ┌────▼────┐      │
    │  │ next()  │      │
    │  └─────────┘      │
    │                   ▼
    │           ┌──────────────────┐
    │           │ res.status(400)  │
    │           │ .json({          │
    │           │   success: false,│
    │           │   error: {       │
    │           │     message,     │
    │           │     code,        │
    │           │     details      │
    │           │   }              │
    │           │ })               │
    │           └──────────────────┘
```

### 8.2 Validated Schemas

| Endpoint | Schema | Key Validations |
|---|---|---|
| `POST /auth/register` | `registerSchema` | name: 2-50, email: valid, password: 8-100 |
| `POST /auth/login` | `loginSchema` | email: valid, password: min 1 |
| `POST /auth/refresh` | `refreshSchema` | refreshToken: min 1 |
| `POST /projects` | `createProjectSchema` | title: 3-100, description: 10-4000, teamSize: 1-100, skillLevel: enum |
| `PUT /projects/:id` | `updateProjectSchema` | Partial of create schema |
| `POST /projects/:id/members` | `addMemberSchema` | email: valid, role: `editor`/`viewer` only |
| `POST /research/:id/start` | `startResearchSchema` | force: boolean (optional) |
| `POST /copilot/:id/chat` | `copilotChatSchema` | message: 1-8000, conversationId: 1-200 |

### 8.3 Security Notes

- `addMemberSchema` restricts `role` to `editor` and `viewer` — prevents privilege escalation via `owner` assignment
- All string fields are implicitly trimmed by Zod
- Unknown keys are rejected (Zod strict mode)

---

## 9. Layer 7 — Authentication (JWT)

**File:** `src/middleware/auth.middleware.ts`, `src/utils/jwt.ts`

*(See `04_AUTH_FLOW.md` for full details)*

| Aspect | Implementation |
|---|---|
| Access token | JWT, `JWT_SECRET`, 15 min TTL |
| Refresh token | JWT, `JWT_REFRESH_SECRET`, 7 day TTL |
| Token transport | `Authorization: Bearer <token>` header |
| Verification | `jwt.verify()` + user lookup in MongoDB |
| Sensitive fields | `password`, `refreshToken` excluded via `select: false` |

### 9.1 Token Validation Chain

```
1. Extract from Authorization header → 401 if missing
2. jwt.verify(token, secret) → 401 if invalid/expired
3. User.findById(decoded.userId) → 401 if user not found
4. Attach req.user, req.auth → next()
```

---

## 10. Layer 8 — Authorization (RBAC)

**File:** `src/middleware/projectAuth.ts`

*(See `04_AUTH_FLOW.md` §7 for full details)*

| Role | Priority | Can Do |
|---|---|---|
| `viewer` | 1 | Read project, view research, use copilot |
| `editor` | 2 | All viewer + edit project, start research, stress test |
| `owner` | 3 | All editor + delete project, manage members |

```
projectAuth(minimumRole):
  currentRole = determine from Project.userId or ProjectMember
  if rolePriority[currentRole] < rolePriority[minimumRole]:
    throw 403 FORBIDDEN
```

---

## 11. Layer 9 — Password Security

**File:** `src/models/User.ts`

| Aspect | Value |
|---|---|
| Algorithm | bcrypt |
| Salt rounds | 12 |
| Hashing | `pre('save')` hook, guarded by `isModified('password')` |
| Comparison | `user.comparePassword()` → `bcrypt.compare()` (constant-time) |
| Storage | `select: false` — never returned in queries |
| Credential enumeration | Generic "Invalid email or password" message |

---

## 12. Layer 10 — SSRF Protection

**File:** `src/utils/safeFetch.ts`

### 12.1 What It Protects Against

Server-Side Request Forgery (SSRF) — when an attacker tricks the server into making HTTP requests to internal services by manipulating URLs in research queries.

### 12.2 Protection Flow

```
safeFetch(url, options):
  │
  ├── 1. Parse URL
  │     → Reject non-HTTP(S) schemes (file://, ftp://, etc.)
  │
  ├── 2. DNS Resolution
  │     → Resolve hostname to IP address(es)
  │
  ├── 3. IP Validation
  │     → Reject private/reserved ranges:
  │       • 10.0.0.0/8
  │       • 172.16.0.0/12
  │       • 192.168.0.0/16
  │       • 127.0.0.0/8 (loopback)
  │       • ::1 (IPv6 loopback)
  │       • 0.0.0.0
  │       • 169.254.0.0/16 (link-local)
  │       • fc00::/7 (IPv6 private)
  │
  ├── 4. If all IPs are private → throw SSRF error
  │
  └── 5. axios(url, options) → return response
```

### 12.3 Used By

- `SerperProvider.search()` — outbound to Serper API
- `GitHubProvider.search()` — outbound to GitHub API
- `ArxivProvider.search()` — outbound to arXiv API
- `SemanticScholarProvider.search()` — outbound to Semantic Scholar API
- Any future provider that makes outbound HTTP requests

### 12.4 Sequence Diagram

```
Provider              safeFetch             DNS             axios
  │                      │                   │                │
  │ safeFetch(url)       │                   │                │
  │─────────────────────►│                   │                │
  │                      │ parse URL         │                │
  │                      │ validate scheme   │                │
  │                      │                   │                │
  │                      │ dns.resolve()     │                │
  │                      │──────────────────►│                │
  │                      │◄──────────────────│ [10.0.0.1]    │
  │                      │                   │                │
  │                      │ isPrivateIP?      │                │
  │                      │ YES → throw SSRF  │                │
  │◄─────────────────────│ Error!            │                │
  │                      │                   │                │
  │  --- OR ---          │                   │                │
  │                      │ isPrivateIP?      │                │
  │                      │ NO → proceed      │                │
  │                      │                   │                │
  │                      │ axios(url, opts)  │                │
  │                      │─────────────────────────────────►│
  │                      │◄─────────────────────────────────│
  │◄─────────────────────│ response          │                │
```

---

## 13. Layer 11 — Error Information Leakage

**File:** `src/middleware/errorHandler.middleware.ts`

| Environment | Behavior |
|---|---|
| Development | Return full error message, code, and stack trace |
| Production | Return generic message for 5xx errors; specific message for 4xx |

### 13.1 Error Handler Logic

```
errorHandler(err, req, res, next):
  if (err instanceof AppError):
    status = err.statusCode
    response = { message: err.message, code: err.code }
  else if (err is ZodError):
    status = 400
    response = { message, code: VALIDATION_ERROR, details: err.flatten() }
  else:
    status = 500
    response = { message: err.message, code: INTERNAL_ERROR }
    logger.error('Unhandled error', { err, stack: err.stack })

  // NEVER include stack traces in response
  res.status(status).json({ success: false, error: response })
```

### 13.2 Current Gap

In production, `err.message` for unhandled errors may leak internal details. **Required fix:** Return a generic "Internal server error" message for all 5xx errors in production.

---

## 14. Layer 12 — Configuration Security

**File:** `src/core/config.ts` — `validateConfig()`

### 14.1 Startup Validation

```
validateConfig():
  if (!JWT_SECRET) → throw "JWT_SECRET is required"
  if (!JWT_REFRESH_SECRET) → throw "JWT_REFRESH_SECRET is required"
  if (production):
    if (JWT_SECRET === JWT_REFRESH_SECRET) → throw "must differ"
    if (JWT_SECRET.length < 32) → throw "must be ≥ 32 chars"
    if (JWT_REFRESH_SECRET.length < 32) → throw "must be ≥ 32 chars"
```

### 14.2 .env Security

| Rule | Implementation |
|---|---|
| `.env` in `.gitignore` | Prevent secrets from being committed |
| No default secrets | `validateConfig` fails without JWT secrets |
| Secret strength | 32+ char minimum in production |
| Secret separation | Access and refresh secrets must differ |

### 14.3 Current Risk

The checked-in `.env` file contains actual Gemini API keys and JWT secrets that are public JWT examples. These MUST be rotated before any deployment.

---

## 15. Threat Model

| Threat | Vector | Mitigation | Residual Risk |
|---|---|---|---|
| XSS | Injected scripts via API | Helmet CSP, input validation | Low (API-only backend) |
| CSRF | Cross-origin state changes | CORS restriction, no cookies (currently) | Low |
| SSRF | Malicious URLs in research queries | `safeFetch()` IP validation | Low |
| SQL Injection | N/A | MongoDB (NoSQL) — but NoSQL injection possible | Low (Zod validation) |
| Brute Force | Password guessing | Rate limiting (5/15min), bcrypt slowness | Low |
| Token Theft | XSS or network sniffing | HTTPS (production), short-lived access tokens | Medium |
| Credential Stuffing | Leaked passwords | Rate limiting, bcrypt | Low |
| Privilege Escalation | Role manipulation | Zod restricts role assignment, middleware checks | Low |
| DoS | Request flooding | Rate limiting, body size limits | Medium |
| Data Exfiltration | Unauthorized data access | Project-level RBAC, `select: false` for secrets | Low |
| Dependency Vulnerability | npm supply chain | Regular `npm audit`, lockfile | Medium |

---

## 16. Security Checklist for New Features

Every new feature MUST satisfy these checks before merge:

- [ ] All inputs validated with Zod schemas
- [ ] All controller handlers wrapped in `asyncHandler()`
- [ ] Sensitive data excluded from API responses
- [ ] External HTTP calls use `safeFetch()`
- [ ] New endpoints have appropriate rate limiting
- [ ] Authentication required for all non-public endpoints
- [ ] Authorization checked at the correct role level
- [ ] Error messages do not leak internal details
- [ ] No hardcoded secrets or credentials
- [ ] No `console.log` — use `logger` instead

---

## 17. Dependencies

| Component | Depends On |
|---|---|
| Layer 2 (Headers) | `helmet` |
| Layer 3 (CORS) | `cors` |
| Layer 4 (Rate Limiting) | `express-rate-limit` |
| Layer 6 (Validation) | `zod` |
| Layer 7 (Auth) | `jsonwebtoken` |
| Layer 9 (Passwords) | `bcryptjs` |
| Layer 10 (SSRF) | `axios`, Node `dns`, Node `net` |

---

## 18. Testing Strategy

| Test | Description | Priority |
|---|---|---|
| Helmet headers | All security headers present | P0 |
| CORS rejection | Request from unknown origin → blocked | P0 |
| Rate limit enforcement | Exceed limit → 429 | P0 |
| Body size limit | 3MB body → 413 | P1 |
| Zod validation | Invalid input → 400 with details | P0 |
| JWT required | No token → 401 | P0 |
| JWT expired | Expired token → 401 | P0 |
| RBAC enforcement | Viewer on owner action → 403 | P0 |
| Password not returned | GET /me has no password field | P0 |
| SSRF blocking | Private IP URL → rejected | P0 |
| Error leakage | 5xx in prod → generic message | P0 |
| Config validation | Missing JWT_SECRET → startup failure | P0 |

---

## 19. Future Improvements

1. **Content Security Policy Refinement**: Tighten CSP for specific API needs
2. **Security Audit Logging**: Log all auth events to `ActivityLog`
3. **API Key Authentication**: For machine-to-machine access
4. **IP Allowlisting**: Restrict admin endpoints to specific IPs
5. **Request Signing**: HMAC-signed requests for webhook endpoints
6. **Dependency Scanning**: Automated `npm audit` in CI pipeline
7. **Penetration Testing**: Annual security assessment
8. **SOC 2 Compliance**: Formal security controls documentation
