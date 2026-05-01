/**
 * Work Order Service
 * Handles vendor execution workflow
 */

import type { WorkOrderStatus as PrismaWorkOrderStatus } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { validateTransition } from '../../core/state-machine/index.js';
import { WorkOrderStatus } from '../../types/statuses.js';
import type { WorkOrderStatusType } from '../../types/statuses.js';
import type { Role } from '../../types/roles.js';
import { qrService } from '../qr/qr-service.js';
import { notifyNewOwner } from '../email/email-service.js';
import type {
  AssignTechnicianRequest,
  CheckInRequest,
  CheckOutRequest,
  SubmitCostProposalRequest,
  ApproveCostProposalRequest,
  RequestCostRevisionRequest,
  CloseWithoutCostRequest,
  ReturnForClarificationRequest,
  ResendToVendorRequest,
  ReturnForTechCountRequest,
  RejectWorkOrderRequest,
  WorkOrderResponse,
  WorkOrderDetailResponse,
} from './types.js';

/** Map Prisma enum key to display status (state machine uses display strings). */
function toOurStatus(prismaStatus: string): WorkOrderStatusType {
  const map: Record<string, WorkOrderStatusType> = {
    CREATED: WorkOrderStatus.CREATED,
    ACCEPTED_TECHNICIAN_ASSIGNED: WorkOrderStatus.ACCEPTED_TECHNICIAN_ASSIGNED,
    SERVICE_IN_PROGRESS: WorkOrderStatus.SERVICE_IN_PROGRESS,
    SERVICE_COMPLETED: WorkOrderStatus.SERVICE_COMPLETED,
    FOLLOW_UP_REQUESTED: WorkOrderStatus.FOLLOW_UP_REQUESTED,
    NEW_WO_NEEDED: WorkOrderStatus.NEW_WO_NEEDED,
    REPAIR_UNSUCCESSFUL: WorkOrderStatus.REPAIR_UNSUCCESSFUL,
    COST_PROPOSAL_PREPARED: WorkOrderStatus.COST_PROPOSAL_PREPARED,
    COST_REVISION_REQUESTED: WorkOrderStatus.COST_REVISION_REQUESTED,
    COST_PROPOSAL_APPROVED: WorkOrderStatus.COST_PROPOSAL_APPROVED,
    CLOSED_WITHOUT_COST: WorkOrderStatus.CLOSED_WITHOUT_COST,
    REJECTED: WorkOrderStatus.REJECTED,
  };
  return map[prismaStatus] ?? (prismaStatus as WorkOrderStatusType);
}

function toPrismaStatus(ourStatus: WorkOrderStatusType): PrismaWorkOrderStatus {
  const map: Record<string, PrismaWorkOrderStatus> = {
    [WorkOrderStatus.CREATED]: 'CREATED' as PrismaWorkOrderStatus,
    [WorkOrderStatus.ACCEPTED_TECHNICIAN_ASSIGNED]:
      'ACCEPTED_TECHNICIAN_ASSIGNED' as PrismaWorkOrderStatus,
    [WorkOrderStatus.SERVICE_IN_PROGRESS]:
      'SERVICE_IN_PROGRESS' as PrismaWorkOrderStatus,
    [WorkOrderStatus.SERVICE_COMPLETED]:
      'SERVICE_COMPLETED' as PrismaWorkOrderStatus,
    [WorkOrderStatus.FOLLOW_UP_REQUESTED]:
      'FOLLOW_UP_REQUESTED' as PrismaWorkOrderStatus,
    [WorkOrderStatus.NEW_WO_NEEDED]: 'NEW_WO_NEEDED' as PrismaWorkOrderStatus,
    [WorkOrderStatus.REPAIR_UNSUCCESSFUL]:
      'REPAIR_UNSUCCESSFUL' as PrismaWorkOrderStatus,
    [WorkOrderStatus.COST_PROPOSAL_PREPARED]:
      'COST_PROPOSAL_PREPARED' as PrismaWorkOrderStatus,
    [WorkOrderStatus.COST_REVISION_REQUESTED]:
      'COST_REVISION_REQUESTED' as PrismaWorkOrderStatus,
    [WorkOrderStatus.COST_PROPOSAL_APPROVED]:
      'COST_PROPOSAL_APPROVED' as PrismaWorkOrderStatus,
    [WorkOrderStatus.CLOSED_WITHOUT_COST]:
      'CLOSED_WITHOUT_COST' as PrismaWorkOrderStatus,
    [WorkOrderStatus.REJECTED]: 'REJECTED' as PrismaWorkOrderStatus,
  };
  return map[ourStatus] ?? (ourStatus as PrismaWorkOrderStatus);
}

