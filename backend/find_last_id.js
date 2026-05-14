import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();
async function main() {
    const lastPatient = await prisma.patient.findFirst({
        where: { patientNumber: { startsWith: 'PAT-' } },
        orderBy: { patientNumber: 'desc' },
        select: { patientNumber: true }
    });
    console.log(JSON.stringify(lastPatient, null, 2));
    await prisma.$disconnect();
}
main().catch(console.error);
