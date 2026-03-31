import 'dotenv/config';
import prisma from '../src/lib/prisma.js';

function parseArgs(argv) {
  const args = { yes: false, fallback: 'MALE' };
  for (const token of argv) {
    if (token === '--yes') args.yes = true;
    if (token.startsWith('--fallback=')) {
      const v = token.slice('--fallback='.length).trim().toUpperCase();
      if (v === 'MALE' || v === 'FEMALE' || v === 'SKIP') args.fallback = v;
    }
  }
  return args;
}

function normalizeGender(raw, fallback) {
  const value = String(raw || '').trim().toUpperCase();
  if (!value) return null;
  if (value === 'MALE' || value === 'M' || value === 'MAN' || value === 'MEN' || value === 'BOY') return 'MALE';
  if (value === 'FEMALE' || value === 'F' || value === 'WOMAN' || value === 'WOMEN' || value === 'GIRL') return 'FEMALE';

  if (fallback === 'MALE' || fallback === 'FEMALE') return fallback;
  return null;
}

function parseMeta(text) {
  const raw = String(text || '').trim();
  if (!raw.startsWith('{') || !raw.endsWith('}')) return null;
  try {
    const obj = JSON.parse(raw);
    return typeof obj === 'object' && obj !== null ? obj : null;
  } catch {
    return null;
  }
}

async function normalizePatients(fallback) {
  const rows = await prisma.patient.findMany({
    select: { id: true, gender: true },
  });

  let checked = 0;
  let updated = 0;
  const skipped = [];

  for (const row of rows) {
    checked += 1;
    const current = row.gender;
    if (current === null || current === undefined || String(current).trim() === '') continue;

    const normalized = normalizeGender(current, fallback);
    if (!normalized) {
      skipped.push({ id: row.id, value: current });
      continue;
    }
    if (normalized === String(current).toUpperCase()) continue;

    await prisma.patient.update({
      where: { id: row.id },
      data: { gender: normalized },
    });
    updated += 1;
  }

  return { checked, updated, skipped };
}

async function normalizeOpticalFrameMeta(fallback) {
  const rows = await prisma.opticalItem.findMany({
    where: { itemType: 'Frame' },
    select: { id: true, manufacturer: true },
  });

  let checked = 0;
  let updated = 0;
  const skipped = [];

  for (const row of rows) {
    checked += 1;
    const meta = parseMeta(row.manufacturer);
    if (!meta || !('gender' in meta)) continue;

    const current = meta.gender;
    const normalized = normalizeGender(current, fallback);
    if (!normalized) {
      skipped.push({ id: row.id, value: current });
      continue;
    }
    if (String(current || '').toUpperCase() === normalized) continue;

    const nextMeta = { ...meta, gender: normalized };
    await prisma.opticalItem.update({
      where: { id: row.id },
      data: { manufacturer: JSON.stringify(nextMeta) },
    });
    updated += 1;
  }

  return { checked, updated, skipped };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.yes) {
    console.error('Usage: node scripts/normalize-gender.mjs --yes [--fallback=MALE|FEMALE|SKIP]');
    console.error('Refusing to run without --yes confirmation.');
    process.exit(1);
  }

  const patientResult = await normalizePatients(args.fallback);
  const frameResult = await normalizeOpticalFrameMeta(args.fallback);

  console.log(
    JSON.stringify(
      {
        message: 'Gender normalization completed',
        fallback: args.fallback,
        patients: patientResult,
        opticalFrames: frameResult,
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
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  });
