import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock prisma — mirrors real $extends({ query }) fall-through:
//   • Listed (model, op) pairs route through the user hook.
//   • Unlisted ops on a listed model fall through to base.
//   • Unlisted models fall through to base entirely (NOT undefined).
// ---------------------------------------------------------------------------

const { prismaMock } = vi.hoisted(() => {
  const captured: Record<string, unknown> = {};

  function makeBaseModel(modelName: string) {
    return new Proxy(
      {},
      {
        get(_t, op: string) {
          return (args: unknown) => {
            captured[`${modelName}.${op}.base`] = args;
            return Promise.resolve([]);
          };
        },
      },
    );
  }

  const allModels = [
    // flat INTERNAL
    'ticket', 'store', 'region', 'internalUser', 'assetCategory',
    'preventiveMaintenancePlan',
    // flat VENDOR
    'workOrder', 'invoiceBatch', 'vendorUser', 'vendorPriceListItem',
    // nested INTERNAL
    'asset', 'costEstimation', 'approvalRecord', 'ticketComment',
  ];

  const baseClient: Record<string, unknown> = { _captured: captured };
  for (const m of allModels) baseClient[m] = makeBaseModel(m);

  baseClient.$extends = function (extension: {
    query: Record<string, Record<string, (ctx: { args: unknown; query: (a: unknown) => Promise<unknown> }) => Promise<unknown>>>;
  }) {
    // Build extended client: for each model, override hooked ops; non-hooked ops + non-hooked models fall through to base.
    const extended: Record<string, unknown> = { _captured: captured, $extends: baseClient.$extends };
    for (const m of allModels) {
      const hooks = extension.query[m];
      if (hooks == null) {
        extended[m] = baseClient[m]; // pass-through
        continue;
      }
      extended[m] = new Proxy(
        {},
        {
          get(_t, op: string) {
            const hook = hooks[op];
            if (hook != null) {
              return (args: unknown) =>
                hook({
                  args,
                  query: (a: unknown) => {
                    captured[`${m}.${op}`] = a;
                    return Promise.resolve([]);
                  },
                });
            }
            // Op not hooked → falls through to base unscoped behaviour
            return (args: unknown) => {
              captured[`${m}.${op}.base`] = args;
              return Promise.resolve([]);
            };
          },
        },
      );
    }
    return extended;
  };

  return { prismaMock: baseClient };
});

vi.mock('../src/config/database.js', () => ({ prisma: prismaMock }));

import { createScopedPrisma } from '../src/lib/scoped-prisma.js';
import type { SessionData } from '../src/services/session/types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const internalSession: SessionData = {
  userId: 1, role: 'AMM', userType: 'INTERNAL', companyId: 42,
  userName: 'AMM', companyName: 'Retail Co', createdAt: new Date(), lastActivity: new Date(),
};

const vendorSession: SessionData = {
  userId: 2, role: 'S1', userType: 'VENDOR', companyId: 99,
  userName: 'S1', companyName: 'Vendor Co', createdAt: new Date(), lastActivity: new Date(),
};

type AnyClient = Record<string, Record<string, (a: unknown) => Promise<unknown>>>;

function getCaptured(): Record<string, unknown> {
  return (prismaMock as unknown as { _captured: Record<string, unknown> })._captured;
}

beforeEach(() => {
  const c = getCaptured();
  Object.keys(c).forEach((k) => delete c[k]);
});

// ---------------------------------------------------------------------------
// INTERNAL — read ops
// ---------------------------------------------------------------------------

