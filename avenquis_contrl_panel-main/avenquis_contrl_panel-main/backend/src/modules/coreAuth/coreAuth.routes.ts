import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import { coreAuthService } from '../../lib/coreAuthService.js';

export const coreAuthRouter = Router();

function getBearerToken(
  req: Request,
) {
  const header =
    req.headers.authorization;

  if (
    !header ||
    !header.startsWith('Bearer ')
  ) {
    return null;
  }

  return header.slice(7).trim();
}

coreAuthRouter.post(
  '/core-auth/provision/:requestId',
  async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const result =
        await coreAuthService
          .provisionFromApprovedRequest(
            req.params.requestId,
          );

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  },
);

coreAuthRouter.post(
  '/core-auth/set-password',
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const {
        token,
        password,
      } = req.body ?? {};

      if (!token || !password) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Token and password are required.',
          },
        });
      }

      const user =
        await coreAuthService.setPassword(
          String(token),
          String(password),
        );

      return res.status(200).json({
        user,
        message:
          'Core password created successfully.',
      });
    } catch (error) {
      const code =
        error instanceof Error
          ? error.message
          : 'UNKNOWN_ERROR';

      return res.status(400).json({
        error: {
          code,
          message:
            code === 'PASSWORD_TOO_SHORT'
              ? 'Password must be at least 12 characters.'
              : 'Password setup token is invalid or expired.',
        },
      });
    }
  },
);

coreAuthRouter.post(
  '/core-auth/sign-in',
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const {
        email,
        password,
      } = req.body ?? {};

      if (!email || !password) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message:
              'Email and password are required.',
          },
        });
      }

      const result =
        await coreAuthService.signIn(
          String(email),
          String(password),
        );

      return res.status(200).json(
        result,
      );
    } catch {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message:
            'Invalid email or password.',
        },
      });
    }
  },
);

coreAuthRouter.get(
  '/core-auth/me',
  async (
    req: Request,
    res: Response,
  ) => {
    const token =
      getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message:
            'Core authentication required.',
        },
      });
    }

    const user =
      await coreAuthService
        .authenticate(token);

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message:
            'Session is invalid or expired.',
        },
      });
    }

    return res.status(200).json({
      user,
    });
  },
);

coreAuthRouter.post(
  '/core-auth/sign-out',
  async (
    req: Request,
    res: Response,
  ) => {
    const token =
      getBearerToken(req);

    if (token) {
      await coreAuthService
        .signOut(token);
    }

    return res.status(200).json({
      success: true,
    });
  },
);
