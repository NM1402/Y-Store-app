/**
 * SearchInput Component - B14 Style
 * Live suggestions with products, categories, popular queries
 * Features: keyboard navigation, highlight, mobile full-screen
 */
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { Package, Search, TrendingUp, X, Clock, ArrowRight } from "lucide-react";

const t = (lang, uk, ru) => (lang === "ru" ? ru : uk);

// Highlight matching text
function Highlight({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) => 
        part.toLowerCase() === query.toLowerCase() 
          ? <mark key={i} className="ys-highlight">{part}</mark>
          : part
      )}
    </>
  );
}

// Get recent searches from localStorage
function getRecentSearches() {
  try {
    return JSON.parse(localStorage.getItem('ys_recent_searches') || '[]').slice(0, 5);
  } catch {
    return [];
  }
}

// Save search to recent
function saveRecentSearch(query) {
  if (!query?.trim()) return;
  try {
    const recent = getRecentSearches().filter(q => q !== query.trim());
    recent.unshift(query.trim());
    localStorage.setItem('ys_recent_searches', JSON.stringify(recent.slice(0, 10)));
  } catch {}
}

export default function SearchInput({ 
  className = "", 
  onClose, 
  isMobileFullScreen = false,
  autoFocus = false 
}) {
  const { language } = useLanguage();
  const L = language === "ru" ? "ru" : "uk";
  const nav = useNavigate();
  
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ products: [], categories: [], popular: [] });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);

  const abortRef = useRef(null);
  const timerRef = useRef(null);
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const trimmed = useMemo(() => q.trim(), [q]);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // Auto focus for mobile
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Build flat list for keyboard navigation
  const flatItems = useMemo(() => {
    const items = [];
    
    // Recent searches (when no query)
    if (!trimmed && recentSearches.length) {
      recentSearches.forEach((s, i) => items.push({ type: 'recent', value: s, index: i }));
    }
    
    // Categories
    data.categories?.forEach((c, i) => items.push({ type: 'category', value: c, index: i }));
    
    // Products
    data.products?.forEach((p, i) => items.push({ type: 'product', value: p, index: i }));
    
    // Popular
    data.popular?.forEach((s, i) => items.push({ type: 'popular', value: s, index: i }));
    
    return items;
  }, [data, trimmed, recentSearches]);

  const runSearch = useCallback((value) => {
    const v = (value || "").trim();
    if (!v) return;
    saveRecentSearch(v);
    nav(`/catalog?q=${encodeURIComponent(v)}`);
    setOpen(false);
    setQ("");
    onClose?.();
  }, [nav, onClose]);

  const goCategory = useCallback((slug) => {
    nav(`/catalog?category=${encodeURIComponent(slug)}`);
    setOpen(false);
    setQ("");
    onClose?.();
  }, [nav, onClose]);

  const goProduct = useCallback((slug) => {
    nav(`/product/${encodeURIComponent(slug)}`);
    setOpen(false);
    setQ("");
    onClose?.();
  }, [nav, onClose]);

  const handleSelect = useCallback((item) => {
    if (!item) return;
    switch (item.type) {
      case 'recent':
      case 'popular':
        runSearch(item.value);
        break;
      case 'category':
        goCategory(item.value.slug);
        break;
      case 'product':
        goProduct(item.value.slug || item.value.id);
        break;
      default:
        break;
    }
  }, [runSearch, goCategory, goProduct]);

  // Close on outside click
  useEffect(() => {
    if (isMobileFullScreen) return;
    const onDoc = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [isMobileFullScreen]);

  // Debounced fetch
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (trimmed.length < 2) {
      setData({ products: [], categories: [], popular: [] });
      setActiveIndex(-1);
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        if (abortRef.current) abortRef.current.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        const res = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/v2/search/suggest?q=${encodeURIComponent(trimmed)}&lang=${L}&limit=8`,
          { signal: ctrl.signal }
        );
        const json = await res.json();

        setData({
          products: json?.products || [],
          categories: json?.categories || [],
          popular: json?.popular || [],
        });
        setOpen(true);
        setActiveIndex(-1);
      } catch (e) {
        if (e?.name !== "AbortError") console.error("suggest error", e);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [trimmed, L]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!open && !recentSearches.length) {
      if (e.key === 'Enter') {
        e.preventDefault();
        runSearch(trimmed);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => Math.min(prev + 1, flatItems.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => Math.max(prev - 1, -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && flatItems[activeIndex]) {
          handleSelect(flatItems[activeIndex]);
        } else {
          runSearch(trimmed);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        onClose?.();
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  }, [open, flatItems, activeIndex, trimmed, runSearch, handleSelect, onClose, recentSearches.length]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const hasResults = data.products.length || data.categories.length || data.popular.length;
  const showDropdown = open && (hasResults || (!trimmed && recentSearches.length));

  // Clear recent searches
  const clearRecent = () => {
    localStorage.removeItem('ys_recent_searches');
    setRecentSearches([]);
  };

  let itemIndex = -1;
  const getNextIndex = () => ++itemIndex;

  return (
    <div 
      ref={boxRef} 
      className={`ys-search-box ${isMobileFullScreen ? 'is-fullscreen' : ''} ${className}`} 
      data-testid="search-input-container"
    >
      <div className="ys-search-input-wrap">
        <Search className="ys-search-icon" size={18} />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => {
            if (trimmed.length >= 2 && hasResults) setOpen(true);
            else if (!trimmed && recentSearches.length) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t(L, "Пошук товарів...", "Поиск товаров...")}
          className="ys-search-input"
          data-testid="search-input"
          autoComplete="off"
        />
        {q && (
          <button 
            type="button" 
            className="ys-search-clear" 
            onClick={() => { setQ(""); setOpen(false); inputRef.current?.focus(); }}
            aria-label="Clear"
          >
            <X size={16} />
          </button>
        )}
        {isMobileFullScreen && (
          <button 
            type="button" 
            className="ys-search-close-mobile"
            onClick={onClose}
            aria-label="Close"
          >
            {t(L, "Скасувати", "Отмена")}
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="ys-search-dropdown" data-testid="search-dropdown" ref={listRef}>
          {/* Recent searches (when no query) */}
          {!trimmed && recentSearches.length > 0 && (
            <Section 
              title={t(L, "Нещодавні пошуки", "Недавние поиски")}
              action={
                <button type="button" className="ys-search-clear-recent" onClick={clearRecent}>
                  {t(L, "Очистити", "Очистить")}
                </button>
              }
            >
              {recentSearches.map((s, i) => {
                const idx = getNextIndex();
                return (
                  <Row 
                    key={`recent-${i}`} 
                    isActive={activeIndex === idx}
                    data-index={idx}
                    onClick={() => runSearch(s)}
                  >
                    <div className="ys-search-row-icon"><Clock size={16} /></div>
                    <span className="ys-search-row-text">{s}</span>
                  </Row>
                );
              })}
            </Section>
          )}

          {/* Header with show all button */}
          {trimmed && (
            <div className="ys-search-dropdown-header">
              <span className="ys-search-dropdown-title">
                {loading ? t(L, "Пошук...", "Поиск...") : t(L, "Результати", "Результаты")}
              </span>
              <button
                type="button"
                className="ys-btn-sm"
                onClick={() => runSearch(trimmed)}
                data-testid="search-show-all"
              >
                {t(L, "Показати все", "Показать всё")}
                <ArrowRight size={14} style={{ marginLeft: 4 }} />
              </button>
            </div>
          )}

          {/* Categories */}
          {data.categories?.length > 0 && (
            <Section title={t(L, "Категорії", "Категории")}>
              {data.categories.map((c, i) => {
                const idx = getNextIndex();
                return (
                  <Row 
                    key={`cat-${c.slug}`} 
                    isActive={activeIndex === idx}
                    data-index={idx}
                    onClick={() => goCategory(c.slug)}
                  >
                    <div className="ys-search-row-icon"><Package size={16} /></div>
                    <span className="ys-search-row-text">
                      <Highlight text={c.name} query={trimmed} />
                    </span>
                  </Row>
                );
              })}
            </Section>
          )}

          {/* Products */}
          {data.products?.length > 0 && (
            <Section title={t(L, "Товари", "Товары")}>
              {data.products.map((p, i) => {
                const idx = getNextIndex();
                return (
                  <Row 
                    key={`prod-${p.id || p.slug}`} 
                    isActive={activeIndex === idx}
                    data-index={idx}
                    onClick={() => goProduct(p.slug || p.id)}
                  >
                    <Thumb src={(p.images || [])[0]} />
                    <div className="ys-search-row-content">
                      <span className="ys-search-row-text">
                        <Highlight text={p.title || p.name} query={trimmed} />
                      </span>
                      {p.price !== undefined && p.price !== null && (
                        <span className="ys-search-row-price">{p.price} грн</span>
                      )}
                    </div>
                  </Row>
                );
              })}
            </Section>
          )}

          {/* Popular */}
          {data.popular?.length > 0 && (
            <Section title={t(L, "Популярні запити", "Популярные запросы")}>
              {data.popular.map((s, i) => {
                const idx = getNextIndex();
                return (
                  <Row 
                    key={`pop-${i}`} 
                    isActive={activeIndex === idx}
                    data-index={idx}
                    onClick={() => runSearch(s)}
                  >
                    <div className="ys-search-row-icon"><TrendingUp size={16} /></div>
                    <span className="ys-search-row-text">
                      <Highlight text={s} query={trimmed} />
                    </span>
                  </Row>
                );
              })}
            </Section>
          )}

          {/* No results */}
          {trimmed && !loading && !hasResults && (
            <div className="ys-search-no-results">
              <span>{t(L, "Нічого не знайдено", "Ничего не найдено")}</span>
              <button 
                type="button" 
                className="ys-btn-sm"
                onClick={() => runSearch(trimmed)}
              >
                {t(L, "Шукати в каталозі", "Искать в каталоге")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children, action }) {
  return (
    <div className="ys-search-section">
      <div className="ys-search-section-header">
        <span className="ys-search-section-title">{title}</span>
        {action}
      </div>
      <div className="ys-search-section-list">{children}</div>
    </div>
  );
}

function Row({ children, onClick, isActive, ...props }) {
  return (
    <div 
      className={`ys-search-row ${isActive ? 'is-active' : ''}`} 
      onClick={onClick} 
      data-testid="search-suggestion-row"
      {...props}
    >
      {children}
    </div>
  );
}

function Thumb({ src }) {
  return (
    <div className="ys-search-thumb">
      {src ? (
        <img src={src} alt="" loading="lazy" />
      ) : (
        <Package size={16} style={{ opacity: 0.4 }} />
      )}
    </div>
  );
}
