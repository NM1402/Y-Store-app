/**
 * P1.3: useSearch hook
 * Unified search with debounced suggestions
 */
import { useState, useEffect, useCallback, useRef } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export function useSearchSuggest(debounceMs = 200) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState({ items: [] });
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const fetchSuggestions = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setSuggestions({ items: [] });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v2/search/suggest?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        // Handle both formats: {items: []} or {products: []}
        setSuggestions({
          items: data.items || data.products || []
        });
      }
    } catch (err) {
      console.error('Search suggest error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search
  const search = useCallback((q) => {
    setQuery(q);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(q);
    }, debounceMs);
  }, [debounceMs, fetchSuggestions]);

  // Clear on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return { query, suggestions, loading, search, setQuery };
}

export function useSearchResults() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (params) => {
    const { q, category, brand, min_price, max_price, sort, page = 1, limit = 24 } = params;
    
    if (!q) {
      setResults(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      searchParams.set('q', q);
      if (category) searchParams.set('category', category);
      if (brand) searchParams.set('brand', brand);
      if (min_price) searchParams.set('min_price', min_price);
      if (max_price) searchParams.set('max_price', max_price);
      if (sort) searchParams.set('sort', sort);
      searchParams.set('page', page);
      searchParams.set('limit', limit);

      const res = await fetch(`${API_URL}/api/v2/search?${searchParams}`);
      if (!res.ok) throw new Error('Search failed');
      
      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, search };
}

export function useTrendingSearches() {
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/v2/search/popular`)
      .then(r => r.json())
      .then(data => {
        setTrending(data.popular || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { trending, loading };
}

export default useSearchSuggest;
