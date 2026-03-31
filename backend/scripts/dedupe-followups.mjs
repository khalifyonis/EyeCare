import 'dotenv/config';
import prisma from '../src/lib/prisma.js';

function parseArgs(argv) {
  const args = { name: '', phone: '', yes: false };
  for (const token of argv) {
    if (token === '--yes') args.yes = true;
    if (token.startsWith('--name=')) args.name = token.slice('--name='.length).trim();
    if (token.startsWith('--phone=')) args.phone = token.slice('--phone='.length).trim();
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.yes) {
    console.error('Refusing to modify data without --yes.');
    console.error('Usage: node scripts/dedupe-followups.mjs --name="yonis" --yes');
    process.exit(1);
  }

  if (!args.name && !args.phone) {
    console.error('Provide --name or --phone.');
    process.exit(1);
  }

  const patient = await prisma.patient.findFirst({
    where: args.phone
      ? { phone: args.phone }
      : { fullName: { contains: args.name, mode: 'insensitive' } },
    select: { id: true, fullName: true, phone: true },
  });

  if (!patient) {
    console.log('Patient not found.');
    return;
  }

  const rows = await prisma.followUp.findMany({
    where: { patientId: patient.id },
    orderBy: [{ createdAt: 'desc' }],
    select: {
      id: true,
      dueDate: true,
      sourceType: true,
      notes: true,
      status: true,
    },
  });

  const seen = new Set();
  const duplicateIds = [];

  for (const r of rows) {
    const key = [
      new Date(r.dueDate).toISOString().slice(0, 10),
      String(r.sourceType || '').toUpperCase(),
      String(r.notes || '').trim().toLowerCase(),
      String(r.status || '').toUpperCase(),
    ].join('|');

    if (seen.has(key)) duplicateIds.push(r.id);
    else seen.add(key);
  }

  if (duplicateIds.length > 0) {
    await prisma.followUp.deleteMany({ where: { id: { in: duplicateIds } } });
  }

  console.log(
    JSON.stringify(
      {
        patient: patient.fullName,
        phone: patient.phone,
        totalFollowUps: rows.length,
        removedDuplicates: duplicateIds.length,
        remaining: rows.length - duplicateIds.length,
      },
      null,
      2
    )
  );
}

main()
  .catch((err) => {
    console.error(String(err?.message || err));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
