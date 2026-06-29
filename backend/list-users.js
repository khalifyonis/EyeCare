const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, username: true, fullName: true, role: true, roleId: true, isActive: true } });
    console.log(JSON.stringify(users, null, 2));
  } catch (e) { console.error('USERERR', e.message); }
  try {
    const counts = {};
    for (const m of ['patient', 'appointment', 'eyeExamination', 'invoice']) {
      try { counts[m] = await prisma[m].count(); } catch (e) { counts[m] = 'n/a:' + e.message.slice(0, 40); }
    }
    console.log('COUNTS', counts);
  } catch (e) { console.error('CNTERR', e.message); }
  try {
    const roles = await prisma.role.findMany({ select: { id: true, name: true } });
    console.log('ROLES', JSON.stringify(roles));
  } catch (e) { console.log('no role model:', e.message.slice(0, 50)); }
  await prisma.$disconnect();
})();
