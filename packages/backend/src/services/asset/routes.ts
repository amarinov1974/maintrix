/**
 * Asset routes
 */
import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { addAssetAttachment } from '../attachment/attachment-service.js';

const uploadsDir = process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads');

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const assetAttachmentStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const assetId = parseInt(req.params.id, 10);
    if (Number.isNaN(assetId)) return cb(new Error('Invalid asset id'), '');
    const dir = path.join(uploadsDir, 'assets', String(assetId));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const uploadAssetAttachment = multer({
  storage: assetAttachmentStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    ALLOWED_MIME_TYPES.includes(file.mimetype) ? cb(null, true) : cb(new Error('File type not allowed'));
  },
});

const router = Router();
router.use(requireAuth);

// Governance: vendors don't have asset access. Block at the router level
// to keep this consistent with how ticket routes handle it.
router.use((req, res, next) => {
  if (req.session?.userType === 'VENDOR') {
    res.status(403).json({ error: 'Vendors cannot access assets' });
    return;
  }
  next();
});

/**
 * GET /api/assets
 * List all assets for the company, optionally filtered by storeId
 */
router.get('/', async (req, res) => {
  try {
    const { storeId, categoryId, status, search, page, limit } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const db = req.scopedPrisma!;
    const where = {
      active: true,
      ...(storeId ? { storeId: parseInt(storeId as string, 10) } : {}),
      ...(categoryId ? { categoryId: parseInt(categoryId as string, 10) } : {}),
      ...(status ? { status: status as 'ACTIVE' | 'FAULTY' | 'IN_SERVICE' | 'DECOMMISSIONED' } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' as const } },
          { serialNumber: { contains: search as string, mode: 'insensitive' as const } },
          { manufacturer: { contains: search as string, mode: 'insensitive' as const } },
        ]
      } : {}),
    };

    const [assets, total] = await db.$transaction([
      db.asset.findMany({
        where,
        include: {
          store: { select: { id: true, name: true } },
          category: { select: { id: true, name: true, depreciationYears: true, depreciationRate: true } },
        },
        orderBy: [{ store: { name: 'asc' } }, { name: 'asc' }],
        skip,
        take: limitNum,
      }),
      db.asset.count({ where }),
    ]);

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

    res.json({
      assets: assetsWithValue,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

/**
 * GET /api/assets/categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await req.scopedPrisma!.assetCategory.findMany({
      where: { active: true },
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
    if (Number.isNaN(id)) { res.status(404).json({ error: 'Asset not found' }); return; }

    const asset = await req.scopedPrisma!.asset.findFirst({
      where: { id },
      include: {
        store: { select: { id: true, name: true } },
        category: { select: { id: true, name: true, depreciationYears: true, depreciationRate: true } },
        attachments: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, fileName: true, filePath: true, createdAt: true },
        },
        tickets: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, currentStatus: true, category: true,
            description: true, urgent: true, createdAt: true, updatedAt: true,
            createdBy: { select: { name: true } },
          },
        },
        workOrders: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true, currentStatus: true, createdAt: true, updatedAt: true,
            vendorCompany: { select: { name: true } },
            ticket: { select: { category: true } },
          },
        },
      },
    });

    if (!asset) { res.status(404).json({ error: 'Asset not found' }); return; }

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

router.post('/:id/attachments', uploadAssetAttachment.single('file'), async (req, res) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'No file uploaded' }); return; }
    const assetId = parseInt(req.params.id, 10);
    const result = await addAssetAttachment(
      assetId,
      req.file.path,
      req.file.originalname || req.file.filename,
      req.session!.userId,
      req.session!.companyId
    );
    res.status(201).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    res.status(400).json({ error: message });
  }
});

export default router;
