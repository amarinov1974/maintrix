/*
  Warnings:

  - The values [C3] on the enum `InternalRole` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "InternalRole_new" AS ENUM ('SM', 'AM', 'AMM', 'D', 'C2', 'ADMIN', 'BOD');
ALTER TABLE "internal_users" ALTER COLUMN "role" TYPE "InternalRole_new" USING ("role"::text::"InternalRole_new");
ALTER TABLE "approval_records" ALTER COLUMN "role" TYPE "InternalRole_new" USING ("role"::text::"InternalRole_new");
ALTER TYPE "InternalRole" RENAME TO "InternalRole_old";
ALTER TYPE "InternalRole_new" RENAME TO "InternalRole";
DROP TYPE "public"."InternalRole_old";
COMMIT;
