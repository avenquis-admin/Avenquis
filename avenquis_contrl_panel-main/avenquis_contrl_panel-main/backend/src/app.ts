import { coreAuthRouter } from './modules/coreAuth/coreAuth.routes.js';
import { publicAccessRequestsRouter } from './modules/publicAccessRequests/publicAccessRequests.routes.js';
import express, { Express } from 'express';

import { configureCors } from './middleware/cors.js';
import { correlationIdMiddleware } from './middleware/correlationId.js';

import {
  authMiddleware,
  requireAuth,
  requireSuperAdmin,
} from './middleware/auth.js';

import {
  errorHandler,
  notFoundHandler,
} from './middleware/errorHandler.js';

import {
  securityHeaders,
  apiRateLimiter,
  authRateLimiter,
} from './middleware/security.js';

import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { overviewRouter } from './modules/overview/overview.routes.js';
import { firmsRouter } from './modules/firms/firms.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { accessRequestsRouter } from './modules/accessRequests/accessRequests.routes.js';
import { leadsRouter } from './modules/leads/leads.routes.js';
import { plansRouter } from './modules/plans/plans.routes.js';
import { billingRouter } from './modules/billing/billing.routes.js';
import { supportRouter } from './modules/support/support.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { aiRouter } from './modules/ai/ai.routes.js';
import { auditRouter } from './modules/audit/audit.routes.js';
import { phase1Router } from './modules/phase1/phase1.routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use(securityHeaders);
  app.use(configureCors());

  app.use(
    express.json({
      limit: '1mb',
    }),
  );

  app.use(
    express.urlencoded({
      extended: true,
      limit: '1mb',
    }),
  );

  app.use(correlationIdMiddleware);

  app.use(apiRateLimiter);

  /*
   * PUBLIC ROUTES
   */
  app.use(healthRouter);

  app.use(
    '/auth',
    authRateLimiter,
  );

  app.use(authRouter);

app.use(coreAuthRouter);

app.use('/public', publicAccessRequestsRouter);

  /*
   * PROTECTED CONTROL PANEL
   */
  app.use(authMiddleware);
  app.use(requireAuth);
  app.use(requireSuperAdmin);

  app.use(overviewRouter);
  app.use(firmsRouter);
  app.use(usersRouter);
  app.use(accessRequestsRouter);
  app.use(leadsRouter);
  app.use(plansRouter);
  app.use(billingRouter);
  app.use(supportRouter);
  app.use(notificationsRouter);
  app.use(aiRouter);
  app.use(auditRouter);
  app.use(phase1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

