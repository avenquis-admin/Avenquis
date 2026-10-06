import crypto from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
    }
  }
}

const SAFE_CORRELATION_ID = /^[A-Za-z0-9._:-]{8,200}$/;

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.get('x-correlation-id');
  req.correlationId = incoming && SAFE_CORRELATION_ID.test(incoming)
    ? incoming
    : crypto.randomUUID();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
}
