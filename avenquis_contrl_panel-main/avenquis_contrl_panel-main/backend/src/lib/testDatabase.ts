import { checkDatabaseConnection, db } from './database.js';

async function main() {
  try {
    await checkDatabaseConnection();
  } catch (error) {
    console.error('Neon connection failed:');
    console.error(error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main();