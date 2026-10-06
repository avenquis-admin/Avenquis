import { db } from '../lib/database.js';

async function main() {
  await db.query('BEGIN');

  try {
    await db.query(`
      UPDATE cp_users
      SET
        status = 'inactive',
        updated_at = now()
      WHERE email = 'platform.admin@example.test'
        AND id = 'usr-002'
    `);

    await db.query(`
      DELETE FROM cp_sessions
      WHERE
        expires_at <= now()
        OR revoked_at IS NOT NULL
    `);

    const admins = await db.query(`
      SELECT
        id,
        full_name,
        email,
        role,
        status,
        password_hash IS NOT NULL AS "hasPassword"
      FROM cp_users
      WHERE role = 'PLATFORM_SUPER_ADMIN'
      ORDER BY email
    `);

    await db.query('COMMIT');

    console.log('Auth cleanup completed.');
    console.table(admins.rows);
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

main()
  .then(async () => {
    await db.end();
  })
  .catch(async (error) => {
    console.error(error);
    await db.end();
    process.exitCode = 1;
  });
