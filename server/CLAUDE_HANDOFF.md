# CLAUDE_HANDOFF

> Rolling handoff log for AI-assisted backend work on NEXUS. Newest phase on top.
> Each entry records: what changed, why, what was tested, commands run, known issues,
> remaining work, and the next recommended phase. Never claim untested work passes.

---

## Phase 4 — BullMQ Research Worker (Producer + Consumer) — 2026-07-30

### Summary
Wired the asynchronous research pipeline. `startResearch` now persists a `queued`
`ResearchJob`, transitions the `Project` to `researching`, and hands the job off to a
BullMQ queue. A standalone worker consumes queued jobs, runs the Provider Registry,
persists the discovered sources, and drives the job/project to a terminal state.
AI-analysis stages are deliberately marked `skipped` (not faked) because the
agent/orchestrator/RAG phase is not yet implemented.

### Files created
- `src/workers/researchQueue.ts` — BullMQ `Queue` (producer). Shared `RESEARCH_QUEUE_NAME = 'research'`
  and `ResearchJobPayload { researchJobId, projectId }`. `enqueueResearchJob()` pins the BullMQ
  `jobId` to `researchJobId` for idempotency. Exponential backoff, bounded job history
  (`removeOnComplete`/`removeOnFail`). Reuses the app IORedis connection.
- `src/workers/research.worker.ts` — Standalone consumer process. `bootstrap()` validates config,
  connects Mongo, creates a dedicated IORedis connection (`maxRetriesPerRequest: null`, required by
  BullMQ), and starts a `Worker` with concurrency from `config.research.workerConcurrency`.
  `processResearchJob` runs `runResearchProviders`, `insertMany`s sources, marks search stages
  `completed` and AI stages `skipped`, and drives job/project to `complete`. `markJobFailed`
  provides defensive rollback. Graceful SIGTERM/SIGINT shutdown.

### Files modified
- `src/controllers/research.controller.ts` — `startResearch` now imports and calls
  `enqueueResearchJob({ researchJobId, projectId })` after persistence, with enqueue-with-rollback:
  on enqueue failure the job is set to `failed`, the project to `failed`/progress 0, and a 502
  `BAD_GATEWAY` is surfaced. Returns `202 Accepted` with `{ jobId, status }` on success.

### Documentation updated
- `docs/15_BACKEND_STATUS.md` — added §3.5a "Background Workers (Phase 4)"; marked the two
  §3.4 research-layer issues FIXED; removed the "BullMQ queue + worker" row from the §3.10
  unimplemented matrix; updated §4 Build Status with the Phase 4 note and honest
  "Not re-verified" status. §5 Security Audit preserved unchanged.

### Tests executed
- None. The isolated Linux workspace could not start this session
  (`VHDX file not found: ...claudevm.bundle\rootfs.vhdx`), so no build or runtime command was runnable.

### Commands attempted
- `npx tsc --noEmit` → could not run (workspace/VHDX unavailable).
- `npm run dev`, `npm run build`, `npm run worker` → not runnable this session (same blocker).

### Known issues
- **Build/run NOT verified this session.** TypeScript compilation, server start, and
  `npm run worker` must be confirmed in a working environment before Phase 4 is considered fully done.
- AI-analysis stages (evidence/solutions/gaps/architecture/roadmap) are intentionally `skipped`
  until the agent/orchestrator/RAG phase — they are NOT faked.
- Producer↔consumer wiring was verified by static review only (shared queue name, shared
  `ResearchJobPayload`, matching `enqueueResearchJob` call site, enqueue-with-rollback present).

### Remaining work (to close Phase 4)
1. In a working environment, run `npx tsc --noEmit` and fix any compile errors.
2. Start the API (`npm run dev`) and the worker (`npm run worker`) together against Redis + Mongo.
3. Postman-test the full flow: `POST /projects/:id/research` → job `queued` → worker picks it up →
   sources persisted → job/project reach `complete`; verify search stages `completed`, AI stages `skipped`.
4. Test edge/failure paths: enqueue failure rollback (Redis down → 502), duplicate start (409),
   unauthorized (401), missing/deleted project (404).

### Next recommended phase
Per the codebase's own phase numbering, the next unimplemented area is the AI agent /
research orchestrator layer (base agent + research agents + orchestrator, per
`07_AI_AGENTS.md` / `06_RESEARCH_ENGINE.md`), which will replace the currently `skipped`
AI-analysis stages with real output.

---

> Note: `CLAUDE_RULES.md` referenced by the project workflow does not currently exist in the repo.
