import { Response } from 'express';

export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { status?: number; meta?: Record<string, unknown> } = {},
): void {
  res.status(options.status ?? 200).json({
    success: true,
    data,
    meta: options.meta ?? {},
  });
}
