import { Request, Response } from 'express';
import Project from '../models/Project.js';
import ResearchJob, { RESEARCH_STAGES } from '../models/ResearchJob.js';
import ResearchSource from '../models/ResearchSource.js';
import EvidenceClaim from '../models/EvidenceClaim.js';
import ExistingSolution from '../models/ExistingSolution.js';
import InnovationGap from '../models/InnovationGap.js';
import { AppError, ErrorCodes } from '../core/errors.js';
import {
  listProviderConfiguration,
  runResearchProviders,
} from '../research/providerRegistry.js';
import { enqueueResearchJob } from '../workers/researchQueue.js';

const ensureProjectAccessible = async (projectId: string): Promise<void> => {
  const project = await Project.findById(projectId).select('_id status');
  if (!project || project.status === 'deleted') {
    throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
  }
};

export const startResearch = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  const userId = req.user?._id;
  if (!userId) {
    throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
  }

  await ensureProjectAccessible(projectId);

  const existingRunningJob = await ResearchJob.findOne({
    projectId,
    status: { $in: ['queued', 'running'] },
  }).select('_id status');

  if (existingRunningJob) {
    throw new AppError('A research job is already in progress', 409, ErrorCodes.CONFLICT);
  }

  const job = await ResearchJob.create({
    projectId,
    userId,
    status: 'queued',
    progress: 0,
    stages: RESEARCH_STAGES.map((stage) => ({
      key: stage.key,
      label: stage.label,
      status: 'pending',
    })),
  });

  await Project.findByIdAndUpdate(projectId, { status: 'researching', researchProgress: 0 });

  // Hand the job off to the BullMQ worker. If enqueueing fails (e.g. Redis is
  // unreachable) we must not leave the job stuck in `queued` with no consumer,
  // so we roll back both the job and the project to a failed/idle state and
  // surface a 502 to the caller.
  try {
    await enqueueResearchJob({
      researchJobId: String(job._id),
      projectId: String(projectId),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    job.status = 'failed';
    job.error = `Failed to enqueue research job: ${message}`;
    await job.save();
    await Project.findByIdAndUpdate(projectId, { status: 'failed', researchProgress: 0 });
    throw new AppError(
      'Failed to enqueue research job',
      502,
      ErrorCodes.BAD_GATEWAY
    );
  }

  res.status(202).json({
    success: true,
    data: {
      jobId: String(job._id),
      status: job.status,
    },
  });
};

export const getResearchJob = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  await ensureProjectAccessible(projectId);

  const job = await ResearchJob.findOne({ projectId }).sort({ createdAt: -1 });
  if (!job) {
    throw new AppError('No research job found for this project', 404, ErrorCodes.NOT_FOUND);
  }

  res.json({
    success: true,
    data: job,
  });
};

export const getResearchSources = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  await ensureProjectAccessible(projectId);

  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const skip = (page - 1) * limit;
  const sourceType = typeof req.query.type === 'string' ? req.query.type : undefined;

  const query: Record<string, unknown> = { projectId };
  if (sourceType) {
    query.sourceType = sourceType;
  }

  const [items, total] = await Promise.all([
    ResearchSource.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ResearchSource.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        total,
      },
    },
  });
};

export const getEvidence = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  await ensureProjectAccessible(projectId);

  const evidence = await EvidenceClaim.find({ projectId }).sort({ createdAt: -1 });
  res.json({ success: true, data: evidence });
};

export const getSolutions = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  await ensureProjectAccessible(projectId);

  const solutions = await ExistingSolution.find({ projectId }).sort({ createdAt: -1 });
  res.json({ success: true, data: solutions });
};

export const getGaps = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  await ensureProjectAccessible(projectId);

  const gaps = await InnovationGap.find({ projectId }).sort({ createdAt: -1 });
  res.json({ success: true, data: gaps });
};

export const getArchitecture = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  await ensureProjectAccessible(projectId);

  const project = await Project.findById(projectId).select('problemUnderstanding preferredTech constraints');
  res.json({
    success: true,
    data: {
      architecture: project?.problemUnderstanding?.architecture ?? null,
      recommendations: project?.problemUnderstanding?.recommendations ?? [],
      preferredTech: project?.preferredTech ?? [],
      constraints: project?.constraints ?? null,
    },
  });
};

