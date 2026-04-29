/*
  Warnings:

  - You are about to drop the column `category` on the `assets` table. All the data in the column will be lost.
  - Added the required column `name` to the `assets` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('ACTIVE', 'FAULTY', 'IN_SERVICE', 'DECOMMISSIONED');

-- AlterTable
ALTER TABLE "assets" DROP COLUMN "category",
ADD COLUMN     "category_id" INTEGER,
ADD COLUMN     "manufacturer" VARCHAR(255),
ADD COLUMN     "model" VARCHAR(255),
ADD COLUMN     "name" VARCHAR(255) NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "purchase_date" TIMESTAMP(3),
ADD COLUMN     "purchase_value" DECIMAL(10,2),
ADD COLUMN     "serial_number" VARCHAR(255),
ADD COLUMN     "status" "AssetStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "warranty_expiry" TIMESTAMP(3),
ALTER COLUMN "description" DROP NOT NULL;

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "depreciation_years" INTEGER NOT NULL,
    "depreciation_rate" DECIMAL(5,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asset_categories_company_id_idx" ON "asset_categories"("company_id");

-- CreateIndex
CREATE INDEX "assets_category_id_idx" ON "assets"("category_id");

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
