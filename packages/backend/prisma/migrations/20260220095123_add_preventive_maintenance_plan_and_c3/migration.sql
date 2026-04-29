-- CreateEnum
CREATE TYPE "PmScheduleType" AS ENUM ('INTERVAL', 'SPECIFIC_DATES');

-- AlterEnum
ALTER TYPE "InternalRole" ADD VALUE 'C3';

-- CreateTable
CREATE TABLE "preventive_maintenance_plans" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "asset_id" INTEGER,
    "asset_name" VARCHAR(500) NOT NULL,
    "store_id" INTEGER,
    "task_description" TEXT NOT NULL,
    "vendor_company_id" INTEGER NOT NULL,
    "vendor_user_id" INTEGER,
    "schedule_type" "PmScheduleType" NOT NULL,
    "interval_days" INTEGER,
    "specific_dates" TEXT,
    "created_by_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "preventive_maintenance_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "preventive_maintenance_plans_company_id_idx" ON "preventive_maintenance_plans"("company_id");

-- CreateIndex
CREATE INDEX "preventive_maintenance_plans_asset_id_idx" ON "preventive_maintenance_plans"("asset_id");

-- CreateIndex
CREATE INDEX "preventive_maintenance_plans_vendor_company_id_idx" ON "preventive_maintenance_plans"("vendor_company_id");

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_vendor_company_id_fkey" FOREIGN KEY ("vendor_company_id") REFERENCES "vendor_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_vendor_user_id_fkey" FOREIGN KEY ("vendor_user_id") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenance_plans" ADD CONSTRAINT "preventive_maintenance_plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
