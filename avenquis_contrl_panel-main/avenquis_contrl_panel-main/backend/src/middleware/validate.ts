/**
 * Avenquis Control Panel Backend - Request Validation Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler.js';

export function validate(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }
      if (schema.query) {
        req.query = schema.query.parse(req.query) as typeof req.query;
      }
      if (schema.params) {
        req.params = schema.params.parse(req.params) as typeof req.params;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issuesList = error.issues || (error as any).errors || [];
        const issues = issuesList.map((e: any) => `${e.path?.join('.') || 'root'}: ${e.message}`).join(', ');
        next(new AppError(`Validation failed: ${issues}`, 400, 'VALIDATION_ERROR'));
      } else {
        next(error);
      }
    }
  };
}
