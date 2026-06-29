/**
 * Generate preface pages (front matter) before Chapter 1 — JU Hall / MCH style.
 * Run: node scripts/generate-preface-docx.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, BorderStyle, PageBreak, TabStopType,
  ImageRun, VerticalAlign, TableLayoutType,
} = require('docx');
const CFG = require('./thesis-config');
const titleHeaderHtml = require('./preface-header');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'docs', 'preface-assets');
const OUT = path.join(ROOT, 'docs', 'PREFACE_PAGES_FINAL.docx');

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function center(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: opts.spacing || { before: opts.before ?? 0, after: opts.after ?? 200 },
    children: [new TextRun({
      text,
      size: opts.size ?? 24,
      bold: !!opts.bold,
      italics: !!opts.italics,
      font: opts.font || 'Times New Roman',
    })],
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    alignment: opts.justify ? AlignmentType.JUSTIFIED : (opts.center ? AlignmentType.CENTER : AlignmentType.LEFT),
    spacing: { before: opts.before ?? 0, after: opts.after ?? 200, line: opts.line ?? 360 },
    children: [new TextRun({
      text,
      size: opts.size ?? 24,
      bold: !!opts.bold,
      font: 'Times New Roman',
    })],
  });
}

function sectionTitle(text) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 400 },
    children: [new TextRun({ text, bold: true, size: 28, font: 'Times New Roman' })],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function cellPara(text, opts = {}) {
  return new Paragraph({
    alignment: opts.right ? AlignmentType.RIGHT : (opts.center ? AlignmentType.CENTER : AlignmentType.LEFT),
    spacing: { after: 60 },
    children: [new TextRun({
      text,
      size: opts.size ?? 24,
      bold: !!opts.bold,
      font: 'Times New Roman',
    })],
  });
}

function plainCell(children, opts = {}) {
  return new TableCell({
    borders: noBorders,
    verticalAlign: VerticalAlign.CENTER,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    margins: { top: 40, bottom: 40, left: opts.left ?? 80, right: opts.right ?? 80 },
    children: Array.isArray(children) ? children : [children],
  });
}

function tocRow(section, page, bold = false) {
  return new Paragraph({
    spacing: { after: 80, line: 320 },
    tabStops: [{ type: TabStopType.RIGHT, position: 9000 }],
    children: [
      new TextRun({ text: section, bold, size: bold ? 24 : 22, font: 'Times New Roman' }),
      new TextRun({ text: '\t', size: 22 }),
      new TextRun({ text: page || '', size: 22, font: 'Times New Roman' }),
    ],
  });
}

function abbrevRow(symbol, meaning) {
  return new Paragraph({
    spacing: { after: 80, line: 300 },
    tabStops: [{ type: TabStopType.LEFT, position: 2400 }],
    children: [
      new TextRun({ text: symbol, bold: true, size: 22, font: 'Times New Roman' }),
      new TextRun({ text: '\t', size: 22 }),
      new TextRun({ text: meaning, size: 22, font: 'Times New Roman' }),
    ],
  });
}

async function renderTitleHeader() {
  ensureDir(ASSETS);
  const outFile = path.join(ASSETS, 'ju-title-header.png');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 760, height: 140 });
  await page.setContent(titleHeaderHtml(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
  await page.locator('body').screenshot({ path: outFile, type: 'png' });
  await browser.close();
  return outFile;
}

function headerImage(file) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 320 },
    children: [
      new ImageRun({
        data: fs.readFileSync(file),
        transformation: { width: 520, height: 96 },
        type: 'png',
      }),
    ],
  });
}

function buildTitlePage(headerFile) {
  const candidateRows = CFG.candidates.map((c, i) => new TableRow({
    children: [
      plainCell(cellPara(`${i + 1}. ${c.name}`, { size: 24 }), { width: 58, left: 200 }),
      plainCell(cellPara(`ID No ${c.id}`, { size: 24, right: true }), { width: 42, right: 200 }),
    ],
  }));

  return [
    headerImage(headerFile),
    center('FACULTY OF COMPUTER SCIENCE AND INFORMATION TECHNOLOGY', { size: 26, bold: true, after: 480 }),
    center(CFG.projectTitle.toUpperCase(), { size: 30, bold: true, after: 480 }),
    center('CANDIDATES', { size: 26, bold: true, after: 240 }),
    new Table({
      width: { size: 85, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: {
        top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
        insideHorizontal: noBorder, insideVertical: noBorder,
      },
      rows: candidateRows,
    }),
    center('', { after: 480 }),
    center(
      'A RESEARCH PROJECT SUBMITTED IN PARTIAL FULFILMENT OF THE REQUIREMENTS FOR THE AWARD OF THE DEGREE OF BACHELOR OF COMPUTER SCIENCE AND IT OF JAZEERA UNIVERSITY',
      { size: 22, bold: true, after: 480 },
    ),
    center('SUPERVISOR', { size: 26, bold: true, after: 160 }),
    center(`Eng: ${CFG.supervisor.replace(/^Eng\.?\s*/i, '')}`, { size: 24, bold: true, after: 320 }),
    center(CFG.submissionDate.toUpperCase(), { size: 24, bold: true, after: 200 }),
  ];
}

const DECLARATION_POINTS = [
  'We are the authors/writers of this work.',
  'This work is original.',
  'Any use of any work in which copyright exists was done by way of fair dealing and for such purposes as private study, criticism and review, as well as for the reporting of current events.',
  'We do not have any actual knowledge nor ought we reasonably to know that the making of this work constitutes an infringement of any copyright work.',
  'We hereby assign all and every rights in the copyright to this work to Jazeera University (JU) and such other rights as may be protected by copyright to JU absolutely.',
];

function buildDeclaration() {
  const blocks = [
    pageBreak(),
    sectionTitle('DECLARATION'),
  ];

  CFG.candidates.forEach((c, i) => {
    blocks.push(body(`Name of Candidate ${i + 1}: ${c.name}     ID No: ${c.id}`, { after: 140 }));
  });

  blocks.push(
    body(`Name of Degree: ${CFG.degree}`, { after: 120 }),
    body(`Title of Project Paper: ${CFG.projectTitle}`, { after: 120 }),
    body(`Field of Study: ${CFG.fieldOfStudy}`, { after: 280 }),
    body('We, the undersigned, do solemnly and sincerely declare that:', { after: 200 }),
  );

  DECLARATION_POINTS.forEach((point, i) => {
    blocks.push(body(`${i + 1}. ${point}`, { after: 140 }));
  });

  blocks.push(body('', { after: 280 }));

  // Signature rows — two columns
  const sigRows = [];
  for (let i = 0; i < CFG.candidates.length; i += 2) {
    const left = CFG.candidates[i];
    const right = CFG.candidates[i + 1];
    sigRows.push(new TableRow({
      children: [
        plainCell([
          body(`Candidate ${i + 1}'s Signature: _________________________`, { after: 80 }),
          body(left.name, { size: 22, after: 200 }),
        ], { width: 50 }),
        plainCell(right ? [
          body(`Candidate ${i + 2}'s Signature: _________________________`, { after: 80 }),
          body(right.name, { size: 22, after: 200 }),
        ] : [body('', { after: 200 })], { width: 50 }),
      ],
    }));
  }

  blocks.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
      insideHorizontal: noBorder, insideVertical: noBorder,
    },
    rows: sigRows,
  }));

  blocks.push(
    body('Subscribed and solemnly declared before', { before: 200, after: 200 }),
    body('Date: _________________________', { after: 320 }),
    body(`Supervisor: ${CFG.supervisor}`, { after: 120 }),
    body("Supervisor's Signature: _________________________     Date: _________________________", { after: 200 }),
  );

  return blocks;
}

