-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "clarification_requested_by_user_id" INTEGER;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_clarification_requested_by_user_id_fkey" FOREIGN KEY ("clarification_requested_by_user_id") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
