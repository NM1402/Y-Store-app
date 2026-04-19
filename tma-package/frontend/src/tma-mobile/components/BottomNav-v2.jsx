/**
 * Bottom Navigation v2.0
 * Floating glass-like surface, Lucide icons, active pill
 * With cart bump animation
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Grid, Search, ShoppingCart, User } from 'lucide-react';
import useCartStore from '../store/cart';
import telegram from '../lib/telegram-sdk';
import './BottomNav-v2.css';

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getCount } = useCartStore();
  const cartCount = getCount();
  const [showBump, setShowBump] = useState(false);
  const [prevCount, setPrevCount] = useState(cartCount);

  // Bump animation when cart count increases
  useEffect(() => {
    if (cartCount > prevCount) {
      setShowBump(true);
      setTimeout(() => setShowBump(false), 400);
    }
    setPrevCount(cartCount);
  }, [cartCount, prevCount]);

  const tabs = [
    { id: 'home', path: '/tma', icon: <Home size={24} />, label: 'Головна' },
    { id: 'catalog', path: '/tma/catalog', icon: <Grid size={24} />, label: 'Каталог' },
    { id: 'search', path: '/tma/search', icon: <Search size={24} />, label: 'Пошук' },
    { id: 'cart', path: '/tma/cart', icon: <ShoppingCart size={24} />, label: 'Кошик', badge: cartCount },
    { id: 'profile', path: '/tma/profile', icon: <User size={24} />, label: 'Профіль' },
  ];

  const isActive = (path) => {
    if (path === '/tma') {
      return location.pathname === '/tma';
    }
    return location.pathname.startsWith(path);
  };

  const handleNavigation = (tab) => {
    telegram.haptic('light');
    navigate(tab.path);
  };

  return (
    <nav className="bottom-nav-v2" data-testid="bottom-nav">
      <div className="bottom-nav-v2__container">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.id}
              data-testid={`bottom-nav-${tab.id}`}
              className={`bottom-nav-v2__item ${active ? 'bottom-nav-v2__item--active' : ''}`}
              onClick={() => handleNavigation(tab)}
              aria-label={tab.label}
            >
              <div className="bottom-nav-v2__icon">
                {tab.icon}
              </div>
              <span className="bottom-nav-v2__label">{tab.label}</span>
              {tab.badge > 0 && (
                <div className={`bottom-nav-v2__badge ${showBump ? 'cart-bump' : ''}`}>
                  {tab.badge > 99 ? '99+' : tab.badge}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
