/**
 * Admin API Endpoints
 * Все админские endpoints в одном месте
 */
import apiClient from './apiClient';

/**
 * Dashboard & Analytics
 */
export const dashboardApi = {
  // Общая статистика
  getStats: () => apiClient.get('/admin/stats'),
  // Overview (единый endpoint для дашборда)
  getOverview: (range = '30d') => apiClient.get('/v2/admin/overview', { params: { range } }),
};

/**
 * Users Management
 */
export const usersApi = {
  getAll: () => apiClient.get('/admin/users'),
  getById: (id) => apiClient.get(`/admin/users/${id}`),
  update: (id, data) => apiClient.patch(`/admin/users/${id}`, data),
  updateRole: (id, role) => apiClient.patch(`/admin/users/${id}/role`, { role }),
};

/**
 * Categories Management
 */
export const categoriesApi = {
  getAll: () => apiClient.get('/categories'),
  getTree: () => apiClient.get('/categories/tree'),
  getById: (id) => apiClient.get(`/categories/${id}`),
  create: (data) => apiClient.post('/categories', data),
  update: (id, data) => apiClient.put(`/categories/${id}`, data),
  delete: (id) => apiClient.delete(`/categories/${id}`),
  reorder: (items) => apiClient.post('/categories/reorder', { items }),
};

/**
 * Products Management
 */
export const productsApi = {
  getAll: (params) => apiClient.get('/products', { params }),
  getById: (id) => apiClient.get(`/products/${id}`),
  create: (data) => apiClient.post('/products', data),
  update: (id, data) => apiClient.patch(`/products/${id}`, data),
  delete: (id) => apiClient.delete(`/products/${id}`),
  // Bulk operations
  bulkUpdate: (ids, data) => apiClient.patch('/products/bulk', { ids, ...data }),
  bulkDelete: (ids) => apiClient.post('/products/bulk-delete', { ids }),
  // Import/Export
  import: (data) => apiClient.post('/products/import', data),
  export: (params) => apiClient.get('/products/export', { params, responseType: 'blob' }),
};

/**
 * Popular Categories
 */
export const popularCategoriesApi = {
  getAll: () => apiClient.get('/v2/admin/popular-categories'),
  create: (data) => apiClient.post('/v2/admin/popular-categories', data),
  update: (id, data) => apiClient.put(`/v2/admin/popular-categories/${id}`, data),
  delete: (id) => apiClient.delete(`/v2/admin/popular-categories/${id}`),
  reorder: (items) => apiClient.post('/v2/admin/popular-categories/reorder', { items }),
};

/**
 * Attributes & Filters
 */
export const attributesApi = {
  // Attributes library
  getAll: () => apiClient.get('/v2/admin/attributes'),
  create: (data) => apiClient.post('/v2/admin/attributes', data),
  update: (id, data) => apiClient.put(`/v2/admin/attributes/${id}`, data),
  delete: (id) => apiClient.delete(`/v2/admin/attributes/${id}`),
  // Category-Attribute mapping
  getCategoryAttributes: (categoryId) => apiClient.get(`/v2/admin/categories/${categoryId}/attributes`),
  setCategoryAttributes: (categoryId, attributes) => 
    apiClient.post(`/v2/admin/categories/${categoryId}/attributes`, { attributes }),
};

/**
 * Orders Management
 */
export const ordersApi = {
  getAll: (params) => apiClient.get('/v2/admin/orders', { params }),
  getById: (id) => apiClient.get(`/v2/admin/orders/${id}`),
  updateStatus: (id, status, notes) => apiClient.patch(`/v2/admin/orders/${id}/status`, { status, notes }),
  // Analytics
  getAnalytics: (range = '30d') => apiClient.get('/v2/admin/orders/analytics', { params: { range } }),
  getByStatus: (status) => apiClient.get('/v2/admin/orders', { params: { status } }),
};

/**
 * Returns & Refunds
 */
export const returnsApi = {
  getSummary: () => apiClient.get('/v2/admin/returns/summary'),
  getTrend: (days = 30) => apiClient.get('/v2/admin/returns/trend', { params: { days } }),
  getList: (skip = 0, limit = 20, stage = null) => {
    const params = { skip, limit };
    if (stage) params.stage = stage;
    return apiClient.get('/v2/admin/returns/list', { params });
  },
  resolve: (orderId, notes = null) => apiClient.post('/v2/admin/returns/resolve', { order_id: orderId, notes }),
  findByTtn: (ttn) => apiClient.post('/v2/admin/returns/find', { ttn }),
  run: (limit = 500) => apiClient.post('/v2/admin/returns/run', null, { params: { limit } }),
  getRiskCustomers: (limit = 20) => apiClient.get('/v2/admin/returns/risk-customers', { params: { limit } }),
};

