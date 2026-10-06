import { coreAuthService } from '../lib/coreAuthService.js';
import { db } from '../lib/database.js';

const requestId =
  process.argv[2];

if (!requestId) {
  throw new Error(
    'Usage: npx tsx src/db/provisionCoreUser.ts <request-id>',
  );
}

async function main() {
  const result =
    await coreAuthService
      .provisionFromApprovedRequest(
        requestId,
      );

  console.log('');
  console.log('CORE USER PROVISIONED');
  console.log({
    user: result.user,
    passwordSetupToken:
      result.passwordSetupToken,
    expiresInHours:
      result.expiresInHours,
  });
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
