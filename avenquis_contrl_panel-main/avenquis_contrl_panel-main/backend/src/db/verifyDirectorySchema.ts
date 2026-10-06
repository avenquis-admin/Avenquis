import { db } from '../lib/database.js';

async function main() {
  const firmColumns = await db.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cp_firms'
      AND column_name IN (
        'official_firm_ref',
        'registration_number',
        'address',
        'city',
        'phone',
        'mobile',
        'website',
        'directory_source',
        'directory_source_url',
        'directory_updated_at',
        'directory_imported_at',
        'is_directory_verified'
      )
    ORDER BY column_name
  `);

  const memberColumns = await db.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'cp_professional_members'
      AND column_name IN (
        'membership_number',
        'email',
        'mobile',
        'phone',
        'address',
        'designation',
        'directory_source',
        'directory_source_url',
        'directory_updated_at',
        'directory_imported_at',
        'is_directory_verified'
      )
    ORDER BY column_name
  `);

  const relationTable = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'cp_firm_members'
  `);

  console.log('');
  console.log('Firm directory columns:');
  console.table(firmColumns.rows);

  console.log('');
  console.log('Professional member directory columns:');
  console.table(memberColumns.rows);

  console.log('');
  console.log('Relationship table:');
  console.table(relationTable.rows);
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
