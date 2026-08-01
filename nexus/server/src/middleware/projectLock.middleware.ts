import { Request, Response, NextFunction } from 'express';
import { redis } from '../core/redis.js';
import ResearchJob from '../models/ResearchJob.js';
import { logger } from '../core/logger.js';
import { sendSuccess } from '../utils/response.js';

const LOCK_TTL_MS = 30000;

export const acquireProjectLock = async (
  projectId: string,
  lockId: string,
  ttlMs = LOCK_TTL_MS
): Promise<boolean> => {
  try {
    const key = `lock:project:${projectId}:research`;
    const acquired = await redis.set(key, lockId, 'PX', ttlMs, 'NX');
    return acquired === 'OK';
  } catch (err) {
    logger.warn('Redis lock error, falling back to database check', { error: (err as Error).message });
    return true;
  }
};

export const releaseProjectLock = async (projectId: string, lockId: string): Promise<void> => {
  try {
    const key = `lock:project:${projectId}:research`;
    const current = await redis.get(key);
    if (current === lockId) {
      await redis.del(key);
    }
  } catch (err) {
    logger.warn('Redis lock release error', { error: (err as Error).message });
  }
};

export const projectLockMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const projectId = req.params.id || req.body.projectId;
  if (!projectId) {
    return next();
  }

  // Check database for active job first
  const activeJob = await ResearchJob.findOne({
    projectId,
    status: { $in: ['queued', 'running'] },
  }).sort({ createdAt: -1 });

  if (activeJob) {
    logger.info('Project research execution already in progress', { projectId, jobId: activeJob._id });
    sendSuccess(
      res,
      {
        job: activeJob,
        status: activeJob.status,
        alreadyRunning: true,
      },
      'A research pipeline is currently running for this project',
      200
    );
    return;
  }

  const lockId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const lockAcquired = await acquireProjectLock(projectId, lockId);

  if (!lockAcquired) {
    logger.warn('Concurrent lock acquisition attempt blocked', { projectId });
    const existingJob = await ResearchJob.findOne({ projectId }).sort({ createdAt: -1 });
    sendSuccess(
      res,
      {
        job: existingJob,
        status: existingJob ? existingJob.status : 'running',
        alreadyRunning: true,
      },
      'A research job is already being initialized for this project',
      200
    );
    return;
  }

  // Attach lock info to request for cleanup downstream
  (req as any).projectLockId = lockId;
  (req as any).projectIdForLock = projectId;

  next();
};
