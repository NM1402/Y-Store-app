/**
 * CategoriesContext - Single source of truth for categories
 * Used by MegaMenu, Sidebar, Popular Categories
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCategoriesTree, defaultCategories } from '../api/categories';

const CategoriesContext = createContext(null);

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState(defaultCategories);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(0);

  const fetchCategories = useCallback(async (force = false) => {
    // Cache for 5 minutes
    const now = Date.now();
    if (!force && lastFetch && now - lastFetch < 5 * 60 * 1000) {
      return;
    }

    try {
      setLoading(true);
      const data = await getCategoriesTree();
      setCategories(data);
      setLastFetch(now);
      setError(null);
    } catch (err) {
      setError(err.message);
      // Keep using cached/default categories
    } finally {
      setLoading(false);
    }
  }, [lastFetch]);

  // Initial fetch
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Get flat list of all categories
  const flatCategories = useCallback(() => {
    const flat = [];
    const traverse = (cats, parentName = null) => {
      cats.forEach(cat => {
        flat.push({ ...cat, parentName });
        if (cat.children?.length) {
          traverse(cat.children, cat.name);
        }
      });
    };
    traverse(categories);
    return flat;
  }, [categories]);

  // Find category by slug
  const findBySlug = useCallback((slug) => {
    const search = (cats) => {
      for (const cat of cats) {
        if (cat.slug === slug) return cat;
        if (cat.children?.length) {
          const found = search(cat.children);
          if (found) return found;
        }
      }
      return null;
    };
    return search(categories);
  }, [categories]);

  // Get root categories only
  const rootCategories = categories.filter(c => !c.parentId && !c.parent_id);

  return (
    <CategoriesContext.Provider value={{
      categories,
      rootCategories,
      loading,
      error,
      refresh: () => fetchCategories(true),
      flatCategories,
      findBySlug
    }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error('useCategories must be used within CategoriesProvider');
  }
  return context;
}

export default CategoriesContext;
