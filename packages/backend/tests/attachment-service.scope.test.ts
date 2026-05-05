import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    ticket: {
      findUnique: vi.fn(),
    },
    asset: {
      findUnique: vi.fn(),
    },
    attachment: {
      create: vi.fn(),
    },
  },
}));

vi.mock('../src/config/database.js', () => ({
  prisma: prismaMock,
}));

import {
  addTicketAttachment,
  addAssetAttachment,
} from '../src/services/attachment/attachment-service.js';

const baseAttachmentRow = {
  id: 999,
  fileName: 'doc.pdf',
  createdAt: new Date('2026-05-04T10:00:00Z'),
  internalFlag: true,
};

describe('addTicketAttachment scope check', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.attachment.create.mockResolvedValue(baseAttachmentRow);
  });

  it('allows upload when ticket belongs to actor company', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({ id: 1, companyId: 10 });
    const result = await addTicketAttachment(1, '/tmp/x', 'doc.pdf', 5, 10);
    expect(result.id).toBe(999);
    expect(prismaMock.attachment.create).toHaveBeenCalledOnce();
  });

  it('rejects upload when ticket belongs to a different company (cross-tenant)', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue({ id: 1, companyId: 10 });
    await expect(addTicketAttachment(1, '/tmp/x', 'doc.pdf', 5, 999)).rejects.toThrow('Ticket not found');
    expect(prismaMock.attachment.create).not.toHaveBeenCalled();
  });

  it('rejects upload when ticket does not exist', async () => {
    prismaMock.ticket.findUnique.mockResolvedValue(null);
    await expect(addTicketAttachment(404, '/tmp/x', 'doc.pdf', 5, 10)).rejects.toThrow('Ticket not found');
    expect(prismaMock.attachment.create).not.toHaveBeenCalled();
  });
});

describe('addAssetAttachment scope check', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    prismaMock.attachment.create.mockResolvedValue(baseAttachmentRow);
  });

  it('allows upload when asset store belongs to actor company', async () => {
    prismaMock.asset.findUnique.mockResolvedValue({
      id: 1,
      store: { companyId: 10 },
    });
    const result = await addAssetAttachment(1, '/tmp/x', 'doc.pdf', 5, 10);
    expect(result.id).toBe(999);
    expect(prismaMock.attachment.create).toHaveBeenCalledOnce();
  });

  it('rejects upload when asset store belongs to a different company', async () => {
    prismaMock.asset.findUnique.mockResolvedValue({
      id: 1,
      store: { companyId: 10 },
    });
    await expect(addAssetAttachment(1, '/tmp/x', 'doc.pdf', 5, 999)).rejects.toThrow('Asset not found');
    expect(prismaMock.attachment.create).not.toHaveBeenCalled();
  });

  it('rejects upload when asset does not exist', async () => {
    prismaMock.asset.findUnique.mockResolvedValue(null);
    await expect(addAssetAttachment(404, '/tmp/x', 'doc.pdf', 5, 10)).rejects.toThrow('Asset not found');
    expect(prismaMock.attachment.create).not.toHaveBeenCalled();
  });
});
