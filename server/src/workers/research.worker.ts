import IORedis from 'ioredis';
import { Worker, type Job } from 'bullmq';
import mongoose from 'mongoose';
import { config, validateConfig } from '../core/config.js';
import { connectDB } from '../core/database.js';
import { logger } from '../core/logger.js';
import Project from '../models/Project.js';
import ResearchJob from '../models/ResearchJob.js';
import ResearchSource from '../models/ResearchSource.js';
import { runResearchProviders } from '../research/providerRegistry.js';
import type { NormalizedSource } from '../research/providers/ResearchProvider.js';
import { RESEARCH_QUEUE_NAME, type ResearchJobPayload } from './researchQueue.js';
import { ResearchOrchestrator } from '../orchestrator/research.orchestrator.js';

/**
 * Phase 4 — Research worker (standalone process).
 *
 * Consumes `research` queue messages produced by the API's `startResearch`
 * controller, runs the Provider Registry, persists the returned sources, and
 * drives the `ResearchJob` + `Project` to a terminal state.
 *
 * The AI-analysis stages (analyze, solutions, gaps, stress, architecture,
 * roadmap) are not implemented yet — the agents/orchestrator are a later phase.
 * Those stages are explicitly marked `skipped` so the job can still complete
 * cleanly and the pipeline is honest about what actually ran.
 */

/** Stage fed by the Provider Registry. */
const SEARCH_STAGES = ['search'] as const;

/** Stages that depend on the not-yet-built AI agents; skipped for now. */
const AI_STAGES = ['analyze', 'solutions', 'gaps', 'stress', 'architecture', 'roadmap'] as const;

type JobDoc = InstanceType<typeof ResearchJob>;

/**
 * Mutate a single stage on the in-memory job document. Callers persist with a
 * single `job.save()` after a batch of stage updates to minimise round-trips.
 */
const setStage = (
  job: JobDoc,
  key: string,
  status: 'running' | 'completed' | 'failed' | 'skipped',
  note?: string
): void => {
  const stage = job.stages.find((s) => s.key === key);
  if (!stage) return;
  stage.status = status;
  if (status === 'running') stage.startedAt = new Date();
  if (status === 'completed' || status === 'failed' || status === 'skipped') {
    stage.completedAt = new Date();
  }
  if (note) stage.note = note;
};

/**
 * Build the provider search query from the project. `startResearch` carries no
 * query of its own (only a `force` flag), so the worker derives one from the
 * project's title and description — the authoritative statement of intent.
 */
const buildQuery = (title?: string, description?: string): string => {
  const parts = [title?.trim(), description?.trim()].filter(Boolean) as string[];
  return parts.join('. ').slice(0, 500);
};

/**
 * Map a normalized provider source onto the persisted ResearchSource shape.
 * The two interfaces are aligned 1:1; this adds the ownership identifiers the
 * provider layer has no knowledge of.
 */
const toSourceDoc = (
  source: NormalizedSource,
  projectId: string,
  researchJobId: string
) => ({
  projectId,
  researchJobId,
  provider: source.provider,
  sourceType: source.sourceType,
  title: source.title,
  url: source.url,
  authors: source.authors,
  publishedAt: source.publishedAt ?? undefined,
  snippet: source.snippet,
  content: source.content,
  query: source.query,
  metadata: source.metadata,
  relevanceScore: source.relevanceScore,
  credibilityScore: source.credibilityScore,
});
/**
 * Process a single research job end to end. Any throw propagates to BullMQ,
 * which applies the configured retry/backoff; the `failed` event handler marks
 * the job and project as failed once retries are exhausted.
 */
const processResearchJob = async (job: Job<ResearchJobPayload>): Promise<void> => {
  const { researchJobId, projectId } = job.data;

  const researchJob = await ResearchJob.findById(researchJobId);
  if (!researchJob) {
    logger.warn(`ResearchJob ${researchJobId} not found; discarding queue message`);
    return;
  }

  if (['completed', 'cancelled'].includes(researchJob.status)) {
    logger.info(`ResearchJob ${researchJobId} already ${researchJob.status}; skipping`);
    return;
  }

  const project = await Project.findById(projectId).select('_id status');
  if (!project || project.status === 'deleted') {
    throw new Error(`Project ${projectId} not found or deleted`);
  }

  // Instantiate and run the full multi-agent ResearchOrchestrator
  const orchestrator = new ResearchOrchestrator(projectId, researchJobId);
  await orchestrator.run();
};
/**
 * Mark a job (and its project) failed once BullMQ has exhausted all retry
 * attempts. Kept defensive: a failure while recording the failure must not
 * crash the worker.
 */
const markJobFailed = async (researchJobId: string, message: string): Promise<void> => {
  try {
    const researchJob = await ResearchJob.findById(researchJobId);
    if (!researchJob || ['completed', 'cancelled'].includes(researchJob.status)) return;

    for (const key of SEARCH_STAGES) {
      const stage = researchJob.stages.find((s) => s.key === key);
      if (stage && stage.status === 'running') setStage(researchJob, key, 'failed');
    }
    researchJob.status = 'failed';
    researchJob.error = message;
    researchJob.completedAt = new Date();
    await researchJob.save();

    await Project.findByIdAndUpdate(researchJob.projectId, { status: 'failed' });
  } catch (err) {
    logger.error(`Failed to record failure for job ${researchJobId}`, {
      err: (err as Error).message,
    });
  }
};

const bootstrap = async (): Promise<void> => {
  validateConfig();
  await connectDB();

  // BullMQ requires a dedicated connection with `maxRetriesPerRequest: null`.
  // The worker owns its own connection rather than sharing the API's.
  const connection = new IORedis(config.redis.url, { maxRetriesPerRequest: null });
  connection.on('error', (err: Error) => {
    logger.error('Worker Redis error', {
      message: err.message,
      name: err.name,
      stack: err.stack,
      host: config.redis.host,
      port: config.redis.port,
    });
  });

  const worker = new Worker<ResearchJobPayload>(RESEARCH_QUEUE_NAME, processResearchJob, {
    connection,
    concurrency: config.research.workerConcurrency,
  });

  worker.on('completed', (job) => {
    logger.info(`Worker finished job ${job.id}`);
  });

  worker.on('failed', async (job, err) => {
    logger.error(`Worker job ${job?.id} failed: ${err.message}`);
    // Only mark the domain records failed once all attempts are exhausted;
    // intermediate attempts should leave the job in `running` for the retry.
    if (job && job.attemptsMade >= (job.opts.attempts ?? config.research.jobAttempts)) {
      await markJobFailed(job.data.researchJobId, err.message);
    }
  });

  worker.on('error', (err) => {
    logger.error('Worker error', { err: err.message });
  });

  logger.info(
    `Research worker started (queue="${RESEARCH_QUEUE_NAME}", ` +
    `concurrency=${config.research.workerConcurrency})`
  );

  // Graceful shutdown: stop accepting new jobs, finish in-flight work, then
  // release Redis and Mongo connections.
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down research worker`);
    try {
      await worker.close();
      await connection.quit();
      await mongoose.disconnect();
    } catch (err) {
      logger.error('Error during worker shutdown', { err: (err as Error).message });
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
};

bootstrap().catch((err) => {
  logger.error('Research worker failed to start', { err: (err as Error).message });
  process.exit(1);
});
