import { db } from '../lib/database.js';

async function main() {
  const result = await db.query(`
    SELECT
      id,
      full_name,
      email,
      role,
      status,
      password_hash IS NOT NULL AS "hasPassword"
    FROM cp_users
    WHERE role = 'PLATFORM_SUPER_ADMIN'
    ORDER BY updated_at DESC
  `);

  console.table(result.rows);
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
