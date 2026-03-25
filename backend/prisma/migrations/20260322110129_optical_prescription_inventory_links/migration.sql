-- DropForeignKey
ALTER TABLE "surgeries" DROP CONSTRAINT "surgeries_exam_id_fkey";

-- AlterTable
ALTER TABLE "optical_prescriptions" ADD COLUMN     "frame_item_id" TEXT,
ADD COLUMN     "lens_item_id" TEXT;

-- CreateIndex
CREATE INDEX "optical_prescriptions_frame_item_id_idx" ON "optical_prescriptions"("frame_item_id");

-- CreateIndex
CREATE INDEX "optical_prescriptions_lens_item_id_idx" ON "optical_prescriptions"("lens_item_id");

-- AddForeignKey
ALTER TABLE "optical_prescriptions" ADD CONSTRAINT "optical_prescriptions_frame_item_id_fkey" FOREIGN KEY ("frame_item_id") REFERENCES "optical_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "optical_prescriptions" ADD CONSTRAINT "optical_prescriptions_lens_item_id_fkey" FOREIGN KEY ("lens_item_id") REFERENCES "optical_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surgeries" ADD CONSTRAINT "surgeries_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "clinical_examinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
