/**
 * Work Order Service Types
 */

import type { WorkOrderStatusType } from '../../types/statuses.js';

export interface AssignTechnicianRequest {
  workOrderId: number;
  technicianUserId: number; // S2 user ID
  eta: Date;
}

export interface CheckInRequest {
  workOrderId: number;
  qrToken: string;
  /** If SM declared wrong count, S2 can correct; must be >= 1 when provided */
  techCountConfirmed?: number;
}

export interface CheckOutRequest {
  workOrderId: number;
  qrToken: string;
  outcome: 'FIXED' | 'FOLLOW_UP' | 'NEW_WO_NEEDED' | 'UNSUCCESSFUL';
  comment?: string; // Required for non-FIXED outcomes
  workReport: WorkReportRow[];
}

export interface WorkReportRow {
  description: string;
  unit: string;
  /** Free-form (same semantics as handwritten paper work order line) */
  quantity: string;
}

export interface SubmitCostProposalRequest {
  workOrderId: number;
  invoiceRows: InvoiceRow[];
}

export interface InvoiceRow {
  description: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;
  priceListItemId?: number;
}

export interface ApproveCostProposalRequest {
  workOrderId: number;
}

export interface RequestCostRevisionRequest {
  workOrderId: number;
  comment: string;
}

export interface CloseWithoutCostRequest {
  workOrderId: number;
}

export interface ReturnForClarificationRequest {
  workOrderId: number;
  comment: string;
}

export interface ResendToVendorRequest {
  workOrderId: number;
  /** Optional AMM comment when resending to vendor */
  comment?: string;
}

export interface ReturnForTechCountRequest {
  workOrderId: number;
  comment?: string;
}

export interface RejectWorkOrderRequest {
  workOrderId: number;
  reason: string;
}

export interface WorkOrderResponse {
  id: number;
  ticketId: number;
  vendorCompanyId: number;
  vendorCompanyName: string;
  assignedTechnicianId: number | null;
  assignedTechnicianName: string | null;
  eta: Date | null;
  currentStatus: WorkOrderStatusType;
  currentOwnerType: 'INTERNAL' | 'VENDOR';
  currentOwnerId: number;
  declaredTechCount: number | null;
  checkinTs: Date | null;
  checkoutTs: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Set when WO is included in an invoice batch (locked from double invoicing) */
  invoiceBatchId?: number | null;
  /** Optional for list (S1 preview): from linked ticket */
  storeName?: string;
  storeAddress?: string | null;
  category?: string;
  urgent?: boolean;
  commentToVendor?: string | null;
}

export interface WorkOrderDetailResponse extends WorkOrderResponse {
  workReport: WorkReportRow[];
  invoiceRows: InvoiceRowResponse[];
  totalCost?: number;
  /** S1/vendor detail: from linked ticket */
  storeName?: string;
  storeAddress?: string | null;
  category?: string;
  urgent?: boolean;
  commentToVendor?: string | null;
  /** Attachments (e.g. forwarded by AMM) */
  attachments?: Array<{ id: number; fileName: string }>;
  assetDescription?: string | null;
  openedAt?: Date | null;
  /** History of actions (newest first) */
  auditLog?: Array<{
    id: number;
    createdAt: Date;
    actionType: string;
    prevStatus: string | null;
    newStatus: string;
    actorType: string;
    actorId: number;
    comment: string | null;
    actorName: string;
    actorRole: string | null;
  }>;
  /** Visit periods (check-in/check-out pairs) for billing: arrivals = length, labor = sum of durations. Supports any number of visits (e.g. multiple follow-up visits). */
  visitPairs?: Array<{ checkinTs: Date; checkoutTs: Date | null }>;
}

export interface InvoiceRowResponse {
  id: number;
  rowNumber: number;
  description: string;
  unit: string;
  quantity: number;
  pricePerUnit: number;
  lineTotal: number;
  priceListItemId: number | null;
  warningFlag: boolean;
}
