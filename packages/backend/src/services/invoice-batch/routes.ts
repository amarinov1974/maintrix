/**
 * Invoice Batch Routes
 * POST /invoice-batches — create batch from selected work order IDs
 * GET /invoice-batches/:id/pdf — download recap PDF
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import * as invoiceBatchService from './invoice-batch-service.js';

const router = Router();
router.use(requireAuth);

router.post('/', async (req, res) => {
  try {
    if (req.session?.userType !== 'VENDOR' || req.session?.companyId == null) {
      res.status(403).json({ error: 'Vendor access required' });
      return;
    }
    const workOrderIds = Array.isArray(req.body.workOrderIds)
      ? req.body.workOrderIds.map((id: unknown) => parseInt(String(id), 10)).filter((n: number) => !Number.isNaN(n))
      : [];
    const result = await invoiceBatchService.createBatch(
      workOrderIds,
      req.session.companyId,
      req.session.userId,
      req.scopedPrisma!
    );
    res.status(201).json({ batch: result, pdfUrl: result.pdfUrl });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create invoice batch';
    res.status(400).json({ error: message });
  }
});

router.get('/:id/pdf', async (req, res) => {
  try {
    if (req.session?.userType !== 'VENDOR' || req.session?.companyId == null) {
      res.status(403).json({ error: 'Vendor access required' });
      return;
    }
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid batch id' });
      return;
    }
    const batch = await invoiceBatchService.getBatchForVendor(id, req.session.companyId, req.scopedPrisma!);
    if (!batch?.pdfPath) {
      res.status(404).json({ error: 'Batch not found or PDF not available' });
      return;
    }
    const absolutePath = invoiceBatchService.resolveBatchPdfPath(batch.pdfPath);
    if (!absolutePath) {
      res.status(404).json({ error: 'PDF file not found' });
      return;
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-batch-${id}.pdf"`);
    res.sendFile(absolutePath);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get PDF';
    res.status(500).json({ error: message });
  }
});

export default router;
