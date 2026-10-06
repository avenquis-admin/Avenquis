/**
 * Health Check Endpoint
 * GET /health
 */

import { Router, Request, Response } from 'express';

export const healthRouter = Router();

healthRouter.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'avenquis-control-panel-backend',
  });
});
