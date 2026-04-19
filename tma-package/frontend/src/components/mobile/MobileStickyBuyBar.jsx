/**
 * MobileStickyBuyBar - Sticky add to cart for product page
 * B16 Mobile Retail Polish
 */
import React from "react";
import { ShoppingCart, Check } from "lucide-react";

export default function MobileStickyBuyBar({ 
  price, 
  comparePrice,
  inStock = true, 
  onBuy, 
  loading = false,
  isInCart = false
}) {
  const hasDiscount = comparePrice && comparePrice > price;
  const discount = hasDiscount ? Math.round((1 - price / comparePrice) * 100) : 0;

  return (
    <div className="ys-sticky-buy" data-testid="mobile-sticky-buy-bar">
      <div className="ys-sticky-buy-info">
        <div className="ys-sticky-buy-prices">
          <span className="ys-sticky-buy-price">{price?.toLocaleString()} грн</span>
          {hasDiscount && (
            <span className="ys-sticky-buy-old">{comparePrice?.toLocaleString()} грн</span>
          )}
        </div>
        <div className="ys-sticky-buy-meta">
          {inStock ? (
            <span className="ys-sticky-buy-stock in-stock">Є в наявності</span>
          ) : (
            <span className="ys-sticky-buy-stock out-of-stock">Немає в наявності</span>
          )}
          {hasDiscount && (
            <span className="ys-sticky-buy-discount">-{discount}%</span>
          )}
        </div>
      </div>

      <button
        className={`ys-btn ys-sticky-buy-btn ${isInCart ? 'is-in-cart' : ''}`}
        disabled={!inStock || loading}
        onClick={onBuy}
        data-testid="mobile-buy-btn"
      >
        {loading ? (
          <span className="ys-spinner-sm" />
        ) : isInCart ? (
          <>
            <Check size={18} />
            В кошику
          </>
        ) : (
          <>
            <ShoppingCart size={18} />
            Купити
          </>
        )}
      </button>
    </div>
  );
}
