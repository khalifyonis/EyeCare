/**
 * Append more system figures (D.10-D.15) to "Appendix D: Raw Data" in
 * CHAPTER_06_07_fin.docx, matching the existing figure format exactly.
 * Screenshots are captured fresh (HD, 2880x1640) from the live system.
 *
 * Run: node scripts/build-appendixD.js
 */
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { chromium } = require('playwright');

const SRC = path.join(__dirname, '..', 'docs', 'cv', 'CHAPTER_06_07_fin.docx');
const ALT_SRC = 'd:\\cv\\CHAPTER_06_07_fin.docx';
const BASE = process.env.CH5_BASE_URL || 'http://localhost:3000';
const TMP = path.join(__dirname, '_apdtmp');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
const EMU_IN = 914400;
const VW = 1440, VH = 820; // -> 2880x1640 at dsf2 (matches existing apd images)

// all captured in one elevated session (CAP_USER). [name, url, title, function, [details x3], purpose]
const CAP_USER = process.env.CAP_USER || 'admin';
const CAP_PASS = process.env.CAP_PASS || 'admin123';
const FIGS = [
  ['calendar', '/dashboard/appointments/calendar', 'Appointment Calendar',
    'Displays scheduled appointments in a calendar view organised by day and doctor.',
    ['Booked slots are shown with patient and status indicators.', 'Monthly totals summarise confirmed, pending, and cancelled bookings.', 'The view supports navigation across dates and weeks.'],
    'Provides the raw scheduling overview used to manage clinic capacity.'],
  ['financial', '/dashboard/reports/financial', 'Financial Revenue Report',
    'Presents revenue figures by service category with totals for the selected reporting period.',
    ['Revenue is broken down by consultation, medication, and optical services.', 'The figures reconcile with the underlying billing records.', 'Output supports period and date-range filtering.'],
    'Captures the raw financial reporting data used for revenue analysis.'],
  ['apptreport', '/dashboard/reports/appointments', 'Appointment Analytics Report',
    'Summarises appointment volumes and outcomes across the selected reporting period.',
    ['Appointments are grouped by status, doctor, and date.', 'Charts visualise booking trends over time.', 'The figures are drawn directly from the appointment records.'],
    'Provides the raw appointment analytics used for operational planning.'],
  ['patientreport', '/dashboard/reports/patients', 'Patient Statistics Report',
    'Presents patient registration statistics with demographic breakdowns.',
    ['Registrations are summarised by period, gender, and branch.', 'Charts illustrate patient growth over time.', 'The figures aggregate the live patient records.'],
    'Provides the raw patient statistics used for demographic analysis.'],
  ['inventoryreport', '/dashboard/reports/inventory', 'Inventory and Stock Report',
    'Reports current stock levels for pharmacy and optical items with low-stock indicators.',
    ['Items are listed with quantity, value, and stock status.', 'Low-stock entries are highlighted for reordering.', 'The figures reflect live inventory transactions.'],
    'Captures the raw inventory dataset used for stock control and procurement.'],
  ['permissions', '/dashboard/admin/permissions', 'Role Permissions and Access Control',
    'Shows the configurable permission matrix mapping each role to its allowed modules and actions.',
    ['Permissions are defined per role and enforced on every request.', 'Roles include Super Admin, Admin, Doctor, Receptionist, Pharmacist, and Optician.', 'Permission changes take effect immediately across the system.'],
    'Provides the raw access-control configuration governing system security.'],
];

// ---------- xml ----------
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

