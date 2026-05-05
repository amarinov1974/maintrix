/**
 * Approval Chain Service
 * Handles sequential approval routing based on cost thresholds
 */

import type { InternalRole } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { InternalRoles } from '../../types/roles.js';
import { APPROVAL_THRESHOLDS } from '../../config/approval-thresholds.js';

export interface ApprovalChainConfig {
  ticketId: number;
  estimatedAmount: number;
  currentApproverRole?: string;
}

export interface NextApprover {
  role: string;
  userId: number;
  userName: string;
  isLastApprover: boolean;
}

function decimalToNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value != null && typeof (value as { toNumber: () => number }).toNumber === 'function') {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

export class ApprovalChainService {
  /**
   * Determine approval chain based on cost threshold.
   * Thresholds in `config/approval-thresholds.ts`.
   */
  getRequiredApprovers(amount: number): string[] {
    if (amount <= APPROVAL_THRESHOLDS.AM_MAX) {
      return [InternalRoles.AREA_MANAGER];
    }
    if (amount <= APPROVAL_THRESHOLDS.DIRECTOR_MAX) {
      return [
        InternalRoles.AREA_MANAGER,
        InternalRoles.SALES_DIRECTOR,
        InternalRoles.MAINTENANCE_DIRECTOR,
      ];
    }
    return [
      InternalRoles.AREA_MANAGER,
      InternalRoles.SALES_DIRECTOR,
      InternalRoles.MAINTENANCE_DIRECTOR,
      InternalRoles.BOARD_OF_DIRECTORS,
    ];
  }

  /**
   * Get next approver in chain
   */
  async getNextApprover(config: ApprovalChainConfig): Promise<NextApprover | null> {
    const requiredApprovers = this.getRequiredApprovers(config.estimatedAmount);

    const ticket = await prisma.ticket.findUnique({
      where: { id: config.ticketId },
      include: { store: true },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    let nextRoleIndex = 0;
    if (config.currentApproverRole) {
      const currentIndex = requiredApprovers.indexOf(config.currentApproverRole);
      nextRoleIndex = currentIndex + 1;
    }

    if (nextRoleIndex >= requiredApprovers.length) {
      return null;
    }

    const nextRole = requiredApprovers[nextRoleIndex];

    const approver = await prisma.internalUser.findFirst({
      where: {
        companyId: ticket.companyId,
        role: nextRole as InternalRole,
        active: true,
        ...(nextRole === InternalRoles.AREA_MANAGER
          ? { regionId: ticket.store.regionId }
          : {}),
      },
    });

    if (!approver) {
      throw new Error(`No ${nextRole} found for approval`);
    }

    return {
      role: nextRole,
      userId: approver.id,
      userName: approver.name,
      isLastApprover: nextRoleIndex === requiredApprovers.length - 1,
    };
  }

  /**
   * Check if current user is valid approver for this stage
   */
  async isValidApprover(
    ticketId: number,
    userId: number,
    role: string
  ): Promise<boolean> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { costEstimation: true },
    });

    if (!ticket?.costEstimation) {
      return false;
    }

    if (ticket.currentOwnerUserId !== userId) {
      return false;
    }

    const amount = decimalToNumber(ticket.costEstimation.estimatedAmount);
    const requiredApprovers = this.getRequiredApprovers(amount);

    return requiredApprovers.includes(role);
  }
}

export const approvalChainService = new ApprovalChainService();
