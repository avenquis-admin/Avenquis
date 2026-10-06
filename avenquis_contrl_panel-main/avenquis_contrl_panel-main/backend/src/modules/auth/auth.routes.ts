import {
  Router,
  Request,
  Response,
} from 'express';
import { z } from 'zod';

import { authService } from '../../lib/authService.js';
import { validate } from '../../middleware/validate.js';
import { AppError } from '../../middleware/errorHandler.js';

export const authRouter = Router();

const signInSchema = {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    rememberMe: z.boolean().optional(),
  }),
};

function getBearerToken(
  req: Request,
): string | null {
  const header =
    req.headers.authorization;

  if (!header) {
    return null;
  }

  const [scheme, token] =
    header.split(' ');

  if (
    scheme?.toLowerCase() !== 'bearer' ||
    !token
  ) {
    return null;
  }

  return token;
}

function getClientIp(
  req: Request,
): string | undefined {
  const forwarded =
    req.headers['x-forwarded-for'];

  if (
    typeof forwarded === 'string'
  ) {
    return forwarded
      .split(',')[0]
      .trim();
  }

  if (
    Array.isArray(forwarded) &&
    forwarded[0]
  ) {
    return forwarded[0];
  }

  return (
    req.socket.remoteAddress ||
    undefined
  );
}

authRouter.post(
  '/auth/sign-in',
  validate(signInSchema),
  async (
    req: Request,
    res: Response,
    next,
  ) => {
    try {
      const {
        email,
        password,
      } = req.body;

      const session =
        await authService.login(
          email,
          password,
          getClientIp(req),
          req.headers['user-agent'],
        );

      if (!session) {
        throw new AppError(
          'Invalid email or password.',
          401,
          'UNAUTHORIZED',
        );
      }

      res.status(200).json({
        user: session.user,
        token: session.token,
        expiresAt:
          session.expiresAt,
        message:
          'Authenticated successfully',
      });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.get(
  '/auth/me',
  async (
    req: Request,
    res: Response,
    next,
  ) => {
    try {
      const token =
        getBearerToken(req);

      if (!token) {
        throw new AppError(
          'Authentication required.',
          401,
          'UNAUTHORIZED',
        );
      }

      const user =
        await authService.getUserFromToken(
          token,
        );

      if (!user) {
        throw new AppError(
          'Session is invalid or expired.',
          401,
          'UNAUTHORIZED',
        );
      }

      res.status(200).json({
        user,
      });
    } catch (error) {
      next(error);
    }
  },
);

authRouter.post(
  '/auth/sign-out',
  async (
    req: Request,
    res: Response,
    next,
  ) => {
    try {
      const token =
        getBearerToken(req);

      if (token) {
        await authService.logout(
          token,
          getClientIp(req),
          req.headers['user-agent'],
        );
      }

      res.status(200).json({
        status: 'ok',
        message:
          'Signed out successfully',
      });
    } catch (error) {
      next(error);
    }
  },
);
