/**
 * BottomNav - Mobile bottom navigation
 * B16 Mobile Retail Polish
 */
import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Grid3X3, Search, ShoppingCart, User } from "lucide-react";
import { useCart } from "../../contexts/CartContext";

export default function BottomNav({ onSearchClick }) {
  const location = useLocation();
  const { cart } = useCart();
  
  const cartCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  // Don't show on checkout pages
  if (location.pathname.startsWith('/checkout')) {
    return null;
  }

  return (
    <nav className="ys-bottom-nav" data-testid="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `ys-bottom-nav-item ${isActive ? 'active' : ''}`}>
        <div className="ys-bottom-nav-icon">
          <Home size={22} />
        </div>
        <div className="ys-bottom-nav-label">Головна</div>
      </NavLink>

      <NavLink to="/catalog" className={({ isActive }) => `ys-bottom-nav-item ${isActive ? 'active' : ''}`}>
        <div className="ys-bottom-nav-icon">
          <Grid3X3 size={22} />
        </div>
        <div className="ys-bottom-nav-label">Каталог</div>
      </NavLink>

      <button 
        className="ys-bottom-nav-item" 
        onClick={onSearchClick}
        data-testid="bottom-nav-search"
      >
        <div className="ys-bottom-nav-icon">
          <Search size={22} />
        </div>
        <div className="ys-bottom-nav-label">Пошук</div>
      </button>

      <NavLink to="/cart" className={({ isActive }) => `ys-bottom-nav-item ${isActive ? 'active' : ''}`}>
        <div className="ys-bottom-nav-icon">
          <ShoppingCart size={22} />
          {cartCount > 0 && <span className="ys-bottom-nav-badge">{cartCount}</span>}
        </div>
        <div className="ys-bottom-nav-label">Кошик</div>
      </NavLink>

      <NavLink to="/account" className={({ isActive }) => `ys-bottom-nav-item ${isActive ? 'active' : ''}`}>
        <div className="ys-bottom-nav-icon">
          <User size={22} />
        </div>
        <div className="ys-bottom-nav-label">Профіль</div>
      </NavLink>
    </nav>
  );
}
