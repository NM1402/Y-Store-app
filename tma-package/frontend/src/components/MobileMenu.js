import React from 'react';
import { Link } from 'react-router-dom';
import { X, User, ShoppingBag, Heart, GitCompare, LogOut, BarChart3, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import SearchDropdown from './SearchDropdown';

const MobileMenu = ({ isOpen, onClose }) => {
  const { user, logout, isAdmin, isSeller } = useAuth();
  const { t } = useLanguage();

  if (!isOpen) return null;

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 lg:hidden"
        onClick={onClose}
      />
      
      {/* Menu Panel */}
      <div className="fixed inset-y-0 left-0 w-80 bg-white z-50 shadow-2xl lg:hidden transform transition-transform duration-300 ease-in-out overflow-y-auto">
        <div className="p-6">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Logo */}
          <Link to="/" onClick={onClose} className="block mb-6">
            <h2 className="text-3xl font-bold text-black">Y-store</h2>
          </Link>

          {/* Search Bar */}
          <div className="mb-6">
            <SearchDropdown />
          </div>

          {/* User Section */}
          {user ? (
            <div className="mb-6 pb-6 border-b">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold">{user.full_name || 'Користувач'}</p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg mb-2"
                >
                  <BarChart3 className="w-5 h-5 text-purple-600" />
                  <span className="font-medium">Адмін панель</span>
                </Link>
              )}
              
              {isSeller && (
                <Link
                  to="/seller/dashboard"
                  onClick={onClose}
                  className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg mb-2"
                >
                  <Briefcase className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Панель продавця</span>
                </Link>
              )}
              
              <Link
                to="/profile"
                onClick={onClose}
                className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg mb-2"
              >
                <User className="w-5 h-5" />
                <span className="font-medium">Мій профіль</span>
              </Link>
              
              <Link
                to="/profile"
                onClick={onClose}
                className="flex items-center gap-3 p-3 hover:bg-gray-100 rounded-lg mb-2"
              >
                <ShoppingBag className="w-5 h-5" />
                <span className="font-medium">Мої замовлення</span>
              </Link>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 p-3 hover:bg-red-50 rounded-lg text-red-600 w-full"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Вийти</span>
              </button>
            </div>
          ) : (
            <div className="mb-6 pb-6 border-b">
              <Link
                to="/login"
                onClick={onClose}
                className="block w-full py-3 px-4 bg-blue-600 text-white text-center rounded-lg font-semibold mb-3 hover:bg-blue-700"
              >
                Увійти
              </Link>
              <Link
                to="/register"
                onClick={onClose}
                className="block w-full py-3 px-4 border-2 border-blue-600 text-blue-600 text-center rounded-lg font-semibold hover:bg-blue-50 whitespace-nowrap"
              >
                Зареєструватися
              </Link>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-2">
            <Link
              to="/products"
              onClick={onClose}
              className="block p-3 hover:bg-gray-100 rounded-lg font-medium"
            >
              Всі товари
            </Link>
            <Link
              to="/cart"
              onClick={onClose}
              className="flex items-center justify-between p-3 hover:bg-gray-100 rounded-lg font-medium"
            >
              <span>Кошик</span>
              {user && (
                <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs font-bold">
                  {t('myCart')}
                </span>
              )}
            </Link>
            <Link
              to="/favorites"
              onClick={onClose}
              className="block p-3 hover:bg-gray-100 rounded-lg font-medium"
            >
              Обране
            </Link>
            <Link
              to="/comparison"
              onClick={onClose}
              className="block p-3 hover:bg-gray-100 rounded-lg font-medium"
            >
              Порівняння
            </Link>
            <Link
              to="/about"
              onClick={onClose}
              className="block p-3 hover:bg-gray-100 rounded-lg font-medium"
            >
              Про нас
            </Link>
            <Link
              to="/contact"
              onClick={onClose}
              className="block p-3 hover:bg-gray-100 rounded-lg font-medium"
            >
              Контакти
            </Link>
          </nav>

          {/* Contact Info */}
          <div className="mt-8 pt-6 border-t">
            <p className="text-sm font-semibold text-gray-700 mb-3">Зв'яжіться з нами</p>
            <a href="tel:050-247-41-61" className="block text-blue-600 font-medium mb-2">
              📞 050-247-41-61
            </a>
            <a href="tel:063-724-77-03" className="block text-blue-600 font-medium">
              📞 063-724-77-03
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default MobileMenu;
