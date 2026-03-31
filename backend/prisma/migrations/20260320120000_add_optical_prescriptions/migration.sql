-- CreateEnum
CREATE TYPE "OpticalPrescriptionType" AS ENUM ('SPECTACLES', 'CONTACT_LENS', 'BOTH');

-- CreateEnum
CREATE TYPE "OpticalPrescriptionStatus" AS ENUM ('FILLED', 'DISPENSED');

-- CreateEnum
CREATE TYPE "FollowUpSourceType" AS ENUM ('EXAMINATION', 'PRESCRIPTION', 'SURGERY', 'OPTICAL');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'DONE', 'CANCELLED', 'OVERDUE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppointmentStatus" ADD VALUE 'SCHEDULED';
ALTER TYPE "AppointmentStatus" ADD VALUE 'CONFIRMED';

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "booking_number" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "type" TEXT DEFAULT 'consultation';

-- AlterTable
ALTER TABLE "clinical_examinations" ADD COLUMN     "next_review_date" TIMESTAMP(3),
ADD COLUMN     "next_review_reason" TEXT;

-- AlterTable
ALTER TABLE "optical_items" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supplier_id" TEXT;

-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "assigned_doctor_id" TEXT,
ADD COLUMN     "blood_group" TEXT,
ADD COLUMN     "chief_complaint" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "current_medications" TEXT,
ADD COLUMN     "emergency_contact_name" TEXT,
ADD COLUMN     "emergency_contact_phone" TEXT,
ADD COLUMN     "emergency_contact_relationship" TEXT,
ADD COLUMN     "family_medical_history" TEXT,
ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "medical_history" TEXT,
ADD COLUMN     "patient_number" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "weight" DECIMAL(5,2),
ADD COLUMN     "zip_code" TEXT;

-- AlterTable
ALTER TABLE "pharmacy_items" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "supplier_id" TEXT;

-- AlterTable
ALTER TABLE "prescriptions" ADD COLUMN     "review_after_days" INTEGER;

-- AlterTable
ALTER TABLE "surgeries" ADD COLUMN     "next_follow_up_date" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "optical_prescriptions" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "created_by_id" TEXT,
    "type" "OpticalPrescriptionType" NOT NULL DEFAULT 'SPECTACLES',
    "status" "OpticalPrescriptionStatus" NOT NULL DEFAULT 'FILLED',
    "validity_months" INTEGER NOT NULL DEFAULT 12,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "dispensed_at" TIMESTAMP(3),
    "notes" TEXT,
    "od_sphere" TEXT,
    "od_cylinder" TEXT,
    "od_axis" INTEGER,
    "od_add" TEXT,
    "od_pd" INTEGER,
    "od_prism" TEXT,
    "os_sphere" TEXT,
    "os_cylinder" TEXT,
    "os_axis" INTEGER,
    "os_add" TEXT,
    "os_pd" INTEGER,
    "os_prism" TEXT,
    "lens_type" TEXT,
    "lens_material" TEXT,
    "frame_type" TEXT,
    "coatings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "optical_prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eye_examinations" (
    "id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "chief_complaint" TEXT NOT NULL,
    "history_of_present_illness" TEXT,
    "va_scale" TEXT NOT NULL DEFAULT 'SNELLEN',
    "va_unaided_od" TEXT,
    "va_unaided_os" TEXT,
    "va_unaided_near_od" TEXT,
    "va_unaided_near_os" TEXT,
    "va_bcva_od" TEXT,
    "va_bcva_os" TEXT,
    "va_bcva_near_od" TEXT,
    "va_bcva_near_os" TEXT,
    "va_pinhole_od" TEXT,
    "va_pinhole_os" TEXT,
    "refraction_sphere_od" TEXT,
    "refraction_sphere_os" TEXT,
    "refraction_cylinder_od" TEXT,
    "refraction_cylinder_os" TEXT,
    "refraction_axis_od" TEXT,
    "refraction_axis_os" TEXT,
    "iop_od" INTEGER,
    "iop_os" INTEGER,
    "iop_method" TEXT,
    "iop_time" TEXT,
    "target_iop_od" INTEGER,
    "target_iop_os" INTEGER,
    "anterior_segment_findings" JSONB,
    "fundus_findings" JSONB,
    "diagnosis" TEXT,
    "plan" TEXT,
    "follow_up_date" TIMESTAMP(3),
    "next_visit_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eye_examinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "source_type" "FollowUpSourceType" NOT NULL,
    "source_id" TEXT NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "completed_appointment_id" TEXT,
    "clinical_examination_id" TEXT,
    "surgery_id" TEXT,
    "prescription_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "is_primary" BOOLEAN DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suppliers_branch_id_idx" ON "suppliers"("branch_id");

