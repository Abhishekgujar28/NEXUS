import { CacheManager } from './CacheManager.js';
import { logger } from '../core/logger.js';

export const invalidateProjectCache = async (projectId: string): Promise<void> => {
  try {
    await CacheManager.delete('architecture', projectId);
    await CacheManager.delete('competitor', projectId);
    await CacheManager.delete('gap_analysis', projectId);
    logger.info(`Invalidated cache keys for project ${projectId}`);
  } catch (err) {
    logger.warn(`Failed to invalidate project cache for ${projectId}`, { error: (err as Error).message });
  }
};
