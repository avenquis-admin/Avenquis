import { db } from '../lib/database.js';

async function main() {
  const result = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE 'cp_%'
    ORDER BY table_name
  `);

  console.table(result.rows);

  await db.end();
}

main().catch(async (error) => {
  console.error(error);
  await db.end();
  process.exitCode = 1;
});