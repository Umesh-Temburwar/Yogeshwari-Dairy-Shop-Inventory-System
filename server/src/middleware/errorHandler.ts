import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';
import { sendError } from '../utils/apiResponse.js';
import { ZodError } from 'zod';

export const errorHandler = (
  err: Error | AppError | ZodError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    sendError(res, err.message, err.statusCode, err.code, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    sendError(res, 'Validation error', 400, 'VALIDATION_ERROR', details);
    return;
  }

  console.error('Unhandled Server Error:', err);
  sendError(
    res,
    process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Unknown internal error',
    500,
    'INTERNAL_SERVER_ERROR'
  );
};

