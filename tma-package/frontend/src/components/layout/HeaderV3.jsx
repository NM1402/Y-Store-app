import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Menu, Heart, GitCompare, User, Phone, X } from "lucide-react";
import MegaMenu from "./MegaMenu";
import MobileMenuDrawer from "./MobileMenuDrawer";
import { MiniCart } from "../cart";
import { useAuth } from "../../contexts/AuthContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { useComparison } from "../../contexts/ComparisonContext";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

/**
 * HeaderV3 - Retail-style двухстрочный header
 * BLOCK V2-12R: Возвращаем retail visual + новая архитектура
 */
export default function HeaderV3() {
  const [showMega, setShowMega] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  const megaRef = useRef(null);
  const navigate = useNavigate();
  
  const { user, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const { favorites } = useFavorites();
  const { comparisonItems } = useComparison();

  // Live search suggestions
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/v2/search/suggest`, {
          params: { q: query, limit: 6 }
        });
        setSuggestions(res.data.items || []);
        setShowSuggestions(true);
      } catch (err) {
        // Fallback to products search
        try {
          const res = await axios.get(`${API_URL}/api/products`, {
            params: { search: query, limit: 6 }
          });
          setSuggestions(res.data?.slice?.(0, 6) || []);
          setShowSuggestions(true);
        } catch {
          setSuggestions([]);
        }
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/catalog?search=${encodeURIComponent(query)}`);
      setShowSuggestions(false);
      setQuery("");
    }
  };

  const handleSuggestionClick = (product) => {
    navigate(`/product/${product.id}`);
    setShowSuggestions(false);
    setQuery("");
  };

  const favoritesCount = favorites?.length || 0;
  const comparisonCount = comparisonItems?.length || 0;

  return (
    <header className="v3-header" data-testid="header-v3">
      {/* Top line */}
      <div className="v3-top">
        <div className="container v3-top-inner">
          {/* Logo */}
          <Link to="/" className="v3-logo" data-testid="logo">
            <span className="v3-logo-text">Y-Store</span>
          </Link>

          {/* Search */}
          <div className="v3-search" ref={searchRef}>
            <form onSubmit={handleSearch} className="v3-search-form">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                placeholder="Пошук товарів..."
                className="v3-search-input"
                data-testid="search-input"
              />
              <button type="submit" className="v3-search-btn" data-testid="search-btn">
                <Search size={20} />
              </button>
            </form>

            {/* Search suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="v3-search-suggestions" data-testid="search-suggestions">
                {suggestions.map((product) => (
                  <div
                    key={product.id}
                    className="v3-suggestion-item"
                    onClick={() => handleSuggestionClick(product)}
                  >
                    {product.images?.[0] && (
                      <img src={product.images[0]} alt="" className="v3-suggestion-img" />
                    )}
                    <div className="v3-suggestion-info">
                      <div className="v3-suggestion-title">{product.title || product.name}</div>
                      <div className="v3-suggestion-price">{product.price?.toLocaleString()} ₴</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contacts */}
          <div className="v3-right">
            {/* Social icons */}
            <div className="v3-socials">
              <a href="https://t.me/ystore_shop" target="_blank" rel="noreferrer" title="Telegram">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
              </a>
              <a href="https://instagram.com/ystore_shop" target="_blank" rel="noreferrer" title="Instagram">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://tiktok.com/@ystore_shop" target="_blank" rel="noreferrer" title="TikTok">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
              </a>
              <a href="https://facebook.com/ystore.shop" target="_blank" rel="noreferrer" title="Facebook">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>

            {/* Contacts */}
            <div className="v3-contacts">
              <a href="tel:+380502474161" className="v3-phone">
                <Phone size={14} />
                <span>050-247-41-61</span>
              </a>
              <a href="tel:+380637247703" className="v3-phone">
                <Phone size={14} />
                <span>063-724-77-03</span>
              </a>
            </div>

            {/* Icons */}
            <div className="v3-icons">
              <Link 
                to="/wishlist" 
                className="v3-icon-link" 
                title="Обране"
                data-testid="wishlist-link"
              >
                <Heart size={22} />
                {favoritesCount > 0 && <span className="v3-badge">{favoritesCount}</span>}
              </Link>
              <Link 
                to="/comparison" 
                className="v3-icon-link" 
                title="Порівняння"
                data-testid="compare-link"
              >
                <GitCompare size={22} />
                {comparisonCount > 0 && <span className="v3-badge">{comparisonCount}</span>}
              </Link>
              
              {/* Mini Cart */}
              <MiniCart />
              
              <Link 
                to={isAuthenticated ? "/account" : "/login"} 
                className="v3-icon-link v3-user-link"
                title={isAuthenticated ? "Кабінет" : "Увійти"}
                data-testid="account-link"
              >
                <User size={22} />
                {isAuthenticated && user?.full_name && (
                  <span className="v3-user-name">{user.full_name.split(" ")[0]}</span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom nav */}
      <div className="v3-bottom">
        <div className="container v3-bottom-inner">
          {/* Catalog button with MegaMenu */}
          <div
            className="v3-catalog-btn"
            ref={megaRef}
            onMouseEnter={() => setShowMega(true)}
            onMouseLeave={() => setShowMega(false)}
            data-testid="catalog-btn"
          >
            <Menu size={18} />
            <span>Каталог</span>
          </div>
          
          {/* MegaMenu 2.0 - Full width */}
          {showMega && (
            <div 
              className="v3-mega-container"
              onMouseEnter={() => setShowMega(true)}
              onMouseLeave={() => setShowMega(false)}
            >
              <MegaMenu onClose={() => setShowMega(false)} />
            </div>
          )}

          {/* Navigation */}
          <nav className="v3-nav">
            <Link to="/contact" className="v3-nav-link">Контакти</Link>
            <Link to="/delivery-payment" className="v3-nav-link">Доставка і оплата</Link>
            <Link to="/exchange-return" className="v3-nav-link">Обмін і повернення</Link>
            <Link to="/about" className="v3-nav-link">Про нас</Link>
            <Link to="/promotions" className="v3-nav-link v3-nav-promo">Акції</Link>
          </nav>

          {/* Mobile Menu Button */}
          <button 
            className="v3-mobile-menu-btn md:hidden"
            onClick={() => setShowMobileMenu(true)}
            data-testid="mobile-menu-btn"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* V2-23: Mobile Menu Drawer */}
      <MobileMenuDrawer 
        open={showMobileMenu} 
        onClose={() => setShowMobileMenu(false)} 
      />
    </header>
  );
}
