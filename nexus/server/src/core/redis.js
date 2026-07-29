import { createClient } from 'redis';
import { config } from './config.js';
import { logger } from './logger.js';

export const redisClient = createClient({ url: config.redisUrl });

redisClient.on('error', err => logger.error('Redis error', { err }));
redisClient.on('connect', () => logger.info('Redis connected'));

export const connectRedis = () => redisClient.connect();
