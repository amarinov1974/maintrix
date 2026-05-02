import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    workOrder: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    internalUser: {
      findMany: vi.fn(),
    },
    vendorUser: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('../src/config/database.js', () => ({
  prisma: prismaMock,
}));

vi.mock('../src/core/state-machine/index.js', () => ({
  validateTransition: vi.fn(),
}));

vi.mock('../src/services/qr/qr-service.js', () => ({
  qrService: {},
}));

vi.mock('../src/services/email/email-service.js', () => ({
  notifyNewOwner: vi.fn(),
}));

import { WorkOrderService } from '../src/services/work-order/work-order-service.js';

type MockWorkOrder = {
  id: number;
  ticketId: number;
  vendorCompanyId: number;
  currentOwnerId: number;
  currentOwnerType: 'INTERNAL' | 'VENDOR';
  currentStatus: string;
  createdAt: Date;
  updatedAt: Date;
  vendorCompany: { name: string };
  assignedTechnician: null;
  ticket: {
    companyId: number;
    urgent: boolean;
    category: string;
    store: { name: string; address: string | null; regionId: number };
    asset: null;
  };
  workReportRows?: [];
  invoiceRows?: [];
  visits?: [];
  auditLogs?: [];
  attachments?: [];
  checkinTs?: null;
  checkoutTs?: null;
  eta?: null;
  assignedTechnicianId?: null;
  declaredTechCount?: null;
  commentToVendor?: string | null;
};

const workOrdersSeed: MockWorkOrder[] = [
  {
    id: 1,
    ticketId: 101,
    vendorCompanyId: 11,
    currentOwnerId: 9001,
    currentOwnerType: 'VENDOR',
    currentStatus: 'CREATED',
    createdAt: new Date('2026-01-01T10:00:00.000Z'),
    updatedAt: new Date('2026-01-01T11:00:00.000Z'),
    vendorCompany: { name: 'Vendor A' },
    assignedTechnician: null,
    ticket: {
      companyId: 1,
      urgent: false,
      category: 'OTHER',
      store: { name: 'Store 1', address: 'Addr 1', regionId: 10 },
      asset: null,
    },
  },
  {
    id: 2,
    ticketId: 102,
    vendorCompanyId: 11,
    currentOwnerId: 9002,
    currentOwnerType: 'VENDOR',
    currentStatus: 'SERVICE_IN_PROGRESS',
    createdAt: new Date('2026-01-02T10:00:00.000Z'),
    updatedAt: new Date('2026-01-02T11:00:00.000Z'),
    vendorCompany: { name: 'Vendor A' },
    assignedTechnician: null,
    ticket: {
      companyId: 2,
      urgent: true,
      category: 'OTHER',
      store: { name: 'Store 2', address: 'Addr 2', regionId: 11 },
      asset: null,
    },
  },
  {
    id: 3,
    ticketId: 103,
    vendorCompanyId: 12,
    currentOwnerId: 9003,
    currentOwnerType: 'VENDOR',
    currentStatus: 'CREATED',
    createdAt: new Date('2026-01-03T10:00:00.000Z'),
    updatedAt: new Date('2026-01-03T11:00:00.000Z'),
    vendorCompany: { name: 'Vendor B' },
    assignedTechnician: null,
    ticket: {
      companyId: 1,
      urgent: false,
      category: 'OTHER',
      store: { name: 'Store 3', address: 'Addr 3', regionId: 12 },
      asset: null,
    },
  },
];

function applyWorkOrderFilters(rows: MockWorkOrder[], where: any): MockWorkOrder[] {
  if (!where) return rows;
  return rows.filter((row) => {
    if (where.vendorCompanyId != null && row.vendorCompanyId !== where.vendorCompanyId) {
      return false;
    }
    if (where.currentOwnerId != null && row.currentOwnerId !== where.currentOwnerId) {
      return false;
    }
    if (where.ticketId != null && row.ticketId !== where.ticketId) {
      return false;
    }
    if (where.ticket?.companyId != null && row.ticket.companyId !== where.ticket.companyId) {
      return false;
    }
    return true;
  });
}

