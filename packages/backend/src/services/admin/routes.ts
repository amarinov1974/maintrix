/**
 * Admin Routes
 * Client admin panel — manage users, stores, vendors within company
 */
import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';

const router = Router();
router.use(requireAuth);

// Only ADMIN role can access these routes
router.use((req, res, next) => {
  if (req.session?.role !== 'ADMIN') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
});

// ============================================================================
// INTERNAL USERS
// ============================================================================

router.get('/users/internal', async (req, res) => {
  try {
    const users = await req.scopedPrisma!.internalUser.findMany({
      include: { store: true, region: true },
      orderBy: { name: 'asc' },
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/users/internal', async (req, res) => {
  try {
    const { name, email, role, storeId, regionId } = req.body;
    if (!name || !role) {
      res.status(400).json({ error: 'Name and role are required' });
      return;
    }
    const user = await req.scopedPrisma!.internalUser.create({
      data: {
        name,
        email: email || null,
        role,
        companyId: req.session!.companyId,
        storeId: storeId || null,
        regionId: regionId || null,
        active: true,
      },
      include: { store: true, region: true },
    });
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

router.put('/users/internal/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, email, role, storeId, regionId, active } = req.body;

    // Guard: ensures 404 instead of relying on scope-based mismatch
    const existing = await req.scopedPrisma!.internalUser.findFirst({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = await req.scopedPrisma!.internalUser.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email: email || null }),
        ...(role && { role }),
        ...(storeId !== undefined && { storeId: storeId || null }),
        ...(regionId !== undefined && { regionId: regionId || null }),
        ...(active !== undefined && { active }),
      },
      include: { store: true, region: true },
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.delete('/users/internal/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const existing = await req.scopedPrisma!.internalUser.findFirst({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Soft delete — deactivate instead of delete
    await req.scopedPrisma!.internalUser.update({
      where: { id },
      data: { active: false },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate user' });
  }
});

// ============================================================================
// VENDOR USERS
// ============================================================================

router.get('/users/vendor', async (req, res) => {
  try {
    const users = await prisma.vendorUser.findMany({
      include: { vendorCompany: true },
      orderBy: { name: 'asc' },
    });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor users' });
  }
});

router.post('/users/vendor', async (req, res) => {
  try {
    const { name, email, role, vendorCompanyId } = req.body;
    if (!name || !role || !vendorCompanyId) {
      res.status(400).json({ error: 'Name, role and vendor company are required' });
      return;
    }
    const user = await prisma.vendorUser.create({
      data: {
        name,
        email: email || null,
        role,
        vendorCompanyId: parseInt(vendorCompanyId, 10),
        active: true,
      },
      include: { vendorCompany: true },
    });
    res.status(201).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create vendor user' });
  }
});

router.put('/users/vendor/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, email, role, active } = req.body;

    const user = await prisma.vendorUser.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email !== undefined && { email: email || null }),
        ...(role && { role }),
        ...(active !== undefined && { active }),
      },
      include: { vendorCompany: true },
    });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vendor user' });
  }
});

router.delete('/users/vendor/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.vendorUser.update({
      where: { id },
      data: { active: false },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate vendor user' });
  }
});

// ============================================================================
// STORES & VENDOR COMPANIES (read only for now)
// ============================================================================

router.get('/stores', async (req, res) => {
  try {
    const stores = await req.scopedPrisma!.store.findMany({
      include: { region: true },
      orderBy: { name: 'asc' },
    });
    res.json({ stores });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

router.post('/stores', async (req, res) => {
  try {
    const { name, address, regionId, phone: _phone } = req.body;
    if (!name || !regionId) {
      res.status(400).json({ error: 'Name and region are required' });
      return;
    }
    const store = await req.scopedPrisma!.store.create({
      data: {
        name,
        address: address || null,
        regionId: parseInt(regionId, 10),
        companyId: req.session!.companyId,
        active: true,
      },
      include: { region: true },
    });
    res.status(201).json({ store });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create store' });
  }
});

router.put('/stores/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, address, regionId, active } = req.body;

    const existing = await req.scopedPrisma!.store.findFirst({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    const store = await req.scopedPrisma!.store.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(address !== undefined && { address: address || null }),
        ...(regionId && { regionId: parseInt(regionId, 10) }),
        ...(active !== undefined && { active }),
      },
      include: { region: true },
    });
    res.json({ store });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update store' });
  }
});

