/**
 * Auth Routes
 */

import crypto from 'crypto';
import { Router, Request, Response, NextFunction } from 'express';
import { authService } from './auth-service.js';
import type { DemoLoginRequest } from './types.js';
import { prisma } from '../../config/database.js';
import {
  isGateEnabled,
  verifyGateCredentials,
  verifyGateToken,
  getGateCookieOpts,
  GATE_COOKIE,
} from './gate.js';

function createGateToken(): string {
  const secret = process.env.SESSION_SECRET!;
  const payload = JSON.stringify({ t: Date.now() });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

const router = Router();

function getGateToken(req: Request): string | undefined {
  const fromHeader = req.headers['x-gate-token'];
  if (typeof fromHeader === 'string' && fromHeader) return fromHeader;
  const v = req.cookies?.[GATE_COOKIE];
  if (typeof v === 'string') return v;
  return undefined;
}

/** Require gate auth for demo login and user lists. Skip if gate is disabled. */
function requireGate(req: Request, res: Response, next: NextFunction): void {
  if (!isGateEnabled()) return next();
  const token = getGateToken(req);
  if (verifyGateToken(token)) return next();
  res.status(401).json({ error: 'Access denied. Please log in first.', gateRequired: true });
}

/**
 * GET /api/auth/gate-status
 * Check if gate is enabled and if client has passed it.
 */
router.get('/gate-status', (req, res) => {
  try {
    const token = getGateToken(req);
    res.json({
      gateEnabled: isGateEnabled(),
      authenticated: !isGateEnabled() || verifyGateToken(token),
    });
  } catch (err) {
    console.error('Gate-status error:', err);
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/auth/gate-login
 * Login with username/password to pass the gate. Sets cookie on success.
 */
router.post('/gate-login', (req, res) => {
  const { username = '', password = '' } = (req.body as { username?: string; password?: string }) ?? {};
  if (!verifyGateCredentials(String(username), String(password))) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }
  const token = createGateToken();
  res.cookie(GATE_COOKIE, token, getGateCookieOpts());
  res.json({ success: true, token });
});

/**
 * POST /api/auth/gate-logout
 * Clear gate cookie (e.g. when user wants to re-enter credentials).
 */
router.post('/gate-logout', (req, res) => {
  res.clearCookie(GATE_COOKIE);
  res.json({ success: true });
});

/**
 * POST /api/auth/demo-login
 * Demo login endpoint (requires gate if enabled)
 */
router.post('/demo-login', requireGate, async (req, res) => {
  try {
    const request = req.body as DemoLoginRequest;

    if (!request.userType || request.userId == null) {
      res.status(400).json({ error: 'Missing userType or userId' });
      return;
    }

    const result = await authService.demoLogin(request);

    if (result.success && result.sessionId) {
      res.cookie('cmms_session', result.sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 10 * 60 * 1000, // 10 minutes
      });

      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Logout endpoint (supports cookie or x-session-id header for iOS/Safari)
 */
router.post('/logout', async (req, res) => {
  let sessionId = req.cookies?.cmms_session ?? req.headers['x-session-id'];
  if (Array.isArray(sessionId)) sessionId = sessionId[0];
  if (typeof sessionId === 'string' && sessionId.trim()) {
    await authService.logout(sessionId.trim());
  }
  res.clearCookie('cmms_session');
  res.json({ success: true });
});

/**
 * GET /api/auth/session
 * Get current session info
 */
router.get('/session', async (req, res) => {
  let sessionId = req.cookies?.cmms_session ?? req.headers['x-session-id'];
  if (Array.isArray(sessionId)) sessionId = sessionId[0];
  if (typeof sessionId !== 'string' || !sessionId.trim()) {
    res.status(401).json({ error: 'No session' });
    return;
  }

  const session = await authService.validateSession(sessionId.trim());

  if (!session) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }

  // Send a plain object with string role so the client always gets a consistent shape
  res.json({
    session: {
      userId: session.userId,
      role: String(session.role ?? ''),
      userType: session.userType,
      companyId: session.companyId,
      userName: session.userName,
      companyName: session.companyName,
      storeId: session.storeId,
      storeName: session.storeName,
      regionId: session.regionId,
      regionName: session.regionName,
      servicedCompanyName: session.servicedCompanyName,
    },
  });
});

const INTERNAL_ROLE_ORDER = ['SM', 'AM', 'AMM', 'D', 'C2', 'C3', 'BOD'];

/**
 * GET /api/auth/users/internal
 * Get list of internal users (for demo login dropdown), ordered by role then store.
 * Requires gate if enabled.
 */
router.get('/users/internal', requireGate, async (_req, res) => {
  try {
    const users = await prisma.internalUser.findMany({
      where: { active: true },
      include: {
        company: true,
        store: true,
        region: true,
      },
    });

    const roleOrder = (role: string) => {
      const i = INTERNAL_ROLE_ORDER.indexOf(role);
      return i === -1 ? 999 : i;
    };

    const roleStr = (r: { role: string }): string => String(r.role);

    const sorted = [...users].sort((a, b) => {
      const roleA = roleOrder(roleStr(a));
      const roleB = roleOrder(roleStr(b));
      if (roleA !== roleB) return roleA - roleB;
      if (roleStr(a) === 'SM' && roleStr(b) === 'SM') {
        return (a.storeId ?? 0) - (b.storeId ?? 0);
      }
      return a.name.localeCompare(b.name);
    });

    res.json({
      users: sorted.map((u) => ({
        id: u.id,
        name: u.name,
        role: roleStr(u),
        companyId: u.companyId,
        companyName: u.company?.name ?? '',
        storeId: u.storeId ?? undefined,
        storeName: u.store?.name ?? undefined,
        regionId: u.regionId ?? undefined,
        regionName: u.region?.name ?? undefined,
      })),
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get users error:', err);
    const message = process.env.NODE_ENV !== 'production' ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

const VENDOR_ROLE_ORDER = ['S1', 'S2', 'S3'];

/**
 * GET /api/auth/users/vendor
 * Get list of vendor users (for demo login dropdown), ordered by role.
 * Requires gate if enabled.
 */
router.get('/users/vendor', requireGate, async (_req, res) => {
  try {
    const users = await prisma.vendorUser.findMany({
      where: { active: true },
      include: {
        vendorCompany: true,
      },
    });

    const roleOrder = (role: string) => {
      const i = VENDOR_ROLE_ORDER.indexOf(role);
      return i === -1 ? 999 : i;
    };

    const roleStr = (r: { role: string }): string => String(r.role);

    const sorted = [...users].sort((a, b) => {
      const roleA = roleOrder(roleStr(a));
      const roleB = roleOrder(roleStr(b));
      if (roleA !== roleB) return roleA - roleB;
      return a.name.localeCompare(b.name);
    });

    res.json({
      users: sorted.map((u) => ({
        id: u.id,
        name: u.name,
        role: roleStr(u),
        vendorCompanyId: u.vendorCompanyId,
        vendorCompanyName: u.vendorCompany?.name ?? '',
      })),
    });
  } catch (error) {
    const err = error as Error;
    console.error('Get vendor users error:', err);
    const message = process.env.NODE_ENV !== 'production' ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  }
});

export default router;
