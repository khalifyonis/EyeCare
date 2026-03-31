import 'dotenv/config';
import prisma from '../src/lib/prisma.js';
import bcrypt from 'bcrypt';

function parseArgs(argv) {
  const args = { yes: false };

  for (const token of argv) {
    if (token === '--yes') args.yes = true;
    if (token.startsWith('--username=')) args.username = token.slice('--username='.length).trim();
    if (token.startsWith('--password=')) args.password = token.slice('--password='.length);
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.username || !args.password) {
    console.error('Usage: node scripts/reset-user-password.mjs --username=<username> --password=<newPassword> --yes');
    process.exit(1);
  }

  if (!args.yes) {
    console.error('Refusing to update password without --yes confirmation.');
    process.exit(1);
  }

  if (args.password.length < 6) {
    console.error('Password must be at least 6 characters long.');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { username: args.username },
    select: { id: true, username: true, email: true },
  });

  if (!user) {
    console.error(`User not found: ${args.username}`);
    process.exit(1);
  }

  const hashed = await bcrypt.hash(args.password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashed },
  });

  console.log(
    JSON.stringify(
      {
        message: 'Password updated successfully',
        username: user.username,
        email: user.email,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(String(err?.message || err));
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  });
