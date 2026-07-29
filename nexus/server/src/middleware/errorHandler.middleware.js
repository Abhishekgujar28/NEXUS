import { logger } from '../core/logger.js';

export const errorHandler = (err, req, res, next) => {
  const status = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  if (status >= 500) logger.error(err.message, { stack: err.stack, requestId: req.requestId });
  res.status(status).json({ success: false, error: { message: err.message, code } });
};
