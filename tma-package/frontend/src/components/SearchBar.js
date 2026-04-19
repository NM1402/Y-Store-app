import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, TrendingUp, Clock, Sparkles } from 'lucide-react';
import axios from 'axios';

const SearchBar = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch popular searches on mount
  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/v2/search/popular`,
          { params: { limit: 5 } }
        );
        setPopularSearches(response.data.popular || []);
      } catch (error) {
        console.debug('Popular searches not available');
      }
    };
    fetchPopular();
  }, []);

  // Fetch suggestions using new V2 API
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      try {
        setLoading(true);
        // Try new V2 autocomplete API first
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/v2/search/autocomplete`,
          { params: { q: searchQuery, limit: 8 } }
        );
        setSuggestions(response.data.suggestions || []);
        setShowSuggestions(true);
      } catch (error) {
        // Fallback to old API
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_BACKEND_URL}/api/products/search/suggestions`,
            { params: { q: searchQuery, limit: 5 } }
          );
          setSuggestions(response.data);
          setShowSuggestions(true);
        } catch (e) {
          console.error('Failed to fetch suggestions:', e);
        }
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchSuggestions, 250);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (product) => {
    const productId = product.id || product._id;
    navigate(`/product/${productId}`);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handlePopularClick = (query) => {
    navigate(`/products?search=${encodeURIComponent(query)}`);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const getProductImage = (product) => {
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    return product.image;
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          placeholder="Пошук товарів..."
          className="w-full pl-10 pr-10 py-2 md:py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          )}
          
          {/* Product Suggestions */}
          {!loading && suggestions.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Товари
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id || index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full px-4 py-3 hover:bg-blue-50 flex items-center gap-3 transition-colors text-left"
                >
                  {/* Product Image */}
                  <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                    {getProductImage(suggestion) ? (
                      <img
                        src={getProductImage(suggestion)}
                        alt={suggestion.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        📦
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {suggestion.title}
                    </p>
                    {suggestion.brand && (
                      <p className="text-xs text-gray-500">{suggestion.brand}</p>
                    )}
                    {suggestion.price && (
                      <p className="text-sm text-blue-600 font-bold">
                        {suggestion.price.toFixed(0)} ₴
                      </p>
                    )}
                  </div>

                  <TrendingUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Popular Searches (when no query or empty results) */}
          {!loading && !searchQuery && popularSearches.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center gap-2">
                <Clock className="w-3 h-3" />
                Популярні запити
              </div>
              {popularSearches.map((query, index) => (
                <button
                  key={index}
                  onClick={() => handlePopularClick(query)}
                  className="w-full px-4 py-2 hover:bg-gray-50 flex items-center gap-3 transition-colors text-left"
                >
                  <Search className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{query}</span>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {!loading && searchQuery.length >= 2 && suggestions.length === 0 && (
            <div className="p-4 text-center text-sm text-gray-500">
              Нічого не знайдено за запитом "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
