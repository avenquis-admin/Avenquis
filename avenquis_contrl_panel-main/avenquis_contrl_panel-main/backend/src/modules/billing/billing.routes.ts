import { Router, Request, Response } from 'express';
import { neonAdminRepo } from '../../lib/neonAdminRepository.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

export const billingRouter = Router();

billingRouter.get(
  '/billing/collections',
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await neonAdminRepo.getCollections();
    res.status(200).json(result);
  }),
);

billingRouter.get(
  '/billing/invoices',
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await neonAdminRepo.getInvoices();
    res.status(200).json(result);
  }),
);

billingRouter.get(
  '/billing/gateways',
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await neonAdminRepo.getGateways();
    res.status(200).json(result);
  }),
);
