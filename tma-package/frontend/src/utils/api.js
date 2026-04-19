import axios from 'axios';
import axiosRetry from 'axios-retry';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API_URL = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for guest cart cookies
});

// Add retry logic
axiosRetry(api, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't redirect on 401 if we're already on login/register page or if it's an auth endpoint
    const isAuthEndpoint = error.config?.url?.includes('/auth/login') || 
                          error.config?.url?.includes('/auth/register');
    const isAuthPage = window.location.pathname === '/login' || 
                      window.location.pathname === '/register';
    const isGuestEndpoint = error.config?.url?.includes('/cart');
    
    if (error.response?.status === 401 && !isAuthEndpoint && !isAuthPage && !isGuestEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Categories API
export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Products API
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.patch(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  searchSuggestions: (q, limit = 5) => api.get('/products/search/suggestions', { params: { q, limit } }),
  searchStats: (search) => api.get('/products/search/stats', { params: { search } }),
};

// Cart API
export const cartAPI = {
  get: () => api.get('/cart'),
  addItem: (data) => api.post('/cart/items', data),
  removeItem: (productId) => api.delete(`/cart/items/${productId}`),
  clear: () => api.delete('/cart'),
};

// Checkout API
export const checkoutAPI = {
  createSession: (data) => api.post('/checkout/create-session', data),
  getStatus: (sessionId) => api.get(`/checkout/status/${sessionId}`),
};

// Orders API
export const ordersAPI = {
  getAll: () => api.get('/orders'),
  getById: (id) => api.get(`/orders/${id}`),
};

// Seller API
export const sellerAPI = {
  getProducts: () => api.get('/seller/products'),
  getOrders: () => api.get('/seller/orders'),
  getStats: () => api.get('/seller/stats'),
};

// AI API


// Reviews API
export const reviewsAPI = {
  getByProduct: (productId) => api.get(`/products/${productId}/reviews`),
  create: (data) => api.post('/reviews', data),
};

export const aiAPI = {
  generateDescription: (data) => api.post('/ai/generate-description', data),
};

// Admin API
export const adminAPI = {
  getUsers: () => api.get('/admin/users'),
  getStats: () => api.get('/admin/stats'),
};

// Returns API (O20.3 & O20.4)
export const returnsAPI = {
  getSummary: () => api.get('/v2/admin/returns/summary'),
  getTrend: (days = 30) => api.get('/v2/admin/returns/trend', { params: { days } }),
  getList: (skip = 0, limit = 20, stage = null) => {
    const params = { skip, limit };
    if (stage) params.stage = stage;
    return api.get('/v2/admin/returns/list', { params });
  },
  resolve: (orderId, notes = null) => api.post('/v2/admin/returns/resolve', { order_id: orderId, notes }),
  findByTtn: (ttn) => api.post('/v2/admin/returns/find', { ttn }),
  run: (limit = 500) => api.post('/v2/admin/returns/run', null, { params: { limit } }),
  getRiskCustomers: (limit = 20) => api.get('/v2/admin/returns/risk-customers', { params: { limit } }),
};

// Policy API (O20.5 & O20.6)
export const policyAPI = {
  getPending: (skip = 0, limit = 50) => api.get('/v2/admin/returns/policy/pending', { params: { skip, limit } }),
  getHistory: (skip = 0, limit = 50) => api.get('/v2/admin/returns/policy/history', { params: { skip, limit } }),
  getCities: () => api.get('/v2/admin/returns/policy/cities'),
  approve: (dedupeKey) => api.post('/v2/admin/returns/policy/approve', { dedupe_key: dedupeKey }),
  reject: (dedupeKey) => api.post('/v2/admin/returns/policy/reject', { dedupe_key: dedupeKey }),
  manual: (targetType, targetId, action, reason = 'MANUAL') => 
    api.post('/v2/admin/returns/policy/manual', { target_type: targetType, target_id: targetId, action, reason }),
  getCustomer: (phone) => api.get(`/v2/admin/returns/policy/customer/${phone}`),
  removeCity: (city) => api.delete(`/v2/admin/returns/policy/city/${encodeURIComponent(city)}`),
  run: (limit = 500) => api.post('/v2/admin/returns/policy/run', null, { params: { limit } }),
};