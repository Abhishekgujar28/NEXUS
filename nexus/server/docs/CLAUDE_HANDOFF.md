# NEXUS Backend V1 — Continuation Handoff

## Completed
- **Phase 1 (Foundation Hardening):** reusable `asyncHandler`; removed hardcoded JWT
  fallbacks + fail-fast `validateConfig()`; `password`/`refreshToken` excluded by
  default; Zod-validated project-member creation (no ownership grant/transfer);
  logout/revocation fixed; API response envelope preserved.
- **Phase 2 (partial):** four TS providers implement unified `ResearchProvider`
  interface (serper, github, arxiv, semanticScholar). `deduplicator.ts` ported
  (typed to `NormalizedSource[]`, keys on normalized URL then lowercased title).

## Incomplete
- **Phase 2:** `normalizer.ts` and `providers/registry.ts` not yet created.
- **Phases 3–14:** not started (AI pipeline, evidence/novelty, BullMQ engine,
  orchestrator, RAG, copilot, realtime, stress test, notifications, API completion,
  reliability, tests, docs/BACKEND_STATUS.md).

## Files currently being worked on
- `src/research/normalizer.ts` — TO CREATE (port from `normalizer.js`).
- `src/research/providers/registry.ts` — TO CREATE.

## Next exact task (Phase 2 finish)
1. Create `src/research/normalizer.ts`: port `normalizeSource(raw, projectId, jobId)`.
   Map legacy `jobId` -> `researchJobId`; DROP `evidenceScore` (ResearchSource model
   has no such field); `sourceType` default `'web'`; string/array/number fallbacks.
2. Create `src/research/providers/registry.ts` (`ProviderRegistry`): instantiate the
   four providers, filter to `isConfigured() === true`, run `search(query)`
   concurrently — each wrapped in `retry()` + per-provider timeout
   `config.research.providerTimeoutMs` (15000). Isolate failures: a rejected/timed-out
   provider yields `[]` and must NOT fail the run. Flatten, then apply cross-provider
   `deduplicateSources()`. Outbound requests already SSRF-guarded via `safeFetch`.
3. Then proceed to Phase 3 (8 Zod-validated AI pipeline stages).

## Known facts to reuse (do not re-derive)
- `retry<T>(fn, maxAttempts=3, baseDelay=500)`, backoff `baseDelay*2^(i-1)`.
- `NormalizedSource`: {provider, sourceType, title, url, authors[], publishedAt|null,
  snippet, content?, query, metadata, relevanceScore, credibilityScore}.
- `ResearchSource` model uses `researchJobId` (NOT `jobId`); NO `evidenceScore`.
- config.research: workerConcurrency 2, jobAttempts 2, providerTimeoutMs 15000,
  maxSourcesPerProvider 10. config.copilot.historyWindow 10. config.vectorStore='memory'.
- Relative imports use `.js` extension (ESM NodeNext).
- Response envelope `{success,data}` / `{success:false,error:{message,code}}`; `AppError`+`ErrorCodes`.
- Roles viewer(1)<editor(2)<owner(3); `projectAuth(minimumRole)`.

## Build-integrity risks to resolve later
- `server.ts` forward-imports `./realtime/socket.js` (initRealtime/shutdownRealtime)
  and `./research/queue/worker.js` (startResearchWorker) — files DO NOT EXIST yet
  (Phases 5/9). Build will break until created.
- `copilot.routes.ts` imports `listConversations` — confirm/implement in
  `copilot.controller.ts` (Phase 8).
- Dead `.js` shadows still on disk (deduplicator.js, normalizer.js, *.provider.js) —
  could not delete via tools; document manual removal in BACKEND_STATUS.md.

## Commands/tests run
- NONE executed successfully. No build/test run this session.

## Known errors/blockers
- **VHDX sandbox down:** `mcp__workspace__bash` fails ("VHDX file not found:
  ...claudevm.bundle\rootfs.vhdx"). Cannot run tsc / npm / tests. Report Build/Tests
  as NOT executable per spec ("Do NOT claim something works if it could not be executed").
- **Delete tool blocked:** `allow_cowork_file_delete` returns "Could not find mount for
  path" for D:\ paths — dead `.js` shadows cannot be deleted here.
- No compiler-verified errors this session (read-only work only).
