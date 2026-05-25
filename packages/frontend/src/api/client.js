/**
 * API Client
 * Axios instance with base config
 * Supports cookies (desktop) and localStorage + x-session-id header (iOS/Safari)
 */
import axios from 'axios';
export const SESSION_STORAGE_KEY = 'cmms_session';
export const GATE_TOKEN_KEY = 'cmms_gate_token';
// Use relative /api in dev so Vite proxy works; avoids CORS and wrong host/port
const apiKey = import.meta.env.VITE_API_KEY;
export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? '/api',
    withCredentials: true, // Send cookies (desktop)
    headers: {
        'Content-Type': 'application/json',
        ...(typeof apiKey === 'string' && apiKey
            ? { 'x-api-key': apiKey }
            : {}),
    },
});
// Request interceptor: send x-session-id from localStorage for iOS/Safari compatibility
apiClient.interceptors.request.use((config) => {
    // FormData: remove Content-Type so axios sets multipart/form-data with boundary
    if (config.data instanceof FormData) {
        delete config.headers['Content-Type'];
    }
    // CSRF protection header - backend validates this is present
    config.headers['x-requested-with'] = 'XMLHttpRequest';
    if (typeof window !== 'undefined') {
        const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
        if (sessionId) {
            config.headers['x-session-id'] = sessionId;
        }
        const gateToken = localStorage.getItem(GATE_TOKEN_KEY);
        if (gateToken) {
            config.headers['x-gate-token'] = gateToken;
        }
        // Ensure x-api-key is sent on every request (in case headers weren't set at create time)
        const key = import.meta.env.VITE_API_KEY;
        if (typeof key === 'string' && key) {
            config.headers['x-api-key'] = key;
        }
    }
    return config;
});
// Response interceptor for error handling
apiClient.interceptors.response.use((response) => response, (error) => {
    if (error.response?.status === 401 &&
        typeof window !== 'undefined' &&
        window.location.pathname !== '/') {
        // Session expired - redirect to entry (avoid redirect loop when on entry)
        window.location.href = '/';
    }
    return Promise.reject(error);
});