// ---------- capture ----------
async function forceLight(page) { await page.evaluate(() => { localStorage.setItem('theme', 'light'); document.documentElement.classList.remove('dark'); document.documentElement.style.colorScheme = 'light'; }); }
async function login(page, u, p) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await forceLight(page); await page.waitForTimeout(900);
  await page.fill('#username, input[type="text"]', u); await page.fill('input[type="password"]', p);
  await page.click('button[type="submit"]'); await page.waitForTimeout(3200);
}
async function captureAll(browser) {
  const out = {};
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, colorScheme: 'light' });
  await ctx.addInitScript(() => { localStorage.setItem('theme', 'light'); document.documentElement.classList.remove('dark'); document.documentElement.style.colorScheme = 'light'; });
  const page = await ctx.newPage();
  await login(page, CAP_USER, CAP_PASS);
  for (const f of FIGS) {
    const [name, url] = f; const file = path.join(TMP, `apd-${name}.png`);
    try {
      await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await forceLight(page);
      await page.waitForTimeout(5000); // data fetch + let any transient toast fade
      await page.screenshot({ path: file, type: 'png', fullPage: false });
      out[name] = file; console.log(`shot ${name} OK`);
    } catch (e) { console.warn(`shot ${name} FAILED: ${e.message}`); }
  }
  await ctx.close();
  return out;
}

// ---------- doc edit ----------
function addRels(relsXml, rels) {
  const e = rels.map((r) => `<Relationship Id="${r.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${r.target}"/>`).join('');
  return relsXml.replace('</Relationships>', e + '</Relationships>');
}

async function main() {
  const browser = await chromium.launch();
  const shots = await captureAll(browser);
  await browser.close();

  const zip = await JSZip.loadAsync(fs.readFileSync(SRC));
  let doc = await zip.files['word/document.xml'].async('string');

  // insertion point: after D.9 Purpose paragraph
  const anchor = 'Provides the raw audit trail used for security and compliance.';
  const ai = doc.indexOf(anchor);
  if (ai < 0) throw new Error('Appendix D.9 anchor not found');
  const insAt = doc.indexOf('</w:p>', ai) + 6;
  // idempotent: drop any previously-added D.10+ content (everything between D.9 and the final body sectPr)
  const tailStart = doc.lastIndexOf('<w:sectPr');
  const cut = tailStart > insAt ? tailStart : doc.indexOf('</w:body>', insAt);
  const head = doc.slice(0, insAt);
  const tail = doc.slice(cut);

  let relsXml = await zip.files['word/_rels/document.xml.rels'].async('string');
  const media = []; const newRels = [];
  let blocks = '';
  FIGS.forEach((f, i) => {
    const [name, , title, func, details, purpose] = f;
    const file = shots[name];
    if (!file) { console.warn('skip (no shot):', name); return; }
    const buf = fs.readFileSync(file); const d = pngDim(buf);
    const cx = 5760720; const cy = Math.round(cx * d.h / d.w);
    const num = 10 + i; const rId = `rIdAPD${num}`; const idx = num;
    media.push({ name: `media/apd${idx}.png`, buf });
    if (!relsXml.includes(`Id="${rId}"`)) newRels.push({ id: rId, target: `apd${idx}.png` });
    blocks += figureBlock(num, rId, 7000 + num, title, func, details, purpose, cx, cy);
  });

  doc = head + blocks + tail;
  zip.file('word/document.xml', doc);

  if (newRels.length) relsXml = addRels(relsXml, newRels);
  zip.file('word/_rels/document.xml.rels', relsXml);
  for (const m of media) zip.file(`word/${m.name}`, m.buf);

  console.log('figures added:', media.length);
  const outBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  const candidates = [SRC, SRC.replace(/\.docx$/i, ` (UPDATED ${Date.now()}).docx`)];
  for (const c of candidates) {
    try { fs.writeFileSync(c, outBuf); console.log(`Wrote ${c} (${Math.round(outBuf.length / 1024)} KB)`); break; }
    catch (e) { if (e.code === 'EBUSY' || e.code === 'EPERM') { console.warn('locked:', c); continue; } throw e; }
  }
  // also sync to d:\cv copy if present and unlocked
  try { if (fs.existsSync(ALT_SRC)) { fs.writeFileSync(ALT_SRC, outBuf); console.log('synced to', ALT_SRC); } }
  catch (e) { console.warn('could not sync d:\\cv copy:', e.code); }
}
main().catch((e) => { console.error(e); process.exit(1); });