router.delete('/stores/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const existing = await req.scopedPrisma!.store.findFirst({
      where: { id },
    });
    if (!existing) {
      res.status(404).json({ error: 'Store not found' });
      return;
    }

    await req.scopedPrisma!.store.update({
      where: { id },
      data: { active: false },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate store' });
  }
});

router.get('/vendor-companies', async (req, res) => {
  try {
    const companies = await prisma.vendorCompany.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    res.json({ companies });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor companies' });
  }
});

router.get('/regions', async (req, res) => {
  try {
    const regions = await req.scopedPrisma!.region.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ regions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

router.get('/asset-categories', async (req, res) => {
  try {
    const categories = await req.scopedPrisma!.assetCategory.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch asset categories' });
  }
});

// ─── Assets ───────────────────────────────────────────────────────────────

router.get('/assets', async (req, res) => {
  try {
    const companyId = req.session!.companyId;
    const assets = await prisma.asset.findMany({
      where: { store: { companyId } },
      include: {
        store: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: [{ store: { name: 'asc' } }, { name: 'asc' }],
    });
    res.json({ assets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

router.post('/assets', async (req, res) => {
  try {
    const { name, storeId, categoryId, serialNumber, manufacturer, model,
            purchaseDate, warrantyExpiry, purchaseValue, status, notes } = req.body;
    // Provjeri da store pripada toj kompaniji
    const store = await req.scopedPrisma!.store.findFirst({ where: { id: Number(storeId) } });
    if (!store) { res.status(400).json({ error: 'Invalid store' }); return; }
    const asset = await prisma.asset.create({
      data: {
        name, storeId: Number(storeId),
        categoryId: categoryId ? Number(categoryId) : null,
        serialNumber: serialNumber || null,
        manufacturer: manufacturer || null,
        model: model || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        purchaseValue: purchaseValue ? Number(purchaseValue) : null,
        status: status || 'ACTIVE',
        notes: notes || null,
      },
      include: {
        store: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
    res.status(201).json({ asset });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create asset' });
  }
});

router.put('/assets/:id', async (req, res) => {
  try {
    const companyId = req.session!.companyId;
    const id = parseInt(req.params.id, 10);
    const { name, storeId, categoryId, serialNumber, manufacturer, model,
            purchaseDate, warrantyExpiry, purchaseValue, status, notes, active } = req.body;
    // Provjeri da asset pripada toj kompaniji
    const existing = await prisma.asset.findFirst({ where: { id, store: { companyId } } });
    if (!existing) { res.status(404).json({ error: 'Asset not found' }); return; }
    const asset = await prisma.asset.update({
      where: { id },
      data: {
        ...(name != null && { name }),
        ...(storeId != null && { storeId: Number(storeId) }),
        ...(categoryId !== undefined && { categoryId: categoryId ? Number(categoryId) : null }),
        ...(serialNumber !== undefined && { serialNumber: serialNumber || null }),
        ...(manufacturer !== undefined && { manufacturer: manufacturer || null }),
        ...(model !== undefined && { model: model || null }),
        ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
        ...(warrantyExpiry !== undefined && { warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null }),
        ...(purchaseValue !== undefined && { purchaseValue: purchaseValue ? Number(purchaseValue) : null }),
        ...(status != null && { status }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(active !== undefined && { active: Boolean(active) }),
      },
      include: {
        store: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
    });
    res.json({ asset });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update asset' });
  }
});

router.delete('/assets/:id', async (req, res) => {
  try {
    const companyId = req.session!.companyId;
    const id = parseInt(req.params.id, 10);
    const existing = await prisma.asset.findFirst({ where: { id, store: { companyId } } });
    if (!existing) { res.status(404).json({ error: 'Asset not found' }); return; }
    await prisma.asset.update({ where: { id }, data: { active: false } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to deactivate asset' });
  }
});

export default router;
