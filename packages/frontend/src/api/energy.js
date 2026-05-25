/**
 * Energy module API
 */
import { apiClient } from './client';
export const energyAPI = {
    getEnergyStores: async () => {
        const { data } = await apiClient.get('/energy/stores');
        return data.stores;
    },
    getEnergyStore: async (id) => {
        const { data } = await apiClient.get(`/energy/stores/${id}`);
        return data.store;
    },
};
