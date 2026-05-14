import { PrismaClient } from '../src/generated/client/index.js';
const prisma = new PrismaClient();

async function main() {
  try {
    const exams = await prisma.eyeExamination.findMany();
    console.log('Exams found:', exams.length);
    const appointmentIds = exams.map(e => e.appointmentId).filter(Boolean);
    const uniqueIds = new Set(appointmentIds);
    console.log('Unique appointment IDs:', uniqueIds.size);
    if (appointmentIds.length !== uniqueIds.size) {
      console.log('DUPLICATES DETECTED!');
      const counts = {};
      appointmentIds.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
      Object.keys(counts).forEach(id => {
        if (counts[id] > 1) console.log(`ID ${id} appears ${counts[id]} times`);
      });
    } else {
      console.log('No duplicates found.');
    }
  } catch (err) {
    console.error('Prisma Error:', err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
