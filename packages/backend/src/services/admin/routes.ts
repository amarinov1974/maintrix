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
    const users = await prisma.internalUser.findMany({
      where: { companyId: req.session!.companyId },
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
    const user = await prisma.internalUser.create({
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
    
    // Verify user belongs to same company
    const existing = await prisma.internalUser.findFirst({
      where: { id, companyId: req.session!.companyId },
    });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = await prisma.internalUser.update({
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
    
    // Verify user belongs to same company
    const existing = await prisma.internalUser.findFirst({
      where: { id, companyId: req.session!.companyId },
    });
    if (!existing) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Soft delete — deactivate instead of delete
    await prisma.internalUser.update({
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
    const stores = await prisma.store.findMany({
      where: { companyId: req.session!.companyId },
      include: { region: true },
      orderBy: { name: 'asc' },
    });
    res.json({ stores });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stores' });
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
    const regions = await prisma.region.findMany({
      where: { companyId: req.session!.companyId },
      orderBy: { name: 'asc' },
    });
    res.json({ regions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

export default router;
