import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async Express handler/middleware so any thrown error or rejected
 * promise is forwarded to the central error handler (Express 4 does not do
 * this automatically).
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => unknown): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
