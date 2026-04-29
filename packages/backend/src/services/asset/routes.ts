/**
 * Asset routes
 */
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';

const router = Router();
router.use(requireAuth);

/**
 * GET /api/assets
 * List all assets for the company, optionally filtered by storeId
 */
router.get('/', async (req, res) => {
  try {
    const { storeId, categoryId, status, search } = req.query;
    const companyId = req.session!.companyId;

    const assets = await prisma.asset.findMany({
      where: {
        store: { companyId },
        active: true,
        ...(storeId ? { storeId: parseInt(storeId as string, 10) } : {}),
        ...(categoryId ? { categoryId: parseInt(categoryId as string, 10) } : {}),
        ...(status ? { status: status as 'ACTIVE' | 'FAULTY' | 'IN_SERVICE' | 'DECOMMISSIONED' } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { serialNumber: { contains: search as string, mode: 'insensitive' } },
            { manufacturer: { contains: search as string, mode: 'insensitive' } },
          ]
        } : {}),
      },
      include: {
        store: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, depreciationYears: true, depreciationRate: true } },
      },
      orderBy: [{ store: { name: 'asc' } }, { name: 'asc' }],
    });

    // Calculate current book value for each asset
    const assetsWithValue = assets.map((asset) => {
      let currentValue: number | null = null;
      const cat = asset.category;
      if (asset.purchaseValue && asset.purchaseDate && cat) {
        const ageYears = (Date.now() - asset.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
        const depreciation = Number(asset.purchaseValue) * (Number(cat.depreciationRate) / 100) * ageYears;
        currentValue = Math.max(0, Number(asset.purchaseValue) - depreciation);
      }
      return { ...asset, currentValue: currentValue ? Math.round(currentValue * 100) / 100 : null };
    });

    res.json({ assets: assetsWithValue });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

/**
 * GET /api/assets/categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.assetCategory.findMany({
      where: { companyId: req.session!.companyId, active: true },
      orderBy: { name: 'asc' },
    });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * GET /api/assets/:id
 * Get single asset by ID (existing endpoint for ticket submit)
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }
    const asset = await prisma.asset.findFirst({
      where: { id, store: { companyId: req.session!.companyId } },
      include: {
        store: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, depreciationYears: true, depreciationRate: true } },
      },
    });
    if (!asset) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    let currentValue: number | null = null;
    const cat = asset.category;
    if (asset.purchaseValue && asset.purchaseDate && cat) {
      const ageYears = (Date.now() - asset.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      const depreciation = Number(asset.purchaseValue) * (Number(cat.depreciationRate) / 100) * ageYears;
      currentValue = Math.max(0, Number(asset.purchaseValue) - depreciation);
    }

    res.json({ ...asset, currentValue: currentValue ? Math.round(currentValue * 100) / 100 : null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

export default router;
