import {
  Request,
  Response,
  NextFunction,
} from 'express';

import { authService } from '../lib/authService.js';
import { AdminUser } from '../types/index.js';
import { AppError } from './errorHandler.js';

declare global {
  namespace Express {
    interface Request {
      user?: AdminUser;
    }
  }
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');

  if (
    scheme?.toLowerCase() !== 'bearer' ||
    !token
  ) {
    return null;
  }

  return token;
}

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = getBearerToken(req);

    if (!token) {
      next();
      return;
    }

    const user =
      await authService.getUserFromToken(token);

    if (!user) {
      next();
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      lastLoginAt: new Date().toISOString(),
      sessionExpiresAt:
        new Date(
          user.expiresAt,
        ).toISOString(),
      mfaEnabled: false,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(
      new AppError(
        'Authentication required. Session is invalid or expired.',
        401,
        'UNAUTHORIZED',
      ),
    );
    return;
  }

  next();
}

export function requireSuperAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    next(
      new AppError(
        'Authentication required.',
        401,
        'UNAUTHORIZED',
      ),
    );
    return;
  }

  if (
    req.user.role !==
    'PLATFORM_SUPER_ADMIN'
  ) {
    next(
      new AppError(
        'Administrative privilege required.',
        403,
        'FORBIDDEN',
      ),
    );
    return;
  }

  next();
}
