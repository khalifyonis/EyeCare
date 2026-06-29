/** Chapter 4 — Analysis and Design content and table data */

module.exports = {
  // 4.5.1 Technical Feasibility
  technicalIntro: [
    'Technical feasibility refers to whether the required technology, hardware, software, and development skills are available to design, build, deploy, and maintain the EyeCare (Al-Ixsaan) Management System. A technical feasibility assessment was conducted to confirm that the development team possesses the necessary programming knowledge and that the selected tools are mature, well-documented, and suitable for a production-grade clinic management platform.',
    'The EyeCare system adopts a three-tier web architecture comprising a Next.js presentation layer, a Node.js/Express application layer, and a PostgreSQL data layer managed through Prisma ORM. All core technologies are open-source, actively maintained, and widely adopted in modern web development. The system requires only standard computing hardware and a modern web browser on client devices, making deployment practical for eye care clinics with limited IT infrastructure.',
    'The following tables summarize the hardware and software requirements that confirm the technical feasibility of the proposed system.',
  ],

  technicalHardware: [
    ['1', 'Development Computer / Laptop', '5 units', 'Intel Core i5 or equivalent, 8 GB RAM minimum, 256 GB SSD, Windows 10/11 — one per team member'],
    ['2', 'Server / Hosting Environment', '1 unit', 'Cloud VPS or local server: 2 vCPU, 4 GB RAM, 40 GB SSD for API and database hosting'],
    ['3', 'Client Workstations', '3+ units', 'Desktop or laptop with modern browser for reception, doctor, pharmacy, and admin use'],
    ['4', 'Network Infrastructure', '1', 'Stable broadband internet (minimum 10 Mbps) for development, deployment, and clinic access'],
    ['5', 'Backup Storage', '1', 'External drive or cloud backup for database dumps and project files'],
    ['6', 'Printer (optional)', '1', 'For printing invoices, receipts, and reports at clinic reception'],
  ],

  technicalSoftware: [
    ['1', 'Operating System', 'Windows 10/11, Linux (Ubuntu), or macOS', 'Development and server environments'],
    ['2', 'Node.js 18+ & npm', 'JavaScript runtime and package manager', 'Backend API and frontend build tooling'],
    ['3', 'Next.js 16 & React 19', 'Frontend web framework', 'Presentation layer and dashboard UI'],
    ['4', 'TypeScript 5', 'Typed JavaScript superset', 'Type-safe frontend development'],
    ['5', 'Express.js 5', 'REST API framework', 'Application layer and route handling'],
    ['6', 'PostgreSQL 14+', 'Relational database management system', 'Persistent data storage'],
    ['7', 'Prisma ORM 6.4', 'Database toolkit', 'Schema definition, migrations, and queries'],
    ['8', 'Visual Studio Code', 'Integrated development environment', 'Code editing, debugging, and Git integration'],
    ['9', 'Git & GitHub', 'Version control', 'Collaborative development and source backup'],
    ['10', 'Web Browser', 'Chrome, Edge, or Firefox (latest)', 'UI testing and end-user access'],
    ['11', 'Postman / Thunder Client', 'API testing tool', 'REST endpoint verification during development'],
    ['12', 'Socket.io 4.8', 'Real-time communication library', 'Live notifications for appointments and inventory'],
  ],

  technicalConclusion:
    'Based on the hardware and software assessment above, the EyeCare Management System is technically feasible. The development team has access to suitable computers, all required software tools are freely available, and the chosen technology stack is well supported by official documentation and community resources. The web-based architecture eliminates the need for specialized client-side installation, allowing clinic staff to access the system from any authorized device with a browser.',

  // 4.5.2 Economic Feasibility
  economicIntro: [
    'Economic feasibility evaluates whether the benefits of implementing the EyeCare Management System justify the financial investment required during development and deployment. Although the system is built primarily using open-source technologies that do not require commercial software licenses, the project still incurs direct and indirect costs related to infrastructure, connectivity, transportation, documentation, and hosting.',
    'The table below presents a detailed breakdown of the estimated project costs incurred by the development team during the Final Year Project period from February 2026 to June 2026. Costs are expressed in United States Dollars (USD), which is commonly used for academic and technology-related expenses in the region.',
  ],

  economicCosts: [
    ['1', 'Internet Subscription', 'Connectivity', '5 months', '$25.00 / month', '$125.00'],
    ['2', 'Mobile Data / Communication', 'Communication', '5 months', '$6.00 / month', '$30.00'],
    ['3', 'Cloud Hosting (VPS)', 'Infrastructure', '3 months', '$20.00 / month', '$60.00'],
    ['4', 'Domain Name', 'Infrastructure', '1 year', '$12.00 / year', '$12.00'],
    ['5', 'Transportation', 'Travel', '10 trips', '$5.00 / trip', '$50.00'],
    ['6', 'Printing & Binding', 'Documentation', '1 set', '$45.00', '$45.00'],
    ['7', 'USB Flash Drive / Storage', 'Equipment', '2 units', '$6.00 / unit', '$12.00'],
    ['8', 'Electricity', 'Utilities', '5 months', '$7.00 / month', '$35.00'],
    ['9', 'Software Tools', 'Software', '—', 'Free (open-source)', '$0.00'],
    ['10', 'Development Hardware', 'Equipment', '5 laptops', 'Already owned', '$0.00'],
    ['', 'TOTAL', '', '', 'Total Estimated Project Cost', '$369.00'],
  ],

  economicBenefits: [
    'Elimination of paper register costs and reduced physical storage requirements for patient files.',
    'Improved billing accuracy reduces revenue leakage from missed charges across pharmacy, optical, and clinical services.',
    'Automated inventory tracking reduces medicine and optical stock wastage through low-stock alerts.',
    'Faster patient lookup and appointment management reduce receptionist administrative time.',
    'Digital reports replace manual compilation, saving administrator hours per week.',
    'Long-term savings from using open-source stack with no recurring license fees unlike commercial HMS products.',
  ],

  economicConclusion:
    'The total estimated development cost of approximately $369.00 is modest compared to the operational benefits the system delivers to a clinic. Once deployed, ongoing costs are limited to hosting and internet connectivity, while the system continues to improve efficiency, data accuracy, and patient service quality. Therefore, the EyeCare Management System is economically feasible and provides a favourable cost–benefit ratio for adoption by eye care facilities such as Al-Ixsaan Medical Group.',

  // Schedule (4.5.3) — from original chapter
  schedule: [
    ['1', 'Requirement Analysis and Planning', '2 weeks', 'February 2026'],
    ['2', 'System Design (Architecture, DFD, ERD)', '2 weeks', 'Late February 2026'],
    ['3', 'Database Design and Setup', '1 week', 'Early March 2026'],
    ['4', 'Core Module Development (Auth, Patients, Appointments)', '3 weeks', 'March 2026'],
    ['5', 'Clinical Modules (Triage, Exam, Prescriptions, Surgery)', '3 weeks', 'Late March – April 2026'],
    ['6', 'Pharmacy, Optical, and Billing Modules', '3 weeks', 'April 2026'],
    ['7', 'Reporting, Multi-Branch and Admin Features', '2 weeks', 'Early May 2026'],
    ['8', 'System Testing and Bug Fixing', '2 weeks', 'May 2026'],
    ['9', 'Documentation and Final Submission', '2 weeks', 'June 2026'],
  ],

  existingApproaches: [
    ['Paper-Based Records', 'Simple, no technology needed', 'Data loss risk, difficult retrieval, no multi-department sharing'],
    ['Spreadsheet Tools', 'Basic digital storage, calculations', 'No relational structure, no real-time multi-user access, fragmented data'],
    ['General HMS Software', 'Appointment and billing modules', 'No ophthalmic specialization, missing clinical modules, not integrated'],
    ['Manual Prescription Handling', 'Handwritten doctor prescriptions', 'Risk of misreading, no real-time pharmacy notification'],
  ],

  functionalReqs: [
    ['FR-01', 'Authentication', 'Secure login and role-based access', 'All Users'],
    ['FR-02', 'Patient Records', 'Register patients and manage medical history', 'Receptionist, Doctor'],
    ['FR-03', 'Appointments', 'Schedule, reschedule, and cancel appointments', 'Receptionist'],
    ['FR-04', 'Triage', 'Record VA, pinhole, and IOP readings', 'Doctor'],
    ['FR-05', 'Clinical Exam', 'Record refraction, diagnosis, and management plan', 'Doctor'],
    ['FR-06', 'Prescriptions', 'Generate digital prescriptions for pharmacy and optical', 'Doctor'],
    ['FR-07', 'Surgery', 'Schedule surgeries and record surgical outcomes', 'Doctor, Admin'],
    ['FR-08', 'Pharmacy', 'Manage drug inventory and dispense medications', 'Pharmacist'],
    ['FR-09', 'Optical Shop', 'Manage frame/lens inventory and spectacle orders', 'Optician'],
    ['FR-10', 'Billing', 'Generate invoices and manage payments', 'Receptionist'],
    ['FR-11', 'Reporting', 'Generate financial and operational reports', 'Admin, Manager'],
    ['FR-12', 'Multi-Branch', 'Manage multiple clinic locations from one dashboard', 'Super Admin'],
  ],

  databaseTables: [
    ['Branch', 'id, name, address, phone, isActive', 'Has many Users, Patients, Inventory items'],
    ['User', 'id, name, email, passwordHash, role, branchId', 'Belongs to Branch; handles Appointments as Doctor'],
    ['Patient', 'id, fullName, dateOfBirth, gender, phone, branchId', 'Belongs to Branch; has many Appointments, Exams, Bills'],
    ['Appointment', 'id, patientId, doctorId, date, time, status, branchId', 'Belongs to Patient and User (Doctor)'],
    ['TriageRecord', 'id, patientId, vaRight, vaLeft, iopRight, iopLeft, recordedAt', 'Belongs to Patient and Appointment'],
    ['ClinicalExam', 'id, patientId, appointmentId, sphRight, cylRight, axisRight, diagnosis, plan', 'Belongs to Patient and Appointment; has Prescriptions'],
    ['Prescription', 'id, examId, patientId, type, notes', 'Belongs to ClinicalExam; has many PrescriptionItems'],
    ['PrescriptionItem', 'id, prescriptionId, itemId, itemType, dosage, quantity', 'Belongs to Prescription; links to PharmacyItem or Frame'],
    ['Surgery', 'id, patientId, doctorId, surgeryType, scheduledDate, status, outcome', 'Belongs to Patient; linked to Bill'],
    ['PharmacyItem', 'id, name, category, stock, reorderLevel, unitPrice, branchId', 'Belongs to Branch; referenced in PrescriptionItems'],
    ['OpticalFrame', 'id, brand, model, color, stock, price, branchId', 'Belongs to Branch; referenced in OpticalOrders'],
    ['Bill', 'id, patientId, totalAmount, paidAmount, status, createdAt', 'Belongs to Patient; has many BillItems and Payments'],
    ['BillItem', 'id, billId, description, serviceType, amount', 'Belongs to Bill; references Appointment, Surgery, or Item'],
    ['Payment', 'id, billId, amount, paymentMethod, paidAt', 'Belongs to Bill; tracks individual payment transactions'],
  ],

  useCases: [
    ['Super Admin', 'Manage branches, configure role permissions, view audit logs', 'System-wide administration'],
    ['Administrator', 'Manage users, view reports, oversee clinic operations', 'Clinic administration'],
    ['Receptionist', 'Register patients, schedule appointments, generate billing', 'Front-desk operations'],
    ['Doctor', 'View dashboard, conduct examinations, manage prescriptions', 'Clinical care'],
    ['Pharmacist', 'View prescriptions, manage pharmacy inventory, dispense medicines', 'Pharmacy operations'],
    ['Optician', 'View optical prescriptions, manage frames/lenses, process orders', 'Optical shop operations'],
  ],

  architectureDescription: [
    'The System Architecture Diagram illustrates the overall structure of the EyeCare (Al-Ixsaan) Management System and the interaction between its major components across three distinct tiers. At the top, clinic users — including Super Admin, Administrator, Receptionist, Doctor, Pharmacist, and Optician — interact with the system through standard web browsers on desktop or laptop computers without installing any client software.',
    'The Presentation Layer is implemented using Next.js 16 and React 19 with TypeScript and Tailwind CSS. This layer renders role-specific dashboards, forms, calendars, and reports. All data exchange with the backend occurs through REST API calls using Axios, while real-time notifications (appointment alerts, low-stock warnings) are delivered via Socket.io client connections.',
    'The Application Layer runs on Node.js with Express.js 5. It exposes RESTful API endpoints organised into modules for authentication, patients, appointments, examinations, prescriptions, pharmacy, optical shop, billing, reports, and administration. JWT-based authentication middleware validates every protected request. Joi validates input data, and role-based access control middleware enforces permissions per user role and branch.',
    'The Data Layer uses PostgreSQL 14+ as the relational database, accessed exclusively through Prisma ORM which manages schema migrations, type-safe queries, and referential integrity. All patient records, clinical data, inventory, and financial transactions are persisted in normalized tables with branch-scoped foreign keys. Optional external services include SMTP email for password reset and file storage for profile images via Multer.',
    'This layered architecture ensures separation of concerns, maintainability, and scalability. Each tier can be updated independently, and the system can be deployed on a single cloud VPS or scaled across separate frontend, API, and database servers as clinic demand grows.',
  ],
};
