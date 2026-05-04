import { describe, expect, it, vi, beforeEach } from 'vitest';

const { sessionManagerMock } = vi.hoisted(() => ({
  sessionManagerMock: {
    getSession: vi.fn(),
  },
}));

vi.mock('../src/services/session/session-manager.js', () => ({
  sessionManager: sessionManagerMock,
}));

import { requireAuth, requireRole, optionalAuth } from '../src/middleware/auth.middleware.js';
import type { Request, Response, NextFunction } from 'express';
import type { SessionData } from '../src/services/session/types.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeRes() {
  const res = {
    statusCode: 200,
    body: null as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    cookies: {},
    headers: {},
    session: undefined,
    ...overrides,
  } as unknown as Request;
}

const next = vi.fn() as unknown as NextFunction;

const validSession: SessionData = {
  userId: 1,
  role: 'AMM',
  userType: 'INTERNAL',
  companyId: 10,
  userName: 'Test User',
  companyName: 'Retail A',
  createdAt: new Date(),
  lastActivity: new Date(),
};

// ---------------------------------------------------------------------------
// requireAuth
// ---------------------------------------------------------------------------

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session cookie and no x-session-id header', async () => {
    const req = makeReq();
    const res = makeRes();

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: 'No session provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when session cookie provided but session not found', async () => {
    sessionManagerMock.getSession.mockResolvedValue(null);
    const req = makeReq({ cookies: { cmms_session: 'invalid-token' } });
    const res = makeRes();

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: 'Invalid or expired session' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when x-session-id header provided but session not found', async () => {
    sessionManagerMock.getSession.mockResolvedValue(null);
    const req = makeReq({ headers: { 'x-session-id': 'expired-token' } });
    const res = makeRes();

    await requireAuth(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches session to req and calls next() when session is valid', async () => {
    sessionManagerMock.getSession.mockResolvedValue(validSession);
    const req = makeReq({ cookies: { cmms_session: 'valid-token' } });
    const res = makeRes();

    await requireAuth(req, res, next);

    expect(req.session).toBe(validSession);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it('prefers cookie over x-session-id header when both present', async () => {
    sessionManagerMock.getSession.mockResolvedValue(validSession);
    const req = makeReq({
      cookies: { cmms_session: 'cookie-token' },
      headers: { 'x-session-id': 'header-token' },
    });
    const res = makeRes();

    await requireAuth(req, res, next);

    expect(sessionManagerMock.getSession).toHaveBeenCalledWith('cookie-token');
  });
});

// ---------------------------------------------------------------------------
// requireRole
// ---------------------------------------------------------------------------

describe('requireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when no session attached to req', () => {
    const req = makeReq();
    const res = makeRes();
    const middleware = requireRole('ADMIN');

    middleware(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ error: 'No session' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when session role does not match required role', () => {
    const req = makeReq({ session: { ...validSession, role: 'SM' } } as unknown as Partial<Request>);
    const res = makeRes();
    const middleware = requireRole('ADMIN');

    middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when vendor tries to access internal-only route', () => {
    const req = makeReq({
      session: { ...validSession, role: 'S1', userType: 'VENDOR' },
    } as unknown as Partial<Request>);
    const res = makeRes();
    const middleware = requireRole('SM', 'AM', 'AMM', 'D', 'C2', 'BOD', 'ADMIN');

    middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when session role matches single allowed role', () => {
    const req = makeReq({ session: { ...validSession, role: 'ADMIN' } } as unknown as Partial<Request>);
    const res = makeRes();
    const middleware = requireRole('ADMIN');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it('calls next() when session role is one of multiple allowed roles', () => {
    const req = makeReq({ session: { ...validSession, role: 'AMM' } } as unknown as Partial<Request>);
    const res = makeRes();
    const middleware = requireRole('AM', 'AMM', 'D');

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// optionalAuth
// ---------------------------------------------------------------------------

describe('optionalAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls next() even when no session provided', async () => {
    const req = makeReq();
    const res = makeRes();

    await optionalAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.session).toBeUndefined();
  });

  it('attaches session and calls next() when valid session present', async () => {
    sessionManagerMock.getSession.mockResolvedValue(validSession);
    const req = makeReq({ cookies: { cmms_session: 'valid-token' } });
    const res = makeRes();

    await optionalAuth(req, res, next);

    expect(req.session).toBe(validSession);
    expect(next).toHaveBeenCalledOnce();
  });

  it('calls next() without attaching session when session token is invalid', async () => {
    sessionManagerMock.getSession.mockResolvedValue(null);
    const req = makeReq({ cookies: { cmms_session: 'bad-token' } });
    const res = makeRes();

    await optionalAuth(req, res, next);

    expect(req.session).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });
});
