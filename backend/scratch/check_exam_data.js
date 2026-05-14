import prisma from '../src/lib/prisma.js';

async function check() {
  const examId = 'd11c522b-39b0-4277-a5bf-8d94811ac3b0';
  
  console.log('--- Eye Examination ---');
  const exam = await prisma.eyeExamination.findUnique({
    where: { id: examId },
    include: { patient: true }
  });
  console.log(JSON.stringify(exam, null, 2));

  console.log('\n--- Prescriptions ---');
  const prescriptions = await prisma.prescription.findMany({
    where: { 
      OR: [
        { eyeExamId: examId },
        { appointmentId: exam?.appointmentId || undefined }
      ]
    },
    include: { 
      appointment: { include: { patient: true } }, 
      eyeExam: { include: { patient: true } } 
    }
  });
  console.log(JSON.stringify(prescriptions, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
