# EyeCare Management System – Completion Plan

This document summarizes **what is complete**, **what must be built**, and **what to improve** so the system is ready for real clinical eye care use (including your country’s eye care practice). It also explains **follow-up logic** (as requested by your teacher) and how **pharmacy/optical inventory** should be covered.

---

## 1. What Is Complete Now

### 1.1 Core clinical flow (end-to-end)
- **Patients**: CRUD, list, search, patient detail page with timeline of appointments/exams/surgeries/prescriptions.
- **Appointments**: Book, list, filter by date/status, link to doctor and patient.
- **ER Examination**: Record VA (right/left), PH, IOP, notes; linked to appointment.
- **Clinical Examination**: Refraction (Sph/Cyl/Axis both eyes), diagnosis, management plan; linked to appointment and doctor.
- **Prescriptions**: Add from clinical exam (pharmacy or optical item), quantity, instructions; linked to appointment and exam.
- **Surgeries**: Schedule from clinical exam (type, eye side, date, cost, surgeon); list with filters; seed data.
- **Billing**: Per patient; links to appointment, surgery, or prescription; service types APPOINTMENT | PHARMACY | OPTICAL | SURGERY; status PAID/UNPAID/PARTIAL.

### 1.2 Inventory (basic)
- **Pharmacy**: Items (name, category, batch, stock, reorder level, purchase/selling price, expiry); CRUD; visible Edit/Delete buttons; seed data.
- **Optical**: Items (name, type, brand, stock, reorder, prices); CRUD; seed data (frames, lenses, solutions).
- **Schema**: `PharmacyStockTransaction` and `OpticalStockTransaction` exist (type, quantity, unitPrice, billingId, performedBy, transactionDate) but **are not yet used** when dispensing or selling (stock is not auto-updated from prescriptions/billing).

### 1.3 Admin & operations
- **Roles**: SUPERADMIN, ADMIN, DOCTOR, RECEPTIONIST, OPTICIAN, PHARMACIST.
- **Branches**: Multi-branch support; staff assignment.
- **Users & doctors**: CRUD; doctor profile (license, specialization).
- **Reports**: Daily summary, patients, appointments, inventory, billing, expiring items; PDF export.
- **UI**: Fixed tables (no horizontal scroll where applied), pagination with explanation, consistent action buttons across list pages.

### 1.4 What is still missing or weak
- **No follow-up system**: No scheduled follow-up dates, no “next review” or “follow-up due” from exams, prescriptions, or surgeries.
- **No patient eye history view**: Timeline is appointment-centric; there is no single “eye history” (e.g. refraction over time, IOP trend, surgeries per eye).
- **Inventory not wired to clinical flow**: Dispensing a prescribed item does not create stock transactions or reduce stock; billing for pharmacy/optical does not reserve or deduct inventory.
- **Pharmacy/Optical**: No suppliers table, no purchase orders, no expiry alerts in workflow, no low-stock workflow (e.g. reorder list).

---

## 2. Follow-Up Plan (Teacher Requirement – “Apply Follow-Up Like Real Clinical”)

Real eye care practice uses follow-ups for:
- **Post-examination**: “Review in 2 weeks / 1 month / 3 months” (e.g. glaucoma, refraction).
- **Post-prescription**: “Return after finishing drops” or “Review IOP after 4 weeks on medication.”
- **Optical**: “Glasses check in 6 months” or “Contact lens follow-up in 1 month.”
- **Post-surgery**: “Day 1, Week 1, Month 1, Month 3” check-ups.

### 2.1 How to implement follow-ups in your system

**Option A – Reuse appointments (recommended for FYP scope)**  
- Add an optional **“Follow-up of”** link on **Appointment**:  
  `followUpOfAppointmentId` (self-reference) or `followUpOfExamId` / `followUpOfSurgeryId`.  
- When closing a **Clinical Exam**, the doctor can set **“Next review date”** and optionally **“Reason”** (e.g. “IOP check”, “Refraction review”).  
- Backend creates a **suggested follow-up appointment** (or a record in a new table, see below) linked to that exam.  
- Surgeon can set **“Next follow-up date”** on **Surgery** (e.g. 1 week, 1 month).  
- **Prescription** can have optional **“Review after”** (e.g. “2 weeks”) so the system can suggest a follow-up appointment.  

**Option B – Dedicated follow-up table (clearer for reporting)**  
- New model: **FollowUp**  
  - `id`, `patientId`, `branchId`  
  - `sourceType`: `EXAMINATION` | `PRESCRIPTION` | `SURGERY` | `OPTICAL`  
  - `sourceId`: ID of the clinical exam / prescription / surgery (or optical order if you add it)  
  - `dueDate`, `status`: `PENDING` | `DONE` | `CANCELLED` | `OVERDUE`  
  - `notes` (e.g. “IOP check”, “Post-cataract day 7”)  
  - Optional: `completedAppointmentId` when the follow-up is done via an appointment  

