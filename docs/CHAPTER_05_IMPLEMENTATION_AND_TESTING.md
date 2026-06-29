# CHAPTER FIVE — SYSTEMS IMPLEMENTATION & OPERATION

> **Complete Word file (20+ pages, light mode screenshots, diagrams):**  
> `docs/CHAPTER_05_IMPLEMENTATION_AND_TESTING_FINAL.docx`  
> Regenerate: `npm run chapter5:docx`

# CHAPTER FIVE
# SYSTEMS IMPLEMENTATION & OPERATION

## 5.0 Introduction

This chapter describes the practical implementation and deployment process of the **EyeCare (Al-Ixsaan) Management System**, including the development tools used, PostgreSQL and Prisma integration, role-based module implementation, user testing, and how the system operates in a real clinic environment. The EyeCare system is a web-based ophthalmology clinic management platform that supports patient registration, appointment scheduling, clinical examinations, prescriptions, pharmacy and optical dispensing, billing, and administrative reporting across multiple clinic branches.

---

## 5.1 Implementation Tools and Environment

The system was developed using the following tools and technologies:

**Table 5.1 Implementation Tools**

| Tool / Platform | Purpose |
|-----------------|---------|
| Next.js | Frontend web application framework |
| React & TypeScript | User interface components and type-safe development |
| Tailwind CSS | Responsive styling and layout |
| Node.js | JavaScript runtime for the backend server |
| Express.js | REST API and route handling |
| Prisma ORM | Database schema management and queries |
| PostgreSQL | Relational database for clinic data |
| JWT (jsonwebtoken) | User authentication and session tokens |
| bcrypt | Secure password hashing |
| Joi | Server-side input validation |
| Socket.io | Real-time notifications |
| Axios | Frontend HTTP client for API requests |
| Recharts | Dashboard charts and analytics |
| jsPDF | PDF export for reports and receipts |
| Visual Studio Code | Integrated development environment |

---

## 5.2 System Setup and Deployment Steps

1. **Project Initialization** — Created the project with a Next.js frontend (`frontend/`) and Node.js/Express backend (`backend/`), with modules for authentication, patients, appointments, examinations, prescriptions, pharmacy, optical shop, billing, and administration.

2. **Database Configuration** — Connected to PostgreSQL using Prisma. Configured `DATABASE_URL` in `backend/.env` and applied migrations with `npx prisma migrate deploy`.

3. **Authentication Integration** — Implemented login and password reset with JWT tokens. Each user is assigned a role: Super Admin, Administrator, Doctor, Receptionist, Pharmacist, or Optician.

4. **Database Setup** — Created relational tables for branches, users, patients, appointments, eye examinations, medicine prescriptions, optical prescriptions, pharmacy items, optical items, billing, activity logs, and audit logs. Role-based permissions are stored in the `role_permissions` table.

5. **UI Design and Routing** — Built responsive dashboards, data tables, forms, and sidebar navigation. Each role sees only the modules they are permitted to access.

6. **Testing & Debugging** — Performed unit, integration, system, and user acceptance testing with sample clinic workflows.

**Deployment commands (from project root):**

```bash
npm run install-all
cd backend && npx prisma migrate deploy && npm run seed
npm run dev
```

- Backend API: `http://localhost:5000`
- Frontend application: `http://localhost:3000`

---

## 5.3 System Operations

After deployment, the system operates as follows:

### 1. Receptionist

1. Log in with receptionist credentials.
2. Register new patients with demographic and contact details.
3. Schedule, reschedule, or cancel appointments for patients with doctors.
4. Generate bills and record payments for consultations, pharmacy, and optical services.
5. View appointment calendar and patient lists for the assigned branch.

### 2. Doctor

1. Log in with doctor credentials.
2. View the role dashboard showing today’s appointments and patient queue.
3. Conduct preliminary and clinical eye examinations.
4. Create and manage medicine and optical prescriptions for patients.
5. View patient examination history and follow-up records.

> **Note:** The Doctor does **not** schedule appointments or handle billing — those are Receptionist responsibilities.

### 3. Pharmacist

1. Log in with pharmacist credentials.
2. View medicine prescriptions created by doctors.
3. Manage pharmacy inventory (stock, purchases, transactions).
4. Dispense medicine against valid prescriptions; dispensing is linked to billing.
5. Receive low-stock notifications in real time.

### 4. Optician

1. Log in with optician credentials.
2. View optical prescriptions issued by doctors.
3. Manage optical inventory (frames, lenses, stock transactions).
4. Create and fulfill optical shop orders; dispensing is linked to billing.

### 5. Administrator

1. Log in with administrator credentials.
2. Manage users and doctor profiles for the clinic branch.
3. Access operational and financial reports.
4. Monitor clinic activity through dashboards.

