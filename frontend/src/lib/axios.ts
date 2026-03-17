import axios from 'axios';

const api = axios.create({
    baseURL: `${process.env.NEXT_PUBLIC_API_URL ?? ''}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the token (skip for public auth endpoints)
api.interceptors.request.use(
    (config) => {
        const isPublicAuth = typeof config.url === 'string' && /^\/auth\/(login|forgot-password|reset-password)/.test(config.url);
        if (typeof window !== 'undefined' && !isPublicAuth) {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }

            const activeBranchId = localStorage.getItem('activeBranchId');
            if (activeBranchId) {
                config.headers['x-branch-id'] = activeBranchId;
            } else {
                const rawUser = localStorage.getItem('user');
                if (rawUser) {
                    try {
                        const parsed = JSON.parse(rawUser);
                        const fallbackBranchId = parsed?.activeBranch?.id || parsed?.branchId;
                        if (fallbackBranchId) {
                            config.headers['x-branch-id'] = fallbackBranchId;
                        }
                    } catch {
                        // Ignore malformed user data in storage
                    }
                }
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