-- CreateIndex
CREATE INDEX "activity_logs_branch_id_idx" ON "activity_logs"("branch_id");

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "activity_logs"("user_id");

-- CreateIndex
CREATE INDEX "activity_logs_created_at_idx" ON "activity_logs"("created_at");

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_idx" ON "activity_logs"("entity_type");

-- CreateIndex
CREATE INDEX "optical_prescriptions_branch_id_idx" ON "optical_prescriptions"("branch_id");

-- CreateIndex
CREATE INDEX "optical_prescriptions_patient_id_idx" ON "optical_prescriptions"("patient_id");

-- CreateIndex
CREATE INDEX "optical_prescriptions_type_idx" ON "optical_prescriptions"("type");

-- CreateIndex
CREATE INDEX "optical_prescriptions_status_idx" ON "optical_prescriptions"("status");

-- CreateIndex
CREATE INDEX "optical_prescriptions_expiry_date_idx" ON "optical_prescriptions"("expiry_date");

-- CreateIndex
CREATE INDEX "eye_examinations_branch_id_idx" ON "eye_examinations"("branch_id");

-- CreateIndex
CREATE INDEX "eye_examinations_patient_id_idx" ON "eye_examinations"("patient_id");

-- CreateIndex
CREATE INDEX "eye_examinations_doctor_id_idx" ON "eye_examinations"("doctor_id");

-- CreateIndex
CREATE INDEX "eye_examinations_created_at_idx" ON "eye_examinations"("created_at");

-- CreateIndex
CREATE INDEX "follow_ups_patient_id_idx" ON "follow_ups"("patient_id");

-- CreateIndex
CREATE INDEX "follow_ups_branch_id_idx" ON "follow_ups"("branch_id");

-- CreateIndex
CREATE INDEX "follow_ups_due_date_idx" ON "follow_ups"("due_date");

-- CreateIndex
CREATE INDEX "follow_ups_status_idx" ON "follow_ups"("status");

