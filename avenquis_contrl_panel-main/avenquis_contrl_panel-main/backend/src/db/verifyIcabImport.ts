import { db } from '../lib/database.js';

async function main() {
  const firms = await db.query(`
    SELECT COUNT(*)::int AS count
    FROM cp_firms
    WHERE is_directory_verified = true
  `);

  const members = await db.query(`
    SELECT COUNT(*)::int AS count
    FROM cp_professional_members
    WHERE is_directory_verified = true
  `);

  const relations = await db.query(`
    SELECT COUNT(*)::int AS count
    FROM cp_firm_members
    WHERE is_active = true
  `);

  const samples = await db.query(`
    SELECT
      f.name AS firm,
      f.city,
      f.contact_email AS email,
      m.full_name AS member,
      m.membership_type AS type,
      fm.relationship_type AS relationship
    FROM cp_firm_members fm
    JOIN cp_firms f
      ON f.id = fm.firm_id
    JOIN cp_professional_members m
      ON m.id = fm.member_id
    WHERE f.is_directory_verified = true
    ORDER BY f.name, m.full_name
    LIMIT 20
  `);

  console.log('');
  console.log('ICAB IMPORT VERIFY');
  console.log({
    verifiedFirms:
      firms.rows[0].count,
    verifiedMembers:
      members.rows[0].count,
    relationships:
      relations.rows[0].count,
  });

  console.log('');
  console.table(samples.rows);
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
