import { db } from '../lib/database.js';

async function main() {
  const result = await db.query(`
    SELECT
      pm.full_name AS "memberName",
      pm.membership_number AS "membershipNo",
      pm.membership_type AS "membershipType",
      f.name AS "firmName",
      f.address AS "firmAddress",
      pm.mobile,
      pm.email
    FROM cp_professional_members pm
    JOIN cp_firm_members fm
      ON fm.member_id = pm.id
    JOIN cp_firms f
      ON f.id = fm.firm_id
    WHERE pm.membership_number IN ('1842', '527')
    ORDER BY pm.membership_number
  `);

  console.log('');
  console.log('ICAB SAMPLE VERIFY');
  console.table(result.rows);

  if (result.rows.length !== 2) {
    throw new Error(
      `Expected 2 sample records, found ${result.rows.length}.`,
    );
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
