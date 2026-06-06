import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Truncating role_permissions table...');
    await prisma.$executeRawUnsafe('TRUNCATE TABLE role_permissions CASCADE;');
    console.log('Successfully cleared role_permissions.');
  } catch (err) {
    console.error('Failed to clear table:', err.message);
  }
}

main().finally(() => prisma.$disconnect());
