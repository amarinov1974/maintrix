/**
 * Energy module routes — store energy profiles and meters (ADMIN only)
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';

const router = Router();
router.use(requireAuth);

router.use((req, res, next) => {
  if (req.session?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
});

const storeInclude = {
  region: { select: { id: true, name: true } },
  energyMeters: {
    orderBy: [{ isMainMeter: 'desc' as const }, { meterName: 'asc' as const }],
  },
};

/**
 * GET /api/energy/stores
 */
router.get('/stores', async (_req, res) => {
  try {
    const stores = await prisma.store.findMany({
      where: { active: true },
      include: storeInclude,
      orderBy: { name: 'asc' },
    });
    res.json({ stores });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list energy stores';
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/energy/stores/:id
 */
router.get('/stores/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid store id' });
      return;
    }
    const store = await prisma.store.findUnique({
      where: { id },
      include: storeInclude,
    });
    if (!store) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }
    res.json({ store });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get energy store';
    res.status(500).json({ error: message });
  }
});

export default router;
