import axios from 'axios';

// 1. Precise environment detection
const getHostname = () => {
    try {
        return window.location.hostname || '';
    } catch (e) {
        return '';
    }
};

const hostname = getHostname();
const isLocal = hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.startsWith('192.168.') ||
    hostname.startsWith('10.') ||
    hostname.endsWith('.local');

// 2. Determine the API Base URL
const PRODUCTION_GATEWAY = 'https://api-gateway-production-d887.up.railway.app';
let selectedBaseUrl = '';

// CRITICAL: If we are on a production Railway domain, FORCE the production gateway
// This prevents issues where VITE_API_URL might be baked in as localhost:3000
if (hostname.endsWith('.railway.app') || (hostname && !isLocal)) {
    console.log('[API-V3] Production environment detected. Forcing production gateway.');
    selectedBaseUrl = PRODUCTION_GATEWAY;
} else {
    // Local dev logic
    selectedBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    console.log('[API-V3] Local environment detected.');
}

// Remove trailing slash if present
export const API_BASE_URL = selectedBaseUrl.replace(/\/$/, '');

console.log('[API-V3] Final Configuration:', {
    hostname,
    isLocal,
    selectedBaseUrl: API_BASE_URL,
    envViteUrl: import.meta.env.VITE_API_URL
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
        // AND it's not a network error (no response received)
        if (error.response) {
            const status = error.response.status;
            const isPreflight = error.config?.method === 'options';

            // Only clear auth on actual 401/403 responses (not network errors)
            if ((status === 401 || status === 403) && !isPreflight) {
                // Check if this is a real auth failure or just a network/CORS issue
                const url = error.config?.url || '';
                const baseURL = error.config?.baseURL || '';
                const isLocalhostCall = baseURL.includes('localhost:3000') || baseURL.includes('127.0.0.1:3000');

                // Don't logout if it's a localhost call (likely old cached build)
                if (isLocalhostCall) {
                    console.warn(`[API] Request to localhost detected. This may be a cached build issue.`);
                    console.warn(`[API] Request URL: ${url}`);
                    console.warn(`[API] Base URL: ${baseURL}`);
                    console.warn(`[API] Current API Base URL: ${API_BASE_URL}`);
                    console.warn(`[API] Please clear browser cache (Ctrl+Shift+R) or use Incognito mode.`);
                    // Don't clear auth - this is likely a cache issue
                    return Promise.reject(error);
                }

                // Check if this is a CORS preflight failure (no response body)
                const hasResponseData = error.response?.data;
                if (!hasResponseData && status === 403) {
                    console.warn(`[API] CORS or network issue detected (403 without response data). Not logging out.`);
                    return Promise.reject(error);
                }

                console.warn(`[API] Auth failure (${status}) on ${error.config?.url}. Clearing session...`);
                console.warn(`[API] Error Details:`, error.response?.data);

                // Only clear and redirect if we aren't already on the login page
                if (!window.location.pathname.includes('/login')) {
                    localStorage.removeItem('auth-storage');
                    // Use a small delay to prevent rapid redirects
                    setTimeout(() => {
                        window.location.href = '/login?reason=auth_expired';
                    }, 100);
                }
            }
        } else if (error.request) {
            // The request was made but no response was received (network error)
            console.error('[API] Network Error or Connection Blocked:', error.message);
            console.error('[API] Request URL:', error.config?.url);
            console.error('[API] Base URL:', error.config?.baseURL);

            // Don't clear auth on network errors - these are likely connectivity issues
            // or the old cached build calling localhost:3000
        }

        return Promise.reject(error);
    }
);

export default api;
