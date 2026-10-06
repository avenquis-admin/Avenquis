import bcrypt from 'bcryptjs';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { db } from '../lib/database.js';

const rl = readline.createInterface({ input, output });

async function main() {
  const membershipNo = (
    await rl.question('ICAB Membership/Enrolment No: ')
  ).trim();

  const memberResult = await db.query(
    `
    SELECT
      pm.id AS member_id,
      pm.full_name,
      pm.membership_number,
      pm.membership_type,
      f.id AS firm_id,
      f.name AS firm_name
    FROM cp_professional_members pm
    JOIN cp_firm_members fm
      ON fm.member_id = pm.id
      AND fm.is_active = true
    JOIN cp_firms f
      ON f.id = fm.firm_id
    WHERE
      pm.membership_number = $1
      OR pm.enrolment_no = $1
    LIMIT 1
    `,
    [membershipNo],
  );

  const member = memberResult.rows[0];

  if (!member) {
    throw new Error(
      `No ICAB member found for membership number ${membershipNo}.`,
    );
  }

  console.log('');
  console.log('Matched ICAB identity:');
  console.table([{
    name: member.full_name,
    membershipNo: member.membership_number,
    type: member.membership_type,
    firm: member.firm_name,
  }]);

  const email = (
    await rl.question('Core app login email: ')
  ).trim().toLowerCase();

  const password = await rl.question(
    'Password (minimum 12 characters): ',
  );

  const confirm = await rl.question(
    'Confirm password: ',
  );

  if (!email.includes('@')) {
    throw new Error('Invalid email.');
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

  const userId =
    `core-${member.member_id}`;

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
      $1,
      $2,
      $3,
      $4,
      $5,
      'MANAGING_PARTNER',
      'active',
      $6,
      now(),
      false,
      'Practice Management',
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
      full_name AS "fullName",
      email,
      role,
      firm_id AS "firmId",
      firm_name AS "firmName",
      status
    `,
    [
      userId,
      member.firm_id,
      member.firm_name,
      member.full_name,
      email,
      passwordHash,
    ],
  );

  console.log('');
  console.log('CORE APP LOGIN CREATED');
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
