-- Eye Surgery module (EyeCare Pro) schema updates

-- 1) New columns
ALTER TABLE "surgeries" ADD COLUMN IF NOT EXISTS "patient_id" TEXT;
ALTER TABLE "surgeries" ADD COLUMN IF NOT EXISTS "procedure" text;
ALTER TABLE "surgeries" ADD COLUMN IF NOT EXISTS "anesthesia_type" text;
ALTER TABLE "surgeries" ADD COLUMN IF NOT EXISTS "surgery_time" text;
ALTER TABLE "surgeries" ADD COLUMN IF NOT EXISTS "operating_room" text;
ALTER TABLE "surgeries" ADD COLUMN IF NOT EXISTS "cataract_details" jsonb;

-- 2) Relax legacy NOT NULL exam_id (keep unique when present)
ALTER TABLE "surgeries" ALTER COLUMN "exam_id" DROP NOT NULL;

-- 3) Defaults / normalization
ALTER TABLE "surgeries" ALTER COLUMN "cost" SET DEFAULT 0;
ALTER TABLE "surgeries" ALTER COLUMN "status" SET DEFAULT 'scheduled';

UPDATE "surgeries"
SET "status" = CASE
    WHEN "status" = 'PENDING' THEN 'scheduled'
    WHEN "status" = 'COMPLETED' THEN 'completed'
    WHEN "status" = 'CANCELLED' THEN 'cancelled'
    ELSE lower("status")
END;

UPDATE "surgeries"
SET "eye_side" = CASE
    WHEN "eye_side" = 'RIGHT' THEN 'OD'
    WHEN "eye_side" = 'LEFT' THEN 'OS'
    ELSE "eye_side"
END;

-- 4) Backfill patient_id from existing exam -> appointment -> patient
UPDATE "surgeries" s
SET "patient_id" = p."id"
FROM "clinical_examinations" ce
JOIN "appointments" a ON a."id" = ce."appointment_id"
JOIN "patients" p ON p."id" = a."patient_id"
WHERE s."exam_id" = ce."id" AND s."patient_id" IS NULL;

-- 5) Enforce patient_id NOT NULL and FK
ALTER TABLE "surgeries" ALTER COLUMN "patient_id" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'surgeries_patient_id_fkey'
  ) THEN
    ALTER TABLE "surgeries"
    ADD CONSTRAINT "surgeries_patient_id_fkey"
    FOREIGN KEY ("patient_id")
    REFERENCES "patients"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;
  END IF;
END $$;

-- 6) Index for patient lookups
CREATE INDEX IF NOT EXISTS "surgeries_patient_id_idx" ON "surgeries"("patient_id");
