/**
 * Gate auth — protects entry screen with username/password before demo login.
 * If GATE_USERNAME and GATE_PASSWORD are not set, gate is disabled.
 */

import crypto from 'crypto';

const GATE_COOKIE = 'cmms_gate';
const GATE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

function getGateConfig(): { username: string; password: string } | null {
  const u = process.env.GATE_USERNAME?.trim();
  const p = process.env.GATE_PASSWORD;
  if (!u || p === undefined) return null;
  return { username: u, password: String(p) };
}

export function isGateEnabled(): boolean {
  return getGateConfig() != null;
}

export function verifyGateCredentials(username: string, password: string): boolean {
  const cfg = getGateConfig();
  if (!cfg) return true; // gate disabled, allow
  return (
    username.trim() === cfg.username &&
    password === cfg.password
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createGateToken(): string {
  const secret = process.env.SESSION_SECRET!;
  const payload = JSON.stringify({ t: Date.now() });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyGateToken(token: string | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const cfg = getGateConfig();
  if (!cfg) return true; // gate disabled
  const [payloadB64, sigB64] = token.split('.');
  if (!payloadB64 || !sigB64) return false;
  const secret = process.env.SESSION_SECRET!;
  const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
  if (sigB64 !== expectedSig) return false;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    const age = Date.now() - (payload.t ?? 0);
    return age >= 0 && age < GATE_MAX_AGE_MS;
  } catch {
    return false;
  }
}

export function getGateCookieOpts() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
    maxAge: GATE_MAX_AGE_MS,
  };
}

export { GATE_COOKIE };