export class WorkOrderService {
  /**
   * Assign technician to work order (S1 → S2)
   */
  async assignTechnician(
    request: AssignTechnicianRequest,
    userId: number,
    role: Role
  ): Promise<WorkOrderResponse> {
    const wo = await prisma.workOrder.findUnique({
      where: { id: request.workOrderId },
    });

    if (!wo) {
      throw new Error('Work order not found');
    }

    const validation = await validateTransition({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      currentStatus: toOurStatus(wo.currentStatus),
      currentOwnerId: wo.currentOwnerId,
      currentOwnerType: wo.currentOwnerType,
      action: 'ASSIGN_TECHNICIAN',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    const updated = await prisma.workOrder.update({
      where: { id: wo.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as WorkOrderStatusType),
        assignedTechnicianId: request.technicianUserId,
        currentOwnerId: request.technicianUserId,
        eta: request.eta,
      },
      include: {
        vendorCompany: true,
        assignedTechnician: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        workOrderId: wo.id,
        prevStatus: wo.currentStatus,
        newStatus: validation.newStatus! as string,
        actionType: 'ASSIGN_TECHNICIAN',
        actorType: 'VENDOR',
        actorId: userId,
        comment: `Assigned to ${updated.assignedTechnician?.name ?? 'technician'}, ETA: ${request.eta.toISOString()}`,
      },
    });
    await notifyNewOwner({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      newOwnerId: request.technicianUserId,
      ownerType: 'VENDOR',
      context: 'Radni nalog vam je dodijeljen kao tehničar',
    });

    return this.mapWorkOrderToResponse(updated);
  }

  /**
   * Check-in (S2 scans QR)
   */
  async checkIn(
    request: CheckInRequest,
    userId: number,
    role: Role
  ): Promise<WorkOrderResponse> {
    const wo = await prisma.workOrder.findUnique({
      where: { id: request.workOrderId },
    });

    if (!wo) {
      throw new Error('Work order not found');
    }

    const qrValidation = await qrService.validateQR({
      qrToken: request.qrToken,
      workOrderId: wo.id,
    });

    if (!qrValidation.valid) {
      throw new Error(qrValidation.error ?? 'Invalid QR code');
    }

    if (qrValidation.scanType !== 'CHECKIN') {
      throw new Error('QR code is not for check-in');
    }

    const validation = await validateTransition({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      currentStatus: toOurStatus(wo.currentStatus),
      currentOwnerId: wo.currentOwnerId,
      currentOwnerType: wo.currentOwnerType,
      action: 'CHECKIN',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    const techCount = request.techCountConfirmed != null && request.techCountConfirmed >= 1
      ? request.techCountConfirmed
      : qrValidation.techCountConfirmed ?? undefined;
    const now = new Date();
    const updated = await prisma.workOrder.update({
      where: { id: wo.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as WorkOrderStatusType),
        checkinTs: now,
        declaredTechCount: techCount,
      },
      include: {
        vendorCompany: true,
        assignedTechnician: true,
      },
    });

    // One visit row per check-in (supports many visits when S2 repeatedly chooses "follow up visit needed")
    await prisma.workOrderVisit.create({
      data: {
        workOrderId: wo.id,
        checkinTs: now,
        checkoutTs: null,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        workOrderId: wo.id,
        prevStatus: wo.currentStatus,
        newStatus: validation.newStatus! as string,
        actionType: 'CHECKIN',
        actorType: 'VENDOR',
        actorId: userId,
        comment: `Checked in with ${techCount ?? 0} technician(s)`,
      },
    });

    return this.mapWorkOrderToResponse(updated);
  }

  /**
   * Check-out (S2 scans QR, reports work done + outcome)
   */
  async checkOut(
    request: CheckOutRequest,
    userId: number,
    role: Role
  ): Promise<WorkOrderResponse> {
    const wo = await prisma.workOrder.findUnique({
      where: { id: request.workOrderId },
    });

    if (!wo) {
      throw new Error('Work order not found');
    }

    const qrValidation = await qrService.validateQR({
      qrToken: request.qrToken,
      workOrderId: wo.id,
    });

    if (!qrValidation.valid) {
      throw new Error(qrValidation.error ?? 'Invalid QR code');
    }

    if (qrValidation.scanType !== 'CHECKOUT') {
      throw new Error('QR code is not for checkout');
    }

    if (request.outcome !== 'FIXED' && !request.comment) {
      throw new Error('Comment required for non-FIXED outcomes');
    }

    const actionMap: Record<string, string> = {
      FIXED: 'CHECKOUT_FIXED',
      FOLLOW_UP: 'CHECKOUT_FOLLOW_UP',
      NEW_WO_NEEDED: 'CHECKOUT_NEW_WO_NEEDED',
      UNSUCCESSFUL: 'CHECKOUT_UNSUCCESSFUL',
    };
    const action = actionMap[request.outcome];

    const validation = await validateTransition({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      currentStatus: toOurStatus(wo.currentStatus),
      currentOwnerId: wo.currentOwnerId,
      currentOwnerType: wo.currentOwnerType,
      action,
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    let newOwnerId: number = wo.currentOwnerId;
    let newOwnerType: 'INTERNAL' | 'VENDOR' = 'VENDOR';

    if (request.outcome === 'FIXED') {
      const s3 = await prisma.vendorUser.findFirst({
        where: {
          vendorCompanyId: wo.vendorCompanyId,
          role: 'S3',
          active: true,
        },
      });
      if (!s3) {
        throw new Error('Vendor Finance user (S3) not found');
      }
      newOwnerId = s3.id;
    } else if (
      request.outcome === 'NEW_WO_NEEDED' ||
      request.outcome === 'UNSUCCESSFUL'
    ) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: wo.ticketId },
        include: { store: { include: { region: true } } },
      });
      if (!ticket?.store) {
        throw new Error('Ticket or store not found');
      }
      const amm = await prisma.internalUser.findFirst({
        where: {
          companyId: ticket.companyId,
          regionId: ticket.store.regionId,
          role: 'AMM',
          active: true,
        },
      });
      if (!amm) {
        throw new Error('AMM not found');
      }
      newOwnerId = amm.id;
      newOwnerType = 'INTERNAL';
    }

    const checkoutNow = new Date();
    const updated = await prisma.workOrder.update({
      where: { id: wo.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as WorkOrderStatusType),
        checkoutTs: checkoutNow,
        currentOwnerId: newOwnerId,
        currentOwnerType: newOwnerType,
      },
      include: {
        vendorCompany: true,
        assignedTechnician: true,
      },
    });

