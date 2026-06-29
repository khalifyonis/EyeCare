/**
 * Rebuild "Appendix D: Raw Data" with a curated set of core record figures.
 * Captures each core module's record list (HD, bright theme) and replaces ALL
 * existing Appendix D figures so every image matches its caption with no errors.
 *
 * Capture as an elevated account (set CAP_USER to a SUPERADMIN/ADMIN beforehand).
 * Run: node scripts/build-appendixD-core.js
 */
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { chromium } = require('playwright');

const SRC = path.join(__dirname, '..', 'docs', 'cv', 'CHAPTER_06_07_fin.docx');
const ALT_SRC = 'd:\\cv\\CHAPTER_06_07_fin.docx';
const BASE = process.env.CH5_BASE_URL || 'http://localhost:3000';
const CAP_USER = process.env.CAP_USER || 'admin';
const CAP_PASS = process.env.CAP_PASS || 'admin123';
const TMP = path.join(__dirname, '_apdtmp');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
const VW = 1440, VH = 820; // -> 2880x1640 at dsf2

// curated core raw-data records: [name, url, title, function, [details x3], purpose]
const CORE = [
  ['patients', '/dashboard/patients', 'Patient Records',
    'Displays all registered patients with identification, contact, gender, registration date, and address.',
    ['Each record holds a unique patient ID, name, contact details, and branch.', 'Records can be searched, sorted, viewed, or edited.', 'The data reflects live entries stored in the Patients table.'],
    'Provides the raw patient dataset that underpins all clinical and billing workflows.'],
  ['appointments', '/dashboard/appointments', 'Appointment Records',
    'Lists patient appointments with the assigned doctor, date and time, type, and current status.',
    ['Statuses include Scheduled, Completed, and Cancelled.', 'Each appointment is linked to a specific patient and doctor.', 'Records can be filtered by date and status.'],
    'Captures the raw scheduling data used for clinic workflow and reporting.'],
  ['examinations', '/dashboard/eye-examinations', 'Eye Examination Records',
    'Shows recorded eye examinations including chief complaint, visual acuity, intraocular pressure, and stage.',
    ['Each record is linked to a patient and a corresponding appointment.', 'Findings feed directly into the prescription and optical modules.', 'Records are searchable by patient.'],
    'Provides the raw clinical dataset documenting examination outcomes.'],
  ['billing', '/dashboard/billing', 'Billing and Invoice Records',
    'Displays invoices with amounts, payment status, and dates for each patient.',
    ['Payment status includes Unpaid, Partial, and Paid.', 'Invoices consolidate consultation, medication, and optical charges.', 'Records support receipt generation.'],
    'Provides the raw financial dataset used for revenue reporting.'],
  ['pharmacy', '/dashboard/pharmacy/inventory', 'Pharmacy Inventory Records',
    'Lists medication items with quantity, pricing, and stock status.',
    ['Low-stock items are flagged automatically.', 'Quantities are updated on each dispensing transaction.', 'Records are searchable by item.'],
    'Captures the raw inventory dataset used for stock control.'],
  ['users', '/dashboard/admin/users', 'User Account Records',
    'Lists system user accounts with their assigned roles, branches, and account status.',
    ['Roles include Super Admin, Admin, Doctor, Receptionist, Pharmacist, and Optician.', 'Accounts can be activated or deactivated.', 'Access is enforced per role on every request.'],
    'Captures the raw account dataset governing system access control.'],
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
function imgPara(rId, uid, cx, cy) {
  return `<w:p><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="40"/><w:jc w:val="center"/></w:pPr><w:r>${drawing(rId, uid, cx, cy)}</w:r></w:p>`;
}
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
function numItem(text) {
  const n = `<w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>`;
  return `<w:p><w:pPr><w:spacing w:after="40" w:line="360" w:lineRule="auto"/><w:ind w:left="360"/><w:jc w:val="both"/></w:pPr><w:r>${n}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}
function figureBlock(n, rId, uid, title, func, details, purpose, cx, cy) {
  return imgPara(rId, uid, cx, cy)
    + capPara(`Figure D.${n}: ${title}`)
    + labelPara('Function:', ' ' + func)
    + labelPara('Details:', '')
    + details.map((d, i) => numItem(`${i + 1}. ${d}`)).join('')
    + labelPara('Purpose:', ' ' + purpose);
}
function pngDim(buf) { return (buf.slice(12, 16).toString('ascii') === 'IHDR') ? { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) } : { w: 2880, h: 1640 }; }

async function forceLight(page) { await page.evaluate(() => { localStorage.setItem('theme', 'light'); document.documentElement.classList.remove('dark'); document.documentElement.style.colorScheme = 'light'; }); }
async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await forceLight(page); await page.waitForTimeout(900);
  await page.fill('#username, input[type="text"]', CAP_USER); await page.fill('input[type="password"]', CAP_PASS);
  await page.click('button[type="submit"]'); await page.waitForTimeout(3500);
}
async function captureAll(browser) {
  const out = {};
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, colorScheme: 'light' });
  await ctx.addInitScript(() => { localStorage.setItem('theme', 'light'); document.documentElement.classList.remove('dark'); document.documentElement.style.colorScheme = 'light'; });
  const page = await ctx.newPage();
  await login(page);
  const jobs = [...CORE.map((f) => [f[0], f[1]])];
  if (process.env.CAPTURE_EXTRAS) jobs.push(['x-prescriptions', '/dashboard/prescription/medicine'], ['x-optical', '/dashboard/prescription/optical']);
  for (const [name, url] of jobs) {
    const file = path.join(TMP, `core-${name}.png`);
    if (!process.env.NOCACHE && fs.existsSync(file)) { out[name] = file; console.log(`shot ${name} cached`); continue; }
    try {
      await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await forceLight(page);
      await page.waitForTimeout(5000);
      await page.screenshot({ path: file, type: 'png', fullPage: false });
      out[name] = file; console.log(`shot ${name} OK`);
    } catch (e) { console.warn(`shot ${name} FAILED: ${e.message}`); }
  }
  await ctx.close();
  return out;
}

async function main() {
  const browser = await chromium.launch();
  const shots = await captureAll(browser);
  await browser.close();

  const zip = await JSZip.loadAsync(fs.readFileSync(SRC));
  let doc = await zip.files['word/document.xml'].async('string');
  let relsXml = await zip.files['word/_rels/document.xml.rels'].async('string');

  // Region to replace: everything from after the Appendix-D intro paragraph to the final body sectPr.
  const introAnchor = 'This appendix presents raw data records captured directly';
  const ai = doc.indexOf(introAnchor);
  if (ai < 0) throw new Error('Appendix D intro anchor not found');
  const insAt = doc.indexOf('</w:p>', ai) + 6;
  const tailStart = doc.lastIndexOf('<w:sectPr');
  const cut = tailStart > insAt ? tailStart : doc.indexOf('</w:body>', insAt);

  const cx = 5760720;
  let blocks = '';
  CORE.forEach((f, i) => {
    const [name, , title, func, details, purpose] = f;
    const file = shots[name];
    if (!file) { throw new Error('missing capture: ' + name); }
    const buf = fs.readFileSync(file); const d = pngDim(buf);
    const cy = Math.round(cx * d.h / d.w);
    const num = i + 1; const rId = `rIdAPD${num}`;
    zip.file(`word/media/apd${num}.png`, buf); // overwrite core images
    if (!relsXml.includes(`Id="${rId}"`)) {
      relsXml = relsXml.replace('</Relationships>', `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/apd${num}.png"/></Relationships>`);
    }
    blocks += figureBlock(num, rId, 7000 + num, title, func, details, purpose, cx, cy);
  });

  doc = doc.slice(0, insAt) + blocks + doc.slice(cut);
  zip.file('word/document.xml', doc);

  // drop now-unused figures apd7..apd15 (rels + media)
  for (let i = CORE.length + 1; i <= 15; i++) {
    relsXml = relsXml.replace(new RegExp(`<Relationship Id="rIdAPD${i}"[^>]*/>`), '');
    if (zip.files[`word/media/apd${i}.png`]) zip.remove(`word/media/apd${i}.png`);
  }
  zip.file('word/_rels/document.xml.rels', relsXml);

  console.log('core figures written:', CORE.length);
  const outBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  for (const c of [SRC, SRC.replace(/\.docx$/i, ` (UPDATED ${Date.now()}).docx`)]) {
    try { fs.writeFileSync(c, outBuf); console.log(`Wrote ${c} (${Math.round(outBuf.length / 1024)} KB)`); break; }
    catch (e) { if (e.code === 'EBUSY' || e.code === 'EPERM') { console.warn('locked:', c); continue; } throw e; }
  }
  try { if (fs.existsSync(ALT_SRC)) { fs.writeFileSync(ALT_SRC, outBuf); console.log('synced to', ALT_SRC); } }
  catch (e) { console.warn('could not sync d:\\cv copy:', e.code); }
}
main().catch((e) => { console.error(e); process.exit(1); });
