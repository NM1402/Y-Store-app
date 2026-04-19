/**
 * Catalog API - Dynamic filters and products
 * Single source of truth for catalog data
 */
import apiClient from '../utils/api/apiClient';

/**
 * Get category tree for sidebar/mega menu
 */
export async function getCategoryTree(lang = "uk") {
  const { data } = await apiClient.get(`/v2/categories/tree`, { params: { lang } });
  return data;
}

/**
 * Get dynamic filters for a category
 * Returns filters based on category's filterSchema
 */
export async function getCatalogFilters(categorySlug, lang = "uk") {
  const { data } = await apiClient.get(`/v2/catalog/${categorySlug}/filters`, { params: { lang } });
  return data;
}

/**
 * Get products for a category with filters
 * @param {string} categorySlug - Category slug
 * @param {object} params - Filter params (min_price, max_price, in_stock, attr_brand, etc.)
 * @param {string} lang - Language (uk/ru)
 */
export async function getCatalogProducts(categorySlug, params = {}, lang = "uk") {
  const cleanParams = { ...params, lang };
  
  // Remove undefined/null values
  Object.keys(cleanParams).forEach(key => {
    if (cleanParams[key] === undefined || cleanParams[key] === null || cleanParams[key] === "") {
      delete cleanParams[key];
    }
  });

  const { data } = await apiClient.get(`/v2/catalog/${categorySlug}/products`, { params: cleanParams });
  return data;
}

/**
 * Admin: Get category filter schema
 */
export async function getAdminFilterSchema(categoryId) {
  const { data } = await apiClient.get(`/v2/admin/category/${categoryId}/filter-schema`);
  return data;
}

/**
 * Admin: Update category filter schema
 */
export async function updateAdminFilterSchema(categoryId, filterSchema) {
  const { data } = await apiClient.put(`/v2/admin/category/${categoryId}/filter-schema`, {
    filter_schema: filterSchema
  });
  return data;
}

export default {
  getCategoryTree,
  getCatalogFilters,
  getCatalogProducts,
  getAdminFilterSchema,
  updateAdminFilterSchema
};
