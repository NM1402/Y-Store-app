/**
 * Search Screen v2.0
 * Live suggestions, recent searches, empty state
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, X } from 'lucide-react';
import api from '../lib/api-client';
import telegram from '../lib/telegram-sdk';
import TopBar from '../components/TopBar';
import Page from '../components/Page';
import './Search-v2.css';

const Search = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches] = useState(['iPhone', 'MacBook', 'AirPods', 'Samsung']);

  useEffect(() => {
    if (query.length > 1) {
      handleSearch(query);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleSearch = async (q) => {
    try {
      setLoading(true);
      const data = await api.searchProducts(q);
      setResults(data.items || data || []);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    telegram.haptic('light');
    setQuery('');
    setResults([]);
  };

  const handleResultClick = (product) => {
    telegram.haptic('light');
    navigate(`/tma/product/${product.id}`);
  };

  const handleRecentClick = (searchQuery) => {
    telegram.haptic('light');
    setQuery(searchQuery);
  };

  return (
    <Page>
      <div className="tma-page">
        <TopBar title="Пошук" />
        <div className="tma-page-content">
          <div className="search-v2">
            {/* Search Input */}
            <div className="search-v2__input-wrapper">
              <SearchIcon size={20} className="search-v2__input-icon" />
              <input
                type="text"
                className="search-v2__input"
                placeholder="Шукати товари..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button className="search-v2__clear" onClick={handleClear} aria-label="Очистити">
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Recent Searches (when no query) */}
            {!query && (
              <div className="search-v2__recent">
                <div className="search-v2__section-title">Нещодавні</div>
                <div className="search-v2__recent-list">
                  {recentSearches.map((item) => (
                    <button
                      key={item}
                      className="search-v2__recent-item"
                      onClick={() => handleRecentClick(item)}
                    >
                      <SearchIcon size={16} />
                      <span>{item}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="search-v2__loading">
                <div className="spinner" />
              </div>
            )}

            {/* Results */}
            {!loading && query && results.length > 0 && (
              <div className="search-v2__results">
                {results.map((product) => (
                  <div
                    key={product.id}
                    className="search-v2__result-item"
                    onClick={() => handleResultClick(product)}
                  >
                    <div className="search-v2__result-image">
                      {product.images && product.images[0] ? (
                        <img src={product.images[0]} alt={product.title} />
                      ) : (
                        <div className="search-v2__result-placeholder">📷</div>
                      )}
                    </div>
                    <div className="search-v2__result-info">
                      <div className="search-v2__result-title">{product.title}</div>
                      <div className="search-v2__result-price">
                        {new Intl.NumberFormat('uk-UA').format(product.price)} ₴
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && query && results.length === 0 && (
              <div className="search-v2__empty">
                <div className="search-v2__empty-icon">🔍</div>
                <h3 className="search-v2__empty-title">Нічого не знайдено</h3>
                <p className="search-v2__empty-description">
                  Спробуйте інший запит
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
};

export default Search;
