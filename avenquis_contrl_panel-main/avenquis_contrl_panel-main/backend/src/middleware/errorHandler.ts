/**
 * Avenquis Control Panel Backend - Standardized Error Handling
 * 
 * Enforces strict API contract:
 * {
 *   "error": {
 *     "code": "SOME_CODE",
 *     "message": "Human readable message"
 *   }
 * }
 */

import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_SERVER_ERROR') {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.originalUrl} was not found on this server.`,
    },
    meta: { correlationId: req.correlationId },
  });
}

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const statusCode = (err as AppError).statusCode || 500;
  const code = (err as AppError).code || (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'BAD_REQUEST');
  const message = err.message || 'An unexpected internal error occurred.';

  // Never expose raw stack traces to the client
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
    meta: { correlationId: req.correlationId },
  });
}

export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
