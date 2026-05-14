import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();
async function main() {
    const patients = await prisma.patient.findMany({
        where: { fullName: { contains: 'Fatima Yusuf', mode: 'insensitive' } },
        select: { id: true, fullName: true, patientNumber: true }
    });
    console.log(JSON.stringify(patients, null, 2));
    await prisma.$disconnect();
}
main().catch(console.error);
