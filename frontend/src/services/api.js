import axios from 'axios';

// In development, default to local backend (http://localhost:5000/api).
// In production (behind Ingress / Nginx reverse proxy), default to relative path '/api'.
// Explicit VITE_API_URL environment variable always takes precedence if provided.
const defaultApiUrl = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';
const rawUrl = import.meta.env.VITE_API_URL || defaultApiUrl;
const API_BASE_URL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl.replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Bearer token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('campuscare_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear invalid credentials
      localStorage.removeItem('campuscare_token');
      localStorage.removeItem('campuscare_user');

      // Only redirect if not already on /login or /register
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
