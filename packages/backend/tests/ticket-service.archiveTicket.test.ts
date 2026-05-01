import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InternalRoles } from '../src/types/roles.js';

const prismaMock = {
  ticket: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

const validateTransitionMock = vi.fn();

vi.mock('../src/config/database.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../src/core/state-machine/index.js', () => ({
  validateTransition: validateTransitionMock,
}));

vi.mock('../src/services/approval-chain/approval-chain-service.js', () => ({
  approvalChainService: {},
}));

vi.mock('../src/services/email/email-service.js', () => ({
  notifyNewOwner: vi.fn(),
}));

import { TicketService } from '../src/services/ticket/ticket-service.js';

describe('TicketService.archiveTicket', () => {
  const service = new TicketService();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(service as any, 'mapTicketToResponse').mockReturnValue({
      id: 1,
      currentStatus: 'Ticket Archived',
    });
  });

  it('throws when ticket has no work orders', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      id: 1,
      currentStatus: 'COST_ESTIMATION_APPROVED',
      currentOwnerUserId: 10,
      workOrders: [],
    });

    await expect(
      service.archiveTicket({ ticketId: 1 }, 10, InternalRoles.AREA_MAINTENANCE_MANAGER)
    ).rejects.toThrow('Cannot archive: ticket has no work orders. Use REJECT to close a ticket without work.');

    expect(validateTransitionMock).not.toHaveBeenCalled();
    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
  });

  it('throws when at least one work order is active', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      id: 2,
      currentStatus: 'WORK_ORDER_IN_PROGRESS',
      currentOwnerUserId: 10,
      workOrders: [{ currentStatus: 'SERVICE_IN_PROGRESS' }],
    });

    await expect(
      service.archiveTicket({ ticketId: 2 }, 10, InternalRoles.AREA_MAINTENANCE_MANAGER)
    ).rejects.toThrow('Cannot archive: not all work orders are complete');

    expect(validateTransitionMock).not.toHaveBeenCalled();
    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
  });

  it('archives successfully when all work orders are terminal', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({
      id: 3,
      currentStatus: 'WORK_ORDER_IN_PROGRESS',
      currentOwnerUserId: 10,
      companyId: 1,
      storeId: 1,
      createdByUserId: 10,
      category: 'OTHER',
      description: 'desc',
      urgent: false,
      assetId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      workOrders: [
        { currentStatus: 'COST_PROPOSAL_APPROVED' },
        { currentStatus: 'CLOSED_WITHOUT_COST' },
        { currentStatus: 'REJECTED' },
      ],
    });
    validateTransitionMock.mockResolvedValue({
      allowed: true,
      newStatus: 'Ticket Archived',
    });
    prismaMock.ticket.update.mockResolvedValue({
      id: 3,
      store: { name: 'Store' },
      createdBy: { name: 'User' },
      currentOwner: null,
      asset: null,
      currentStatus: 'ARCHIVED',
      currentOwnerUserId: null,
      category: 'OTHER',
      description: 'desc',
      createdAt: new Date(),
      updatedAt: new Date(),
      storeId: 1,
      createdByUserId: 10,
      urgent: false,
      assetId: null,
    });

    await expect(
      service.archiveTicket({ ticketId: 3 }, 10, InternalRoles.AREA_MAINTENANCE_MANAGER)
    ).resolves.toMatchObject({ id: 1, currentStatus: 'Ticket Archived' });

    expect(validateTransitionMock).toHaveBeenCalledTimes(1);
    expect(prismaMock.ticket.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
