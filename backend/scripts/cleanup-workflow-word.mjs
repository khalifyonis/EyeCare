import 'dotenv/config';
import prisma from '../src/lib/prisma.js';

function stripWorkflow(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/\bworkflow\b\s*[:\-]?\s*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

async function cleanModel(modelName, rows, fields, updater) {
  let changed = 0;

  for (const row of rows) {
    const data = {};
    let dirty = false;

    for (const f of fields) {
      const current = row[f];
      if (typeof current === 'string' && /workflow/i.test(current)) {
        const next = stripWorkflow(current);
        if (next !== current) {
          data[f] = next;
          dirty = true;
        }
      }
    }

    if (dirty) {
      await updater(row.id, data);
      changed += 1;
    }
  }

  return { modelName, changed };
}

async function main() {
  const eyeRows = await prisma.eyeExamination.findMany({
    where: {
      OR: [
        { chiefComplaint: { contains: 'workflow', mode: 'insensitive' } },
        { historyOfPresentIllness: { contains: 'workflow', mode: 'insensitive' } },
        { diagnosis: { contains: 'workflow', mode: 'insensitive' } },
        { plan: { contains: 'workflow', mode: 'insensitive' } },
        { nextVisitReason: { contains: 'workflow', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      chiefComplaint: true,
      historyOfPresentIllness: true,
      diagnosis: true,
      plan: true,
      nextVisitReason: true,
    },
  });

  const followUpRows = await prisma.followUp.findMany({
    where: {
      notes: { contains: 'workflow', mode: 'insensitive' },
    },
    select: { id: true, notes: true },
  });

  const appointmentRows = await prisma.appointment.findMany({
    where: {
      notes: { contains: 'workflow', mode: 'insensitive' },
    },
    select: { id: true, notes: true },
  });

  const results = [];
  results.push(
    await cleanModel(
      'eyeExamination',
      eyeRows,
      ['chiefComplaint', 'historyOfPresentIllness', 'diagnosis', 'plan', 'nextVisitReason'],
      async (id, data) => prisma.eyeExamination.update({ where: { id }, data })
    )
  );
  results.push(
    await cleanModel('followUp', followUpRows, ['notes'], async (id, data) =>
      prisma.followUp.update({ where: { id }, data })
    )
  );
  results.push(
    await cleanModel('appointment', appointmentRows, ['notes'], async (id, data) =>
      prisma.appointment.update({ where: { id }, data })
    )
  );

  console.log(JSON.stringify({ message: 'Cleanup complete', results }, null, 2));
}

main()
  .catch((err) => {
    console.error(String(err?.message || err));
    process.exit(1);
  })
  .finally(async () => {
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  });
