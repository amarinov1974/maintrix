-- CreateEnum
CREATE TYPE "InternalRole" AS ENUM ('SM', 'AM', 'AMM', 'D', 'C2', 'BOD');

-- CreateEnum
CREATE TYPE "VendorRole" AS ENUM ('S1', 'S2', 'S3');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('Electrical Installations', 'Heating, Ventilation and Air Conditioning', 'Refrigeration', 'Kitchen Equipment', 'Elevators', 'Automatic Doors', 'Fire Protection System', 'Water and Sewage', 'Construction Works', 'Hygiene', 'Environmental', 'Other');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('Draft', 'Ticket Submitted', 'Awaiting Ticket Creator Response', 'Updated Ticket Submitted', 'Cost Estimation Needed', 'Cost Estimation Approval Needed', 'Ticket Cost Estimation Approved', 'Ticket Rejected', 'Ticket Withdrawn', 'Ticket Archived');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'RETURNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "WorkOrderStatus" AS ENUM ('Work Order Created', 'Accepted / Technician Assigned', 'Service In Progress', 'Service Completed', 'Follow-Up Visit Requested', 'New Work Order Needed', 'Repair Unsuccessful', 'Cost Proposal Prepared', 'Cost Revision Requested', 'Cost Proposal Approved', 'Closed Without Cost', 'Work Order Rejected');

-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('INTERNAL', 'VENDOR');

-- CreateEnum
CREATE TYPE "AttachmentEntityType" AS ENUM ('TICKET', 'WO');

-- CreateEnum
CREATE TYPE "QRScanType" AS ENUM ('CHECKIN', 'CHECKOUT');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('TICKET', 'WO');

-- CreateTable
CREATE TABLE "companies" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_companies" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regions" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "region_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" "InternalRole" NOT NULL,
    "company_id" INTEGER NOT NULL,
    "region_id" INTEGER,
    "store_id" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "internal_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" "VendorRole" NOT NULL,
    "vendor_company_id" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" SERIAL NOT NULL,
    "store_id" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(255),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "store_id" INTEGER NOT NULL,
    "created_by_user_id" INTEGER NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "urgent" BOOLEAN NOT NULL,
    "current_status" "TicketStatus" NOT NULL,
    "current_owner_user_id" INTEGER,
    "asset_id" INTEGER,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_comments" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "author_user_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "internal_flag" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_estimations" (
    "ticket_id" INTEGER NOT NULL,
    "estimated_amount" DECIMAL(12,2) NOT NULL,
    "created_by_user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_estimations_pkey" PRIMARY KEY ("ticket_id")
);

-- CreateTable
CREATE TABLE "approval_records" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "approver_user_id" INTEGER NOT NULL,
    "role" "InternalRole" NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_orders" (
    "id" SERIAL NOT NULL,
    "ticket_id" INTEGER NOT NULL,
    "vendor_company_id" INTEGER NOT NULL,
    "assigned_technician_id" INTEGER,
    "asset_id" INTEGER,
    "eta" TIMESTAMP(3),
    "current_status" "WorkOrderStatus" NOT NULL,
    "current_owner_type" "OwnerType" NOT NULL,
    "current_owner_id" INTEGER NOT NULL,
    "declared_tech_count" INTEGER,
    "checkin_ts" TIMESTAMP(3),
    "checkout_ts" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wo_comments" (
    "id" SERIAL NOT NULL,
    "wo_id" INTEGER NOT NULL,
    "author_type" "OwnerType" NOT NULL,
    "author_id" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wo_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_report_rows" (
    "id" SERIAL NOT NULL,
    "wo_id" INTEGER NOT NULL,
    "row_number" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_report_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_rows" (
    "id" SERIAL NOT NULL,
    "wo_id" INTEGER NOT NULL,
    "row_number" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "price_per_unit" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,
    "price_list_item_id" INTEGER,
    "warning_flag" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_price_list" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "category" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "price_per_unit" DECIMAL(12,2) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_price_list_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" SERIAL NOT NULL,
    "entity_type" "AttachmentEntityType" NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "ticket_id" INTEGER,
    "work_order_id" INTEGER,
    "file_path" TEXT NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "uploaded_by_type" "OwnerType" NOT NULL,
    "uploaded_by_id" INTEGER NOT NULL,
    "internal_flag" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_records" (
    "id" SERIAL NOT NULL,
    "wo_id" INTEGER NOT NULL,
    "qr_token" VARCHAR(255) NOT NULL,
    "scan_type" "QRScanType" NOT NULL,
    "generated_ts" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiration_ts" TIMESTAMP(3) NOT NULL,
    "used_flag" BOOLEAN NOT NULL DEFAULT false,
    "used_at" TIMESTAMP(3),
    "tech_count_confirmed" INTEGER,

    CONSTRAINT "qr_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "entity_type" "AuditEntityType" NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "ticket_id" INTEGER,
    "work_order_id" INTEGER,
    "prev_status" VARCHAR(100),
    "new_status" VARCHAR(100) NOT NULL,
    "action_type" VARCHAR(100) NOT NULL,
    "actor_type" "OwnerType" NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "regions_company_id_idx" ON "regions"("company_id");

-- CreateIndex
CREATE INDEX "stores_company_id_idx" ON "stores"("company_id");

-- CreateIndex
CREATE INDEX "stores_region_id_idx" ON "stores"("region_id");

