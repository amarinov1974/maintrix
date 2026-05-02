/**
 * Work Order Routes
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { workOrderService } from './work-order-service.js';
import { ticketService } from '../ticket/ticket-service.js';
import type {
  AssignTechnicianRequest,
  CheckInRequest,
  CheckOutRequest,
  SubmitCostProposalRequest,
  ApproveCostProposalRequest,
  RequestCostRevisionRequest,
  CloseWithoutCostRequest,
  ReturnForClarificationRequest,
  ResendToVendorRequest,
  ReturnForTechCountRequest,
  RejectWorkOrderRequest,
} from './types.js';

const router = Router();
router.use(requireAuth);

router.get('/price-list', async (req, res) => {
  try {
    const vendorCompanyId = req.query.vendorCompanyId
      ? parseInt(String(req.query.vendorCompanyId), 10)
      : (req.session?.userType === 'VENDOR' ? req.session?.companyId : undefined);
    if (vendorCompanyId == null) {
      res.status(400).json({ error: 'Vendor company required' });
      return;
    }
    const items = await workOrderService.getVendorPriceList(vendorCompanyId);
    res.json({ items });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load price list';
    res.status(400).json({ error: message });
  }
});

router.get('/', async (req, res) => {
  try {
    const vendorCompanyId = req.query.vendorCompanyId
      ? parseInt(String(req.query.vendorCompanyId), 10)
      : undefined;
    const currentOwnerId = req.query.currentOwnerId
      ? parseInt(String(req.query.currentOwnerId), 10)
      : undefined;
    const ticketId = req.query.ticketId
      ? parseInt(String(req.query.ticketId), 10)
      : undefined;
    const storeId = req.query.storeId
      ? parseInt(String(req.query.storeId), 10)
      : undefined;
    const regionId = req.query.regionId
      ? parseInt(String(req.query.regionId), 10)
      : undefined;
    const currentStatus = req.query.currentStatus as string | undefined;
    const currentOwnerType = req.query.currentOwnerType as 'INTERNAL' | 'VENDOR' | undefined;
    const urgent = req.query.urgent === 'true' ? true : req.query.urgent === 'false' ? false : undefined;
    const companyId = req.session!.companyId;
    const workOrders = await workOrderService.listWorkOrders({
      companyId,
      userType: req.session!.userType,
      vendorCompanyId,
      currentOwnerId,
      ticketId,
      storeId,
      regionId,
      currentStatus: currentStatus as any,
      currentOwnerType,
      urgent,
    });
    res.json({ workOrders });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'List failed';
    res.status(400).json({ error: message });
  }
});

router.post('/:id/assign-technician', async (req, res) => {
  try {
    const eta = req.body.eta != null ? new Date(req.body.eta) : undefined;
    const request: AssignTechnicianRequest = {
      workOrderId: parseInt(req.params.id, 10),
      technicianUserId: req.body.technicianUserId,
      eta: eta!,
    };
    const wo = await workOrderService.assignTechnician(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(wo);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Assign technician failed';
    res.status(400).json({ error: message });
  }
});

router.post('/:id/checkin', async (req, res) => {
  try {
    const request: CheckInRequest = {
      ...req.body,
      workOrderId: parseInt(req.params.id, 10),
    };
    const wo = await workOrderService.checkIn(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(wo);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Check-in failed';
    res.status(400).json({ error: message });
  }
});

router.post('/:id/checkout', async (req, res) => {
  try {
    const request: CheckOutRequest = {
      ...req.body,
      workOrderId: parseInt(req.params.id, 10),
    };
    const wo = await workOrderService.checkOut(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(wo);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Check-out failed';
    res.status(400).json({ error: message });
  }
});

router.post('/:id/submit-cost-proposal', async (req, res) => {
  try {
    const request: SubmitCostProposalRequest = {
      ...req.body,
      workOrderId: parseInt(req.params.id, 10),
    };
    const wo = await workOrderService.submitCostProposal(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(wo);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Submit cost proposal failed';
    res.status(400).json({ error: message });
  }
});

router.post('/:id/approve-cost', async (req, res) => {
  try {
    const request: ApproveCostProposalRequest = {
      workOrderId: parseInt(req.params.id, 10),
    };
    const wo = await workOrderService.approveCostProposal(
      request,
      req.session!.userId,
      req.session!.role
    );
    ticketService.tryAutoArchiveTicketIfAllWorkOrdersComplete(wo.ticketId).catch(() => {});
    res.json(wo);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Approve cost failed';
    res.status(400).json({ error: message });
  }
});

router.post('/:id/request-revision', async (req, res) => {
  try {
    const request: RequestCostRevisionRequest = {
      ...req.body,
      workOrderId: parseInt(req.params.id, 10),
    };
    const wo = await workOrderService.requestCostRevision(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(wo);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Request revision failed';
    res.status(400).json({ error: message });
  }
});

router.post('/:id/close-without-cost', async (req, res) => {
  try {
    const request: CloseWithoutCostRequest = {
      workOrderId: parseInt(req.params.id, 10),
    };
    const wo = await workOrderService.closeWithoutCost(
      request,
      req.session!.userId,
      req.session!.role
    );
    ticketService.tryAutoArchiveTicketIfAllWorkOrdersComplete(wo.ticketId).catch(() => {});
    res.json(wo);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Close without cost failed';
    res.status(400).json({ error: message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const wo = await workOrderService.getWorkOrder(
      parseInt(req.params.id, 10),
      { companyId: req.session!.companyId, userType: req.session!.userType }
    );
    res.json(wo);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Not found';
    res.status(404).json({ error: message });
  }
});

router.post('/:id/return-for-clarification', async (req, res) => {
  try {
    const request: ReturnForClarificationRequest = {
      workOrderId: parseInt(req.params.id, 10),
      comment: req.body.comment ?? '',
    };
    const wo = await workOrderService.returnForClarification(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(wo);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Return for clarification failed';
    res.status(400).json({ error: message });
  }
});

router.post('/:id/resend-to-vendor', async (req, res) => {
  try {
    const request: ResendToVendorRequest = {
      workOrderId: parseInt(req.params.id, 10),
      comment: req.body.comment,
    };
    const wo = await workOrderService.resendToVendor(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(wo);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Resend to vendor failed';
    res.status(400).json({ error: message });
  }
});

router.post('/:id/return-for-tech-count', async (req, res) => {
  try {
    const request: ReturnForTechCountRequest = {
      workOrderId: parseInt(req.params.id, 10),
      comment: req.body.comment,
    };
    const wo = await workOrderService.returnForTechCount(
      request,
      req.session!.userId,
      req.session!.role
    );
    res.json(wo);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Return for tech count failed';
    res.status(400).json({ error: message });
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const request: RejectWorkOrderRequest = {
      workOrderId: parseInt(req.params.id, 10),
      reason: req.body.reason ?? '',
    };
    const wo = await workOrderService.rejectWorkOrder(
      request,
      req.session!.userId,
      req.session!.role
    );
    ticketService.tryAutoArchiveTicketIfAllWorkOrdersComplete(wo.ticketId).catch(() => {});
    res.json(wo);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Reject work order failed';
    res.status(400).json({ error: message });
  }
});

router.post('/:id/opened', async (req, res) => {
  try {
    await workOrderService.recordWorkOrderOpened(
      parseInt(req.params.id, 10),
      req.session!.userId
    );
    res.json({ success: true });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Record opened failed';
    res.status(400).json({ error: message });
  }
});

export default router;
