# EyeCare — Use Case Diagram

## Thesis figure

**PNG:** `docs/use-case-diagram.png`  
**Preview:** `docs/use-case-diagram.html`  
**Data:** `scripts/use-case-diagram-data.js`

- **4-quadrant layout** inside system boundary (reference style)
- **No title bar** — white background, black-and-white actors
- **Receptionist** → Register Patient, Schedule Appointment, Billing
- **Doctor** → View Dashboard, Conduct Examination, Manage Prescriptions (does **not** schedule)

### Export PNG

```powershell
node scripts/render-use-case-png.js
```

---

## Actors & use cases

| Actor | Use cases |
|-------|-----------|
| **Receptionist** | Register Patient, **Schedule Appointment**, Billing |
| **Doctor** | View Dashboard, **Conduct Examination**, Manage Prescriptions |
| **Pharmacist** | Dispense Medicine, Manage Pharmacy Inventory, Pharmacy Sales |
| **Super Admin** | Manage Branches, Manage Role Permissions, Activity & Audit Logs |
| **Administrator** | Manage Users, Manage Doctors, View Reports |
| **Optician** | View Prescription, Manage Optical Inventory, Dispense Optical Products |

> **Optometrist** in the old diagram is now **Optician** in this system.

---

## Changes from old 4-actor diagram

| Old | Updated |
|-----|---------|
| 4 actors | **6 actors** (+ Super Admin, Pharmacist) |
| Optometrist | **Optician** |
| Administrator only | Super Admin + Administrator (separate) |
| No pharmacy module | Pharmacist use cases added |
| No branches/permissions/logs | Super Admin use cases added |
| Doctor: Manage Appointment | **Conduct Examination**, Manage Prescriptions |
| Admin: Manage Roles | Split: **Manage Role Permissions** (Super Admin), **Manage Users** (Admin) |
| Admin: System Settings | **View Reports** (matches live reports module) |

---

## Full system mapping (for report text)

Each use case above represents a module in the live app:

- **Register Patient** → `/dashboard/patients`
- **Schedule Appointment** → `/dashboard/appointments`
- **Billing** → `/dashboard/billing`
- **View Dashboard** → role dashboards (`/dashboard/doctor`, etc.)
- **Conduct Examination** → preliminary & clinical exams
- **Manage Prescriptions** → medicine & optical prescriptions
- **Dispense Medicine** → pharmacy dispensing + billing
- **Manage Pharmacy Inventory** → `/dashboard/pharmacy/inventory`
- **Pharmacy Sales** → `/dashboard/pharmacy`
- **Manage Branches** → `/dashboard/admin/branches`
- **Manage Role Permissions** → `/dashboard/admin/permissions`
- **Activity & Audit Logs** → activity log & audit trail
- **Manage Users** → `/dashboard/admin/users`
- **Manage Doctors** → `/dashboard/admin/doctors`
- **View Reports** → `/dashboard/reports/*`
- **View Prescription** → optical prescriptions
- **Manage Optical Inventory** → frames, lenses, orders
- **Dispense Optical Products** → optical shop sales + billing
