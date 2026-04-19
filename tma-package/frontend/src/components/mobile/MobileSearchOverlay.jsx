/**
 * MobileSearchOverlay - Full-screen search for mobile
 * B16 Mobile Retail Polish
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Clock, TrendingUp, X, Package } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Get recent searches
function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem('ys_recent_searches') || '[]').slice(0, 5);
  } catch {
    return [];
  }
}

function saveRecentSearch(query) {
  if (!query?.trim()) return;
  try {
    const recent = getRecentSearches().filter(q => q !== query.trim());
    recent.unshift(query.trim());
    localStorage.setItem('ys_recent_searches', JSON.stringify(recent.slice(0, 10)));
  } catch {}
}

export default function MobileSearchOverlay({ isOpen, onClose }) {
  const nav = useNavigate();
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ products: [], categories: [], popular: [] });
  const [recentSearches, setRecentSearches] = useState([]);

  // Load recent on open
  useEffect(() => {
    if (isOpen) {
      setRecentSearches(getRecentSearches());
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Debounced fetch
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setData({ products: [], categories: [], popular: [] });
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        if (abortRef.current) abortRef.current.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        const res = await fetch(
          `${API_URL}/api/v2/search/suggest?q=${encodeURIComponent(trimmed)}&limit=8`,
          { signal: ctrl.signal }
        );
        const json = await res.json();

        setData({
          products: json?.products || [],
          categories: json?.categories || [],
          popular: json?.popular || [],
        });
      } catch (e) {
        if (e?.name !== "AbortError") console.error("suggest error", e);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [q]);

  const handleSearch = useCallback((query) => {
    const value = query.trim();
    if (!value) return;
    saveRecentSearch(value);
    nav(`/catalog?q=${encodeURIComponent(value)}`);
    onClose();
  }, [nav, onClose]);

  const handleCategoryClick = (slug) => {
    nav(`/catalog?category=${encodeURIComponent(slug)}`);
    onClose();
  };

  const handleProductClick = (slug) => {
    nav(`/product/${encodeURIComponent(slug)}`);
    onClose();
  };

  const clearRecent = () => {
    localStorage.removeItem('ys_recent_searches');
    setRecentSearches([]);
  };

  if (!isOpen) return null;

  const trimmed = q.trim();
  const hasResults = data.products.length || data.categories.length || data.popular.length;
  const showRecent = !trimmed && recentSearches.length > 0;

  return (
    <div className="ys-mobile-search" data-testid="mobile-search-overlay">
      {/* Header */}
      <div className="ys-mobile-search-header">
        <button className="ys-mobile-search-back" onClick={onClose}>
          <ArrowLeft size={24} />
        </button>
        <div className="ys-mobile-search-input-wrap">
          <Search size={18} className="ys-mobile-search-icon" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Пошук товарів..."
            className="ys-mobile-search-input"
            autoComplete="off"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearch(q);
            }}
          />
          {q && (
            <button className="ys-mobile-search-clear" onClick={() => setQ("")}>
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="ys-mobile-search-body">
        {loading && (
          <div className="ys-mobile-search-loading">
            <span className="ys-spinner" /> Пошук...
          </div>
        )}

        {/* Recent searches */}
        {showRecent && (
          <div className="ys-mobile-search-section">
            <div className="ys-mobile-search-section-header">
              <span>Нещодавні пошуки</span>
              <button onClick={clearRecent}>Очистити</button>
            </div>
            {recentSearches.map((s, i) => (
              <button 
                key={i} 
                className="ys-mobile-search-item"
                onClick={() => handleSearch(s)}
              >
                <Clock size={16} />
                <span>{s}</span>
              </button>
            ))}
          </div>
        )}

        {/* Categories */}
        {data.categories.length > 0 && (
          <div className="ys-mobile-search-section">
            <div className="ys-mobile-search-section-header">
              <span>Категорії</span>
            </div>
            {data.categories.map((c) => (
              <button 
                key={c.slug} 
                className="ys-mobile-search-item"
                onClick={() => handleCategoryClick(c.slug)}
              >
                <Package size={16} />
                <span>{c.name}</span>
              </button>
            ))}
          </div>
        )}

        {/* Products */}
        {data.products.length > 0 && (
          <div className="ys-mobile-search-section">
            <div className="ys-mobile-search-section-header">
              <span>Товари</span>
            </div>
            {data.products.map((p) => (
              <button 
                key={p.id || p.slug} 
                className="ys-mobile-search-product"
                onClick={() => handleProductClick(p.slug || p.id)}
              >
                <div className="ys-mobile-search-product-img">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt="" loading="lazy" />
                  ) : (
                    <Package size={20} />
                  )}
                </div>
                <div className="ys-mobile-search-product-info">
                  <div className="ys-mobile-search-product-title">{p.title}</div>
                  {p.price && (
                    <div className="ys-mobile-search-product-price">{p.price?.toLocaleString()} грн</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Popular */}
        {data.popular?.length > 0 && (
          <div className="ys-mobile-search-section">
            <div className="ys-mobile-search-section-header">
              <span>Популярні запити</span>
            </div>
            {data.popular.map((s, i) => (
              <button 
                key={i} 
                className="ys-mobile-search-item"
                onClick={() => handleSearch(s)}
              >
                <TrendingUp size={16} />
                <span>{s}</span>
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {trimmed && !loading && !hasResults && (
          <div className="ys-mobile-search-empty">
            <p>Нічого не знайдено за запитом "{trimmed}"</p>
            <button 
              className="ys-btn ys-btn-primary"
              onClick={() => handleSearch(q)}
            >
              Шукати в каталозі
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
