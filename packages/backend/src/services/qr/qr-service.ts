/**
 * QR Service (Section 18 — QR Code Lifecycle & Validation)
 * Store Manager only. Preconditions: WO accepted, technician assigned, owner S2.
 * Refresh: 5 min expiration. Audit: generated ts, declared count, scan events.
 */

import { prisma } from '../../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { InternalRoles, VendorRoles } from '../../types/roles.js';
import type { Role } from '../../core/state-machine/types.js';
import type {
  GenerateQRRequest,
  GenerateQRResponse,
  ValidateQRRequest,
  ValidateQRResponse,
} from './types.js';

/** Prisma WO status enum keys when QR is allowed (Section 18.2). */
const ELIGIBLE_STATUSES_FOR_QR = [
  'ACCEPTED_TECHNICIAN_ASSIGNED', // check-in
  'SERVICE_IN_PROGRESS',          // checkout
  'FOLLOW_UP_REQUESTED',          // check-in for follow-up visit (SM generates QR, WO moves to ACCEPTED_TECHNICIAN_ASSIGNED)
] as const;

export class QRService {
  private readonly EXPIRATION_MINUTES = parseInt(
    process.env.QR_EXPIRATION_MINUTES ?? '5',
    10
  );

  /**
   * Generate QR code for check-in or checkout. Store Manager only.
   * Preconditions: WO exists, accepted by vendor, technician assigned, owner is S2.
   * Sets WO.declaredTechCount and logs QR_GENERATED.
   */
  async generateQR(
    request: GenerateQRRequest,
    actorId: number,
    actorRole: Role
  ): Promise<GenerateQRResponse> {
    if (actorRole !== InternalRoles.STORE_MANAGER) {
      throw new Error('Only Store Manager can generate QR codes');
    }

    const wo = await prisma.workOrder.findUnique({
      where: { id: request.workOrderId },
      include: { assignedTechnician: true },
    });

    if (!wo) {
      throw new Error('Work order not found');
    }

    const status = wo.currentStatus;
    if (!ELIGIBLE_STATUSES_FOR_QR.includes(status as typeof ELIGIBLE_STATUSES_FOR_QR[number])) {
      throw new Error(
        'QR can only be generated when work order is Accepted/Technician Assigned, Service In Progress, or Follow-Up Visit Requested'
      );
    }

    if (!wo.assignedTechnicianId) {
      throw new Error('Work order must have an assigned technician (S2)');
    }

    const technician = await prisma.vendorUser.findUnique({
      where: { id: wo.assignedTechnicianId },
    });
    if (!technician || technician.role !== VendorRoles.TECHNICIAN) {
      throw new Error('Assigned technician must be S2 (Technician)');
    }

    const isCheckIn = status === 'ACCEPTED_TECHNICIAN_ASSIGNED' || status === 'FOLLOW_UP_REQUESTED';
    // Check-in: allow when owner is S2 or when returned to SM (owner INTERNAL) or when follow-up requested (owner S2).
    // Check-out: owner must be S2 (technician has the WO in progress).
    if (isCheckIn) {
      const ownerIsS2 = wo.currentOwnerType === 'VENDOR' && wo.currentOwnerId === wo.assignedTechnicianId;
      const ownerIsSM = wo.currentOwnerType === 'INTERNAL';
      const isFollowUp = status === 'FOLLOW_UP_REQUESTED';
      if (!ownerIsS2 && !ownerIsSM && !isFollowUp) {
        throw new Error('Work order must be with the assigned technician (S2) or returned to store for check-in QR');
      }
    } else {
      if (wo.currentOwnerType !== 'VENDOR' || wo.currentOwnerId !== wo.assignedTechnicianId) {
        throw new Error('Work order owner must be the assigned technician (S2) for check-out QR');
      }
    }

    const scanType =
      status === 'ACCEPTED_TECHNICIAN_ASSIGNED' || status === 'FOLLOW_UP_REQUESTED' ? 'CHECKIN' : 'CHECKOUT';

    if (scanType === 'CHECKIN' && (request.techCountConfirmed == null || request.techCountConfirmed < 1)) {
      throw new Error('Number of technicians (min 1) is required for check-in QR');
    }

    const qrToken = uuidv4();
    const now = new Date();
    const expirationTs = new Date(
      now.getTime() + this.EXPIRATION_MINUTES * 60 * 1000
    );

    const updateWoData: { declaredTechCount?: number } = {};
    if (scanType === 'CHECKIN' && request.techCountConfirmed != null) {
      updateWoData.declaredTechCount = request.techCountConfirmed;
    }

    const wasReturnedToSM = isCheckIn && wo.currentOwnerType === 'INTERNAL';
    const isFollowUpVisit = status === 'FOLLOW_UP_REQUESTED';
    const woUpdateData: {
      declaredTechCount?: number;
      currentOwnerId?: number;
      currentOwnerType?: 'VENDOR';
      currentStatus?: 'ACCEPTED_TECHNICIAN_ASSIGNED';
    } = { ...updateWoData };
    if (wasReturnedToSM && wo.assignedTechnicianId) {
      woUpdateData.currentOwnerId = wo.assignedTechnicianId;
      woUpdateData.currentOwnerType = 'VENDOR';
    }
    // Follow-up: transition WO to ACCEPTED_TECHNICIAN_ASSIGNED so S2 can check in again with this QR
    if (isFollowUpVisit && wo.assignedTechnicianId) {
      woUpdateData.currentOwnerId = wo.assignedTechnicianId;
      woUpdateData.currentOwnerType = 'VENDOR';
      woUpdateData.currentStatus = 'ACCEPTED_TECHNICIAN_ASSIGNED';
    }

    await prisma.$transaction([
      ...(Object.keys(woUpdateData).length > 0
        ? [
            prisma.workOrder.update({
              where: { id: wo.id },
              data: woUpdateData,
            }),
          ]
        : []),
      prisma.qRRecord.create({
        data: {
          woId: request.workOrderId,
          qrToken,
          scanType,
          generatedTs: now,
          expirationTs,
          usedFlag: false,
          techCountConfirmed: request.techCountConfirmed ?? null,
        },
      }),
      prisma.auditLog.create({
        data: {
          entityType: 'WORK_ORDER',
          entityId: wo.id,
          workOrderId: wo.id,
          prevStatus: wo.currentStatus,
          newStatus: wo.currentStatus,
          actionType: 'QR_GENERATED',
          actorType: 'INTERNAL',
          actorId,
          comment: scanType === 'CHECKIN'
            ? `Prijavljeni broj tehničara: ${request.techCountConfirmed}`
            : 'QR kod za odjavu generiran',
        },
      }),
    ]);

    return {
      qrToken,
      expirationTs,
      scanType,
    };
  }

