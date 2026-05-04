import { describe, expect, it, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock prisma before imports so $extends is available synchronously
// ---------------------------------------------------------------------------

const { prismaMock } = vi.hoisted(() => {
  const capturedArgs: Record<string, unknown> = {};

  function makeModelProxy(modelName: string) {
    return new Proxy(
      {},
      {
        get(_target, op: string) {
          return (args: unknown) => {
            capturedArgs[`${modelName}.${op}`] = args;
            return Promise.resolve([]);
          };
        },
      },
    );
  }

  const mock = {
    _capturedArgs: capturedArgs,
    ticket: makeModelProxy('ticket'),
    store: makeModelProxy('store'),
    region: makeModelProxy('region'),
    internalUser: makeModelProxy('internalUser'),
    assetCategory: makeModelProxy('assetCategory'),
    preventiveMaintenancePlan: makeModelProxy('preventiveMaintenancePlan'),
    workOrder: makeModelProxy('workOrder'),
    invoiceBatch: makeModelProxy('invoiceBatch'),
    vendorUser: makeModelProxy('vendorUser'),
    vendorPriceListItem: makeModelProxy('vendorPriceListItem'),
    $extends(extension: {
      query: Record<string, Record<string, (ctx: { args: unknown; query: (a: unknown) => unknown }) => unknown>>;
    }) {
      // Build a client whose model methods pass through the extension hooks
      const extended: Record<string, Record<string, (args: unknown) => unknown>> = {};
      for (const [model, ops] of Object.entries(extension.query)) {
        extended[model] = {};
        for (const [op, hook] of Object.entries(ops)) {
          extended[model][op] = (args: unknown) =>
            hook({
              args,
              query: (a: unknown) => {
                capturedArgs[`${model}.${op}`] = a;
                return Promise.resolve([]);
              },
            });
        }
      }
      return extended;
    },
  };

  return { prismaMock: mock };
});

vi.mock('../src/config/database.js', () => ({
  prisma: prismaMock,
}));

import { createScopedPrisma } from '../src/lib/scoped-prisma.js';
import type { SessionData } from '../src/services/session/types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const internalSession: SessionData = {
  userId: 1,
  role: 'AMM',
  userType: 'INTERNAL',
  companyId: 42,
  userName: 'Test AMM',
  companyName: 'Retail Co',
  createdAt: new Date(),
  lastActivity: new Date(),
};

const vendorSession: SessionData = {
  userId: 2,
  role: 'S1',
  userType: 'VENDOR',
  companyId: 99,
  userName: 'Test S1',
  companyName: 'Vendor Co',
  createdAt: new Date(),
  lastActivity: new Date(),
};

// ---------------------------------------------------------------------------
// INTERNAL user scope
// ---------------------------------------------------------------------------

describe('createScopedPrisma — INTERNAL user', () => {
  beforeEach(() => {
    Object.keys(prismaMock._capturedArgs).forEach((k) => delete prismaMock._capturedArgs[k]);
  });

  it('injects companyId into ticket.findMany', async () => {
    const db = createScopedPrisma(internalSession) as unknown as Record<string, Record<string, (a: unknown) => unknown>>;
    await db.ticket.findMany({ where: { urgent: true } });
    expect(prismaMock._capturedArgs['ticket.findMany']).toMatchObject({ where: { companyId: 42, urgent: true } });
  });

  it('injects companyId into ticket.findFirst', async () => {
    const db = createScopedPrisma(internalSession) as unknown as Record<string, Record<string, (a: unknown) => unknown>>;
    await db.ticket.findFirst({ where: { id: 5 } });
    expect(prismaMock._capturedArgs['ticket.findFirst']).toMatchObject({ where: { companyId: 42, id: 5 } });
  });

  it('injects companyId into ticket.update', async () => {
    const db = createScopedPrisma(internalSession) as unknown as Record<string, Record<string, (a: unknown) => unknown>>;
    await db.ticket.update({ where: { id: 5 }, data: { urgent: false } });
    expect(prismaMock._capturedArgs['ticket.update']).toMatchObject({ where: { companyId: 42, id: 5 } });
  });

  it('injects companyId into store.findMany', async () => {
    const db = createScopedPrisma(internalSession) as unknown as Record<string, Record<string, (a: unknown) => unknown>>;
    await db.store.findMany({});
    expect(prismaMock._capturedArgs['store.findMany']).toMatchObject({ where: { companyId: 42 } });
  });

  it('injects companyId into internalUser.findFirst', async () => {
    const db = createScopedPrisma(internalSession) as unknown as Record<string, Record<string, (a: unknown) => unknown>>;
    await db.internalUser.findFirst({ where: { regionId: 3 } });
    expect(prismaMock._capturedArgs['internalUser.findFirst']).toMatchObject({ where: { companyId: 42, regionId: 3 } });
  });

  it('does NOT inject vendorCompanyId for INTERNAL user', async () => {
    const db = createScopedPrisma(internalSession) as unknown as Record<string, Record<string, (a: unknown) => unknown>>;
    // workOrder is not part of INTERNAL extension — calling it falls through to base mock
    expect(db.workOrder).toBeUndefined();
  });

  it('overrides caller-supplied companyId to prevent tenant bypass', async () => {
    const db = createScopedPrisma(internalSession) as unknown as Record<string, Record<string, (a: unknown) => unknown>>;
    await db.ticket.findMany({ where: { companyId: 999 } });
    // session companyId (42) must win
    expect(prismaMock._capturedArgs['ticket.findMany']).toMatchObject({ where: { companyId: 42 } });
  });
});

