/* Consolidate: copy the newest complete build into the main docx and delete all extra drafts.
   Run AFTER closing every Microsoft Word window. */
const fs = require('fs');
const path = require('path');
const DIR = 'd:\\cv\\';
const MAIN = DIR + 'CHAPTER FIVE 5.docx';
const BACKUP = DIR + 'CHAPTER FIVE 5.backup.docx';

function locked(file) {
  try { fs.closeSync(fs.openSync(file, 'r+')); return false; }
  catch (e) { return e.code === 'EBUSY' || e.code === 'EPERM'; }
}

// newest "CHAPTER FIVE 5 (UPDATED...)" / ".updated" build
const drafts = fs.readdirSync(DIR)
  .filter((f) => /^CHAPTER FIVE 5( \(UPDATED.*\)|\.updated)\.docx$/i.test(f))
  .map((f) => ({ f, full: DIR + f, m: fs.statSync(DIR + f).mtimeMs }))
  .sort((a, b) => b.m - a.m);

if (!drafts.length) { console.log('No updated build found.'); process.exit(0); }
const newest = drafts[0];
console.log('Newest build:', newest.f);

if (locked(MAIN)) { console.log('MAIN_LOCKED — close Word and run again.'); process.exit(0); }
for (const d of drafts) if (locked(d.full)) { console.log('LOCKED draft (close Word):', d.f); process.exit(0); }

fs.copyFileSync(newest.full, MAIN);
console.log('Updated main:', MAIN);
for (const d of drafts) { fs.unlinkSync(d.full); console.log('removed', d.f); }
console.log('Done. Remaining: CHAPTER FIVE 5.docx (final) +', path.basename(BACKUP));
