/**
 * CSRF Protection Middleware
 * Validates that requests include x-requested-with header.
 * Prevents cross-site request forgery attacks while maintaining
 * iOS/Safari compatibility.
 */
import type { Request, Response, NextFunction } from 'express';

export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF check for GET, HEAD, OPTIONS (read-only, safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    next();
    return;
  }

  // Skip for QR endpoint (scanned by external devices without our frontend)
  if (req.path.startsWith('/api/qr')) {
    next();
    return;
  }

  // Skip for gate-login (needed before frontend is fully loaded)
  if (req.path === '/api/auth/gate-login') {
    next();
    return;
  }

  const requestedWith = req.headers['x-requested-with'];
  if (requestedWith !== 'XMLHttpRequest') {
    res.status(403).json({ error: 'CSRF validation failed' });
    return;
  }

  next();
}
