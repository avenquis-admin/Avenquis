/**
 * Subscription Plans Routes
 * GET /plans
 */

import { Router, Request, Response } from 'express';
import { platformRepo } from '../../lib/platformRepository.js';

export const plansRouter = Router();

plansRouter.get('/plans', async (req: Request, res: Response) => {
  const data = await platformRepo.getPlans();
  res.status(200).json({ data, total: data.length });
});
