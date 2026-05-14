const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const branches = await prisma.branch.findMany();
  console.log(JSON.stringify(branches, null, 2));
  process.exit(0);
}

check();
