import { PrismaClient } from './src/generated/client/index.js';
const prisma = new PrismaClient();

async function generatePatientNumber(lastNum) {
    return `PAT-${(lastNum + 1).toString().padStart(5, '0')}`;
}

async function main() {
    const lastPatient = await prisma.patient.findFirst({
        where: { patientNumber: { startsWith: 'PAT-' } },
        orderBy: { patientNumber: 'desc' },
        select: { patientNumber: true }
    });

    let currentNum = 0;
    if (lastPatient?.patientNumber) {
        currentNum = parseInt(lastPatient.patientNumber.replace('PAT-', ''), 10);
    }

    const unassignedPatients = await prisma.patient.findMany({
        where: { OR: [{ patientNumber: null }, { patientNumber: '' }] },
        orderBy: { createdAt: 'asc' }
    });

    console.log(`Found ${unassignedPatients.length} patients without IDs.`);

    for (const p of unassignedPatients) {
        currentNum++;
        const newId = `PAT-${currentNum.toString().padStart(5, '0')}`;
        console.log(`Assigning ${newId} to ${p.fullName}`);
        await prisma.patient.update({
            where: { id: p.id },
            data: { patientNumber: newId }
        });
    }

    console.log('Finished assigning IDs.');
    await prisma.$disconnect();
}
main().catch(console.error);
