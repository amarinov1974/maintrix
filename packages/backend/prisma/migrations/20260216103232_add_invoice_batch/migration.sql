-- AlterTable
ALTER TABLE "work_orders" ADD COLUMN     "invoice_batch_id" INTEGER;

-- CreateTable
CREATE TABLE "invoice_batches" (
    "id" SERIAL NOT NULL,
    "batch_number" TEXT NOT NULL,
    "vendor_company_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'EUR',
    "status" VARCHAR(50) NOT NULL DEFAULT 'CREATED',
    "pdf_path" TEXT,

    CONSTRAINT "invoice_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_batch_items" (
    "id" SERIAL NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "work_order_id" INTEGER NOT NULL,

    CONSTRAINT "invoice_batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invoice_batches_batch_number_key" ON "invoice_batches"("batch_number");

-- CreateIndex
CREATE INDEX "invoice_batches_vendor_company_id_idx" ON "invoice_batches"("vendor_company_id");

-- CreateIndex
CREATE INDEX "invoice_batches_created_by_id_idx" ON "invoice_batches"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_batch_items_work_order_id_key" ON "invoice_batch_items"("work_order_id");

-- CreateIndex
CREATE INDEX "invoice_batch_items_batch_id_idx" ON "invoice_batch_items"("batch_id");

-- CreateIndex
CREATE INDEX "work_orders_invoice_batch_id_idx" ON "work_orders"("invoice_batch_id");

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_invoice_batch_id_fkey" FOREIGN KEY ("invoice_batch_id") REFERENCES "invoice_batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_batches" ADD CONSTRAINT "invoice_batches_vendor_company_id_fkey" FOREIGN KEY ("vendor_company_id") REFERENCES "vendor_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_batches" ADD CONSTRAINT "invoice_batches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "vendor_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_batch_items" ADD CONSTRAINT "invoice_batch_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "invoice_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_batch_items" ADD CONSTRAINT "invoice_batch_items_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
