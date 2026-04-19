/**
 * API Module Index
 * Re-export all API modules
 */

// API Client
export { default as apiClient, normalizeError, unwrap, safeCall } from './apiClient';

// Admin Endpoints
export {
  dashboardApi,
  usersApi,
  categoriesApi,
  productsApi,
  popularCategoriesApi,
  attributesApi,
  ordersApi,
  returnsApi,
  policyApi,
  payoutsApi,
  crmApi,
  supportApi,
  reviewsApi,
  slidesApi,
  promotionsApi,
  sectionsApi,
  paymentHealthApi,
  riskApi,
  revenueApi,
  abTestsApi,
  siteSettingsApi,
  mediaApi,
} from './adminEndpoints';

// Default export - all admin APIs
export { default as adminApi } from './adminEndpoints';
