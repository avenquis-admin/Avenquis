import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { entitlementSnapshotSchema, provisioningCommandSchema } from '../../contracts/platform.js';
import { sendSuccess } from '../../lib/apiResponse.js';
import { phase1Repo } from '../../lib/phase1Repository.js';
import { AppError, asyncHandler } from '../../middleware/errorHandler.js';
import { validate } from '../../middleware/validate.js';
import { dispatchCoreProvisioning } from '../../services/coreProvisioning.js';

export const phase1Router = Router();

const firmParams = { params: z.object({ firmId: z.string().min(1).max(200) }) };
const subscriptionInput = {
  params: firmParams.params,
  body: z.object({
    planId: z.string().nullable().optional(),
    planName: z.string().min(1).max(100),
    status: z.enum(['active', 'trialing', 'past_due', 'suspended', 'canceled']),
    seatCount: z.number().int().positive().max(100000),
    monthlyAmount: z.number().nonnegative(),
    billingInterval: z.enum(['monthly', 'annual']),
    effectiveFrom: z.string().datetime(),
    effectiveUntil: z.string().datetime().nullable().optional(),
  }),
};
const entitlementInputSchema = entitlementSnapshotSchema
  .omit({ firmId: true, entitlementVersion: true })
  .extend({
    entitlementVersion: z.number().int().positive().optional(),
    version: z.number().int().positive().optional(),
  })
  .refine((value) => value.entitlementVersion !== undefined || value.version !== undefined, {
    message: 'entitlementVersion is required',
    path: ['entitlementVersion'],
  });

phase1Router.get('/phase1/plans', asyncHandler(async (req, res) => {
  sendSuccess(res, await phase1Repo.getPlans(), { meta: { correlationId: req.correlationId } });
}));

phase1Router.get('/phase1/firms/:firmId/subscription', validate(firmParams), asyncHandler(async (req, res) => {
  const subscription = await phase1Repo.getSubscription(req.params.firmId);
  if (!subscription) throw new AppError('Subscription not found.', 404, 'RESOURCE_NOT_FOUND');
  sendSuccess(res, subscription, { meta: { correlationId: req.correlationId } });
}));

phase1Router.put('/phase1/firms/:firmId/subscription', validate(subscriptionInput), asyncHandler(async (req, res) => {
  const subscription = await phase1Repo.updateSubscription({
    firmId: req.params.firmId,
    ...req.body,
    effectiveFrom: new Date(req.body.effectiveFrom),
    effectiveUntil: req.body.effectiveUntil ? new Date(req.body.effectiveUntil) : null,
    correlationId: req.correlationId,
    actorId: req.user!.id,
  });
  const provisioning = await dispatchCoreProvisioning({
    contractVersion: '1', eventId: randomUUID(), correlationId: req.correlationId,
    occurredAt: new Date().toISOString(), action: 'subscription.status_changed', firmId: req.params.firmId,
    idempotencyKey: `subscription.status:${subscription.id}:${subscription.version}`,
    payload: { subscriptionId: subscription.id, subscriptionStatus: subscription.status, entitlementVersion: subscription.version },
  }, req.user!.id);
  sendSuccess(res, { subscription, provisioning }, { meta: { correlationId: req.correlationId } });
}));

phase1Router.get('/phase1/firms/:firmId/entitlements', validate(firmParams), asyncHandler(async (req, res) => {
  const entitlements = await phase1Repo.getEntitlements(req.params.firmId);
  if (!entitlements) throw new AppError('Entitlements not found.', 404, 'RESOURCE_NOT_FOUND');
  sendSuccess(res, entitlements, { meta: { correlationId: req.correlationId } });
}));

phase1Router.put('/phase1/firms/:firmId/entitlements', validate({
  params: firmParams.params,
  body: entitlementInputSchema,
}), asyncHandler(async (req, res) => {
  const entitlements = await phase1Repo.replaceEntitlements({
    firmId: req.params.firmId,
    ...req.body,
    version: req.body.entitlementVersion ?? req.body.version,
    effectiveFrom: new Date(req.body.effectiveFrom),
    effectiveUntil: req.body.effectiveUntil ? new Date(req.body.effectiveUntil) : null,
    correlationId: req.correlationId,
    actorId: req.user!.id,
  });
  const provisioning = await dispatchCoreProvisioning({
    contractVersion: '1', eventId: randomUUID(), correlationId: req.correlationId,
    occurredAt: new Date().toISOString(), action: 'entitlements.replace', firmId: req.params.firmId,
    idempotencyKey: `entitlements.replace:${req.params.firmId}:${entitlements.version}`,
    payload: {
      subscriptionId: req.body.subscriptionId, planCode: entitlements.planCode,
      subscriptionStatus: entitlements.subscriptionStatus, entitlementVersion: entitlements.version,
      effectiveFrom: new Date(entitlements.effectiveFrom).toISOString(),
      effectiveUntil: entitlements.effectiveUntil ? new Date(entitlements.effectiveUntil).toISOString() : null,
      modules: entitlements.modules, limits: entitlements.limits,
    },
  }, req.user!.id);
  sendSuccess(res, { entitlements, provisioning }, { meta: { correlationId: req.correlationId } });
}));

phase1Router.post('/phase1/provisioning/commands', validate({ body: provisioningCommandSchema }), asyncHandler(async (req, res) => {
  const command = provisioningCommandSchema.parse(req.body);
  const dispatched = await dispatchCoreProvisioning(command, req.user!.id);
  sendSuccess(res, dispatched.result ?? dispatched.operation, {
    status: dispatched.result ? 200 : dispatched.operation.status === 'QUEUED' ? 202 : 200,
    meta: { correlationId: command.correlationId },
  });
}));
