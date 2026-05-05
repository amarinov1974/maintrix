/**
 * Ticket Routes
 */

import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { ticketService } from './ticket-service.js';
import { addTicketAttachment, getAttachmentForDownload } from '../attachment/attachment-service.js';
import type {
  CreateTicketRequest,
  RequestClarificationRequest,
  SubmitUpdatedTicketRequest,
  RejectTicketRequest,
  WithdrawTicketRequest,
  AddCommentRequest,
  ListTicketsQuery,
  SubmitCostEstimationRequest,
  ApproveCostEstimationRequest,
  ReturnCostEstimationRequest,
  CreateWorkOrderRequest,
  ArchiveTicketRequest,
} from './types.js';

const router = Router();

const uploadsDir = process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads');

const ticketAttachmentStorage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const ticketId = parseInt(req.params.id, 10);
    if (Number.isNaN(ticketId)) return cb(new Error('Invalid ticket id'), '');
    const dir = path.join(uploadsDir, 'tickets', String(ticketId));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const uploadTicketAttachment = multer({
  storage: ticketAttachmentStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: JPG, PNG, GIF, WebP, PDF, Word, Excel`));
    }
  },
});

router.use(requireAuth);

// Governance: vendors must never see or own tickets; they only see work orders.
router.use((req, res, next) => {
  if (req.session?.userType === 'VENDOR') {
    res.status(403).json({ error: 'Vendors cannot access tickets' });
    return;
  }
  next();
});

router.post('/', async (req, res) => {
  try {
    const request = req.body as CreateTicketRequest;
    const ticket = await ticketService.createTicket(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.status(201).json(ticket);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Create ticket failed';
    console.error('Create ticket error:', error);
    res.status(400).json({ error: message });
  }
});

router.post('/:id/submit', async (req, res) => {
  try {
    const ticket = await ticketService.submitTicket(
      { ticketId: parseInt(req.params.id, 10) },
      req.session!.userId,
      req.session!.role
    );
    res.json(ticket);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Submit failed';
    console.error('Submit ticket error:', error);
    res.status(400).json({ error: message });
  }
});

router.post('/:id/request-clarification', async (req, res) => {
  try {
    const request = { ...req.body, ticketId: parseInt(req.params.id, 10) } as RequestClarificationRequest;
    const ticket = await ticketService.requestClarification(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(ticket);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Request clarification failed';
    console.error('Request clarification error:', error);
    res.status(400).json({ error: message });
  }
});

router.post('/:id/submit-updated', async (req, res) => {
  try {
    const request = { ...req.body, ticketId: parseInt(req.params.id, 10) } as SubmitUpdatedTicketRequest;
    const ticket = await ticketService.submitUpdatedTicket(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(ticket);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Submit updated failed';
    console.error('Submit updated ticket error:', error);
    res.status(400).json({ error: message });
  }
});

router.post('/:id/approve-for-estimation', async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    const ticket = await ticketService.approveForEstimation(
      ticketId,
      req.session!.userId,
      req.session!.role
    );
    res.json(ticket);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Approve for estimation failed';
    console.error('Approve for estimation error:', error);
    res.status(400).json({ error: message });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const request = { ...req.body, ticketId: parseInt(req.params.id, 10) } as RejectTicketRequest;
    const ticket = await ticketService.rejectTicket(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(ticket);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Reject failed';
    console.error('Reject ticket error:', error);
    res.status(400).json({ error: message });
  }
});

router.post('/:id/withdraw', async (req, res) => {
  try {
    const request = { ...req.body, ticketId: parseInt(req.params.id, 10) } as WithdrawTicketRequest;
    const ticket = await ticketService.withdrawTicket(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(ticket);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Withdraw failed';
    console.error('Withdraw ticket error:', error);
    res.status(400).json({ error: message });
  }
});

router.post('/:id/comments', async (req, res) => {
  try {
    const request = { ...req.body, ticketId: parseInt(req.params.id, 10) } as AddCommentRequest;
    await ticketService.addComment(request, req.session!.userId);
    res.status(201).json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Add comment failed';
    console.error('Add comment error:', error);
    res.status(400).json({ error: message });
  }
});

router.post('/:id/attachments', uploadTicketAttachment.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const ticketId = parseInt(req.params.id, 10);
    const internalFlag = req.body.internalFlag !== 'false' && req.body.internalFlag !== false;
    const result = await addTicketAttachment(
      ticketId,
      req.file.path,
      req.file.originalname || req.file.filename,
      req.session!.userId,
      req.session!.companyId,
      internalFlag
    );
    res.status(201).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    console.error('Ticket attachment upload error:', error);
    res.status(400).json({ error: message });
  }
});

router.get('/attachments/:id/download', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: 'Invalid attachment id' });
      return;
    }
    const att = await getAttachmentForDownload(
      id,
      req.session!.companyId,
      req.session!.userType
    );
    res.download(path.resolve(att.filePath), att.fileName, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ error: 'Download failed' });
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Not found';
    res.status(404).json({ error: message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const ticket = await ticketService.getTicket(
      parseInt(req.params.id, 10),
      req.session!.userId,
      req.session!.companyId
    );
    res.json(ticket);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Not found';
    console.error('Get ticket error:', error);
    res.status(404).json({ error: message });
  }
});

router.get('/', async (req, res) => {
  try {
    const tickets = await ticketService.listTickets({
      companyId: req.session!.companyId,
      status: req.query.status as ListTicketsQuery['status'],
      urgent: req.query.urgent === 'true' ? true : req.query.urgent === 'false' ? false : undefined,
      storeId: req.query.storeId ? parseInt(req.query.storeId as string, 10) : undefined,
      regionId: req.query.regionId ? parseInt(req.query.regionId as string, 10) : undefined,
      createdByUserId: req.query.createdByUserId
        ? parseInt(req.query.createdByUserId as string, 10)
        : undefined,
      currentOwnerUserId: req.query.currentOwnerUserId
        ? parseInt(req.query.currentOwnerUserId as string, 10)
        : undefined,
      participatedByUserId: req.query.participatedByUserId
        ? parseInt(req.query.participatedByUserId as string, 10)
        : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined,
    });
    res.json({ tickets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'List failed';
    console.error('List tickets error:', error);
    res.status(500).json({ error: message });
  }
});

router.post('/:id/submit-cost-estimation', async (req, res) => {
  try {
    const request = { ...req.body, ticketId: parseInt(req.params.id, 10) } as SubmitCostEstimationRequest;
    const result = await ticketService.submitCostEstimation(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Submit cost estimation failed';
    console.error('Submit cost estimation error:', error);
    res.status(400).json({ error: message });
  }
});

router.post('/:id/approve-cost-estimation', async (req, res) => {
  try {
    const request = { ...req.body, ticketId: parseInt(req.params.id, 10) } as ApproveCostEstimationRequest;
    const ticket = await ticketService.approveCostEstimation(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(ticket);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Approve cost estimation failed';
    console.error('Approve cost estimation error:', error);
    res.status(400).json({ error: message });
  }
});

router.post('/:id/return-cost-estimation', async (req, res) => {
  try {
    const request = { ...req.body, ticketId: parseInt(req.params.id, 10) } as ReturnCostEstimationRequest;
    const ticket = await ticketService.returnCostEstimation(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(ticket);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Return cost estimation failed';
    console.error('Return cost estimation error:', error);
    res.status(400).json({ error: message });
  }
});

router.post('/:id/create-work-order', async (req, res) => {
  try {
    const request = { ...req.body, ticketId: parseInt(req.params.id, 10) } as CreateWorkOrderRequest;
    const result = await ticketService.createWorkOrder(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.status(201).json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Create work order failed';
    console.error('Create work order error:', error);
    res.status(400).json({ error: message });
  }
});

router.post('/:id/archive', async (req, res) => {
  try {
    const request: ArchiveTicketRequest = { ticketId: parseInt(req.params.id, 10) };
    const ticket = await ticketService.archiveTicket(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(ticket);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Archive ticket failed';
    console.error('Archive ticket error:', error);
    res.status(400).json({ error: message });
  }
});

export default router;
