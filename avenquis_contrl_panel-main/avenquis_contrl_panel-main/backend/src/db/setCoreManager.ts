import { db } from '../lib/database.js';

async function main() {
  const result = await db.query(
    `
    UPDATE core_users
    SET
      role = 'MANAGER',
      user_type = 'SOLO_PROFESSIONAL',
      updated_at = now()
    WHERE lower(email) = lower($1)
    RETURNING
      id,
      full_name AS "fullName",
      email,
      role,
      user_type AS "userType",
      status,
      firm_id AS "firmId"
    `,
    ['zahirul.ca24@gmail.com'],
  );

  console.log('');
  console.log('CORE USER ROLE UPDATED');
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
