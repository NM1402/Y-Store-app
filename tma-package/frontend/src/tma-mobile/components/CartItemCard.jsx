/**
 * Cart Item Card v2.0
 * Soft qty control, clean layout
 */

import React from 'react';
import { Trash2 } from 'lucide-react';
import useCartStore from '../store/cart';
import telegram from '../lib/telegram-sdk';
import './CartItemCard.css';

const CartItemCard = ({ item }) => {
  const { updateQuantity, removeItem } = useCartStore();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('uk-UA').format(price);
  };

  const handleIncrease = () => {
    telegram.haptic('light');
    updateQuantity(item.id, item.quantity + 1);
  };

  const handleDecrease = () => {
    telegram.haptic('light');
    if (item.quantity > 1) {
      updateQuantity(item.id, item.quantity - 1);
    }
  };

  const handleRemove = () => {
    telegram.haptic('warning');
    telegram.notificationOccurred('warning');
    removeItem(item.id);
  };

  return (
    <div className="cart-item-card" data-testid="cart-item">
      <div className="cart-item-card__image">
        {item.images && item.images[0] ? (
          <img src={item.images[0]} alt={item.title} />
        ) : (
          <div className="cart-item-card__image-placeholder">📷</div>
        )}
      </div>

      <div className="cart-item-card__info">
        <div className="cart-item-card__title">{item.title}</div>
        <div className="cart-item-card__price">
          {formatPrice(item.price * item.quantity)} ₴
        </div>

        <div className="cart-item-card__controls">
          <div className="cart-item-card__qty">
            <button
              className="cart-item-card__qty-btn"
              onClick={handleDecrease}
              data-testid="qty-decrease"
            >
              −
            </button>
            <span className="cart-item-card__qty-value">{item.quantity}</span>
            <button
              className="cart-item-card__qty-btn"
              onClick={handleIncrease}
              data-testid="qty-increase"
            >
              +
            </button>
          </div>

          <button
            className="cart-item-card__remove"
            onClick={handleRemove}
            data-testid="remove-item"
            aria-label="Видалити"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartItemCard;
