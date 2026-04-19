/**
 * Cart Screen v2.0
 * Production-ready with Summary, Delivery Progress, Sticky CTA
 * GROWTH LAYER: Smart upsell + AI cross-sell
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, CheckCircle, TrendingUp, DollarSign, ShoppingCart, Flame, Eye } from 'lucide-react';
import { toast } from 'sonner';
import useCartStore from '../store/cart';
import useUserStore from '../store/user';
import api from '../lib/api-client';
import { getRecommendations, getSmartUpsell } from '../lib/recommendation-engine';
import { getCartSavings, getViewersNow, formatPrice as fmtPrice } from '../lib/social-metrics';
import telegram from '../lib/telegram-sdk';
import TopBar from '../components/TopBar';
import Empty from '../components/Empty';
import CartItemCard from '../components/CartItemCard';
import ProductCard from '../components/ProductCard-v2';
import Page from '../components/Page';
import './Cart-v2.css';

const Cart = () => {
  const navigate = useNavigate();
  const { items, getTotal, getCount, addItem } = useCartStore();
  const { viewed, segment, updateSegment } = useUserStore();
  const [allProducts, setAllProducts] = useState([]);
  const [smartUpsell, setSmartUpsell] = useState(null);
  const [crossSell, setCrossSell] = useState([]);

  const total = getTotal();
  const count = getCount();

  // Load products for recommendations
  useEffect(() => {
    loadProducts();
  }, []);

  // Update segment + calculate recommendations when cart changes
  useEffect(() => {
    if (items.length > 0 && allProducts.length > 0) {
      // GROWTH v2: Update user segment
      updateSegment(items);

      // Smart upsell to reach free delivery
      const upsell = getSmartUpsell({
        products: allProducts,
        currentTotal: total,
        threshold: 2000
      });
      setSmartUpsell(upsell);

      // AI cross-sell with segment awareness
      const recommendations = getRecommendations({
        products: allProducts,
        cart: items,
        viewed,
        segment, // GROWTH v2: Segment-based recommendations
        limit: 4
      });
      setCrossSell(recommendations);
    }
  }, [items, total, allProducts, viewed, segment, updateSegment]);

  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      setAllProducts(data.items || data || []);
    } catch (error) {
      console.error('Failed to load products for recommendations:', error);
    }
  };

  const handleQuickAdd = async (product) => {
    telegram.haptic('medium');
    addItem(product, 1);
    toast.success(`${product.title} додано!`);
  };

  // Setup MainButton for checkout
  useEffect(() => {
    if (items.length > 0) {
      const cleanup = telegram.setupMainButton({
        text: `Оформити замовлення • ${formatPrice(total)} ₴`,
        onClick: handleCheckout,
        disabled: false,
      });

      return cleanup;
    }
  }, [items, total]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('uk-UA').format(price);
  };

  const handleCheckout = () => {
    telegram.haptic('heavy');
    telegram.notificationOccurred('success');
    navigate('/tma/checkout');
  };

  if (items.length === 0) {
    return (
      <Page>
        <div className="tma-page">
          <TopBar title="Кошик" />
          <div className="tma-page-content">
            <Empty
              icon={<ShoppingCart size={64} />}
              title="Кошик порожній"
              description="Додайте товари з каталогу, щоб продовжити покупки"
              actionText="Перейти до каталогу"
              onAction={() => navigate('/tma/catalog')}
            />
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <div className="tma-page">
      <TopBar title={`Кошик (${count})`} />
      <div className="tma-page-content">
        <div className="cart-v2">
          {/* Cart Items */}
          <div className="cart-v2__items">
            {items.map((item) => (
              <CartItemCard key={item.id} item={item} />
            ))}
          </div>

          {/* Summary Card */}
          <div className="cart-v2__summary-card">
            <div className="cart-v2__summary-row">
              <span className="cart-v2__summary-label">Товари</span>
              <span className="cart-v2__summary-value">{formatPrice(total)} ₴</span>
            </div>
            <div className="cart-v2__summary-row">
              <span className="cart-v2__summary-label">Доставка</span>
              <span className="cart-v2__summary-value">
                {total >= 2000 ? 'Безкоштовно' : '0 ₴'}
              </span>
            </div>
            <div className="cart-v2__summary-divider"></div>
            <div className="cart-v2__summary-row cart-v2__summary-row--total">
              <span className="cart-v2__summary-label">Разом</span>
              <span className="cart-v2__summary-value">{formatPrice(total)} ₴</span>
            </div>
          </div>

          {/* SAVINGS — "ви вже заощадили" */}
          {getCartSavings(items) > 0 && (
            <div className="cart-v2__savings" data-testid="cart-savings">
              <Flame size={18} />
              <span>Ви вже заощадили <strong>{fmtPrice(getCartSavings(items))} ₴</strong></span>
            </div>
          )}

          {/* LOSS AVERSION — один мягкий триггер на первый товар */}
          {items[0] && (
            <div className="cart-v2__pressure" data-testid="cart-pressure">
              <Eye size={16} />
              <span>
                <strong>{getViewersNow(items[0].product_id)}</strong> людей переглядають "{items[0].title}" зараз
              </span>
            </div>
          )}

          {/* Smart Upsell - Growth Layer */}
          {smartUpsell && (
            <div className="cart-v2__smart-upsell">
              <div className="cart-v2__upsell-title">
                💡 Додай це і доставка безкоштовна:
              </div>
              <ProductCard
                product={smartUpsell}
                compact
                onAddToCart={() => handleQuickAdd(smartUpsell)}
              />
            </div>
          )}

          {/* Cross-sell - AI Recommendations with Dynamic Hints */}
          {crossSell.length > 0 && (
            <div className="cart-v2__cross-sell">
              <h3 className="cart-v2__cross-sell-title">
                {segment === 'premium' && (
                  <>
                    <TrendingUp size={18} />
                    <span>Преміум вибір для вас</span>
                  </>
                )}
                {segment === 'budget' && (
                  <>
                    <DollarSign size={18} />
                    <span>Найкращі ціни</span>
                  </>
                )}
                {(segment === 'mid' || segment === 'unknown') && 'З цим купують'}
              </h3>
              <div className="cart-v2__cross-sell-scroll">
                {crossSell.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    compact
                    onAddToCart={() => handleQuickAdd(product)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Delivery Progress */}
          <DeliveryProgress total={total} />
        </div>
      </div>
    </div>
    </Page>
  );
};

// Delivery Progress Component
const DeliveryProgress = ({ total }) => {
  const threshold = 2000;
  const remaining = threshold - total;
  const progress = Math.min((total / threshold) * 100, 100);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('uk-UA').format(price);
  };

  if (remaining <= 0) {
    return (
      <div className="cart-v2__delivery cart-v2__delivery--success">
        <CheckCircle size={20} />
        <div className="cart-v2__delivery-text">
          <strong>Безкоштовна доставка</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-v2__delivery">
      <div className="cart-v2__delivery-text">
        <Lightbulb size={18} />
        <span>
          Залишилось <strong>{formatPrice(remaining)} ₴</strong> до безкоштовної доставки
        </span>
      </div>
      <div className="cart-v2__delivery-bar">
        <div 
          className="cart-v2__delivery-bar-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default Cart;
