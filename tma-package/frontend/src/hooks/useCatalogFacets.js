/**
 * P1.1: useCatalogFacets hook
 * Single source of truth for categories, brands, filters
 * Replaces static categories.js
 */
import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Cache for facets
let facetsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useCatalogFacets(categoryId = null) {
  const [facets, setFacets] = useState(facetsCache);
  const [loading, setLoading] = useState(!facetsCache);
  const [error, setError] = useState(null);

  const fetchFacets = useCallback(async () => {
    // Check cache
    if (facetsCache && Date.now() - cacheTimestamp < CACHE_TTL && !categoryId) {
      setFacets(facetsCache);
      setLoading(false);
      return;
    }

    try {
      const url = categoryId 
        ? `${API_URL}/api/v2/catalog/facets?category_id=${categoryId}`
        : `${API_URL}/api/v2/catalog/facets`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch facets');
      
      const data = await res.json();
      
      // Update cache only for non-category specific requests
      if (!categoryId) {
        facetsCache = data;
        cacheTimestamp = Date.now();
      }
      
      setFacets(data);
      setError(null);
    } catch (err) {
      console.error('Facets fetch error:', err);
      setError(err.message);
      
      // Fallback to cache if available
      if (facetsCache) {
        setFacets(facetsCache);
      }
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchFacets();
  }, [fetchFacets]);

  return { facets, loading, error, refetch: fetchFacets };
}

// Separate hook for categories tree (MegaMenu)
export function useCategoriesTree() {
  const [tree, setTree] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/v2/catalog/categories/tree`)
      .then(r => r.json())
      .then(data => {
        setTree(data.categories || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { tree, loading };
}

// Separate hook for popular categories (Homepage)
export function usePopularCategories(limit = 8) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/v2/catalog/popular-categories?limit=${limit}`)
      .then(r => r.json())
      .then(data => {
        setCategories(data.categories || []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback to facets
        fetch(`${API_URL}/api/v2/catalog/facets`)
          .then(r => r.json())
          .then(data => {
            setCategories((data.categories || []).slice(0, limit));
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  }, [limit]);

  return { categories, loading };
}

export default useCatalogFacets;
