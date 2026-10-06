import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from './database.js';

const SESSION_DAYS = 7;

function hashToken(token: string): string {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

export const authService = {
  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const result = await db.query(
      `
      SELECT
        id,
        full_name,
        email,
        role,
        status,
        password_hash
      FROM cp_users
      WHERE lower(email) = lower($1)
      LIMIT 1
      `,
      [email.trim()],
    );

    const user = result.rows[0];

    if (!user || !user.password_hash) {
      return null;
    }

    if (user.status !== 'active') {
      return null;
    }

    const valid = await bcrypt.compare(
      password,
      user.password_hash,
    );

    if (!valid) {
      return null;
    }

    const token =
      crypto.randomBytes(48).toString('hex');

    const tokenHash =
      hashToken(token);

    const expiresAt = new Date(
      Date.now() +
        SESSION_DAYS * 24 * 60 * 60 * 1000,
    );

    const client = await db.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `
        INSERT INTO cp_sessions (
          id,
          user_id,
          token_hash,
          expires_at,
          created_at
        )
        VALUES (
          gen_random_uuid()::text,
          $1,
          $2,
          $3,
          now()
        )
        `,
        [
          user.id,
          tokenHash,
          expiresAt,
        ],
      );

      await client.query(
        `
        INSERT INTO cp_audit_events (
          id,
          actor,
          actor_id,
          action,
          target_type,
          target_id,
          target_name,
          details,
          ip_address,
          user_agent,
          timestamp,
          created_at
        )
        VALUES (
          'aud-' || gen_random_uuid()::text,
          $1,
          $2,
          'AUTH_LOGIN',
          'USER',
          $2,
          $1,
          $3::jsonb,
          $4,
          $5,
          now(),
          now()
        )
        `,
        [
          user.full_name,
          user.id,
          JSON.stringify({
            email: user.email,
            role: user.role,
          }),
          ipAddress ?? null,
          userAgent ?? null,
        ],
      );

      await client.query(
        `
        UPDATE cp_users
        SET
          last_active = now(),
          updated_at = now()
        WHERE id = $1
        `,
        [user.id],
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return {
      token,
      expiresAt,
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  },

  async getUserFromToken(token: string) {
    const tokenHash =
      hashToken(token);

    const result = await db.query(
      `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.role,
        u.status,
        s.id AS session_id,
        s.expires_at
      FROM cp_sessions s
      INNER JOIN cp_users u
        ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        AND u.status = 'active'
      LIMIT 1
      `,
      [tokenHash],
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      role: row.role,
      status: row.status,
      sessionId: row.session_id,
      expiresAt: row.expires_at,
    };
  },

  async logout(
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const tokenHash =
      hashToken(token);

    const client = await db.connect();

    try {
      await client.query('BEGIN');

      const sessionResult =
        await client.query(
          `
          SELECT
            s.id,
            s.user_id,
            u.full_name,
            u.email,
            u.role
          FROM cp_sessions s
          INNER JOIN cp_users u
            ON u.id = s.user_id
          WHERE s.token_hash = $1
            AND s.revoked_at IS NULL
          LIMIT 1
          `,
          [tokenHash],
        );

      const session =
        sessionResult.rows[0];

      await client.query(
        `
        UPDATE cp_sessions
        SET revoked_at = now()
        WHERE token_hash = $1
          AND revoked_at IS NULL
        `,
        [tokenHash],
      );

      if (session) {
        await client.query(
          `
          INSERT INTO cp_audit_events (
            id,
            actor,
            actor_id,
            action,
            target_type,
            target_id,
            target_name,
            details,
            ip_address,
            user_agent,
            timestamp,
            created_at
          )
          VALUES (
            'aud-' || gen_random_uuid()::text,
            $1,
            $2,
            'AUTH_LOGOUT',
            'USER',
            $2,
            $1,
            $3::jsonb,
            $4,
            $5,
            now(),
            now()
          )
          `,
          [
            session.full_name,
            session.user_id,
            JSON.stringify({
              email: session.email,
              role: session.role,
            }),
            ipAddress ?? null,
            userAgent ?? null,
          ],
        );
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async revokeAllUserSessions(
    userId: string,
  ) {
    const result = await db.query(
      `
      UPDATE cp_sessions
      SET revoked_at = now()
      WHERE user_id = $1
        AND revoked_at IS NULL
      `,
      [userId],
    );

    return result.rowCount ?? 0;
  },

  async cleanupExpiredSessions() {
    const result = await db.query(`
      DELETE FROM cp_sessions
      WHERE
        expires_at <= now()
        OR revoked_at IS NOT NULL
    `);

    return result.rowCount ?? 0;
  },
};
