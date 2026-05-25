/**
 * Stores API (for AMM store selector on Submit Ticket)
 */
import { apiClient } from './client';
export const storesAPI = {
    list: async () => {
        const { data } = await apiClient.get('/stores');
        return data.stores;
    },
};
