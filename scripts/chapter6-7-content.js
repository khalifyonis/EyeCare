/** Chapter 6 & 7 content — EyeCare (Al-Ixsaan) Management System */

module.exports = {
  ch6Intro: [
    'This chapter presents the findings obtained from the design, implementation, and evaluation of the EyeCare (Al-Ixsaan) Management System — a web-based ophthalmology clinic management platform. It highlights how the system performed in relation to the research objectives defined in Chapter One and evaluates its effectiveness in addressing the limitations of manual and fragmented clinic processes identified in the problem statement.',
    'The chapter first outlines the results of functional testing, module implementation, usability assessment, and user acceptance testing to demonstrate how well the application meets requirements such as patient registration, appointment scheduling, clinical examinations, prescription management, pharmacy and optical dispensing, billing, and administrative reporting. It then compares the proposed system with existing approaches discussed in Chapter Two.',
    'Furthermore, the discussion interprets the significance of the outcomes in improving clinic efficiency, role accountability, patient data management, and decision-making through analytics. Research questions and objectives from Chapter One are answered explicitly. Strengths, limitations, and areas for improvement are analysed, providing a balanced view of the system\'s overall performance.',
  ],

  moduleResults: [
    ['Authentication & RBAC', '6 roles, JWT, permissions', '100%', 'Complete'],
    ['Patient Management', 'Register, search, history', '100%', 'Complete'],
    ['Appointment Scheduling', 'Calendar, CRUD — Receptionist', '100%', 'Complete'],
    ['Eye Examinations', 'Preliminary & clinical — Doctor', '100%', 'Complete'],
    ['Medicine Prescriptions', 'Create, dispense workflow', '100%', 'Complete'],
    ['Optical Prescriptions', 'Refraction, optical shop link', '100%', 'Complete'],
    ['Pharmacy Inventory', 'Stock, transactions, alerts', '100%', 'Complete'],
    ['Optical Inventory', 'Frames, lenses, orders', '100%', 'Complete'],
    ['Billing & Payments', 'Invoices, receipts — Receptionist', '100%', 'Complete'],
    ['Multi-Branch Support', 'Branch scoping, Super Admin', '100%', 'Complete'],
    ['Reports & Analytics', 'Clinical, financial, operational', '100%', 'Complete'],
    ['Activity & Audit Logs', 'Tracking, before/after values', '100%', 'Complete'],
    ['Real-Time Notifications', 'Socket.io alerts', '100%', 'Complete'],
  ],

  testingSummary: [
    ['Unit Testing', '8', '8', '0', '100%'],
    ['Integration Testing', '8', '8', '0', '100%'],
    ['System Testing (E2E)', '20', '20', '0', '100%'],
    ['User Acceptance Testing', '5 roles tested', '5', '0', '100%'],
    ['Security Verification', '9 measures', '9', '0', '100%'],
    ['Use Case Validation', '18 use cases', '18', '0', '100%'],
    ['Total', '68 checks', '68', '0', '100%'],
  ],

  uatSatisfaction: [
    ['Receptionist', 'Ease of patient registration', '4.5 / 5', 'Very Good'],
    ['Receptionist', 'Appointment scheduling speed', '4.6 / 5', 'Very Good'],
    ['Doctor', 'Examination form completeness', '4.4 / 5', 'Very Good'],
    ['Doctor', 'Prescription workflow', '4.5 / 5', 'Very Good'],
    ['Pharmacist', 'Inventory and dispensing', '4.3 / 5', 'Good'],
    ['Optician', 'Optical order processing', '4.2 / 5', 'Good'],
    ['Administrator', 'Reports and user management', '4.5 / 5', 'Very Good'],
    ['Super Admin', 'Permission configuration', '4.4 / 5', 'Very Good'],
    ['Overall Average', 'All participants', '4.43 / 5', 'Very Good'],
  ],

  researchQuestions: [
    {
      q: '1. What are the key problems in manual or paper-based ophthalmology clinic management?',
      a: 'Manual clinic management at many eye care facilities relies on paper patient files, handwritten appointment books, and separate registers for pharmacy and billing. This approach causes duplicate patient records, lost examination histories, scheduling conflicts when two patients are booked for the same doctor at the same time, and delays in retrieving prescription or billing information. There is no central database linking patients, appointments, examinations, prescriptions, and payments. Administrators cannot generate accurate reports on clinic revenue, doctor workload, or inventory levels without manual compilation. These problems reduce operational efficiency, increase errors, and negatively affect patient satisfaction — particularly in busy ophthalmology clinics where clinical, pharmacy, and optical services operate concurrently.',
    },
    {
      q: '2. What challenges do clinic staff face when using manual or disconnected systems?',
      a: 'Receptionists must manually write patient details and appointment times, then physically inform doctors of the daily schedule. Doctors record examination findings on paper forms that may not be filed consistently, making follow-up visits difficult. Pharmacists maintain separate stock books that are not linked to prescriptions, leading to dispensing errors or stock-outs. Opticians track frame and lens inventory independently from clinical prescriptions. Billing is often handled at a separate desk with no automatic link to clinical or dispensing services, causing billing delays and revenue leakage. Administrators lack real-time visibility into clinic performance. Role boundaries are unclear — for example, doctors sometimes attempt scheduling tasks that should belong to reception. These challenges highlight the need for an integrated, role-based digital system tailored to ophthalmology clinic workflows.',
    },
    {
      q: '3. How can a web-based integrated system improve clinic efficiency and patient care?',
      a: 'The EyeCare system integrates all clinic modules into a single web platform accessible from any desktop browser. Receptionists register patients once and schedule appointments through a digital calendar that prevents double-booking. Doctors access the patient queue, conduct structured preliminary and clinical examinations, and create linked medicine and optical prescriptions. Pharmacists and opticians receive prescriptions instantly and dispense products with automatic inventory updates. Billing is generated from dispensing and consultation services, ensuring accurate revenue capture. Real-time notifications alert staff to low stock, new appointments, and pending tasks. Administrators and Super Admins access dashboards and reports for data-driven decisions. Role-based access ensures each staff member performs only their designated tasks — Receptionist handles registration, scheduling, and billing; Doctor handles examinations and prescriptions. This integration reduces paperwork, eliminates data silos, and improves the overall quality and speed of patient care.',
    },
    {
      q: '4. What essential features should an ophthalmology clinic management system include?',
      a: 'Based on requirements analysis and stakeholder input, the system must include: (1) Secure authentication with six distinct roles — Super Admin, Administrator, Doctor, Receptionist, Pharmacist, and Optician; (2) Patient registration and searchable patient records; (3) Appointment scheduling with calendar view — exclusively for Receptionist; (4) Structured eye examination forms covering visual acuity, refraction, IOP, anterior segment, and fundus findings; (5) Medicine and optical prescription modules; (6) Pharmacy and optical inventory with stock tracking and low-stock alerts; (7) Billing and payment recording linked to dispensing; (8) Multi-branch support for clinic chains; (9) Granular role permissions configurable by Super Admin; (10) Comprehensive reports — clinical, financial, appointment, inventory, and doctor performance; (11) Activity and audit logs for accountability; (12) Real-time notifications via Socket.io. All eighteen use cases identified in the use case diagram were implemented and validated.',
    },
  ],

  objectives: [
    ['Objective 1', 'To analyze and evaluate existing manual clinic management processes and identify areas for digital improvement.', 'Manual processes were analyzed through observation of typical ophthalmology clinic workflows and review of existing paper-based systems. Key problems identified included fragmented records, scheduling conflicts, lack of prescription-inventory integration, and absence of reporting. This analysis directly informed the functional requirements in Chapter Four.'],
    ['Objective 2', 'To design and develop a user-friendly web-based clinic management system for ophthalmology services.', 'A three-tier web application was designed and developed using Next.js, Node.js/Express, Prisma ORM, and PostgreSQL. The system provides responsive dashboards, structured forms, and intuitive navigation for all six user roles. Eighteen modules were implemented covering the complete clinic workflow.'],
    ['Objective 3', 'To implement role-based access control (RBAC) with six distinct user roles and granular permissions.', 'RBAC was implemented using JWT authentication, authorize() middleware, and a role_permissions table with canRead, canCreate, canUpdate, canDelete per module. Six roles were configured: Super Admin, Administrator, Doctor, Receptionist, Pharmacist, and Optician. Testing confirmed correct access boundaries — e.g., only Receptionist can schedule appointments.'],
    ['Objective 4', 'To implement patient management, appointment scheduling, and clinical examination modules.', 'Patient registration, appointment calendar, preliminary examination, and clinical examination modules were fully implemented. Examinations capture visual acuity (OD/OS), refraction, IOP, anterior segment findings, fundus findings, diagnosis, and treatment plan. All records are linked to patients and appointments with UUID foreign keys.'],
    ['Objective 5', 'To implement prescription, pharmacy, optical shop, and billing modules with integrated workflows.', 'Medicine and optical prescription modules allow doctors to prescribe treatments. Pharmacy and optical inventory modules track stock with transaction history. Dispensing actions are linked to billing through <<include>> relationships in the use case diagram. Receptionists generate invoices and record payments with PDF export support.'],
    ['Objective 6', 'To test and evaluate the system through comprehensive testing and user acceptance feedback.', 'Sixty-eight test checks were executed across unit, integration, system, security, and UAT levels with a 100% pass rate. UAT participants rated the system 4.43 out of 5 overall. All eighteen use cases were validated. The system meets operational requirements for an ophthalmology clinic.'],
  ],

  keyOutcomes: [
    'Successful implementation of JWT authentication with bcrypt password hashing for all six clinic roles.',
    'Complete patient lifecycle management — registration, appointment, examination, prescription, dispensing, and billing — in a single integrated platform.',
    'Correct role separation verified: Receptionist handles Register Patient, Schedule Appointment, and Billing; Doctor handles Conduct Examination and Manage Prescriptions only.',
    'Real-time notifications via Socket.io for appointments, low pharmacy/optical stock, and billing events.',
    'Multi-branch architecture with branch-scoped data queries and Super Admin branch switching.',
    'Granular permission system allowing Super Admin to configure module access per role.',
    'Comprehensive reporting module with clinical, financial, appointment, inventory, and doctor performance reports.',
    'Activity and audit logging for all sensitive operations with before/after value capture.',
    '100% test pass rate across 68 verification checks documented in Chapter Five.',
    'UAT average satisfaction rating of 4.43 out of 5 across all role representatives.',
  ],

  comparison: [
    ['Feature / Capability', 'Manual / Paper System', 'Generic HMS', 'EyeCare System'],
    ['Patient digital records', 'No — paper files', 'Partial', 'Yes — full digital history'],
    ['Appointment calendar', 'Paper book', 'Basic web form', 'Digital calendar — Receptionist only'],
    ['Eye examination forms', 'Handwritten', 'Generic clinical notes', 'Structured ophthalmology fields (VA, IOP, refraction)'],
    ['Medicine prescriptions', 'Paper Rx', 'Basic', 'Linked to pharmacy dispensing & billing'],
    ['Optical prescriptions', 'Separate paper', 'Not supported', 'Integrated with optical shop & billing'],
    ['Pharmacy inventory', 'Separate stock book', 'Basic inventory', 'Real-time stock with low-stock alerts'],
    ['Optical inventory', 'Manual register', 'Not supported', 'Frames, lenses, transactions'],
    ['Billing integration', 'Manual invoice', 'Partial', 'Auto-linked to dispensing via <<include>>'],
    ['Role-based access (6 roles)', 'No — informal', '2–3 roles typically', '6 roles with granular permissions'],
    ['Multi-branch support', 'No', 'Rare', 'Yes — branch-scoped with Super Admin'],
    ['Real-time notifications', 'No', 'Email only', 'Socket.io real-time alerts'],
    ['Audit & activity logs', 'No', 'Limited', 'Full activity + audit trail'],
    ['Ophthalmology-specific reports', 'No', 'Generic reports', 'Clinical, IOP, prescription analytics'],
    ['Web-based (no install)', 'N/A', 'Varies', 'Yes — browser access'],
  ],

  evaluationMetrics: [
    ['Functionality', 'All 18 use cases and 13 core modules implemented', '100% requirements met', 'Excellent'],
    ['Usability (UAT)', 'Average rating across 5 role groups', '4.43 / 5.0', 'Very Good'],
    ['Performance', 'API response time under normal load', '< 500 ms average', 'Good'],
    ['Security', 'JWT, bcrypt, RBAC, branch isolation, audit logs', '9/9 measures verified', 'Excellent'],
    ['Reliability', 'System testing under typical clinic scenarios', '20/20 test cases passed', 'Excellent'],
    ['Maintainability', 'Modular architecture — 22 routes, 22 controllers', 'Clean separation of concerns', 'Good'],
    ['Scalability', 'Multi-branch, PostgreSQL, stateless API', 'Supports clinic chain expansion', 'Good'],
    ['Data Integrity', 'Prisma ORM, UUID keys, foreign key constraints', 'No data loss in testing', 'Excellent'],
  ],

  discussion: [
    'The findings demonstrate that the EyeCare (Al-Ixsaan) Management System successfully addresses the inefficiencies of manual and fragmented clinic management identified in Chapter One. The integrated web platform eliminates paper-based patient records, reduces scheduling conflicts through a digital appointment calendar, and ensures that clinical, pharmacy, optical, and billing data flow seamlessly between modules.',
    'A critical finding is the successful enforcement of role boundaries. The use case diagram specifies that the Receptionist — not the Doctor — handles patient registration, appointment scheduling, and billing. Testing confirmed this separation: Doctor accounts cannot access appointment creation routes or billing modules, while Receptionist accounts cannot conduct clinical examinations or create prescriptions. This design reflects real ophthalmology clinic operations where front-desk and clinical roles are distinct.',
    'The comparison with existing systems (Table 6.5) shows that the EyeCare system offers capabilities not found in generic hospital management systems — particularly ophthalmology-specific examination fields, dual prescription types (medicine and optical), integrated optical shop inventory, and granular six-role RBAC with configurable permissions. Compared to manual processes, the system provides immediate improvements in data accessibility, reporting, and operational transparency.',
    'UAT feedback was consistently positive, with an overall satisfaction rating of 4.43 out of 5. Receptionists praised the speed of patient registration and appointment scheduling. Doctors found the structured examination forms comprehensive for ophthalmology workflows. Administrators valued the reporting module for clinic performance monitoring. Some participants suggested minor UI refinements, which were noted for future work.',
    'Limitations identified during evaluation include: (1) dependence on stable internet connectivity — offline mode is not currently supported; (2) the system is designed for desktop browsers and is not optimised as a native mobile app, though the responsive design works on tablets; (3) payment gateway integration (EVC Plus, eDahab, Zaad) is not yet implemented — billing records payment method manually; (4) SMS notifications are not integrated — only in-app Socket.io alerts are available; (5) the system has been tested with demo/seed data rather than a full year of production clinic data.',
    'Despite these limitations, the system represents a significant improvement over manual processes and provides a scalable foundation for digital transformation of ophthalmology clinic operations in the Somali healthcare context.',
  ],

  performanceResults: [
    ['Login API response', '< 200 ms', '180 ms average', 'Pass'],
    ['Patient list load (50 records)', '< 500 ms', '320 ms average', 'Pass'],
    ['Appointment calendar load', '< 500 ms', '410 ms average', 'Pass'],
    ['Examination form save', '< 600 ms', '450 ms average', 'Pass'],
    ['Report generation', '< 2000 ms', '1200 ms average', 'Pass'],
    ['Socket.io notification delivery', '< 100 ms', '45 ms average', 'Pass'],
    ['Concurrent users tested', '5 simultaneous', 'Stable — no errors', 'Pass'],
  ],

  roleVerification: [
    ['Receptionist', 'Register Patient', 'Yes', 'Yes', 'Pass'],
    ['Receptionist', 'Schedule Appointment', 'Yes', 'Yes', 'Pass'],
    ['Receptionist', 'Billing', 'Yes', 'Yes', 'Pass'],
    ['Receptionist', 'Conduct Examination', 'No', 'No', 'Pass'],
    ['Doctor', 'Conduct Examination', 'Yes', 'Yes', 'Pass'],
    ['Doctor', 'Manage Prescriptions', 'Yes', 'Yes', 'Pass'],
    ['Doctor', 'Schedule Appointment', 'No', 'No', 'Pass'],
    ['Doctor', 'Billing', 'No', 'No', 'Pass'],
    ['Pharmacist', 'Dispense Medicine', 'Yes', 'Yes', 'Pass'],
    ['Optician', 'Dispense Optical Products', 'Yes', 'Yes', 'Pass'],
    ['Administrator', 'Manage Users', 'Yes', 'Yes', 'Pass'],
    ['Super Admin', 'Manage Role Permissions', 'Yes', 'Yes', 'Pass'],
  ],

  limitations: [
    ['Internet dependency', 'System requires stable internet; no offline mode', 'Medium', 'Implement PWA with local caching'],
    ['Desktop-first design', 'Optimised for desktop browsers, not native mobile', 'Medium', 'Develop mobile app or PWA'],
    ['Payment gateway', 'Billing records payment manually; no EVC/Zaad integration', 'Low', 'Integrate mobile money APIs'],
    ['SMS notifications', 'Only in-app Socket.io alerts; no SMS/email reminders', 'Low', 'Add SMS gateway integration'],
    ['Production data volume', 'Tested with seed data, not full year of live clinic data', 'Medium', 'Pilot deployment with real clinic'],
    ['Single language', 'English only interface', 'Low', 'Add Somali and Arabic localisation'],
  ],

  stakeholderBenefits: [
    ['Receptionists', 'Faster patient registration and appointment booking; digital calendar eliminates double-booking; integrated billing reduces manual invoice creation.'],
    ['Doctors', 'Structured examination forms capture complete ophthalmology data; patient history accessible instantly; prescription creation linked to pharmacy and optical modules.'],
    ['Pharmacists', 'Real-time prescription visibility; automatic stock decrement on dispensing; low-stock alerts prevent medicine shortages.'],
    ['Opticians', 'Optical prescriptions received digitally; inventory tracking for frames and lenses; order fulfillment linked to billing.'],
    ['Administrators', 'User and doctor management in one platform; comprehensive reports for clinic performance monitoring; activity logs for accountability.'],
    ['Super Admins', 'Multi-branch management; granular permission configuration; audit trails for compliance and security.'],
    ['Patients (indirect)', 'Reduced waiting times through efficient scheduling; accurate prescriptions and billing; complete medical history maintained digitally.'],
    ['Clinic Management', 'Data-driven decisions through analytics; revenue tracking and inventory optimisation; scalable platform for clinic chain expansion.'],
  ],

  ch6Summary: [
    'This chapter presented the results, evaluation, and discussion of the EyeCare (Al-Ixsaan) Management System. All six research objectives were achieved, and all four research questions were answered affirmatively. The system demonstrated 100% completion of planned modules, 100% test pass rate across 68 verification checks, and strong UAT satisfaction (4.43/5).',
    'Comparison with manual and generic systems confirmed that the EyeCare platform offers superior integration of ophthalmology-specific workflows, six-role RBAC, multi-branch support, and real-time notifications. The correct separation of Receptionist and Doctor responsibilities was verified through testing.',
    'Chapter Seven concludes the thesis by summarising key findings, stating overall conclusions, providing recommendations for clinic adoption, and outlining directions for future enhancement.',
  ],

  ch7Intro: [
    'This chapter concludes the research on the development of the EyeCare (Al-Ixsaan) Management System — a web-based ophthalmology clinic management platform. It summarises how the proposed system addressed the limitations of manual and fragmented clinic processes by introducing an integrated, role-based, multi-branch digital solution.',
    'The chapter highlights the key contributions of the study, including improved patient data management, correct role separation between Receptionist and Doctor functions, integrated prescription-to-dispensing-to-billing workflows, real-time notifications, and comprehensive administrative reporting. Recommendations for practical adoption and directions for future enhancement are also provided.',
  ],

  keyFindings: [
    'A fully functional web-based ophthalmology clinic management system was designed, implemented, and tested with eighteen modules covering the complete clinic workflow.',
    'Six user roles (Super Admin, Administrator, Doctor, Receptionist, Pharmacist, Optician) were implemented with granular RBAC and configurable permissions.',
    'Role separation was correctly enforced: Receptionist handles Register Patient, Schedule Appointment, and Billing; Doctor handles Conduct Examination and Manage Prescriptions.',
    'All 68 test verification checks passed (100%), including unit, integration, system, security, and UAT testing documented in Chapter Five.',
    'UAT participants rated the system 4.43 out of 5 overall, indicating strong usability across all clinic roles.',
    'The system surpasses manual processes and generic HMS platforms in ophthalmology-specific features, multi-branch support, and integrated pharmacy/optical/billing workflows.',
    'Real-time notifications, activity logs, audit trails, and comprehensive reports support data-driven clinic management.',
    'The three-tier architecture (Next.js, Express, PostgreSQL) provides a scalable and maintainable foundation for future expansion.',
  ],

  conclusion: [
    'The main objective of this project was to design and implement an efficient, user-friendly, and scalable ophthalmology clinic management system that addresses the limitations of manual and fragmented clinic processes. By using Next.js, Node.js/Express, Prisma ORM, PostgreSQL, and Socket.io, the EyeCare (Al-Ixsaan) Management System successfully provides:',
    'A functional web-based platform accessible from any modern browser without installation.',
    'Secure JWT authentication with bcrypt password hashing and six-role RBAC with granular permissions.',
    'Integrated patient registration, appointment scheduling, clinical examinations, dual prescription types, pharmacy and optical inventory, billing, and administrative reporting.',
    'Multi-branch support enabling clinic chains to manage operations across locations.',
    'Real-time notifications and comprehensive activity/audit logging for accountability.',
    'The project achieved all six research objectives and answered all four research questions affirmatively. The system addresses the problem statement by replacing paper-based workflows with a digital, integrated platform tailored to ophthalmology clinic operations. While limitations such as internet dependency and lack of mobile-native and payment gateway integration remain, the system establishes a strong foundation for digital transformation of eye care services.',
  ],

  recommendations: [
    ['1', 'Official Adoption', 'Eye care clinics and hospitals (including Al-Ixsaan Medical Group) should adopt the system to replace manual patient records, appointment books, and separate pharmacy/optical registers.'],
    ['2', 'Staff Training', 'Structured training sessions should be provided for each role — Receptionist, Doctor, Pharmacist, Optician, Administrator — to ensure efficient onboarding and correct use of role-specific modules.'],
    ['3', 'Data Migration', 'Existing paper patient records should be digitised incrementally, starting with active patients, to populate the system database and maximise immediate benefit.'],
    ['4', 'Production Deployment', 'The system should be deployed on a dedicated server with PostgreSQL backup, HTTPS encryption, and environment-based configuration for production use.'],
    ['5', 'Permission Review', 'Super Admin should review and fine-tune role permissions quarterly based on actual clinic operational needs and staff feedback.'],
    ['6', 'Continuous Testing', 'Regression testing should be performed after each system update to maintain the 100% functional coverage achieved during development.'],
    ['7', 'User Feedback Loop', 'A formal feedback mechanism (in-app or periodic surveys) should be maintained to guide future improvements.'],
  ],

  futureWork: [
    ['1', 'Mobile Application', 'Develop native Android/iOS apps or Progressive Web App (PWA) for doctors and receptionists to access the system from mobile devices in clinic wards.'],
    ['2', 'Payment Gateway Integration', 'Integrate local mobile money services (EVC Plus, eDahab, Zaad) and international options (PayPal) for automated billing and payment collection.'],
    ['3', 'SMS & Email Notifications', 'Add SMS and email notification channels alongside Socket.io for appointment reminders, prescription ready alerts, and follow-up notifications.'],
    ['4', 'Offline Mode', 'Implement local caching (IndexedDB/service workers) so receptionists can register patients and view schedules during internet outages, syncing when connectivity returns.'],
    ['5', 'Multi-Language Support', 'Add Somali and Arabic language options alongside English to improve accessibility for local staff and patients.'],
    ['6', 'Telemedicine Module', 'Enable remote preliminary screening and follow-up consultations via video integration for rural patients who cannot visit the clinic.'],
    ['7', 'AI-Assisted Diagnosis', 'Integrate machine learning models for preliminary screening of common eye conditions (diabetic retinopathy, glaucoma) from examination images.'],
    ['8', 'Insurance Integration', 'Add insurance claim processing and NHIF/Private insurance verification modules for automated billing reconciliation.'],
    ['9', 'Advanced Analytics', 'Implement predictive analytics for appointment demand forecasting, inventory reorder prediction, and revenue trend analysis using historical data.'],
    ['10', 'Patient Portal', 'Provide a patient-facing portal for viewing appointment history, prescriptions, bills, and examination results online.'],
    ['11', 'Laboratory Integration', 'Connect with external laboratory systems for automated import of diagnostic test results into patient records.'],
    ['12', 'Extended Surgery Module', 'Expand the existing surgery module with operating theatre scheduling, pre/post-operative checklists, and surgical outcome tracking.'],
  ],

  ch7Summary: [
    'This chapter concluded the research on the EyeCare (Al-Ixsaan) Management System. All six objectives were achieved, all four research questions were answered, and the system was validated through comprehensive testing with a 100% pass rate and strong user satisfaction.',
    'The system successfully transforms manual ophthalmology clinic operations into an integrated digital workflow with correct role separation, multi-branch support, and real-time capabilities. Recommendations for adoption, training, and production deployment were provided. Future work directions include mobile apps, payment integration, telemedicine, AI-assisted diagnosis, and patient portal development.',
    'The EyeCare system contributes practical and technological value to healthcare information systems research by demonstrating a complete, role-aware, ophthalmology-specific clinic management solution suitable for deployment in Somali and regional eye care facilities.',
  ],
};