    // Close current visit (supports many visits: each check-out closes the latest open visit)
    const currentVisit = await prisma.workOrderVisit.findFirst({
      where: { workOrderId: wo.id, checkoutTs: null },
      orderBy: { checkinTs: 'desc' },
    });
    if (currentVisit) {
      await prisma.workOrderVisit.update({
        where: { id: currentVisit.id },
        data: { checkoutTs: checkoutNow },
      });
    }

    // Append work report rows (so all visits' services are summed for billing)
    const existingRowCount = await prisma.workReportRow.count({ where: { woId: wo.id } });
    for (let i = 0; i < request.workReport.length; i++) {
      const row = request.workReport[i];
      await prisma.workReportRow.create({
        data: {
          woId: wo.id,
          rowNumber: existingRowCount + i + 1,
          description: row.description,
          unit: row.unit,
          quantity: row.quantity,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        workOrderId: wo.id,
        prevStatus: wo.currentStatus,
        newStatus: validation.newStatus! as string,
        actionType: action,
        actorType: 'VENDOR',
        actorId: userId,
        comment: request.comment ?? `Outcome: ${request.outcome}`,
      },
    });

    return this.mapWorkOrderToResponse(updated);
  }

  /**
   * Get vendor price list (for S3 cost proposal).
   * Returns all active items including selectableInUI and unitMinutes so the frontend
   * can show only selectable items in the dropdown and auto-apply non-selectable (e.g. arrival, service time).
   */
  async getVendorPriceList(vendorCompanyId: number): Promise<
    Array<{
      id: number;
      category: string;
      description: string;
      unit: string;
      pricePerUnit: number;
      selectableInUI: boolean;
      unitMinutes: number | null;
    }>
  > {
    const items = await prisma.vendorPriceListItem.findMany({
      where: { vendorId: vendorCompanyId, active: true },
      orderBy: [{ category: 'asc' }, { description: 'asc' }],
    });
    return items.map((i) => ({
      id: i.id,
      category: i.category,
      description: i.description,
      unit: i.unit,
      pricePerUnit: Number(i.pricePerUnit),
      selectableInUI: i.selectableInUI,
      unitMinutes: i.unitMinutes,
    }));
  }

