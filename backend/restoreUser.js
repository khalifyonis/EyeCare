import { PrismaClient } from './src/generated/client/index.js';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('yonis1862', 10);
  
  // Find a branch to associate with the user if they don't exist
  const firstBranch = await prisma.branch.findFirst();
  if (!firstBranch) {
    console.error('No branches found in the database. Please run seed.js first.');
    return;
  }

  const user = await prisma.user.upsert({
    where: { username: 'yonis' },
    update: {
      password: hashedPassword,
      role: 'SUPERADMIN', // Ensure they have SUPERADMIN rights
    },
    create: {
      username: 'yonis',
      fullName: 'Yonis',
      email: 'yonis@example.com',
      password: hashedPassword,
      role: 'SUPERADMIN',
      branch: { connect: { id: firstBranch.id } }
    }
  });

  console.log(`User "yonis" updated/created successfully with password "yonis1862" and role "SUPERADMIN"!`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
