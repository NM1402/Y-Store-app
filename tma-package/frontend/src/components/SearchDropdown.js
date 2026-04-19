import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, TrendingUp, Clock, X } from 'lucide-react';
import axios from 'axios';

const SearchDropdown = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse recent searches:', e);
      }
    }
  }, []);

  // Fetch suggestions when user types
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_BACKEND_URL}/api/products/search/suggestions`,
          {
            params: {
              q: searchQuery,
              limit: 6
            }
          }
        );
        setSuggestions(response.data || []);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const saveRecentSearch = (query) => {
    const updated = [
      query,
      ...recentSearches.filter(s => s !== query)
    ].slice(0, 5); // Keep only last 5 searches
    
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim());
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsOpen(false);
    }
  };

  const handleSuggestionClick = (product) => {
    saveRecentSearch(product.title);
    navigate(`/product/${product.id}`);
    setSearchQuery('');
    setIsOpen(false);
  };

  const handleRecentSearchClick = (query) => {
    setSearchQuery(query);
    navigate(`/products?search=${encodeURIComponent(query)}`);
    setIsOpen(false);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const handleKeyDown = (e) => {
    if (!isOpen) return;

    const totalItems = suggestions.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch(e);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('uk-UA', {
      style: 'currency',
      currency: 'UAH',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div ref={dropdownRef} className="relative w-full group">
      <form onSubmit={handleSearch} className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Пошук товарів..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="w-full px-5 py-3 lg:py-4 pr-14 border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all duration-300 group-hover:border-blue-400"
        />
        <button
          type="submit"
          className="absolute right-3 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2 rounded-xl hover:scale-110 transition-transform duration-300 active:scale-95"
        >
          <Search className="w-5 h-5" />
        </button>
      </form>

      {/* Dropdown */}
      {isOpen && (searchQuery.length > 0 || recentSearches.length > 0) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden z-50 max-h-[500px] overflow-y-auto">
          {/* Loading */}
          {loading && searchQuery.length >= 2 && (
            <div className="p-4 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Suggestions */}
          {!loading && searchQuery.length >= 2 && suggestions.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase">Товари</p>
              </div>
              <div className="divide-y divide-gray-100">
                {suggestions.map((product, index) => (
                  <button
                    key={product.id}
                    onClick={() => handleSuggestionClick(product)}
                    className={`w-full flex items-center gap-4 p-4 hover:bg-blue-50 transition-colors text-left ${
                      selectedIndex === index ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Product Image */}
                    <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Search className="w-6 h-6" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {product.title}
                      </p>
                      {product.price && (
                        <p className="text-sm font-semibold text-blue-600 mt-1">
                          {formatPrice(product.price)}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <TrendingUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results */}
          {!loading && searchQuery.length >= 2 && suggestions.length === 0 && (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600 font-medium">Нічого не знайдено</p>
              <p className="text-sm text-gray-500 mt-1">
                Спробуйте інший запит
              </p>
            </div>
          )}

          {/* Recent Searches */}
          {searchQuery.length < 2 && recentSearches.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-600 uppercase">Недавні пошуки</p>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-red-600 hover:text-red-700 font-medium"
                >
                  Очистити
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {recentSearches.map((query, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearchClick(query)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left group"
                  >
                    <Clock className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <span className="flex-1 text-gray-700 group-hover:text-blue-600 transition-colors">
                      {query}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecentSearches(prev => prev.filter((_, i) => i !== index));
                        localStorage.setItem(
                          'recentSearches',
                          JSON.stringify(recentSearches.filter((_, i) => i !== index))
                        );
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-gray-400 hover:text-red-600" />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchDropdown;
