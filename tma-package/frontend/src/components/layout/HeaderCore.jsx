import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Heart, ShoppingCart, User, Phone, Search, X, Clock } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { useCart } from "../../contexts/CartContext";
import CartDrawer from "../cart/CartDrawer";
import SearchInput from "../SearchInput";
import { MegaMenuPro, MegaMenuMobile } from "../mega";
import useIsMobile from "../../hooks/useIsMobile";
import useSiteSettings from "../../hooks/useSiteSettings";

// Social icons mapping (lucide-react or custom SVG)
const SocialIcon = ({ type, size = 18 }) => {
  const icons = {
    telegram: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
    instagram: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    tiktok: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
      </svg>
    ),
    facebook: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    youtube: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    viber: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.398.002C9.474.028 5.186.251 3.01 2.31.513 4.691.041 8.33.002 12.041c-.04 3.712.323 7.352 2.852 10.134v2.825s-.017.698.45.851c.558.185.908-.366.908-.366l1.937-2.161c3.293.628 7.023.534 10.333.02 3.872-.601 7.32-2.224 8.097-7.872.92-6.69-.217-11.012-3.536-13.126C18.398.765 15.64.02 11.398.002zm.13 1.879c3.787.017 6.386.648 8.232 1.77 2.564 1.56 3.453 4.542 2.663 10.272-.664 4.687-3.469 5.874-6.878 6.376-2.943.432-6.203.419-9.266-.041l-2.76 2.467.06-3.144-.505-.504c-2.203-2.204-2.501-5.38-2.466-8.63.035-3.262.465-6.239 2.444-8.131 1.727-1.65 5.22-2.436 8.476-2.435zm-.14 2.058c-.226.002-.453.013-.678.036-.335.035-.544.355-.49.688.053.333.37.553.704.531 2.882-.187 5.303 1.089 5.993 4.458.094.458.479.742.833.742.391 0 .787-.333.714-.863-.84-6.044-5.53-5.632-7.076-5.592zm-.232 1.477c-.269.004-.538.02-.804.05-.29.034-.5.312-.465.612.035.3.31.52.6.499 2.26-.167 3.903.908 4.418 2.896.078.299.347.486.633.486.326 0 .66-.253.598-.658-.57-3.707-3.48-3.921-4.98-3.885zm-.18 1.471c-.24.004-.48.024-.716.062-.265.043-.45.306-.41.58.04.273.295.463.56.43 1.587-.198 2.729.68 3.076 1.854.065.219.264.36.482.36.27 0 .54-.219.494-.554-.404-2.944-2.515-2.78-3.486-2.732zm-2.028 1.126c-.48 0-.962.19-1.32.548-.426.426-.533 1.118-.328 1.686l.067.15c.66 1.378 1.527 2.665 2.594 3.768 1.054 1.09 2.31 1.99 3.671 2.71l.227.108c.579.254 1.3.169 1.749-.278.358-.358.548-.84.548-1.32 0-.177-.028-.355-.084-.526l-.206-.572c-.148-.41-.474-.742-.886-.893l-1.18-.434c-.349-.128-.745-.057-1.022.185l-.562.49c-.228.2-.56.235-.823.086-1.186-.67-2.147-1.592-2.845-2.744-.146-.24-.125-.55.054-.77l.463-.568c.236-.291.296-.687.159-1.032l-.415-1.046c-.14-.35-.419-.619-.774-.747l-.56-.214c-.166-.063-.341-.095-.517-.095z"/>
      </svg>
    ),
  };
  return icons[type] || null;
};

/**
 * HeaderCore - Clean retail header with Topbar + Socials + MegaMenu
 * Configuration from SiteSettings API via useSiteSettings hook
 */
