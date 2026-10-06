import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

if (!config.database.url) {
  throw new Error(
    'DATABASE_URL is missing. Add your Neon PostgreSQL connection string to backend/.env'
  );
}

export const db = new Pool({
  connectionString: config.database.url,
  ssl: {
    rejectUnauthorized: false,
  },
});

export async function checkDatabaseConnection(): Promise<void> {
  const client = await db.connect();

  try {
    const result = await client.query<{
      database_name: string;
      current_time: Date;
    }>(`
      SELECT
        current_database() AS database_name,
        NOW() AS current_time
    `);

    console.log('Neon PostgreSQL connected successfully');
    console.log('Database:', result.rows[0]?.database_name);
    console.log('Server time:', result.rows[0]?.current_time);
  } finally {
    client.release();
  }
}