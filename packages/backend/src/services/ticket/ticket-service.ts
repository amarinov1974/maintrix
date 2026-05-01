/**
 * Ticket Service
 * Core ticket lifecycle management
 */

import type { Prisma } from '@prisma/client';
import type { TicketStatus as PrismaTicketStatus, TicketCategory as PrismaTicketCategory } from '@prisma/client';
import { prisma } from '../../config/database.js';
import { validateTransition } from '../../core/state-machine/index.js';
import { TicketStatus, WorkOrderStatus } from '../../types/statuses.js';
import type { TicketStatusType } from '../../types/statuses.js';
import { InternalRoles } from '../../types/roles.js';
import type { Role } from '../../types/roles.js';
import type {
  CreateTicketRequest,
  SubmitTicketRequest,
  RequestClarificationRequest,
  SubmitUpdatedTicketRequest,
  RejectTicketRequest,
  WithdrawTicketRequest,
  AddCommentRequest,
  ListTicketsQuery,
  TicketResponse,
  TicketDetailResponse,
  SubmitCostEstimationRequest,
  ApproveCostEstimationRequest,
  ReturnCostEstimationRequest,
  CreateWorkOrderRequest,
  ArchiveTicketRequest,
  CostEstimationResponse,
} from './types.js';
import { approvalChainService } from '../approval-chain/approval-chain-service.js';
import type { InternalRole } from '@prisma/client';
import { WorkOrderStatus as PrismaWorkOrderStatus } from '@prisma/client';
import { notifyNewOwner } from '../email/email-service.js';

/** Prisma stores enum keys (DRAFT); state machine uses display values (Draft). */
function toOurStatus(prismaStatus: string): TicketStatusType {
  return (TicketStatus as Record<string, TicketStatusType>)[prismaStatus] ?? (prismaStatus as TicketStatusType);
}

function toPrismaStatus(our: TicketStatusType): PrismaTicketStatus {
  const key = Object.entries(TicketStatus).find(([, v]) => v === our)?.[0];
  return (key ?? our) as PrismaTicketStatus;
}

/** Map legacy/short category values to Prisma TicketCategory enum. */
function normalizeTicketCategory(category: unknown): PrismaTicketCategory {
  const s = String(category ?? '').trim().toUpperCase();
  if (s === 'HVAC') return 'HEATING_VENTILATION_AIR_CONDITIONING' as PrismaTicketCategory;
  return (s || 'OTHER') as PrismaTicketCategory;
}

export class TicketService {
  /**
   * Governance: ticket owner must NOT change during work order execution.
   * When status is Work Order In Progress, only ARCHIVE (owner → null) is allowed.
   */
  private guardNoTicketOwnerChangeDuringWorkOrderExecution(
    ticket: { currentStatus: string; currentOwnerUserId: number | null },
    newOwnerUserId: number | null
  ): void {
    if (toOurStatus(ticket.currentStatus) !== TicketStatus.WORK_ORDER_IN_PROGRESS) return;
    if (newOwnerUserId === null) return; // archiving is allowed
    if (newOwnerUserId === ticket.currentOwnerUserId) return;
    throw new Error(
      'Ticket has work orders in progress; ownership cannot be changed until all work orders are terminal.'
    );
  }

