import { Router, Request, Response } from 'express';

import { neonRepo } from '../../lib/neonRepository.js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import {
  AppError,
  asyncHandler,
} from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { dispatchCoreProvisioning } from '../../services/coreProvisioning.js';

export const usersRouter = Router();

usersRouter.get(
  '/users',
  asyncHandler(async (req: Request, res: Response) => {
    const {
      search,
      role,
      status,
      firmId,
      page = '1',
      limit = '50',
    } = req.query;

    const result = await neonRepo.getUsers({
      search:
        typeof search === 'string'
          ? search
          : undefined,

      role:
        typeof role === 'string'
          ? role
          : undefined,

      status:
        typeof status === 'string'
          ? status
          : undefined,

      firmId:
        typeof firmId === 'string'
          ? firmId
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

usersRouter.get(
  '/users/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await neonRepo.getUserById(
      req.params.id,
    );

    if (!user) {
      throw new AppError(
        `User with ID '${req.params.id}' was not found.`,
        404,
        'NOT_FOUND',
      );
    }

    res.status(200).json({
      data: user,
    });
  }),
);

/*
 * IMPORTANT:
 * Mutations still use the OLD repository temporarily.
 */

usersRouter.post(
  '/users/:id/enable',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await neonRepo.enableUser(
      req.params.id,
    );

    if (!user) {
      throw new AppError(
        `Cannot enable: User '${req.params.id}' not found.`,
        404,
        'NOT_FOUND',
      );
    }

    res.status(200).json({
      data: user,
      message: `User ${user.fullName} enabled.`,
    });
  }),
);

usersRouter.post(
  '/users/:id/reactivate',
  asyncHandler(async (req: Request, res: Response) => {
    const user = await neonRepo.enableUser(
      req.params.id,
    );

    if (!user) {
      throw new AppError(
        `Cannot reactivate: User '${req.params.id}' not found.`,
        404,
        'NOT_FOUND',
      );
    }

    res.status(200).json({
      data: user,
      message: `User ${user.fullName} reactivated.`,
    });
  }),
);

usersRouter.post(
  '/users/:id/disable',
  validate({ body: z.object({ reason: z.string().min(1).max(500).optional() }).optional() }),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await neonRepo.disableUser(
      req.params.id,
    );

    if (!user) {
      throw new AppError(
        `Cannot disable: User '${req.params.id}' not found.`,
        404,
        'NOT_FOUND',
      );
    }

    const reason = req.body?.reason ?? 'Disabled from Control Panel';
    const provisioning = user.firmId
      ? await dispatchCoreProvisioning({
          contractVersion: '1',
          eventId: randomUUID(),
          correlationId: req.correlationId,
          occurredAt: new Date().toISOString(),
          action: 'user.disable',
          firmId: user.firmId,
          idempotencyKey: `user.disable:${user.id}:${req.correlationId}`,
          payload: { platformUserId: user.id, reason },
        }, req.user!.id)
      : null;

    res.status(200).json({
      data: user,
      provisioning,
      message: `User ${user.fullName} disabled.`,
    });
  }),
);

