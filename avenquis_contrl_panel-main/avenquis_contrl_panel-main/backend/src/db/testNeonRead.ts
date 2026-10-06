import { neonRepo } from '../lib/neonRepository.js';
import { db } from '../lib/database.js';

async function main() {
  const firmsResult = await neonRepo.getFirms();
  const usersResult = await neonRepo.getUsers();
  const professionalMembersResult =
    await neonRepo.getProfessionalMembers();

  console.log('Neon read test successful.');
  console.log('');

  console.log('Firms:', firmsResult.data.length);
  console.log('Users:', usersResult.data.length);
  console.log(
    'Professional members:',
    professionalMembersResult.data.length
  );

  console.log('');
  console.log('First firm:');
  console.log(firmsResult.data[0]);

  console.log('');
  console.log('First user:');
  console.log(usersResult.data[0]);
}

main()
  .then(async () => {
    await db.end();
  })
  .catch(async (error) => {
    console.error('Neon read test failed:');
    console.error(error);

    await db.end();
    process.exitCode = 1;
  });
