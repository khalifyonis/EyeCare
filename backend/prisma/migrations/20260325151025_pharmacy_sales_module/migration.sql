-- AlterTable
ALTER TABLE "pharmacy_items" ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "generic_name" TEXT,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "strength" TEXT,
ADD COLUMN     "tax_rate" DECIMAL(5,2),
ADD COLUMN     "unit_of_measure" TEXT;

-- CreateTable
CREATE TABLE "billing_line_items" (
    "id" TEXT NOT NULL,
    "billing_id" TEXT NOT NULL,
    "item_type" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "line_total" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_line_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "billing_line_items_billing_id_idx" ON "billing_line_items"("billing_id");

-- CreateIndex
CREATE INDEX "billing_line_items_item_type_idx" ON "billing_line_items"("item_type");

-- CreateIndex
CREATE INDEX "billing_line_items_item_id_idx" ON "billing_line_items"("item_id");

-- CreateIndex
CREATE INDEX "pharmacy_items_sku_idx" ON "pharmacy_items"("sku");

-- CreateIndex
CREATE INDEX "pharmacy_items_barcode_idx" ON "pharmacy_items"("barcode");

-- AddForeignKey
ALTER TABLE "billing_line_items" ADD CONSTRAINT "billing_line_items_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "billing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
