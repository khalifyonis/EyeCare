/**
 * Generate complete Chapter 5 Word document — 20+ pages, light mode screenshots,
 * reference-style diagrams, tables, and expanded content.
 * Run: node scripts/generate-chapter5-docx.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ImageRun,
  VerticalAlign, PageBreak,
} = require('docx');
const C = require('./chapter5-content');
const D = require('./chapter5-diagrams');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'docs', 'chapter5-assets');
const OUT = path.join(ROOT, 'docs', 'CHAPTER_05_IMPLEMENTATION_AND_TESTING_FINAL.docx');
const BASE = process.env.CH5_BASE_URL || 'http://localhost:3000';

const border = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function forceLight(page) {
  await page.evaluate(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  });
}

function imgRun(file, w = 480, h = 280) {
  if (!fs.existsSync(file)) return new Paragraph({ children: [new TextRun({ text: `[Missing: ${path.basename(file)}]`, size: 20 })] });
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 80 },
    children: [new ImageRun({ data: fs.readFileSync(file), transformation: { width: w, height: h }, type: 'png' })],
  });
}

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, bold: true, size: level === HeadingLevel.HEADING_1 ? 28 : 24 })] });
}

function body(text) {
  return new Paragraph({ spacing: { after: 200, line: 360 }, children: [new TextRun({ text, size: 24 })] });
}

function numbered(n, text) {
  return new Paragraph({ spacing: { after: 160, line: 360 }, children: [new TextRun({ text: `${n}. ${text}`, size: 24 })] });
}

function caption(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 280 }, children: [new TextRun({ text, italics: true, size: 22 })] });
}

function tableCaption(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, bold: true, size: 24 })] });
}

function cell(text, opts = {}) {
  return new TableCell({
    borders,
    verticalAlign: VerticalAlign.CENTER,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(text), size: 20, bold: !!opts.bold })],
    })],
  });
}

function imgCell(file, w = 80, h = 52) {
  if (!fs.existsSync(file)) return cell('—', { center: true });
  return new TableCell({
    borders, verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
      new ImageRun({ data: fs.readFileSync(file), transformation: { width: w, height: h }, type: 'png' }),
    ] })],
  });
}

function makeTable(headers, rows, colWidths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headers.map((h, i) => cell(h, { bold: true, width: colWidths[i], center: i === headers.length - 1 })) }),
      ...rows.map((row) => new TableRow({
        children: row.map((c, i) => (typeof c === 'object' && c.img ? imgCell(c.img, c.w, c.h) : cell(c, { width: colWidths[i], center: i === row.length - 1 }))),
      })),
    ],
  });
}

async function renderHtml(page, html, outFile, selector = 'body', viewport = { width: 720, height: 400 }) {
  await page.setViewportSize(viewport);
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.locator(selector).first().screenshot({ path: outFile, type: 'png' });
}

async function loginAndShot(page, username, password, url, outFile) {
  try {
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle', timeout: 20000 });
    await forceLight(page);
    await page.waitForTimeout(800);
    await page.fill('#username, input[type="text"]', username);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
    await forceLight(page);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: outFile, type: 'png', fullPage: false });
    return true;
  } catch (e) {
    console.warn(`Screenshot failed ${url}:`, e.message);
    return false;
  }
}

async function shotPublic(page, url, outFile) {
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
    await forceLight(page);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: outFile, type: 'png' });
    return true;
  } catch {
    return false;
  }
}

function compositeHtml(images, height = 320) {
  const toB64 = (f) => `data:image/png;base64,${fs.readFileSync(f).toString('base64')}`;
  const imgs = images.filter((f) => fs.existsSync(f)).map((f) => `<img src="${toB64(f)}" style="height:${height}px;border:1px solid #e2e8f0;border-radius:6px" />`).join('');
  return `<!DOCTYPE html><html><head><style>body{margin:0;padding:14px;background:#fff;display:flex;gap:10px;align-items:flex-start}</style></head><body>${imgs}</body></html>`;
}

async function generateAssets() {
  ensureDir(ASSETS);
  const browser = await chromium.launch();
  const context = await browser.newContext({
    colorScheme: 'light',
    viewport: { width: 1440, height: 900 },
  });
  await context.addInitScript(() => {
    localStorage.setItem('theme', 'light');
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  });
  const page = await context.newPage();

  const s = (name) => path.join(ASSETS, name);
  const shots = {
    login: s('fig-login.png'),
    patient: s('fig-patient.png'),
    patientList: s('fig-patients-list.png'),
    appointment: s('fig-appointment.png'),
    calendar: s('fig-calendar.png'),
    examination: s('fig-examination.png'),
    prescription: s('fig-prescription.png'),
    billing: s('fig-billing.png'),
    reports: s('fig-reports.png'),
    pharmacy: s('fig-pharmacy.png'),
    optical: s('fig-optical.png'),
    adminUsers: s('fig-admin-users.png'),
    permissions: s('fig-permissions.png'),
    auditLog: s('fig-audit-log.png'),
    receptionDash: s('fig-reception-dash.png'),
    doctorDash: s('fig-doctor-dash.png'),
    fig51: s('figure-5-1-composite.png'),
    fig52: s('figure-5-2-integration.png'),
    fig53: s('figure-5-3-composite.png'),
    fig54: s('figure-5-4-uat.png'),
    fig55: s('figure-5-5-validation.png'),
    fig56: s('figure-5-6-architecture.png'),
    fig57: s('figure-5-7-workflow.png'),
  };

  await shotPublic(page, `${BASE}/login`, shots.login);

  const captures = [
    ['reception1', 'admin123', '/dashboard/patients/new', shots.patient],
    ['reception1', 'admin123', '/dashboard/patients', shots.patientList],
    ['reception1', 'admin123', '/dashboard/appointments/new', shots.appointment],
    ['reception1', 'admin123', '/dashboard/appointments/calendar', shots.calendar],
    ['reception1', 'admin123', '/dashboard/billing', shots.billing],
    ['reception1', 'admin123', '/dashboard/receptionist', shots.receptionDash],
    ['doctor1', 'admin123', '/dashboard/eye-examinations', shots.examination],
    ['doctor1', 'admin123', '/dashboard/prescription/medicine', shots.prescription],
    ['doctor1', 'admin123', '/dashboard/doctor', shots.doctorDash],
    ['pharmacist1', 'admin123', '/dashboard/pharmacy', shots.pharmacy],
    ['optician1', 'admin123', '/dashboard/optical-shop', shots.optical],
    ['admin', 'admin123', '/dashboard/reports', shots.reports],
    ['admin', 'admin123', '/dashboard/admin/users', shots.adminUsers],
    ['admin', 'admin123', '/dashboard/admin/permissions', shots.permissions],
    ['admin', 'admin123', '/dashboard/audit-log', shots.auditLog],
  ];

  for (const [user, pass, url, file] of captures) {
    await loginAndShot(page, user, pass, `${BASE}${url}`, file);
  }

  // Composites
  await page.setContent(compositeHtml([shots.login, shots.patient, shots.appointment], 300), { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.locator('body').screenshot({ path: shots.fig51, type: 'png' });

  await page.setContent(compositeHtml([shots.login, shots.calendar, shots.examination, shots.billing], 280), { waitUntil: 'load' });
  await page.waitForTimeout(400);
  await page.locator('body').screenshot({ path: shots.fig53, type: 'png' });

  // Reference-style diagrams
  await renderHtml(page, D.integrationDiagramHtml(), shots.fig52, 'body', { width: 760, height: 280 });
  await renderHtml(page, D.uatDiagramHtml(), shots.fig54, 'body', { width: 760, height: 260 });
  await renderHtml(page, D.validationDiagramHtml(), shots.fig55, 'body', { width: 760, height: 300 });
  await renderHtml(page, D.architectureDiagramHtml(), shots.fig56, 'body', { width: 600, height: 420 });
  await renderHtml(page, D.clinicWorkflowHtml(), shots.fig57, 'body', { width: 760, height: 200 });

  await browser.close();
  return shots;
}

function shotForTest(name, shots) {
  const map = {
    login: shots.login,
    patient: shots.patient,
    appointment: shots.appointment,
    examination: shots.examination,
    prescription: shots.prescription,
    pharmacy: shots.pharmacy,
    optical: shots.optical,
    billing: shots.billing,
    reports: shots.reports,
    permissions: shots.permissions,
    audit: shots.auditLog,
    calendar: shots.calendar,
  };
  return map[name] || shots.login;
}

function buildDocument(shots) {
  const tcImgs = [
    'login', 'login', 'login', 'patient', 'appointment', 'appointment',
    'examination', 'prescription', 'prescription', 'pharmacy', 'pharmacy',
    'optical', 'billing', 'examination', 'permissions', 'pharmacy',
    'calendar', 'patient', 'audit', 'reports',
  ];

  const children = [
    new Paragraph({ children: [new PageBreak()] }),
    heading('CHAPTER FIVE'),
    heading('SYSTEMS IMPLEMENTATION & OPERATION', HeadingLevel.HEADING_2),
    ...C.intro.map(body),

    heading('5.1 Implementation Tools and Environment', HeadingLevel.HEADING_2),
    body('The EyeCare system was developed on a standard development workstation using modern web technologies. The following tools and platforms were used during the implementation phase. Table 5.1 lists the primary development tools, Table 5.2 summarises hardware requirements, and Table 5.3 lists software requirements.'),
    tableCaption('Table 5.1 Implementation Tools'),
    makeTable(['Tool / Platform', 'Purpose'], C.implTools, [32, 68]),
    tableCaption('Table 5.2 Hardware Requirements'),
    makeTable(['No.', 'Item', 'Qty', 'Description'], C.hardware, [8, 22, 10, 60]),
    tableCaption('Table 5.3 Software Requirements'),
    makeTable(['No.', 'Requirement', 'Description'], C.software, [8, 25, 67]),
    body('Figure 5.6 illustrates the three-tier architecture adopted for the EyeCare system, showing the separation between presentation, application, and data layers.'),
    imgRun(shots.fig56, 460, 340),
    caption('Figure 5.1: EyeCare System — Three-Tier Architecture'),

    heading('5.2 System Setup and Deployment Steps', HeadingLevel.HEADING_2),
    body('The following steps were followed to set up, configure, and deploy the EyeCare Management System in the development environment:'),
    ...C.setupSteps.map(([title, desc], i) => [
      numbered(i + 1, `${title} — ${desc}`),
    ]).flat(),
    body('Deployment commands executed from the project root directory:'),
    body('npm run install-all'),
    body('cd backend && npx prisma migrate deploy && npm run seed'),
    body('npm run dev'),
    body('After successful startup, the backend API is available at http://localhost:5000 and the frontend web application at http://localhost:3000.'),

    heading('5.3 System Operations', HeadingLevel.HEADING_2),
    body('After deployment, the EyeCare system operates according to the role assignments defined in the use case diagram. Each user role has specific responsibilities and access boundaries. The following sections describe how each role interacts with the system in a live clinic environment.'),
    ...C.operations.flatMap(([role, desc], i) => [
      heading(`5.3.${i + 1} ${role} Operations`, HeadingLevel.HEADING_3),
      body(desc),
    ]),
    imgRun(shots.receptionDash, 480, 270),
    caption('Figure 5.2: Receptionist Dashboard — Light Mode Interface'),
    imgRun(shots.doctorDash, 480, 270),
    caption('Figure 5.3: Doctor Dashboard — Light Mode Interface'),

    heading('5.4 Coding and Modules', HeadingLevel.HEADING_2),
    body('The system was structured into eighteen modular components for maintainability, testability, and separation of concerns. Each module consists of a route file, controller file, and corresponding Prisma models. Table 5.4 summarises all implemented modules.'),
    tableCaption('Table 5.4 System Modules'),
    makeTable(['Module', 'API Route', 'Controller', 'Description'], C.modules, [18, 20, 22, 40]),
    body('Table 5.5 lists representative REST API endpoints implemented in the backend server.'),
    tableCaption('Table 5.5 Representative API Endpoints'),
    makeTable(['Method', 'Endpoint', 'Description'], C.apiEndpoints, [12, 30, 58]),
    body('Table 5.6 describes the core database tables created through Prisma migrations.'),
    tableCaption('Table 5.6 Database Tables'),
    makeTable(['Table Name', 'Prisma Model', 'Description'], C.dbTables, [22, 20, 58]),
    ...C.modules.slice(0, 6).map(([name, , , desc]) => body(`${name}: ${desc}`)),

    new Paragraph({ children: [new PageBreak()] }),
    ...C.modules.slice(6).map(([name, , , desc]) => body(`${name}: ${desc}`)),
    imgRun(shots.permissions, 480, 270),
    caption('Figure 5.4: Role Permission Configuration — Super Admin Module'),

    heading('5.5 Testing Strategy', HeadingLevel.HEADING_2),
    heading('5.5.1 Purpose of Testing', HeadingLevel.HEADING_3),
    body('System testing was conducted to verify that all implemented functionalities work correctly and meet the functional and non-functional requirements defined during the analysis and design phases in Chapter Four. The aim was to ensure that all six user roles — Receptionist, Doctor, Pharmacist, Optician, Administrator, and Super Admin — behave as expected under real clinic usage conditions, and that each role can perform only the tasks assigned to them in the use case diagram.'),
    body('Testing also verified that the Receptionist exclusively handles patient registration, appointment scheduling, and billing, while the Doctor handles clinical examinations and prescription management without access to scheduling or billing functions.'),

    heading('5.5.2 Types of Testing Performed', HeadingLevel.HEADING_3),

    heading('5.5.2.1 Unit Testing', HeadingLevel.HEADING_3),
    body('Unit testing focused on individual components and functions in isolation. Login form validation, patient registration form field validation, appointment scheduling inputs, billing calculations, and Joi schema validation on API endpoints were all tested independently. Table 5.7 summarises unit test results.'),
    tableCaption('Table 5.7 Unit Test Results'),
    makeTable(['Test Case', 'Expected Result', 'Status'], C.unitTests, [40, 45, 15]),
    imgRun(shots.fig51, 500, 220),
    caption('Figure 5.5: Screenshots of Tested Components (Login, Patient Registration, and Appointment Scheduling)'),

    heading('5.5.2.2 Integration Testing', HeadingLevel.HEADING_3),
    body('Integration testing verified that different modules work together correctly. Authentication middleware was tested with protected routes. Patient-to-appointment linking, appointment-to-examination workflows, prescription-to-pharmacy dispensing, and dispensing-to-billing integration were all validated. Table 5.8 presents integration test results.'),
    tableCaption('Table 5.8 Integration Test Results'),
    makeTable(['Integration Test', 'Expected Behaviour', 'Status'], C.integrationTests, [35, 50, 15]),
    imgRun(shots.fig52, 480, 200),
    caption('Figure 5.6: Integration Testing — Login, JWT Authentication, PostgreSQL, and Dashboard'),

    heading('5.5.2.3 System Testing', HeadingLevel.HEADING_3),
    body('System testing covered the complete end-to-end clinic workflow. The full patient journey — from registration through appointment, examination, prescription, dispensing, and billing — was executed and verified. Figure 5.3 shows screenshots from the system testing flow.'),
    imgRun(shots.fig57, 500, 140),
    caption('Figure 5.7: Clinic Workflow — End-to-End System Testing Sequence'),
    imgRun(shots.fig53, 500, 220),
    caption('Figure 5.8: System Testing Flow Demonstrating Full End-to-End Functionality'),

    heading('5.5.2.4 User Acceptance Testing (UAT)', HeadingLevel.HEADING_3),
    body('User Acceptance Testing was conducted with team members representing each clinic role. Participants used the live system to perform their daily tasks and provided feedback on usability, performance, and error handling. Table 5.9 lists UAT participants and their feedback.'),
    tableCaption('Table 5.9 UAT Participants and Feedback'),
    makeTable(['Role', 'Participant', 'Tasks Tested', 'Feedback'], C.uatParticipants, [18, 22, 30, 30]),
    imgRun(shots.fig54, 480, 200),
    caption('Figure 5.9: User Acceptance Testing Process and Feedback Flow'),

    heading('5.6 Test Cases and Results', HeadingLevel.HEADING_2),
    body('Table 5.10 presents the comprehensive test case results from system testing. Each test case includes the test description, expected result, a screenshot from the live system (light mode), and pass/fail status.'),
    tableCaption('Table 5.10 Testing Results'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [
          cell('Test Case', { bold: true, width: 28 }),
          cell('Expected Result', { bold: true, width: 32 }),
          cell('Screenshot', { bold: true, center: true, width: 22 }),
          cell('Status', { bold: true, center: true, width: 18 }),
        ] }),
        ...C.testCases.map(([tc, exp, st], i) => new TableRow({
          children: [
            cell(tc),
            cell(exp),
            imgCell(shotForTest(tcImgs[i], shots), 90, 58),
            cell(st, { center: true }),
          ],
        })),
      ],
    }),

    new Paragraph({ children: [new PageBreak()] }),

    heading('5.7 Validation and Verification', HeadingLevel.HEADING_2),
    body('Validation ensures that the right system was built — that all requirements from Chapter Four are satisfied. Verification ensures the system was built correctly — that the implementation matches the design specifications including the ERD, use case diagram, and system architecture.'),
    body('Table 5.11 validates each use case from the use case diagram against the implemented system.'),
    tableCaption('Table 5.11 Use Case Validation'),
    makeTable(['Actor', 'Use Case', 'Status'], C.useCaseValidation, [25, 55, 20]),
    body('Table 5.12 documents the security measures implemented and verified during testing.'),
    tableCaption('Table 5.12 Security Measures Verification'),
    makeTable(['Security Measure', 'Implementation', 'Verified'], C.securityMeasures, [28, 52, 20]),
    imgRun(shots.fig55, 480, 220),
    caption('Figure 5.10: Validation and Verification Flow with Security Enforcement'),

    heading('5.8 Implementation Challenges and Solutions', HeadingLevel.HEADING_2),
    body('During implementation, several technical challenges were encountered and resolved. Table 5.13 documents these challenges and the solutions adopted.'),
    tableCaption('Table 5.13 Implementation Challenges and Solutions'),
    makeTable(['Challenge', 'Solution'], C.challenges.map(([a, b]) => [a, b]), [30, 70]),
    imgRun(shots.auditLog, 480, 270),
    caption('Figure 5.11: Activity and Audit Log Viewer'),

    heading('5.9 Chapter Summary', HeadingLevel.HEADING_2),
    ...C.summary.map(body),
  ];

  return new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children,
    }],
  });
}

async function main() {
  console.log('Generating Chapter 5 assets (light mode screenshots & diagrams)...');
  const shots = await generateAssets();
  console.log('Building expanded Word document (20+ pages)...');
  const doc = buildDocument(shots);
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT, buffer);
  const kb = Math.round(buffer.length / 1024);
  console.log(`Wrote ${OUT} (${kb} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
