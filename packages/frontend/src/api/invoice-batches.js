/**
 * Invoice Batches API — create batch from approved cost proposals, download recap PDF.
 */
import { apiClient } from './client';
export const invoiceBatchesAPI = {
    create(workOrderIds) {
        return apiClient
            .post('/invoice-batches', { workOrderIds })
            .then((res) => res.data);
    },
    /** Returns URL path to download PDF (same origin). Open in new tab or use as download link. */
    getPdfUrl(batchId) {
        const base = apiClient.defaults.baseURL ?? '';
        return `${base}/invoice-batches/${batchId}/pdf`;
    },
    async getPdfBlob(batchId) {
        const { data } = await apiClient.get(`/invoice-batches/${batchId}/pdf`, {
            responseType: 'blob',
        });
        return data;
    },
};
