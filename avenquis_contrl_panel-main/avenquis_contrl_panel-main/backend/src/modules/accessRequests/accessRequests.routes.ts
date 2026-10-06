import {
  Router,
  Request,
  Response,
} from 'express';
import { z } from 'zod';

import {
  accessRequestRepo,
} from '../../lib/accessRequestRepository.js';

import {
  validate,
} from '../../middleware/validate.js';

import {
  AppError,
  asyncHandler,
} from '../../middleware/errorHandler.js';

export const accessRequestsRouter =
  Router();

const decisionSchema = {
  body: z
    .object({
      reason: z.string().optional(),
      note: z.string().optional(),
      assignedRole: z.string().optional(),
    })
    .optional(),
};

accessRequestsRouter.get(
  '/access-requests',
  asyncHandler(
    async (
      req: Request,
      res: Response,
    ) => {
      const {
        search,
        status,
        requestType,
        page = '1',
        limit = '50',
      } = req.query;

      const result =
        await accessRequestRepo.getAccessRequests(
          {
            search:
              typeof search === 'string'
                ? search
                : undefined,

            status:
              typeof status === 'string'
                ? status
                : undefined,

            requestType:
              typeof requestType ===
              'string'
                ? requestType
                : undefined,

            page:
              parseInt(
                page as string,
                10,
              ) || 1,

            limit: Math.min(
              parseInt(
                limit as string,
                10,
              ) || 50,
              200,
            ),
          },
        );

      res.status(200).json(result);
    },
  ),
);

accessRequestsRouter.get(
  '/access-requests/:id',
  asyncHandler(
    async (
      req: Request,
      res: Response,
    ) => {
      const request =
        await accessRequestRepo.getAccessRequestById(
          req.params.id,
        );

      if (!request) {
        throw new AppError(
          `Access request with ID '${req.params.id}' was not found.`,
          404,
          'NOT_FOUND',
        );
      }

      res.status(200).json(request);
    },
  ),
);

accessRequestsRouter.post(
  '/access-requests/:id/approve',
  validate(decisionSchema),
  asyncHandler(
    async (
      req: Request,
      res: Response,
    ) => {
      const note =
        req.body?.note ||
        req.body?.reason;

      const approved =
        await accessRequestRepo.approveAccessRequest(
          req.params.id,
          'Platform Super Admin',
          note,
          req.body?.assignedRole,
        );

      if (!approved) {
        throw new AppError(
          `Cannot approve: Access request '${req.params.id}' not found.`,
          404,
          'NOT_FOUND',
        );
      }

      res.status(200).json({
        request: approved,
        data: approved,
        message:
          `Access request for ${approved.firmName} approved.`,
      });
    },
  ),
);

accessRequestsRouter.post(
  '/access-requests/:id/reject',
  validate(decisionSchema),
  asyncHandler(
    async (
      req: Request,
      res: Response,
    ) => {
      const reason =
        req.body?.reason ||
        req.body?.note ||
        'Administrative review: criteria not met';

      const rejected =
        await accessRequestRepo.rejectAccessRequest(
          req.params.id,
          reason,
          'Platform Super Admin',
        );

      if (!rejected) {
        throw new AppError(
          `Cannot reject: Access request '${req.params.id}' not found.`,
          404,
          'NOT_FOUND',
        );
      }

      res.status(200).json({
        request: rejected,
        data: rejected,
        message:
          `Access request for ${rejected.firmName} rejected.`,
      });
    },
  ),
);
