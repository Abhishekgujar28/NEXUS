import { Request, Response } from 'express';
import Project from '../models/Project.js';
import ResearchJob, { RESEARCH_STAGES } from '../models/ResearchJob.js';
import ResearchSource from '../models/ResearchSource.js';
import EvidenceClaim from '../models/EvidenceClaim.js';
import ExistingSolution from '../models/ExistingSolution.js';
import InnovationGap from '../models/InnovationGap.js';
import { AppError, ErrorCodes } from '../core/errors.js';

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
      preferredTech: project?.preferredTech ?? null,
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