describe('createScopedPrisma — INTERNAL reads', () => {
  it('scopes ticket.findMany', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.ticket.findMany({ where: { urgent: true } });
    expect(getCaptured()['ticket.findMany']).toMatchObject({ where: { companyId: 42, urgent: true } });
  });

  it('scopes ticket.findUnique (Vuln 1 fix)', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.ticket.findUnique({ where: { id: 5 } });
    expect(getCaptured()['ticket.findUnique']).toMatchObject({ where: { companyId: 42, id: 5 } });
  });

  it('scopes ticket.findUniqueOrThrow', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.ticket.findUniqueOrThrow({ where: { id: 5 } });
    expect(getCaptured()['ticket.findUniqueOrThrow']).toMatchObject({ where: { companyId: 42, id: 5 } });
  });

  it('scopes ticket.count (Vuln 3 fix — read-class)', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.ticket.count({});
    expect(getCaptured()['ticket.count']).toMatchObject({ where: { companyId: 42 } });
  });

  it('scopes ticket.aggregate', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.ticket.aggregate({ _count: true });
    expect(getCaptured()['ticket.aggregate']).toMatchObject({ where: { companyId: 42 } });
  });

  it('scopes ticket.groupBy', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.ticket.groupBy({ by: ['urgent'] });
    expect(getCaptured()['ticket.groupBy']).toMatchObject({ where: { companyId: 42 } });
  });

  it('scopes store.findMany (was missing in v1)', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.store.findMany({});
    expect(getCaptured()['store.findMany']).toMatchObject({ where: { companyId: 42 } });
  });
});

// ---------------------------------------------------------------------------
// INTERNAL — write ops (Vuln 3 + Vuln 4 fixes)
// ---------------------------------------------------------------------------

describe('createScopedPrisma — INTERNAL writes', () => {
  it('scopes ticket.create data (Vuln 4 fix)', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.ticket.create({ data: { title: 'foo', companyId: 999 } });
    // Session companyId (42) overrides caller-supplied (999)
    expect(getCaptured()['ticket.create']).toMatchObject({ data: { title: 'foo', companyId: 42 } });
  });

  it('scopes ticket.createMany rows', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.ticket.createMany({ data: [{ title: 'a' }, { title: 'b', companyId: 999 }] });
    expect(getCaptured()['ticket.createMany']).toMatchObject({
      data: [{ title: 'a', companyId: 42 }, { title: 'b', companyId: 42 }],
    });
  });

  it('scopes ticket.update where', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.ticket.update({ where: { id: 5 }, data: { urgent: false } });
    expect(getCaptured()['ticket.update']).toMatchObject({ where: { companyId: 42, id: 5 } });
  });

  it('scopes ticket.updateMany where (Vuln 3 fix — write-class)', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.ticket.updateMany({ where: { urgent: true }, data: { archived: true } });
    expect(getCaptured()['ticket.updateMany']).toMatchObject({ where: { companyId: 42, urgent: true } });
  });

  it('scopes ticket.upsert where AND create.data', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.ticket.upsert({
      where: { id: 5 },
      create: { title: 'new', companyId: 999 },
      update: { urgent: true },
    });
    expect(getCaptured()['ticket.upsert']).toMatchObject({
      where: { companyId: 42, id: 5 },
      create: { title: 'new', companyId: 42 },
    });
  });

  it('scopes ticket.delete and deleteMany where', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.ticket.delete({ where: { id: 1 } });
    await db.ticket.deleteMany({ where: { urgent: true } });
    expect(getCaptured()['ticket.delete']).toMatchObject({ where: { companyId: 42, id: 1 } });
    expect(getCaptured()['ticket.deleteMany']).toMatchObject({ where: { companyId: 42, urgent: true } });
  });
});

// ---------------------------------------------------------------------------
// Tenant bypass prevention
// ---------------------------------------------------------------------------

describe('tenant bypass prevention', () => {
  it('overrides caller-supplied companyId in where', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.ticket.findMany({ where: { companyId: 999 } });
    expect(getCaptured()['ticket.findMany']).toMatchObject({ where: { companyId: 42 } });
  });

  it('overrides caller-supplied companyId in create data', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.ticket.create({ data: { companyId: 999, title: 'evil' } });
    expect(getCaptured()['ticket.create']).toMatchObject({ data: { companyId: 42 } });
  });
});

