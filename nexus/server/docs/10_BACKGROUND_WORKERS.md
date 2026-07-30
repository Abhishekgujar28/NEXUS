# 10 — Background Workers

> **Scope:** BullMQ job queue architecture — queue definition, worker lifecycle, job processing, retry strategy, error recovery, and scaling considerations.

---

## 1. Purpose

Define the background job processing architecture for NEXUS. The research pipeline is CPU-intensive and AI-heavy — it MUST NOT run in the HTTP request cycle. BullMQ provides reliable, Redis-backed job queues with retry, concurrency, and observability.

**Status:** BullMQ is installed (`bullmq` 5.7.0) and `package.json` defines `worker` / `worker:prod` scripts referencing `src/workers/research.worker.ts`, but the **worker files do not exist yet**. This document defines the complete specification.

---

## 2. Responsibilities

| Component | Responsibility |
|---|---|
| `[PLANNED] workers/queue.ts` | Queue definition + Redis connection |
| `[PLANNED] workers/research.worker.ts` | Job processor entry point |
| `[PLANNED] orchestrator/research.orchestrator.ts` | Agent pipeline execution |
| `research.controller.ts` | Job creation (queue producer) |
| `core/redis.ts` | Shared Redis connection |
| `core/config.ts` | Worker configuration parameters |

---

## 3. Folder Mapping (Planned)

```
src/workers/
├── queue.ts                # Queue instance + connection config
└── research.worker.ts      # Worker entry point (separate process)
```

---

## 4. Configuration

From `src/core/config.ts`:

| Parameter | Env Variable | Default | Description |
|---|---|---|---|
| `research.workerConcurrency` | `RESEARCH_WORKER_CONCURRENCY` | `2` | Concurrent jobs per worker |
| `research.jobAttempts` | `RESEARCH_JOB_ATTEMPTS` | `2` | Max retry attempts per job |
| `research.providerTimeoutMs` | `PROVIDER_TIMEOUT_MS` | `15000` | Per-provider search timeout |
| `redisUrl` | `REDIS_URL` | `redis://localhost:6379` | Redis connection string |

**NPM Scripts:**
```json
{
  "worker": "tsx watch src/workers/research.worker.ts",
  "worker:prod": "node dist/workers/research.worker.js"
}
```

---

## 5. Queue Architecture

### 5.1 Queue Definition

```
Queue name: 'research'
Connection: Redis (shared with main server)
Default job options:
  - attempts: config.research.jobAttempts (2)
  - backoff: { type: 'exponential', delay: 5000 }
  - removeOnComplete: { count: 100 }  // keep last 100 completed
  - removeOnFail: { count: 50 }       // keep last 50 failed
```

### 5.2 Job Payload

```typescript
interface ResearchJobPayload {
  projectId: string;
  userId: string;
  jobId: string;    // ResearchJob._id
}
```

### 5.3 Producer (HTTP Server)

```
POST /research/:id/start
  │
  ├── 1. Create ResearchJob document (status: 'queued')
  ├── 2. Update Project.status → 'researching'
  ├── 3. researchQueue.add('research', {
  │        projectId, userId, jobId
  │      }, {
  │        jobId: jobId,  // dedup key
  │        attempts: config.research.jobAttempts
  │      })
  └── 4. Return 202 { jobId, status: 'queued' }
```

---

## 6. Worker Lifecycle

### 6.1 Worker Entry Point

```
research.worker.ts:
  1. validateConfig()         // Fail fast on missing secrets
  2. await connectDB()        // Worker needs MongoDB
  3. await connectRedis()     // Worker needs Redis

  4. const worker = new Worker('research', processResearchJob, {
       connection: redisConnection,
       concurrency: config.research.workerConcurrency,
       limiter: {
         max: 5,
         duration: 60000    // max 5 jobs per minute
       }
     });

  5. worker.on('completed', onCompleted)
  6. worker.on('failed', onFailed)
  7. worker.on('error', onError)

  8. Graceful shutdown: worker.close() on SIGTERM/SIGINT
```

### 6.2 Job Processor

