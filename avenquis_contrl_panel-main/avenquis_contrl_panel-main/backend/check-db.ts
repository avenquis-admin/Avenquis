import pg from "pg";

const { Client } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing");
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  console.log("\n=== PUBLIC TABLES ===");
  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.table(tables.rows);

  console.log("\n=== CP TABLES ===");
  const cpTables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name LIKE 'cp_%'
    ORDER BY table_name
  `);
  console.table(cpTables.rows);

  console.log("\n=== CP_USERS EXISTS? ===");
  const exists = await client.query(`
    SELECT to_regclass('public.cp_users') AS cp_users
  `);
  console.table(exists.rows);

  if (exists.rows[0]?.cp_users) {
    console.log("\n=== CONTROL PANEL USERS ===");
    const users = await client.query(`
      SELECT id, full_name, email, role, status, updated_at
      FROM cp_users
      ORDER BY updated_at DESC
      LIMIT 20
    `);
    console.table(users.rows);
  }

  await client.end();
}

main().catch((err) => {
  console.error("\nDB CHECK FAILED:");
  console.error(err);
  process.exit(1);
});
