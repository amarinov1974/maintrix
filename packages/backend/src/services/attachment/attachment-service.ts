/**
 * Attachment service — upload, link, and serve files for tickets and assets.
 */

import { prisma } from '../../config/database.js';

export interface AttachmentDownloadInfo {
  id: number;
  fileName: string;
  filePath: string;
  internalFlag: boolean;
}

export interface TicketAttachmentResult {
  id: number;
  fileName: string;
  createdAt: Date;
  internalFlag: boolean;
}

/**
 * Add an attachment to a ticket. Call this after multer has saved the file.
 * Verifies the ticket exists AND belongs to the actor's company; creates
 * Attachment record. Throws if the ticket is from a different tenant —
 * route-level requireAuth alone wasn't enough (a logged-in user from
 * Company A could upload to Company B's ticket if they knew the id).
 */
export async function addTicketAttachment(
  ticketId: number,
  filePath: string,
  fileName: string,
  uploadedById: number,
  actorCompanyId: number,
  internalFlag: boolean = true
): Promise<TicketAttachmentResult> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, companyId: true },
  });
  if (!ticket) {
    throw new Error('Ticket not found');
  }
  if (ticket.companyId !== actorCompanyId) {
    throw new Error('Ticket not found');
  }

  const attachment = await prisma.attachment.create({
    data: {
      entityType: 'TICKET',
      entityId: ticketId,
      ticketId,
      filePath,
      fileName: fileName.slice(0, 255),
      uploadedByType: 'INTERNAL',
      uploadedById,
      internalFlag,
    },
  });

  return {
    id: attachment.id,
    fileName: attachment.fileName,
    createdAt: attachment.createdAt,
    internalFlag: attachment.internalFlag,
  };
}

/**
 * Add an attachment to an asset. Verifies the asset's store belongs to the
 * actor's company; same threat model as `addTicketAttachment`.
 */
export async function addAssetAttachment(
  assetId: number,
  filePath: string,
  fileName: string,
  uploadedById: number,
  actorCompanyId: number
): Promise<TicketAttachmentResult> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true, store: { select: { companyId: true } } },
  });
  if (!asset) throw new Error('Asset not found');
  if (asset.store.companyId !== actorCompanyId) {
    throw new Error('Asset not found');
  }

  const attachment = await prisma.attachment.create({
    data: {
      entityType: 'ASSET',
      entityId: assetId,
      assetId,
      filePath,
      fileName: fileName.slice(0, 255),
      uploadedByType: 'INTERNAL',
      uploadedById,
      internalFlag: true,
    },
  });

  return {
    id: attachment.id,
    fileName: attachment.fileName,
    createdAt: attachment.createdAt,
    internalFlag: attachment.internalFlag,
  };
}

/**
 * Look up an attachment for download. Verifies the parent (ticket or asset)
 * belongs to the actor's company. Throws "Attachment not found" on miss
 * (same message as cross-tenant or non-existent — don't leak which case).
 */
export async function getAttachmentForDownload(
  attachmentId: number,
  actorCompanyId: number,
  actorUserType: 'INTERNAL' | 'VENDOR'
): Promise<AttachmentDownloadInfo> {
  const att = await prisma.attachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      fileName: true,
      filePath: true,
      internalFlag: true,
      entityType: true,
      ticket: { select: { companyId: true } },
      asset: { select: { store: { select: { companyId: true } } } },
    },
  });
  if (!att) throw new Error('Attachment not found');

  let parentCompanyId: number | undefined;
  if (att.entityType === 'TICKET') parentCompanyId = att.ticket?.companyId;
  else if (att.entityType === 'ASSET') parentCompanyId = att.asset?.store.companyId;

  if (parentCompanyId == null || parentCompanyId !== actorCompanyId) {
    throw new Error('Attachment not found');
  }

  // Vendors don't have ticket / asset attachment access in the current model.
  if (actorUserType === 'VENDOR') {
    throw new Error('Attachment not found');
  }

  return {
    id: att.id,
    fileName: att.fileName,
    filePath: att.filePath,
    internalFlag: att.internalFlag,
  };
}

