# EyeCare Patient Journey - Complete Workflow Data Dictionary

## 1) Purpose
This document explains the full patient workflow from arrival to dispensing and payment.
It lists each page, the columns shown, the form fields accepted, which fields are required, and what each field means.

## 2) End-to-End Flow (Recommended Order)
1. Register patient
2. Create appointment
3. Complete eye examination
4. Create clinical prescription
5. Dispense in pharmacy and complete sale
6. Verify billing, stock movement, and reports

## 3) Page-by-Page Data Dictionary

### A. Patients List
Route: /dashboard/patients

Table columns:
- ID: Short display of internal patient id
- Patient Name: Full name + gender badge
- Contact: Phone + email
- Birth Date: Date of birth
- Branch: Branch where patient is registered
- Actions: Book appointment, edit, delete

### B. Add New Patient
Route: /dashboard/patients/new

Required fields:
- First Name: Patient given name
- Last Name: Patient family name
- Date of Birth: Birth date
- Gender: MALE or FEMALE
- Phone Number: Primary mobile/phone

Optional fields:
- Email: Contact email
- City: Home city
- State: Home state/region
- ZIP Code: Postal code
- Assigned Doctor: Doctor linked to patient for follow-up
- Blood Type: A+, A-, B+, B-, AB+, AB-, O+, O-
- Allergies: Known allergies
- Current Medications: Current drug list and dose
- Medical History: Prior diseases/surgeries
- Family Medical History: Family health history
- Emergency Contact Name: Emergency person
- Emergency Contact Relationship: Relationship to patient
- Emergency Contact Phone: Emergency contact number

Saved payload notes:
- fullName is built from First Name + Last Name
- Some extra fields are stored if backend schema supports them

### C. Appointments List
Route: /dashboard/appointments

Table columns:
- Patient and Doctor: Patient details and assigned doctor
- Date and Time: Appointment date/time
- Type: consultation, follow-up, checkup, emergency
- Status: PENDING, SCHEDULED, CONFIRMED, COMPLETED, CANCELLED
- Location: Room/branch area
- Actions: Edit, reschedule, cancel, delete

Filters:
- Search
- Status
- From date
- To date

### D. New Appointment
Route: /dashboard/appointments/new

Step 1 - Patient Information:
- Patient (required): Choose existing patient

Step 2 - Appointment Details:
- Doctor (required): Selected doctor id
- Appointment Type (required): consultation/follow-up/checkup/emergency
- Appointment Date (required): Date
- Appointment Time (required): Time slot
- Status: Default SCHEDULED
- Location: Room or area text

Step 3 - Additional Information:
- Reason (required): Why patient is coming
- Symptoms: Tag list of symptoms
- Diagnosis: Preliminary diagnosis text
- Treatment: Preliminary treatment text
- Notes: Additional notes

System behavior:
- Additional info is combined into notes text and saved in the appointment
- Amount defaults to 0 on create

### E. Eye Examinations
Route: /dashboard/eye-examinations/new

Core required fields:
- patientId: Exammed patient
- doctorId: Examiner/doctor id
- chiefComplaint: Main complaint

Main tabs and fields:

1. Basic Info
- Chief Complaint
- History of Present Illness

2. Visual Acuity
- Method: SNELLEN or LOGMAR
- Unaided distance: OD, OS
- Unaided near: OD, OS
- Corrected distance (BCVA): OD, OS
- Corrected near: OD, OS
- Pinhole: OD, OS

3. Refraction
- Sphere OD, Sphere OS
- Cylinder OD, Cylinder OS
- Axis OD, Axis OS

4. IOP
- IOP OD, IOP OS
- IOP Method (Goldmann, Tonopen, iCare, etc.)
- IOP Time
- Target IOP OD, Target IOP OS

5. Anterior Segment
- Structured/object findings (if used)

6. Fundus
- Structured/object findings (if used)

7. Assessment
- Diagnosis list (ICD code, description, eye)
- Plan
- Medications list
- Follow-up recommendation/interval/reason

Generated follow-up:
- followUpDate can be auto-calculated from selected interval

### F. Clinical Prescriptions
Route: /dashboard/clinical-prescriptions

Table columns:
- Booking #: Appointment booking number
- Patient: Patient name and phone
- Type: PHARMACY or OPTICAL
- Item ID: Linked inventory item id (optional)
- Qty: Quantity
- Instructions: Usage notes
- Created: Date/time
- Actions: Edit/delete

Create/Edit form fields:
- Clinical Exam (required): examId
- Item Type (required): PHARMACY or OPTICAL
- Item ID (optional): inventory item id
- Quantity (required): integer >= 1
- Instructions (optional): clinical usage instructions

### G. Pharmacy Dashboard
Route: /dashboard/pharmacy

KPI cards:
- Total inventory items
- Items below reorder
- Out of stock
- Expiring soon (< 90 days)
- Today's revenue

Tabs:
- Inventory
- Sales
- Expiry Alerts
- Reports

### H. Pharmacy Inventory List
Route: /dashboard/pharmacy/inventory

Table columns:
- SKU/Barcode
- Medicine Name (Generic)
- Category
- Strength
- Price
- Stock Quantity
- Action (Edit)

