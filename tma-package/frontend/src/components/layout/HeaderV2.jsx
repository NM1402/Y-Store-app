import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import { Search, Menu, Heart, GitCompare, User, X, ChevronDown } from "lucide-react";
import MegaMenu from "./MegaMenu";
import { MiniCart } from "../cart";

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Retail Header V2
 * BLOCK V2-12 - Sticky header with MegaMenu and Live Search
 */
export default function HeaderV2({ lang = "uk", user, onLogout }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showMega, setShowMega] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);
  const megaRef = useRef(null);
  const navigate = useNavigate();

  // Live search suggestions
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const r = await axios.get(`${API_URL}/api/v2/search/suggest`, {
          params: { q: query, limit: 6 }
        });
        setSuggestions(r.data.items || []);
      } catch (err) {
        console.error("Search failed:", err);
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearch(false);
        setSuggestions([]);
      }
      if (megaRef.current && !megaRef.current.contains(e.target)) {
        setShowMega(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(query)}`);
      setSuggestions([]);
      setShowSearch(false);
    }
  };

  const handleSuggestionClick = (productId) => {
    setSuggestions([]);
    setQuery("");
    setShowSearch(false);
    navigate(`/product/${productId}`);
  };

  const t = {
    uk: {
      catalog: "Каталог",
      search: "Пошук товарів...",
      wishlist: "Обране",
      compare: "Порівняння",
      cart: "Кошик",
      account: "Кабінет",
      login: "Вхід",
    },
    ru: {
      catalog: "Каталог",
      search: "Поиск товаров...",
      wishlist: "Избранное",
      compare: "Сравнение",
      cart: "Корзина",
      account: "Кабинет",
      login: "Вход",
    }
  }[lang] || {};

  return (
    <header className="v2-header" data-testid="header-v2">
      <div className="v2-header-inner container">
        {/* Logo */}
        <Link to="/" className="v2-logo" data-testid="logo">
          <span className="v2-logo-text">Y-Store</span>
        </Link>

        {/* Catalog Button */}
        <div 
          ref={megaRef}
          className="v2-catalog-btn"
          onMouseEnter={() => setShowMega(true)}
          data-testid="catalog-btn"
        >
          <Menu size={18} />
          <span>{t.catalog}</span>
          <ChevronDown size={14} className={showMega ? "rotate" : ""} />
          
          {showMega && (
            <MegaMenu 
              lang={lang} 
              onClose={() => setShowMega(false)} 
            />
          )}
        </div>

        {/* Search */}
        <div ref={searchRef} className="v2-search-wrap">
          <form className="v2-search" onSubmit={submitSearch}>
            <Search size={18} className="v2-search-icon" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSearch(true)}
              placeholder={t.search}
              data-testid="search-input"
            />
            {query && (
              <button 
                type="button" 
                className="v2-search-clear"
                onClick={() => { setQuery(""); setSuggestions([]); }}
              >
                <X size={16} />
              </button>
            )}
            <button type="submit" className="v2-search-btn" data-testid="search-submit">
              <Search size={18} />
            </button>
          </form>

          {/* Search Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="v2-search-dropdown" data-testid="search-suggestions">
              {suggestions.map((p) => (
                <div
                  key={p.id}
                  className="v2-suggest-item"
                  onClick={() => handleSuggestionClick(p.id)}
                >
                  {p.images?.[0] && (
                    <img src={p.images[0]} alt={p.name} className="v2-suggest-img" />
                  )}
                  <div className="v2-suggest-info">
                    <div className="v2-suggest-name">{p.name}</div>
                    <div className="v2-suggest-price">{p.price?.toLocaleString()} грн</div>
                  </div>
                </div>
              ))}
              <Link 
                to={`/catalog?search=${encodeURIComponent(query)}`}
                className="v2-suggest-all"
                onClick={() => { setSuggestions([]); setShowSearch(false); }}
              >
                {lang === "uk" ? "Всі результати" : "Все результаты"} →
              </Link>
            </div>
          )}
        </div>

        {/* Icons */}
        <div className="v2-icons">
          <Link to="/compare" className="v2-icon-link" title={t.compare} data-testid="compare-link">
            <GitCompare size={20} />
          </Link>
          <Link to="/wishlist" className="v2-icon-link" title={t.wishlist} data-testid="wishlist-link">
            <Heart size={20} />
          </Link>
          
          {/* Mini Cart with Drawer */}
          <MiniCart />
          
          <Link 
            to={user ? "/account" : "/account"} 
            className="v2-icon-link user" 
            title={user ? t.account : t.login}
            data-testid="account-link"
          >
            <User size={20} />
            {user && <span className="v2-user-name">{user.name?.split(" ")[0] || ""}</span>}
          </Link>
        </div>
      </div>
    </header>
  );
}
