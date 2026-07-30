import http from 'http';
import { config, validateConfig } from './core/config.js';
import { connectDB } from './core/database.js';
import { connectRedis, redis } from './core/redis.js';
import { logger } from './core/logger.js';
import { createApp } from './app.js';
import mongoose from 'mongoose';
import { createSocketServer } from './socket/socket.server.js';

const start = async (): Promise<void> => {
  // Fail fast on missing/weak security configuration before anything runs.
  validateConfig();

  await connectDB();
  await connectRedis();

  const app = createApp();
  const server = http.createServer(app);
  createSocketServer(server);

  server.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port}`);
  });

  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`Received ${signal}, shutting down gracefully`);

    // Stop accepting new connections.
    server.close();

    try {
      await mongoose.connection.close();
    } catch (err) {
      logger.error('Error closing MongoDB', { err: (err as Error).message });
    }

    try {
      redis.disconnect();
    } catch (err) {
      logger.error('Error closing Redis', { err: (err as Error).message });
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
};

start().catch((err) => {
  logger.error('Failed to start server', { err: (err as Error).message });
  process.exit(1);
});
