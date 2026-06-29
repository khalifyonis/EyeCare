/**
 * Comprehensive Chapter 5 update (built from the pristine backup):
 *  - 5.2 Coding and Modules: insert a core-module screenshot after each module (Figures 5.2-5.7).
 *  - 5.3.1 Unit Testing: rebuild Figure as a large, clearly-visible HD vertical composite.
 *  - 5.3.3 System Testing: rebuild Figure combining the main core modules (grid), displayed large.
 *  - 5.4 Test Cases and Results: one sample-style table (Test Case | Expected | Actual screenshot | Status checkbox).
 *  - Upgrade architecture/integration/workflow/UAT/validation diagrams to HD.
 *  - Renumber all figure captions sequentially (5.1-5.13) and table captions (5.5/5.6).
 *
 * Run: node scripts/build-ch5-update.js
 */
const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');
const { chromium } = require('playwright');
const D = require('./chapter5-diagrams');

const READ = 'd:\\cv\\CHAPTER FIVE 5.backup.docx';
const WRITE_CANDIDATES = [
  'd:\\cv\\CHAPTER FIVE 5.docx',
  'd:\\cv\\CHAPTER FIVE 5 (UPDATED).docx',
  `d:\\cv\\CHAPTER FIVE 5 (UPDATED ${Date.now()}).docx`,
];
const BASE = process.env.CH5_BASE_URL || 'http://localhost:3000';
const TMP = path.join(__dirname, '_ch5tmp');
if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });
const EMU_IN = 914400;

// diagrams only (composites handled separately)
const FIG = {
  rId4: { file: 'image1.png', w: 584, h: 383, k: 3, html: D.architectureDiagramHtml },
  rId6: { file: 'image3.png', w: 760, h: 277, k: 3, html: D.integrationDiagramHtml },
  rId7: { file: 'image4.png', w: 744, h: 178, k: 3, html: D.clinicWorkflowHtml },
  rId9: { file: 'image6.png', w: 760, h: 277, k: 3, html: D.uatDiagramHtml },
  rId21: { file: 'image18.png', w: 760, h: 291, k: 3, html: D.validationDiagramHtml },
};

const PAGES = {
  login: ['public', '/login'],
  receptionDash: ['reception1', '/dashboard/receptionist'],
  patient: ['reception1', '/dashboard/patients?new=1', 'First Name'],
  patientsList: ['reception1', '/dashboard/patients'],
  appointment: ['reception1', '/dashboard/appointments/new'],
  calendar: ['reception1', '/dashboard/appointments/calendar'],
  examination: ['doctor1', '/dashboard/eye-examinations'],
  prescription: ['doctor1', '/dashboard/prescription/medicine'],
  optical: ['optician1', '/dashboard/optical-shop'],
  pharmacy: ['pharmacist1', '/dashboard/pharmacy'],
  billing: ['reception1', '/dashboard/billing'],
  reports: ['admin', '/dashboard/reports'],
  adminUsers: ['admin', '/dashboard/admin/users'],
  permissions: ['admin', '/dashboard/admin/permissions'],
  auditLog: ['admin', '/dashboard/audit-log'],
};

// 5.4 consolidated test cases: [test, expected, shotName]
const TC = [
  ['Login with valid credentials', 'User authenticated and the role dashboard is loaded', 'receptionDash'],
  ['Login with an invalid password', 'Access denied and an error message is displayed', 'login'],
  ['Register a new patient with complete data', 'Patient record created and saved successfully', 'patient'],
  ['Search and view a patient record', 'Matching patient records are displayed', 'patientsList'],
  ['Schedule a new appointment', 'Appointment booked and shown in the list', 'appointment'],
  ['View calendar and prevent double booking', 'Booked slots shown and conflicting booking blocked', 'calendar'],
  ['Record an eye examination (VA, IOP, refraction)', 'Examination data saved to the patient record', 'examination'],
  ['Issue a medicine prescription', 'Prescription routed to the pharmacy queue', 'prescription'],
  ['Create an optical order from refraction', 'Lens parameters populated automatically', 'optical'],
  ['Dispense medication and update stock', 'Inventory updated and dispensing recorded', 'pharmacy'],
  ['Generate an invoice and record payment', 'Itemized invoice created and status updated', 'billing'],
  ['Generate period reports', 'Reports produced with accurate figures', 'reports'],
  ['Create a user and assign a role', 'User created with the correct permissions', 'adminUsers'],
  ['Configure role permissions', 'Permission changes enforced per role', 'permissions'],
  ['Record user actions in the audit log', 'Actions logged with the user and timestamp', 'auditLog'],
];

