import axios from 'axios';

// 1. Precise environment detection
const hostname = window.location.hostname;
const isLocal = hostname.includes('localhost') ||
    hostname.includes('127.0.0.1') ||
    hostname.startsWith('192.168.');

// 2. Determine the API Base URL
// Priority: 
// - If NOT local, ALWAYS use the production gateway (bypasses baked-in localhost envs)
// - If local, use VITE_API_URL or fallback to localhost:3000
const PRODUCTION_GATEWAY = 'https://api-gateway-production-d887.up.railway.app';
export const API_BASE_URL = !isLocal
    ? PRODUCTION_GATEWAY
    : (import.meta.env.VITE_API_URL || 'http://localhost:3000');

console.log('[API] Environment Detection:', {
    hostname,
    isLocal,
    selectedBaseUrl: API_BASE_URL
});

const api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
            const { token } = JSON.parse(authStorage).state;
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Only trigger logout if we got an actual response with 401/403 status
        // AND it's not a preflight (OPTIONS) error
        if (error.response) {
            const status = error.response.status;

            if (status === 401 || status === 403) {
                console.warn(`[API] Auth failure (${status}) on ${error.config?.url}. Clearing session...`);

                // Only clear and redirect if we aren't already on the login page
                if (!window.location.pathname.includes('/login')) {
                    localStorage.removeItem('auth-storage');
                    window.location.href = '/login?reason=auth_expired';
                }
            }
        } else if (error.request) {
            // The request was made but no response was received
            console.error('[API] Network Error or Connection Blocked:', error.message);
        }

        return Promise.reject(error);
    }
);

export default api;