function buildAbstract() {
  return [
    pageBreak(),
    sectionTitle('ABSTRACT'),
    ...CFG.abstract.split('\n\n').map((p) => body(p, { justify: true, after: 240, line: 400 })),
  ];
}

function buildAcknowledgements() {
  return [
    pageBreak(),
    sectionTitle('ACKNOWLEDGEMENTS'),
    ...CFG.acknowledgements.split('\n\n').map((p) => body(p, { justify: true, after: 240, line: 400 })),
  ];
}

function buildTableOfContents() {
  return [
    pageBreak(),
    sectionTitle('TABLE OF CONTENTS'),
    ...CFG.toc.map((item) => tocRow(item.section, item.page, !!item.bold)),
  ];
}

function buildListOfFigures() {
  return [
    pageBreak(),
    sectionTitle('LIST OF FIGURES'),
    ...CFG.figures.map(([num, title], i) => tocRow(`${num}: ${title}`, String(i + 1))),
  ];
}

function buildListOfTables() {
  return [
    pageBreak(),
    sectionTitle('LIST OF TABLES'),
    ...CFG.tables.map(([num, title], i) => tocRow(`${num}: ${title}`, String(i + 1))),
  ];
}

function buildListOfAbbreviations() {
  return [
    pageBreak(),
    sectionTitle('LIST OF SYMBOLS AND ABBREVIATIONS'),
    body('The following symbols and abbreviations are used throughout this thesis:', { after: 300 }),
    ...CFG.abbreviations.map(([sym, meaning]) => abbrevRow(sym, meaning)),
  ];
}

function buildListOfAppendices() {
  return [
    pageBreak(),
    sectionTitle('LIST OF APPENDICES'),
    ...CFG.appendices.map(([label, title]) => new Paragraph({
      spacing: { after: 120, line: 320 },
      children: [
        new TextRun({ text: label, bold: true, size: 22, font: 'Times New Roman' }),
        new TextRun({ text: ` — ${title}`, size: 22, font: 'Times New Roman' }),
      ],
    })),
  ];
}

async function main() {
  console.log('Rendering Jazeera University title header...');
  const headerFile = await renderTitleHeader();

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Times New Roman', size: 24 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 },
        },
      },
      children: [
        ...buildTitlePage(headerFile),
        ...buildDeclaration(),
        ...buildAbstract(),
        ...buildAcknowledgements(),
        ...buildTableOfContents(),
        ...buildListOfFigures(),
        ...buildListOfTables(),
        ...buildListOfAbbreviations(),
        ...buildListOfAppendices(),
      ],
    }],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT, buffer);
  console.log(`Preface pages written to: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