### 6. Super Admin

1. Log in with super admin credentials.
2. Manage clinic branches and branch assignments.
3. Configure role permissions per module (read, create, update, delete).
4. Review activity logs and audit trails across branches.

### 7. Data Updates

1. All user actions are saved to PostgreSQL through the REST API.
2. Profile images are stored on the server using Multer file upload.
3. Real-time notifications are pushed to connected clients via Socket.io.
4. Changes made by one role (e.g., a new appointment) are immediately visible to other authorized roles.

---

## 5.4 Coding and Modules

The system was structured into modules for better maintainability:

1. **Authentication Module** — User login, JWT token issuance, password reset, and role verification (`/api/auth`).

2. **Patient Module** — Patient registration, search, profile view, and medical history (`/api/patients`).

3. **Appointment Module** — Schedule, edit, cancel, and calendar view of appointments. Used by the **Receptionist** (`/api/appointments`).

4. **Examination Module** — Preliminary and clinical eye examinations recorded by the **Doctor** (`/api/eye-examinations`).

5. **Prescription Module** — Medicine prescriptions (`/api/prescription-items`) and optical prescriptions (`/api/prescriptions`) created by the **Doctor**.

6. **Pharmacy Module** — Inventory management, stock transactions, and medicine dispensing by the **Pharmacist** (`/api/inventory/pharmacy`).

7. **Optical Shop Module** — Frame and lens catalog, orders, and optical product dispensing by the **Optician** (`/api/inventory/optical`).

8. **Billing Module** — Invoice creation, payment recording, and receipts. Used by the **Receptionist** (`/api/billing`).

9. **Administration Module** — User management, doctor profiles, branch management, and permission configuration (`/api/users`, `/api/doctors`, `/api/branches`, `/api/permissions`).

10. **Reports Module** — Clinical, financial, appointment, inventory, and operational reports (`/api/reports`).

11. **Logging Module** — Activity logs and audit trails for accountability (`/api/activity-logs`, `/api/audit-logs`).

12. **Notification Module** — Real-time alerts for appointments, low stock, and billing events (`/api/notifications` + Socket.io).

13. **Dashboard Module** — Role-specific KPIs and summary statistics (`/api/dashboard`).

---

## 5.5 Testing Strategy

### 5.5.1 Purpose of Testing

System testing was conducted to verify that the implemented functionalities work correctly and meet the requirements defined during the analysis and design phases in Chapter Four. The aim was to ensure that all six user roles — Receptionist, Doctor, Pharmacist, Optician, Administrator, and Super Admin — behave as expected under real clinic usage, and that each role can perform only the tasks assigned to them in the use case diagram.

### 5.5.2 Types of Testing Performed

#### 5.5.2.1 Unit Testing

Individual components were tested in isolation, including:

- Login form validation (valid and invalid credentials).
- Patient registration form (required fields and data types).
- Appointment scheduling form (date, time, doctor, and patient selection).
- Billing form (line items, totals, and payment status).
- Joi validation on API endpoints (rejecting malformed requests).

**Figure 5.1: Screenshots of Tested Components (Login, Patient Registration, and Appointment Scheduling)**

> *[Insert screenshot: Login screen | New Patient form | New Appointment form — side by side]*

#### 5.5.2.2 Integration Testing

Verified that different modules work together smoothly, including:

- Authentication → protected API routes (JWT middleware blocks unauthorized access).
- Patient registration → appointment scheduling → examination record linking.
- Doctor prescription → pharmacy dispensing → billing generation.
- Doctor optical prescription → optical shop order → billing generation.
- Role permissions → sidebar navigation and API access control.

**Figure 5.2: Integration Testing**

> *[Insert flowchart: Login → JWT Authentication → PostgreSQL Query → Role Dashboard]*

#### 5.5.2.3 System Testing

The entire system was tested end-to-end, covering the full clinic workflow:

1. Receptionist registers a patient and schedules an appointment.
2. Doctor logs in, conducts examination, and creates prescriptions.
3. Pharmacist dispenses medicine; Optician dispenses optical products.
4. Receptionist generates billing and records payment.
5. Administrator views reports; Super Admin reviews audit logs.

**Figure 5.3: System Testing Flow Demonstrating Full End-to-End Functionality**

> *[Insert screenshots: Login | Appointment Calendar | Examination Page | Billing Page — side by side]*

#### 5.5.2.4 User Acceptance Testing (UAT)

Selected users (or team members acting as role representatives) were allowed to use the system and provide feedback about usability, performance, and errors. Receptionist, Doctor, Pharmacist, and Administrator workflows were each tested separately.

**Figure 5.4: User Acceptance Testing Process and Feedback Flow**

> *[Insert diagram: User → Test System → Feedback → Improvements]*

---

## 5.6 Test Cases and Results

