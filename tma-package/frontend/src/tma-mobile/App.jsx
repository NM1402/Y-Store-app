/**
 * TMA Mobile App - Main Entry Point
 * Mobile-first Telegram Mini App
 */

import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import useAuthStore from './store/auth';
import telegram from './lib/telegram-sdk';

// Screens (v2/v3 premium components)
import Home from './screens/Home-v2';
import Catalog from './screens/Catalog-v2';
import Product from './screens/Product-v3';
import Search from './screens/Search-v2';
import Cart from './screens/Cart-v2';
import Checkout from './screens/Checkout-v3';
import OrderSuccess from './screens/OrderSuccess';
import Profile from './screens/Profile-v2';
import Orders from './screens/Orders';
import Favorites from './screens/Favorites';
import Support from './screens/Support';

// Components (v2)
import BottomNav from './components/BottomNav-v2';
import Loading from './components/Loading';

// Styles (v2 design system)
import './styles/design-tokens.css';
import './styles/main-v2.css';
import './styles/responsive-fix.css';  // ← universal responsive layer (MUST be last)

const TMAApp = () => {
  const { loading, error, initialize } = useAuthStore();
  const location = useLocation();

  // Hide bottom nav on Product, Checkout and Success pages
  const hideBottomNav = location.pathname.includes('/product/') || 
                       location.pathname.includes('/checkout') ||
                       location.pathname.includes('/order-success');

  useEffect(() => {
    // Initialize Telegram SDK
    telegram.init();

    // Initialize auth
    initialize();

    // Apply mobile class
    document.body.classList.add('tma-mobile-body');

    // ============ UNIVERSAL RESPONSIVE ADAPTER ============
    // Відстежує ширину контейнера TMA-root та ставить класи
    // .tma-narrow / .tma-regular / .tma-wide для будь-якого браузера
    // (fallback для версій без container queries — старі Telegram Desktop)
    const applyBreakpointClass = () => {
      const root = document.getElementById('tma-root');
      if (!root) return;
      const w = root.clientWidth || window.innerWidth;
      root.classList.remove('tma-narrow', 'tma-regular', 'tma-wide', 'tma-xwide');
      if (w < 340) root.classList.add('tma-narrow');
      else if (w < 480) root.classList.add('tma-regular');
      else if (w < 720) root.classList.add('tma-wide');
      else root.classList.add('tma-xwide');
      // Експонуємо ширину як CSS-змінну (для точного clamp() у будь-якому компоненті)
      root.style.setProperty('--tma-container-width', `${w}px`);
    };

    applyBreakpointClass();
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(applyBreakpointClass)
      : null;
    const rootEl = document.getElementById('tma-root');
    if (ro && rootEl) ro.observe(rootEl);
    window.addEventListener('resize', applyBreakpointClass);
    window.addEventListener('orientationchange', applyBreakpointClass);

    return () => {
      document.body.classList.remove('tma-mobile-body');
      if (ro) ro.disconnect();
      window.removeEventListener('resize', applyBreakpointClass);
      window.removeEventListener('orientationchange', applyBreakpointClass);
    };
  }, [initialize]);

  if (loading) {
    return (
      <div id="tma-root">
        <Loading text="Ініціалізація..." />
      </div>
    );
  }

  if (error) {
    return (
      <div id="tma-root">
        <div className="tma-empty">
          <div className="tma-empty__icon">⚠️</div>
          <div className="tma-empty__title">Помилка авторизації</div>
          <div className="tma-empty__desc">{error}</div>
          <button 
            className="tma-btn tma-btn-primary"
            onClick={() => window.location.reload()}
            style={{ marginTop: 'var(--space-4)' }}
          >
            Спробувати ще раз
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="tma-root">
      <Routes>
        <Route index element={<Home />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="product/:id" element={<Product />} />
        <Route path="search" element={<Search />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="order-success" element={<OrderSuccess />} />
        <Route path="profile" element={<Profile />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<Orders />} />
        <Route path="favorites" element={<Favorites />} />
        <Route path="support" element={<Support />} />
        <Route path="*" element={<Navigate to="/tma" replace />} />
      </Routes>

      {!hideBottomNav && <BottomNav />}
    </div>
  );
};

export default TMAApp;
