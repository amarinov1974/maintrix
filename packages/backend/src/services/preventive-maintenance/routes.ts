/**
 * Preventive Maintenance Routes
 * ADMIN role: parse Excel/CSV, preview, import plans
 */

import multer from 'multer';
import { Router } from 'express';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.js';
import { InternalRoles } from '../../types/roles.js';
import * as pmService from './preventive-maintenance-service.js';

const router = Router();
router.use(requireAuth);
router.use(requireRole(InternalRoles.MAINTENANCE_ADMIN));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * POST /api/preventive-maintenance/parse
 * Upload Excel/CSV, parse and return preview (no DB write)
 */
router.post('/parse', upload.single('file'), (req, res) => {
  try {
    const file = req.file;
    if (!file?.buffer) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const result = pmService.parsePmFile(file.buffer);
    res.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Parse failed';
    res.status(400).json({ error: msg });
  }
});

/**
 * POST /api/preventive-maintenance/import
 * Import parsed rows into DB (after user confirms preview)
 */
router.post('/import', async (req, res) => {
  try {
    const session = req.session;
    if (!session || session.userType !== 'INTERNAL' || !session.companyId) {
      res.status(403).json({ error: 'Internal user session required' });
      return;
    }

    const rows = req.body.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: 'No rows to import' });
      return;
    }

    const { created, errors } = await pmService.importPmPlans(
      session.companyId,
      session.userId,
      rows
    );

    res.json({
      success: true,
      created,
      errors: errors.length > 0 ? errors : undefined,
      summary: `Imported ${created} plan(s)${errors.length > 0 ? `, ${errors.length} row(s) failed` : ''}.`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Import failed';
    res.status(400).json({ error: msg });
  }
});

/**
 * POST /api/preventive-maintenance/create-work-orders
 * Create tickets and work orders from selected PM plan IDs
 */
router.post('/create-work-orders', async (req, res) => {
  try {
    const session = req.session;
    if (!session || session.userType !== 'INTERNAL' || !session.companyId) {
      res.status(403).json({ error: 'Internal user session required' });
      return;
    }

    const planIds = Array.isArray(req.body.planIds)
      ? req.body.planIds.map((id: unknown) => parseInt(String(id), 10)).filter((n: number) => !Number.isNaN(n) && n > 0)
      : [];

    if (planIds.length === 0) {
      res.status(400).json({ error: 'No plan IDs provided' });
      return;
    }

    const { created, errors } = await pmService.createWorkOrdersFromPlans(
      planIds,
      session.companyId,
      session.userId
    );

    res.json({
      success: true,
      created,
      errors: errors.length > 0 ? errors : undefined,
      summary: `Created ${created} work order(s)${errors.length > 0 ? `, ${errors.length} failed` : ''}.`,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Create work orders failed';
    res.status(400).json({ error: msg });
  }
});

/**
 * GET /api/preventive-maintenance/plans
 * List PM plans for the company
 */
router.get('/plans', async (req, res) => {
  try {
    const session = req.session;
    if (!session || session.userType !== 'INTERNAL' || !session.companyId) {
      res.status(403).json({ error: 'Internal user session required' });
      return;
    }

    const plans = await req.scopedPrisma!.preventiveMaintenancePlan.findMany({
      include: {
        asset: { select: { id: true, description: true, storeId: true } },
        store: { select: { id: true, name: true } },
        vendorCompany: { select: { id: true, name: true } },
        vendorUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ plans });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to list plans';
    res.status(500).json({ error: msg });
  }
});

export default router;
