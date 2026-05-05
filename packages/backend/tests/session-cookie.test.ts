import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SessionManager } from '../src/services/session/session-manager.js';

const baseConfig = {
  secret: 'test-secret',
  timeoutMinutes: 15,
  cookieName: 'cmms_session',
};

describe('SessionManager.getCookieOpts', () => {
  const originalEnv = process.env.NODE_ENV;
  beforeEach(() => {
    delete process.env.NODE_ENV;
  });
  afterEach(() => {
    if (originalEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnv;
  });

  it('uses lax + insecure in non-production (Vite proxy / plain HTTP localhost)', () => {
    process.env.NODE_ENV = 'development';
    const opts = new SessionManager(baseConfig).getCookieOpts();
    expect(opts.secure).toBe(false);
    expect(opts.sameSite).toBe('lax');
    expect(opts.httpOnly).toBe(true);
    expect(opts.path).toBe('/');
  });

  it('uses none + secure in production (cross-site Railway frontend ↔ backend)', () => {
    process.env.NODE_ENV = 'production';
    const opts = new SessionManager(baseConfig).getCookieOpts();
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe('none');
    expect(opts.httpOnly).toBe(true);
  });

  it('reflects timeoutMinutes from config in maxAge (ms)', () => {
    const opts = new SessionManager({ ...baseConfig, timeoutMinutes: 30 }).getCookieOpts();
    expect(opts.maxAge).toBe(30 * 60 * 1000);
  });
});