// 5.2 module figures: insert BEFORE the given heading; [headingAnchor, shot, caption]
const MOD = [
  ['Patient Registration and Records Module', 'login', 'Figure 5.2: Authentication and Login Module'],
  ['Appointment Scheduling Module', 'patient', 'Figure 5.3: Patient Registration Module'],
  ['Clinical Examination Module', 'appointment', 'Figure 5.4: Appointment Scheduling Module'],
  ['Prescription, Pharmacy, and Optical Modules', 'examination', 'Figure 5.5: Clinical Examination Module'],
  ['Billing and Reporting Module', 'pharmacy', 'Figure 5.6: Prescription and Pharmacy Module'],
  ['Testing Strategy', 'billing', 'Figure 5.7: Billing and Reporting Module'],
];

// final captions for the existing figures (by rId), after renumbering
const FIG_CAPTIONS = {
  rId4: 'Figure 5.1: Three-Tier System Architecture',
  rId5: 'Figure 5.8: Screenshots of Tested Components (Login, Patient Registration, and Appointment Scheduling)',
  rId6: 'Figure 5.9: Integration Testing',
  rId7: 'Figure 5.10: Clinic Workflow - End-to-End System Testing Sequence',
  rId8: 'Figure 5.11: System Testing - Combined Core Module Flow',
  rId9: 'Figure 5.12: User Acceptance Testing Process and Feedback Flow',
  rId21: 'Figure 5.13: Validation and Verification Flow with Security Enforcement',
};

// ===================== xml helpers =====================
const TNR = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const bd = (e) => `<w:${e} w:val="single" w:sz="4" w:space="0" w:color="000000"/>`;
const BORDERS = `<w:tcBorders>${bd('top')}${bd('left')}${bd('bottom')}${bd('right')}</w:tcBorders>`;
const COLW = { tc: 1850, exp: 2450, act: 4600, st: 995 };

