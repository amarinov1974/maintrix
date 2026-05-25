/**
 * Auth API
 */
import { apiClient, SESSION_STORAGE_KEY, GATE_TOKEN_KEY } from './client';
export const authAPI = {
    getGateStatus: async () => {
        const { data } = await apiClient.get('/auth/gate-status');
        return data;
    },
    gateLogin: async (username, password) => {
        const { data } = await apiClient.post('/auth/gate-login', {
            username,
            password,
        });
        if (data.success && data.token && typeof window !== 'undefined') {
            localStorage.setItem(GATE_TOKEN_KEY, data.token);
        }
        return data;
    },
    gateLogout: async () => {
        await apiClient.post('/auth/gate-logout');
        if (typeof window !== 'undefined') {
            localStorage.removeItem(GATE_TOKEN_KEY);
        }
    },
    demoLogin: async (request) => {
        const { data } = await apiClient.post('/auth/demo-login', request);
        return data;
    },
    getSession: async () => {
        const { data } = await apiClient.get('/auth/session');
        return data;
    },
    logout: async () => {
        await apiClient.post('/auth/logout');
        if (typeof window !== 'undefined') {
            localStorage.removeItem(SESSION_STORAGE_KEY);
        }
    },
    getInternalUsers: async () => {
        const { data } = await apiClient.get('/auth/users/internal');
        return data.users;
    },
    getVendorUsers: async () => {
        const { data } = await apiClient.get('/auth/users/vendor');
        return data.users;
    },
};
