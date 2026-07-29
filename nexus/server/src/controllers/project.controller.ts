import { Request, Response } from 'express';
import Project from '../models/Project.js';
import ProjectMember from '../models/ProjectMember.js';
import ResearchSource from '../models/ResearchSource.js';
import InnovationGap from '../models/InnovationGap.js';
import ExistingSolution from '../models/ExistingSolution.js';
import ResearchJob from '../models/ResearchJob.js';
import User from '../models/User.js';
import { AppError, ErrorCodes } from '../core/errors.js';

const ensureUserId = (req: Request): string => {
  if (!req.user?._id) {
    throw new AppError('Authentication required', 401, ErrorCodes.UNAUTHORIZED);
  }
  return req.user._id;
};

const assertCanAccessProject = async (projectId: string, userId: string): Promise<void> => {
  const project = await Project.findById(projectId).select('userId status');
  if (!project || project.status === 'deleted') {
    throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
  }

  if (String(project.userId) === userId) {
    return;
  }

  const membership = await ProjectMember.findOne({ projectId: project._id, userId }).select('_id');
  if (!membership) {
    throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
  }
};

export const listProjects = async (req: Request, res: Response): Promise<void> => {
  const userId = ensureUserId(req);
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));
  const skip = (page - 1) * limit;

  const membershipProjectIds = await ProjectMember.find({ userId }).distinct('projectId');
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;

  const query: Record<string, unknown> = {
    $or: [{ userId }, { _id: { $in: membershipProjectIds } }],
    status: status ? status : { $ne: 'deleted' },
  };

  const [projects, total] = await Promise.all([
    Project.find(query).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Project.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: {
      items: projects,
      pagination: {
        page,
        limit,
        total,
      },
    },
  });
};

export const createProject = async (req: Request, res: Response): Promise<void> => {
  const userId = ensureUserId(req);
  const project = await Project.create({
    ...req.body,
    userId,
  });

  await ProjectMember.updateOne(
    { projectId: project._id, userId },
    { $setOnInsert: { role: 'owner', invitedAt: new Date(), joinedAt: new Date() } },
    { upsert: true }
  );

  res.status(201).json({
    success: true,
    data: project,
  });
};

export const getProject = async (req: Request, res: Response): Promise<void> => {
  const userId = ensureUserId(req);
  const { id } = req.params;
  await assertCanAccessProject(id, userId);

  const project = await Project.findById(id);
  if (!project) {
    throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
  }

  res.json({
    success: true,
    data: project,
  });
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
  const userId = ensureUserId(req);
  const { id } = req.params;
  await assertCanAccessProject(id, userId);

  const project = await Project.findByIdAndUpdate(id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!project) {
    throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
  }

  res.json({
    success: true,
    data: project,
  });
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
  const userId = ensureUserId(req);
  const { id } = req.params;
  await assertCanAccessProject(id, userId);

  const project = await Project.findByIdAndUpdate(id, { status: 'deleted' }, { new: true });
  if (!project) {
    throw new AppError('Project not found', 404, ErrorCodes.NOT_FOUND);
  }

  res.json({
    success: true,
    data: { id: project._id, status: project.status },
  });
};

export const getProjectStats = async (req: Request, res: Response): Promise<void> => {
  const userId = ensureUserId(req);
  const { id } = req.params;
  await assertCanAccessProject(id, userId);

  const [sourceCount, gapCount, solutionCount, lastJob] = await Promise.all([
    ResearchSource.countDocuments({ projectId: id }),
    InnovationGap.countDocuments({ projectId: id }),
    ExistingSolution.countDocuments({ projectId: id }),
    ResearchJob.findOne({ projectId: id }).sort({ createdAt: -1 }).select('status progress updatedAt'),
  ]);

  res.json({
    success: true,
    data: {
      sourceCount,
      gapCount,
      solutionCount,
      lastJobStatus: lastJob ? lastJob.status : null,
      lastJobProgress: lastJob ? lastJob.progress : null,
      lastJobUpdatedAt: lastJob ? lastJob.updatedAt : null,
    },
  });
};

export const addProjectMember = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { email, role } = req.body as { email: string; role: 'editor' | 'viewer' };

  const user = await User.findOne({ email }).select('_id');
  if (!user) {
    throw new AppError('User not found for provided email', 404, ErrorCodes.NOT_FOUND);
  }

  const project = await Project.findById(id).select('userId');
  if (project && String(project.userId) === String(user._id)) {
    throw new AppError('User is already the project owner', 409, ErrorCodes.CONFLICT);
  }

  const current = await ProjectMember.findOne({ projectId: id, userId: user._id });
  if (current) {
    throw new AppError('User is already a project member', 409, ErrorCodes.CONFLICT);
  }

  const membership = await ProjectMember.create({
    projectId: id,
    userId: user._id,
    role: role ?? 'viewer',
    invitedAt: new Date(),
    joinedAt: new Date(),
  });

  res.status(201).json({
    success: true,
    data: membership,
  });
};

export const removeProjectMember = async (req: Request, res: Response): Promise<void> => {
  const { id, userId } = req.params;
  const deleted = await ProjectMember.findOneAndDelete({ projectId: id, userId, role: { $ne: 'owner' } });
  if (!deleted) {
    throw new AppError('Project member not found', 404, ErrorCodes.NOT_FOUND);
  }

  res.json({
    success: true,
    data: { userId, removed: true },
  });
};
