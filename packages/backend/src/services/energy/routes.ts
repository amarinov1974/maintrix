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

function parseDateQuery(dateParam: string | undefined): {
  dateLabel: string;
  start: Date;
  end: Date;
} {
  let base: Date;
  if (dateParam != null && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const [y, m, d] = dateParam.split('-').map(Number);
    base = new Date(y, m - 1, d);
  } else {
    base = new Date();
    base.setHours(0, 0, 0, 0);
  }
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
  const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 23, 59, 59, 999);
  const dateLabel = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  return { dateLabel, start, end };
}

/**
 * GET /api/energy/stores/:id/readings?date=YYYY-MM-DD
 */
router.get('/stores/:id/readings', async (req, res) => {
  try {
    const storeId = parseInt(req.params.id, 10);
    if (Number.isNaN(storeId)) {
      res.status(400).json({ error: 'Invalid store id' });
      return;
    }

    const { dateLabel, start, end } = parseDateQuery(
      typeof req.query.date === 'string' ? req.query.date : undefined
    );

    const mainMeter = await prisma.energyMeter.findFirst({
      where: { storeId, isMainMeter: true, active: true },
    });

    if (!mainMeter) {
      res.status(404).json({ error: 'Main energy meter not found for this store' });
      return;
    }

    const readings = await prisma.energyReading.findMany({
      where: {
        energyMeterId: mainMeter.id,
        intervalStart: { gte: start, lte: end },
      },
      orderBy: { intervalStart: 'asc' },
    });

    let totalKwh = 0;
    let vtKwh = 0;
    let ntKwh = 0;
    let peakKw = 0;

    for (const r of readings) {
      totalKwh += r.activeEnergyKwh;
      if (r.tariff === 'VT') vtKwh += r.activeEnergyKwh;
      else if (r.tariff === 'NT') ntKwh += r.activeEnergyKwh;
      if (r.peakPowerKw != null && r.peakPowerKw > peakKw) peakKw = r.peakPowerKw;
    }

    const round = (n: number) => Math.round(n * 10) / 10;

    res.json({
      date: dateLabel,
      meterId: mainMeter.id,
      meterName: mainMeter.meterName,
      readings,
      summary: {
        totalKwh: round(totalKwh),
        peakKw: round(peakKw),
        vtKwh: round(vtKwh),
        ntKwh: round(ntKwh),
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get energy readings';
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
