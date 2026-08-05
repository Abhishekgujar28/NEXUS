import { Request, Response, NextFunction } from 'express';
import { researchQueue } from '../workers/researchQueue.js';
import { logger } from '../core/logger.js';
import { emitToProject } from '../socket/socket.server.js';

const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);
const AVG_PIPELINE_TIME_SEC = 180; // 3 minutes average per job
const MAX_RECOMMENDED_BACKLOG = 50;

export interface BackpressureStats {
  waitingCount: number;
  activeCount: number;
  queuePosition: number;
  estimatedWaitTimeSeconds: number;
  backpressureApplied: boolean;
}

export const calculateWaitTime = (waitingCount: number): BackpressureStats => {
  const queuePosition = waitingCount + 1;
  const estimatedWaitTimeSeconds = Math.ceil(
    (queuePosition * AVG_PIPELINE_TIME_SEC) / Math.max(WORKER_CONCURRENCY, 1)
  );
  const backpressureApplied = waitingCount >= 5;

  return {
    waitingCount,
    activeCount: WORKER_CONCURRENCY,
    queuePosition,
    estimatedWaitTimeSeconds,
    backpressureApplied,
  };
};

export const backpressureMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!researchQueue) {
      return next();
    }

    const waitingCount = await researchQueue.getWaitingCount();
    const stats = calculateWaitTime(waitingCount);

    if (waitingCount >= MAX_RECOMMENDED_BACKLOG) {
      logger.warn('Heavy backpressure detected on research queue', { waitingCount });
    }

    const projectId = req.params.id || req.body.projectId;
    if (projectId) {
      try {
        emitToProject(projectId, 'research:queue_status', {
          projectId,
          ...stats,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        // Socket emit error should non-block HTTP flow
      }
    }

    // Attach backpressure stats to request
    (req as any).backpressureStats = stats;

    next();
  } catch (err) {
    logger.error('Backpressure middleware error', { error: (err as Error).message });
    next();
  }
};
