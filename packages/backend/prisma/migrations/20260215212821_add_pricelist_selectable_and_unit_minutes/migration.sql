-- AlterTable
ALTER TABLE "vendor_price_list" ADD COLUMN     "selectable_in_ui" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "unit_minutes" INTEGER;
