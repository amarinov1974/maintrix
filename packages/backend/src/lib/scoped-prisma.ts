/**
 * createScopedPrisma — returns a Prisma client extended with automatic
 * companyId / vendorCompanyId scope for the current session's tenant.
 *
 * Scoped operations: findMany, findFirst, findFirstOrThrow, update, delete.
 * NOT scoped: findUnique/findUniqueOrThrow (PK lookups are already unique),
 *             create (companyId must be set explicitly at creation time).
 *
 * INTERNAL users scope by `companyId` on: Ticket, Store, Region,
 *   InternalUser, AssetCategory, PreventiveMaintenancePlan.
 *
 * VENDOR users scope by `vendorCompanyId` on: WorkOrder, InvoiceBatch,
 *   VendorUser, VendorPriceListItem, PreventiveMaintenancePlan.
 */

import { prisma } from '../config/database.js';
import type { SessionData } from '../services/session/types.js';

type ScopedPrisma = ReturnType<typeof createScopedPrisma>;
export type { ScopedPrisma };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addWhere<T extends { where?: Record<string, unknown> }>(
  args: T,
  extra: Record<string, unknown>,
): T {
  return { ...args, where: { ...(args.where ?? {}), ...extra } };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createScopedPrisma(session: SessionData) {
  const { companyId, userType } = session;

  if (userType === 'INTERNAL') {
    const scope = { companyId };

    return prisma.$extends({
      query: {
        ticket: {
          findMany({ args, query }) { return query(addWhere(args, scope)); },
          findFirst({ args, query }) { return query(addWhere(args, scope)); },
          findFirstOrThrow({ args, query }) { return query(addWhere(args, scope)); },
          update({ args, query }) { return query(addWhere(args, scope)); },
          delete({ args, query }) { return query(addWhere(args, scope)); },
          deleteMany({ args, query }) { return query(addWhere(args, scope)); },
        },
        store: {
          findMany({ args, query }) { return query(addWhere(args, scope)); },
          findFirst({ args, query }) { return query(addWhere(args, scope)); },
          findFirstOrThrow({ args, query }) { return query(addWhere(args, scope)); },
        },
        region: {
          findMany({ args, query }) { return query(addWhere(args, scope)); },
          findFirst({ args, query }) { return query(addWhere(args, scope)); },
        },
        internalUser: {
          findMany({ args, query }) { return query(addWhere(args, scope)); },
          findFirst({ args, query }) { return query(addWhere(args, scope)); },
          findFirstOrThrow({ args, query }) { return query(addWhere(args, scope)); },
        },
        assetCategory: {
          findMany({ args, query }) { return query(addWhere(args, scope)); },
          findFirst({ args, query }) { return query(addWhere(args, scope)); },
        },
        preventiveMaintenancePlan: {
          findMany({ args, query }) { return query(addWhere(args, scope)); },
          findFirst({ args, query }) { return query(addWhere(args, scope)); },
          update({ args, query }) { return query(addWhere(args, scope)); },
          delete({ args, query }) { return query(addWhere(args, scope)); },
        },
      },
    });
  }

  // VENDOR
  const scope = { vendorCompanyId: companyId };

  return prisma.$extends({
    query: {
      workOrder: {
        findMany({ args, query }) { return query(addWhere(args, scope)); },
        findFirst({ args, query }) { return query(addWhere(args, scope)); },
        findFirstOrThrow({ args, query }) { return query(addWhere(args, scope)); },
        update({ args, query }) { return query(addWhere(args, scope)); },
        delete({ args, query }) { return query(addWhere(args, scope)); },
      },
      invoiceBatch: {
        findMany({ args, query }) { return query(addWhere(args, scope)); },
        findFirst({ args, query }) { return query(addWhere(args, scope)); },
        findFirstOrThrow({ args, query }) { return query(addWhere(args, scope)); },
        update({ args, query }) { return query(addWhere(args, scope)); },
      },
      vendorUser: {
        findMany({ args, query }) { return query(addWhere(args, scope)); },
        findFirst({ args, query }) { return query(addWhere(args, scope)); },
        findFirstOrThrow({ args, query }) { return query(addWhere(args, scope)); },
      },
      vendorPriceListItem: {
        findMany({ args, query }) { return query(addWhere(args, scope)); },
        findFirst({ args, query }) { return query(addWhere(args, scope)); },
      },
      preventiveMaintenancePlan: {
        findMany({ args, query }) { return query(addWhere(args, scope)); },
        findFirst({ args, query }) { return query(addWhere(args, scope)); },
        update({ args, query }) { return query(addWhere(args, scope)); },
        delete({ args, query }) { return query(addWhere(args, scope)); },
      },
    },
  });
}
