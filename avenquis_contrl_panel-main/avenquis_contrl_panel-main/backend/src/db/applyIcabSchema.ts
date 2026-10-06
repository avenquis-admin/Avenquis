import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../lib/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const migrationPath = path.resolve(
    __dirname,
    './migrations/003_icab_directory_schema.sql',
  );

  console.log('Applying migration:');
  console.log(migrationPath);

  const sql = (await fs.readFile(migrationPath, 'utf8')).replace(/^\uFEFF/, '');

  await db.query(sql);

  console.log('');
  console.log(
    '003_icab_directory_schema.sql applied successfully.',
  );

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

  const relation = await db.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'cp_firm_members'
    ) AS exists
  `);

  console.log('');
  console.log('cp_firms ICAB columns:');
  console.table(firmColumns.rows);

  console.log('');
  console.log(
    'cp_firm_members exists:',
    relation.rows[0].exists,
  );
}

main()
  .then(async () => {
    await db.end();
  })
  .catch(async (error) => {
    console.error('');
    console.error('Migration failed:');
    console.error(error);
    await db.end();
    process.exitCode = 1;
  });
