import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    ticket: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    internalUser: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('../src/config/database.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../src/core/state-machine/index.js', () => ({
  validateTransition: vi.fn(),
}));

vi.mock('../src/services/approval-chain/approval-chain-service.js', () => ({
  approvalChainService: {},
}));

vi.mock('../src/services/email/email-service.js', () => ({
  notifyNewOwner: vi.fn(),
}));

import { TicketService } from '../src/services/ticket/ticket-service.js';

type MockTicket = {
  id: number;
  companyId: number;
  storeId: number;
  createdByUserId: number;
  currentOwnerUserId: number | null;
  category: string;
  description: string;
  urgent: boolean;
  assetId: number | null;
  currentStatus: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
  store: { id: number; name: string; address: string | null; regionId: number };
  createdBy: { id: number; name: string; role: string };
  currentOwner: null;
  asset: null;
};

const ticketsSeed: MockTicket[] = [
  {
    id: 101,
    companyId: 1,
    storeId: 10,
    createdByUserId: 500,
    currentOwnerUserId: 500,
    category: 'OTHER',
    description: 'Retail A ticket',
    urgent: false,
    assetId: null,
    currentStatus: 'CREATED',
    archived: false,
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    updatedAt: new Date('2026-01-01T10:00:00.000Z'),
    store: { id: 10, name: 'Store A1', address: null, regionId: 1 },
    createdBy: { id: 500, name: 'SM A', role: 'STORE_MANAGER' },
    currentOwner: null,
    asset: null,
  },
  {
    id: 102,
    companyId: 1,
    storeId: 11,
    createdByUserId: 501,
    currentOwnerUserId: 501,
    category: 'HVAC',
    description: 'Retail A urgent',
    urgent: true,
    assetId: null,
    currentStatus: 'CREATED',
    archived: false,
    createdAt: new Date('2026-01-02T10:00:00.000Z'),
    updatedAt: new Date('2026-01-02T10:00:00.000Z'),
    store: { id: 11, name: 'Store A2', address: null, regionId: 1 },
    createdBy: { id: 501, name: 'SM A2', role: 'STORE_MANAGER' },
    currentOwner: null,
    asset: null,
  },
  {
    id: 201,
    companyId: 2,
    storeId: 20,
    createdByUserId: 600,
    currentOwnerUserId: 600,
    category: 'OTHER',
    description: 'Retail B ticket',
    urgent: false,
    assetId: null,
    currentStatus: 'CREATED',
    archived: false,
    createdAt: new Date('2026-01-03T10:00:00.000Z'),
    updatedAt: new Date('2026-01-03T10:00:00.000Z'),
    store: { id: 20, name: 'Store B1', address: null, regionId: 2 },
    createdBy: { id: 600, name: 'SM B', role: 'STORE_MANAGER' },
    currentOwner: null,
    asset: null,
  },
];

function applyTicketFilters(rows: MockTicket[], where: any): MockTicket[] {
  if (!where) return rows;
  return rows.filter((row) => {
    if (where.companyId != null && row.companyId !== where.companyId) return false;
    if (where.id != null && row.id !== where.id) return false;
    return true;
  });
}

describe('TicketService scope filtering', () => {
  const service = new TicketService();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(service as any, 'mapTicketToResponse').mockImplementation((t: MockTicket) => ({
      id: t.id,
      companyId: t.companyId,
      storeId: t.storeId,
      currentStatus: t.currentStatus,
    }));

    prismaMock.ticket.findMany.mockImplementation(async (args: { where?: any }) =>
      applyTicketFilters(ticketsSeed, args?.where)
    );
  });

  describe('listTickets', () => {
    it('INTERNAL sees tickets only for own retail company (Retail A)', async () => {
      const result = await service.listTickets({ companyId: 1 });

      expect(result.map((t) => t.id).sort((a, b) => a - b)).toEqual([101, 102]);
      expect(result.find((t) => t.id === 201)).toBeUndefined();
    });

    it('INTERNAL from Retail B does not see Retail A tickets', async () => {
      const result = await service.listTickets({ companyId: 2 });

      expect(result.map((t) => t.id)).toEqual([201]);
      expect(result.find((t) => t.id === 101)).toBeUndefined();
      expect(result.find((t) => t.id === 102)).toBeUndefined();
    });

    it('passes companyId into the prisma where clause', async () => {
      await service.listTickets({ companyId: 1 });

      expect(prismaMock.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 1 }),
        })
      );
    });
  });

  describe('getTicket', () => {
    it('returns ticket when companyId matches', async () => {
      prismaMock.ticket.findUnique.mockImplementation(async ({ where }: any) => {
        const match = ticketsSeed.find(
          (t) => t.id === where.id && (where.companyId == null || t.companyId === where.companyId)
        );
        if (!match) return null;
        return {
          ...match,
          attachments: [],
          comments: [],
          auditLogs: [],
          costEstimation: null,
          approvalRecords: [],
          clarificationRequestedByUserId: null,
          originalDescription: null,
        };
      });

      const detail = await service.getTicket(101, 500, 1);

      expect(prismaMock.ticket.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 101, companyId: 1 },
        })
      );
      expect(detail.id).toBe(101);
    });

    it('throws "Ticket not found" when companyId does not match (cross-tenant blocked)', async () => {
      prismaMock.ticket.findUnique.mockImplementation(async ({ where }: any) => {
        const match = ticketsSeed.find(
          (t) => t.id === where.id && (where.companyId == null || t.companyId === where.companyId)
        );
        return match ?? null;
      });

      await expect(service.getTicket(201, 500, 1)).rejects.toThrow('Ticket not found');

      expect(prismaMock.ticket.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 201, companyId: 1 },
        })
      );
    });

    it('omits companyId from where clause when caller does not pass it', async () => {
      prismaMock.ticket.findUnique.mockResolvedValue({
        ...ticketsSeed[0],
        attachments: [],
        comments: [],
        auditLogs: [],
        costEstimation: null,
        approvalRecords: [],
        clarificationRequestedByUserId: null,
        originalDescription: null,
      });

      await service.getTicket(101, 500);

      expect(prismaMock.ticket.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 101 },
        })
      );
    });
  });
});