**Table 5.2 Testing Results**

| Test Case | Expected Result | Actual Result | Status |
|-----------|-----------------|---------------|--------|
| User login with valid credentials | JWT token issued; redirect to role dashboard | Token received; correct dashboard displayed | ✅ |
| Login with wrong password | Error message displayed; access denied | "Invalid credentials" shown | ✅ |
| Receptionist registers patient | Patient saved and visible in patient list | Patient created with unique ID | ✅ |
| Receptionist schedules appointment | Appointment saved with status SCHEDULED | Appointment appears on calendar | ✅ |
| Doctor tries to schedule appointment | Access denied — scheduling is Receptionist only | Route hidden; API returns 403 | ✅ |
| Doctor conducts clinical examination | Examination record linked to patient | Record saved in database | ✅ |
| Doctor creates medicine prescription | Prescription visible to pharmacist | Prescription listed in pharmacy module | ✅ |
| Pharmacist dispenses medicine | Stock reduced; transaction logged | Dispensing recorded; stock updated | ✅ |
| Optician dispenses optical product | Order created; inventory updated | Optical order saved successfully | ✅ |
| Receptionist creates bill | Invoice generated with correct total | Bill created and payment recorded | ✅ |
| Dispense same medicine twice without stock | Warning shown; duplicate not allowed | "Insufficient stock" error displayed | ✅ |
| Doctor accesses admin dashboard | Denied access or hidden route | HTTP 403; menu not visible | ✅ |
| Real-time notification on low stock | Alert shown on pharmacist dashboard | Socket.io notification received | ✅ |
| Super Admin updates role permission | Permission change applied immediately | Receptionist delete access blocked | ✅ |
| Generate appointment report | Filtered data displayed for date range | Report rendered with correct counts | ✅ |

> **Note for Word formatting:** Add a screenshot column between "Actual Result" and "Status" (as in the JU Hall Event reference thesis) showing the relevant screen for each test case.

---

## 5.7 Validation and Verification

**Validation:** Ensured that system functions meet the requirements specified in Chapter Four. Each use case from the use case diagram was verified:

- **Receptionist** → Register Patient, Schedule Appointment, Billing ✅
- **Doctor** → View Dashboard, Conduct Examination, Manage Prescriptions ✅
- **Pharmacist** → Dispense Medicine, Manage Pharmacy Inventory, Pharmacy Sales ✅
- **Optician** → View Prescription, Manage Optical Inventory, Dispense Optical Products ✅
- **Administrator** → Manage Users, Manage Doctors, View Reports ✅
- **Super Admin** → Manage Branches, Manage Role Permissions, Activity & Audit Logs ✅

**Verification:** Confirmed that the implementation matches the design specifications:

- Database schema matches the ERD (entities, relationships, UUID keys).
- API endpoints correspond to the system architecture diagram.
- UI pages match the navigation structure designed in Chapter Four.

**Security Measures:**

1. Only authenticated users can access protected features.
2. JWT middleware validates tokens on every API request.
3. Role-based and permission-based access control on all modules.
4. Passwords hashed with bcrypt — never stored in plain text.
5. Activity and audit logs record all sensitive operations.

**Figure 5.5: Validation and Verification Flow with Security Enforcement**

> *[Insert flowchart: Requirements → Implementation → Testing → Validation → Verified System]*

---

## 5.8 Chapter Summary

The EyeCare (Al-Ixsaan) Management System was successfully implemented using Next.js, Node.js/Express, Prisma ORM, and PostgreSQL. The application is capable of handling real-time patient management, appointment scheduling, clinical examinations, prescription workflows, pharmacy and optical dispensing, billing, and administrative reporting across multiple clinic branches.

The structured deployment and modular coding approach ensures stability, maintainability, and scalability for future enhancements. All major test cases passed, confirming that the system meets the operational needs of an ophthalmology clinic and correctly enforces role-based responsibilities — particularly that the **Receptionist** handles registration, scheduling, and billing, while the **Doctor** handles examinations and prescriptions.

The next chapter (Chapter Six) presents the results, evaluation metrics, comparison with existing systems, and discussion of findings.

---

## Figures Checklist (for Microsoft Word)

| Figure | What to capture from the running app |
|--------|--------------------------------------|
| Figure 5.1 | Login + Patient Registration + Appointment form (3 screenshots) |
| Figure 5.2 | Integration flow diagram (Login → Auth → DB → Dashboard) |
| Figure 5.3 | End-to-end flow: Login, Calendar, Examination, Billing (4 screenshots) |
| Figure 5.4 | UAT process diagram (User → Test → Feedback → Improve) |
| Figure 5.5 | Validation flow diagram with security steps |
| Table 5.2 | Add screenshot per row where possible |

---

*End of Chapter Five*
