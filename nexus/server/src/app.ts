import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './core/config.js';
import { generalLimiter } from './middleware/rateLimit.middleware.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { AppError, ErrorCodes } from './core/errors.js';
import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/project.routes.js';
import researchRoutes from './routes/research.routes.js';
import copilotRoutes from './routes/copilot.routes.js';

/**
 * Builds and configures the Express application. Kept separate from server
 * startup so it can be imported directly by tests (supertest) without
 * opening a network port or connecting to Mongo/Redis.
 */
export const createApp = (): Application => {
  const app = express();

  // Behind a reverse proxy in production; needed for correct client IPs
  // (rate limiting) and secure cookie handling.
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: config.frontendUrl,
      credentials: true,
    })
  );
  app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(generalLimiter);

  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/projects', projectRoutes);
  app.use('/api/v1/research/:id', researchRoutes);
  app.use('/api/v1/copilot/:id', copilotRoutes);

  app.use((_req, _res, next) => {
    next(new AppError('Route not found', 404, ErrorCodes.NOT_FOUND));
  });

  app.use(errorHandler);

  return app;
};
