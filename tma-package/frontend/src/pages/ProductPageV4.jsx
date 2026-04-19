/**
 * ProductPageV4 - B12 Foxtrot-style Product Page
 * Features: Zoom gallery, sticky buy bar, tabs, buy together, trust blocks
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Star, Heart, GitCompare, ShoppingCart, ChevronRight, 
  Truck, CreditCard, Shield, RefreshCw, Package, MessageCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useComparison } from '../contexts/ComparisonContext';
import { useLanguage } from '../contexts/LanguageContext';
import { productsAPI, reviewsAPI } from '../utils/api';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import ProductCardCompact from '../components/ProductCardCompact';
import GalleryZoom from '../components/product/GalleryZoom';
import ProductTabs from '../components/product/ProductTabs';
import BuyTogether from '../components/product/BuyTogether';
import StickyBuyBar from '../components/product/StickyBuyBar';
import { MobileStickyBuyBar } from '../components/mobile';
import useIsMobile from '../hooks/useIsMobile';
import { trackProductView, trackAddToCart } from '../lib/track';
import { addToRecentlyViewed } from '../components/home/RecentlyViewed';
import SupportModal from '../components/SupportModal';

const t = (lang, uk, ru) => (lang === "ru" ? ru : uk);

// Trust Row Component
function TrustRow({ icon: Icon, text }) {
  return (
    <div className="ys-trust-row">
      <div className="ys-trust-ico"><Icon size={18} /></div>
      <div className="ys-trust-text">{text}</div>
    </div>
  );
}

export default function ProductPageV4() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const L = language === "ru" ? "ru" : "uk";
  const isMobile = useIsMobile();
  
  const { isAuthenticated } = useAuth();
  const { addToCart, cart } = useCart();
  const { favorites, toggleFavorite } = useFavorites();
  const { comparedItems, addToComparison, removeFromComparison } = useComparison();

  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);
  const [buyTogether, setBuyTogether] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchReviews();
      fetchRelated();
    }
  }, [id]);

  // Track scroll for sticky bar
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getById(id);
      const p = response.data;
      setProduct(p);
      
      // Track view
      if (p) {
        trackProductView(p.id);
        addToRecentlyViewed(p);
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
      toast.error(t(L, 'Не вдалося завантажити товар', 'Не удалось загрузить товар'));
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await reviewsAPI.getByProduct(id);
      setReviews(response.data || []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const fetchRelated = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/v2/products/${id}/related?limit=8`);
      const data = await res.json();
      const items = data?.products || [];
      setRelated(items);
      // Use first 4 as "buy together"
      setBuyTogether(items.slice(0, 4).map(p => ({
        id: p.id,
        slug: p.slug || p.id,
        title: p.title || p.name,
        price: p.price,
        image: (p.images || [])[0]
      })));
    } catch (error) {
      console.error('Failed to fetch related:', error);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    trackAddToCart(product.id, quantity, product.price);
    
    if (!isAuthenticated) {
      // Allow guest cart
    }
    
    await addToCart(product.id, quantity);
    // Toast is handled by CartContext
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    setTimeout(() => navigate('/checkout'), 300);
  };

  const handleBuyTogetherAdd = (p, qty) => {
    addToCart(p.id, qty);
    // Toast is handled by CartContext
  };

  const isFavorite = product && favorites?.includes(product.id);
  const isCompared = product && comparedItems?.some(item => item.id === product.id);

  const handleToggleFavorite = () => {
    if (!product) return;
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    toggleFavorite(product.id);
  };

  const handleToggleCompare = () => {
    if (!product) return;
    if (isCompared) {
      removeFromComparison(product.id);
      toast.success(t(L, 'Видалено з порівняння', 'Удалено из сравнения'));
    } else {
      addToComparison(product);
      toast.success(t(L, 'Додано до порівняння', 'Добавлено к сравнению'));
    }
  };

  // Breadcrumbs
  const breadcrumbs = useMemo(() => [
    { label: t(L, "Головна", "Главная"), to: "/" },
    { label: t(L, "Каталог", "Каталог"), to: "/catalog" },
    ...(product?.category_name ? [{ label: product.category_name, to: `/catalog?category=${product.category_id || ''}` }] : []),
    { label: product?.title || product?.name || "...", to: null }
  ], [product, L]);

  if (loading) {
    return (
      <div className="ys-container ys-section">
        <div className="ys-skel" style={{ height: 520, borderRadius: 18 }} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="ys-container ys-section">
        <div className="ys-card" style={{ padding: 40 }}>
          <h2>{t(L, "Товар не знайдено", "Товар не найден")}</h2>
          <Link to="/catalog" className="ys-btn ys-btn-primary" style={{ marginTop: 16 }}>
            {t(L, "До каталогу", "В каталог")}
          </Link>
        </div>
      </div>
    );
  }

  const p = product;
  const images = p.images || [];
  const stockLevel = p.stock_level ?? 0;
  const inStock = stockLevel > 0;
  const isLowStock = stockLevel > 0 && stockLevel <= 5; // Товар заканчивается
  const discount = p.compare_price && p.compare_price > p.price 
    ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) 
    : null;
  
  // Build specs from product attributes
  const specs = p.specifications || p.attributes || {};

  return (
    <div className="ys-page ys-pdp-page" data-testid="product-page-v4">
      <div className="ys-container ys-section">
        {/* Breadcrumb */}
        <nav 
          className="ys-breadcrumb" 
          data-testid="breadcrumb"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '14px 20px',
            marginBottom: '24px',
            background: '#f1f5f9',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            fontSize: '14px',
            fontWeight: '500'
          }}
        >
          {breadcrumbs.map((c, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              {c.to ? (
                <Link to={c.to} className="ys-link" style={{ color: '#2563eb', textDecoration: 'none' }}>{c.label}</Link>
              ) : (
                <span style={{ color: '#475569', fontWeight: '600' }}>{c.label}</span>
              )}
              {i < breadcrumbs.length - 1 && <ChevronRight size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />}
            </span>
          ))}
        </nav>

        {/* Main Product Grid */}
        <div className="ys-pdp-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '40px', alignItems: 'start' }}>
          {/* Left: Gallery */}
          <div className="ys-pdp-gallery" style={{ position: 'sticky', top: '100px' }}>
            <GalleryZoom images={images} />
          </div>

          {/* Right: Buy Panel */}
          <div className="ys-buy-panel">
            {/* Title */}
            <h1 className="ys-product-title">{p.title || p.name}</h1>

            {/* Rating + Stock Status Row - компактно в одну строку */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px', 
              marginTop: '12px',
              marginBottom: '16px'
            }}>
              {/* Rating */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                color: '#f59e0b'
              }}>
                <Star size={16} fill="#f59e0b" stroke="#f59e0b" />
                <span style={{ fontWeight: '600', color: '#1e293b' }}>
                  {Number(p.rating || 4.5).toFixed(1)}
                </span>
                {p.reviews_count > 0 && (
                  <span style={{ color: '#64748b', fontSize: '13px' }}>
                    ({p.reviews_count} {t(L, "відгуків", "отзывов")})
                  </span>
                )}
              </div>

              <span style={{ color: '#cbd5e1' }}>|</span>

              {/* Stock Status - реальная логика */}
              {inStock ? (
                isLowStock ? (
                  <span style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: '#fef3c7',
                    color: '#d97706',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    <span style={{ 
                      width: '8px', 
                      height: '8px', 
                      background: '#f59e0b', 
                      borderRadius: '50%' 
                    }} />
                    {t(L, "Закінчується", "Заканчивается")} ({stockLevel} {t(L, "шт", "шт")})
                  </span>
                ) : (
                  <span style={{ 
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: '#dcfce7',
                    color: '#16a34a',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600'
                  }}>
                    <span style={{ 
                      width: '8px', 
                      height: '8px', 
                      background: '#22c55e', 
                      borderRadius: '50%' 
                    }} />
                    {t(L, "Є в наявності", "В наличии")}
                  </span>
                )
              ) : (
                <span style={{ 
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  <span style={{ 
                    width: '8px', 
                    height: '8px', 
                    background: '#ef4444', 
                    borderRadius: '50%' 
                  }} />
                  {t(L, "Немає в наявності", "Нет в наличии")}
                </span>
              )}

              {/* Discount badge */}
              {discount && (
                <>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <span style={{ 
                    padding: '6px 12px',
                    background: '#fef2f2',
                    color: '#dc2626',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '700'
                  }}>
                    -{discount}%
                  </span>
                </>
              )}
            </div>

            {/* Price */}
            <div className="ys-product-price-block">
              <div className="ys-product-price">{p.price} грн</div>
              {p.compare_price && p.compare_price > p.price && (
                <div className="ys-product-old-price">{p.compare_price} грн</div>
              )}
            </div>

            {/* Quantity */}
            <div className="ys-quantity-row">
              <span className="ys-quantity-label">{t(L, "Кількість:", "Количество:")}</span>
              <div className="ys-quantity-controls">
                <button 
                  type="button"
                  className="ys-qty-btn" 
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                >−</button>
                <span className="ys-qty-value">{quantity}</span>
                <button 
                  type="button"
                  className="ys-qty-btn" 
                  onClick={() => setQuantity(q => q + 1)}
                >+</button>
              </div>
            </div>

            {/* Actions */}
            <div className="ys-product-actions">
              <Button 
                variant="outline" 
                className="ys-action-btn"
                onClick={handleAddToCart}
                disabled={!inStock}
                data-testid="add-to-cart-btn"
              >
                <ShoppingCart size={18} style={{ marginRight: 8 }} />
                {t(L, "У кошик", "В корзину")}
              </Button>
              <Button 
                className="ys-action-btn ys-btn-primary"
                onClick={handleBuyNow}
                disabled={!inStock}
                data-testid="buy-now-btn"
              >
                {t(L, "Купити зараз", "Купить сейчас")}
              </Button>
            </div>

            {/* Secondary actions */}
            <div className="ys-secondary-actions">
              <button 
                type="button"
                className={`ys-icon-action ${isFavorite ? 'is-active' : ''}`}
                onClick={handleToggleFavorite}
              >
                <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
                <span>{t(L, "В обране", "В избранное")}</span>
              </button>
              <button 
                type="button"
                className={`ys-icon-action ${isCompared ? 'is-active' : ''}`}
                onClick={handleToggleCompare}
              >
                <GitCompare size={18} />
                <span>{t(L, "Порівняти", "Сравнить")}</span>
              </button>
            </div>

            {/* Trust Strip */}
            <div className="ys-trust-strip">
              <TrustRow icon={Truck} text={t(L, "Доставка Новою Поштою 1-2 дні", "Доставка Новой Почтой 1-2 дня")} />
              <TrustRow icon={Shield} text={t(L, "Гарантія та підтримка", "Гарантия и поддержка")} />
              <TrustRow icon={RefreshCw} text={t(L, "Обмін/повернення 14 днів", "Обмен/возврат 14 дней")} />
              <TrustRow icon={CreditCard} text={t(L, "Оплата карткою / Fondy", "Оплата картой / Fondy")} />
            </div>

            {/* Mini Delivery Info */}
            <div className="ys-mini-delivery">
              <div className="ys-mini-delivery-title">{t(L, "Доставка і оплата", "Доставка и оплата")}</div>
              <div className="ys-mini-delivery-row">
                {t(L, "Відправка щодня. Безкоштовно від 2000 грн.", "Отправка ежедневно. Бесплатно от 2000 грн.")}
              </div>
            </div>

            {/* Contact */}
            <div className="ys-contact-row">
              <MessageCircle size={16} />
              <span>{t(L, "Є питання?", "Есть вопросы?")} </span>
              <button 
                onClick={() => setShowSupportModal(true)}
                className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                data-testid="contact-support-link"
              >
                {t(L, "Напишіть нам", "Напишите нам")}
              </button>
            </div>
          </div>
        </div>

        {/* Support Modal */}
        <SupportModal 
          isOpen={showSupportModal} 
          onClose={() => setShowSupportModal(false)} 
        />

        {/* Buy Together Section */}
        {buyTogether.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <BuyTogether 
              baseProduct={{ id: p.id, slug: p.slug, title: p.title || p.name, price: p.price }}
              items={buyTogether}
              onAddToCart={handleBuyTogetherAdd}
            />
          </div>
        )}

        {/* Tabs Section */}
        <div style={{ marginTop: 32 }}>
          <ProductTabs 
            description={p.description_html || p.description || ""}
            specs={specs}
            reviews={reviews}
          />
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 className="ys-section-title">{t(L, "Схожі товари", "Похожие товары")}</h2>
            <div className="ys-products-grid" style={{ marginTop: 16 }}>
              {related.slice(0, 4).map(rp => (
                <ProductCardCompact key={rp.id} product={rp} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Buy Bar - Desktop only */}
      {showStickyBar && !isMobile && (
        <StickyBuyBar 
          product={{ title: p.title || p.name, price: p.price }}
          onAdd={handleAddToCart}
          onBuy={handleBuyNow}
        />
      )}

      {/* Mobile Sticky Buy Bar - B16 */}
      {isMobile && (
        <MobileStickyBuyBar 
          price={p.price}
          comparePrice={p.compare_price}
          inStock={p.in_stock !== false}
          isInCart={cart?.items?.some(i => i.product_id === product?.id)}
          onBuy={handleAddToCart}
        />
      )}
    </div>
  );
}
