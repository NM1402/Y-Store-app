import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { productsAPI } from '../../utils/api';
import { useLanguage } from '../../contexts/LanguageContext';

/**
 * Cart Side Drawer V2
 * BLOCK V2-13: Side drawer with animations and mini cart
 */
export default function CartDrawer({ isOpen, onClose }) {
  const { cart, removeFromCart, clearCart, addToCart, fetchCart } = useCart();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const drawerRef = useRef(null);
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(false);
  const [removingItem, setRemovingItem] = useState(null);

  // Fetch cart and products when drawer opens
  useEffect(() => {
    if (isOpen) {
      fetchCart(); // Refresh cart data from server
    }
  }, [isOpen]);

  // Fetch products for cart items
  useEffect(() => {
    if (isOpen && cart?.items?.length > 0) {
      fetchCartProducts();
    }
  }, [cart?.items, isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const fetchCartProducts = async () => {
    try {
      setLoading(true);
      const productPromises = cart.items.map((item) =>
        productsAPI.getById(item.product_id).catch(() => null)
      );
      const results = await Promise.all(productPromises);
      const productsMap = {};
      results.forEach((res, idx) => {
        if (res?.data) {
          productsMap[cart.items[idx].product_id] = res.data;
        }
      });
      setProducts(productsMap);
    } catch (error) {
      console.error('Failed to fetch cart products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (productId) => {
    setRemovingItem(productId);
    await removeFromCart(productId);
    setRemovingItem(null);
  };

  const handleQuantityChange = async (productId, currentQty, delta) => {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      handleRemoveItem(productId);
    } else if (delta > 0) {
      await addToCart(productId, 1);
    }
    // Note: For decrease, we'd need a dedicated API endpoint
  };

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  const cartItems = cart?.items || [];
  const total = cartItems.reduce((sum, item) => {
    const product = products[item.product_id];
    return sum + (product?.price || item.price) * item.quantity;
  }, 0);
  const itemsCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`ys-drawer-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        data-testid="cart-drawer-backdrop"
      />
      
      {/* Drawer */}
      <div 
        ref={drawerRef}
        className={`ys-drawer ${isOpen ? 'open' : ''}`}
        data-testid="cart-drawer"
      >
        {/* Header */}
        <div className="ys-drawer-header">
          <div className="ys-drawer-title">
            <ShoppingBag size={24} />
            <span>Кошик</span>
            {itemsCount > 0 && (
              <span style={{ background: '#2563eb', color: 'white', fontSize: 12, padding: '2px 8px', borderRadius: 20 }}>{itemsCount}</span>
            )}
          </div>
          <button 
            className="ys-drawer-close"
            onClick={onClose}
            data-testid="cart-drawer-close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="ys-drawer-content">
          {cartItems.length === 0 ? (
            <div className="cart-drawer-empty">
              <div className="cart-drawer-empty-icon">
                <ShoppingBag size={48} strokeWidth={1.5} />
              </div>
              <h3>Кошик порожній</h3>
              <p>Додайте товари, щоб оформити замовлення</p>
              <button 
                className="cart-drawer-shop-btn"
                onClick={() => { onClose(); navigate('/catalog'); }}
              >
                Перейти до каталогу
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            <div className="cart-drawer-items">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="cart-drawer-item skeleton" />
                ))
              ) : (
                cartItems.map((item, index) => {
                  const product = products[item.product_id];
                  const isRemoving = removingItem === item.product_id;
                  
                  // Show skeleton if product is still loading
                  if (!product) {
                    return (
                      <div key={item.product_id} className="cart-drawer-item skeleton" />
                    );
                  }
                  
                  return (
                    <div 
                      key={item.product_id}
                      className={`cart-drawer-item ${isRemoving ? 'removing' : ''}`}
                      data-testid={`drawer-item-${item.product_id}`}
                    >
                      {/* Image */}
                      <Link 
                        to={`/product/${product.id}`} 
                        className="cart-drawer-item-img"
                        onClick={onClose}
                      >
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt={product.title} />
                        ) : (
                          <div className="cart-drawer-item-placeholder">📦</div>
                        )}
                      </Link>
                      
                      {/* Info */}
                      <div className="cart-drawer-item-info">
                        <Link 
                          to={`/product/${product.id}`}
                          className="cart-drawer-item-title"
                          onClick={onClose}
                        >
                          {product.title}
                        </Link>
                        
                        {/* Quantity & Price Row */}
                        <div className="cart-drawer-item-row">
                          <div className="cart-drawer-item-qty">
                            <button 
                              className="qty-btn"
                              onClick={() => handleQuantityChange(item.product_id, item.quantity, -1)}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="qty-value">{item.quantity}</span>
                            <button 
                              className="qty-btn"
                              onClick={() => handleQuantityChange(item.product_id, item.quantity, 1)}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          
                          <div className="cart-drawer-item-price">
                            {(product.price * item.quantity).toLocaleString()} ₴
                          </div>
                        </div>
                      </div>
                      
                      {/* Remove Button */}
                      <button 
                        className="cart-drawer-item-remove"
                        onClick={() => handleRemoveItem(item.product_id)}
                        data-testid={`drawer-remove-${item.product_id}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="cart-drawer-footer" style={{ 
            padding: '16px 20px', 
            borderTop: '1px solid #e5e7eb', 
            background: '#ffffff',
            flexShrink: 0 
          }}>
            {/* Totals */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '8px',
                fontSize: '14px',
                color: '#374151'
              }}>
                <span>Разом ({itemsCount} товарів)</span>
                <span style={{ fontWeight: 700, fontSize: '18px', color: '#1e293b' }}>
                  {total.toLocaleString()} ₴
                </span>
              </div>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                fontSize: '13px',
                color: '#6b7280'
              }}>
                <span>Доставка</span>
                <span style={{ color: '#059669', fontWeight: 600 }}>Безкоштовно</span>
              </div>
            </div>
            
            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '12px' }}>
              <button 
                onClick={handleCheckout}
                data-testid="drawer-checkout-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '14px',
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Оформити замовлення
                <ArrowRight size={18} />
              </button>
              <Link 
                to="/cart" 
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  padding: '12px',
                  background: '#f8fafc',
                  color: '#374151',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none'
                }}
              >
                Переглянути кошик
              </Link>
            </div>
            
            {/* Clear Cart */}
            <button 
              onClick={clearCart}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                padding: '10px',
                background: 'transparent',
                color: '#9ca3af',
                border: 'none',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={14} />
              Очистити кошик
            </button>
          </div>
        )}
      </div>
    </>
  );
}
