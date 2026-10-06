/**
 * Institutional Leads Routes
 * GET /leads
 */

import { Router, Request, Response } from 'express';
import { store } from '../../lib/store.js';

export const leadsRouter = Router();

leadsRouter.get('/leads', (req: Request, res: Response) => {
  res.status(200).json({
    leads: store.leads,
    data: store.leads,
    total: store.leads.length,
  });
});
