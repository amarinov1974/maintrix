/**
 * Audit log helpers.
 *
 * The codebase has 26+ direct `prisma.auditLog.create` calls. Each one
 * repeats the same shape (entity type literal, entity id mirrored to the
 * dedicated FK, plus the same five fields). The helpers below centralize
 * that shape so:
 *
 * - Future state-transition mutations only have to call one function.
 * - When we eventually add fields (e.g. request id, IP address), there's
 *   one place to update.
 * - Tests can mock the helper instead of `prisma.auditLog.create` directly.
 */

import { prisma } from '../../config/database.js';

interface BaseAuditArgs {
  prevStatus: string | null;
  newStatus: string;
  actionType: string;
  actorType: 'INTERNAL' | 'VENDOR';
  actorId: number;
  comment?: string;
}

export async function writeTicketAudit(
  args: BaseAuditArgs & { ticketId: number }
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      entityType: 'TICKET',
      entityId: args.ticketId,
      ticketId: args.ticketId,
      prevStatus: args.prevStatus,
      newStatus: args.newStatus,
      actionType: args.actionType,
      actorType: args.actorType,
      actorId: args.actorId,
      comment: args.comment,
    },
  });
}

export async function writeWorkOrderAudit(
  args: BaseAuditArgs & { workOrderId: number }
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      entityType: 'WORK_ORDER',
      entityId: args.workOrderId,
      workOrderId: args.workOrderId,
      prevStatus: args.prevStatus,
      newStatus: args.newStatus,
      actionType: args.actionType,
      actorType: args.actorType,
      actorId: args.actorId,
      comment: args.comment,
    },
  });
}
