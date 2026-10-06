/**
 * Overview & Dashboard Telemetry Routes
 * 
 * Endpoints:
 * - GET /overview/metrics?range=24h|7d|30d|ytd
 * - GET /overview/system-status
 * - GET /overview/recent-access-requests
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { platformRepo } from '../../lib/platformRepository.js';
import { validate } from '../../middleware/validate.js';

export const overviewRouter = Router();

const metricsQuerySchema = {
  query: z.object({
    range: z.enum(['24h', '7d', '30d', 'ytd']).optional().default('30d'),
  }),
};

/**
 * GET /overview/metrics?range=24h|7d|30d|ytd
 * Delivers persistent dashboard KPIs and the 8 MetricItem definitions
 */
overviewRouter.get('/overview/metrics', validate(metricsQuerySchema), async (req: Request, res: Response) => {
  const range = (req.query.range as string) || '30d';
  const data = await platformRepo.getMetrics(range);
  res.status(200).json(data);
});

/**
 * GET /overview/system-status
 * Delivers the current backend, Neon PostgreSQL, and authentication status.
 */
overviewRouter.get('/overview/system-status', async (req: Request, res: Response) => {
  const status = await platformRepo.getSystemStatus();
  res.status(200).json(status);
});

/**
 * GET /overview/recent-access-requests
 * Delivers recent access requests snapshot for dashboard
 */
overviewRouter.get('/overview/recent-access-requests', async (req: Request, res: Response) => {
  const result = await platformRepo.getRecentAccessRequests(5);
  res.status(200).json(result);
});
