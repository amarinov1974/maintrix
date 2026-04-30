-- AlterEnum
ALTER TYPE "AttachmentEntityType" ADD VALUE 'ASSET';

-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "asset_id" INTEGER;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
