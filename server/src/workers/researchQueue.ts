import { Queue } from 'bullmq';
import { redis } from '../core/redis.js';
import { config } from '../core/config.js';
import { logger } from '../core/logger.js';

/**
 * Phase 4 — Research job queue.
 *
 * The API's `startResearch` controller persists a `ResearchJob` in the
 * `queued` state and then enqueues a lightweight message here. The standalone
 * research worker (see `research.worker.ts`) consumes these messages, runs the
 * Provider Registry, persists sources, and drives the job/project to a terminal
 * state.
 *
 * The queue name is shared by the producer (API) and the consumer (worker) and
 * must stay in sync between the two.
 */
export const RESEARCH_QUEUE_NAME = 'research';

/**
 * Payload carried by every research job. Kept intentionally small: the worker
 * re-reads the authoritative `ResearchJob`/`Project` documents from Mongo, so
 * we only need the identifiers required to locate them.
 */
export interface ResearchJobPayload {
  researchJobId: string;
  projectId: string;
}

/**
 * Shared producer-side queue. Reuses the application's IORedis connection
 * (already created with `maxRetriesPerRequest: null`, which BullMQ requires).
 */
export const researchQueue = new Queue<ResearchJobPayload>(RESEARCH_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: config.research.jobAttempts,
    backoff: { type: 'exponential', delay: 2000 },
    // Keep a bounded history so the queue can't grow unbounded, while still
    // leaving recent jobs inspectable for debugging.
    removeOnComplete: { age: 3600, count: 100 },
    removeOnFail: { age: 86400, count: 500 },
  },
});

/**
 * Enqueue a research job for asynchronous processing.
 *
 * The BullMQ `jobId` is pinned to the `researchJobId` so a given research job
 * can only ever be enqueued once — a retry of `startResearch` for the same job
 * is idempotent rather than producing duplicate work.
 */
export const enqueueResearchJob = async (payload: ResearchJobPayload): Promise<void> => {
  await researchQueue.add('run-research', payload, {
    jobId: payload.researchJobId,
  });
  logger.info(
    `Enqueued research job ${payload.researchJobId} for project ${payload.projectId}`
  );
};