/**
 * Policy Management
 */
export const policyApi = {
  getPending: (skip = 0, limit = 50) => apiClient.get('/v2/admin/returns/policy/pending', { params: { skip, limit } }),
  getHistory: (skip = 0, limit = 50) => apiClient.get('/v2/admin/returns/policy/history', { params: { skip, limit } }),
  getCities: () => apiClient.get('/v2/admin/returns/policy/cities'),
  approve: (dedupeKey) => apiClient.post('/v2/admin/returns/policy/approve', { dedupe_key: dedupeKey }),
  reject: (dedupeKey) => apiClient.post('/v2/admin/returns/policy/reject', { dedupe_key: dedupeKey }),
  manual: (targetType, targetId, action, reason = 'MANUAL') => 
    apiClient.post('/v2/admin/returns/policy/manual', { target_type: targetType, target_id: targetId, action, reason }),
  getCustomer: (phone) => apiClient.get(`/v2/admin/returns/policy/customer/${phone}`),
  removeCity: (city) => apiClient.delete(`/v2/admin/returns/policy/city/${encodeURIComponent(city)}`),
  run: (limit = 500) => apiClient.post('/v2/admin/returns/policy/run', null, { params: { limit } }),
};

/**
 * Payouts Management
 */
export const payoutsApi = {
  getAll: (params) => apiClient.get('/v2/admin/payouts', { params }),
  getSummary: () => apiClient.get('/v2/admin/payouts/summary'),
  process: (id) => apiClient.post(`/v2/admin/payouts/${id}/process`),
};

/**
 * CRM & Customers
 */
export const crmApi = {
  getCustomers: (params) => apiClient.get('/v2/admin/crm/customers', { params }),
  getCustomerById: (id) => apiClient.get(`/v2/admin/crm/customers/${id}`),
  getCustomerHistory: (id) => apiClient.get(`/v2/admin/crm/customers/${id}/history`),
  addNote: (customerId, note) => apiClient.post(`/v2/admin/crm/customers/${customerId}/notes`, { note }),
  // Segments
  getSegments: () => apiClient.get('/v2/admin/crm/segments'),
  createSegment: (data) => apiClient.post('/v2/admin/crm/segments', data),
};

/**
 * Support Tickets
 */
export const supportApi = {
  getTickets: (params) => apiClient.get('/v2/admin/support/tickets', { params }),
  getTicketById: (id) => apiClient.get(`/v2/admin/support/tickets/${id}`),
  updateTicket: (id, data) => apiClient.patch(`/v2/admin/support/tickets/${id}`, data),
  replyToTicket: (id, message) => apiClient.post(`/v2/admin/support/tickets/${id}/reply`, { message }),
  closeTicket: (id) => apiClient.post(`/v2/admin/support/tickets/${id}/close`),
};

/**
 * Reviews Management
 */
export const reviewsApi = {
  getAll: (params) => apiClient.get('/v2/admin/reviews', { params }),
  getById: (id) => apiClient.get(`/v2/admin/reviews/${id}`),
  approve: (id) => apiClient.post(`/v2/admin/reviews/${id}/approve`),
  reject: (id) => apiClient.post(`/v2/admin/reviews/${id}/reject`),
  reply: (id, message) => apiClient.post(`/v2/admin/reviews/${id}/reply`, { message }),
  delete: (id) => apiClient.delete(`/v2/admin/reviews/${id}`),
};

/**
 * Marketing - Slides
 */
export const slidesApi = {
  getAll: () => apiClient.get('/v2/admin/slides'),
  create: (data) => apiClient.post('/v2/admin/slides', data),
  update: (id, data) => apiClient.put(`/v2/admin/slides/${id}`, data),
  delete: (id) => apiClient.delete(`/v2/admin/slides/${id}`),
  reorder: (items) => apiClient.post('/v2/admin/slides/reorder', { items }),
  toggleActive: (id) => apiClient.post(`/v2/admin/slides/${id}/toggle`),
};

/**
 * Marketing - Promotions
 */
export const promotionsApi = {
  getAll: () => apiClient.get('/v2/admin/promotions'),
  getById: (id) => apiClient.get(`/v2/admin/promotions/${id}`),
  create: (data) => apiClient.post('/v2/admin/promotions', data),
  update: (id, data) => apiClient.put(`/v2/admin/promotions/${id}`, data),
  delete: (id) => apiClient.delete(`/v2/admin/promotions/${id}`),
  toggleActive: (id) => apiClient.post(`/v2/admin/promotions/${id}/toggle`),
};