describe('WorkOrderService scope filtering', () => {
  const service = new WorkOrderService();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(service as any, 'mapWorkOrderToResponse').mockImplementation((wo: MockWorkOrder) => ({
      id: wo.id,
      ticketId: wo.ticketId,
      vendorCompanyId: wo.vendorCompanyId,
      vendorCompanyName: wo.vendorCompany.name,
      assignedTechnicianId: null,
      assignedTechnicianName: null,
      eta: null,
      currentStatus: wo.currentStatus,
      currentOwnerType: wo.currentOwnerType,
      currentOwnerId: wo.currentOwnerId,
      declaredTechCount: null,
      checkinTs: null,
      checkoutTs: null,
      createdAt: wo.createdAt,
      updatedAt: wo.updatedAt,
    }));

    vi.spyOn(service as any, 'mapWorkOrderToDetailResponse').mockImplementation((wo: MockWorkOrder) => ({
      id: wo.id,
      ticketId: wo.ticketId,
      vendorCompanyId: wo.vendorCompanyId,
      vendorCompanyName: wo.vendorCompany.name,
      assignedTechnicianId: null,
      assignedTechnicianName: null,
      eta: null,
      currentStatus: wo.currentStatus,
      currentOwnerType: wo.currentOwnerType,
      currentOwnerId: wo.currentOwnerId,
      declaredTechCount: null,
      checkinTs: null,
      checkoutTs: null,
      createdAt: wo.createdAt,
      updatedAt: wo.updatedAt,
      workReport: [],
      invoiceRows: [],
      attachments: [],
      auditLog: [],
      visitPairs: [],
    }));

    prismaMock.workOrder.findMany.mockImplementation(async (args: { where?: any }) =>
      applyWorkOrderFilters(workOrdersSeed, args?.where)
    );
  });

  it('INTERNAL sees work orders only for own retail company', async () => {
    const result = await service.listWorkOrders({
      userType: 'INTERNAL',
      companyId: 1,
    });

    expect(result.map((wo) => wo.id).sort((a, b) => a - b)).toEqual([1, 3]);
    expect(result.find((wo) => wo.id === 2)).toBeUndefined();
  });

  it('VENDOR sees work orders for own vendor company', async () => {
    const result = await service.listWorkOrders({
      userType: 'VENDOR',
      companyId: 11,
    });

    expect(result.map((wo) => wo.id).sort((a, b) => a - b)).toEqual([1, 2]);
    expect(result.find((wo) => wo.id === 3)).toBeUndefined();
  });

  it('VENDOR does not see work orders from another vendor company', async () => {
    const result = await service.listWorkOrders({
      userType: 'VENDOR',
      companyId: 12,
    });

    expect(result.map((wo) => wo.id)).toEqual([3]);
    expect(result.find((wo) => wo.id === 1)).toBeUndefined();
    expect(result.find((wo) => wo.id === 2)).toBeUndefined();
  });

  it('VENDOR sees own work orders across different retail companies', async () => {
    const result = await service.listWorkOrders({
      userType: 'VENDOR',
      companyId: 11,
    });

    const ticketCompanies = result.map((wo) =>
      workOrdersSeed.find((seed) => seed.id === wo.id)?.ticket.companyId
    );

    expect(ticketCompanies.sort()).toEqual([1, 2]);
  });

  it('VENDOR can get a work order by id from own vendor company', async () => {
    prismaMock.workOrder.findUnique.mockResolvedValue({
      ...workOrdersSeed[0],
      workReportRows: [],
      invoiceRows: [],
      visits: [],
      auditLogs: [],
      attachments: [],
    });

    const detail = await service.getWorkOrder(1, {
      userType: 'VENDOR',
      companyId: 11,
    });

    expect(prismaMock.workOrder.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1, vendorCompanyId: 11 },
      })
    );
    expect(detail.id).toBe(1);
  });

  it('VENDOR cannot get a work order by id from another vendor company', async () => {
    prismaMock.workOrder.findUnique.mockResolvedValue(null);

    await expect(
      service.getWorkOrder(3, {
        userType: 'VENDOR',
        companyId: 11,
      })
    ).rejects.toThrow('Work order not found');

    expect(prismaMock.workOrder.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 3, vendorCompanyId: 11 },
      })
    );
  });
});