function pngDim(buf) {
  if (buf.slice(12, 16).toString('ascii') === 'IHDR') return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  return { w: 1440, h: 900 };
}
function fitExtent(wpx, hpx, maxWin, maxHin) {
  let w = maxWin; let h = w * hpx / wpx;
  if (h > maxHin) { h = maxHin; w = h * wpx / hpx; }
  return { cx: Math.round(w * EMU_IN), cy: Math.round(h * EMU_IN) };
}
function drawingXml(rId, uid, cx, cy) {
  return `<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">`
    + `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>`
    + `<wp:docPr id="${uid}" name="Picture ${uid}"/>`
    + `<wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>`
    + `<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">`
    + `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">`
    + `<pic:nvPicPr><pic:cNvPr id="${uid}" name="Picture ${uid}"/><pic:cNvPicPr/></pic:nvPicPr>`
    + `<pic:blipFill><a:blip r:embed="${rId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
    + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>`
    + `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>`;
}
function figPara(rId, uid, cx, cy) {
  return `<w:p><w:pPr><w:spacing w:before="160" w:after="40"/><w:jc w:val="center"/></w:pPr><w:r>${drawingXml(rId, uid, cx, cy)}</w:r></w:p>`;
}
function captionPara(text) {
  const r = `<w:rPr>${TNR}<w:i/><w:iCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>`;
  return `<w:p><w:pPr><w:spacing w:before="80" w:after="280"/><w:jc w:val="center"/>${r}</w:pPr><w:r>${r}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

// ---- 5.4 table ----
function rpr(bold) { return `<w:rPr>${TNR}${bold ? '<w:b/><w:bCs/>' : ''}<w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr>`; }
function textCell(text, w, bold, center) {
  const r = rpr(bold);
  return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${BORDERS}<w:vAlign w:val="center"/></w:tcPr>`
    + `<w:p><w:pPr><w:spacing w:before="40" w:after="40" w:line="276" w:lineRule="auto"/><w:jc w:val="${center ? 'center' : 'left'}"/>${r}</w:pPr>`
    + `<w:r>${r}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p></w:tc>`;
}
function checkCell(w) {
  const r = `<w:rPr><w:rFonts w:ascii="Segoe UI Symbol" w:hAnsi="Segoe UI Symbol" w:cs="Segoe UI Symbol"/><w:sz w:val="36"/><w:szCs w:val="36"/></w:rPr>`;
  return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${BORDERS}<w:vAlign w:val="center"/></w:tcPr>`
    + `<w:p><w:pPr><w:jc w:val="center"/>${r}</w:pPr><w:r>${r}<w:t>\u2611</w:t></w:r></w:p></w:tc>`;
}
function imageCell(rId, uid, w, cx, cy) {
  return `<w:tc><w:tcPr><w:tcW w:w="${w}" w:type="dxa"/>${BORDERS}<w:vAlign w:val="center"/></w:tcPr>`
    + `<w:p><w:pPr><w:spacing w:before="40" w:after="40"/><w:jc w:val="center"/></w:pPr><w:r>${drawingXml(rId, uid, cx, cy)}</w:r></w:p></w:tc>`;
}
function buildTable(shots, media, rels) {
  const cx = Math.round(3.0 * EMU_IN); const cy = Math.round(cx * 900 / 1440);
  const grid = [COLW.tc, COLW.exp, COLW.act, COLW.st].map((w) => `<w:gridCol w:w="${w}"/>`).join('');
  const header = `<w:tr><w:trPr><w:tblHeader/></w:trPr>`
    + textCell('Test Case', COLW.tc, true, false) + textCell('Expected Result', COLW.exp, true, false)
    + textCell('Actual Result', COLW.act, true, true) + textCell('Status', COLW.st, true, true) + `</w:tr>`;
  const rows = TC.map((row, i) => {
    const [test, expected, shotName] = row; const buf = shots[shotName];
    let actCell;
    if (buf) {
      const idx = i + 1; media.push({ name: `media/tcshot${idx}.png`, buf });
      rels.push({ id: `rIdTC${idx}`, target: `tcshot${idx}.png` });
      actCell = imageCell(`rIdTC${idx}`, 9000 + idx, COLW.act, cx, cy);
    } else actCell = textCell('Captured during testing', COLW.act, false, true);
    return `<w:tr>` + textCell(test, COLW.tc, false, false) + textCell(expected, COLW.exp, false, false) + actCell + checkCell(COLW.st) + `</w:tr>`;
  }).join('');
  const tbl = `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="9895" w:type="dxa"/>`
    + `<w:tblBorders>${bd('top')}${bd('left')}${bd('bottom')}${bd('right')}<w:insideH w:val="single" w:sz="4" w:space="0" w:color="000000"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="000000"/></w:tblBorders>`
    + `<w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/></w:tblPr>`
    + `<w:tblGrid>${grid}</w:tblGrid>${header}${rows}</w:tbl>`;
  const cr = `<w:rPr>${TNR}<w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>`;
  const caption = `<w:p><w:pPr><w:spacing w:before="120" w:after="200" w:line="360" w:lineRule="auto"/><w:jc w:val="center"/>${cr}</w:pPr><w:r>${cr}<w:t xml:space="preserve">Table 5.4: Test Cases and Results</w:t></w:r></w:p>`;
  return tbl + caption;
}

// ===================== screenshots / images =====================
async function forceLight(page) {
  await page.evaluate(() => { localStorage.setItem('theme', 'light'); document.documentElement.classList.remove('dark'); document.documentElement.style.colorScheme = 'light'; });
}
async function loginAndShot(page, u, p, url, out, waitFor) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await forceLight(page); await page.waitForTimeout(900);
  await page.fill('#username, input[type="text"]', u); await page.fill('input[type="password"]', p);
  await page.click('button[type="submit"]'); await page.waitForTimeout(3000);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
  await forceLight(page);
  if (waitFor) { try { await page.getByText(waitFor, { exact: false }).first().waitFor({ timeout: 9000 }); } catch (e) { console.warn(`  waitFor "${waitFor}" not seen`); } }
  await page.waitForTimeout(waitFor ? 1500 : 3000);
  await page.screenshot({ path: out, type: 'png', fullPage: false });
}
async function captureShots(browser) {
  const files = {};
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'light' });
  await ctx.addInitScript(() => { localStorage.setItem('theme', 'light'); document.documentElement.classList.remove('dark'); document.documentElement.style.colorScheme = 'light'; });
  const page = await ctx.newPage();
  for (const [name, [who, url, waitFor]] of Object.entries(PAGES)) {
    const out = path.join(TMP, `shot-${name}.png`);
    if (fs.existsSync(out)) { files[name] = out; continue; }
    try {
      if (who === 'public') { await page.goto(`${BASE}${url}`, { waitUntil: 'domcontentloaded', timeout: 25000 }); await forceLight(page); await page.waitForTimeout(1800); await page.screenshot({ path: out, type: 'png' }); }
      else await loginAndShot(page, who, 'admin123', `${BASE}${url}`, out, waitFor);
      files[name] = out; console.log(`shot ${name} OK`);
    } catch (e) { console.warn(`shot ${name} FAILED: ${e.message}`); }
  }
  await ctx.close(); return files;
}
async function buildDiagrams(browser) {
  const out = {};
  for (const [rId, cfg] of Object.entries(FIG)) {
    const cache = path.join(TMP, rId + '.png');
    if (!fs.existsSync(cache)) {
      const ctx = await browser.newContext({ viewport: { width: cfg.w, height: cfg.h }, deviceScaleFactor: cfg.k, colorScheme: 'light' });
      const page = await ctx.newPage(); await page.setContent(cfg.html(), { waitUntil: 'load' }); await page.waitForTimeout(250);
      await page.screenshot({ path: cache, type: 'png', clip: { x: 0, y: 0, width: cfg.w, height: cfg.h } }); await ctx.close();
    }
    out[rId] = fs.readFileSync(cache);
  }
  return out;
}
function b64(f) { return `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`; }
function stackHtml(items, width) {
  const blocks = items.map(([f, label]) => `<div style="margin-bottom:20px"><div style="font-size:24px;font-weight:700;color:#1e293b;margin:0 0 8px 2px">${label}</div><img src="${b64(f)}" style="display:block;width:100%;border:1px solid #cbd5e1;border-radius:8px"/></div>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#fff;width:${width}px;font-family:Arial,Helvetica,sans-serif"><div style="padding:18px 20px">${blocks}</div></body></html>`;
}
function gridHtml(items, width) {
  const cells = items.map(([f, label]) => `<div><div style="font-size:24px;font-weight:700;color:#1e293b;margin:0 0 8px 2px">${label}</div><img src="${b64(f)}" style="display:block;width:100%;border:1px solid #cbd5e1;border-radius:8px"/></div>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#fff;width:${width}px;font-family:Arial,Helvetica,sans-serif"><div style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:22px">${cells}</div></body></html>`;
}
async function renderComposite(browser, html, width, out) {
  const ctx = await browser.newContext({ viewport: { width, height: 600 }, deviceScaleFactor: 2, colorScheme: 'light' });
  const page = await ctx.newPage(); await page.setContent(html, { waitUntil: 'load' }); await page.waitForTimeout(300);
  await page.screenshot({ path: out, type: 'png', fullPage: true }); await ctx.close();
  return fs.readFileSync(out);
}

// ===================== document edits =====================
function insertBefore(xml, anchor, content) {
  const i = xml.indexOf(anchor);
  if (i < 0) { console.warn('anchor not found:', anchor); return xml; }
  const ps = Math.max(xml.lastIndexOf('<w:p>', i), xml.lastIndexOf('<w:p ', i));
  return xml.slice(0, ps) + content + xml.slice(ps);
}
function replaceTableSection(xml, tableXml) {
  const h54 = xml.indexOf('Test Cases and Results');
  const tblStart = xml.indexOf('<w:tbl>', h54);
  const closeIdx = xml.indexOf('All test cases across all modules produced results');
  const paraStart = Math.max(xml.lastIndexOf('<w:p>', closeIdx), xml.lastIndexOf('<w:p ', closeIdx));
  return xml.slice(0, tblStart) + tableXml + xml.slice(paraStart);
}
function setExtent(xml, rId, cx, cy) {
  let e = xml.indexOf(`r:embed="${rId}"`);
  if (e < 0) { console.warn('embed not found', rId); return xml; }
  const ws = xml.lastIndexOf('<wp:extent', e); const we = xml.indexOf('/>', ws) + 2;
  xml = xml.slice(0, ws) + `<wp:extent cx="${cx}" cy="${cy}"/>` + xml.slice(we);
  e = xml.indexOf(`r:embed="${rId}"`);
  const as = xml.indexOf('<a:ext ', e); const ae = xml.indexOf('/>', as) + 2;
  xml = xml.slice(0, as) + `<a:ext cx="${cx}" cy="${cy}"/>` + xml.slice(ae);
  return xml;
}
function setCaptionAfter(xml, rId, fullText) {
  const e = xml.indexOf(`r:embed="${rId}"`);
  if (e < 0) { console.warn('caption anchor missing', rId); return xml; }
  const fi = xml.indexOf('Figure', e);
  if (fi < 0) { console.warn('no Figure caption after', rId); return xml; }
  const ps = Math.max(xml.lastIndexOf('<w:p>', fi), xml.lastIndexOf('<w:p ', fi));
  const pe = xml.indexOf('</w:p>', fi) + 6;
  const para = xml.slice(ps, pe);
  const pPr = (para.match(/<w:pPr>[\s\S]*?<\/w:pPr>/) || [''])[0];
  const rPrM = para.match(/<w:rPr>[\s\S]*?<\/w:rPr>/);
  const rPr = rPrM ? rPrM[0] : `<w:rPr>${TNR}<w:i/><w:iCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>`;
  const np = `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${esc(fullText)}</w:t></w:r></w:p>`;
  return xml.slice(0, ps) + np + xml.slice(pe);
}
function renumberTable(xml, captionText, digit) {
  const ci = xml.indexOf(captionText); if (ci < 0) return xml;
  const ws = Math.max(0, ci - 400); const before = xml.slice(ws, ci);
  const rep = before.replace(/(<w:t[^>]*>)\d(<\/w:t>)(?![\s\S]*<w:t[^>]*>\d<\/w:t>)/, `$1${digit}$2`);
  return rep === before ? xml : xml.slice(0, ws) + rep + xml.slice(ci);
}
function addRels(relsXml, rels) {
  const e = rels.map((r) => `<Relationship Id="${r.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${r.target}"/>`).join('');
  return relsXml.replace('</Relationships>', e + '</Relationships>');
}

async function main() {
  const browser = await chromium.launch();
  const shotFiles = await captureShots(browser);
  const diagrams = await buildDiagrams(browser);

  // composites: unit (vertical stack) + system (2x3 grid of core modules)
  const unitItems = [[shotFiles.login, '(a) Login Form Validation'], [shotFiles.patient, '(b) Patient Registration Validation'], [shotFiles.appointment, '(c) Appointment Scheduling Input']].filter((x) => x[0]);
  const sysItems = [[shotFiles.patient, 'Patient Registration'], [shotFiles.appointment, 'Appointment Scheduling'], [shotFiles.examination, 'Clinical Examination'], [shotFiles.prescription, 'Prescription'], [shotFiles.pharmacy, 'Pharmacy Dispensing'], [shotFiles.billing, 'Billing']].filter((x) => x[0]);
  const unitBuf = await renderComposite(browser, stackHtml(unitItems, 1480), 1480, path.join(TMP, 'unit.png'));
  const sysBuf = await renderComposite(browser, gridHtml(sysItems, 2980), 2980, path.join(TMP, 'system.png'));
  await browser.close();

  const shots = {}; for (const [n, f] of Object.entries(shotFiles)) shots[n] = fs.readFileSync(f);

  console.log('Editing docx...');
  const zip = await JSZip.loadAsync(fs.readFileSync(READ));
  let doc = await zip.files['word/document.xml'].async('string');
  const media = []; const rels = [];

  // 1) module figures into 5.2 (top-to-bottom; re-search each time)
  const modCx = Math.round(4.9 * EMU_IN), modCy = Math.round(4.9 * EMU_IN * 900 / 1440);
  MOD.forEach((m, i) => {
    const [anchor, shot, cap] = m; const buf = shots[shot]; if (!buf) return;
    const idx = i + 1; const rId = `rIdM${idx}`;
    media.push({ name: `media/modshot${idx}.png`, buf }); rels.push({ id: rId, target: `modshot${idx}.png` });
    doc = insertBefore(doc, anchor, figPara(rId, 8000 + idx, modCx, modCy) + captionPara(cap));
  });

  // 2) 5.4 table
  doc = replaceTableSection(doc, buildTable(shots, media, rels));

  // 3) composite extents (fix display size to be large & undistorted)
  const ud = pngDim(unitBuf); const ue = fitExtent(ud.w, ud.h, 4.4, 8.2);
  const sd = pngDim(sysBuf); const se = fitExtent(sd.w, sd.h, 6.3, 8.2);
  doc = setExtent(doc, 'rId5', ue.cx, ue.cy);
  doc = setExtent(doc, 'rId8', se.cx, se.cy);
  console.log('unit', ud, '->', ue, '| system', sd, '->', se);

  // 4) renumber figure captions sequentially
  for (const [rId, text] of Object.entries(FIG_CAPTIONS)) doc = setCaptionAfter(doc, rId, text);

  // 5) renumber following table captions
  doc = renumberTable(doc, ' Use Case Validation', '5');
  doc = renumberTable(doc, ' Security Measures Verification', '6');

  zip.file('word/document.xml', doc);

  let relsXml = await zip.files['word/_rels/document.xml.rels'].async('string');
  relsXml = addRels(relsXml, rels);
  zip.file('word/_rels/document.xml.rels', relsXml);
  for (const m of media) zip.file(`word/${m.name}`, m.buf);

  // swap diagrams (HD) + composites
  for (const [rId, buf] of Object.entries(diagrams)) zip.file(`word/media/${FIG[rId].file}`, buf);
  zip.file('word/media/image2.png', unitBuf);   // rId5 unit composite
  zip.file('word/media/image5.png', sysBuf);    // rId8 system composite

  console.log(`module figs: ${MOD.length}, table images: ${TC.length}, diagrams: ${Object.keys(diagrams).length}`);

  const outBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  for (const c of WRITE_CANDIDATES) {
    try { fs.writeFileSync(c, outBuf); console.log(`Wrote ${c} (${Math.round(outBuf.length / 1024)} KB)`); return; }
    catch (e) { if (e.code === 'EBUSY' || e.code === 'EPERM') { console.warn('locked:', c); continue; } throw e; }
  }
  throw new Error('all output paths locked');
}
main().catch((e) => { console.error(e); process.exit(1); });