/**
 * Marketing - Custom Sections
 */
export const sectionsApi = {
  getAll: () => apiClient.get('/v2/admin/sections'),
  getById: (id) => apiClient.get(`/v2/admin/sections/${id}`),
  create: (data) => apiClient.post('/v2/admin/sections', data),
  update: (id, data) => apiClient.put(`/v2/admin/sections/${id}`, data),
  delete: (id) => apiClient.delete(`/v2/admin/sections/${id}`),
  reorder: (items) => apiClient.post('/v2/admin/sections/reorder', { items }),
};

/**
 * Finance - Payment Health
 */
export const paymentHealthApi = {
  getSummary: () => apiClient.get('/v2/admin/payment-health/summary'),
  getTransactions: (params) => apiClient.get('/v2/admin/payment-health/transactions', { params }),
  getFailedPayments: () => apiClient.get('/v2/admin/payment-health/failed'),
  retryPayment: (id) => apiClient.post(`/v2/admin/payment-health/${id}/retry`),
};

/**
 * Finance - Risk Center
 */
export const riskApi = {
  getSummary: () => apiClient.get('/v2/admin/risk/summary'),
  getAlerts: (params) => apiClient.get('/v2/admin/risk/alerts', { params }),
  getFraudulentOrders: () => apiClient.get('/v2/admin/risk/fraudulent'),
  markAsFraud: (orderId) => apiClient.post(`/v2/admin/risk/orders/${orderId}/fraud`),
  clearFraud: (orderId) => apiClient.post(`/v2/admin/risk/orders/${orderId}/clear`),
};

/**
 * Finance - Revenue
 */
export const revenueApi = {
  getSummary: (range = '30d') => apiClient.get('/v2/admin/revenue/summary', { params: { range } }),
  getByCategory: (range = '30d') => apiClient.get('/v2/admin/revenue/by-category', { params: { range } }),
  getByProduct: (range = '30d') => apiClient.get('/v2/admin/revenue/by-product', { params: { range } }),
  getTrend: (range = '30d') => apiClient.get('/v2/admin/revenue/trend', { params: { range } }),
};

/**
 * A/B Tests
 */
export const abTestsApi = {
  getAll: () => apiClient.get('/v2/admin/ab-tests'),
  getById: (id) => apiClient.get(`/v2/admin/ab-tests/${id}`),
  create: (data) => apiClient.post('/v2/admin/ab-tests', data),
  update: (id, data) => apiClient.put(`/v2/admin/ab-tests/${id}`, data),
  delete: (id) => apiClient.delete(`/v2/admin/ab-tests/${id}`),
  start: (id) => apiClient.post(`/v2/admin/ab-tests/${id}/start`),
  stop: (id) => apiClient.post(`/v2/admin/ab-tests/${id}/stop`),
  getResults: (id) => apiClient.get(`/v2/admin/ab-tests/${id}/results`),
};

/**
 * Site Settings
 */
export const siteSettingsApi = {
  get: () => apiClient.get('/v2/site/settings'),
  update: (data) => apiClient.put('/v2/site/settings', data),
  // Specific settings
  updatePhones: (phones) => apiClient.patch('/v2/site/settings/phones', { phones }),
  updateSocialLinks: (socialLinks) => apiClient.patch('/v2/site/settings/social-links', { socialLinks }),
  updateHeaderNav: (headerNav) => apiClient.patch('/v2/site/settings/header-nav', { headerNav }),
};

/**
 * Media Upload
 */
export const mediaApi = {
  upload: (file, type = 'image') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    return apiClient.post('/media/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (url) => apiClient.delete('/media', { data: { url } }),
};

// Export all APIs
export default {
  dashboard: dashboardApi,
  users: usersApi,
  categories: categoriesApi,
  products: productsApi,
  popularCategories: popularCategoriesApi,
  attributes: attributesApi,
  orders: ordersApi,
  returns: returnsApi,
  policy: policyApi,
  payouts: payoutsApi,
  crm: crmApi,
  support: supportApi,
  reviews: reviewsApi,
  slides: slidesApi,
  promotions: promotionsApi,
  sections: sectionsApi,
  paymentHealth: paymentHealthApi,
  risk: riskApi,
  revenue: revenueApi,
  abTests: abTestsApi,
  siteSettings: siteSettingsApi,
  media: mediaApi,
};