```
processResearchJob(job: Job<ResearchJobPayload>):
  const { projectId, userId, jobId } = job.data;

  1. Load ResearchJob from MongoDB
  2. Verify job.status === 'queued' or job is being retried
  3. Update job.status → 'running', job.startedAt = now

  4. Run orchestrator:
     const orchestrator = new ResearchOrchestrator(
       projectId, jobId, eventEmitter
     );
     await orchestrator.run();

  5. On success:
     job.status → 'completed', job.completedAt = now
     project.status → 'complete', project.researchProgress = 100

  6. On failure:
     job.status → 'failed', job.error = error.message
     project.status → 'failed'

  7. Check job.data.cancelRequested during each stage
     If true → job.status → 'cancelled'
```

---

## 7. Job State Machine

```
                 ┌──────────────┐
                 │   waiting     │  ← Queue received job
                 │  (BullMQ)     │
                 └──────┬───────┘
                        │ Worker picks up
                 ┌──────▼───────┐
                 │   active      │  ← Worker processing
                 │  (BullMQ)     │
                 └──────┬───────┘
              ┌─────────┼─────────────┐
              ▼         ▼             ▼
       ┌───────────┐ ┌──────────┐ ┌──────────┐
       │ completed  │ │  failed   │ │  delayed  │
       │ (BullMQ)   │ │ (BullMQ) │ │ (BullMQ)  │
       └───────────┘ └──────┬───┘ └──────┬────┘
                            │             │
                            │    (retry)  │
                            └─────────────┘

  MongoDB ResearchJob.status mirrors BullMQ state:
    waiting/delayed → 'queued'
    active          → 'running'
    completed       → 'completed'
    failed          → 'failed'
```

---

## 8. Progress Tracking

### 8.1 BullMQ Job Progress

```
// Inside orchestrator, after each stage:
await job.updateProgress(stageProgressPercent);
// e.g., after 'understand' stage: job.updateProgress(5)
```

### 8.2 MongoDB Progress Sync

```
// After each stage:
await ResearchJob.findByIdAndUpdate(jobId, {
  progress: stageProgressPercent,
  'stages.$[s].status': 'completed',
  'stages.$[s].completedAt': new Date()
}, {
  arrayFilters: [{ 's.key': stageKey }]
});

await Project.findByIdAndUpdate(projectId, {
  researchProgress: stageProgressPercent
});
```

### 8.3 Socket.io Progress Emission

```
// After each stage:
io.to(`project:${projectId}`).emit('research:progress', {
  jobId,
  stage: stageKey,
  stageLabel,
  progress: stageProgressPercent,
  message: `${stageLabel} completed`
});
```

---

## 9. Retry Strategy

### 9.1 BullMQ Retry

| Parameter | Value | Description |
|---|---|---|
| `attempts` | 2 | Total attempts (1 original + 1 retry) |
| `backoff.type` | `exponential` | Exponential delay between retries |
| `backoff.delay` | 5000 | Base delay (5s → 10s → 20s) |

### 9.2 Stage-Level Retry

Within the orchestrator, individual stages can retry independently:
- Critical stages (`understand`, `search_*`, `analyze`): fail the entire job on unrecoverable error
- Non-critical stages (`stress`, `architecture`, `roadmap`): skip and continue, mark stage as `failed`

### 9.3 Provider-Level Retry

Each research provider is wrapped in `retry(fn, 3, 500)`:
- 3 attempts with exponential backoff (500ms, 1000ms, 2000ms)
- Plus per-provider timeout: `config.research.providerTimeoutMs` (15s)
- Failed provider returns `[]`, does NOT fail the stage

---

## 10. Job Cancellation

```
POST /research/:id/cancel (planned):
  1. Update ResearchJob.cancelRequested = true
  2. The orchestrator checks cancelRequested before each stage:
     if (await checkCancelled(jobId)) {
       job.status → 'cancelled'
       project.status = previous status or 'draft'
       throw new CancellationError()
     }
```

---

## 11. Error Handling

| Error | Source | Handling |
|---|---|---|
| Redis unavailable | Worker startup | Worker refuses to start |
| MongoDB unavailable | Worker startup | Worker refuses to start |
| Job payload missing | Malformed job | Mark failed, log error |
| ResearchJob not found | DB inconsistency | Mark failed, log error |
| Gemini API failure | AI generation | Stage retry 3x, then fail stage |
| Provider timeout | External API | Return `[]`, continue |
| All providers fail | Network issues | Fail search stages |
| Unhandled exception | Bug | BullMQ catches, marks failed, retries |
| Worker crash | Process dies | BullMQ re-queues stalled jobs |

