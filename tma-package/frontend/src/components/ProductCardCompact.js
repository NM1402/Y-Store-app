import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../contexts/CartContext";

const formatUAH = (v) => {
  const n = Number(v || 0);
  return new Intl.NumberFormat("uk-UA").format(n) + " грн";
};

export default function ProductCardCompact({ product }) {
  const { addToCart } = useCart();
  const p = product || {};
  const title = p.title || p.name || "";
  const img = p.image || (Array.isArray(p.images) ? p.images[0] : null);

  const price = p.price ?? 0;
  const oldPrice = p.old_price ?? p.compare_price ?? null;
  const discount =
    oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;

  const inStock = p.in_stock !== false && (p.stock_level === undefined || p.stock_level > 0);

  return (
    <Link to={`/product/${p.slug || p.id}`} className="ys-pcard" aria-label={title} data-testid="product-card">
      <div className="ys-pcard-media">
        {discount ? <div className="ys-badge-discount">-{discount}%</div> : null}

        <div className="ys-imgbox">
          {img ? (
            <img
              src={img}
              alt={title}
              loading="lazy"
              decoding="async"
              className="ys-pcard-img"
            />
          ) : (
            <div className="ys-img-placeholder">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <path d="M21 15l-5-5L5 21"/>
              </svg>
            </div>
          )}
        </div>
      </div>

      <div className="ys-pcard-body">
        <div className="ys-pcard-title" title={title}>
          {title}
        </div>

        <div className="ys-pcard-meta">
          <span className={`ys-stock ${inStock ? "is-ok" : "is-no"}`}>
            {inStock ? "Є в наявності" : "Немає"}
          </span>

          {p.rating ? (
            <span className="ys-rating" title="Рейтинг">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 3, verticalAlign: 'middle'}}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              {Number(p.rating).toFixed(1)}
            </span>
          ) : (
            <span className="ys-rating ys-muted">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{marginRight: 3, verticalAlign: 'middle', opacity: 0.5}}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              0.0
            </span>
          )}
        </div>

        <div className="ys-pcard-footer">
          <div className="ys-price">
            <div className="ys-price-now">{formatUAH(price)}</div>
            {oldPrice ? <div className="ys-price-old">{formatUAH(oldPrice)}</div> : null}
          </div>

          <button 
            className="ys-btn ys-btn-primary" 
            type="button" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              addToCart(p.id, 1);
            }}
            data-testid="add-to-cart-btn"
          >
            Купити
          </button>
        </div>
      </div>
    </Link>
  );
}
