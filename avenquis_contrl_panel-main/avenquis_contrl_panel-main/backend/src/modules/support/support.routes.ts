/**
 * Support Tickets Routes
 * GET /support/tickets
 * GET /support/tickets/:id
 */

import { Router, Request, Response } from 'express';
import { platformRepo } from '../../lib/platformRepository.js';
import { AppError } from '../../middleware/errorHandler.js';

export const supportRouter = Router();

supportRouter.get('/support/tickets', async (req: Request, res: Response) => {
  const result = await platformRepo.getSupportTickets();
  res.status(200).json(result);
});

supportRouter.get('/support/tickets/:id', async (req: Request, res: Response) => {
  const ticket = await platformRepo.getSupportTicketById(req.params.id);
  if (!ticket) {
    throw new AppError(`Support ticket '${req.params.id}' not found.`, 404, 'NOT_FOUND');
  }
  res.status(200).json(ticket);
});
