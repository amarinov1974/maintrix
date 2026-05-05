/**
 * Tickets API
 */

import { apiClient } from './client';

export interface CreateTicketRequest {
  storeId: number;
  category: string;
  description: string;
  urgent: boolean;
  assetId?: number;
}

export interface Ticket {
  id: number;
  storeId: number;
  storeName: string;
  createdByUserId: number;
  createdByUserName: string;
  category: string;
  description: string;
  /** Original description at creation (use for previews); falls back to description */
  originalDescription?: string | null;
  urgent: boolean;
  currentStatus: string;
  currentOwnerUserId: number | null;
  currentOwnerUserName: string | null;
  assetId?: number | null;
  assetDescription?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketDetail extends Ticket {
  createdByUserRole?: string | null;
  currentOwnerUserRole?: string | null;
  /** When status is Awaiting Creator Response: who requested clarification (assignee can only return to this role) */
  clarificationRequestedByUserId?: number | null;
  clarificationRequestedByUserName?: string | null;
  clarificationRequestedByUserRole?: string | null;
  /** Internal role codes (SM, AM, AMM, D, C2, BOD) that have participated in the ticket; for clarification "send to" dropdown */
  involvedInternalRoles?: string[];
  submittedAt?: string | null;
  originalDescription?: string | null;
  comments: Comment[];
  auditLog: AuditLogEntry[];
  attachments?: AttachmentEntry[];
  costEstimation?: CostEstimation;
  approvalRecords?: ApprovalRecord[];
}

export interface AttachmentEntry {
  id: number;
  fileName: string;
  createdAt: string;
  internalFlag: boolean;
}

export interface Comment {
  id: number;
  authorUserId: number;
  authorUserName: string;
  text: string;
  internalFlag: boolean;
  createdAt: string;
}

export interface AuditLogEntry {
  id: number;
  prevStatus: string | null;
  newStatus: string;
  actionType: string;
  actorId: number;
  actorName: string;
  actorRole?: string | null;
  comment: string | null;
  createdAt: string;
}

export interface CostEstimation {
  ticketId: number;
  estimatedAmount: number;
  createdByUserId: number;
  createdByUserName: string;
  createdAt: string;
}

export interface ApprovalRecord {
  id: number;
  approverUserId: number;
  approverUserName: string;
  role: string;
  decision: 'APPROVED' | 'RETURNED' | 'REJECTED';
  comment: string | null;
  createdAt: string;
}

export const ticketsAPI = {
  list: async (params?: {
    status?: string;
    urgent?: boolean;
    storeId?: number;
    regionId?: number;
    currentOwnerUserId?: number;
    participatedByUserId?: number;
  }) => {
    const { data } = await apiClient.get<{ tickets: Ticket[] }>('/tickets', {
      params,
    });
    return data.tickets;
  },

  getById: async (id: number) => {
    const { data } = await apiClient.get<TicketDetail>(`/tickets/${id}`);
    return data;
  },

  create: async (request: CreateTicketRequest) => {
    const { data } = await apiClient.post<Ticket>('/tickets', request);
    return data;
  },

  submit: async (ticketId: number) => {
    const { data } = await apiClient.post<Ticket>(
      `/tickets/${ticketId}/submit`
    );
    return data;
  },

  submitUpdated: async (
    ticketId: number,
    updatedDescription?: string,
    comment?: string,
    assetId?: number
  ) => {
    const { data } = await apiClient.post<Ticket>(
      `/tickets/${ticketId}/submit-updated`,
      { updatedDescription, comment, assetId }
    );
    return data;
  },

  withdraw: async (ticketId: number, reason?: string) => {
    const { data } = await apiClient.post<Ticket>(
      `/tickets/${ticketId}/withdraw`,
      { reason }
    );
    return data;
  },

  addComment: async (ticketId: number, text: string) => {
    await apiClient.post(`/tickets/${ticketId}/comments`, { text });
  },

  requestClarification: async (ticketId: number, comment: string, assignToRole?: string) => {
    const { data } = await apiClient.post<Ticket>(
      `/tickets/${ticketId}/request-clarification`,
      { comment, assignToRole: assignToRole || 'SM' }
    );
    return data;
  },

  reject: async (ticketId: number, reason: string) => {
    const { data } = await apiClient.post<Ticket>(
      `/tickets/${ticketId}/reject`,
      { reason }
    );
    return data;
  },

  submitCostEstimation: async (
    ticketId: number,
    estimatedAmount: number
  ) => {
    const { data } = await apiClient.post<{ ticketId: number; estimatedAmount: number }>(
      `/tickets/${ticketId}/submit-cost-estimation`,
      { estimatedAmount }
    );
    return data;
  },

  archive: async (ticketId: number) => {
    const { data } = await apiClient.post<Ticket>(
      `/tickets/${ticketId}/archive`
    );
    return data;
  },

  approveForEstimation: async (ticketId: number) => {
    const { data } = await apiClient.post<Ticket>(
      `/tickets/${ticketId}/approve-for-estimation`
    );
    return data;
  },

  approveCostEstimation: async (ticketId: number, comment?: string) => {
    const { data } = await apiClient.post<Ticket>(
      `/tickets/${ticketId}/approve-cost-estimation`,
      { comment }
    );
    return data;
  },

  returnCostEstimation: async (ticketId: number, comment: string) => {
    const { data } = await apiClient.post<Ticket>(
      `/tickets/${ticketId}/return-cost-estimation`,
      { comment }
    );
    return data;
  },

  /** Upload a file attachment to a ticket. */
  uploadAttachment: async (
    ticketId: number,
    file: File,
    internalFlag: boolean = true
  ): Promise<AttachmentEntry> => {
    const form = new FormData();
    form.append('file', file);
    form.append('internalFlag', String(internalFlag));
    // Use apiClient so the request gets x-requested-with (CSRF),
    // x-api-key, and x-session-id (iOS Safari) automatically.
    const { data } = await apiClient.post<AttachmentEntry>(
      `/tickets/${ticketId}/attachments`,
      form
    );
    return data;
  },

  /**
   * Download an attachment via apiClient (carries CSRF + session headers),
   * then trigger a browser save with the original file name.
   */
  downloadAttachment: async (attachmentId: number, fileName: string): Promise<void> => {
    const res = await apiClient.get<Blob>(`/tickets/attachments/${attachmentId}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
