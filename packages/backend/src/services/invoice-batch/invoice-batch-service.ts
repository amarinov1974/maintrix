/**
 * Invoice Batch Service
 * Prevents double invoicing: batch AMM-approved cost proposals and generate recap PDF.
 */

import { prisma } from '../../config/database.js';
import type { ScopedPrisma } from '../../lib/scoped-prisma.js';
import { generateBatchRecapPdf, type BatchLineItem, type BatchPdfData } from './invoice-batch-pdf.js';
import path from 'path';
import fs from 'fs';

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads');
const BATCH_PDF_DIR = path.join(UPLOADS_DIR, 'invoice-batches');

export interface CreateBatchResult {
  id: number;
  batchNumber: string;
  vendorCompanyId: number;
  createdById: number;
  createdAt: Date;
  totalAmount: number;
  currency: string;
  status: string;
  itemCount: number;
  pdfUrl: string;
}

/**
 * Create an invoice batch from selected approved cost proposals (work order IDs).
 * Only AMM-approved WOs that are not already batched can be included.
 * Same vendor company required. All-or-nothing transaction + PDF generation.
 */
export async function createBatch(
  workOrderIds: number[],
  vendorCompanyId: number,
  createdByVendorUserId: number,
  db: ScopedPrisma
): Promise<CreateBatchResult> {
  if (workOrderIds.length === 0) {
    throw new Error('At least one work order is required');
  }

  const distinctIds = [...new Set(workOrderIds)];

  // Scoped client auto-adds vendorCompanyId — WOs from other vendors simply won't be found
  const workOrders = await db.workOrder.findMany({
    where: { id: { in: distinctIds } },
    include: {
      vendorCompany: true,
      ticket: { include: { store: true } },
      invoiceRows: true,
    },
  });

  if (workOrders.length !== distinctIds.length) {
    throw new Error('One or more work orders not found');
  }

  for (const wo of workOrders) {
    // Belt-and-suspenders: scoped client already filtered, but keep explicit check
    if (wo.vendorCompanyId !== vendorCompanyId) {
      throw new Error(`Work order ${wo.id} does not belong to your company`);
    }
    if (wo.currentStatus !== 'COST_PROPOSAL_APPROVED') {
      throw new Error(`Work order ${wo.id} is not in status Cost Proposal Approved`);
    }
    if (wo.invoiceBatchId != null) {
      throw new Error(`Work order ${wo.id} is already included in an invoice batch`);
    }
  }

  const createdBy = await db.vendorUser.findUnique({
    where: { id: createdByVendorUserId },
    select: { name: true },
  });
  const createdByName = createdBy?.name ?? 'Unknown';

  const batchNumber = await getNextBatchNumber(db, vendorCompanyId);
  let totalAmount = 0;
  const lineItems: BatchLineItem[] = [];

  for (const wo of workOrders) {
    const woTotal =
      wo.invoiceRows?.reduce((sum, row) => sum + Number(row.lineTotal), 0) ?? 0;
    totalAmount += woTotal;
    const completionDate = wo.checkoutTs
      ? wo.checkoutTs.toISOString().slice(0, 10)
      : wo.updatedAt.toISOString().slice(0, 10);
    const storeName = (wo as { ticket?: { store?: { name: string } } }).ticket?.store?.name ?? '';
    const interventionType =
      (wo as { ticket?: { urgent?: boolean } }).ticket?.urgent === true
        ? 'Hitna intervencija'
        : 'Non-urgent intervencija';
    lineItems.push({
      workOrderId: wo.id,
      ticketId: wo.ticketId,
      storeName,
      completionDate,
      approvedAmount: woTotal,
      interventionType,
    });
  }

  const batch = await prisma.$transaction(async (tx) => {
    const batchRecord = await tx.invoiceBatch.create({
      data: {
        batchNumber,
        vendorCompanyId,
        createdById: createdByVendorUserId,
        totalAmount,
        currency: 'EUR',
        status: 'CREATED',
      },
    });

    await tx.invoiceBatchItem.createMany({
      data: distinctIds.map((workOrderId) => ({
        batchId: batchRecord.id,
        workOrderId,
      })),
    });

    // Explicit vendorCompanyId in where — callback tx is unscoped (Prisma extension
    // only applies to array-form transactions). Belt-and-suspenders with the guard above.
    await tx.workOrder.updateMany({
      where: { id: { in: distinctIds }, vendorCompanyId },
      data: { invoiceBatchId: batchRecord.id },
    });

    return batchRecord;
  });

  const pdfFileName = `batch-${batch.id}-${batch.batchNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
  const pdfPath = path.join(BATCH_PDF_DIR, pdfFileName);

  const pdfData: BatchPdfData = {
    vendorName: workOrders[0].vendorCompany.name,
    batchNumber,
    date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    createdByName,
    items: lineItems,
    totalAmount,
    currency: 'EUR',
  };

  await generateBatchRecapPdf(pdfData, pdfPath);

  await prisma.invoiceBatch.update({
    where: { id: batch.id },
    data: { pdfPath },
  });

  return {
    id: batch.id,
    batchNumber: batch.batchNumber,
    vendorCompanyId: batch.vendorCompanyId,
    createdById: batch.createdById,
    createdAt: batch.createdAt,
    totalAmount: Number(batch.totalAmount),
    currency: batch.currency,
    status: batch.status,
    itemCount: distinctIds.length,
    pdfUrl: `/api/invoice-batches/${batch.id}/pdf`,
  };
}

async function getNextBatchNumber(db: ScopedPrisma, vendorCompanyId: number): Promise<string> {
  const year = new Date().getFullYear();
  // Scoped client auto-filters by vendorCompanyId
  const count = await db.invoiceBatch.count({});
  const seq = String(count + 1).padStart(4, '0');
  // Include vendorCompanyId so batch_number is globally unique (DB unique constraint)
  return `BATCH-${year}-${vendorCompanyId}-${seq}`;
}

/**
 * Get batch by ID; ensure it belongs to the vendor company (for PDF download).
 */
export async function getBatchForVendor(
  batchId: number,
  vendorCompanyId: number,
  db: ScopedPrisma
): Promise<{ pdfPath: string } | null> {
  // Scoped client auto-adds vendorCompanyId to where
  const batch = await db.invoiceBatch.findFirst({
    where: { id: batchId },
    select: { pdfPath: true },
  });
  return batch?.pdfPath ? { pdfPath: batch.pdfPath } : null;
}

/**
 * Resolve absolute path for serving PDF. Returns null if file missing.
 */
export function resolveBatchPdfPath(relativeOrAbsolutePath: string | null): string | null {
  if (!relativeOrAbsolutePath) return null;
  const absolute = path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(BATCH_PDF_DIR, path.basename(relativeOrAbsolutePath));
  return fs.existsSync(absolute) ? absolute : null;
}
