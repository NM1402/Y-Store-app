/**
 * Categories API - Tree structure for MegaMenu, Sidebar
 */
const API_URL = process.env.REACT_APP_BACKEND_URL;

// Default categories (fallback)
export const defaultCategories = [
  { id: "1", name: "Смартфони", slug: "smartphones", icon: "Smartphone", children: [] },
  { id: "2", name: "Ноутбуки", slug: "laptops", icon: "Laptop", children: [] },
  { id: "3", name: "Планшети", slug: "tablets", icon: "Tablet", children: [] },
  { id: "4", name: "Телевізори", slug: "tv", icon: "Tv", children: [] },
  { id: "5", name: "Аудіо", slug: "audio", icon: "Headphones", children: [] },
];

/**
 * Get categories tree from API
 * Returns fallback on error
 */
export async function getCategoriesTree() {
  try {
    const res = await fetch(`${API_URL}/api/v2/categories/tree`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    const data = await res.json();
    // Handle both formats: { tree: [...] } or [...]
    return data.tree || data || defaultCategories;
  } catch (error) {
    console.warn('Using default categories:', error);
    return defaultCategories;
  }
}

/**
 * Get available icons
 */
export async function getAvailableIcons() {
  try {
    const res = await fetch(`${API_URL}/api/v2/categories/icons`);
    if (!res.ok) throw new Error('Failed to fetch icons');
    const data = await res.json();
    return data.icons || [];
  } catch {
    return ["Smartphone", "Laptop", "Tablet", "Tv", "Headphones", "Camera", "Gamepad2", "Home", "Watch", "Package"];
  }
}

/**
 * Admin: Get all categories (flat list)
 */
export async function getAdminCategories(token) {
  const res = await fetch(`${API_URL}/api/v2/admin/categories`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return await res.json();
}

/**
 * Admin: Create category
 */
export async function createCategory(token, data) {
  const res = await fetch(`${API_URL}/api/v2/admin/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to create category');
  return await res.json();
}

/**
 * Admin: Update category
 */
export async function updateCategory(token, id, data) {
  const res = await fetch(`${API_URL}/api/v2/admin/categories/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update category');
  return await res.json();
}

/**
 * Admin: Delete category
 */
export async function deleteCategory(token, id, soft = true) {
  const res = await fetch(`${API_URL}/api/v2/admin/categories/${id}?soft=${soft}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to delete category');
  return await res.json();
}