export const getResources = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  await ensureProjectAccessible(projectId);

  const project = await Project.findById(projectId).select('problemUnderstanding');
  res.json({
    success: true,
    data: {
      resources: project?.problemUnderstanding?.resources ?? [],
    },
  });
};

export const getRoadmap = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  await ensureProjectAccessible(projectId);

  const project = await Project.findById(projectId).select('problemUnderstanding');
  res.json({
    success: true,
    data: {
      roadmap: project?.problemUnderstanding?.roadmap ?? null,
    },
  });
};

/**
 * Synchronous Provider Registry preview. Runs all configured research providers
 * concurrently (with per-provider retry, timeout and failure isolation), merges,
 * deduplicates and normalizes the results, and returns them directly.
 *
 * This is a Postman-testable entry point for the Phase 3 registry — it does NOT
 * persist anything or enqueue a job (that is Phase 4's BullMQ worker).
 */
export const previewResearchSources = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  const userId = req.user?._id;
  if (!userId) {
    throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
  }

  await ensureProjectAccessible(projectId);

  const { query } = req.body as { query: string };
  const { sources, outcomes } = await runResearchProviders(query);

  res.json({
    success: true,
    data: {
      query,
      providers: listProviderConfiguration(),
      outcomes,
      total: sources.length,
      sources,
    },
  });
};

export const stressTestResearch = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  await ensureProjectAccessible(projectId);

  const evidenceCount = await EvidenceClaim.countDocuments({ projectId });
  if (evidenceCount === 0) {
    throw new AppError('No evidence available to stress test', 400, ErrorCodes.VALIDATION_ERROR);
  }

  res.json({
    success: true,
    data: {
      message: 'Stress test request accepted',
      projectId,
    },
  });
};

/**
 * Synchronous AI Agent test endpoint. Executes a single AI Agent with project data
 * and returns its structured output.
 */
export const testAgent = async (req: Request, res: Response): Promise<void> => {
  const projectId = req.params.id;
  const userId = req.user?._id;
  if (!userId) {
    throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
  }

  await ensureProjectAccessible(projectId);

  const project = await Project.findById(projectId);
  if (!project) {
    throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
  }

  const { agent } = req.body as { agent: string };
  const startTime = Date.now();
  let result: unknown;

  if (agent === 'problemUnderstanding') {
    const { ProblemUnderstandingAgent } = await import('../agents/problemUnderstanding.agent.js');
    const agentInstance = new ProblemUnderstandingAgent();
    result = await agentInstance.execute({
      title: project.title,
      description: project.description,
      domain: project.domain ?? undefined,
      projectType: project.projectType ?? undefined,
      targetUsers: project.targetUsers ?? undefined,
      platform: project.platform ?? undefined,
      preferredTech: project.preferredTech ?? undefined,
      constraints: project.constraints ?? undefined,
      teamSize: project.teamSize ?? undefined,
      timeline: project.timeline ?? undefined,
      skillLevel: project.skillLevel ?? undefined,
    });
  } else if (agent === 'queryPlanner') {
    const { ProblemUnderstandingAgent } = await import('../agents/problemUnderstanding.agent.js');
    const { QueryPlannerAgent } = await import('../agents/queryPlanner.agent.js');
    const understandAgent = new ProblemUnderstandingAgent();
    const understanding = await understandAgent.execute({
      title: project.title,
      description: project.description,
      domain: project.domain ?? undefined,
    });
    const plannerAgent = new QueryPlannerAgent();
    result = await plannerAgent.execute({
      title: project.title,
      description: project.description,
      understanding,
    });
  } else {
    throw new AppError(`Test runner for agent [${agent}] is not configured`, 400, ErrorCodes.VALIDATION_ERROR);
  }

  const durationMs = Date.now() - startTime;
  res.json({
    success: true,
    data: {
      agent,
      durationMs,
      output: result,
    },
  });
};
