/**
 * Generate Chapter 4 Word document — Analysis and Design (improved 4.5.1, 4.5.2, 4.8).
 * Run: node scripts/generate-chapter4-docx.js
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, WidthType, BorderStyle, ImageRun,
  VerticalAlign, PageBreak,
} = require('docx');
const C = require('./chapter4-content');
const D = require('./chapter4-diagrams');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'docs', 'chapter4-assets');
const DOCS = path.join(ROOT, 'docs');
const OUT = path.join(DOCS, 'CHAPTER_FOUR_ANALYSIS_AND_DESIGN_v2.docx');

const border = { style: BorderStyle.SINGLE, size: 1, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({ heading: level, spacing: { before: 240, after: 120 }, children: [new TextRun({ text, bold: true, size: level === HeadingLevel.HEADING_1 ? 28 : 24 })] });
}
function body(text) {
  return new Paragraph({ spacing: { after: 200, line: 360 }, children: [new TextRun({ text, size: 24 })] });
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
    shading: opts.shade ? { fill: opts.shade } : undefined,
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(text), size: 20, bold: !!opts.bold })],
    })],
  });
}
function makeTable(headers, rows, widths, boldLastRow = false) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: headers.map((h, i) => cell(h, { bold: true, width: widths[i], center: true })) }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((c, i) => cell(c, {
          width: widths[i],
          center: i === 0 || i === row.length - 1,
          bold: boldLastRow && ri === rows.length - 1,
          shade: boldLastRow && ri === rows.length - 1 ? 'E8E8E8' : undefined,
        })),
      })),
    ],
  });
}
function imgRun(file, w = 520, h = 300) {
  if (!fs.existsSync(file)) return new Paragraph({ children: [new TextRun({ text: `[Missing: ${path.basename(file)}]`, size: 20 })] });
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 80 }, children: [
    new ImageRun({ data: fs.readFileSync(file), transformation: { width: w, height: h }, type: 'png' }),
  ] });
}

async function renderHtml(page, html, outFile, viewport = { width: 860, height: 720 }) {
  await page.setViewportSize(viewport);
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.locator('body').screenshot({ path: outFile, type: 'png' });
}

async function generateAssets() {
  ensureDir(ASSETS);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const arch = path.join(ASSETS, 'fig-4-8-architecture.png');
  await renderHtml(page, D.systemArchitectureHtml(), arch, { width: 860, height: 780 });
  await browser.close();
  return {
    architecture: arch,
    useCase: path.join(DOCS, 'use-case-diagram.png'),
    erd: path.join(DOCS, 'erd-diagram-word.png'),
  };
}

function buildDocument(figs) {
  return [
    heading('CHAPTER FOUR'),
    heading('ANALYSIS AND DESIGN', HeadingLevel.HEADING_2),

    // 4.1
    heading('4.1 System Analysis and Design', HeadingLevel.HEADING_2),
    body('System analysis is the process of studying an existing or proposed system to understand how it works, identify its weaknesses, and determine what improvements are necessary. In the context of the EyeCare Management System, the system analysis phase involved a careful examination of the current manual and fragmented processes used in eye care clinics to manage patient information, clinical documentation, appointments, prescriptions, and billing. By thoroughly investigating these operational challenges, it became possible to define the functional and technical requirements needed to build an effective digital solution.'),
    body('The analysis revealed that many eye care clinics currently operate without a unified information system. Patient registration, appointment management, clinical examinations, pharmacy dispensing, optical sales, and billing are typically handled through separate tools such as paper registers, spreadsheets, or disconnected software applications. This fragmented approach creates significant barriers to efficient information flow, accurate data management, and coordinated patient care.'),
    body('A key finding of the analysis was that data entered at one stage of patient care is rarely accessible in other departments without manual transfer. For instance, a prescription written by a doctor during a clinical examination may need to be physically carried to the pharmacy rather than being digitally routed. Similarly, billing staff may not have immediate access to a complete list of services rendered to a patient across departments, leading to potential revenue loss and administrative errors.'),
    body('The system analysis also identified challenges related to data duplication and inconsistency. When patient information is maintained in multiple registers or files, it becomes difficult to ensure that all records are synchronized and up-to-date. Healthcare staff may work from outdated information, which can negatively affect clinical decision-making and patient care quality. Furthermore, the absence of role-based access control in manual systems means that sensitive clinical and financial records are not always adequately protected.'),
    body('Based on these findings, the system analysis concluded that the EyeCare Management System must provide a centralized, integrated platform that eliminates the inefficiencies of the current fragmented approach. The proposed system must support seamless data flow between departments, ensure data accuracy and consistency, and provide secure access to clinical and administrative information for authorized users only.'),

    // 4.2
    heading('4.2 Existing Approaches', HeadingLevel.HEADING_2),
    body('Before the development of the EyeCare Management System, eye care clinics relied on a combination of manual processes and partially digitized tools to manage their operations. Understanding these existing approaches provides important context for the design of the proposed system and helps clarify why a fully integrated digital solution is necessary.'),
    heading('4.2.1 Paper-Based Record Systems', HeadingLevel.HEADING_3),
    body('The most widely used approach in many clinics involves maintaining patient records in physical folders and registers. Patient registration details, examination findings, prescriptions, and appointment information are recorded by hand and stored in filing cabinets or shelves. While this approach is simple and does not require technological infrastructure, it introduces several significant challenges. Handwritten records are difficult to search and retrieve, particularly when a clinic serves hundreds or thousands of patients. Physical files are vulnerable to damage, loss, or unauthorized access, and maintaining data consistency across multiple departments using paper-based systems is extremely challenging.'),
    heading('4.2.2 Standalone Spreadsheet Applications', HeadingLevel.HEADING_3),
    body('Some clinics have adopted the use of spreadsheet applications such as Microsoft Excel or Google Sheets to manage specific aspects of clinic operations, such as appointment scheduling or billing records. These tools offer improvements over purely paper-based systems by providing basic digital storage and calculation capabilities. However, standalone spreadsheets are not designed for multi-user access in real time, lack relational database structures needed for complex clinical data, and do not support role-based access control. Data entered in one spreadsheet is not automatically available in another, which means that the fragmentation problem is not fully resolved.'),
    heading('4.2.3 General-Purpose Practice Management Software', HeadingLevel.HEADING_3),
    body('A small number of healthcare facilities use general-purpose practice management or hospital information system software that was not specifically designed for ophthalmology. These systems may provide modules for appointment scheduling and basic billing but typically lack specialized features required for eye care, such as visual acuity recording, intraocular pressure tracking, refraction data management, and optical inventory control. As a result, clinics using these systems often need to supplement them with additional tools, which reintroduces fragmentation.'),
    heading('4.2.4 Summary of Existing Approach Limitations', HeadingLevel.HEADING_3),
    body('The table below summarizes the key limitations observed in the existing approaches used in eye care clinics:'),
    tableCaption('Table 4.1: Summary of Existing Approaches and Their Limitations'),
    makeTable(['Existing Approach', 'Key Features', 'Identified Limitations'], C.existingApproaches, [22, 28, 50]),

    // 4.3
    heading('4.3 The Proposed System', HeadingLevel.HEADING_2),
    body('The proposed EyeCare Management System is a comprehensive, web-based platform specifically designed to address the operational challenges identified in the system analysis and to overcome the limitations of the existing approaches reviewed above. The system integrates all major clinical and administrative functions of an eye care clinic within a single, centralized digital platform, enabling seamless data flow between departments and providing authorized users with real-time access to accurate and up-to-date information.'),
    body('At its core, the proposed system replaces fragmented manual processes with a structured electronic workflow. When a patient arrives at the clinic, their information is registered through the system\'s patient registration module. This information is immediately accessible to clinical staff, where preliminary examination data such as visual acuity and initial intraocular pressure readings are recorded. The clinical findings are then instantly available to the consulting ophthalmologist, who can complete the full examination, record diagnosis and treatment plans, and generate prescriptions through the system\'s examination and prescription modules.'),
    body('The proposed system also integrates pharmacy and optical shop management directly with the clinical workflow. Prescriptions generated by the doctor are automatically routed to the pharmacist through the system, eliminating the need for physical document transfer. Similarly, refraction data recorded during examination is automatically available to the optical shop module when processing spectacle orders. All services provided are linked to the unified billing module, which consolidates charges from consultations, medications, optical products, and surgeries to generate a complete and accurate invoice for each patient.'),
    body('The system is designed to support multi-branch clinic operations, allowing a clinic group with several physical locations to manage all branches through a single platform while maintaining strict data isolation between branches. Role-based access control ensures that each user type can only access and modify the information relevant to their specific role within the clinic.'),

    // 4.4
    heading('4.4 Requirements', HeadingLevel.HEADING_2),
    body('The system requirements were derived from the findings of the system analysis phase, the review of existing approaches, and the specific operational needs of eye care clinics. Requirements are divided into two categories: functional requirements, which describe the specific operations the system must perform, and non-functional requirements, which define the quality and performance standards the system must meet.'),
    heading('4.4.1 Functional Requirements', HeadingLevel.HEADING_3),
    body('Functional requirements describe the specific features and behaviors that the EyeCare Management System must provide in order to support clinical and administrative operations effectively. Key functional requirements include secure user authentication and role-based authorization, patient registration and medical history management, appointment scheduling, triage and clinical examination recording, digital prescription management, surgery scheduling, pharmacy and optical inventory management, billing and payment processing, reporting and analytics, and multi-branch administration.'),
    body('The following table provides a consolidated summary of the functional requirements:'),
    tableCaption('Table 4.2: Summary of Functional Requirements'),
    makeTable(['FR ID', 'Module', 'Description', 'User Role'], C.functionalReqs, [10, 18, 42, 30]),
    heading('4.4.2 Non-Functional Requirements', HeadingLevel.HEADING_3),
    body('Non-functional requirements define the quality attributes and performance standards that the EyeCare Management System must satisfy in order to be reliable, secure, and usable in a clinical environment. The system shall respond to standard user requests within three seconds under normal operating conditions and support at least fifty concurrent users across multiple branches.'),
    body('Security requirements include encrypted password storage using bcrypt hashing, JWT-based session authentication, HTTPS encryption for data in transit, and role-based access control ensuring users can only access permitted modules and data. Reliability requirements include 99% availability during clinic hours and database backup mechanisms for data recovery.'),
    body('Usability requirements specify an intuitive interface with consistent navigation, readable typography, and workflow progression matching the natural patient journey. Scalability, maintainability (modular TypeScript/Prisma codebase), and browser compatibility (Chrome, Edge, Firefox, Safari on desktop and tablet) are also required.'),

    // 4.5 Feasibility
    heading('4.5 Feasibility Study', HeadingLevel.HEADING_2),
    body('A feasibility study is an assessment conducted to determine whether a proposed system can be successfully developed and deployed given the available resources, technical capabilities, time constraints, and financial considerations. The feasibility study for the EyeCare Management System was conducted across four dimensions: technical feasibility, economic feasibility, schedule feasibility, and operational feasibility.'),

    heading('4.5.1 Technical Feasibility', HeadingLevel.HEADING_3),
    ...C.technicalIntro.map(body),
    tableCaption('Table 4.4: Hardware Requirements for Technical Feasibility'),
    makeTable(['No.', 'Hardware Component', 'Quantity', 'Specification / Purpose'], C.technicalHardware, [8, 28, 12, 52]),
    body('Table 4.4 confirms that the development team has access to suitable hardware for building and demonstrating the EyeCare system. Client workstations at the clinic require only a standard computer with a modern web browser, eliminating the need for specialized ophthalmic hardware integration.'),
    tableCaption('Table 4.5: Software Requirements for Technical Feasibility'),
    makeTable(['No.', 'Software / Tool', 'Version / Type', 'Purpose in EyeCare System'], C.technicalSoftware, [8, 24, 22, 46]),
    body(C.technicalConclusion),

    heading('4.5.2 Economic Feasibility', HeadingLevel.HEADING_3),
    ...C.economicIntro.map(body),
    tableCaption('Table 4.6: Project Cost Estimation — Economic Feasibility'),
    makeTable(
      ['No.', 'Item', 'Category', 'Quantity', 'Unit Cost', 'Total Cost (USD)'],
      C.economicCosts,
      [6, 20, 14, 14, 22, 24],
      true,
    ),
    body('The cost breakdown in Table 4.6 shows that the total estimated project expenditure is approximately $369.00. The majority of software tools used in development are open-source and incur no licensing fees. The primary costs relate to internet connectivity, cloud hosting for demonstration deployment, transportation for requirements gathering and supervisor meetings, and documentation printing.'),
    body('Beyond direct development costs, the system delivers significant operational benefits that justify the investment:'),
    ...C.economicBenefits.map((b) => new Paragraph({ spacing: { after: 120, line: 360 }, children: [new TextRun({ text: `• ${b}`, size: 24 })] })),
    body(C.economicConclusion),

    heading('4.5.3 Schedule Feasibility', HeadingLevel.HEADING_3),
    body('Schedule feasibility evaluates whether the proposed system can be developed, tested, and delivered within the available timeframe. The EyeCare Management System was planned for development within the period from February 2026 to June 2026, providing approximately five months for the completion of all development phases.'),
    body('The project timeline was structured using an iterative and incremental development model, allowing each major module to be developed and validated before proceeding to the next. The following table presents the project schedule:'),
    tableCaption('Table 4.3: Project Development Schedule'),
    makeTable(['No.', 'Development Phase', 'Duration', 'Target Period'], C.schedule, [8, 42, 18, 32]),
    body('The schedule was considered achievable given the scope of the project and the iterative development methodology adopted. Regular progress reviews throughout the development period ensured that any delays in individual modules could be identified and addressed before affecting the overall project timeline. Based on this assessment, the schedule feasibility of the proposed system is confirmed.'),

    heading('4.5.4 Operational Feasibility', HeadingLevel.HEADING_3),
    body('Operational feasibility evaluates whether the proposed system will function effectively within the organization and be accepted by its users. The EyeCare Management System is operationally feasible because it is designed to be user-friendly and easy to use for clinic staff such as administrators, receptionists, doctors, and pharmacists. The system supports daily operations including patient registration, appointment scheduling, examination recording, billing, and inventory management, which aligns with existing workflows in eye care clinics. In addition, minimal training is required for users due to the simple and intuitive interface. By improving data management, reducing manual work, and enhancing coordination between departments, the system is expected to be widely accepted and effectively used in the organization.'),

    // 4.6 System Design
    heading('4.6 System Design', HeadingLevel.HEADING_2),
    body('System design translates the requirements identified during the analysis phase into a detailed technical blueprint that guides the development of the EyeCare Management System. This section presents the key design models used to represent the system\'s structure, behavior, and data flows, including Use Case Diagrams and Entity Relationship Diagrams.'),

    heading('4.6.1 Use Case Diagram', HeadingLevel.HEADING_3),
    body('The Use Case Diagram identifies the different actors who interact with the EyeCare Management System and describes the primary use cases, or functional activities, associated with each actor. The main actors in the system are the Super Admin, Administrator, Doctor, Receptionist, Pharmacist, and Optician.'),
    body('The Receptionist handles patient registration, appointment scheduling, and billing. The Doctor conducts examinations and manages prescriptions but does not schedule appointments. The Pharmacist and Optician handle dispensing workflows linked to prescriptions and billing.'),
    imgRun(figs.useCase, 520, 400),
    caption('Figure 4.2: Use Case Diagram — EyeCare Management System'),
    tableCaption('Table 4.7: Primary Use Cases by Actor'),
    makeTable(['Actor', 'Primary Use Cases', 'Responsibility'], C.useCases, [18, 42, 40]),

    heading('4.6.2 ERD Diagram', HeadingLevel.HEADING_3),
    body('The Entity Relationship Diagram (ERD) illustrates the database structure of the EyeCare Management System and shows the relationships between major entities such as Patients, Users, Appointments, Clinical Examinations, Prescriptions, Billing, Pharmacy, and Optical Management. The diagram provides a visual representation of how data is organized and interconnected within the system to ensure efficient data management and integrity.'),
    imgRun(figs.erd, 520, 360),
    caption('Figure 4.5: Entity Relationship Diagram (ERD) — EyeCare Management System'),

    heading('4.6.3 Database Design', HeadingLevel.HEADING_3),
    body('The database design defines the structure of the PostgreSQL relational database used to store all data managed by the EyeCare Management System. The database is designed based on the entity-relationship model described in the previous section and implemented using Prisma ORM, which provides schema definition, migration management, and type-safe database access.'),
    body('The database adopts a normalized relational structure to minimize data redundancy and ensure data integrity. Foreign key constraints are used to enforce referential integrity between related tables. Each table uses an auto-generated UUID as its primary key to ensure globally unique record identification across branches.'),
    tableCaption('Table 4.8: Database Tables, Attributes, and Relationships'),
    makeTable(['Table Name', 'Key Attributes', 'Relationships'], C.databaseTables, [18, 38, 44]),
    body('The database design prioritizes data normalization, referential integrity, and query efficiency. Indexes are applied to frequently queried columns such as patient name, appointment date, and branch ID to improve system performance. The multi-branch architecture is enforced at the database level by including a branchId foreign key in all branch-specific tables.'),

    // 4.8 Architecture
    heading('4.8 System Architecture Diagram', HeadingLevel.HEADING_2),
    ...C.architectureDescription.map(body),
    imgRun(figs.architecture, 540, 490),
    caption('Figure 4.8: System Architecture Diagram of the EyeCare (Al-Ixsaan) Management System'),

    // Summary
    heading('4.9 Chapter Summary', HeadingLevel.HEADING_2),
    body('This chapter presented the system analysis and design of the proposed EyeCare Management System. The analysis of existing eye care clinic operations revealed several challenges, including fragmented data management, manual record keeping, limited information sharing between departments, data duplication, and security concerns. Existing approaches such as paper-based records, spreadsheet applications, and general-purpose healthcare systems were reviewed, and their limitations were identified.'),
    body('Based on these findings, a centralized and integrated web-based EyeCare Management System was proposed to streamline clinical and administrative processes within eye care clinics. The chapter outlined the system\'s functional and non-functional requirements, evaluated feasibility from technical, economic, schedule, and operational perspectives with detailed hardware, software, and cost tables, and presented system design models including the Use Case Diagram, ERD, database design, and three-tier system architecture diagram.'),
    body('Overall, the analysis and design activities established a strong foundation for the development of the EyeCare Management System and provided a clear framework for implementing an integrated solution that improves patient care, operational efficiency, and information management in eye care clinics.'),
  ];
}

async function main() {
  console.log('Generating Chapter 4 assets...');
  const figs = await generateAssets();
  console.log('Building Word document...');
  const doc = new Document({
    sections: [{
      properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1800 } } },
      children: buildDocument(figs),
    }],
  });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUT, buffer);
  console.log(`Chapter 4 written to: ${OUT}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
