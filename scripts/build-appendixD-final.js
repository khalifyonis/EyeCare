/**
 * Finalise "Appendix D: Raw Data" with 6 curated, fully-populated, error-free
 * figures. Uses already-captured images (no browser / no DB needed).
 * Run: node scripts/build-appendixD-final.js
 */
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const DIR = path.join(__dirname, '..', 'docs', 'cv');
const SRC = path.join(DIR, 'CHAPTER_06_07_fin.docx');
const ALT_SRC = 'd:\\cv\\CHAPTER_06_07_fin.docx';
const TMP = path.join(__dirname, '_apdtmp');
const img = (n) => path.join(TMP, n + '.png');

// [imageFile, title, function, [details x3], purpose]
const FIGS = [
  ['core-patients', 'Patient Records',
    'Displays all registered patients with identification, contact, gender, registration date, and address.',
    ['Each record holds a unique patient ID, name, contact details, and branch.', 'Records can be searched, sorted, viewed, or edited.', 'The data reflects live entries stored in the Patients table.'],
    'Provides the raw patient dataset that underpins all clinical and billing workflows.'],
  ['apd-calendar', 'Appointment Records',
    'Displays scheduled patient appointments in a calendar view organised by day, with assigned doctors and status.',
    ['Each entry links a patient to a doctor at a specific date and time.', 'Monthly totals summarise confirmed, pending, and cancelled bookings.', 'Statuses are colour-coded for quick reference.'],
    'Captures the raw scheduling data used for clinic workflow and capacity planning.'],
  ['apd-financial', 'Billing and Revenue Records',
    'Presents invoice and revenue data with totals by service category for the reporting period.',
    ['Key figures include total revenue, average invoice, outstanding balances, and invoice count.', 'Revenue is broken down by consultation, medication, and optical services.', 'The figures reconcile with the underlying billing records.'],
    'Provides the raw financial dataset used for revenue reporting and analysis.'],
  ['core-pharmacy', 'Pharmacy Inventory Records',
    'Lists medication items with category, stock quantity, price, and stock status.',
    ['Low-stock and out-of-stock items are flagged automatically.', 'Quantities are updated on each dispensing transaction.', 'Records are searchable by name, generic, or SKU.'],
    'Captures the raw inventory dataset used for stock control and procurement.'],
  ['core-users', 'User Account Records',
    'Lists system user accounts with full name, username, assigned role, and branch.',
    ['Roles include Super Admin, Admin, Doctor, Receptionist, Pharmacist, and Optician.', 'Each account is assigned to one or more branches.', 'Accounts can be viewed, edited, activated, or deactivated.'],
    'Captures the raw account dataset governing system access control.'],
  ['apd-permissions', 'Role Permissions and Access Control',
    'Shows the role-based permission configuration mapping each role to its allowed modules and actions.',
    ['Permissions are defined per role and enforced on every request.', 'System roles cover all staff types, with support for custom roles.', 'Permission changes take effect immediately across the system.'],
    'Provides the raw access-control configuration governing system security.'],
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function drawing(rId, uid, cx, cy) {
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>`
    + `<wp:docPr id="${uid}" name="Picture ${uid}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>`
    + `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">`
    + `<pic:nvPicPr><pic:cNvPr id="${uid}" name="Picture ${uid}"/><pic:cNvPicPr/></pic:nvPicPr>`
    + `<pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
    + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`
    + `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}
const imgPara = (rId, uid, cx, cy) => `<w:p><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="40"/><w:jc w:val="center"/></w:pPr><w:r>${drawing(rId, uid, cx, cy)}</w:r></w:p>`;
function capPara(text) {
  const r = `<w:rPr><w:i/><w:iCs/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>`;
  return `<w:p><w:pPr><w:spacing w:before="40" w:after="160" w:line="360" w:lineRule="auto"/><w:jc w:val="center"/>${r}</w:pPr><w:r>${r}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}
function labelPara(label, rest) {
  const b = `<w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>`;
  const n = `<w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>`;
  return `<w:p><w:pPr><w:spacing w:before="40" w:after="40" w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr>`
    + `<w:r>${b}<w:t xml:space="preserve">${esc(label)}</w:t></w:r>`
    + (rest ? `<w:r>${n}<w:t xml:space="preserve">${esc(rest)}</w:t></w:r>` : '') + `</w:p>`;
}
const numItem = (text) => `<w:p><w:pPr><w:spacing w:after="40" w:line="360" w:lineRule="auto"/><w:ind w:left="360"/><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
function figureBlock(n, rId, uid, title, func, details, purpose, cx, cy) {
  return imgPara(rId, uid, cx, cy) + capPara(`Figure D.${n}: ${title}`)
    + labelPara('Function:', ' ' + func) + labelPara('Details:', '')
    + details.map((d, i) => numItem(`${i + 1}. ${d}`)).join('') + labelPara('Purpose:', ' ' + purpose);
}
const pngDim = (b) => (b.slice(12, 16).toString('ascii') === 'IHDR') ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : { w: 2880, h: 1640 };

(async () => {
  const zip = await JSZip.loadAsync(fs.readFileSync(SRC));
  let doc = await zip.files['word/document.xml'].async('string');
  let relsXml = await zip.files['word/_rels/document.xml.rels'].async('string');

  // refresh intro wording so it covers data + records
  doc = doc.replace('This appendix presents raw data records captured directly from the live EyeCare Management System.',
    'This appendix presents raw data captured directly from the live EyeCare Management System.');
  doc = doc.replace('Each figure shows the actual records held within a core module of the system, illustrating the information stored and managed during day-to-day operation.',
    'Each figure shows the actual data held within a core module of the system, illustrating the information stored, processed, and managed during day-to-day operation.');

  const introAnchor = 'This appendix presents raw data captured directly';
  const ai = doc.indexOf(introAnchor);
  if (ai < 0) throw new Error('intro anchor not found');
  const insAt = doc.indexOf('</w:p>', ai) + 6;
  const tailStart = doc.lastIndexOf('<w:sectPr');
  const cut = tailStart > insAt ? tailStart : doc.indexOf('</w:body>', insAt);

  const cx = 5760720;
  let blocks = '';
  FIGS.forEach((f, i) => {
    const [file, title, func, details, purpose] = f;
    const buf = fs.readFileSync(img(file)); const d = pngDim(buf);
    const cy = Math.round(cx * d.h / d.w);
    const num = i + 1; const rId = `rIdAPD${num}`;
    zip.file(`word/media/apd${num}.png`, buf);
    if (!relsXml.includes(`Id="${rId}"`)) relsXml = relsXml.replace('</Relationships>', `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/apd${num}.png"/></Relationships>`);
    blocks += figureBlock(num, rId, 7000 + num, title, func, details, purpose, cx, cy);
  });
  doc = doc.slice(0, insAt) + blocks + doc.slice(cut);
  zip.file('word/document.xml', doc);

  for (let i = FIGS.length + 1; i <= 15; i++) {
    relsXml = relsXml.replace(new RegExp(`<Relationship Id="rIdAPD${i}"[^>]*/>`), '');
    if (zip.files[`word/media/apd${i}.png`]) zip.remove(`word/media/apd${i}.png`);
  }
  zip.file('word/_rels/document.xml.rels', relsXml);

  const outBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  let wrote = '';
  for (const c of [SRC, SRC.replace(/\.docx$/i, ` (UPDATED ${Date.now()}).docx`)]) {
    try { fs.writeFileSync(c, outBuf); wrote = c; console.log(`Wrote ${c} (${Math.round(outBuf.length / 1024)} KB)`); break; }
    catch (e) { if (e.code === 'EBUSY' || e.code === 'EPERM') { console.warn('locked:', c); continue; } throw e; }
  }
  try { fs.writeFileSync(ALT_SRC, outBuf); console.log('synced to', ALT_SRC); } catch (e) { console.warn('d:\\cv sync skipped:', e.code); }

  // remove stale 6-core draft if main got updated cleanly
  for (const f of fs.readdirSync(DIR)) {
    if (/^CHAPTER_06_07_fin \(UPDATED \d+\)\.docx$/.test(f) && path.join(DIR, f) !== wrote) {
      try { fs.unlinkSync(path.join(DIR, f)); console.log('removed stale draft', f); } catch (e) {}
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