// ---------------------------------------------------------------------------
// VENDOR user scope
// ---------------------------------------------------------------------------

describe('createScopedPrisma — VENDOR user', () => {
  beforeEach(() => {
    Object.keys(prismaMock._capturedArgs).forEach((k) => delete prismaMock._capturedArgs[k]);
  });

  it('injects vendorCompanyId into workOrder.findMany', async () => {
    const db = createScopedPrisma(vendorSession) as unknown as Record<string, Record<string, (a: unknown) => unknown>>;
    await db.workOrder.findMany({ where: { urgent: true } });
    expect(prismaMock._capturedArgs['workOrder.findMany']).toMatchObject({ where: { vendorCompanyId: 99, urgent: true } });
  });

  it('injects vendorCompanyId into invoiceBatch.findMany', async () => {
    const db = createScopedPrisma(vendorSession) as unknown as Record<string, Record<string, (a: unknown) => unknown>>;
    await db.invoiceBatch.findMany({});
    expect(prismaMock._capturedArgs['invoiceBatch.findMany']).toMatchObject({ where: { vendorCompanyId: 99 } });
  });

  it('injects vendorCompanyId into vendorUser.findFirst', async () => {
    const db = createScopedPrisma(vendorSession) as unknown as Record<string, Record<string, (a: unknown) => unknown>>;
    await db.vendorUser.findFirst({ where: { id: 7 } });
    expect(prismaMock._capturedArgs['vendorUser.findFirst']).toMatchObject({ where: { vendorCompanyId: 99, id: 7 } });
  });

  it('injects vendorCompanyId into workOrder.update', async () => {
    const db = createScopedPrisma(vendorSession) as unknown as Record<string, Record<string, (a: unknown) => unknown>>;
    await db.workOrder.update({ where: { id: 10 }, data: { currentStatus: 'SERVICE_IN_PROGRESS' } });
    expect(prismaMock._capturedArgs['workOrder.update']).toMatchObject({ where: { vendorCompanyId: 99, id: 10 } });
  });

  it('does NOT scope ticket model for VENDOR user', async () => {
    const db = createScopedPrisma(vendorSession) as unknown as Record<string, Record<string, (a: unknown) => unknown>>;
    expect(db.ticket).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// scopeMiddleware lazy getter
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

  it('returns scopedPrisma after session is attached (lazy)', async () => {
    const { scopeMiddleware } = await import('../src/middleware/scope.middleware.js');
    const req = { session: undefined } as unknown as import('express').Request;
    const res = {} as import('express').Response;
    const next = vi.fn();

    scopeMiddleware(req, res, next);

    // Simulate requireAuth running later and setting session
    (req as { session?: SessionData }).session = internalSession;

    // Now the lazy getter should materialise
    expect(req.scopedPrisma).toBeDefined();
  });
});
