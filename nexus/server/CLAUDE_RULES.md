# CLAUDE_RULES.md — AI Agent Development Rules for NEXUS

> **Scope:** Binding rules for any AI agent (Claude, Gemini, GPT, or any future model) that writes code in the NEXUS codebase. These rules are non-negotiable. Violations cause architectural drift, bugs, and technical debt.

---

## 1. Golden Rules

1. **Read before writing.** Before modifying any file, read the relevant documentation in `/docs/`. If a spec exists for what you're building, follow it exactly.
2. **One architecture.** All 17 spec documents (`00_MASTER_SPEC.md` through `16_FRONTEND_INTEGRATION.md`) define the canonical architecture. Do not invent alternative patterns.
3. **Never modify code you weren't asked to modify.** If you discover a bug in an unrelated file, document it — do not fix it unless explicitly asked.
4. **No placeholders.** Every function must contain real logic. Stubs like `// TODO` or `throw new Error('Not implemented')` are only acceptable if the placeholder is documented in `15_BACKEND_STATUS.md`.
5. **Compile before claiming done.** Run `npx tsc --noEmit` and verify zero errors before declaring any task complete.

---

## 2. File & Folder Conventions

| Rule | Detail |
|---|---|
| **ESM imports** | All relative imports use `.js` extension: `import { x } from './module.js'` |
| **File naming** | `camelCase` with purpose suffix: `auth.controller.ts`, `serper.provider.ts` |
| **Model naming** | `PascalCase`, singular: `User.ts`, `ResearchJob.ts` |
| **New files** | Place in the correct folder per `00_MASTER_SPEC.md` §5. Ask if unsure. |
| **No new top-level folders** | Do not create folders outside the defined structure without explicit approval |
| **No `console.log`** | Use `logger.info/warn/error/debug` from `core/logger.ts` |
| **No `any` types** | Use proper types. If you must use `unknown`, add a comment explaining why. |

---

## 3. Architecture Rules

### 3.1 Layer Discipline

```
Routes → Middleware → Controllers → Services → Models/Integrations
```

- **Routes** only wire middleware and controllers. No logic.
- **Middleware** calls `next()` or `next(err)`. Never sends responses (except `validate` for 400).
- **Controllers** orchestrate: read validated input, call services/models, format response.
- **Services** contain business logic spanning multiple models. Controllers should not have complex query pipelines.
- **Models** define schemas, indexes, and instance methods. No Express types (`req`, `res`).
- **Integrations** wrap external APIs behind interfaces.

### 3.2 Error Handling

- All async controller handlers MUST be wrapped in `asyncHandler()`.
- Domain errors MUST use `throw new AppError(message, statusCode, ErrorCodes.CODE)`.
- Never call `res.status(xxx).json({ error: ... })` directly for errors — let `errorHandler` handle it.
- Never swallow errors silently. At minimum, log them.

### 3.3 Response Format

Every response MUST use the standard envelope:

```typescript
// Success
res.status(200).json({ success: true, data: { ... } });

// Created
res.status(201).json({ success: true, data: { ... } });

// Accepted (async job)
res.status(202).json({ success: true, data: { jobId, status: 'queued' } });
```

Errors are handled by `errorHandler` and automatically formatted as:
```json
{ "success": false, "error": { "message": "...", "code": "..." } }
```

### 3.4 Validation

- Every mutation endpoint (POST, PUT, PATCH) MUST have a Zod schema in `schemas/`.
- The schema is applied via `validate(schema)` middleware in the route.
- Controllers MUST NOT re-validate — trust the middleware.

### 3.5 Authentication & Authorization

- Every protected route MUST use `verifyAuth` middleware.
- Every project-scoped route MUST use `projectAuth(minimumRole)`.
- Route middleware order: `verifyAuth → projectAuth → validate → asyncHandler(controller)`.
- Never access `req.headers.authorization` directly in controllers — use `req.user`.

### 3.6 Database Operations

- Use Mongoose model methods (`find`, `findById`, `create`, `findByIdAndUpdate`).
- Always pass `{ new: true, runValidators: true }` to update operations.
- Never use `Model.update()` (deprecated) — use `Model.updateOne()` or `Model.findByIdAndUpdate()`.
- Sensitive fields (`password`, `refreshToken`) are `select: false` — never override this without explicit reason.

---

## 4. Coding Standards

### 4.1 TypeScript

- `strict: true` is enabled in `tsconfig.json`. Do not weaken it.
- Function parameters and return types MUST be explicitly typed.
- Use `interface` for object shapes, `type` for unions/intersections.
- Use `satisfies` for type checking without widening.
- Use `as const` for enum-like objects.

### 4.2 Async/Await

- Always use `async/await` — never raw `.then()/.catch()` chains.
- Parallel independent operations: `await Promise.all([...])`.
- Wrap Express handlers: `asyncHandler(async (req, res) => { ... })`.

### 4.3 Imports

