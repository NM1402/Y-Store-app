/**
 * Product v3.3 — чистий vertical flow + conversion triggers
 *  • social proof (покупки за тиждень)
 *  • scarcity (залишилось N шт)
 *  • price anchoring + оплата частинами
 *  • bundle "Часто купують разом"
 *  • instant buy + add-to-cart
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Star, Shield, RotateCcw, Store, CheckCircle, Package, Flame, AlertTriangle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api-client';
import useCartStore from '../store/cart';
import useUserStore from '../store/user';
import telegram from '../lib/telegram-sdk';
import Page from '../components/Page';
import {
  formatPrice,
  getWeeklyPurchases,
  getStockLevel,
  getMonthlyPrice,
} from '../lib/social-metrics';
import './Product-v3.css';

export default function ProductV3() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  const { addViewed } = useUserStore();

  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    loadBundle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (product?.id) addViewed(product.id);
  }, [product, addViewed]);

  const load = async () => {
    try {
      const data = await api.getProduct(id);
      setProduct(data);
    } catch (e) {
      console.error('Failed to load product:', e);
      telegram.showAlert('Помилка завантаження');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const loadBundle = async () => {
    try {
      const data = await api.getProducts();
      setAllProducts(data.items || data || []);
    } catch {
      /* noop */
    }
  };

  const bundleItems = useMemo(() => {
    if (!product || allProducts.length === 0) return [];
    return allProducts
      .filter(p => p.id !== product.id && p.price < product.price * 0.6 && p.price > 0)
      .slice(0, 3);
  }, [product, allProducts]);

  const bundleTotal = useMemo(() => {
    if (!product || bundleItems.length === 0) return 0;
    const sum = (product.price || 0) + bundleItems.reduce((s, p) => s + (p.price || 0), 0);
    return Math.round(sum * 0.93); // -7% комплектная скидка
  }, [product, bundleItems]);

  const handleAddToCart = () => {
    if (!product) return;
    telegram.haptic('medium');
    addItem(product, 1);
    toast.success('Додано в кошик');
  };

  const handleBuyNow = () => {
    if (!product) return;
    telegram.haptic('heavy');
    addItem(product, 1);
    navigate('/tma/checkout');
  };

  const handleAddBundle = () => {
    if (!product) return;
    telegram.haptic('heavy');
    addItem(product, 1);
    bundleItems.forEach(p => addItem(p, 1));
    toast.success('Комплект у кошику');
    navigate('/tma/cart');
  };

  if (loading) {
    return (
      <Page>
        <div className="product-v3 product-v3--loading">
          <div className="product-v3__skeleton product-v3__skeleton--image" />
          <div className="product-v3__skeleton product-v3__skeleton--title" />
          <div className="product-v3__skeleton product-v3__skeleton--price" />
        </div>
      </Page>
    );
  }

  if (!product) {
    return (
      <Page>
        <div className="product-v3-empty">
          <h3>Товар не знайдено</h3>
          <button onClick={() => navigate(-1)}>Назад</button>
        </div>
      </Page>
    );
  }

  const discount = product.old_price && product.old_price > product.price
    ? Math.round((1 - product.price / product.old_price) * 100)
    : 0;

  const inStock = product.in_stock || product.stock > 0 || product.in_stock === undefined;
  const weeklySales = getWeeklyPurchases(product.id);
  const stock = getStockLevel(product);
  const isLowStock = stock <= 5;
  const monthly = getMonthlyPrice(product.price, 24);
  const savings = product.old_price && product.old_price > product.price
    ? product.old_price - product.price
    : 0;

  return (
    <Page>
      <div className="product-v3" data-testid="product-screen">
        {/* BACK BUTTON */}
        <button className="product-v3__back" onClick={() => navigate(-1)} data-testid="product-back-btn">
          <ChevronLeft size={24} />
        </button>

        {/* GALLERY */}
        <div className="product-v3__gallery">
          {product.images && product.images[0] ? (
            <img src={product.images[0]} alt={product.title} loading="lazy" />
          ) : (
            <div className="product-v3__gallery-placeholder">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
          {discount > 0 && (
            <div className="product-v3__image-badge product-v3__image-badge--discount">
              -{discount}%
            </div>
          )}
        </div>

        {/* CLEAN VERTICAL FLOW — NO ABSOLUTE, NO NEGATIVE MARGINS */}
        <div className="product-v3__content">

          {/* SECTION: HEADER (title / rating / brand) */}
          <section className="product-v3__section">
            <h1 className="product-v3__title" data-testid="product-title">{product.title}</h1>
            <div className="product-v3__meta">
              {product.rating ? (
                <div className="product-v3__rating">
                  <Star size={14} fill="#FFB800" stroke="#FFB800" />
                  <span className="product-v3__rating-value">{product.rating.toFixed(1)}</span>
                  {product.reviews_count > 0 && (
                    <span className="product-v3__rating-count">({product.reviews_count})</span>
                  )}
                </div>
              ) : null}
              {product.brand && (
                <div className="product-v3__brand">Бренд: <strong>{product.brand}</strong></div>
              )}
            </div>

            {/* SOCIAL PROOF (decision pressure) */}
            <div className="product-v3__social-row">
              <div className="product-v3__chip product-v3__chip--hot" data-testid="social-proof">
                <Flame size={14} />
                <span>Купили {weeklySales} разів цього тижня</span>
              </div>
              {isLowStock && (
                <div className="product-v3__chip product-v3__chip--warn" data-testid="scarcity">
                  <AlertTriangle size={14} />
                  <span>Залишилось {stock} шт</span>
                </div>
              )}
            </div>
          </section>

          {/* SECTION: PRICE (anchoring + monthly) */}
          <section className="product-v3__section product-v3__section--price">
            <div className="product-v3__price-row">
              <span className="product-v3__price-current" data-testid="product-price">{formatPrice(product.price)} ₴</span>
              {product.old_price && product.old_price > product.price && (
                <span className="product-v3__price-old">{formatPrice(product.old_price)} ₴</span>
              )}
              {discount > 0 && (
                <span className="product-v3__price-discount">-{discount}%</span>
              )}
            </div>

            {/* Installments removed — not offered */}

            {savings > 0 && (
              <div className="product-v3__savings" data-testid="savings">
                Ви заощаджуєте <strong>{formatPrice(savings)} ₴</strong>
              </div>
            )}

            <div className={`product-v3__stock ${inStock ? 'product-v3__stock--available' : 'product-v3__stock--unavailable'}`}>
              {inStock ? <><CheckCircle size={16} /><span>В наявності</span></> : <span>Немає в наявності</span>}
            </div>
          </section>

          {/* SECTION: BUNDLE (cross-sell on product) */}
          {bundleItems.length >= 2 && (
            <section className="product-v3__section" data-testid="product-bundle">
              <h3 className="product-v3__section-title">Часто купують разом</h3>
              <div className="product-v3__bundle">
                <div className="product-v3__bundle-main">
                  {product.images?.[0] && (
                    <img src={product.images[0]} alt={product.title} />
                  )}
                </div>
                {bundleItems.map(p => (
                  <React.Fragment key={p.id}>
                    <div className="product-v3__bundle-plus">+</div>
                    <div className="product-v3__bundle-item">
                      {p.images?.[0] && <img src={p.images[0]} alt={p.title} />}
                      <div className="product-v3__bundle-name">{p.title}</div>
                      <div className="product-v3__bundle-price">{formatPrice(p.price)} ₴</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
              <div className="product-v3__bundle-total">
                <div>
                  <div className="product-v3__bundle-total-label">Разом вигідніше</div>
                  <div className="product-v3__bundle-total-value">{formatPrice(bundleTotal)} ₴</div>
                </div>
                <button
                  className="product-v3__bundle-btn"
                  onClick={handleAddBundle}
                  data-testid="add-bundle-btn"
                >
                  Додати комплект
                </button>
              </div>
            </section>
          )}

          {/* SECTION: УМОВИ ПОКУПКИ (об'єднана — доставка + гарантії + оплата) */}
          <section className="product-v3__section">
            <h3 className="product-v3__section-title">
              <Shield size={18} /><span>Умови покупки</span>
            </h3>
            <div className="product-v3__row">
              <div className="product-v3__row-icon"><Package size={20} /></div>
              <div className="product-v3__row-body">
                <div className="product-v3__row-title">Швидка доставка</div>
                <div className="product-v3__row-desc">Новою Поштою 1–2 дні по Україні</div>
              </div>
            </div>
            <div className="product-v3__row">
              <div className="product-v3__row-icon"><Store size={20} /></div>
              <div className="product-v3__row-body">
                <div className="product-v3__row-title">Самовивіз</div>
                <div className="product-v3__row-desc">м. Київ • Безкоштовно</div>
              </div>
            </div>
            <div className="product-v3__row">
              <div className="product-v3__row-icon"><RotateCcw size={20} /></div>
              <div className="product-v3__row-body">
                <div className="product-v3__row-title">Повернення 14 днів</div>
                <div className="product-v3__row-desc">Без зайвих питань</div>
              </div>
            </div>
            <div className="product-v3__row">
              <div className="product-v3__row-icon"><CreditCard size={20} /></div>
              <div className="product-v3__row-body">
                <div className="product-v3__row-title">Зручна оплата</div>
                <div className="product-v3__row-desc">Карткою онлайн або при отриманні</div>
              </div>
            </div>
            {product.price >= 2000 && (
              <div className="product-v3__note product-v3__note--success">
                🎉 Безкоштовна доставка від 2000 ₴
              </div>
            )}
          </section>

          {/* SECTION: DESCRIPTION */}
          {product.description && (
            <section className="product-v3__section">
              <h3 className="product-v3__section-title">Опис товару</h3>
              <div className="product-v3__description">{product.description}</div>
            </section>
          )}

          {/* SECTION: SPECIFICATIONS */}
          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <section className="product-v3__section">
              <h3 className="product-v3__section-title">Характеристики</h3>
              <div className="product-v3__specs">
                {Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="product-v3__spec-row">
                    <span className="product-v3__spec-label">{key}</span>
                    <span className="product-v3__spec-value">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* STICKY ACTIONS */}
        <div className="product-v3__actions">
          <button
            className="product-v3__btn product-v3__btn--add"
            onClick={handleAddToCart}
            disabled={!inStock}
            data-testid="add-to-cart-btn"
          >
            В кошик
          </button>
          <button
            className="product-v3__btn product-v3__btn--buy"
            onClick={handleBuyNow}
            disabled={!inStock}
            data-testid="buy-now-btn"
          >
            {inStock ? `Купити · ${formatPrice(product.price)} ₴` : 'Немає'}
          </button>
        </div>
      </div>
    </Page>
  );
}