  /**
   * Create a new ticket (Draft status).
   * SM: store fixed to their store. AMM: storeId required, must be in AMM's region.
   */
  async createTicket(
    request: CreateTicketRequest,
    userId: number,
    role: Role
  ): Promise<TicketResponse> {
    if (role !== InternalRoles.STORE_MANAGER && role !== InternalRoles.AREA_MAINTENANCE_MANAGER) {
      throw new Error('Only Store Managers and Area Maintenance Managers can create tickets');
    }

    const user = await prisma.internalUser.findUnique({
      where: { id: userId },
      include: { store: true, region: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const requestedStoreId = Number(request.storeId);
    if (Number.isNaN(requestedStoreId)) {
      throw new Error('Invalid store');
    }

    let companyId: number;
    let storeId: number;

    if (role === InternalRoles.STORE_MANAGER) {
      if (user.storeId == null) {
        throw new Error('Store Manager must be assigned to a store');
      }
      if (requestedStoreId !== user.storeId) {
        throw new Error('Store Manager can only create tickets for their own store');
      }
      companyId = user.companyId;
      storeId = user.storeId;
    } else {
      if (user.regionId == null) {
        throw new Error('AMM must be assigned to a region');
      }
      const store = await prisma.store.findFirst({
        where: { id: requestedStoreId, regionId: user.regionId },
        include: { company: true },
      });
      if (!store) {
        throw new Error('Store not found or not in your region');
      }
      companyId = store.companyId;
      storeId = store.id;
    }

    const category = normalizeTicketCategory(request.category);

    const baseData = {
      companyId,
      storeId,
      createdByUserId: userId,
      category,
      description: request.description,
      urgent: request.urgent,
      currentStatus: toPrismaStatus(TicketStatus.DRAFT),
      currentOwnerUserId: userId,
      assetId: request.assetId,
    };

    let ticket: Awaited<ReturnType<typeof prisma.ticket.create>>;
    try {
      ticket = await prisma.ticket.create({
        data: { ...baseData, originalDescription: request.description },
        include: {
          store: true,
          createdBy: true,
          currentOwner: true,
          asset: true,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('originalDescription') || msg.includes('original_description')) {
        ticket = await prisma.ticket.create({
          data: baseData,
          include: {
            store: true,
            createdBy: true,
            currentOwner: true,
            asset: true,
          },
        });
      } else {
        throw err;
      }
    }

    await prisma.auditLog.create({
      data: {
        entityType: 'TICKET',
        entityId: ticket.id,
        ticketId: ticket.id,
        prevStatus: null,
        newStatus: TicketStatus.DRAFT,
        actionType: 'CREATE',
        actorType: 'INTERNAL',
        actorId: userId,
      },
    });

    return this.mapTicketToResponse(ticket);
  }

  /**
   * Submit ticket (Draft → Submitted)
   */
  async submitTicket(
    request: SubmitTicketRequest,
    userId: number,
    role: Role
  ): Promise<TicketResponse> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: request.ticketId },
      include: { store: { include: { region: true } } },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const validation = await validateTransition({
      entityType: 'TICKET',
      entityId: ticket.id,
      currentStatus: toOurStatus(ticket.currentStatus),
      currentOwnerId: ticket.currentOwnerUserId,
      action: 'SUBMIT',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    let newOwnerId: number;
    if (ticket.urgent) {
      const amm = await prisma.internalUser.findFirst({
        where: {
          companyId: ticket.companyId,
          regionId: ticket.store.regionId,
          role: InternalRoles.AREA_MAINTENANCE_MANAGER,
          active: true,
        },
      });
      if (!amm) {
        throw new Error('No Area Maintenance Manager found for this region');
      }
      newOwnerId = amm.id;
    } else {
      const am = await prisma.internalUser.findFirst({
        where: {
          companyId: ticket.companyId,
          regionId: ticket.store.regionId,
          role: InternalRoles.AREA_MANAGER,
          active: true,
        },
      });
      if (!am) {
        throw new Error('No Area Manager found for this region');
      }
      newOwnerId = am.id;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as TicketStatusType),
        currentOwnerUserId: newOwnerId,
      },
      include: {
        store: true,
        createdBy: true,
        currentOwner: true,
        asset: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'TICKET',
        entityId: ticket.id,
        ticketId: ticket.id,
        prevStatus: ticket.currentStatus,
        newStatus: validation.newStatus!,
        actionType: 'SUBMIT',
        actorType: 'INTERNAL',
        actorId: userId,
        comment: ticket.urgent ? 'Routed to AMM (urgent)' : 'Routed to AM (non-urgent)',
      },
    });
    await notifyNewOwner({
      entityType: 'TICKET',
      entityId: ticket.id,
      newOwnerId: newOwnerId,
      ownerType: 'INTERNAL',
      context: 'Tiket je podnesen i dodijeljen vama na pregled',
    });

    return this.mapTicketToResponse(updated);
  }

  /**
   * Resolve assignToRole (SM, AM, AMM, D, C2, BOD) to a single internal user ID for the ticket's context.
   */
  private async resolveAssignToRoleToUserId(
    ticket: { companyId: number; store: { regionId: number }; createdByUserId: number; createdBy: { role: string } },
    assignToRole: string
  ): Promise<number> {
    const role = assignToRole.trim().toUpperCase();
    const companyId = ticket.companyId;
    const regionId = ticket.store.regionId;

    if (role === InternalRoles.STORE_MANAGER || role === 'SM') {
      return ticket.createdByUserId;
    }
    if (role === InternalRoles.AREA_MANAGER || role === 'AM') {
      const user = await prisma.internalUser.findFirst({
        where: { companyId, regionId, role: InternalRoles.AREA_MANAGER as InternalRole, active: true },
      });
      if (!user) throw new Error('No Area Manager found for this ticket\'s region');
      return user.id;
    }
    if (role === InternalRoles.AREA_MAINTENANCE_MANAGER || role === 'AMM') {
      const user = await prisma.internalUser.findFirst({
        where: { companyId, regionId, role: InternalRoles.AREA_MAINTENANCE_MANAGER as InternalRole, active: true },
      });
      if (!user) throw new Error('No Area Maintenance Manager found for this ticket\'s region');
      return user.id;
    }
    if (role === InternalRoles.SALES_DIRECTOR || role === 'D' || role === InternalRoles.MAINTENANCE_DIRECTOR || role === 'C2' || role === InternalRoles.BOARD_OF_DIRECTORS || role === 'BOD') {
      const roleEnum = (role === 'D' ? InternalRoles.SALES_DIRECTOR : role === 'C2' ? InternalRoles.MAINTENANCE_DIRECTOR : role === 'BOD' ? InternalRoles.BOARD_OF_DIRECTORS : role) as InternalRole;
      const user = await prisma.internalUser.findFirst({
        where: { companyId, role: roleEnum, active: true },
      });
      if (!user) throw new Error(`No user with role ${role} found for this company`);
      return user.id;
    }
    throw new Error(`Unknown or unsupported assignToRole: ${assignToRole}`);
  }

  /**
   * Request clarification: current owner sends ticket to a chosen involved role.
   * When the assignee submits the updated ticket, it goes back to the requester (clarificationRequestedByUserId).
   */
  async requestClarification(
    request: RequestClarificationRequest,
    userId: number,
    role: Role
  ): Promise<TicketResponse> {
    const comment = typeof request.comment === 'string' ? request.comment.trim() : '';
    if (!comment) {
      throw new Error('Clarification comment is required');
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: request.ticketId },
      include: {
        createdBy: true,
        store: { include: { region: true } },
      },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const validation = await validateTransition({
      entityType: 'TICKET',
      entityId: ticket.id,
      currentStatus: toOurStatus(ticket.currentStatus),
      currentOwnerId: ticket.currentOwnerUserId,
      action: 'REQUEST_CLARIFICATION',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    const assignToRole = (request.assignToRole?.trim() || InternalRoles.STORE_MANAGER).toUpperCase();
    const assignToUserId = await this.resolveAssignToRoleToUserId(
      ticket as { companyId: number; store: { regionId: number }; createdByUserId: number; createdBy: { role: string } },
      assignToRole
    );

    this.guardNoTicketOwnerChangeDuringWorkOrderExecution(ticket, assignToUserId);

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as TicketStatusType),
        currentOwnerUserId: assignToUserId,
        clarificationRequestedByUserId: userId,
      },
      include: {
        store: true,
        createdBy: true,
        currentOwner: true,
        asset: true,
      },
    });

    await prisma.ticketComment.create({
      data: {
        ticketId: ticket.id,
        authorUserId: userId,
        text: comment,
        internalFlag: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'TICKET',
        entityId: ticket.id,
        ticketId: ticket.id,
        prevStatus: ticket.currentStatus,
        newStatus: validation.newStatus!,
        actionType: 'REQUEST_CLARIFICATION',
        actorType: 'INTERNAL',
        actorId: userId,
        comment,
      },
    });
    await notifyNewOwner({
      entityType: 'TICKET',
      entityId: ticket.id,
      newOwnerId: assignToUserId,
      ownerType: 'INTERNAL',
      context: 'Zatraženo pojašnjenje — tiket je dodijeljen vama',
    });

    return this.mapTicketToResponse(updated);
  }

