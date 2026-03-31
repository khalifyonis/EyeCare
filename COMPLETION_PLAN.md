# EyeCare System – Completion Plan & Priorities

This document summarizes **what is working**, **what is missing**, and **recommended order** to complete the system.

---

## 1. What Is Working Now

### Backend (API)
| Area | Status | Notes |
|------|--------|--------|
| **Auth** | ✅ Done | Login, logout, /auth/me, forgot/reset password |
| **Users** | ✅ Done | CRUD, role + branch assignment |
| **Branches** | ✅ Done | CRUD, list |
| **Doctors** | ✅ Done | List (from users with doctor profile) |
| **Patients** | ✅ Done | CRUD, stats, search, branch filter |
| **Appointments** | ✅ Done | CRUD, stats, search, status/date/doctor filter |
| **Dashboard** | ✅ Done | Aggregated stats, recent patients/appointments |
| **Role-based API** | ✅ Done | `authorize(...roles)` on routes |

### Frontend
| Area | Status | Notes |
|------|--------|--------|
| **Login / Forgot / Reset password** | ✅ Done | |
| **Dashboard layout** | ✅ Done | Sidebar, header, theme, **role-based route guard** |
| **Role dashboards** | ✅ Done | Admin/Doctor/Receptionist/etc. overview page |
| **Admin: Users** | ✅ Done | List, add/edit, delete, search/role/sort |
| **Admin: Doctors** | ✅ Done | List, add/edit, search/spec/status/sort |
| **Admin: Branches** | ✅ Done | List, add/edit, search/status/sort |
| **Patients** | ✅ Done | List, add/edit, delete, stats, book appointment, detail page |
| **Appointments** | ✅ Done | List, edit, delete, stats, search/status/date/doctor |
| **Profile** | ✅ Done | User profile page |
| **Auth & permissions** | ✅ Done | Token + role guard; no unauthorized URL access |

---

## 2. What Is Not Built (Gaps)

### Backend – No API Yet
These **exist in the database schema** but have **no routes or controllers**:

| Module | Schema models | Purpose |
|--------|----------------|---------|
| **Examinations** | ERExamination, ClinicalExamination | ER (VA, IOP, etc.) + clinical exam per appointment |
| **Prescriptions** | Prescription | Link appointment/exam to pharmacy/optical items |
| **Surgeries** | Surgery | Surgery linked to clinical exam, branch, surgeon |
| **Billing** | Billing | Invoicing (appointment, pharmacy, optical, surgery) |
| **Pharmacy** | PharmacyItem, PharmacyStockTransaction | Inventory + stock movements |
| **Optical** | OpticalItem, OpticalStockTransaction | Optical inventory + stock |

### Frontend – Sidebar Links to `#`
These menu items **do not navigate** to real pages yet:

- **CLINICAL:** Examinations, Prescriptions, Medical Reports  
- **OPERATIONS:** Inventory, Billing, Messages, Email, Tasks  
- **SYSTEM:** Activity Logs, Settings  
- **Pharmacist/Optician/Receptionist** sub-menus (Prescriptions, Inventory, Billing, etc.)

---

## 3. Recommended Priorities (Order to Complete)

### Phase 1 – Core clinical flow (high impact)
1. **Examinations**
   - Backend: API for ER examination + clinical examination (create/read/update, linked to appointment).
   - Frontend: Examinations list (filter by appointment/date/doctor) + form to record ER and clinical exam for an appointment.
   - Roles: DOCTOR (and ADMIN) for recording/viewing.
2. **Prescriptions**
   - Backend: CRUD for prescriptions (link to appointment, exam, branch, item type/id, quantity).
   - Frontend: Prescriptions list + create from appointment/exam.
   - Roles: DOCTOR (create), RECEPTIONIST/PHARMACIST/OPTICIAN (view/fulfill as needed).

### Phase 2 – Revenue & operations
3. **Billing**
   - Backend: CRUD for billing (patient, branch, service type, amounts, status).
   - Frontend: Billing list + create from appointment/prescription/surgery.
   - Roles: RECEPTIONIST, ADMIN (and optionally others by your policy).
4. **Inventory (Pharmacy + Optical)**
   - Backend: CRUD for PharmacyItem & OpticalItem; stock transactions (IN/OUT/ADJUST).
   - Frontend: Separate Pharmacy and Optical inventory pages (list, add/edit, stock movements).
   - Roles: PHARMACIST (pharmacy), OPTICIAN (optical), ADMIN for both.

### Phase 3 – Extra clinical & system
5. **Surgeries**
   - Backend: CRUD for Surgery (linked to clinical exam, branch, surgeon).
   - Frontend: Surgeries list + create from exam.
   - Roles: DOCTOR, ADMIN.
6. **Medical reports**
   - Backend: Endpoints to aggregate data (e.g. by period, branch, doctor) for reports.
   - Frontend: Reports page(s) with filters and simple charts/tables.
7. **Settings**
   - Frontend: Settings page (e.g. profile, branch preference, password change) – can reuse/expand profile.
8. **Activity logs** (optional)
   - Backend: Log table + API to record key actions and list logs.
   - Frontend: Activity log page (filter by user/date/action).

### Phase 4 – Lower priority / later
9. **Messages / Email / Tasks**  
   - Can stay as placeholders or be simple in-app messaging/task lists later.

---

## 4. Improvements (No New Features)

- **Global search (header):** Connect “Search patients, doctors…” to real search (e.g. navigate to patients/appointments with query).
- **Patient detail:** Show list of appointments and examinations (and later prescriptions) on patient detail page.
- **Appointment detail:** Optional dedicated appointment view with ER/clinical exam, prescription, and billing summary.
- **Dashboard charts:** Replace or supplement mock data with real API data where possible.
- **Error handling:** Consistent toast + optional error boundary on key pages.
- **Loading states:** Skeleton or spinner on all list/detail pages that fetch data.
- **Validation:** Ensure all forms use the same validation rules as backend (e.g. Joi schemas reflected on frontend).

---

## 5. Quick Reference – Route Access (Already Implemented)

| Path | Allowed roles |
|------|----------------|
| `/dashboard/admin/*` | ADMIN, SUPERADMIN |
| `/dashboard/doctor` | DOCTOR |
| `/dashboard/receptionist` | RECEPTIONIST |
| `/dashboard/pharmacist` | PHARMACIST |
| `/dashboard/optician` | OPTICIAN |
| `/dashboard/patients`, `/dashboard/appointments`, `/dashboard/profile` | All authenticated |

---

## 6. Suggested Next Step

Start with **Phase 1 – Examinations**: add backend APIs (ER + clinical exam), then the Examinations page and recording form. That completes the core “appointment → examination” flow and sets the base for prescriptions and billing.