- **Where to set follow-up**  
  - **Clinical examination**: Add fields `nextReviewDate`, `nextReviewReason`; on save, create a **FollowUp** with `sourceType: EXAMINATION`, `sourceId: clinical.id`.  
  - **Surgery**: Add `nextFollowUpDate` (and optionally more scheduled dates); on save, create **FollowUp** with `sourceType: SURGERY`.  
  - **Prescription**: Add optional `reviewAfterDays` or `nextReviewDate`; on save, create **FollowUp** with `sourceType: PRESCRIPTION`.  
  - **Optical**: When you add “optical order” or “glasses dispensed”, add optional follow-up (e.g. “Glasses check in 6 months”) with `sourceType: OPTICAL`.  

### 2.2 Tracking and visibility
- **Patient detail page**: Show a **“Follow-ups”** section: list of pending/overdue follow-ups (due date, source type, reason), with “Book appointment” linking to create an appointment for that follow-up.
- **Dashboard or list**: “Due follow-ups today / this week” (by branch or doctor).
- **Reports**: “Overdue follow-ups” or “Follow-up completion rate.”

This gives you a clear answer for your teacher: *“The system applies follow-up by linking examinations, prescriptions, surgeries (and optical) to a follow-up plan with due dates and status, and allows scheduling the actual follow-up via appointments.”*

---

## 3. Patient Eye History and Tracking

- **Current**: Patient page shows **appointments** with nested exam/surgery/prescription info (good start).  
- **Improvement**:  
  - **Structured eye history**: One section “Right eye” / “Left eye” with:  
    - Refraction over time (from ClinicalExamination: sph, cyl, axis by date).  
    - IOP over time (from ER examination).  
    - Surgeries per eye (from Surgery.eyeSide).  
    - Key diagnoses and management plans (from ClinicalExamination).  
  - **Timeline**: Keep current appointment timeline; add filters “Exams only”, “Surgeries only”, “Prescriptions only” for easier tracking.

Implementation: Backend API that returns “patient eye history” (exams + ER + surgeries grouped by eye and date). Frontend: “Eye history” tab or section on patient detail with charts or tables (e.g. IOP trend, refraction change).

---

## 4. Pharmacy & Optical Inventory – What to Add and Improve

These modules are “covered” inside the eye care system but should feel complete for daily use without building a full separate ERP.

### 4.1 Pharmacy module

**Already have**  
- PharmacyItem (name, type, category, manufacturer, supplier name, batch, stock, reorder level, purchase/selling price, expiry).  
- PharmacyStockTransaction (type IN/OUT/ADJUST, quantity, unitPrice, billingId, performedBy, date).  

**Add / improve**  
1. **Wire dispensing to stock**  
   - When billing is created for a **PHARMACY** prescription (or when “dispense” is confirmed):  
     - Create **PharmacyStockTransaction** (type OUT, quantity from prescription, unitPrice from item selling price, billingId).  
     - Decrease **PharmacyItem.stockQuantity** (and validate stock >= 0).  
   - Optional: “Stock in” flow (IN transaction + increase stock) from a simple “Receive stock” form (item, quantity, unit price, optional batch/expiry).  
2. **Expiry and low-stock**  
   - Dashboard or report: “Expiring in 30/60/90 days”; “Below reorder level.”  
   - Optional: **ReorderRequest** or “Reorder list” (item, suggested quantity from reorder level).  
3. **Optional extra tables (if time)**  
   - **Supplier** (name, contact, branch): link PharmacyItem.supplierName to Supplier.id.  
   - **PurchaseOrder** (supplier, date, status, total): for “we ordered 50 bottles” tracking (optional for FYP).  

### 4.2 Optical module

**Already have**  
- OpticalItem (name, type, brand, manufacturer, supplier, stock, reorder, prices).  
- OpticalStockTransaction (same idea as pharmacy).  

**Add / improve**  
1. **Wire dispensing to stock**  
   - When billing is created for **OPTICAL** (e.g. glasses or contact lenses from prescription):  
     - Create **OpticalStockTransaction** (OUT) and decrease **OpticalItem.stockQuantity**.  
   - Optional: “Stock in” (IN) from a “Receive stock” form.  
2. **Low-stock and reorder**  
   - Same idea as pharmacy: list items below reorder level; optional reorder list.  
