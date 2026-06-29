/**
 * Generate Chapters 6 & 7 Word document — Results, Discussion, Conclusion, Future Work.
 * Run: node scripts/generate-chapter6-7-docx.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ImageRun,
  VerticalAlign, PageBreak,
} = require('docx');
const C = require('./chapter6-7-content');
const CHARTS = require('./chapter6-7-diagrams');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'docs', 'chapter6-7-assets');
const CH5_ASSETS = path.join(ROOT, 'docs', 'chapter5-assets');
const OUT = path.join(ROOT, 'docs', 'CHAPTER_06_07_RESULTS_AND_CONCLUSION.docx');

const border = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, bold: true, size: level === HeadingLevel.HEADING_1 ? 28 : 24 })] });
}
function body(text) {
  return new Paragraph({ spacing: { after: 200, line: 360 }, children: [new TextRun({ text, size: 24 })] });
}
function bullet(text) {
  return new Paragraph({ spacing: { after: 140, line: 360 }, children: [new TextRun({ text: `• ${text}`, size: 24 })] });
}
function caption(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 80, after: 280 }, children: [new TextRun({ text, italics: true, size: 22 })] });
}
function tableCaption(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, bold: true, size: 24 })] });
}
function cell(text, opts = {}) {
  return new TableCell({
    borders, verticalAlign: VerticalAlign.CENTER,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [new Paragraph({ alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun({ text: String(text), size: 20, bold: !!opts.bold })] })],
  });
}
function imgRun(file, w = 460, h = 260) {
  if (!fs.existsSync(file)) return new Paragraph({ children: [new TextRun({ text: '[Figure pending]', size: 20 })] });
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 80 }, children: [
    new ImageRun({ data: fs.readFileSync(file), transformation: { width: w, height: h }, type: 'png' }),
  ] });
}
function makeTable(headers, rows, widths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headers.map((h, i) => cell(h, { bold: true, width: widths[i], center: i === headers.length - 1 })) }),
      ...rows.map((row) => new TableRow({ children: row.map((c, i) => cell(c, { width: widths[i], center: i === row.length - 1 })) })),
    ],
  });
}

async function renderHtml(page, html, outFile, viewport = { width: 640, height: 360 }) {
  await page.setViewportSize(viewport);
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.locator('body').screenshot({ path: outFile, type: 'png' });
}

async function generateAssets() {
  ensureDir(ASSETS);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const fig = (n) => path.join(ASSETS, n);

  await renderHtml(page, CHARTS.uatChart(), fig('fig-uat-chart.png'), { width: 680, height: 320 });
  await renderHtml(page, CHARTS.testPassChart(), fig('fig-test-chart.png'), { width: 680, height: 320 });
  await renderHtml(page, CHARTS.comparisonChart(), fig('fig-comparison.png'), { width: 620, height: 340 });
  await renderHtml(page, CHARTS.metricsGauge(), fig('fig-metrics.png'), { width: 540, height: 320 });

  await browser.close();
  return {
    uatChart: fig('fig-uat-chart.png'),
    testChart: fig('fig-test-chart.png'),
    comparison: fig('fig-comparison.png'),
    metrics: fig('fig-metrics.png'),
    dashboard: path.join(CH5_ASSETS, 'fig-reception-dash.png'),
    reports: path.join(CH5_ASSETS, 'fig-reports.png'),
    billing: path.join(CH5_ASSETS, 'fig-billing.png'),
    examination: path.join(CH5_ASSETS, 'fig-examination.png'),
  };
}

function buildDocument(figs) {
  const ch6 = [
    new Paragraph({ children: [new PageBreak()] }),
    heading('CHAPTER SIX'),
    heading('RESULTS AND DISCUSSION', HeadingLevel.HEADING_2),
    ...C.ch6Intro.map(body),

    heading('6.1 Results Presentation', HeadingLevel.HEADING_2),
    body('The implementation of the EyeCare (Al-Ixsaan) Management System produced tangible results that directly address the issues identified in the problem statement. The system was evaluated through module completion assessment, comprehensive testing (documented in Chapter Five), user acceptance testing, and comparison with existing approaches. This section presents the key quantitative and qualitative results.'),
    tableCaption('Table 6.1 Module Implementation Results'),
    makeTable(['Module', 'Scope', 'Completion', 'Status'], C.moduleResults, [22, 38, 15, 25]),
    body('All thirteen planned modules were implemented to 100% completion. Each module was verified through functional testing before integration into the complete system workflow.'),
    tableCaption('Table 6.2 Testing Summary (from Chapter Five)'),
    makeTable(['Test Category', 'Total Checks', 'Passed', 'Failed', 'Pass Rate'], C.testingSummary, [28, 14, 12, 10, 16]),
    imgRun(figs.testChart, 480, 240),
    caption('Figure 6.1: Testing Pass Rate by Category'),
    tableCaption('Table 6.3 UAT Satisfaction Ratings'),
    makeTable(['Role', 'Aspect Evaluated', 'Rating', 'Assessment'], C.uatSatisfaction, [18, 32, 15, 35]),
    imgRun(figs.uatChart, 480, 240),
    caption('Figure 6.2: UAT Satisfaction Ratings by Role'),
    tableCaption('Table 6.4 System Performance Results'),
    makeTable(['Operation', 'Target', 'Measured', 'Status'], C.performanceResults, [30, 18, 22, 15]),
    tableCaption('Table 6.5 Role Workflow Verification'),
    makeTable(['Role', 'Function', 'Expected Access', 'Actual Access', 'Status'], C.roleVerification, [18, 28, 18, 18, 18]),
    body('Role workflow verification confirms the critical design decision that the Receptionist — not the Doctor — handles appointment scheduling and billing, while the Doctor exclusively handles clinical examinations and prescriptions.'),
    body('Figure 6.3 shows the Receptionist dashboard in light mode after successful deployment, demonstrating the implemented patient management and appointment modules.'),
    imgRun(figs.dashboard, 480, 270),
    caption('Figure 6.3: Receptionist Dashboard — Implemented System'),
    imgRun(figs.examination, 480, 270),
    caption('Figure 6.4: Clinical Examination Module — Doctor Interface'),
    imgRun(figs.billing, 480, 270),
    caption('Figure 6.5: Billing Module — Receptionist Interface'),
    imgRun(figs.reports, 480, 270),
    caption('Figure 6.6: Reports Module — Administrator Interface'),
    tableCaption('Table 6.6 Stakeholder Benefits'),
    makeTable(['Stakeholder', 'Benefits Gained'], C.stakeholderBenefits, [25, 75]),

    new Paragraph({ children: [new PageBreak()] }),

    heading('6.2 Research Questions — Answers', HeadingLevel.HEADING_2),
    body('This section answers the four research questions defined in Chapter One, based on the analysis, design, implementation, and testing results presented in Chapters Three through Five.'),
    ...C.researchQuestions.flatMap(({ q, a }) => [body(q), body(a)]),

    heading('6.3 Research Objectives — Achievement', HeadingLevel.HEADING_2),
    body('Each of the six research objectives stated in Chapter One is evaluated below against the actual project outcomes.'),
    ...C.objectives.flatMap(([title, obj, result]) => [
      body(`${title}: ${obj}`),
      body(result),
    ]),

    heading('6.4 Key Outcomes', HeadingLevel.HEADING_2),
    body('The following key outcomes were achieved during the design, implementation, and evaluation of the EyeCare system:'),
    ...C.keyOutcomes.map(bullet),

    heading('6.5 Comparison with Existing Systems', HeadingLevel.HEADING_2),
    body('The EyeCare system was compared against manual/paper-based clinic processes and generic Hospital Management Systems (HMS) reviewed in Chapter Two. Table 6.4 presents a detailed feature comparison.'),
    tableCaption('Table 6.7 Comparison with Existing Systems'),
    makeTable(['Feature / Capability', 'Manual System', 'Generic HMS', 'EyeCare System'], C.comparison.slice(1), [28, 22, 22, 28]),
    imgRun(figs.comparison, 480, 280),
    caption('Figure 6.7: System Capability Comparison Chart'),
    body('The EyeCare system demonstrates clear advantages over manual processes in every category. Compared to generic HMS platforms, it offers ophthalmology-specific examination forms, dual prescription types (medicine and optical), integrated optical shop inventory, six-role RBAC with configurable permissions, multi-branch support, and real-time Socket.io notifications — features typically absent from general-purpose hospital systems.'),

    heading('6.6 Limitations Identified', HeadingLevel.HEADING_2),
    body('During evaluation, several limitations were identified. While these do not prevent the system from meeting its current objectives, they represent areas for improvement in future iterations.'),
    tableCaption('Table 6.8 System Limitations and Mitigations'),
    makeTable(['Limitation', 'Impact', 'Severity', 'Proposed Mitigation'], C.limitations, [25, 30, 12, 33]),

    heading('6.7 Evaluation Metrics', HeadingLevel.HEADING_2),
    body('The system was evaluated using the metrics defined in the methodology and aligned with the Faculty of Computer Science & IT thesis guidelines. Table 6.5 summarises the evaluation results.'),
    tableCaption('Table 6.9 Evaluation Metrics'),
    makeTable(['Metric', 'Measure', 'Result', 'Rating'], C.evaluationMetrics, [22, 32, 22, 24]),
    imgRun(figs.metrics, 460, 280),
    caption('Figure 6.8: Evaluation Metrics Summary Dashboard'),

    heading('6.8 Discussion of Findings', HeadingLevel.HEADING_2),
    ...C.discussion.map(body),

    heading('6.9 Chapter Summary', HeadingLevel.HEADING_2),
    ...C.ch6Summary.map(body),
  ];

  const ch7 = [
    new Paragraph({ children: [new PageBreak()] }),
    heading('CHAPTER SEVEN'),
    heading('CONCLUSION & FUTURE WORK', HeadingLevel.HEADING_2),
    ...C.ch7Intro.map(body),

    heading('7.1 Summary of Key Findings', HeadingLevel.HEADING_2),
    body('The following key findings summarise the outcomes of this research project:'),
    ...C.keyFindings.map(bullet),

    heading('7.2 Conclusion', HeadingLevel.HEADING_2),
    ...C.conclusion.map(body),

    heading('7.3 Recommendations', HeadingLevel.HEADING_2),
    body('Based on the findings and evaluation results, the following recommendations are made for the adoption and continued use of the EyeCare (Al-Ixsaan) Management System:'),
    tableCaption('Table 7.1 Recommendations'),
    makeTable(['No.', 'Area', 'Recommendation'], C.recommendations, [8, 22, 70]),
    ...C.recommendations.map(([n, , rec]) => body(`${n}. ${rec}`)),

    heading('7.4 Future Work', HeadingLevel.HEADING_2),
    body('Although the EyeCare system is fully functional and meets all project objectives, the following enhancements are recommended for future development to increase its scope, accessibility, and impact:'),
    tableCaption('Table 7.2 Future Work'),
    makeTable(['No.', 'Enhancement Area', 'Description'], C.futureWork, [8, 25, 67]),
    ...C.futureWork.map(([n, area, desc]) => body(`${n}. ${area} — ${desc}`)),

    heading('7.5 Chapter Summary', HeadingLevel.HEADING_2),
    ...C.ch7Summary.map(body),
  ];

  return new Document({
    sections: [{
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [...ch6, ...ch7],
    }],
  });
}

async function main() {
  console.log('Generating Chapter 6 & 7 assets...');
  const figs = await generateAssets();
  console.log('Building Word document...');
  const doc = buildDocument(figs);
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT, buffer);
  console.log(`Wrote ${OUT} (${Math.round(buffer.length / 1024)} KB)`);
}

main().catch((err) => { console.error(err); process.exit(1); });
