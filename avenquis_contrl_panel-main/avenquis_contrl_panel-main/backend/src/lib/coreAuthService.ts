import bcrypt from 'bcryptjs';
import {
  createHash,
  randomBytes,
  randomUUID,
} from 'node:crypto';
import { db } from './database.js';

function hashToken(token: string) {
  return createHash('sha256')
    .update(token)
    .digest('hex');
}

function normalizeUser(row: any) {
  return {
    id: row.id,
    accessRequestId: row.access_request_id,
    firmId: row.firm_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    userType: row.user_type,
    status: row.status,
    lastActive: row.last_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const coreAuthService = {
  async provisionFromApprovedRequest(
    accessRequestId: string,
  ) {
    const requestResult = await db.query(
      `
      SELECT *
      FROM cp_access_requests
      WHERE id = $1
      LIMIT 1
      `,
      [accessRequestId],
    );

    const request = requestResult.rows[0];

    if (!request) {
      throw new Error('ACCESS_REQUEST_NOT_FOUND');
    }

    if (request.status !== 'approved') {
      throw new Error(
        'ACCESS_REQUEST_NOT_APPROVED',
      );
    }

    const userId = `core-${randomUUID()}`;

    const result = await db.query(
      `
      INSERT INTO core_users (
        id,
        access_request_id,
        firm_id,
        full_name,
        email,
        role,
        user_type,
        status,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        lower($5),
        $6,
        $7,
        'pending_password',
        now(),
        now()
      )
      ON CONFLICT (access_request_id)
      DO UPDATE SET
        firm_id = EXCLUDED.firm_id,
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        user_type = EXCLUDED.user_type,
        updated_at = now()
      RETURNING *
      `,
      [
        userId,
        request.id,
        request.assigned_firm_id ?? null,
        request.requester_name,
        request.requester_email,
        request.assigned_role ??
          request.requested_role ??
          'USER',
        request.request_type,
      ],
    );

    const user = result.rows[0];

    await db.query(
      `
      UPDATE core_password_setup_tokens
      SET used_at = now()
      WHERE user_id = $1
        AND used_at IS NULL
      `,
      [user.id],
    );

    const rawToken =
      randomBytes(48).toString('hex');

    const tokenHash =
      hashToken(rawToken);

    await db.query(
      `
      INSERT INTO core_password_setup_tokens (
        id,
        user_id,
        token_hash,
        expires_at,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        now() + interval '24 hours',
        now()
      )
      `,
      [
        `cps-${randomUUID()}`,
        user.id,
        tokenHash,
      ],
    );

    return {
      user: normalizeUser(user),
      passwordSetupToken: rawToken,
      expiresInHours: 24,
    };
  },

  async setPassword(
    rawToken: string,
    password: string,
  ) {
    if (password.length < 12) {
      throw new Error('PASSWORD_TOO_SHORT');
    }

    const tokenHash =
      hashToken(rawToken);

    const tokenResult = await db.query(
      `
      SELECT *
      FROM core_password_setup_tokens
      WHERE token_hash = $1
        AND used_at IS NULL
        AND expires_at > now()
      LIMIT 1
      `,
      [tokenHash],
    );

    const setupToken =
      tokenResult.rows[0];

    if (!setupToken) {
      throw new Error(
        'INVALID_OR_EXPIRED_SETUP_TOKEN',
      );
    }

    const passwordHash =
      await bcrypt.hash(password, 12);

    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const userResult =
        await client.query(
          `
          UPDATE core_users
          SET
            password_hash = $2,
            status = 'active',
            updated_at = now()
          WHERE id = $1
          RETURNING *
          `,
          [
            setupToken.user_id,
            passwordHash,
          ],
        );

      await client.query(
        `
        UPDATE core_password_setup_tokens
        SET used_at = now()
        WHERE id = $1
        `,
        [setupToken.id],
      );

      await client.query('COMMIT');

      return normalizeUser(
        userResult.rows[0],
      );
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async signIn(
    email: string,
    password: string,
  ) {
    const result = await db.query(
      `
      SELECT *
      FROM core_users
      WHERE lower(email) = lower($1)
      LIMIT 1
      `,
      [email],
    );

    const user = result.rows[0];

    if (
      !user ||
      user.status !== 'active' ||
      !user.password_hash
    ) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const valid =
      await bcrypt.compare(
        password,
        user.password_hash,
      );

    if (!valid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const rawToken =
      randomBytes(48).toString('hex');

    const tokenHash =
      hashToken(rawToken);

    await db.query(
      `
      INSERT INTO core_sessions (
        id,
        user_id,
        token_hash,
        expires_at,
        created_at
      )
      VALUES (
        $1,
        $2,
        $3,
        now() + interval '7 days',
        now()
      )
      `,
      [
        `cs-${randomUUID()}`,
        user.id,
        tokenHash,
      ],
    );

    await db.query(
      `
      UPDATE core_users
      SET
        last_active = now(),
        updated_at = now()
      WHERE id = $1
      `,
      [user.id],
    );

    return {
      token: rawToken,
      user: normalizeUser(user),
    };
  },

  async authenticate(rawToken: string) {
    const tokenHash =
      hashToken(rawToken);

    const result = await db.query(
      `
      SELECT u.*
      FROM core_sessions s
      JOIN core_users u
        ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        AND u.status = 'active'
      LIMIT 1
      `,
      [tokenHash],
    );

    return result.rows[0]
      ? normalizeUser(result.rows[0])
      : null;
  },

  async signOut(rawToken: string) {
    const tokenHash =
      hashToken(rawToken);

    await db.query(
      `
      UPDATE core_sessions
      SET revoked_at = now()
      WHERE token_hash = $1
        AND revoked_at IS NULL
      `,
      [tokenHash],
    );
  },
};
