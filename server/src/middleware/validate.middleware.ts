import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  // 1. Try wrapped schema structure { params, query, body } (e.g. exportReportSchema)
  let result = schema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  // 2. Try direct body parsing (e.g. registerSchema, createProjectSchema)
  if (!result.success) {
    result = schema.safeParse(req.body);
  }

  // 3. Try flattened merged request parameters
  if (!result.success) {
    result = schema.safeParse({ ...req.params, ...req.query, ...req.body });
  }

  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: result.error.flatten() },
    });
  }

  next();
};
