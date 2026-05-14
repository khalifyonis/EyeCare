# Surgery Billing Verification Checklist

## Backend
- [ ] Create a consultation appointment and confirm a linked billing record is created.
- [ ] Create a surgery appointment without emergency contact and confirm the API rejects it.
- [ ] Create a surgery appointment with emergency contact and confirm the appointment and billing are both created.
- [ ] Update an appointment type to surgery and confirm the billing record updates or is created.

## Frontend
- [ ] In the appointment wizard, select surgery and confirm the Payment & Billing step appears after Review.
- [ ] In the surgery flow, confirm quick-create patient shows all patient fields and blocks save when emergency contact is missing.
- [ ] Confirm the appointment details page shows surgery schedule information when the appointment type is surgery.
- [ ] Confirm the appointment details page shows the linked billing summary and invoice link.
- [ ] Confirm the appointments list shows surgery and payment columns.

## Patient module
- [ ] Create a patient from the appointment flow and confirm it appears in the Patients datatable.
- [ ] Confirm the quick-created patient can be reopened and edited from the Patients page.
