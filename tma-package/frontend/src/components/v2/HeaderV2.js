import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCart } from '../../contexts/CartContext';
import axios from 'axios';
import { 
  Menu, 
  Search, 
  User, 
  Heart, 
  ShoppingCart, 
  X,
  ChevronRight,
  Phone
} from 'lucide-react';
import MegaMenuV2 from './MegaMenuV2';
import SearchSuggest from './SearchSuggest';
import MiniCart from './MiniCart';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const HeaderV2 = () => {
  const { user, isAuthenticated, googleLogin } = useAuth();
  const { language, setLanguage } = useLanguage();
  const { cartItemsCount } = useCart();
  const navigate = useNavigate();
  
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  
  const headerRef = useRef(null);
  const searchRef = useRef(null);

  // Handle scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (headerRef.current && !headerRef.current.contains(e.target)) {
        setMenuOpen(false);
        setSearchOpen(false);
        setCartOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search suggestions with debounce
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`${API_URL}/api/v2/search/suggest`, {
          params: { q: query, limit: 8 }
        });
        setSuggestions(res.data.products || []);
        setSearchOpen(true);
      } catch (error) {
        setSuggestions([]);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      setSearchOpen(false);
      setQuery('');
    }
  };

  const T = {
    uk: {
      catalog: 'Каталог',
      search: 'Пошук товарів...',
      login: 'Увійти',
      account: 'Кабінет',
      favorites: 'Обране',
      cart: 'Кошик',
      phone: '050-247-41-61'
    },
    ru: {
      catalog: 'Каталог',
      search: 'Поиск товаров...',
      login: 'Войти',
      account: 'Кабинет',
      favorites: 'Избранное',
      cart: 'Корзина',
      phone: '050-247-41-61'
    }
  };

  const txt = T[language] || T.uk;

  return (
    <header 
      ref={headerRef}
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/95 backdrop-blur-xl shadow-lg' 
          : 'bg-white border-b border-gray-100'
      }`}
    >
      <div className="container-main">
        {/* Top Bar */}
        <div className="hidden md:flex items-center justify-between py-2 text-sm border-b border-gray-100">
          <div className="flex items-center gap-4 text-gray-500">
            <a href="tel:+380502474161" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
              <Phone className="w-3.5 h-3.5" />
              {txt.phone}
            </a>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLanguage(language === 'uk' ? 'ru' : 'uk')}
              className="font-semibold text-gray-600 hover:text-blue-600 transition-colors"
            >
              {language === 'uk' ? '🇺🇦 UA' : '🇷🇺 RU'}
            </button>
          </div>
        </div>

        {/* Main Header */}
        <div className="flex items-center gap-4 py-3">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-black text-xl">
              Y
            </div>
            <span className="hidden sm:block text-xl font-black text-gray-900">Y-Store</span>
          </Link>

          {/* Catalog Button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all ${
              menuOpen 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="hidden sm:inline">{txt.catalog}</span>
          </button>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 relative" ref={searchRef}>
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.length >= 2 && setSearchOpen(true)}
                placeholder={txt.search}
                className="w-full px-5 py-3 pl-12 rounded-2xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-gray-900 placeholder-gray-400"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            
            {searchOpen && suggestions.length > 0 && (
              <SearchSuggest 
                suggestions={suggestions} 
                onClose={() => setSearchOpen(false)}
                language={language}
              />
            )}
          </form>

          {/* Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            {/* User */}
            {isAuthenticated ? (
              <Link
                to="/account"
                className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <User className="w-5 h-5 text-gray-600" />
                <span className="hidden lg:block text-sm font-semibold text-gray-700">
                  {user?.full_name?.split(' ')[0] || txt.account}
                </span>
              </Link>
            ) : (
              <button
                onClick={googleLogin}
                className="flex items-center gap-2 p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <User className="w-5 h-5 text-gray-600" />
                <span className="hidden lg:block text-sm font-semibold text-gray-700">{txt.login}</span>
              </button>
            )}

            {/* Favorites */}
            <Link
              to="/favorites"
              className="relative p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <Heart className="w-5 h-5 text-gray-600" />
            </Link>

            {/* Cart */}
            <button
              onClick={() => setCartOpen(!cartOpen)}
              className="relative flex items-center gap-2 p-2.5 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-gray-600" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {cartItemsCount > 9 ? '9+' : cartItemsCount}
                </span>
              )}
              <span className="hidden lg:block text-sm font-semibold text-gray-700">{txt.cart}</span>
            </button>

            {cartOpen && <MiniCart onClose={() => setCartOpen(false)} language={language} />}
          </div>
        </div>
      </div>

      {/* MegaMenu */}
      {menuOpen && (
        <MegaMenuV2 
          language={language} 
          onClose={() => setMenuOpen(false)} 
        />
      )}
    </header>
  );
};

export default HeaderV2;
