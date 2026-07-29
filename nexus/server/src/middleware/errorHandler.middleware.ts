import { Request, Response, NextFunction } from 'express';
import { logger } from '../core/logger.js';

export const errorHandler = (err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  if (status >= 500) logger.error(err.message, { stack: err.stack });
  res.status(status).json({ success: false, error: { message: err.message, code } });
};
