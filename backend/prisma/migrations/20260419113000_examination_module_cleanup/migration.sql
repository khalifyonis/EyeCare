-- Preserve existing prescription links by renaming exam_id to clinical_exam_id
ALTER TABLE "prescriptions" RENAME COLUMN "exam_id" TO "clinical_exam_id";

-- Add support for linking prescriptions to the active eye examination model
ALTER TABLE "prescriptions" ADD COLUMN "eye_exam_id" TEXT;

-- Appointment link becomes optional for eye-exam-based prescriptions
ALTER TABLE "prescriptions" ALTER COLUMN "appointment_id" DROP NOT NULL;

-- Replace legacy FK/index with split clinical/eye links
ALTER TABLE "prescriptions" DROP CONSTRAINT IF EXISTS "prescriptions_exam_id_fkey";
DROP INDEX IF EXISTS "prescriptions_exam_id_idx";

CREATE INDEX "prescriptions_clinical_exam_id_idx" ON "prescriptions"("clinical_exam_id");
CREATE INDEX "prescriptions_eye_exam_id_idx" ON "prescriptions"("eye_exam_id");

ALTER TABLE "prescriptions"
  ADD CONSTRAINT "prescriptions_clinical_exam_id_fkey"
  FOREIGN KEY ("clinical_exam_id") REFERENCES "clinical_examinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "prescriptions"
  ADD CONSTRAINT "prescriptions_eye_exam_id_fkey"
  FOREIGN KEY ("eye_exam_id") REFERENCES "eye_examinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
