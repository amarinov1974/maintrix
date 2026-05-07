/**
 * Store routes - list stores (for AMM store selector on Submit Ticket)
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const session = req.session!;
    if (session.userType !== 'INTERNAL') {
      res.json({ stores: [] });
      return;
    }
    const where: { regionId?: number; active?: boolean } = { active: true };
    if (session.role === 'AMM' && session.regionId != null) {
      where.regionId = session.regionId;
    }
    if (session.role === 'SM') {
      if (session.storeId != null) {
        const store = await req.scopedPrisma!.store.findUnique({
          where: { id: session.storeId },
        });
        res.json({ stores: store ? [{ id: store.id, name: store.name, address: store.address }] : [] });
        return;
      }
      res.json({ stores: [] });
      return;
    }
    const stores = await req.scopedPrisma!.store.findMany({
      where,
      select: { id: true, name: true, address: true },
      orderBy: { name: 'asc' },
    });
    res.json({ stores });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'List stores failed';
    res.status(400).json({ error: message });
  }
});

export default router;