// ---------------------------------------------------------------------------
// VENDOR — scope key + Vuln 5 (correct vendorId column)
// ---------------------------------------------------------------------------

describe('createScopedPrisma — VENDOR', () => {
  it('scopes workOrder.findMany by vendorCompanyId', async () => {
    const db = createScopedPrisma(vendorSession) as unknown as AnyClient;
    await db.workOrder.findMany({ where: { urgent: true } });
    expect(getCaptured()['workOrder.findMany']).toMatchObject({ where: { vendorCompanyId: 99, urgent: true } });
  });

  it('scopes vendorPriceListItem.findMany by vendorId (Vuln 5 fix — correct column)', async () => {
    const db = createScopedPrisma(vendorSession) as unknown as AnyClient;
    await db.vendorPriceListItem.findMany({});
    expect(getCaptured()['vendorPriceListItem.findMany']).toMatchObject({ where: { vendorId: 99 } });
    // Sanity: the WRONG column name is NOT injected
    expect((getCaptured()['vendorPriceListItem.findMany'] as { where: Record<string, unknown> }).where.vendorCompanyId).toBeUndefined();
  });

  it('scopes invoiceBatch.update by vendorCompanyId', async () => {
    const db = createScopedPrisma(vendorSession) as unknown as AnyClient;
    await db.invoiceBatch.update({ where: { id: 1 }, data: { status: 'PAID' } });
    expect(getCaptured()['invoiceBatch.update']).toMatchObject({ where: { vendorCompanyId: 99, id: 1 } });
  });

  it('scopes invoiceBatch.findFirst by vendorCompanyId', async () => {
    const db = createScopedPrisma(vendorSession) as unknown as AnyClient;
    await db.invoiceBatch.findFirst({ where: { id: 5 } });
    expect(getCaptured()['invoiceBatch.findFirst']).toMatchObject({ where: { vendorCompanyId: 99, id: 5 } });
  });

  it('scopes invoiceBatch.count by vendorCompanyId', async () => {
    const db = createScopedPrisma(vendorSession) as unknown as AnyClient;
    await db.invoiceBatch.count({});
    expect(getCaptured()['invoiceBatch.count']).toMatchObject({ where: { vendorCompanyId: 99 } });
  });

  it('scopes workOrder.findMany — filters out cross-vendor WOs by vendorCompanyId injection', async () => {
    const db = createScopedPrisma(vendorSession) as unknown as AnyClient;
    // Caller passes no vendorCompanyId — scoped client injects it automatically
    await db.workOrder.findMany({});
    const captured = getCaptured()['workOrder.findMany'] as { where: Record<string, unknown> };
    expect(captured.where.vendorCompanyId).toBe(99);
  });

  it('overrides caller-supplied vendorCompanyId in workOrder create data', async () => {
    const db = createScopedPrisma(vendorSession) as unknown as AnyClient;
    await db.workOrder.create({ data: { vendorCompanyId: 1, title: 'evil' } });
    expect(getCaptured()['workOrder.create']).toMatchObject({ data: { vendorCompanyId: 99 } });
  });
});

// ---------------------------------------------------------------------------
// Vuln 2 fix — Proxy blocks access to non-scoped models
// ---------------------------------------------------------------------------

