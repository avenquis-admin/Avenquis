import bcrypt from 'bcryptjs';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { db } from '../lib/database.js';

const rl = readline.createInterface({
  input,
  output,
});

async function main() {
  const firms = await db.query(`
    SELECT id, name, status
    FROM cp_firms
    ORDER BY name
  `);

  console.log('');
  console.log('Available firms:');
  console.table(firms.rows);

  const firmId = (
    await rl.question('Firm ID: ')
  ).trim();

  const firmResult = await db.query(
    `
    SELECT id, name
    FROM cp_firms
    WHERE id = $1
      AND status = 'active'
    LIMIT 1
    `,
    [firmId],
  );

  const firm = firmResult.rows[0];

  if (!firm) {
    throw new Error(
      'Active firm not found for that Firm ID.',
    );
  }

  const email = (
    await rl.question('Login email: ')
  ).trim().toLowerCase();

  const fullName = (
    await rl.question('Full name: ')
  ).trim();

  const password = await rl.question(
    'New password (minimum 12 characters): ',
  );

  const confirm = await rl.question(
    'Confirm password: ',
  );

  if (!email.includes('@')) {
    throw new Error('Invalid email address.');
  }

  if (!fullName) {
    throw new Error('Full name is required.');
  }

  if (password.length < 12) {
    throw new Error(
      'Password must be at least 12 characters.',
    );
  }

  if (password !== confirm) {
    throw new Error(
      'Passwords do not match.',
    );
  }

  const passwordHash =
    await bcrypt.hash(password, 12);

  const result = await db.query(
    `
    INSERT INTO cp_users (
      id,
      firm_id,
      firm_name,
      full_name,
      email,
      role,
      status,
      password_hash,
      last_active,
      mfa_enabled,
      department,
      created_at,
      updated_at
    )
    VALUES (
      'usr-' || gen_random_uuid()::text,
      $1,
      $2,
      $3,
      $4,
      'MANAGING_PARTNER',
      'active',
      $5,
      now(),
      false,
      'Firm Management',
      now(),
      now()
    )
    ON CONFLICT (email) DO UPDATE SET
      firm_id = EXCLUDED.firm_id,
      firm_name = EXCLUDED.firm_name,
      full_name = EXCLUDED.full_name,
      role = 'MANAGING_PARTNER',
      status = 'active',
      password_hash = EXCLUDED.password_hash,
      updated_at = now()
    RETURNING
      id,
      firm_id AS "firmId",
      firm_name AS "firmName",
      full_name AS "fullName",
      email,
      role,
      status
    `,
    [
      firm.id,
      firm.name,
      fullName,
      email,
      passwordHash,
    ],
  );

  console.log('');
  console.log('Main-app firm login ready:');
  console.table(result.rows);
}

main()
  .then(async () => {
    rl.close();
    await db.end();
  })
  .catch(async (error) => {
    console.error(error);
    rl.close();
    await db.end();
    process.exitCode = 1;
  });
