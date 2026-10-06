import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;
const migrationDb = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED || config.database.url,
  ssl: { rejectUnauthorized: false },
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const migrationsDir = path.join(__dirname, 'migrations');

  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  for (const file of files) {
    const filePath = path.join(migrationsDir, file);
    const sql = await fs.readFile(filePath, 'utf8');

    console.log(`Running migration: ${file}`);
    const client = await migrationDb.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`Completed: ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

main()
  .then(async () => {
    console.log('All migrations completed successfully.');
    await migrationDb.end();
  })
  .catch(async (error) => {
    console.error('Migration failed:');
    console.error(error);
    await migrationDb.end();
    process.exitCode = 1;
  });
