/**
 * Tickets API
 */
import { apiClient } from './client';
export const ticketsAPI = {
    list: async (params) => {
        const { data } = await apiClient.get('/tickets', {
            params,
        });
        return data.tickets;
    },
    getById: async (id) => {
        const { data } = await apiClient.get(`/tickets/${id}`);
        return data;
    },
    create: async (request) => {
        const { data } = await apiClient.post('/tickets', request);
        return data;
    },
    submit: async (ticketId) => {
        const { data } = await apiClient.post(`/tickets/${ticketId}/submit`);
        return data;
    },
    submitUpdated: async (ticketId, updatedDescription, comment, assetId) => {
        const { data } = await apiClient.post(`/tickets/${ticketId}/submit-updated`, { updatedDescription, comment, assetId });
        return data;
    },
    withdraw: async (ticketId, reason) => {
        const { data } = await apiClient.post(`/tickets/${ticketId}/withdraw`, { reason });
        return data;
    },
    addComment: async (ticketId, text) => {
        await apiClient.post(`/tickets/${ticketId}/comments`, { text });
    },
    requestClarification: async (ticketId, comment, assignToRole) => {
        const { data } = await apiClient.post(`/tickets/${ticketId}/request-clarification`, { comment, assignToRole: assignToRole || 'SM' });
        return data;
    },
    reject: async (ticketId, reason) => {
        const { data } = await apiClient.post(`/tickets/${ticketId}/reject`, { reason });
        return data;
    },
    submitCostEstimation: async (ticketId, estimatedAmount) => {
        const { data } = await apiClient.post(`/tickets/${ticketId}/submit-cost-estimation`, { estimatedAmount });
        return data;
    },
    archive: async (ticketId) => {
        const { data } = await apiClient.post(`/tickets/${ticketId}/archive`);
        return data;
    },
    approveForEstimation: async (ticketId) => {
        const { data } = await apiClient.post(`/tickets/${ticketId}/approve-for-estimation`);
        return data;
    },
    approveCostEstimation: async (ticketId, comment) => {
        const { data } = await apiClient.post(`/tickets/${ticketId}/approve-cost-estimation`, { comment });
        return data;
    },
    returnCostEstimation: async (ticketId, comment) => {
        const { data } = await apiClient.post(`/tickets/${ticketId}/return-cost-estimation`, { comment });
        return data;
    },
    /** Upload a file attachment to a ticket. */
    uploadAttachment: async (ticketId, file, internalFlag = true) => {
        const form = new FormData();
        form.append('file', file);
        form.append('internalFlag', String(internalFlag));
        // Use apiClient so the request gets x-requested-with (CSRF),
        // x-api-key, and x-session-id (iOS Safari) automatically.
        const { data } = await apiClient.post(`/tickets/${ticketId}/attachments`, form);
        return data;
    },
    /**
     * Download an attachment via apiClient (carries CSRF + session headers),
     * then trigger a browser save with the original file name.
     */
    downloadAttachment: async (attachmentId, fileName) => {
        const res = await apiClient.get(`/tickets/attachments/${attachmentId}/download`, {
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
