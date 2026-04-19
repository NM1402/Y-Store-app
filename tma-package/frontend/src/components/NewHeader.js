import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, ShoppingCart, Heart, GitCompare, User, LogOut, Menu, X,
  Smartphone, Laptop, Monitor, Tv, Watch, Camera, Headphones, Gamepad,
  Home, Zap, ShoppingBag, Coffee, Microwave, Fan, Wind, Snowflake,
  Shirt, Book, Music, Car, Bike, Dumbbell, Baby,
  Pill, Leaf, Palette, Wrench, Hammer, Lightbulb, Wifi, Speaker
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useComparison } from '../contexts/ComparisonContext';
import { useCatalog } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../contexts/NotificationsContext';
import MobileMenu from './MobileMenu';
import SearchDropdown from './SearchDropdown';
import axios from 'axios';

const NewHeader = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cart } = useCart();
  const { favorites } = useFavorites();
  const { comparison } = useComparison();
  const { openCatalog } = useCatalog();
  const { t } = useLanguage();
  const { hasUnreadNotifications } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cartItemsCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const favoritesCount = favorites?.products?.length || 0;
  const comparisonCount = comparison?.products?.length || 0;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white sticky top-0 z-50 shadow-xl backdrop-blur-lg bg-white/95 overflow-visible">
      {/* Mobile Menu */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
      
      {/* Main Header - White Section */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between py-4 md:py-5 gap-2 md:gap-4">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 rounded-2xl transition-all duration-300 hover:scale-110 active:scale-95"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>
          
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              to="/" 
              className="text-2xl md:text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300"
            >
              Y-store
            </Link>
          </div>

          {/* Search Bar - Hidden on mobile, visible on md+ */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-4 lg:mx-8">
            <SearchDropdown />
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 md:gap-4 lg:gap-6">
            {/* Phones - Hidden on mobile and tablet */}
            <div className="hidden xl:flex flex-col text-right text-sm leading-tight">
              <a href="tel:050-247-41-61" className="font-medium text-black hover:text-blue-600 mb-0.5">
                📞 050-247-41-61
              </a>
              <a href="tel:063-724-77-03" className="font-medium text-black hover:text-blue-600">
                📞 063-724-77-03
              </a>
            </div>

            {/* Social Icons - Hidden on mobile */}
            <div className="hidden md:flex items-center gap-2">
              <a href="https://t.me/yourtelegram" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-black rounded-full flex items-center justify-center hover:bg-gray-800">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
                </svg>
              </a>
              <a href="viber://chat?number=%2B380502474161" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-black rounded-full flex items-center justify-center hover:bg-gray-800">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.35.5C6.697.5 2.09 5.107 2.09 10.76c0 1.904.522 3.684 1.427 5.214L2 20.5l4.74-1.474c1.452.803 3.13 1.264 4.91 1.264 5.653 0 10.26-4.607 10.26-10.26C21.91 5.107 17.303.5 12.35.5zm5.8 13.96c-.226.634-1.132 1.165-1.85 1.314-.493.098-.947.442-3.206-.668-2.715-1.337-4.458-4.123-4.594-4.312-.136-.19-1.11-1.477-1.11-2.817 0-1.34.704-1.998.952-.77.247.002.588.092.845.092.248 0 .548-.097.858.656.317.772 1.08 2.634 1.174 2.825.095.19.158.412.032.603-.127.19-.19.308-.38.474-.19.165-.4.37-.57.497-.19.143-.388.297-.167.583.222.286.987 1.628 2.12 2.635 1.458 1.297 2.687 1.698 3.067 1.888.38.19.603.158.825-.095.222-.254.95-1.108 1.204-1.49.254-.38.507-.317.857-.19.35.126 2.223 1.048 2.603 1.238.38.19.634.285.73.444.095.158.095.92-.13 1.553z"/>
                </svg>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-black rounded-full flex items-center justify-center hover:bg-gray-800">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" className="w-8 h-8 bg-black rounded-full flex items-center justify-center hover:bg-gray-800">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                </svg>
              </a>
            </div>

            {/* Favorites */}
            <Link
              to="/favorites"
              className="flex items-center gap-1 md:gap-2 text-black hover:text-pink-600 transition-all duration-300 hover:scale-110 active:scale-95 p-2 hover:bg-pink-50 rounded-2xl"
              title="Обране"
            >
              <div className="relative">
                <Heart className={`w-5 h-5 md:w-6 md:h-6 ${favoritesCount > 0 ? 'fill-pink-500 text-pink-500' : ''}`} />
                <span className={`absolute -top-2 -right-2 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${favoritesCount > 0 ? 'bg-pink-500' : 'bg-gray-400'}`}>
                  {favoritesCount}
                </span>
              </div>
              <span className="hidden lg:inline text-sm">Обране</span>
            </Link>

            {/* Comparison */}
            <Link
              to="/comparison"
              className="flex items-center gap-1 md:gap-2 text-black hover:text-blue-600 transition-all duration-300 hover:scale-110 active:scale-95 p-2 hover:bg-blue-50 rounded-2xl"
              title="Порівняння"
            >
              <div className="relative">
                <GitCompare className="w-5 h-5 md:w-6 md:h-6" />
                <span className={`absolute -top-2 -right-2 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${comparisonCount > 0 ? 'bg-blue-500' : 'bg-gray-400'}`}>
                  {comparisonCount}
                </span>
              </div>
              <span className="hidden lg:inline text-sm">Порівняння</span>
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              className="flex items-center gap-1 md:gap-2 text-black hover:text-green-600 transition-all duration-300 hover:scale-110 active:scale-95 p-2 hover:bg-green-50 rounded-2xl"
              title={t('myCart')}
            >
              <div className="relative">
                <ShoppingCart className="w-5 h-5 md:w-6 md:h-6" />
                <span className={`absolute -top-2 -right-2 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ${cartItemsCount > 0 ? 'bg-green-500' : 'bg-gray-400'}`}>
                  {cartItemsCount}
                </span>
              </div>
              <span className="hidden md:inline text-sm">{t('myCart')}</span>
            </Link>
          </div>
        </div>
        
        {/* Mobile Search - Visible only on mobile */}
        <div className="md:hidden pb-3">
          <SearchDropdown />
        </div>
      </div>

      {/* Dark Navigation Bar - BLACK - Absolutely centered */}
      <div 
        data-testid="main-navigation"
        className="bg-black text-white py-3 md:py-4"
        style={{
          position: 'relative',
          width: '100vw',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          justifyContent: 'center'
        }}
      >
        <div data-testid="nav-links" className="flex items-center gap-6 xl:gap-10 text-sm xl:text-base">
          {/* Catalog button */}
          <button
            onClick={openCatalog}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 md:px-6 py-2 rounded-full hover:bg-blue-700 transition-colors font-medium"
          >
            <Menu className="w-4 h-4" />
            <span className="hidden sm:inline">{t('catalog')}</span>
            <span className="sm:hidden">Меню</span>
          </button>
          
          {/* Navigation Links */}
          <Link to="/contact" className="hidden lg:inline-block hover:text-gray-300 transition-colors whitespace-nowrap">
            {t('contactInfo')}
          </Link>
          
          <Link to="/delivery-payment" className="hidden lg:inline-block hover:text-gray-300 transition-colors whitespace-nowrap">
            {t('deliveryPayment')}
          </Link>
          
          <Link to="/exchange-return" className="hidden lg:inline-block hover:text-gray-300 transition-colors whitespace-nowrap">
            {t('exchangeReturn')}
          </Link>
          
          <Link to="/about" className="hidden lg:inline-block hover:text-gray-300 transition-colors whitespace-nowrap">
            {t('aboutUs')}
          </Link>
          
          <Link to="/promotions" className="hidden lg:inline-block text-red-400 hover:text-red-300 transition-colors whitespace-nowrap font-medium">
            Акції
          </Link>
        </div>
      </div>
    </header>
  );
};

export default NewHeader;