# Prescription Module Map

This map makes optical and medicine prescription files explicit.

## Backend

### Optical Prescription Module
- Route mount: `/api/prescriptions`
- Route file: `backend/src/routes/opticalPrescriptionRoutes.js`
- Controller file: `backend/src/controllers/opticalPrescriptionController.js`
- Prisma model: `OpticalPrescription` in `backend/prisma/schema.prisma`

### Medicine Prescription Module
- Route mount: `/api/prescription-items`
- Route file (explicit): `backend/src/routes/medicinePrescriptionRoutes.js`
- Controller file (explicit): `backend/src/controllers/medicinePrescriptionController.js`
- Prisma model: `Prescription` in `backend/prisma/schema.prisma` (used for medicine prescriptions)

## Frontend

### Optical Prescription Pages (Primary)
- List: `frontend/src/app/dashboard/prescription/optical/page.tsx`
- New: `frontend/src/app/dashboard/prescription/optical/new/page.tsx`
- Detail: `frontend/src/app/dashboard/prescription/optical/[id]/page.tsx`
- Edit: `frontend/src/app/dashboard/prescription/optical/[id]/edit/page.tsx`

### Medicine Prescription Pages (Primary)
- List: `frontend/src/app/dashboard/prescription/medicine/page.tsx`
- New: `frontend/src/app/dashboard/prescription/medicine/new/page.tsx`
- Detail: `frontend/src/app/dashboard/prescription/medicine/[id]/page.tsx`
- Edit: `frontend/src/app/dashboard/prescription/medicine/[id]/edit/page.tsx`
- Form component: `frontend/src/app/dashboard/prescription/medicine/_components/medicine-prescription-form.tsx`

## Navigation Labels
- Sidebar group: `Prescriptions`
- Optical subpage label: `Optical Prescriptions`
- Medicine subpage label: `Medicine Prescriptions`

## Prisma Tables
- Optical table: `optical_prescriptions` (model `OpticalPrescription`)
- Medicine table: `prescriptions` (model `Prescription`)
