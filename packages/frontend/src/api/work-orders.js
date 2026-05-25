/**
 * Work Orders API (Extended)
 */
import { apiClient } from './client';
export const workOrdersAPI = {
    getPriceList: async (vendorCompanyId) => {
        const params = vendorCompanyId != null ? { vendorCompanyId } : {};
        const { data } = await apiClient.get('/work-orders/price-list', { params });
        return data.items;
    },
    list: async (params) => {
        const { data } = await apiClient.get('/work-orders', { params });
        return data.workOrders;
    },
    getById: async (id) => {
        const { data } = await apiClient.get(`/work-orders/${id}`);
        return data;
    },
    create: async (request) => {
        const { data } = await apiClient.post(`/tickets/${request.ticketId}/create-work-order`, {
            ticketId: request.ticketId,
            vendorCompanyId: request.vendorCompanyId,
            description: request.description,
        });
        return data;
    },
    assignTechnician: async (request) => {
        const { data } = await apiClient.post(`/work-orders/${request.workOrderId}/assign-technician`, {
            technicianUserId: request.technicianUserId,
            eta: request.eta,
        });
        return data;
    },
    checkIn: async (request) => {
        const body = {
            qrToken: request.qrToken,
        };
        if (request.techCountConfirmed != null && request.techCountConfirmed >= 1) {
            body.techCountConfirmed = request.techCountConfirmed;
        }
        const { data } = await apiClient.post(`/work-orders/${request.workOrderId}/checkin`, body);
        return data;
    },
    checkOut: async (request) => {
        const { data } = await apiClient.post(`/work-orders/${request.workOrderId}/checkout`, {
            qrToken: request.qrToken,
            outcome: request.outcome,
            comment: request.comment,
            workReport: request.workReport,
        });
        return data;
    },
    submitCostProposal: async (request) => {
        const { data } = await apiClient.post(`/work-orders/${request.workOrderId}/submit-cost-proposal`, { invoiceRows: request.invoiceRows });
        return data;
    },
    returnForClarification: async (workOrderId, comment) => {
        const { data } = await apiClient.post(`/work-orders/${workOrderId}/return-for-clarification`, { comment });
        return data;
    },
    resendToVendor: async (workOrderId, comment) => {
        const { data } = await apiClient.post(`/work-orders/${workOrderId}/resend-to-vendor`, { comment });
        return data;
    },
    returnForTechCount: async (workOrderId, comment) => {
        const { data } = await apiClient.post(`/work-orders/${workOrderId}/return-for-tech-count`, { comment });
        return data;
    },
    reject: async (workOrderId, reason) => {
        const { data } = await apiClient.post(`/work-orders/${workOrderId}/reject`, { reason });
        return data;
    },
    recordOpened: async (workOrderId) => {
        await apiClient.post(`/work-orders/${workOrderId}/opened`);
    },
    approveCostProposal: async (workOrderId) => {
        const { data } = await apiClient.post(`/work-orders/${workOrderId}/approve-cost`, {});
        return data;
    },
    requestCostRevision: async (workOrderId, comment) => {
        const { data } = await apiClient.post(`/work-orders/${workOrderId}/request-revision`, { comment });
        return data;
    },
    closeWithoutCost: async (workOrderId) => {
        const { data } = await apiClient.post(`/work-orders/${workOrderId}/close-without-cost`, {});
        return data;
    },
};
