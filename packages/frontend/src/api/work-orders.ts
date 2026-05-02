/**
 * Work Orders API (Extended)
 */

import { apiClient } from './client';

export interface WorkOrder {
  id: number;
  ticketId: number;
  vendorCompanyId: number;
  vendorCompanyName: string;
  assignedTechnicianId: number | null;
  assignedTechnicianName: string | null;
  eta: string | null;
  currentStatus: string;
  currentOwnerType: 'INTERNAL' | 'VENDOR';
  currentOwnerId: number;
  declaredTechCount: number | null;
  checkinTs: string | null;
  checkoutTs: string | null;
  createdAt: string;
  updatedAt: string;
  /** Set when WO is in an invoice batch (locked from double invoicing) */
  invoiceBatchId?: number | null;
  storeName?: string;
  storeAddress?: string | null;
  category?: string;
  urgent?: boolean;
  commentToVendor?: string | null;
}

export interface WorkOrderAuditLogEntry {
  id: number;
  createdAt: string;
  actionType: string;
  prevStatus: string | null;
  newStatus: string;
  actorType: string;
  actorId: number;
  comment: string | null;
  actorName: string;
  actorRole: string | null;
}

export interface VisitPair {
  checkinTs: string;
  checkoutTs: string | null;
}

export interface WorkOrderDetail extends WorkOrder {
  workReport: WorkReportRow[];
  invoiceRows: InvoiceRow[];
  totalCost?: number;
  openedAt?: string | null;
  attachments?: Array<{ id: number; fileName: string }>;
  assetDescription?: string | null;
  /** History of actions (newest first) */
  auditLog?: WorkOrderAuditLogEntry[];
  /** Visit periods for billing: arrivals = length, labor = sum of durations */
  visitPairs?: VisitPair[];
}

export interface WorkReportRow {
  description: string;
  unit: string;
  /** Free-form quantity line (matches paper work order flexibility) */
  quantity: string;
}

export interface InvoiceRow {
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

export interface CreateWorkOrderRequest {
  ticketId: number;
  vendorCompanyId: number;
  description?: string;
}

export interface AssignTechnicianRequest {
  workOrderId: number;
  technicianUserId: number;
  eta: string;
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
  comment?: string;
  workReport: WorkReportRow[];
}

export interface SubmitCostProposalRequest {
  workOrderId: number;
  invoiceRows: {
    description: string;
    unit: string;
    quantity: number;
    pricePerUnit: number;
    priceListItemId?: number;
  }[];
}

export interface VendorPriceListItem {
  id: number;
  category: string;
  description: string;
  unit: string;
  pricePerUnit: number;
  selectableInUI?: boolean;
  unitMinutes?: number | null;
}

export const workOrdersAPI = {
  getPriceList: async (vendorCompanyId?: number) => {
    const params = vendorCompanyId != null ? { vendorCompanyId } : {};
    const { data } = await apiClient.get<{ items: VendorPriceListItem[] }>(
      '/work-orders/price-list',
      { params }
    );
    return data.items;
  },

  list: async (params?: {
    currentOwnerId?: number;
    vendorCompanyId?: number;
    ticketId?: number;
    storeId?: number;
    regionId?: number;
    currentStatus?: string;
    currentOwnerType?: 'INTERNAL' | 'VENDOR';
    urgent?: boolean;
  }) => {
    const { data } = await apiClient.get<{ workOrders: WorkOrder[] }>(
      '/work-orders',
      { params }
    );
    return data.workOrders;
  },

  getById: async (id: number) => {
    const { data } = await apiClient.get<WorkOrderDetail>(`/work-orders/${id}`);
    return data;
  },

  create: async (request: CreateWorkOrderRequest) => {
    const { data } = await apiClient.post<{ workOrderId: number }>(
      `/tickets/${request.ticketId}/create-work-order`,
      {
        ticketId: request.ticketId,
        vendorCompanyId: request.vendorCompanyId,
        description: request.description,
      }
    );
    return data;
  },

  assignTechnician: async (request: AssignTechnicianRequest) => {
    const { data } = await apiClient.post<WorkOrder>(
      `/work-orders/${request.workOrderId}/assign-technician`,
      {
        technicianUserId: request.technicianUserId,
        eta: request.eta,
      }
    );
    return data;
  },

  checkIn: async (request: CheckInRequest) => {
    const body: { qrToken: string; techCountConfirmed?: number } = {
      qrToken: request.qrToken,
    };
    if (request.techCountConfirmed != null && request.techCountConfirmed >= 1) {
      body.techCountConfirmed = request.techCountConfirmed;
    }
    const { data } = await apiClient.post<WorkOrder>(
      `/work-orders/${request.workOrderId}/checkin`,
      body
    );
    return data;
  },

  checkOut: async (request: CheckOutRequest) => {
    const { data } = await apiClient.post<WorkOrder>(
      `/work-orders/${request.workOrderId}/checkout`,
      {
        qrToken: request.qrToken,
        outcome: request.outcome,
        comment: request.comment,
        workReport: request.workReport,
      }
    );
    return data;
  },

  submitCostProposal: async (request: SubmitCostProposalRequest) => {
    const { data } = await apiClient.post<WorkOrderDetail>(
      `/work-orders/${request.workOrderId}/submit-cost-proposal`,
      { invoiceRows: request.invoiceRows }
    );
    return data;
  },

  returnForClarification: async (workOrderId: number, comment: string) => {
    const { data } = await apiClient.post<WorkOrder>(
      `/work-orders/${workOrderId}/return-for-clarification`,
      { comment }
    );
    return data;
  },

  resendToVendor: async (workOrderId: number, comment?: string) => {
    const { data } = await apiClient.post<WorkOrder>(
      `/work-orders/${workOrderId}/resend-to-vendor`,
      { comment }
    );
    return data;
  },

  returnForTechCount: async (workOrderId: number, comment?: string) => {
    const { data } = await apiClient.post<WorkOrder>(
      `/work-orders/${workOrderId}/return-for-tech-count`,
      { comment }
    );
    return data;
  },

  reject: async (workOrderId: number, reason: string) => {
    const { data } = await apiClient.post<WorkOrder>(
      `/work-orders/${workOrderId}/reject`,
      { reason }
    );
    return data;
  },

  recordOpened: async (workOrderId: number) => {
    await apiClient.post(`/work-orders/${workOrderId}/opened`);
  },

  approveCostProposal: async (workOrderId: number) => {
    const { data } = await apiClient.post<WorkOrder>(
      `/work-orders/${workOrderId}/approve-cost`,
      {}
    );
    return data;
  },

  requestCostRevision: async (workOrderId: number, comment: string) => {
    const { data } = await apiClient.post<WorkOrder>(
      `/work-orders/${workOrderId}/request-revision`,
      { comment }
    );
    return data;
  },

  closeWithoutCost: async (workOrderId: number) => {
    const { data } = await apiClient.post<WorkOrder>(
      `/work-orders/${workOrderId}/close-without-cost`,
      {}
    );
    return data;
  },
};