  /**
   * Submit or resubmit cost proposal (S3)
   * From Service Completed → SUBMIT_COST_PROPOSAL; from Cost Revision Requested → RESUBMIT_COST_PROPOSAL
   */
  async submitCostProposal(
    request: SubmitCostProposalRequest,
    userId: number,
    role: Role
  ): Promise<WorkOrderDetailResponse> {
    const wo = await prisma.workOrder.findUnique({
      where: { id: request.workOrderId },
      include: { vendorCompany: true },
    });

    if (!wo) {
      throw new Error('Work order not found');
    }

    const isResubmit = wo.currentStatus === 'COST_REVISION_REQUESTED';
    const action = isResubmit ? 'RESUBMIT_COST_PROPOSAL' : 'SUBMIT_COST_PROPOSAL';

    const validation = await validateTransition({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      currentStatus: toOurStatus(wo.currentStatus),
      currentOwnerId: wo.currentOwnerId,
      currentOwnerType: wo.currentOwnerType,
      action,
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    if (isResubmit) {
      await prisma.invoiceRow.deleteMany({ where: { woId: wo.id } });
    }

    for (let i = 0; i < request.invoiceRows.length; i++) {
      const row = request.invoiceRows[i];
      const lineTotal = row.quantity * row.pricePerUnit;

      let warningFlag = false;
      if (row.priceListItemId != null) {
        const priceListItem = await prisma.vendorPriceListItem.findUnique({
          where: { id: row.priceListItemId },
        });
        if (
          !priceListItem ||
          priceListItem.vendorId !== wo.vendorCompanyId
        ) {
          warningFlag = true;
        }
      } else {
        warningFlag = true;
      }

      await prisma.invoiceRow.create({
        data: {
          woId: wo.id,
          rowNumber: i + 1,
          description: row.description,
          unit: row.unit,
          quantity: row.quantity,
          pricePerUnit: row.pricePerUnit,
          lineTotal,
          priceListItemId: row.priceListItemId ?? undefined,
          warningFlag,
        },
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: wo.ticketId },
      include: { store: { include: { region: true } } },
    });
    const amm = await prisma.internalUser.findFirst({
      where: {
        companyId: ticket!.companyId,
        regionId: ticket!.store!.regionId,
        role: 'AMM',
        active: true,
      },
    });

    if (!amm) {
      throw new Error('AMM not found');
    }

    const updated = await prisma.workOrder.update({
      where: { id: wo.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as WorkOrderStatusType),
        currentOwnerId: amm.id,
        currentOwnerType: 'INTERNAL',
      },
      include: {
        vendorCompany: true,
        assignedTechnician: true,
        invoiceRows: true,
        workReportRows: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        workOrderId: wo.id,
        prevStatus: wo.currentStatus,
        newStatus: validation.newStatus! as string,
        actionType: action,
        actorType: 'VENDOR',
        actorId: userId,
      },
    });
    await notifyNewOwner({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      newOwnerId: amm.id,
      ownerType: 'INTERNAL',
      context: 'Vendor je dostavio prijedlog troška — čeka vaše odobrenje',
    });

    return this.mapWorkOrderToDetailResponse(updated);
  }

  /**
   * Approve cost proposal (AMM approves)
   */
  async approveCostProposal(
    request: ApproveCostProposalRequest,
    userId: number,
    role: Role
  ): Promise<WorkOrderResponse> {
    const wo = await prisma.workOrder.findUnique({
      where: { id: request.workOrderId },
    });

    if (!wo) {
      throw new Error('Work order not found');
    }

    const validation = await validateTransition({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      currentStatus: toOurStatus(wo.currentStatus),
      currentOwnerId: wo.currentOwnerId,
      currentOwnerType: wo.currentOwnerType,
      action: 'APPROVE_COST',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    const updated = await prisma.workOrder.update({
      where: { id: wo.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as WorkOrderStatusType),
      },
      include: {
        vendorCompany: true,
        assignedTechnician: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        workOrderId: wo.id,
        prevStatus: wo.currentStatus,
        newStatus: validation.newStatus! as string,
        actionType: 'APPROVE_COST',
        actorType: 'INTERNAL',
        actorId: userId,
      },
    });

    return this.mapWorkOrderToResponse(updated);
  }

  /**
   * Request cost revision (AMM → S3)
   */
  async requestCostRevision(
    request: RequestCostRevisionRequest,
    userId: number,
    role: Role
  ): Promise<WorkOrderResponse> {
    const wo = await prisma.workOrder.findUnique({
      where: { id: request.workOrderId },
    });

    if (!wo) {
      throw new Error('Work order not found');
    }

    const validation = await validateTransition({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      currentStatus: toOurStatus(wo.currentStatus),
      currentOwnerId: wo.currentOwnerId,
      currentOwnerType: wo.currentOwnerType,
      action: 'REQUEST_REVISION',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    const s3 = await prisma.vendorUser.findFirst({
      where: {
        vendorCompanyId: wo.vendorCompanyId,
        role: 'S3',
        active: true,
      },
    });

    if (!s3) {
      throw new Error('Vendor Finance user (S3) not found');
    }

    const updated = await prisma.workOrder.update({
      where: { id: wo.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as WorkOrderStatusType),
        currentOwnerId: s3.id,
        currentOwnerType: 'VENDOR',
      },
      include: {
        vendorCompany: true,
        assignedTechnician: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        workOrderId: wo.id,
        prevStatus: wo.currentStatus,
        newStatus: validation.newStatus! as string,
        actionType: 'REQUEST_REVISION',
        actorType: 'INTERNAL',
        actorId: userId,
        comment: request.comment,
      },
    });
    await notifyNewOwner({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      newOwnerId: s3.id,
      ownerType: 'VENDOR',
      context: 'Zatražena je revizija prijedloga troška',
    });

    return this.mapWorkOrderToResponse(updated);
  }

  /**
   * Close without cost (AMM closes)
   */
  async closeWithoutCost(
    request: CloseWithoutCostRequest,
    userId: number,
    role: Role
  ): Promise<WorkOrderResponse> {
    const wo = await prisma.workOrder.findUnique({
      where: { id: request.workOrderId },
    });

    if (!wo) {
      throw new Error('Work order not found');
    }

    const validation = await validateTransition({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      currentStatus: toOurStatus(wo.currentStatus),
      currentOwnerId: wo.currentOwnerId,
      currentOwnerType: wo.currentOwnerType,
      action: 'CLOSE_WITHOUT_COST',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    const updated = await prisma.workOrder.update({
      where: { id: wo.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as WorkOrderStatusType),
      },
      include: {
        vendorCompany: true,
        assignedTechnician: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        workOrderId: wo.id,
        prevStatus: wo.currentStatus,
        newStatus: validation.newStatus! as string,
        actionType: 'CLOSE_WITHOUT_COST',
        actorType: 'INTERNAL',
        actorId: userId,
      },
    });

    return this.mapWorkOrderToResponse(updated);
  }

  /**
   * Return work order to AMM for clarification (S1)
   */
  async returnForClarification(
    request: ReturnForClarificationRequest,
    userId: number,
    role: Role
  ): Promise<WorkOrderResponse> {
    const wo = await prisma.workOrder.findUnique({
      where: { id: request.workOrderId },
      include: { ticket: { include: { store: true } } },
    });

    if (!wo?.ticket?.store) {
      throw new Error('Work order or ticket/store not found');
    }

    const validation = await validateTransition({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      currentStatus: toOurStatus(wo.currentStatus),
      currentOwnerId: wo.currentOwnerId,
      currentOwnerType: wo.currentOwnerType,
      action: 'RETURN_FOR_CLARIFICATION',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    const amm = await prisma.internalUser.findFirst({
      where: {
        companyId: wo.ticket.companyId,
        regionId: wo.ticket.store.regionId,
        role: 'AMM',
        active: true,
      },
    });

    if (!amm) {
      throw new Error('AMM not found');
    }

    const updated = await prisma.workOrder.update({
      where: { id: wo.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as WorkOrderStatusType),
        currentOwnerId: amm.id,
        currentOwnerType: 'INTERNAL',
      },
      include: {
        vendorCompany: true,
        assignedTechnician: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        workOrderId: wo.id,
        prevStatus: wo.currentStatus,
        newStatus: validation.newStatus! as string,
        actionType: 'RETURN_FOR_CLARIFICATION',
        actorType: 'VENDOR',
        actorId: userId,
        comment: request.comment,
      },
    });
    await notifyNewOwner({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      newOwnerId: amm.id,
      ownerType: 'INTERNAL',
      context: 'Radni nalog je vraćen na pojašnjenje',
    });

    return this.mapWorkOrderToResponse(updated);
  }

  /**
   * Resend work order to vendor S1 (AMM) — when WO was returned for clarification.
   */
  async resendToVendor(
    request: ResendToVendorRequest,
    userId: number,
    role: Role
  ): Promise<WorkOrderResponse> {
    const wo = await prisma.workOrder.findUnique({
      where: { id: request.workOrderId },
    });

    if (!wo) {
      throw new Error('Work order not found');
    }

    const validation = await validateTransition({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      currentStatus: toOurStatus(wo.currentStatus),
      currentOwnerId: wo.currentOwnerId,
      currentOwnerType: wo.currentOwnerType,
      action: 'RESEND_TO_VENDOR',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    const s1 = await prisma.vendorUser.findFirst({
      where: {
        vendorCompanyId: wo.vendorCompanyId,
        role: 'S1',
        active: true,
      },
    });

    if (!s1) {
      throw new Error('Vendor (S1) not found for this work order');
    }

    const updateData: { currentOwnerId: number; currentOwnerType: 'VENDOR'; commentToVendor?: string } = {
      currentOwnerId: s1.id,
      currentOwnerType: 'VENDOR',
    };
    if (request.comment != null && request.comment.trim() !== '') {
      updateData.commentToVendor = request.comment.trim();
    }

    const updated = await prisma.workOrder.update({
      where: { id: wo.id },
      data: {
        ...updateData,
        currentStatus: toPrismaStatus(validation.newStatus! as WorkOrderStatusType),
      },
      include: {
        vendorCompany: true,
        assignedTechnician: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        workOrderId: wo.id,
        prevStatus: wo.currentStatus,
        newStatus: validation.newStatus! as string,
        actionType: 'RESEND_TO_VENDOR',
        actorType: 'INTERNAL',
        actorId: userId,
        comment: request.comment ?? undefined,
      },
    });
    await notifyNewOwner({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      newOwnerId: s1.id,
      ownerType: 'VENDOR',
      context: 'Radni nalog je ponovo dodijeljen vama',
    });

    return this.mapWorkOrderToResponse(updated);
  }

  /**
   * Return work order to Store Manager so they can generate QR with correct technician count (S2)
   */
  async returnForTechCount(
    request: ReturnForTechCountRequest,
    userId: number,
    role: Role
  ): Promise<WorkOrderResponse> {
    const wo = await prisma.workOrder.findUnique({
      where: { id: request.workOrderId },
      include: { ticket: { include: { store: true } } },
    });

    if (!wo?.ticket?.store) {
      throw new Error('Work order or ticket/store not found');
    }

    const validation = await validateTransition({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      currentStatus: toOurStatus(wo.currentStatus),
      currentOwnerId: wo.currentOwnerId,
      currentOwnerType: wo.currentOwnerType,
      action: 'RETURN_FOR_TECH_COUNT',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    const sm = await prisma.internalUser.findFirst({
      where: {
        companyId: wo.ticket.companyId,
        storeId: wo.ticket.storeId,
        role: 'SM',
        active: true,
      },
    });

    if (!sm) {
      throw new Error('Store Manager not found for this store');
    }

    const updated = await prisma.workOrder.update({
      where: { id: wo.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as WorkOrderStatusType),
        currentOwnerId: sm.id,
        currentOwnerType: 'INTERNAL',
      },
      include: {
        vendorCompany: true,
        assignedTechnician: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        workOrderId: wo.id,
        prevStatus: wo.currentStatus,
        newStatus: validation.newStatus! as string,
        actionType: 'RETURN_FOR_TECH_COUNT',
        actorType: 'VENDOR',
        actorId: userId,
        comment: request.comment ?? 'Returned to store to correct number of technicians',
      },
    });
    await notifyNewOwner({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      newOwnerId: sm.id,
      ownerType: 'INTERNAL',
      context: 'Potrebna je ispravka broja tehničara',
    });

    return this.mapWorkOrderToResponse(updated);
  }

  /**
   * Reject work order (S1) — owner becomes AMM
   */
  async rejectWorkOrder(
    request: RejectWorkOrderRequest,
    userId: number,
    role: Role
  ): Promise<WorkOrderResponse> {
    const wo = await prisma.workOrder.findUnique({
      where: { id: request.workOrderId },
      include: { ticket: { include: { store: true } } },
    });

    if (!wo?.ticket?.store) {
      throw new Error('Work order or ticket/store not found');
    }

    const validation = await validateTransition({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      currentStatus: toOurStatus(wo.currentStatus),
      currentOwnerId: wo.currentOwnerId,
      currentOwnerType: wo.currentOwnerType,
      action: 'REJECT',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    const amm = await prisma.internalUser.findFirst({
      where: {
        companyId: wo.ticket.companyId,
        regionId: wo.ticket.store.regionId,
        role: 'AMM',
        active: true,
      },
    });

    if (!amm) {
      throw new Error('AMM not found');
    }

    const updated = await prisma.workOrder.update({
      where: { id: wo.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as WorkOrderStatusType),
        currentOwnerId: amm.id,
        currentOwnerType: 'INTERNAL',
      },
      include: {
        vendorCompany: true,
        assignedTechnician: true,
      },
    });

    const actorType = role === 'AMM' ? 'INTERNAL' : 'VENDOR';
    await prisma.auditLog.create({
      data: {
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        workOrderId: wo.id,
        prevStatus: wo.currentStatus,
        newStatus: validation.newStatus! as string,
        actionType: 'REJECT',
        actorType,
        actorId: userId,
        comment: request.reason,
      },
    });
    await notifyNewOwner({
      entityType: 'WORK_ORDER',
      entityId: wo.id,
      newOwnerId: amm.id,
      ownerType: 'INTERNAL',
      context: 'Radni nalog je odbijen od strane vendora',
    });

    return this.mapWorkOrderToResponse(updated);
  }

  /**
   * Record work order opened by S1 (read acknowledgment, internal flag)
   */
  async recordWorkOrderOpened(workOrderId: number, userId: number): Promise<void> {
    const wo = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true, openedAt: true, currentOwnerId: true },
    });
    if (!wo) {
      throw new Error('Work order not found');
    }
    if (wo.openedAt != null) {
      return; // already opened
    }
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: { openedAt: new Date() },
    });
  }

  /**
   * List work orders by vendor company, current owner, or store (for SM QR section)
   */
  async listWorkOrders(params: {
    companyId?: number;
    userType: 'INTERNAL' | 'VENDOR';
    vendorCompanyId?: number;
    currentOwnerId?: number;
    ticketId?: number;
    storeId?: number;
    regionId?: number;
    currentStatus?: PrismaWorkOrderStatus;
    currentOwnerType?: 'INTERNAL' | 'VENDOR';
    urgent?: boolean;
  }): Promise<WorkOrderResponse[]> {
    const where: {
      vendorCompanyId?: number;
      currentOwnerId?: number;
      ticketId?: number;
      ticket?: { storeId?: number; store?: { regionId: number }; urgent?: boolean };
      currentStatus?: PrismaWorkOrderStatus;
      currentOwnerType?: 'INTERNAL' | 'VENDOR';
    } = {};
    if (params.userType === 'VENDOR') {
      if (params.companyId == null) {
        throw new Error('Vendor scope requires vendor company id in session');
      }
      where.vendorCompanyId = params.companyId;
    } else if (params.vendorCompanyId != null) {
      where.vendorCompanyId = params.vendorCompanyId;
    }
    if (params.currentOwnerId != null) where.currentOwnerId = params.currentOwnerId;
    if (params.ticketId != null) where.ticketId = params.ticketId;
    const ticketWhere: { companyId?: number; storeId?: number; store?: { regionId: number }; urgent?: boolean } = {};
    if (params.userType !== 'VENDOR' && params.companyId != null) {
      ticketWhere.companyId = params.companyId;
    }
    if (params.storeId != null) ticketWhere.storeId = params.storeId;
    if (params.regionId != null) ticketWhere.store = { regionId: params.regionId };
    if (params.urgent != null) ticketWhere.urgent = params.urgent;
    if (Object.keys(ticketWhere).length) where.ticket = ticketWhere;
    if (params.currentStatus != null) where.currentStatus = params.currentStatus;
    if (params.currentOwnerType != null) where.currentOwnerType = params.currentOwnerType;

    const list = await prisma.workOrder.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: {
        vendorCompany: true,
        assignedTechnician: true,
        ticket: { include: { store: true, asset: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return list.map((wo) => {
      const res = this.mapWorkOrderToResponse(wo);
      const t = (wo as { ticket?: { store?: { name: string; address: string | null }; category: string; urgent: boolean }; commentToVendor?: string | null }).ticket;
      const woExtra = wo as { commentToVendor?: string | null };
      if (t?.store) {
        res.storeName = t.store.name;
        res.storeAddress = t.store.address ?? null;
      }
      if (t) {
        res.category = t.category;
        res.urgent = t.urgent;
      }
      if (woExtra.commentToVendor != null) res.commentToVendor = woExtra.commentToVendor;
      return res;
    });
  }

  /**
   * Get work order by ID (includes S1 detail: store, category, urgent, commentToVendor, attachments, asset)
   */
  async getWorkOrder(
    workOrderId: number,
    scope: { companyId?: number; userType: 'INTERNAL' | 'VENDOR' }
  ): Promise<WorkOrderDetailResponse> {
    const where =
      scope?.userType === 'VENDOR'
        ? {
            id: workOrderId,
            ...(scope.companyId != null ? { vendorCompanyId: scope.companyId } : {}),
          }
        : {
            id: workOrderId,
            ...(scope?.companyId != null ? { ticket: { companyId: scope.companyId } } : {}),
          };
    const wo = await prisma.workOrder.findUnique({
      where,
      include: {
        vendorCompany: true,
        assignedTechnician: true,
        workReportRows: true,
        invoiceRows: true,
        visits: { orderBy: { checkinTs: 'asc' } },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        ticket: {
          include: {
            store: true,
            asset: true,
            attachments: true,
          },
        },
        attachments: true,
      },
    });

    if (!wo) {
      throw new Error('Work order not found');
    }

    const detail = this.mapWorkOrderToDetailResponse(wo as Parameters<WorkOrderService['mapWorkOrderToDetailResponse']>[0]);
    const woAny = wo as {
      ticket?: { store?: { name: string; address: string | null }; category: string; urgent: boolean; asset?: { description: string | null }; attachments?: Array<{ id: number; fileName: string }> };
      commentToVendor?: string | null;
      openedAt?: Date | null;
      attachments?: Array<{ id: number; fileName: string }>;
      auditLogs?: Array<{ id: number; createdAt: Date; actionType: string; prevStatus: string | null; newStatus: string; entityType: string; actorType: string; actorId: number; comment: string | null }>;
      visits?: Array<{ checkinTs: Date; checkoutTs: Date | null }>;
      checkinTs?: Date | null;
      checkoutTs?: Date | null;
    };
    if (woAny.ticket?.store) {
      detail.storeName = woAny.ticket.store.name;
      detail.storeAddress = woAny.ticket.store.address ?? null;
    }
    if (woAny.ticket) {
      detail.category = woAny.ticket.category;
      detail.urgent = woAny.ticket.urgent;
      detail.assetDescription = woAny.ticket.asset?.description ?? null;
    }
    if (woAny.commentToVendor != null) detail.commentToVendor = woAny.commentToVendor;
    if (woAny.openedAt != null) detail.openedAt = woAny.openedAt;
    const woAttachments = woAny.attachments ?? [];
    const ticketAttachments = woAny.ticket?.attachments ?? [];
    detail.attachments = [
      ...woAttachments.map((a) => ({ id: a.id, fileName: a.fileName })),
      ...ticketAttachments.map((a) => ({ id: a.id, fileName: a.fileName })),
    ];

    // Only work order workflow (WO statuses), not ticket audit entries
    const woAuditEntries = (woAny.auditLogs ?? []).filter((a) => a.entityType === 'WORK_ORDER');
    if (woAuditEntries.length > 0) {
      const internalActorIds = [...new Set(woAuditEntries.filter((a) => a.actorType === 'INTERNAL').map((a) => a.actorId))];
      const vendorActorIds = [...new Set(woAuditEntries.filter((a) => a.actorType === 'VENDOR').map((a) => a.actorId))];
      const internalUsers = internalActorIds.length > 0 ? await prisma.internalUser.findMany({ where: { id: { in: internalActorIds } }, select: { id: true, name: true, role: true } }) : [];
      const vendorUsers = vendorActorIds.length > 0 ? await prisma.vendorUser.findMany({ where: { id: { in: vendorActorIds } }, select: { id: true, name: true, role: true } }) : [];
      const internalMap = new Map(internalUsers.map((u) => [u.id, { name: u.name, role: u.role }]));
      const vendorMap = new Map(vendorUsers.map((u) => [u.id, { name: u.name, role: u.role }]));
      detail.auditLog = woAuditEntries.map((a) => {
        const info = a.actorType === 'INTERNAL' ? internalMap.get(a.actorId) : vendorMap.get(a.actorId);
        return {
          id: a.id,
          createdAt: a.createdAt,
          actionType: a.actionType,
          prevStatus: a.prevStatus,
          newStatus: a.newStatus,
          actorType: a.actorType,
          actorId: a.actorId,
          comment: a.comment,
          actorName: info?.name ?? 'Unknown',
          actorRole: info?.role ?? null,
        };
      });
    }

    if (woAny.visits != null && woAny.visits.length > 0) {
      detail.visitPairs = woAny.visits.map((v) => ({ checkinTs: v.checkinTs, checkoutTs: v.checkoutTs }));
    } else if (woAny.checkinTs != null && woAny.checkoutTs != null) {
      detail.visitPairs = [{ checkinTs: woAny.checkinTs, checkoutTs: woAny.checkoutTs }];
    }

    return detail;
  }

  private mapWorkOrderToResponse(wo: {
    id: number;
    ticketId: number;
    vendorCompanyId: number;
    vendorCompany: { name: string };
    assignedTechnicianId: number | null;
    assignedTechnician?: { name: string } | null;
    eta: Date | null;
    currentStatus: string;
    currentOwnerType: string;
    currentOwnerId: number;
    declaredTechCount: number | null;
    checkinTs: Date | null;
    checkoutTs: Date | null;
    createdAt: Date;
    updatedAt: Date;
    invoiceBatchId?: number | null;
  }): WorkOrderResponse {
    return {
      id: wo.id,
      ticketId: wo.ticketId,
      vendorCompanyId: wo.vendorCompanyId,
      vendorCompanyName: wo.vendorCompany.name,
      assignedTechnicianId: wo.assignedTechnicianId,
      assignedTechnicianName: wo.assignedTechnician?.name ?? null,
      eta: wo.eta,
      currentStatus: toOurStatus(wo.currentStatus),
      currentOwnerType: wo.currentOwnerType as 'INTERNAL' | 'VENDOR',
      currentOwnerId: wo.currentOwnerId,
      declaredTechCount: wo.declaredTechCount,
      checkinTs: wo.checkinTs,
      checkoutTs: wo.checkoutTs,
      createdAt: wo.createdAt,
      updatedAt: wo.updatedAt,
      invoiceBatchId: wo.invoiceBatchId ?? undefined,
    };
  }

  private mapWorkOrderToDetailResponse(
    wo: Parameters<WorkOrderService['mapWorkOrderToResponse']>[0] & {
      invoiceRows?: Array<{
        id: number;
        rowNumber: number;
        description: string;
        unit: string;
        quantity: unknown;
        pricePerUnit: unknown;
        lineTotal: unknown;
        priceListItemId: number | null;
        warningFlag: boolean;
      }>;
      workReportRows?: Array<{
        description: string;
        unit: string;
        quantity: unknown;
      }>;
    }
  ): WorkOrderDetailResponse {
    const base = this.mapWorkOrderToResponse(wo);
    const totalCost =
      wo.invoiceRows?.reduce(
        (sum, row) => sum + Number(row.lineTotal),
        0
      ) ?? 0;

    return {
      ...base,
      workReport:
        wo.workReportRows?.map((r) => ({
          description: r.description,
          unit: r.unit,
          quantity: Number(r.quantity),
        })) ?? [],
      invoiceRows:
        wo.invoiceRows?.map((r) => ({
          id: r.id,
          rowNumber: r.rowNumber,
          description: r.description,
          unit: r.unit,
          quantity: Number(r.quantity),
          pricePerUnit: Number(r.pricePerUnit),
          lineTotal: Number(r.lineTotal),
          priceListItemId: r.priceListItemId,
          warningFlag: r.warningFlag,
        })) ?? [],
      totalCost,
    };
  }
}

export const workOrderService = new WorkOrderService();