```typescript
// 1. Node built-ins
import { resolve } from 'path';

// 2. Third-party packages
import mongoose from 'mongoose';
import { z } from 'zod';

// 3. Local absolute paths (if configured)
// 4. Local relative paths (with .js extension)
import { config } from '../core/config.js';
import { AppError, ErrorCodes } from '../core/errors.js';
import { logger } from '../core/logger.js';
```

### 4.4 Naming

| Entity | Convention | Example |
|---|---|---|
| Variables | `camelCase` | `projectId`, `sourceCount` |
| Functions | `camelCase` | `getProject`, `startResearch` |
| Classes | `PascalCase` | `GeminiProvider`, `BaseAgent` |
| Interfaces | `PascalCase` | `AIProvider`, `NormalizedSource` |
| Constants | `UPPER_SNAKE_CASE` | `RESEARCH_STAGES`, `ErrorCodes` |
| Env vars | `UPPER_SNAKE_CASE` | `JWT_SECRET`, `MONGODB_URI` |
| File names | `camelCase.purpose.ts` | `auth.controller.ts` |

---

## 5. Research Provider Rules

- Every provider MUST implement the `ResearchProvider` interface.
- Every provider MUST use `safeFetch()` for HTTP requests — never raw `axios` or `fetch`.
- Provider `search()` MUST return `NormalizedSource[]` — never raw API shapes.
- Provider `search()` MUST catch all errors and return `[]` on failure — never throw.
- Provider `isConfigured()` MUST check for required API keys.

---

## 6. AI Agent Rules

- Every agent MUST extend `BaseAgent<TInput, TOutput>`.
- Every agent MUST use `generateStructured<T>()` for JSON output.
- Agents MUST NOT access MongoDB directly — return data for the orchestrator to persist.
- Agents MUST NOT access `req`, `res`, or any Express types.
- Agent system prompts live in `agents/prompts/` — not inline in agent code.

---

## 7. Testing Rules

- Every new utility MUST have unit tests.
- Every new endpoint MUST have integration tests (Supertest).
- Every new provider MUST have mocked unit tests (MSW).
- Tests use `mongodb-memory-server` — never connect to a real database.
- Test files live in `tests/` mirroring `src/` structure.
- Test names describe behavior: `it('returns 401 when token is expired')`.

---

## 8. What NOT To Do

| ❌ Do Not | ✅ Instead |
|---|---|
| `console.log(...)` | `logger.info(...)` |
| `res.status(500).json({error})` | `throw new AppError(msg, 500, INTERNAL_ERROR)` |
| `import x from './file'` (no extension) | `import x from './file.js'` |
| `any` type | Proper TypeScript type |
| Raw `axios.get(url)` for external calls | `safeFetch(url, options)` |
| Inline SQL/NoSQL in controllers | Model methods or service functions |
| `catch(err) { }` (swallow errors) | `catch(err) { logger.error(...); throw; }` |
| Modify `app.ts` middleware order | Ask first — order is security-critical |
| Create new config keys without updating `config.ts` | Add to `config.ts` + document in `00_MASTER_SPEC.md` |
| Store secrets in code | Use environment variables via `config` |

---

## 9. Pre-Commit Checklist

Before declaring any task complete, verify:

- [ ] TypeScript compiles: `npx tsc --noEmit` → 0 errors
- [ ] No `console.log` statements
- [ ] All async handlers wrapped in `asyncHandler()`
- [ ] All mutation endpoints have Zod validation
- [ ] All protected routes use `verifyAuth`
- [ ] All project-scoped routes use `projectAuth`
- [ ] Response format matches the standard envelope
- [ ] Error cases throw `AppError` with correct status codes
- [ ] Sensitive data not leaked in responses
- [ ] External HTTP calls use `safeFetch()`
- [ ] New files placed in correct folders
- [ ] Imports use `.js` extension
- [ ] `15_BACKEND_STATUS.md` updated if status changed

---

## 10. Documentation Maintenance

When you implement a feature:
1. Update `15_BACKEND_STATUS.md` — change status from ❌ to ✅/⚠️
2. If the implementation diverges from the spec, update the relevant doc AND add a note explaining why
3. Never silently deviate from the spec — document all deviations

---

## 11. Context Loading Order

When starting a new session, read these files in order:

1. `CLAUDE_RULES.md` (this file) — behavioral rules
2. `00_MASTER_SPEC.md` — project overview and conventions
3. `15_BACKEND_STATUS.md` — what exists and what's broken
4. The specific doc for the feature you're implementing (e.g., `06_RESEARCH_ENGINE.md`)
5. The `CLAUDE_HANDOFF.md` — if present, for continuation context

---

## 12. Handoff Protocol

When ending a session with incomplete work:
1. Create or update `docs/CLAUDE_HANDOFF.md` with:
   - What was completed
   - What is incomplete
   - Files currently being worked on
   - The exact next task
   - Known facts to reuse (avoid re-derivation)
   - Known errors or blockers
2. Update `15_BACKEND_STATUS.md` with any status changes
3. List any commands run and their results

---

## 13. Version

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-07-30 | Initial rules document |