-- CreateIndex
CREATE INDEX "internal_users_company_id_idx" ON "internal_users"("company_id");

-- CreateIndex
CREATE INDEX "internal_users_role_idx" ON "internal_users"("role");

-- CreateIndex
CREATE INDEX "vendor_users_vendor_company_id_idx" ON "vendor_users"("vendor_company_id");

-- CreateIndex
CREATE INDEX "vendor_users_role_idx" ON "vendor_users"("role");

-- CreateIndex
CREATE INDEX "assets_store_id_idx" ON "assets"("store_id");

-- CreateIndex
CREATE INDEX "tickets_company_id_idx" ON "tickets"("company_id");

-- CreateIndex
CREATE INDEX "tickets_store_id_idx" ON "tickets"("store_id");

-- CreateIndex
CREATE INDEX "tickets_current_status_idx" ON "tickets"("current_status");

-- CreateIndex
CREATE INDEX "tickets_current_owner_user_id_idx" ON "tickets"("current_owner_user_id");

-- CreateIndex
CREATE INDEX "tickets_current_owner_user_id_current_status_idx" ON "tickets"("current_owner_user_id", "current_status");

-- CreateIndex
CREATE INDEX "tickets_created_by_user_id_idx" ON "tickets"("created_by_user_id");

-- CreateIndex
CREATE INDEX "ticket_comments_ticket_id_idx" ON "ticket_comments"("ticket_id");

-- CreateIndex
CREATE INDEX "approval_records_ticket_id_idx" ON "approval_records"("ticket_id");

-- CreateIndex
CREATE INDEX "approval_records_ticket_id_created_at_idx" ON "approval_records"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "work_orders_ticket_id_idx" ON "work_orders"("ticket_id");

-- CreateIndex
CREATE INDEX "work_orders_vendor_company_id_idx" ON "work_orders"("vendor_company_id");

-- CreateIndex
CREATE INDEX "work_orders_assigned_technician_id_idx" ON "work_orders"("assigned_technician_id");

-- CreateIndex
CREATE INDEX "work_orders_current_status_idx" ON "work_orders"("current_status");

-- CreateIndex
CREATE INDEX "work_orders_current_owner_type_current_owner_id_idx" ON "work_orders"("current_owner_type", "current_owner_id");

-- CreateIndex
CREATE INDEX "work_orders_current_owner_type_current_owner_id_current_sta_idx" ON "work_orders"("current_owner_type", "current_owner_id", "current_status");

-- CreateIndex
CREATE INDEX "wo_comments_wo_id_idx" ON "wo_comments"("wo_id");

-- CreateIndex
CREATE INDEX "work_report_rows_wo_id_idx" ON "work_report_rows"("wo_id");

-- CreateIndex
CREATE INDEX "invoice_rows_wo_id_idx" ON "invoice_rows"("wo_id");

-- CreateIndex
CREATE INDEX "invoice_rows_price_list_item_id_idx" ON "invoice_rows"("price_list_item_id");

-- CreateIndex
CREATE INDEX "vendor_price_list_vendor_id_idx" ON "vendor_price_list"("vendor_id");

-- CreateIndex
CREATE INDEX "vendor_price_list_vendor_id_category_idx" ON "vendor_price_list"("vendor_id", "category");

-- CreateIndex
CREATE INDEX "attachments_entity_type_entity_id_idx" ON "attachments"("entity_type", "entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "qr_records_qr_token_key" ON "qr_records"("qr_token");

-- CreateIndex
CREATE INDEX "qr_records_wo_id_idx" ON "qr_records"("wo_id");

-- CreateIndex
CREATE INDEX "qr_records_qr_token_idx" ON "qr_records"("qr_token");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_log_created_at_idx" ON "audit_log"("created_at");

-- AddForeignKey
ALTER TABLE "regions" ADD CONSTRAINT "regions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_users" ADD CONSTRAINT "internal_users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_users" ADD CONSTRAINT "internal_users_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "regions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_users" ADD CONSTRAINT "internal_users_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_users" ADD CONSTRAINT "vendor_users_vendor_company_id_fkey" FOREIGN KEY ("vendor_company_id") REFERENCES "vendor_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_current_owner_user_id_fkey" FOREIGN KEY ("current_owner_user_id") REFERENCES "internal_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_comments" ADD CONSTRAINT "ticket_comments_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_estimations" ADD CONSTRAINT "cost_estimations_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_records" ADD CONSTRAINT "approval_records_approver_user_id_fkey" FOREIGN KEY ("approver_user_id") REFERENCES "internal_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_vendor_company_id_fkey" FOREIGN KEY ("vendor_company_id") REFERENCES "vendor_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_technician_id_fkey" FOREIGN KEY ("assigned_technician_id") REFERENCES "vendor_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wo_comments" ADD CONSTRAINT "wo_comments_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_report_rows" ADD CONSTRAINT "work_report_rows_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_rows" ADD CONSTRAINT "invoice_rows_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_rows" ADD CONSTRAINT "invoice_rows_price_list_item_id_fkey" FOREIGN KEY ("price_list_item_id") REFERENCES "vendor_price_list"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_price_list" ADD CONSTRAINT "vendor_price_list_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendor_companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_records" ADD CONSTRAINT "qr_records_wo_id_fkey" FOREIGN KEY ("wo_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_work_order_id_fkey" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
