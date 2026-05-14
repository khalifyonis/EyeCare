const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const appointments = await prisma.$queryRaw`
    SELECT a.*, p.full_name as patient_name 
    FROM appointments a 
    JOIN patients p ON a.patient_id = p.id 
    ORDER BY a.appointment_date DESC
  `;

  console.log('All Appointments (Raw):', JSON.stringify(appointments, null, 2));
  process.exit(0);
}

check();
