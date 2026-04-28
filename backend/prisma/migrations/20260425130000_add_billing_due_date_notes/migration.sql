-- AlterTable
ALTER TABLE "billing"
ADD COLUMN "due_date" TIMESTAMP(3),
ADD COLUMN "notes" TEXT;

-- CreateIndex
CREATE INDEX "billing_due_date_idx" ON "billing"("due_date");
