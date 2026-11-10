import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodType } from 'zod';
import { sendError } from '../utils/apiResponse.js';

export const validateBody = (schema: ZodType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        sendError(res, 'Validation error', 400, 'VALIDATION_ERROR', details);
        return;
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodType) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        sendError(res, 'Invalid query parameters', 400, 'VALIDATION_ERROR', details);
        return;
      }
      next(error);
    }
  };
};

