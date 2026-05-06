import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    auditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../src/config/database.js', () => ({
  prisma: prismaMock,
}));

import {
  writeTicketAudit,
  writeWorkOrderAudit,
} from '../src/services/audit/audit-service.js';

describe('writeTicketAudit', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.auditLog.create.mockResolvedValue({});
  });

  it('writes an audit row with TICKET entity type and ticketId mirrored to entityId', async () => {
    await writeTicketAudit({
      ticketId: 42,
      prevStatus: 'Draft',
      newStatus: 'Ticket Submitted',
      actionType: 'SUBMIT',
      actorType: 'INTERNAL',
      actorId: 7,
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledOnce();
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: {
        entityType: 'TICKET',
        entityId: 42,
        ticketId: 42,
        prevStatus: 'Draft',
        newStatus: 'Ticket Submitted',
        actionType: 'SUBMIT',
        actorType: 'INTERNAL',
        actorId: 7,
        comment: undefined,
      },
    });
  });

  it('passes through optional comment', async () => {
    await writeTicketAudit({
      ticketId: 1,
      prevStatus: null,
      newStatus: 'Draft',
      actionType: 'CREATE',
      actorType: 'INTERNAL',
      actorId: 1,
      comment: 'Created via UI',
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ comment: 'Created via UI' }),
      })
    );
  });
});

describe('writeWorkOrderAudit', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.auditLog.create.mockResolvedValue({});
  });

  it('writes an audit row with WORK_ORDER entity type and workOrderId mirrored to entityId', async () => {
    await writeWorkOrderAudit({
      workOrderId: 99,
      prevStatus: 'ACCEPTED_TECHNICIAN_ASSIGNED',
      newStatus: 'Service In Progress',
      actionType: 'CHECKIN',
      actorType: 'VENDOR',
      actorId: 3,
      comment: 'Tech 1 of 2 arrived',
    });

    expect(prismaMock.auditLog.create).toHaveBeenCalledOnce();
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith({
      data: {
        entityType: 'WORK_ORDER',
        entityId: 99,
        workOrderId: 99,
        prevStatus: 'ACCEPTED_TECHNICIAN_ASSIGNED',
        newStatus: 'Service In Progress',
        actionType: 'CHECKIN',
        actorType: 'VENDOR',
        actorId: 3,
        comment: 'Tech 1 of 2 arrived',
      },
    });
  });
});
