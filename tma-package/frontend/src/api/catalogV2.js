/**
 * Catalog V2 API - Dynamic filters based on filterSchema
 */
const API_URL = process.env.REACT_APP_BACKEND_URL || "";

/**
 * Get categories tree
 */
export async function getCategoriesTree(lang = "uk") {
  const res = await fetch(`${API_URL}/api/v2/catalog/tree?lang=${lang}`);
  if (!res.ok) throw new Error(`Failed to fetch tree: ${res.status}`);
  return res.json();
}

/**
 * Get dynamic filters for category
 */
export async function getCatalogFilters(slug, lang = "uk") {
  const res = await fetch(`${API_URL}/api/v2/catalog/${slug}/filters?lang=${lang}`);
  if (!res.ok) throw new Error(`Failed to fetch filters: ${res.status}`);
  return res.json();
}

/**
 * Get products for category with filters
 */
export async function getCatalogProducts(slug, params = {}, lang = "uk") {
  const qs = new URLSearchParams({ ...params, lang });
  const res = await fetch(`${API_URL}/api/v2/catalog/${slug}/products?${qs.toString()}`);
  if (!res.ok) throw new Error(`Failed to fetch products: ${res.status}`);
  return res.json();
}

/**
 * Admin: Update category filterSchema
 */
export async function updateCategoryFilterSchema(categoryId, filterSchema, token) {
  const res = await fetch(`${API_URL}/api/v2/catalog/admin/categories/${categoryId}/filter-schema`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ filter_schema: filterSchema })
  });
  if (!res.ok) throw new Error(`Failed to update filter schema: ${res.status}`);
  return res.json();
}

/**
 * Admin: Update product attributes
 */
export async function updateProductAttributes(productId, attributes, token) {
  const res = await fetch(`${API_URL}/api/v2/catalog/admin/products/${productId}/attributes`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ attributes })
  });
  if (!res.ok) throw new Error(`Failed to update attributes: ${res.status}`);
  return res.json();
}

export default {
  getCategoriesTree,
  getCatalogFilters,
  getCatalogProducts,
  updateCategoryFilterSchema,
  updateProductAttributes
};
