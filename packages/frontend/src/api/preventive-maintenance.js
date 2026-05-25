/**
 * Preventive Maintenance API
 */
import { apiClient } from './client';
export const preventiveMaintenanceAPI = {
    parseFile: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await apiClient.post('/preventive-maintenance/parse', formData);
        return data;
    },
    importPlans: async (rows) => {
        const { data } = await apiClient.post('/preventive-maintenance/import', { rows });
        return data;
    },
    listPlans: async () => {
        const { data } = await apiClient.get('/preventive-maintenance/plans');
        return data.plans;
    },
    createWorkOrdersFromPlans: async (planIds) => {
        const { data } = await apiClient.post('/preventive-maintenance/create-work-orders', { planIds });
        return data;
    },
};
