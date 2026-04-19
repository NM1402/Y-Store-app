import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import CartDrawer from './CartDrawer';

/**
 * Mini Cart Icon with badge and animation
 * BLOCK V2-13: Animated mini cart for header
 */
export default function MiniCart() {
  const { cart, cartItemsCount } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [lastCount, setLastCount] = useState(0);

  // Animate badge when items are added
  useEffect(() => {
    if (cartItemsCount > lastCount && lastCount !== 0) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
    }
    setLastCount(cartItemsCount);
  }, [cartItemsCount, lastCount]);

  const totalQty = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <>
      <button
        className={`mini-cart-btn ${isAnimating ? 'pulse' : ''}`}
        onClick={() => setIsOpen(true)}
        data-testid="mini-cart-btn"
        aria-label="Відкрити кошик"
      >
        <div className="mini-cart-icon-wrap">
          <ShoppingCart size={22} />
          {totalQty > 0 && (
            <span className={`mini-cart-badge ${isAnimating ? 'bounce' : ''}`}>
              {totalQty > 99 ? '99+' : totalQty}
            </span>
          )}
        </div>
        
        {/* Add to cart animation overlay */}
        {isAnimating && (
          <div className="mini-cart-added">
            <Check size={14} />
          </div>
        )}
      </button>
      
      <CartDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