### 11.1 Stalled Job Detection

```
Worker options:
  stalledInterval: 30000    // Check every 30s
  maxStalledCount: 2        // Mark failed after 2 stall detections
```

If a worker crashes mid-job, BullMQ detects the stall and either retries or marks failed.

---

## 12. Scaling

### 12.1 Horizontal Scaling

```
# Run multiple workers:
npm run worker     # Worker 1 (concurrency: 2)
npm run worker     # Worker 2 (concurrency: 2)
# Total: 4 concurrent research jobs
```

BullMQ automatically distributes jobs across workers via Redis.

### 12.2 Rate Limiting

```
Worker limiter: {
  max: 5,           // Max 5 jobs
  duration: 60000   // Per minute
}
```

Prevents overwhelming external APIs (Gemini, Serper, etc.).

### 12.3 Resource Considerations

| Resource | Per Job | Notes |
|---|---|---|
| Memory | ~100-200 MB | AI responses + source content |
| CPU | Low (I/O bound) | Waiting on external APIs |
| Duration | 2-10 minutes | Depends on source count |
| API calls | 10-50 Gemini | Across all agents |
| API calls | 4-8 provider | Across all search providers |

---

## 13. Monitoring & Observability

### 13.1 Worker Events

```
worker.on('completed', (job) => {
  logger.info('Research job completed', {
    jobId: job.id,
    projectId: job.data.projectId,
    duration: Date.now() - job.timestamp
  });
});

worker.on('failed', (job, err) => {
  logger.error('Research job failed', {
    jobId: job?.id,
    error: err.message,
    stack: err.stack,
    attemptsMade: job?.attemptsMade
  });
});
```

### 13.2 Queue Metrics (Planned)

| Metric | Source |
|---|---|
| Jobs waiting | `queue.getWaitingCount()` |
| Jobs active | `queue.getActiveCount()` |
| Jobs completed | `queue.getCompletedCount()` |
| Jobs failed | `queue.getFailedCount()` |
| Job duration | `job.finishedOn - job.processedOn` |

---

## 14. Security

| Concern | Mitigation |
|---|---|
| Job tampering | Jobs created only by authenticated controllers |
| Redis access | Redis on internal network, password-protected |
| Sensitive data in job | Job payload contains IDs only, not credentials |
| Worker isolation | Worker runs as separate process with limited permissions |
| API key exposure | Worker reads keys from env, not from job payload |

---

## 15. Dependencies

| Component | Depends On |
|---|---|
| `workers/queue.ts` | `bullmq`, `core/redis`, `core/config` |
| `workers/research.worker.ts` | Queue, `core/database`, `core/config`, orchestrator |
| Research orchestrator | All agents, models, integrations |
| Progress emission | `ioredis` pub/sub or `socket.io` |

---

## 16. Testing Strategy

| Test | Description | Priority |
|---|---|---|
| Job creation | Controller adds job to queue | P0 |
| Job processing | Worker executes orchestrator | P0 |
| Job completion | Status updates in MongoDB | P0 |
| Job failure | Error stored, status = failed | P0 |
| Job retry | Failed job retried with backoff | P0 |
| Concurrent jobs | 2 jobs run simultaneously | P1 |
| Stalled detection | Crashed worker → job re-queued | P1 |
| Cancellation | cancelRequested stops pipeline | P1 |
| Progress tracking | Progress updates at each stage | P1 |
| Rate limiting | Excess jobs delayed | P2 |

---

## 17. Future Improvements

1. **Job Priority**: Premium users get higher-priority jobs
2. **Scheduled Jobs**: Periodic re-research on a cron schedule
3. **Job Dependencies**: Chain research → RAG indexing as dependent jobs
4. **Dead Letter Queue**: Move permanently failed jobs to a DLQ for inspection
5. **Admin Dashboard**: BullMQ Board UI for queue monitoring
6. **Partial Results**: If pipeline fails mid-way, keep partial research data
7. **Worker Health Check**: `/health` endpoint on the worker process
8. **Job Deduplication**: Prevent duplicate research starts via BullMQ job IDs
