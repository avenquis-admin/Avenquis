import { Router, Request, Response } from 'express';
import { neonAdminRepo } from '../../lib/neonAdminRepository.js';
import {
  AppError,
  asyncHandler,
} from '../../middleware/errorHandler.js';

export const notificationsRouter = Router();

notificationsRouter.get(
  '/notifications',
  asyncHandler(async (_req: Request, res: Response) => {
    const result = await neonAdminRepo.getNotifications();
    res.status(200).json(result);
  }),
);

notificationsRouter.post(
  '/notifications/mark-all-read',
  asyncHandler(async (_req: Request, res: Response) => {
    const count =
      await neonAdminRepo.markAllNotificationsRead();

    res.status(200).json({
      success: true,
      count,
      message: `Marked ${count} notifications as read`,
    });
  }),
);

notificationsRouter.post(
  '/notifications/:id/read',
  asyncHandler(async (req: Request, res: Response) => {
    const notification =
      await neonAdminRepo.markNotificationRead(
        req.params.id,
      );

    if (!notification) {
      throw new AppError(
        `Notification '${req.params.id}' not found.`,
        404,
        'NOT_FOUND',
      );
    }

    res.status(200).json({
      notification,
      data: notification,
      message: 'Notification marked as read',
    });
  }),
);