  /**
   * Submit updated ticket (creator/assignee → back to whoever requested clarification).
   * If clarificationRequestedByUserId is set, ticket goes to that user; otherwise fallback to urgent→AMM, non-urgent→AM.
   * Multiple clarification rounds are allowed: there is no limit on how many times SM (or other assignee) can submit.
   */
  async submitUpdatedTicket(
    request: SubmitUpdatedTicketRequest,
    userId: number,
    role: Role
  ): Promise<TicketResponse> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: request.ticketId },
      include: { store: { include: { region: true } } },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Only the current owner can submit (creator SM when ticket is with SM; only involved parties exchange).
    const validation = await validateTransition({
      entityType: 'TICKET',
      entityId: ticket.id,
      currentStatus: toOurStatus(ticket.currentStatus),
      currentOwnerId: ticket.currentOwnerUserId,
      action: 'SUBMIT_UPDATED',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      const err = validation.error ?? 'Transition not allowed';
      if (
        validation.errorCode === 'NOT_OWNER' &&
        toOurStatus(ticket.currentStatus) === TicketStatus.AWAITING_CREATOR_RESPONSE
      ) {
        throw new Error('Only the ticket creator (Store Manager who created this ticket) can submit the clarification response.');
      }
      throw new Error(err);
    }

    let newOwner: { id: number; role: string } | null = null;
    if (ticket.clarificationRequestedByUserId != null) {
      const requester = await prisma.internalUser.findFirst({
        where: { id: ticket.clarificationRequestedByUserId, active: true },
        select: { id: true, role: true },
      });
      if (requester) newOwner = requester;
    }
    if (!newOwner) {
      const regionId = ticket.store.regionId;
      const companyId = ticket.companyId;
      if (ticket.urgent) {
        const amm = await prisma.internalUser.findFirst({
          where: {
            companyId,
            regionId,
            role: InternalRoles.AREA_MAINTENANCE_MANAGER as InternalRole,
            active: true,
          },
          select: { id: true, role: true },
        });
        newOwner = amm;
      } else {
        const am = await prisma.internalUser.findFirst({
          where: {
            companyId,
            regionId,
            role: InternalRoles.AREA_MANAGER as InternalRole,
            active: true,
          },
          select: { id: true, role: true },
        });
        newOwner = am;
      }
    }
    if (!newOwner) {
      throw new Error(ticket.urgent ? 'No Area Maintenance Manager found' : 'No Area Manager found');
    }

    this.guardNoTicketOwnerChangeDuringWorkOrderExecution(ticket, newOwner.id);

    // Urgent: never use "Cost Estimation Needed" — AMM has green light to create WO, request clarification, or reject. Use Updated Ticket Submitted.
    // Non-urgent + AMM: Cost Estimation Needed. AM: validation.newStatus (Updated Ticket Submitted).
    const effectiveStatus =
      newOwner.role === InternalRoles.AREA_MAINTENANCE_MANAGER
        ? (ticket.urgent ? TicketStatus.UPDATED_SUBMITTED : TicketStatus.COST_ESTIMATION_NEEDED)
        : (validation.newStatus! as TicketStatusType);

    const updateData: { currentStatus: any; currentOwnerUserId: number; description: string; clarificationRequestedByUserId?: null; assetId?: number } = {
      currentStatus: toPrismaStatus(effectiveStatus),
      currentOwnerUserId: newOwner.id,
      description: request.updatedDescription ?? ticket.description,
      clarificationRequestedByUserId: null, // clear after routing back to requester
    };
    if (request.assetId != null && ticket.assetId == null) {
      updateData.assetId = request.assetId;
    }
    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: updateData,
      include: {
        store: true,
        createdBy: true,
        currentOwner: true,
        asset: true,
      },
    });

    if (request.comment) {
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorUserId: userId,
          text: request.comment,
          internalFlag: true,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        entityType: 'TICKET',
        entityId: ticket.id,
        ticketId: ticket.id,
        prevStatus: ticket.currentStatus,
        newStatus: effectiveStatus,
        actionType: 'SUBMIT_UPDATED',
        actorType: 'INTERNAL',
        actorId: userId,
        comment: request.comment,
      },
    });
    await notifyNewOwner({
      entityType: 'TICKET',
      entityId: ticket.id,
      newOwnerId: newOwner.id,
      ownerType: 'INTERNAL',
      context: 'Ažurirani tiket je dodijeljen vama na pregled',
    });

    return this.mapTicketToResponse(updated);
  }

  /**
   * Approve ticket for estimation (AM → AMM)
   * Non-urgent submitted tickets only.
   */
  async approveForEstimation(
    ticketId: number,
    userId: number,
    role: Role
  ): Promise<TicketResponse> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { store: { include: { region: true } } },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const validation = await validateTransition({
      entityType: 'TICKET',
      entityId: ticket.id,
      currentStatus: toOurStatus(ticket.currentStatus),
      currentOwnerId: ticket.currentOwnerUserId,
      action: 'APPROVE_FOR_ESTIMATION',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    const amm = await prisma.internalUser.findFirst({
      where: {
        companyId: ticket.companyId,
        regionId: ticket.store.regionId,
        role: InternalRoles.AREA_MAINTENANCE_MANAGER,
        active: true,
      },
    });

    if (!amm) {
      throw new Error('No Area Maintenance Manager found for this region');
    }

    this.guardNoTicketOwnerChangeDuringWorkOrderExecution(ticket, amm.id);

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        currentStatus: toPrismaStatus(
          validation.newStatus! as TicketStatusType
        ),
        currentOwnerUserId: amm.id,
      },
      include: {
        store: true,
        createdBy: true,
        currentOwner: true,
        asset: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'TICKET',
        entityId: ticket.id,
        ticketId: ticket.id,
        prevStatus: ticket.currentStatus,
        newStatus: validation.newStatus!,
        actionType: 'APPROVE_FOR_ESTIMATION',
        actorType: 'INTERNAL',
        actorId: userId,
        comment: 'Approved for cost estimation',
      },
    });
    await notifyNewOwner({
      entityType: 'TICKET',
      entityId: ticket.id,
      newOwnerId: amm.id,
      ownerType: 'INTERNAL',
      context: 'Tiket je odobren za procjenu troška',
    });

    return this.mapTicketToResponse(updated);
  }

  /**
   * Reject ticket (AMM or AM)
   */
  async rejectTicket(
    request: RejectTicketRequest,
    userId: number,
    role: Role
  ): Promise<TicketResponse> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: request.ticketId },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const validation = await validateTransition({
      entityType: 'TICKET',
      entityId: ticket.id,
      currentStatus: toOurStatus(ticket.currentStatus),
      currentOwnerId: ticket.currentOwnerUserId,
      action: 'REJECT',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as TicketStatusType),
        currentOwnerUserId: null,
      },
      include: {
        store: true,
        createdBy: true,
        currentOwner: true,
        asset: true,
      },
    });

    await prisma.ticketComment.create({
      data: {
        ticketId: ticket.id,
        authorUserId: userId,
        text: `Rejection reason: ${request.reason}`,
        internalFlag: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'TICKET',
        entityId: ticket.id,
        ticketId: ticket.id,
        prevStatus: ticket.currentStatus,
        newStatus: validation.newStatus!,
        actionType: 'REJECT',
        actorType: 'INTERNAL',
        actorId: userId,
        comment: request.reason,
      },
    });

    return this.mapTicketToResponse(updated);
  }

  /**
   * Withdraw ticket (SM)
   */
  async withdrawTicket(
    request: WithdrawTicketRequest,
    userId: number,
    role: Role
  ): Promise<TicketResponse> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: request.ticketId },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const validation = await validateTransition({
      entityType: 'TICKET',
      entityId: ticket.id,
      currentStatus: toOurStatus(ticket.currentStatus),
      currentOwnerId: ticket.currentOwnerUserId,
      action: 'WITHDRAW',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as TicketStatusType),
        currentOwnerUserId: null,
      },
      include: {
        store: true,
        createdBy: true,
        currentOwner: true,
        asset: true,
      },
    });

    if (request.reason) {
      await prisma.ticketComment.create({
        data: {
          ticketId: ticket.id,
          authorUserId: userId,
          text: `Withdrawal reason: ${request.reason}`,
          internalFlag: true,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        entityType: 'TICKET',
        entityId: ticket.id,
        ticketId: ticket.id,
        prevStatus: ticket.currentStatus,
        newStatus: validation.newStatus!,
        actionType: 'WITHDRAW',
        actorType: 'INTERNAL',
        actorId: userId,
        comment: request.reason,
      },
    });

    return this.mapTicketToResponse(updated);
  }

  /**
   * Add comment to ticket
   */
  async addComment(request: AddCommentRequest, userId: number): Promise<void> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: request.ticketId },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    await prisma.ticketComment.create({
      data: {
        ticketId: request.ticketId,
        authorUserId: userId,
        text: request.text,
        internalFlag: request.internalFlag ?? true,
      },
    });
  }

  /**
   * Get ticket by ID
   */
  async getTicket(ticketId: number, _userId: number, companyId?: number): Promise<TicketDetailResponse> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId, ...(companyId != null ? { companyId } : {}) },
      include: {
        store: true,
        createdBy: true,
        currentOwner: true,
        asset: true,
        attachments: { orderBy: { createdAt: 'asc' } },
        comments: {
          include: { author: true },
          orderBy: { createdAt: 'asc' },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        costEstimation: true,
        approvalRecords: {
          include: { approver: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const response = this.mapTicketToResponse(ticket) as TicketDetailResponse;

    response.createdByUserRole = (ticket.createdBy as { role?: string })?.role ?? null;
    response.currentOwnerUserRole = (ticket.currentOwner as { role?: string })?.role ?? null;
    response.originalDescription = ticket.originalDescription ?? ticket.description;

    if (ticket.clarificationRequestedByUserId != null) {
      const requester = await prisma.internalUser.findUnique({
        where: { id: ticket.clarificationRequestedByUserId },
        select: { id: true, name: true, role: true },
      });
      if (requester) {
        response.clarificationRequestedByUserId = requester.id;
        response.clarificationRequestedByUserName = requester.name;
        response.clarificationRequestedByUserRole = requester.role;
      }
    }

    response.involvedInternalRoles = []; // populated below after we load internal users for audit log
    const submitEntry = ticket.auditLogs.find((a) => a.actionType === 'SUBMIT');
    response.submittedAt = submitEntry?.createdAt ?? (toOurStatus(ticket.currentStatus) !== TicketStatus.DRAFT ? ticket.createdAt : null);

    response.comments = ticket.comments.map((c) => ({
      id: c.id,
      authorUserId: c.authorUserId,
      authorUserName: c.author.name,
      text: c.text,
      internalFlag: c.internalFlag,
      createdAt: c.createdAt,
    }));

    const internalActorIds = [...new Set(ticket.auditLogs.filter((a) => a.actorType === 'INTERNAL').map((a) => a.actorId))];
    const vendorActorIds = [...new Set(ticket.auditLogs.filter((a) => a.actorType === 'VENDOR').map((a) => a.actorId))];
    const internalUsers = internalActorIds.length > 0 ? await prisma.internalUser.findMany({ where: { id: { in: internalActorIds } }, select: { id: true, name: true, role: true } }) : [];
    const vendorUsers = vendorActorIds.length > 0 ? await prisma.vendorUser.findMany({ where: { id: { in: vendorActorIds } }, select: { id: true, name: true, role: true } }) : [];
    const internalMap = new Map(internalUsers.map((u) => [u.id, { name: u.name, role: u.role }]));
    const vendorMap = new Map(vendorUsers.map((u) => [u.id, { name: u.name, role: u.role }]));

    const involvedRoles = new Set<string>();
    const creatorRole = (ticket.createdBy as { role?: string })?.role;
    if (creatorRole) involvedRoles.add(creatorRole);
    internalUsers.forEach((u) => involvedRoles.add(u.role));
    response.involvedInternalRoles = [...involvedRoles].filter(Boolean).sort();

    response.auditLog = ticket.auditLogs.map((a) => {
      const info = a.actorType === 'INTERNAL' ? internalMap.get(a.actorId) : vendorMap.get(a.actorId);
      return {
        id: a.id,
        prevStatus: a.prevStatus,
        newStatus: a.newStatus,
        actionType: a.actionType,
        actorId: a.actorId,
        actorName: info?.name ?? 'Unknown',
        actorRole: info?.role ?? null,
        comment: a.comment,
        createdAt: a.createdAt,
      };
    });

    response.attachments = (ticket.attachments ?? []).map((att) => ({
      id: att.id,
      fileName: att.fileName,
      createdAt: att.createdAt,
      internalFlag: att.internalFlag,
    }));

    if (ticket.costEstimation) {
      const createdBy = await prisma.internalUser.findUnique({
        where: { id: ticket.costEstimation.createdByUserId },
      });
      response.costEstimation = {
        ticketId: ticket.costEstimation.ticketId,
        estimatedAmount: Number(ticket.costEstimation.estimatedAmount),
        createdByUserId: ticket.costEstimation.createdByUserId,
        createdByUserName: createdBy?.name ?? 'Unknown',
        createdAt: ticket.costEstimation.createdAt,
      };
    }

    if (ticket.approvalRecords.length > 0) {
      response.approvalRecords = ticket.approvalRecords.map((r) => ({
        id: r.id,
        approverUserId: r.approverUserId,
        approverUserName: r.approver.name,
        role: r.role,
        decision: r.decision,
        comment: r.comment,
        createdAt: r.createdAt,
      }));
    }

    return response;
  }

  /**
   * List tickets with filters
   */
  async listTickets(query: ListTicketsQuery & { companyId?: number }): Promise<TicketResponse[]> {
    const where: Prisma.TicketWhereInput = {};
    if (query.companyId != null) where.companyId = query.companyId;
    if (query.status != null) where.currentStatus = toPrismaStatus(query.status);
    if (query.urgent != null) where.urgent = query.urgent;
    if (query.storeId != null) where.storeId = query.storeId;
    if (query.regionId != null) where.store = { regionId: query.regionId };
    if (query.createdByUserId != null) where.createdByUserId = query.createdByUserId;
    if (query.currentOwnerUserId != null) where.currentOwnerUserId = query.currentOwnerUserId;

    if (query.participatedByUserId != null) {
      const pid = query.participatedByUserId;
      where.AND = [
        { NOT: { currentOwnerUserId: pid } },
        {
          OR: [
            { createdByUserId: pid },
            { auditLogs: { some: { actorType: 'INTERNAL', actorId: pid } } },
          ],
        },
      ];
    }

    const tickets = await prisma.ticket.findMany({
      where,
      include: {
        store: true,
        createdBy: true,
        currentOwner: true,
        asset: true,
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 50,
      skip: query.offset ?? 0,
    });

    return tickets.map((t) => this.mapTicketToResponse(t));
  }

  /**
   * Submit cost estimation (AMM enters amount)
   */
  async submitCostEstimation(
    request: SubmitCostEstimationRequest,
    userId: number,
    role: Role
  ): Promise<CostEstimationResponse> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: request.ticketId },
      include: { store: { include: { region: true } } },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const validation = await validateTransition({
      entityType: 'TICKET',
      entityId: ticket.id,
      currentStatus: toOurStatus(ticket.currentStatus),
      currentOwnerId: ticket.currentOwnerUserId,
      action: 'REQUEST_APPROVAL',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Transition not allowed');
    }

    const createdBy = await prisma.internalUser.findUnique({
      where: { id: userId },
    });

    const costEstimation = await prisma.costEstimation.upsert({
      where: { ticketId: ticket.id },
      create: {
        ticketId: ticket.id,
        estimatedAmount: request.estimatedAmount,
        createdByUserId: userId,
      },
      update: {
        estimatedAmount: request.estimatedAmount,
        createdByUserId: userId,
      },
    });

    const nextApprover = await approvalChainService.getNextApprover({
      ticketId: ticket.id,
      estimatedAmount: request.estimatedAmount,
    });

    if (!nextApprover) {
      throw new Error('Could not determine next approver');
    }

    this.guardNoTicketOwnerChangeDuringWorkOrderExecution(ticket, nextApprover.userId);

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as TicketStatusType),
        currentOwnerUserId: nextApprover.userId,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'TICKET',
        entityId: ticket.id,
        ticketId: ticket.id,
        prevStatus: ticket.currentStatus,
        newStatus: validation.newStatus! as string,
        actionType: 'REQUEST_APPROVAL',
        actorType: 'INTERNAL',
        actorId: userId,
        comment: `Cost estimation: €${request.estimatedAmount}`,
      },
    });
    await notifyNewOwner({
      entityType: 'TICKET',
      entityId: ticket.id,
      newOwnerId: nextApprover.userId,
      ownerType: 'INTERNAL',
      context: 'Procjena troška čeka vaše odobrenje',
    });

    return {
      ticketId: ticket.id,
      estimatedAmount: request.estimatedAmount,
      createdByUserId: userId,
      createdByUserName: createdBy?.name ?? 'AMM',
      createdAt: costEstimation.createdAt,
      approvalChain: [],
    };
  }

  /**
   * Approve cost estimation (sequential approver)
   */
  async approveCostEstimation(
    request: ApproveCostEstimationRequest,
    userId: number,
    role: Role
  ): Promise<TicketResponse> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: request.ticketId },
      include: {
        costEstimation: true,
        store: { include: { region: true } },
      },
    });

    if (!ticket?.costEstimation) {
      throw new Error('Ticket or cost estimation not found');
    }

    const isValid = await approvalChainService.isValidApprover(
      ticket.id,
      userId,
      role
    );

    if (!isValid) {
      throw new Error('User is not a valid approver for this stage');
    }

    const amount =
      typeof ticket.costEstimation.estimatedAmount === 'number'
        ? ticket.costEstimation.estimatedAmount
        : Number(ticket.costEstimation.estimatedAmount);

    await prisma.approvalRecord.create({
      data: {
        ticketId: ticket.id,
        approverUserId: userId,
        role: role as InternalRole,
        decision: 'APPROVED',
        comment: request.comment,
      },
    });

    const nextApprover = await approvalChainService.getNextApprover({
      ticketId: ticket.id,
      estimatedAmount: amount,
      currentApproverRole: role,
    });

    let newStatusOur: TicketStatusType;
    let newOwnerId: number | null;
    let action: string;

    if (nextApprover) {
      newStatusOur = TicketStatus.COST_ESTIMATION_APPROVAL_NEEDED;
      newOwnerId = nextApprover.userId;
      action = 'ESCALATE';

      const validation = await validateTransition({
        entityType: 'TICKET',
        entityId: ticket.id,
        currentStatus: toOurStatus(ticket.currentStatus),
        currentOwnerId: ticket.currentOwnerUserId,
        action: 'ESCALATE',
        actorId: userId,
        actorRole: role,
      });

      if (!validation.allowed) {
        throw new Error(validation.error ?? 'Escalation not allowed');
      }
    } else {
      action = 'APPROVE';

      const validation = await validateTransition({
        entityType: 'TICKET',
        entityId: ticket.id,
        currentStatus: toOurStatus(ticket.currentStatus),
        currentOwnerId: ticket.currentOwnerUserId,
        action: 'APPROVE',
        actorId: userId,
        actorRole: role,
      });

      if (!validation.allowed) {
        throw new Error(validation.error ?? 'Approval not allowed');
      }

      newStatusOur = validation.newStatus! as TicketStatusType;

      const amm = await prisma.internalUser.findFirst({
        where: {
          companyId: ticket.companyId,
          regionId: ticket.store.regionId,
          role: InternalRoles.AREA_MAINTENANCE_MANAGER,
          active: true,
        },
      });

      if (!amm) {
        throw new Error('AMM not found');
      }

      newOwnerId = amm.id;
    }

    this.guardNoTicketOwnerChangeDuringWorkOrderExecution(ticket, newOwnerId);

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        currentStatus: toPrismaStatus(newStatusOur),
        currentOwnerUserId: newOwnerId,
      },
      include: {
        store: true,
        createdBy: true,
        currentOwner: true,
        asset: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'TICKET',
        entityId: ticket.id,
        ticketId: ticket.id,
        prevStatus: ticket.currentStatus,
        newStatus: newStatusOur,
        actionType: action,
        actorType: 'INTERNAL',
        actorId: userId,
        comment: request.comment ?? `${role} approved`,
      },
    });
    await notifyNewOwner({
      entityType: 'TICKET',
      entityId: ticket.id,
      newOwnerId: newOwnerId!,
      ownerType: 'INTERNAL',
      context: 'Procjena troška je odobrena',
    });

    return this.mapTicketToResponse(updated);
  }

  /**
   * Return cost estimation (any approver sends back to AMM)
   */
  async returnCostEstimation(
    request: ReturnCostEstimationRequest,
    userId: number,
    role: Role
  ): Promise<TicketResponse> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: request.ticketId },
      include: { store: { include: { region: true } } },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const validation = await validateTransition({
      entityType: 'TICKET',
      entityId: ticket.id,
      currentStatus: toOurStatus(ticket.currentStatus),
      currentOwnerId: ticket.currentOwnerUserId,
      action: 'RETURN',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Return not allowed');
    }

    await prisma.approvalRecord.create({
      data: {
        ticketId: ticket.id,
        approverUserId: userId,
        role: role as InternalRole,
        decision: 'RETURNED',
        comment: request.comment,
      },
    });

    const amm = await prisma.internalUser.findFirst({
      where: {
        companyId: ticket.companyId,
        regionId: ticket.store.regionId,
        role: InternalRoles.AREA_MAINTENANCE_MANAGER,
        active: true,
      },
    });

    if (!amm) {
      throw new Error('AMM not found');
    }

    this.guardNoTicketOwnerChangeDuringWorkOrderExecution(ticket, amm.id);

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as TicketStatusType),
        currentOwnerUserId: amm.id,
      },
      include: {
        store: true,
        createdBy: true,
        currentOwner: true,
        asset: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'TICKET',
        entityId: ticket.id,
        ticketId: ticket.id,
        prevStatus: ticket.currentStatus,
        newStatus: validation.newStatus! as string,
        actionType: 'RETURN',
        actorType: 'INTERNAL',
        actorId: userId,
        comment: request.comment,
      },
    });
    await notifyNewOwner({
      entityType: 'TICKET',
      entityId: ticket.id,
      newOwnerId: amm.id,
      ownerType: 'INTERNAL',
      context: 'Procjena troška je vraćena na reviziju',
    });

    return this.mapTicketToResponse(updated);
  }

  /**
   * Create work order for ticket
   */
  async createWorkOrder(
    request: CreateWorkOrderRequest,
    userId: number,
    role: Role
  ): Promise<{ workOrderId: number }> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: request.ticketId },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const roleNorm = String(role ?? '').trim().toUpperCase();
    if (
      Number(ticket.currentOwnerUserId) !== Number(userId) ||
      roleNorm !== (InternalRoles.AREA_MAINTENANCE_MANAGER as string)
    ) {
      throw new Error('Only AMM can create work orders');
    }

    const allowedForUrgent = [
      'SUBMITTED',
      'UPDATED_SUBMITTED',
      'COST_ESTIMATION_NEEDED',
      'WORK_ORDER_IN_PROGRESS',
    ] as const;
    const allowedForNonUrgent = [
      'COST_ESTIMATION_APPROVED',
      'WORK_ORDER_IN_PROGRESS',
    ] as const;
    const statusOk = ticket.urgent
      ? allowedForUrgent.includes(ticket.currentStatus as (typeof allowedForUrgent)[number])
      : allowedForNonUrgent.includes(ticket.currentStatus as (typeof allowedForNonUrgent)[number]);
    if (!statusOk) {
      throw new Error(
        ticket.urgent
          ? 'Urgent ticket must be submitted, updated, or cost estimation needed to create work order'
          : 'Ticket must be cost approved or work order in progress to create work order'
      );
    }

    const s1 = await prisma.vendorUser.findFirst({
      where: {
        vendorCompanyId: request.vendorCompanyId,
        role: 'S1',
        active: true,
      },
    });

    if (!s1) {
      throw new Error('Vendor Service Admin not found');
    }

    const workOrder = await prisma.workOrder.create({
      data: {
        ticketId: ticket.id,
        vendorCompanyId: request.vendorCompanyId,
        currentStatus: PrismaWorkOrderStatus.CREATED,
        currentOwnerType: 'VENDOR',
        currentOwnerId: s1.id,
        assetId: ticket.assetId,
        commentToVendor: request.description ?? null,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'WORK_ORDER',
        entityId: workOrder.id,
        workOrderId: workOrder.id,
        prevStatus: null,
        newStatus: WorkOrderStatus.CREATED,
        actionType: 'CREATE',
        actorType: 'INTERNAL',
        actorId: userId,
        comment: request.description,
      },
    });

    // Governance: ticket status becomes Work Order In Progress; owner stays AMM (no update to currentOwnerUserId).
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        currentStatus: toPrismaStatus(TicketStatus.WORK_ORDER_IN_PROGRESS),
      },
    });
    await notifyNewOwner({
      entityType: 'WORK_ORDER',
      entityId: workOrder.id,
      newOwnerId: s1.id,
      ownerType: 'VENDOR',
      context: 'Novi radni nalog je kreiran i dodijeljen vama',
    });

    return { workOrderId: workOrder.id };
  }

  /**
   * Archive ticket (when all work orders complete)
   */
  async archiveTicket(
    request: ArchiveTicketRequest,
    userId: number,
    role: Role
  ): Promise<TicketResponse> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: request.ticketId },
      include: { workOrders: true },
    });

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    const terminalStatuses: PrismaWorkOrderStatus[] = [
      PrismaWorkOrderStatus.COST_PROPOSAL_APPROVED,
      PrismaWorkOrderStatus.CLOSED_WITHOUT_COST,
      PrismaWorkOrderStatus.REJECTED,
    ];
    if (ticket.workOrders.length === 0) {
      throw new Error('Cannot archive: ticket has no work orders. Use REJECT to close a ticket without work.');
    }
    const allComplete = ticket.workOrders.every((wo) =>
      terminalStatuses.includes(wo.currentStatus)
    );

    if (!allComplete) {
      throw new Error('Cannot archive: not all work orders are complete');
    }

    const validation = await validateTransition({
      entityType: 'TICKET',
      entityId: ticket.id,
      currentStatus: toOurStatus(ticket.currentStatus),
      currentOwnerId: ticket.currentOwnerUserId,
      action: 'ARCHIVE',
      actorId: userId,
      actorRole: role,
    });

    if (!validation.allowed) {
      throw new Error(validation.error ?? 'Archive not allowed');
    }

    const updated = await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as TicketStatusType),
        currentOwnerUserId: null,
        archived: true,
      },
      include: {
        store: true,
        createdBy: true,
        currentOwner: true,
        asset: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'TICKET',
        entityId: ticket.id,
        ticketId: ticket.id,
        prevStatus: ticket.currentStatus,
        newStatus: validation.newStatus! as string,
        actionType: 'ARCHIVE',
        actorType: 'INTERNAL',
        actorId: userId,
      },
    });

    return this.mapTicketToResponse(updated);
  }

  /**
   * If the ticket has at least one work order and all are in a terminal status,
   * and the ticket is in a state that allows ARCHIVE, archive it automatically.
   * Called after a work order is completed (e.g. cost approved, closed without cost, rejected).
   */
  async tryAutoArchiveTicketIfAllWorkOrdersComplete(ticketId: number): Promise<void> {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { workOrders: true, store: { select: { regionId: true } } },
    });

    if (!ticket || ticket.workOrders.length === 0) {
      return;
    }

    if (toOurStatus(ticket.currentStatus) === TicketStatus.ARCHIVED || ticket.archived) {
      return;
    }

    const terminalWoStatuses: PrismaWorkOrderStatus[] = [
      PrismaWorkOrderStatus.COST_PROPOSAL_APPROVED,
      PrismaWorkOrderStatus.CLOSED_WITHOUT_COST,
      PrismaWorkOrderStatus.REJECTED,
    ];
    const allComplete = ticket.workOrders.every((wo) =>
      terminalWoStatuses.includes(wo.currentStatus)
    );
    if (!allComplete) {
      return;
    }

    const archivableStatuses: TicketStatusType[] = [
      TicketStatus.COST_ESTIMATION_APPROVED,
      TicketStatus.SUBMITTED,
      TicketStatus.WORK_ORDER_IN_PROGRESS,
    ];
    const currentStatusOur = toOurStatus(ticket.currentStatus);
    if (!archivableStatuses.includes(currentStatusOur)) {
      return;
    }

    let actorId: number;
    let actorRole: Role = InternalRoles.AREA_MAINTENANCE_MANAGER;
    if (ticket.currentOwnerUserId != null) {
      const owner = await prisma.internalUser.findUnique({
        where: { id: ticket.currentOwnerUserId },
        select: { id: true, role: true },
      });
      if (owner) {
        actorId = owner.id;
        actorRole = owner.role as Role;
      } else {
        const amm = await prisma.internalUser.findFirst({
          where: {
            companyId: ticket.companyId,
            regionId: ticket.store!.regionId,
            role: InternalRoles.AREA_MAINTENANCE_MANAGER as InternalRole,
            active: true,
          },
          select: { id: true },
        });
        if (!amm) return;
        actorId = amm.id;
      }
    } else {
      const amm = await prisma.internalUser.findFirst({
        where: {
          companyId: ticket.companyId,
          regionId: ticket.store!.regionId,
          role: InternalRoles.AREA_MAINTENANCE_MANAGER as InternalRole,
          active: true,
        },
        select: { id: true },
      });
      if (!amm) return;
      actorId = amm.id;
    }

    const validation = await validateTransition({
      entityType: 'TICKET',
      entityId: ticket.id,
      currentStatus: currentStatusOur,
      currentOwnerId: ticket.currentOwnerUserId,
      action: 'ARCHIVE',
      actorId,
      actorRole: InternalRoles.AREA_MAINTENANCE_MANAGER,
    });

    if (!validation.allowed) {
      return;
    }

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        currentStatus: toPrismaStatus(validation.newStatus! as TicketStatusType),
        currentOwnerUserId: null,
        archived: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        entityType: 'TICKET',
        entityId: ticket.id,
        ticketId: ticket.id,
        prevStatus: ticket.currentStatus,
        newStatus: validation.newStatus! as string,
        actionType: 'ARCHIVE',
        actorType: 'INTERNAL',
        actorId,
        comment: 'Auto-archived (all work orders complete)',
      },
    });
  }

  private mapTicketToResponse(ticket: {
    id: number;
    storeId: number;
    store?: { name: string };
    createdByUserId: number;
    createdBy?: { name: string };
    category: string;
    description: string;
    originalDescription?: string | null;
    urgent: boolean;
    currentStatus: string;
    currentOwnerUserId: number | null;
    currentOwner?: { name: string } | null;
    assetId: number | null;
    asset?: { description: string | null } | null;
    createdAt: Date;
    updatedAt: Date;
  }): TicketResponse {
    const asset = ticket.asset ? {
      ...ticket.asset,
      description: ticket.asset.description ?? '',
    } : null;

    return {
      id: ticket.id,
      storeId: ticket.storeId,
      storeName: ticket.store?.name ?? '',
      createdByUserId: ticket.createdByUserId,
      createdByUserName: ticket.createdBy?.name ?? '',
      category: ticket.category as TicketResponse['category'],
      description: ticket.description,
      originalDescription: ticket.originalDescription ?? ticket.description,
      urgent: ticket.urgent,
      currentStatus: toOurStatus(ticket.currentStatus),
      currentOwnerUserId: ticket.currentOwnerUserId,
      currentOwnerUserName: ticket.currentOwner?.name ?? null,
      assetId: ticket.assetId,
      assetDescription: asset?.description ?? null,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }
}

export const ticketService = new TicketService();
