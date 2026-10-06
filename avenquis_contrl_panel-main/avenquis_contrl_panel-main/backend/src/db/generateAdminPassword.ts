import bcrypt from 'bcryptjs';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const rl = readline.createInterface({
  input,
  output,
});

async function main() {
  const password = await rl.question('Enter new admin password: ');

  if (password.length < 12) {
    throw new Error('Password must be at least 12 characters.');
  }

  const confirm = await rl.question('Confirm password: ');

  if (password !== confirm) {
    throw new Error('Passwords do not match.');
  }

  const hash = await bcrypt.hash(password, 12);

  console.log('');
  console.log('PASSWORD HASH:');
  console.log(hash);

  rl.close();
}

main().catch((error) => {
  console.error(error.message);
  rl.close();
  process.exitCode = 1;
});
