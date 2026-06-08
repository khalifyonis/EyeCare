import prisma from './lib/prisma.js';

async function main() {
  const appointments = await prisma.appointment.findMany({
    include: {
      patient: true,
      doctor: {
        include: {
          user: true
        }
      }
    }
  });
  console.log(JSON.stringify(appointments, null, 2));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
