import type { Request, Response, NextFunction } from 'express';
import { createScopedPrisma, type ScopedPrisma } from '../lib/scoped-prisma.js';

declare global {
  namespace Express {
    interface Request {
      scopedPrisma?: ScopedPrisma;
    }
  }
}

/**
 * Attaches req.scopedPrisma as a lazy getter so route handlers get an
 * automatically-scoped Prisma client for the current tenant.
 *
 * Runs globally (before per-router requireAuth), but the getter is evaluated
 * lazily — req.session is already set by the time any route handler reads it.
 *
 * Usage in a route handler:
 *   const db = req.scopedPrisma;   // undefined if no session (public route)
 *   const tickets = await db?.ticket.findMany();  // auto-scoped to session.companyId
 */
export function scopeMiddleware(req: Request, _res: Response, next: NextFunction): void {
  let _client: ScopedPrisma | undefined;

  Object.defineProperty(req, 'scopedPrisma', {
    get(): ScopedPrisma | undefined {
      if (_client == null && req.session != null) {
        _client = createScopedPrisma(req.session);
      }
      return _client;
    },
    configurable: true,
    enumerable: false,
  });

  next();
}
