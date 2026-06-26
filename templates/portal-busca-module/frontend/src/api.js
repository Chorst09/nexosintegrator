const getApiBaseUrl = () => {
  const explicitApiUrl = String(import.meta.env.VITE_API_URL || '').trim();
  if (explicitApiUrl) return explicitApiUrl.replace(/\/+$/, '');
  return import.meta.env.PROD ? '/api' : 'http://127.0.0.1:3002/api';
};

export const API_BASE_URL = getApiBaseUrl();

export const buildApiUrl = (endpoint) => {
  const base = String(API_BASE_URL || '/api').replace(/\/+$/, '');
  const path = String(endpoint || '/').startsWith('/') ? String(endpoint || '/') : `/${String(endpoint || '/')}`;
  return `${base}${path}`;
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};
