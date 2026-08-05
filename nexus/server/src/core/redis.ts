import IORedis from 'ioredis';
import { config } from './config.js';
import { logger } from './logger.js';

export const redis = new IORedis(config.redis.url, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

redis.on('error', (err: Error) => {
  logger.error('Redis error', {
    message: err.message,
    name: err.name,
    stack: err.stack,
    host: config.redis.host,
    port: config.redis.port,
  });
});

redis.on('connect', () => {
  logger.info(`Redis connected (${config.redis.host}:${config.redis.port})`);
});

export const connectRedis = async (): Promise<void> => {
  if (['connecting', 'connect', 'ready'].includes(redis.status)) {
    return;
  }
  try {
    await redis.connect();
  } catch (err) {
    const error = err as Error;
    logger.warn('Redis unavailable — job queue and caching disabled', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      host: config.redis.host,
      port: config.redis.port,
    });
  }
};
