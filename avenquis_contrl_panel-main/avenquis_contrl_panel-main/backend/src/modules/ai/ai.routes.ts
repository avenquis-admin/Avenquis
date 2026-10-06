/**
 * AI Governance & Approvals Routes & Control Assistant
 * GET /ai/approvals
 * GET /ai/automations
 * GET /ai/runs
 * POST /ai/assistant/chat
 * POST /ai/assistant/execute-action
 */

import { Router, Request, Response } from 'express';
import { platformRepo } from '../../lib/platformRepository.js';
import { assistantService } from './assistant.service.js';
import { requireAuth, requireSuperAdmin } from '../../middleware/auth.js';
import { AppError, asyncHandler } from '../../middleware/errorHandler.js';

export const aiRouter = Router();

aiRouter.get('/ai/approvals', asyncHandler(async (req: Request, res: Response) => {
  const result = await platformRepo.getAiApprovals();
  res.status(200).json(result);
}));

aiRouter.get('/ai/automations', asyncHandler(async (req: Request, res: Response) => {
  const result = await platformRepo.getAiAutomations();
  res.status(200).json(result);
}));

aiRouter.get('/ai/runs', asyncHandler(async (req: Request, res: Response) => {
  const result = await platformRepo.getAiRuns();
  res.status(200).json(result);
}));

// Avenquis Control Assistant Chat Endpoint
aiRouter.post('/ai/assistant/chat', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { message, history, contextScope } = req.body;
  if (!message || typeof message !== 'string') {
    throw new AppError('Message string is required.', 400, 'INVALID_INPUT');
  }

  const response = await assistantService.handleInquiry({
    message,
    history,
    contextScope,
    actor: req.user?.fullName || req.user?.email || 'Platform Super Admin',
  });

  res.status(200).json(response);
}));

// Alias for convenience /ai/chat
aiRouter.post('/ai/chat', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const { message, history, contextScope } = req.body;
  if (!message || typeof message !== 'string') {
    throw new AppError('Message string is required.', 400, 'INVALID_INPUT');
  }

  const response = await assistantService.handleInquiry({
    message,
    history,
    contextScope,
    actor: req.user?.fullName || req.user?.email || 'Platform Super Admin',
  });

  res.status(200).json(response);
}));

// Sensitive Action Execution (AI Suggests -> Admin Confirms -> Backend Executes)
aiRouter.post('/ai/assistant/execute-action', requireAuth, requireSuperAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { actionType, targetId, targetName, confirmation, auditReason, payload } = req.body;

  if (!actionType || !targetId || confirmation !== true) {
    throw new AppError(
      'actionType, targetId, and explicit confirmation=true are mandatory to execute administrative actions.',
      400,
      'CONFIRMATION_REQUIRED'
    );
  }

  const result = await assistantService.executeAction({
    actionType,
    targetId,
    targetName: targetName || targetId,
    confirmation,
    auditReason,
    payload,
    actor: req.user?.fullName || req.user?.email || 'Platform Super Admin',
  });

  res.status(200).json(result);
}));