-- CreateIndex
CREATE UNIQUE INDEX "staff_assignments_user_id_branch_id_key" ON "staff_assignments"("user_id", "branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_booking_number_key" ON "appointments"("booking_number");

-- CreateIndex
CREATE INDEX "appointments_branch_id_idx" ON "appointments"("branch_id");

-- CreateIndex
CREATE INDEX "appointments_patient_id_idx" ON "appointments"("patient_id");

-- CreateIndex
CREATE INDEX "appointments_doctor_id_idx" ON "appointments"("doctor_id");

-- CreateIndex
CREATE INDEX "appointments_appointment_date_idx" ON "appointments"("appointment_date");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "billing_branch_id_idx" ON "billing"("branch_id");

-- CreateIndex
CREATE INDEX "billing_patient_id_idx" ON "billing"("patient_id");

-- CreateIndex
CREATE INDEX "billing_status_idx" ON "billing"("status");

-- CreateIndex
CREATE INDEX "billing_service_type_idx" ON "billing"("service_type");

-- CreateIndex
CREATE INDEX "billing_created_at_idx" ON "billing"("created_at");

-- CreateIndex
CREATE INDEX "optical_items_branch_id_idx" ON "optical_items"("branch_id");

-- CreateIndex
CREATE INDEX "optical_items_supplier_id_idx" ON "optical_items"("supplier_id");

-- CreateIndex
CREATE UNIQUE INDEX "optical_items_branch_id_item_name_brand_key" ON "optical_items"("branch_id", "item_name", "brand");

-- CreateIndex
CREATE INDEX "optical_stock_transactions_optical_item_id_idx" ON "optical_stock_transactions"("optical_item_id");

-- CreateIndex
CREATE INDEX "optical_stock_transactions_branch_id_idx" ON "optical_stock_transactions"("branch_id");

-- CreateIndex
CREATE INDEX "optical_stock_transactions_transaction_date_idx" ON "optical_stock_transactions"("transaction_date");

-- CreateIndex
CREATE UNIQUE INDEX "patients_patient_number_key" ON "patients"("patient_number");

-- CreateIndex
CREATE INDEX "patients_branch_id_idx" ON "patients"("branch_id");

-- CreateIndex
CREATE INDEX "patients_full_name_idx" ON "patients"("full_name");

-- CreateIndex
CREATE INDEX "patients_phone_idx" ON "patients"("phone");

-- CreateIndex
CREATE INDEX "patients_is_active_idx" ON "patients"("is_active");

-- CreateIndex
CREATE INDEX "pharmacy_items_branch_id_idx" ON "pharmacy_items"("branch_id");

-- CreateIndex
CREATE INDEX "pharmacy_items_supplier_id_idx" ON "pharmacy_items"("supplier_id");

-- CreateIndex
CREATE INDEX "pharmacy_items_category_idx" ON "pharmacy_items"("category");

-- CreateIndex
CREATE INDEX "pharmacy_items_expiry_date_idx" ON "pharmacy_items"("expiry_date");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_items_branch_id_item_name_batch_number_key" ON "pharmacy_items"("branch_id", "item_name", "batch_number");

-- CreateIndex
CREATE INDEX "pharmacy_stock_transactions_pharmacy_item_id_idx" ON "pharmacy_stock_transactions"("pharmacy_item_id");

-- CreateIndex
CREATE INDEX "pharmacy_stock_transactions_branch_id_idx" ON "pharmacy_stock_transactions"("branch_id");

-- CreateIndex
CREATE INDEX "pharmacy_stock_transactions_transaction_date_idx" ON "pharmacy_stock_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "prescriptions_branch_id_idx" ON "prescriptions"("branch_id");

-- CreateIndex
CREATE INDEX "prescriptions_appointment_id_idx" ON "prescriptions"("appointment_id");

-- CreateIndex
CREATE INDEX "prescriptions_exam_id_idx" ON "prescriptions"("exam_id");

-- CreateIndex
CREATE INDEX "prescriptions_item_type_idx" ON "prescriptions"("item_type");

-- CreateIndex
CREATE INDEX "surgeries_branch_id_idx" ON "surgeries"("branch_id");

-- CreateIndex
CREATE INDEX "surgeries_surgeon_id_idx" ON "surgeries"("surgeon_id");

-- CreateIndex
CREATE INDEX "surgeries_status_idx" ON "surgeries"("status");

-- CreateIndex
CREATE INDEX "users_branch_id_idx" ON "users"("branch_id");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "clinic_branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "clinic_branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_assigned_doctor_id_fkey" FOREIGN KEY ("assigned_doctor_id") REFERENCES "doctors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optical_prescriptions" ADD CONSTRAINT "optical_prescriptions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "clinic_branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optical_prescriptions" ADD CONSTRAINT "optical_prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optical_prescriptions" ADD CONSTRAINT "optical_prescriptions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eye_examinations" ADD CONSTRAINT "eye_examinations_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "clinic_branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eye_examinations" ADD CONSTRAINT "eye_examinations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eye_examinations" ADD CONSTRAINT "eye_examinations_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_items" ADD CONSTRAINT "pharmacy_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optical_items" ADD CONSTRAINT "optical_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "clinic_branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_completed_appointment_id_fkey" FOREIGN KEY ("completed_appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_clinical_examination_id_fkey" FOREIGN KEY ("clinical_examination_id") REFERENCES "clinical_examinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_surgery_id_fkey" FOREIGN KEY ("surgery_id") REFERENCES "surgeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_assignments" ADD CONSTRAINT "staff_assignments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "clinic_branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
