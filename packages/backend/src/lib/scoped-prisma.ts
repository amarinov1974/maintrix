/**
 * createScopedPrisma — returns a Prisma client extended with automatic
 * companyId / vendorCompanyId scope for the current session's tenant.
 *
 * Coverage (per scoped model):
 *   READS:   findMany, findFirst, findFirstOrThrow, findUnique,
 *            findUniqueOrThrow, count, aggregate, groupBy
 *   WRITES:  create, createMany, update, updateMany, upsert,
 *            delete, deleteMany
 *
 * FLAT scope (scope key is a direct column on the model):
 *   For reads/updates/deletes the scope key is added to `where`.
 *   For create / createMany / upsert.create the scope key is forced into `data`,
 *   overriding any caller-supplied value (prevents cross-tenant planting).
 *
 * NESTED scope (scope key lives on a related model):
 *   For reads/updates/deletes the scope filter is added as a nested where
 *   (e.g. `where: { store: { companyId } }`).
 *   Creates are NOT intercepted — the FK is already tied to a tenant-verified
 *   parent, so no injection is needed or safe.
 *
 * Models NOT in either scope map for the active session are blocked: accessing
 * them on the returned client throws at runtime.
 *
 * FLAT INTERNAL scope:
 *   ticket, store, region, internalUser, assetCategory,
 *   preventiveMaintenancePlan  →  companyId
 *
 * FLAT VENDOR scope:
 *   workOrder, invoiceBatch, vendorUser,
 *   preventiveMaintenancePlan  →  vendorCompanyId
 *   vendorPriceListItem        →  vendorId
 *
 * NESTED INTERNAL scope:
 *   asset            →  store.companyId
 *   costEstimation   →  ticket.companyId
 *   approvalRecord   →  ticket.companyId
 *   ticketComment    →  ticket.companyId
 */

import { prisma } from '../config/database.js';
import type { SessionData } from '../services/session/types.js';

type ScopeMap = Readonly<Record<string, string>>;
type NestedScope = { relation: string; key: string };
type NestedScopeMap = Readonly<Record<string, NestedScope>>;

// ---------------------------------------------------------------------------
// Flat scope maps
// ---------------------------------------------------------------------------

const INTERNAL_SCOPE: ScopeMap = {
  ticket: 'companyId',
  store: 'companyId',
  region: 'companyId',
  internalUser: 'companyId',
  assetCategory: 'companyId',
  preventiveMaintenancePlan: 'companyId',
};

const VENDOR_SCOPE: ScopeMap = {
  workOrder: 'vendorCompanyId',
  invoiceBatch: 'vendorCompanyId',
  vendorUser: 'vendorCompanyId',
  vendorPriceListItem: 'vendorId',
  preventiveMaintenancePlan: 'vendorCompanyId',
};

// ---------------------------------------------------------------------------
// Nested scope maps (scope key lives on a relation, not the model itself)
// ---------------------------------------------------------------------------

const INTERNAL_NESTED_SCOPE: NestedScopeMap = {
  asset: { relation: 'store', key: 'companyId' },
  costEstimation: { relation: 'ticket', key: 'companyId' },
  approvalRecord: { relation: 'ticket', key: 'companyId' },
  ticketComment: { relation: 'ticket', key: 'companyId' },
};

const VENDOR_NESTED_SCOPE: NestedScopeMap = {};

// ---------------------------------------------------------------------------
// Hook helpers
// ---------------------------------------------------------------------------

type WhereArgs = { where?: Record<string, unknown> };
type DataArgs = { data?: Record<string, unknown> | Record<string, unknown>[] };
type UpsertArgs = { where?: Record<string, unknown>; create?: Record<string, unknown> };

function withWhere<T extends WhereArgs>(args: T, key: string, value: unknown): T {
  return { ...args, where: { ...(args.where ?? {}), [key]: value } };
}

function withData<T extends DataArgs>(args: T, key: string, value: unknown): T {
  const { data } = args;
  if (Array.isArray(data)) {
    return { ...args, data: data.map((row) => ({ ...row, [key]: value })) };
  }
  return { ...args, data: { ...(data ?? {}), [key]: value } };
}

function withUpsertScope<T extends UpsertArgs & WhereArgs>(args: T, key: string, value: unknown): T {
  return {
    ...args,
    where: { ...(args.where ?? {}), [key]: value },
    create: { ...(args.create ?? {}), [key]: value },
  };
}

function withNestedWhere<T extends WhereArgs>(args: T, relation: string, key: string, value: unknown): T {
  const existing = (args.where ?? {})[relation];
  const merged =
    typeof existing === 'object' && existing !== null
      ? { ...(existing as Record<string, unknown>), [key]: value }
      : { [key]: value };
  return { ...args, where: { ...(args.where ?? {}), [relation]: merged } };
}

// One hook bundle per model. `query` re-runs the original Prisma op with new args.
type QueryHook = (ctx: { args: unknown; query: (args: unknown) => Promise<unknown> }) => Promise<unknown>;

