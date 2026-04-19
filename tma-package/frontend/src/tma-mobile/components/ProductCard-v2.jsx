/**
 * Product Card v2.0
 * Modern mobile commerce card: depth, badges, floating action
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import useCartStore from '../store/cart';
import useUserStore from '../store/user';
import telegram from '../lib/telegram-sdk';
import './ProductCard-v2.css';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  const { toggleFavorite, isFavorite } = useUserStore();
  
  const isProductFavorite = isFavorite(product.id);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('uk-UA').format(price);
  };

  const calculateDiscount = () => {
    if (product.old_price && product.old_price > product.price) {
      return Math.round((1 - product.price / product.old_price) * 100);
    }
    return 0;
  };

  const handleClick = () => {
    telegram.haptic('light');
    navigate(`/tma/product/${product.id}`);
  };

  const handleAddToCart = (e) => {
    e.stopPropagation();
    telegram.haptic('medium');
    telegram.notificationOccurred('success');
    addItem(product, 1);
  };

  const handleFavorite = (e) => {
    e.stopPropagation();
    telegram.haptic('light');
    toggleFavorite(product.id);
  };

  const discount = calculateDiscount();
  const hasRating = product.rating && product.rating > 0;

  return (
    <div
      className="product-card-v2"
      onClick={handleClick}
      data-testid="product-card"
    >
      {/* Image Area */}
      <div className="product-card-v2__image-wrapper">
        <div className="product-card-v2__image">
          {product.images && product.images[0] ? (
            <img src={product.images[0]} alt={product.title} loading="lazy" />
          ) : (
            <div className="product-card-v2__image-placeholder">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
        </div>

        {/* Top Badges */}
        <div className="product-card-v2__badges">
          {discount > 0 && (
            <div className="product-card-v2__badge product-card-v2__badge--discount">
              -{discount}%
            </div>
          )}
          {product.is_featured && (
            <div className="product-card-v2__badge product-card-v2__badge--featured">
              ТОП
            </div>
          )}
          {product.is_new && (
            <div className="product-card-v2__badge product-card-v2__badge--new">
              Новинка
            </div>
          )}
        </div>

        {/* Floating Add Button */}
        {product.in_stock && (
          <button
            className="product-card-v2__add-btn"
            onClick={handleAddToCart}
            data-testid="product-card-add-to-cart"
            aria-label="Додати в кошик"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 4V16M4 10H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Info Area */}
      <div className="product-card-v2__info">
        {/* Rating & Stock */}
        {hasRating && (
          <div className="product-card-v2__meta">
            <div className="product-card-v2__rating">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="#FFB800">
                <path d="M6 0L7.5 4.5H12L8.5 7.5L10 12L6 9L2 12L3.5 7.5L0 4.5H4.5L6 0Z"/>
              </svg>
              <span className="product-card-v2__rating-value">{product.rating.toFixed(1)}</span>
            </div>
          </div>
        )}
        {!product.in_stock && (
          <div className="product-card-v2__stock product-card-v2__stock--out">
            Немає в наявності
          </div>
        )}

        {/* Title */}
        <h3 className="product-card-v2__title" data-testid="product-card-title">
          {product.title}
        </h3>

        {/* Price */}
        <div className="product-card-v2__price-block">
          <div className="product-card-v2__price" data-testid="product-card-price">
            {formatPrice(product.price)} ₴
          </div>
          {product.old_price ? (
            <div className="product-card-v2__old-price">
              {formatPrice(product.old_price)} ₴
            </div>
          ) : (
            /* Невидимий placeholder — резервує місце, щоб усі картки мали ОДНАКОВУ висоту */
            <div className="product-card-v2__old-price product-card-v2__old-price--placeholder" aria-hidden="true">
              &nbsp;
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
