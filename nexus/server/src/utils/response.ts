import { Response } from 'express';

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode = 200
): Response => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const sendError = (
  res: Response,
  message: string,
  statusCode = 500,
  errorCode?: string
): Response => {
  return res.status(statusCode).json({
    success: false,
    error: {
      message,
      code: errorCode,
    },
  });
};
