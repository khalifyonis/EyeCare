-- DropForeignKey
ALTER TABLE "prescriptions" DROP CONSTRAINT "prescriptions_appointment_id_fkey";

-- DropForeignKey
ALTER TABLE "prescriptions" DROP CONSTRAINT "prescriptions_clinical_exam_id_fkey";

-- AlterTable
ALTER TABLE "prescriptions" ALTER COLUMN "clinical_exam_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_clinical_exam_id_fkey" FOREIGN KEY ("clinical_exam_id") REFERENCES "clinical_examinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
