import { Router, Request, Response } from 'express';
import { neonAdminRepo } from '../../lib/neonAdminRepository.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

export const auditRouter = Router();

auditRouter.get(
  '/audit/events',
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await neonAdminRepo.getAuditEvents();
    res.status(200).json(result);
  }),
);
