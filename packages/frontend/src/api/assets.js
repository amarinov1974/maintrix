import { apiClient } from './client';
export const assetsAPI = {
    getById: async (id) => {
        try {
            const { data } = await apiClient.get(`/assets/${id}`);
            return data;
        }
        catch (err) {
            const status = err?.response?.status;
            if (status === 404)
                return null;
            throw err;
        }
    },
    listByStore: async (storeId) => {
        const { data } = await apiClient.get(`/assets?storeId=${storeId}&limit=100`);
        return data.assets;
    },
};
