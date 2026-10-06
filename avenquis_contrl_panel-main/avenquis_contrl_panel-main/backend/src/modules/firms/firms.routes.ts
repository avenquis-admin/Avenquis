import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';

import { neonRepo } from '../../lib/neonRepository.js';

import { validate } from '../../middleware/validate.js';
import {
  AppError,
  asyncHandler,
} from '../../middleware/errorHandler.js';
import { dispatchCoreProvisioning } from '../../services/coreProvisioning.js';

export const firmsRouter = Router();

const statusActionSchema = {
  body: z
    .object({
      reason: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
};

firmsRouter.get(
  '/firms',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      search,
      status,
      plan,
      subscriptionStatus,
      page = '1',
      limit = '50',
    } = req.query;

    const result = await neonRepo.getFirms({
      search:
        typeof search === 'string'
          ? search
          : undefined,

      status:
        typeof status === 'string'
          ? status
          : undefined,

      plan:
        typeof plan === 'string'
          ? plan
          : undefined,

      subscriptionStatus:
        typeof subscriptionStatus === 'string'
          ? subscriptionStatus
          : undefined,

      page: parseInt(page as string, 10) || 1,

      limit: Math.min(
        parseInt(limit as string, 10) || 50,
        200,
      ),
    });

    res.status(200).json(result);
  }),
);

firmsRouter.get(
  '/firms/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const firm = await neonRepo.getFirmById(
      req.params.id,
    );

    if (!firm) {
      throw new AppError(
        `Firm with ID '${req.params.id}' was not found.`,
        404,
        'NOT_FOUND',
      );
    }

    res.status(200).json(firm);
  }),
);

firmsRouter.get(
  '/professional-members',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      search,
      membershipType,
      firmId,
    } = req.query;

    const result =
      await neonRepo.getProfessionalMembers({
        search:
          typeof search === 'string'
            ? search
            : undefined,

        membershipType:
          typeof membershipType === 'string'
            ? membershipType
            : undefined,

        firmId:
          typeof firmId === 'string'
            ? firmId
            : undefined,
      });

    res.status(200).json(result);
  }),
);

firmsRouter.get(
  '/firms/:id/members',
  asyncHandler(async (req: Request, res: Response) => {
    const result =
      await neonRepo.getProfessionalMembers({
        firmId: req.params.id,
      });

    res.status(200).json(result);
  }),
);

/*
 * IMPORTANT:
 * Mutations still use the OLD repository for now.
 * We will migrate them only after reads are verified.
 */

firmsRouter.post(
  '/firms/:id/activate',
  validate(statusActionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const reason =
      req.body?.reason ||
      req.body?.note ||
      'Administrative activation via Control Panel';

    const firm = await neonRepo.activateFirm(req.params.id);

    if (!firm) {
      throw new AppError(
        `Cannot activate: Firm '${req.params.id}' not found.`,
        404,
        'NOT_FOUND',
      );
    }

    const provisioning = await dispatchCoreProvisioning({
      contractVersion: '1',
      eventId: randomUUID(),
      correlationId: req.correlationId,
      occurredAt: new Date().toISOString(),
      action: 'firm.activate',
      firmId: firm.id,
      idempotencyKey: `firm.activate:${firm.id}:${req.correlationId}`,
      payload: { reason },
    }, req.user!.id);

    res.status(200).json({
      firm,
      data: firm,
      provisioning,
      message: `Firm ${firm.name} successfully activated.`,
    });
  }),
);

firmsRouter.post(
  '/firms/:id/suspend',
  validate(statusActionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const reason =
      req.body?.reason ||
      req.body?.note ||
      'Administrative suspension via Control Panel';

    const firm = await neonRepo.suspendFirm(
      req.params.id,
      reason,
    );

    if (!firm) {
      throw new AppError(
        `Cannot suspend: Firm '${req.params.id}' not found.`,
        404,
        'NOT_FOUND',
      );
    }

    const provisioning = await dispatchCoreProvisioning({
      contractVersion: '1',
      eventId: randomUUID(),
      correlationId: req.correlationId,
      occurredAt: new Date().toISOString(),
      action: 'firm.suspend',
      firmId: firm.id,
      idempotencyKey: `firm.suspend:${firm.id}:${req.correlationId}`,
      payload: { reason },
    }, req.user!.id);

    res.status(200).json({
      firm,
      data: firm,
      provisioning,
      message: `Firm ${firm.name} suspended.`,
    });
  }),
);