Filters:
- Search (name/SKU/barcode)
- Category
- Stock (all or below reorder)

Special rule:
- Row highlight when stockQuantity = 0

### I. Add/Edit Pharmacy Medicine
Route: /dashboard/pharmacy/inventory/new

Section 1 - Basic Info:
- Name (required)
- Generic Name
- Manufacturer
- Category
- Strength
- Therapeutic Class

Section 2 - Stock Tracking:
- SKU / Barcode
- Batch Number
- Expiry Date
- Unit of Measure
- Stock Quantity

Section 3 - Financials:
- Cost Price (purchasePrice)
- Selling Price
- Tax Rate (%)
- Reorder Level

### J. Pharmacy Sales Wizard
Route: /dashboard/pharmacy/sales/new

Step 1 - Patient:
- Patient search/select (required)
- Optional link to clinical prescription

Step 2 - Cart:
- Search inventory
- Add medicine(s)
- Set quantity per line
- Remove line
- Subtotal calculated automatically

Step 3 - Payment:
- Payment method
- Amount paid
- Complete sale

Create billing payload:
- patientId
- serviceType = PHARMACY
- totalAmount
- discount
- paymentMethod
- status = PAID/PARTIAL/UNPAID
- lineItems[] with itemType, itemId, quantity, unitPrice

Output:
- Receipt print window opens
- Can Save as PDF from browser print dialog

### K. Expiry Alerts
Route: /dashboard/pharmacy/expiry

Capabilities:
- Auto sync expired stock to zero
- Display sorted by nearest expiry
- Mark status as Expired / Expiring soon / No date

Displayed columns:
- Medicine
- Batch
- Expiry
- Stock
- Status

### L. Pharmacy Reports
Route: /dashboard/pharmacy/reports

Inputs:
- From date
- To date

Outputs:
- Total sales count
- Revenue (PAID)
- Revenue (PARTIAL)
- Top medicines (qty and revenue from billing line items)

### M. Billing List
Route: /dashboard/billing

Table columns:
- Patient
- Service
- Amount
- Status
- Date
- Actions (record payment, delete)

Billing statuses:
- PAID: fully paid
- PARTIAL: partially paid
- UNPAID: no payment yet

Service types:
- APPOINTMENT
- PHARMACY
- OPTICAL
- SURGERY

## 4) Field Glossary (What Abbreviations Stand For)
- OD: Right eye (oculus dexter)
- OS: Left eye (oculus sinister)
- OU: Both eyes (oculus uterque)
- VA: Visual acuity
- BCVA: Best corrected visual acuity
- IOP: Intraocular pressure
- SPH: Spherical lens power
- CYL: Cylinder lens power
- AXIS: Cylinder axis in degrees (0-180)
- ICD Code: International Classification of Diseases code

## 5) Minimum Test Data You Can Use (One Patient End-to-End)
Patient:
- First Name: Ahmed
- Last Name: Ali
- Gender: MALE
- Date of Birth: 1992-05-14
- Phone: +251900000001
- Email: ahmed.ali@example.com

Appointment:
- Type: consultation
- Date: today + 1 day
- Time: 09:00
- Status: SCHEDULED
- Reason: Blurred vision and eye strain

Eye Examination:
- Chief Complaint: Blurred distance vision
- VA Method: SNELLEN
- VA unaided: OD 6/12, OS 6/9
- Refraction: OD SPH -0.75, OS SPH -0.50
- IOP: OD 16, OS 15
- Diagnosis: H52.1 | Myopia | OU
- Plan: Corrective lenses and follow-up in 1 month

Clinical Prescription:
- Item Type: PHARMACY (or OPTICAL for optical test)
- Quantity: 1
- Instructions: Use as directed

Pharmacy Sale:
- Add item to cart
- Qty 1
- Payment method: Cash
- Amount paid: full amount
- Status expected: PAID

Verification expected:
- Billing record appears in billing list
- Pharmacy stock decreases by sold quantity
- Stock transaction record created
- Pharmacy report totals update for selected date range

## 6) API Validation Summary (Important Constraints)
Patient:
- fullName required
- gender must be MALE/FEMALE
- dateOfBirth must be valid date <= today
- phone required and valid format

Appointment:
- patientId and doctorId required
- appointmentDate required ISO date
- status allowed: PENDING/COMPLETED/CANCELLED (backend validation)

Clinical Prescription:
- examId required
- itemType required: PHARMACY/OPTICAL
- quantity integer >= 1

Pharmacy Item:
- itemName required
- stockQuantity integer >= 0
- reorderLevel integer >= 0
- purchasePrice and sellingPrice >= 0
- taxRate 0-100

Billing:
- patientId required
- serviceType required
- status allowed: PAID/UNPAID/PARTIAL
- lineItems optional, but if used each line requires itemType, itemId, quantity >= 1, unitPrice >= 0

## 7) Known Note for Testing
Appointment UI shows SCHEDULED and CONFIRMED statuses, but backend appointment validation currently only lists PENDING/COMPLETED/CANCELLED.
If appointment creation/update fails on status, use PENDING in payload until backend status enum is aligned.