describe('non-scoped model access throws (Vuln 2 fix)', () => {
  it('throws when VENDOR tries to access ticket', () => {
    const db = createScopedPrisma(vendorSession) as unknown as Record<string, unknown>;
    expect(() => db.ticket).toThrow(/not tenant-scoped for VENDOR/);
  });

  it('throws when INTERNAL tries to access workOrder', () => {
    const db = createScopedPrisma(internalSession) as unknown as Record<string, unknown>;
    expect(() => db.workOrder).toThrow(/not tenant-scoped for INTERNAL/);
  });

  it('throws when VENDOR tries to access store', () => {
    const db = createScopedPrisma(vendorSession) as unknown as Record<string, unknown>;
    expect(() => db.store).toThrow(/not tenant-scoped for VENDOR/);
  });

  it('does NOT throw on $-prefixed Prisma internals', () => {
    const db = createScopedPrisma(internalSession) as unknown as Record<string, unknown>;
    expect(() => db.$extends).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// INTERNAL — nested-scope models (asset, costEstimation, approvalRecord, ticketComment)
// ---------------------------------------------------------------------------

describe('createScopedPrisma — INTERNAL nested scope reads', () => {
  it('scopes asset.findMany via store.companyId', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.asset.findMany({ where: { active: true } });
    expect(getCaptured()['asset.findMany']).toMatchObject({
      where: { store: { companyId: 42 }, active: true },
    });
  });

  it('merges existing store filter when scoping asset', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.asset.findMany({ where: { store: { name: 'Foo' } } });
    expect(getCaptured()['asset.findMany']).toMatchObject({
      where: { store: { name: 'Foo', companyId: 42 } },
    });
  });

  it('scopes costEstimation.findMany via ticket.companyId', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.costEstimation.findMany({});
    expect(getCaptured()['costEstimation.findMany']).toMatchObject({
      where: { ticket: { companyId: 42 } },
    });
  });

  it('scopes approvalRecord.findMany via ticket.companyId', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.approvalRecord.findMany({ where: { decision: 'APPROVED' } });
    expect(getCaptured()['approvalRecord.findMany']).toMatchObject({
      where: { ticket: { companyId: 42 }, decision: 'APPROVED' },
    });
  });

  it('scopes ticketComment.findMany via ticket.companyId', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.ticketComment.findMany({});
    expect(getCaptured()['ticketComment.findMany']).toMatchObject({
      where: { ticket: { companyId: 42 } },
    });
  });

  it('scopes asset.update where via store.companyId', async () => {
    const db = createScopedPrisma(internalSession) as unknown as AnyClient;
    await db.asset.update({ where: { id: 7 }, data: { active: false } });
    expect(getCaptured()['asset.update']).toMatchObject({
      where: { store: { companyId: 42 }, id: 7 },
    });
  });

  it('nested-scoped models are accessible to INTERNAL', () => {
    const db = createScopedPrisma(internalSession) as unknown as Record<string, unknown>;
    expect(() => db.asset).not.toThrow();
    expect(() => db.costEstimation).not.toThrow();
    expect(() => db.approvalRecord).not.toThrow();
    expect(() => db.ticketComment).not.toThrow();
  });

  it('nested-scoped models are blocked for VENDOR', () => {
    const db = createScopedPrisma(vendorSession) as unknown as Record<string, unknown>;
    expect(() => db.asset).toThrow(/not tenant-scoped for VENDOR/);
    expect(() => db.ticketComment).toThrow(/not tenant-scoped for VENDOR/);
  });
});

// ---------------------------------------------------------------------------
// scopeMiddleware lazy getter (unchanged)
// ---------------------------------------------------------------------------

describe('scopeMiddleware', () => {
  it('returns undefined scopedPrisma when no session set', async () => {
    const { scopeMiddleware } = await import('../src/middleware/scope.middleware.js');
    const req = { session: undefined } as unknown as import('express').Request;
    const res = {} as import('express').Response;
    const next = vi.fn();
    scopeMiddleware(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.scopedPrisma).toBeUndefined();
  });

  it('materialises scopedPrisma after session is attached (lazy)', async () => {
    const { scopeMiddleware } = await import('../src/middleware/scope.middleware.js');
    const req = { session: undefined } as unknown as import('express').Request;
    const res = {} as import('express').Response;
    const next = vi.fn();
    scopeMiddleware(req, res, next);
    (req as { session?: SessionData }).session = internalSession;
    expect(req.scopedPrisma).toBeDefined();
  });
});
