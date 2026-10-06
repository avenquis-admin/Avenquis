import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { db } from '../lib/database.js';

const rl = readline.createInterface({
  input,
  output,
});

async function main() {
  const email = (
    await rl.question('Admin email: ')
  ).trim().toLowerCase();

  const fullName = (
    await rl.question('Admin full name: ')
  ).trim();

  const passwordHash = (
    await rl.question('Paste bcrypt password hash: ')
  ).trim();

  if (!email.includes('@')) {
    throw new Error('Invalid email address.');
  }

  if (!fullName) {
    throw new Error('Full name is required.');
  }

  if (!passwordHash.startsWith('$2')) {
    throw new Error('Invalid bcrypt hash.');
  }

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
      'usr-platform-super-admin',
      NULL,
      'Platform Administration',
      $1,
      $2,
      'PLATFORM_SUPER_ADMIN',
      'active',
      $3,
      now(),
      false,
      'Platform Administration',
      now(),
      now()
    )
    ON CONFLICT (email) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = 'PLATFORM_SUPER_ADMIN',
      status = 'active',
      password_hash = EXCLUDED.password_hash,
      updated_at = now()
    RETURNING
      id,
      full_name,
      email,
      role,
      status
    `,
    [
      fullName,
      email,
      passwordHash,
    ],
  );

  console.log('');
  console.log('Admin account ready:');
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
