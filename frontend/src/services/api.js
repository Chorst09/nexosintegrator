// API Service Layer
import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
  timeout: import.meta.env.VITE_API_TIMEOUT || 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Methods
export const apiService = {
  // Auth
  auth: {
    login: (credentials) => api.post('/api/auth/login', credentials),
    logout: () => api.post('/api/auth/logout'),
    me: () => api.get('/api/auth/me'),
    refreshToken: () => api.post('/api/auth/refresh')
  },

  // Companies
  companies: {
    getAll: (params) => api.get('/api/companies', { params }),
    getById: (id) => api.get(`/api/companies/${id}`),
    create: (data) => api.post('/api/companies', data),
    update: (id, data) => api.put(`/api/companies/${id}`, data),
    delete: (id) => api.delete(`/api/companies/${id}`)
  },

  // Opportunities
  opportunities: {
    getAll: (params) => api.get('/api/opportunities', { params }),
    getById: (id) => api.get(`/api/opportunities/${id}`),
    create: (data) => api.post('/api/opportunities', data),
    update: (id, data) => api.put(`/api/opportunities/${id}`, data),
    delete: (id) => api.delete(`/api/opportunities/${id}`)
  },

  // Proposals
  proposals: {
    getAll: (params) => api.get('/api/proposals', { params }),
    getById: (id) => api.get(`/api/proposals/${id}`),
    create: (data) => api.post('/api/proposals', data),
    update: (id, data) => api.put(`/api/proposals/${id}`, data),
    delete: (id) => api.delete(`/api/proposals/${id}`),
    send: (id) => api.post(`/api/proposals/${id}/send`)
  },

  // Contracts
  contracts: {
    getAll: (params) => api.get('/api/contracts', { params }),
    getById: (id) => api.get(`/api/contracts/${id}`),
    create: (data) => api.post('/api/contracts', data),
    update: (id, data) => api.put(`/api/contracts/${id}`, data),
    delete: (id) => api.delete(`/api/contracts/${id}`),
    uploadAttachment: (id, file) => {
      const formData = new FormData();
      formData.append('file', file);
      return api.post(`/api/contracts/${id}/attachments`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    }
  },

  // Users
  users: {
    getAll: (params) => api.get('/api/users', { params }),
    getById: (id) => api.get(`/api/users/${id}`),
    create: (data) => api.post('/api/users', data),
    update: (id, data) => api.put(`/api/users/${id}`, data),
    delete: (id) => api.delete(`/api/users/${id}`)
  },

  // Products
  products: {
    getAll: (params) => api.get('/api/products', { params }),
    getById: (id) => api.get(`/api/products/${id}`),
    create: (data) => api.post('/api/products', data),
    update: (id, data) => api.put(`/api/products/${id}`, data),
    delete: (id) => api.delete(`/api/products/${id}`)
  },

  // Dashboard
  dashboard: {
    getStats: () => api.get('/api/dashboard/stats'),
    getCharts: () => api.get('/api/dashboard/charts')
  }
};

export default api;