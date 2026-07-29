import IORedis from 'ioredis';
import { config } from './config.js';
import { logger } from './logger.js';

export const redis = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redis.on('error', (err) => logger.error('Redis error', { err: err.message }));
redis.on('connect', () => logger.info('Redis connected'));

export const connectRedis = async (): Promise<void> => {
  try {
    await redis.connect();
  } catch (err) {
    logger.warn('Redis unavailable — job queue and caching disabled', { err: (err as Error).message });
  }
};
