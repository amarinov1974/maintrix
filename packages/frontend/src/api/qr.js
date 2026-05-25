/**
 * QR API
 */
import { apiClient } from './client';
export const qrAPI = {
    generate: async (request) => {
        const { data } = await apiClient.post('/qr/generate', request);
        return data;
    },
};