  /**
   * Validate QR code (checks expiry, single-use, work order match).
   * Marks the QR as used on success.
   */
  async validateQR(request: ValidateQRRequest): Promise<ValidateQRResponse> {
    const qr = await prisma.qRRecord.findUnique({
      where: { qrToken: request.qrToken },
    });

    if (!qr) {
      return { valid: false, error: 'QR code not found' };
    }

    if (qr.woId !== request.workOrderId) {
      return { valid: false, error: 'QR code does not match work order' };
    }

    if (qr.usedFlag) {
      return { valid: false, error: 'QR code already used' };
    }

    const now = new Date();
    if (now > qr.expirationTs) {
      return { valid: false, error: 'QR code expired' };
    }

    await prisma.qRRecord.update({
      where: { id: qr.id },
      data: {
        usedFlag: true,
        usedAt: now,
      },
    });

    return {
      valid: true,
      scanType: qr.scanType,
      techCountConfirmed: qr.techCountConfirmed ?? undefined,
    };
  }

  /**
   * Get active (unused, unexpired) QR codes for a work order (for debugging)
   */
  async getActiveQRs(workOrderId: number) {
    return prisma.qRRecord.findMany({
      where: {
        woId: workOrderId,
        usedFlag: false,
        expirationTs: { gt: new Date() },
      },
      orderBy: { generatedTs: 'desc' },
    });
  }
}

export const qrService = new QRService();