export default function HeaderCore({ hideNavigation = false }) {
  const { isAuthenticated } = useAuth();
  const { favorites } = useFavorites();
  const { cart } = useCart();
  const isMobile = useIsMobile();
  
  // Single source of truth for site settings
  const { phones, socials, workingHours, showTopbar, topbarStyle, loading } = useSiteSettings();

  const [showMega, setShowMega] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);

  const favoritesCount = favorites?.length || 0;
  const cartCount = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;

  // Каталог открывается ТОЛЬКО по клику
  const handleCatalogClick = () => {
    setShowMega(!showMega);
  };

  // Filter enabled socials
  const enabledSocials = socials || [];

  return (
    <>
      <header className="ys-header" data-testid="header-core">
        {/* Top Line - Full width white background */}
        <div className="ys-header-top-wrapper">
          <div className="ys-container ys-header-top-inner">
            {/* Logo */}
            <Link to="/" className="ys-header-logo" data-testid="logo">
              Y-Store
            </Link>

            {/* Search - Desktop */}
            <div className="ys-header-search hide-on-mobile">
              <SearchInput />
            </div>

            {/* Mobile Search Button */}
            <button 
              className="ys-header-icon show-on-mobile"
              onClick={() => setShowMobileSearch(true)}
              data-testid="mobile-search-btn"
              aria-label="Search"
            >
              <Search size={22} />
            </button>

            {/* Socials in header (between search and phones) - Desktop */}
            <div className="ys-header-socials hide-on-mobile">
              {enabledSocials.slice(0, 4).map((social, i) => (
                <a 
                  key={i}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ys-header-social"
                  aria-label={social.type}
                >
                  <SocialIcon type={social.type} size={18} />
                </a>
              ))}
            </div>

            {/* Contacts (desktop) */}
            <div className="ys-header-phones hide-on-mobile">
              {phones?.slice(0, 2).map((phone, i) => (
                <a 
                  key={i} 
                  href={`tel:${phone.replace(/[^0-9+]/g, '')}`}
                  className={i === 0 ? "ys-header-phone-main" : "ys-header-phone-sub"}
                >
                  {i === 0 && <Phone size={14} />}
                  {phone}
                </a>
              ))}
            </div>

            {/* Icons */}
            <div className="ys-header-icons">
              <Link to="/favorites" className="ys-header-icon hide-on-mobile" data-testid="favorites-btn">
                <Heart size={22} />
                {favoritesCount > 0 && (
                  <span className="ys-header-badge">{favoritesCount}</span>
                )}
              </Link>

              <button 
                className="ys-header-icon hide-on-mobile" 
                onClick={() => setShowCart(true)}
                data-testid="cart-btn"
              >
                <ShoppingCart size={22} />
                {cartCount > 0 && (
                  <span className="ys-header-badge">{cartCount}</span>
                )}
              </button>

              <Link 
                to={isAuthenticated ? "/account" : "/login"} 
                className="ys-header-icon hide-on-mobile"
                data-testid="user-btn"
              >
                <User size={22} />
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Line - Navigation - Dark background - CENTERED */}
        {!hideNavigation && (
          <div className="ys-header-bottom bg-slate-800" style={{ backgroundColor: '#1e293b' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  className="ys-header-catalog-btn"
                  onClick={handleCatalogClick}
                  data-testid="catalog-btn"
                >
                  {showMega ? <X size={20} /> : <Menu size={20} />}
                  Каталог
                </button>

                <nav className="ys-header-nav">
                  <Link to="/contact" className="ys-header-nav-link text-gray-200 hover:text-white">Контакти</Link>
                  <Link to="/delivery-payment" className="ys-header-nav-link text-gray-200 hover:text-white">Доставка і оплата</Link>
                  <Link to="/exchange-return" className="ys-header-nav-link text-gray-200 hover:text-white">Обмін і повернення</Link>
                  <Link to="/about" className="ys-header-nav-link text-gray-200 hover:text-white">Про нас</Link>
                  <Link to="/promotions" className="ys-header-nav-link promo text-red-500">Акції</Link>
                </nav>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Desktop MegaMenu */}
      {!isMobile && (
        <MegaMenuPro 
          isOpen={showMega} 
          onClose={() => setShowMega(false)} 
        />
      )}

      {/* Mobile MegaMenu */}
      {isMobile && (
        <MegaMenuMobile 
          isOpen={showMega} 
          onClose={() => setShowMega(false)} 
        />
      )}

      {/* Mobile Full-Screen Search */}
      {showMobileSearch && (
        <div className="ys-mobile-search-overlay" data-testid="mobile-search-overlay">
          <SearchInput 
            isMobileFullScreen 
            autoFocus 
            onClose={() => setShowMobileSearch(false)} 
          />
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer isOpen={showCart} onClose={() => setShowCart(false)} />
    </>
  );
}