function buildHooks(key: string, value: unknown): Record<string, QueryHook> {
  const w = (args: unknown) => withWhere(args as WhereArgs, key, value);
  const d = (args: unknown) => withData(args as DataArgs, key, value);
  const u = (args: unknown) => withUpsertScope(args as UpsertArgs & WhereArgs, key, value);

  return {
    findMany: ({ args, query }) => query(w(args)),
    findFirst: ({ args, query }) => query(w(args)),
    findFirstOrThrow: ({ args, query }) => query(w(args)),
    findUnique: ({ args, query }) => query(w(args)),
    findUniqueOrThrow: ({ args, query }) => query(w(args)),
    count: ({ args, query }) => query(w(args)),
    aggregate: ({ args, query }) => query(w(args)),
    groupBy: ({ args, query }) => query(w(args)),
    create: ({ args, query }) => query(d(args)),
    createMany: ({ args, query }) => query(d(args)),
    update: ({ args, query }) => query(w(args)),
    updateMany: ({ args, query }) => query(w(args)),
    upsert: ({ args, query }) => query(u(args)),
    delete: ({ args, query }) => query(w(args)),
    deleteMany: ({ args, query }) => query(w(args)),
  };
}

function buildNestedHooks(relation: string, key: string, value: unknown): Record<string, QueryHook> {
  const w = (args: unknown) => withNestedWhere(args as WhereArgs, relation, key, value);

  return {
    findMany: ({ args, query }) => query(w(args)),
    findFirst: ({ args, query }) => query(w(args)),
    findFirstOrThrow: ({ args, query }) => query(w(args)),
    findUnique: ({ args, query }) => query(w(args)),
    findUniqueOrThrow: ({ args, query }) => query(w(args)),
    count: ({ args, query }) => query(w(args)),
    aggregate: ({ args, query }) => query(w(args)),
    groupBy: ({ args, query }) => query(w(args)),
    update: ({ args, query }) => query(w(args)),
    updateMany: ({ args, query }) => query(w(args)),
    delete: ({ args, query }) => query(w(args)),
    deleteMany: ({ args, query }) => query(w(args)),
    // create/createMany/upsert: FK already tied to tenant-verified parent
  };
}

function buildExtensionConfig(scopeMap: ScopeMap, scopeValue: unknown): Record<string, Record<string, QueryHook>> {
  const config: Record<string, Record<string, QueryHook>> = {};
  for (const [model, key] of Object.entries(scopeMap)) {
    config[model] = buildHooks(key, scopeValue);
  }
  return config;
}

function buildNestedExtensionConfig(
  nestedScopeMap: NestedScopeMap,
  scopeValue: unknown,
): Record<string, Record<string, QueryHook>> {
  const config: Record<string, Record<string, QueryHook>> = {};
  for (const [model, { relation, key }] of Object.entries(nestedScopeMap)) {
    config[model] = buildNestedHooks(relation, key, scopeValue);
  }
  return config;
}

// ---------------------------------------------------------------------------
// Proxy: block access to non-scoped models
// ---------------------------------------------------------------------------

function blockUnscopedModels<T extends object>(client: T, allowedModels: Set<string>, userType: string): T {
  return new Proxy(client, {
    get(target, prop, receiver) {
      // Allow $-prefixed Prisma internals ($transaction, $connect, $extends, $on, $use, $disconnect)
      if (typeof prop === 'string' && prop.startsWith('$')) {
        return Reflect.get(target, prop, receiver);
      }
      // Allow symbols (Symbol.iterator etc.) and non-string keys
      if (typeof prop !== 'string') {
        return Reflect.get(target, prop, receiver);
      }
      // Allowlist: only models present in the active scope maps
      if (!allowedModels.has(prop) && prop in (target as Record<string, unknown>)) {
        throw new Error(
          `[scoped-prisma] Model "${prop}" is not tenant-scoped for ${userType} sessions. ` +
            `Use the global prisma client with explicit scope, or extend INTERNAL_SCOPE / VENDOR_SCOPE.`,
        );
      }
      return Reflect.get(target, prop, receiver);
    },
  });
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

type ScopedPrisma = ReturnType<typeof createScopedPrisma>;
export type { ScopedPrisma };

export function createScopedPrisma(session: SessionData) {
  const scopeMap = session.userType === 'INTERNAL' ? INTERNAL_SCOPE : VENDOR_SCOPE;
  const nestedScopeMap = session.userType === 'INTERNAL' ? INTERNAL_NESTED_SCOPE : VENDOR_NESTED_SCOPE;
  const scopeValue = session.companyId;

  const flatConfig = buildExtensionConfig(scopeMap, scopeValue);
  const nestedConfig = buildNestedExtensionConfig(nestedScopeMap, scopeValue);

  const extended = prisma.$extends({
    query: { ...flatConfig, ...nestedConfig } as never,
  });

  const allowedModels = new Set([...Object.keys(scopeMap), ...Object.keys(nestedScopeMap)]);

  return blockUnscopedModels(extended as object, allowedModels, session.userType) as typeof extended;
}