3. **Optional**  
   - **Supplier** (shared with pharmacy or separate): link to OpticalItem.  
   - If you add “optical order” (e.g. custom glasses), link that to prescription and billing and optional follow-up “Glasses check in 6 months.”  

### 4.3 Shared improvements for both
- **Stock adjustment**: UI to add “Adjust stock” (creates ADJUST transaction and updates quantity) with reason/note (optional in schema).  
- **Transaction history**: List PharmacyStockTransaction / OpticalStockTransaction per item (or per branch) with date, type, quantity, user, linked billing.  
- **Simple dashboard**: “Pharmacy: 5 items low stock, 3 expiring this month”; “Optical: 2 items low stock.”  

---

## 5. What Needs to Be Built (Summary)

| Area | What to build |
|------|----------------|
| **Follow-ups** | FollowUp model (or reuse Appointment with follow-up link); set next review from exam/surgery/prescription; list due/overdue follow-ups on patient and dashboard. |
| **Patient eye history** | API + UI: refraction/IOP/surgeries per eye over time; optional simple charts. |
| **Dispensing → stock** | On pharmacy/optical billing (or “dispense” action): create OUT transaction and decrease item stock; validate stock. |
| **Stock in** | Simple “Receive stock” flow: IN transaction + increase stock (pharmacy + optical). |
| **Expiry / low-stock** | Reports or dashboard widgets: expiring items; below reorder level; optional reorder list. |
| **Optional** | Suppliers table; stock adjustment UI; transaction history per item. |

---

## 6. What Needs Improvement (No New Tables Required)

- **Reports**: Ensure all report types work with current data (daily summary, patients, appointments, inventory, billing, expiring).  
- **Billing**: Ensure “Record payment” and filters work; optional payment method and simple payment history.  
- **Prescriptions**: When item is pharmacy/optical, show item name and stock (and warn if low/out of stock).  
- **Surgeries**: Already seeded; ensure filters (status, date) and patient name display are good.  
- **Multi-branch**: Ensure all lists (patients, appointments, inventory, billing) respect branch; branch switch works.  
- **Roles**: OPTICIAN/PHARMACIST see only relevant menus (inventory, prescriptions, billing for their domain).  

---

## 7. Priorities (Order of Implementation)

Suggested order so the system feels complete for real clinical use and satisfies your teacher’s follow-up question:

1. **P1 – Follow-ups (must have for teacher)**  
   - Add FollowUp model (or appointment-based follow-up).  
   - Add “Next review date/reason” to clinical exam and create follow-up record.  
   - Add “Next follow-up date” to surgery and create follow-up record.  
   - Optional: “Review after” on prescription.  
   - Patient page: “Follow-ups” section; dashboard: “Due follow-ups today/this week.”  

2. **P2 – Dispensing reduces stock**  
   - When billing is created for PHARMACY/OPTICAL (linked to prescription with item), create OUT transaction and decrease stock; validate stock before creating billing.  
   - Prevents overselling and ties prescriptions to inventory.  

3. **P3 – Patient eye history**  
   - API: patient eye history (refraction, IOP, surgeries by eye and date).  
   - Patient detail: “Eye history” section or tab (tables/charts).  

4. **P4 – Stock in (receive stock)**  
   - Simple form: select item, quantity, unit price; create IN transaction and increase stock (pharmacy + optical).  

5. **P5 – Expiry and low-stock**  
   - Report/dashboard: expiring items; below reorder level; optional “Reorder list” view.  

6. **P6 – Optional enhancements**  
   - Stock adjustment UI; transaction history per item; Suppliers table; better role-based menus for OPTICIAN/PHARMACIST.  

---

## 8. Short Answer for Your Teacher

**“Does the system support a follow-up plan like real clinical practice?”**  
- **Currently**: Not yet; there is no follow-up table or “next review” on exams/surgeries/prescriptions.  
- **Planned**: Yes. We will add a **follow-up plan** so that:  
  - After an **examination**, the doctor can set a **next review date** and reason; the system records it and shows “Due follow-ups” on the patient and on the dashboard.  
  - After **surgery**, the surgeon can set **post-op follow-up dates** (e.g. 1 week, 1 month); the system tracks them and links completion to an appointment.  
  - **Prescriptions** (medicine/optical) can have an optional “review after” so the patient is reminded to return (e.g. after finishing drops or for a glasses check).  
  - All follow-ups are **tracked** (pending/done/overdue) and can be **scheduled** as appointments, so the clinic runs like real eye care practice.  

This plan keeps the system focused on **eye care management** while **covering pharmacy and optical inventory** in a way that is consistent with real use (stock in/out, reorder and expiry awareness) without building two separate systems.
