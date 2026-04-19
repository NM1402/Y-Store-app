/**
 * BLOCK V2-21: New Arrivals Section
 * Shows recently added products in compact grid
 */
import React, { useEffect, useState } from "react";
import { Sparkles, ArrowRight, ShoppingCart, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const formatUAH = (v) => {
  const n = Number(v || 0);
  return new Intl.NumberFormat("uk-UA").format(n) + " ₴";
};

// Compact card for new arrivals
function NewArrivalCard({ product }) {
  const p = product || {};
  const title = p.title || p.name || "";
  const img = p.image || (Array.isArray(p.images) ? p.images[0] : null);
  const price = p.price ?? 0;
  const oldPrice = p.old_price ?? p.compare_price ?? null;
  const discount = oldPrice && oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : null;

  return (
    <Link 
      to={`/product/${p.slug || p.id}`} 
      className="ys-arrival-card"
      data-testid="new-arrival-card"
    >
      {/* Badge */}
      <div className="ys-arrival-badge">Новинка</div>
      
      {/* Discount badge */}
      {discount && <div className="ys-arrival-discount">-{discount}%</div>}
      
      {/* Image */}
      <div className="ys-arrival-img">
        {img ? (
          <img src={img} alt={title} loading="lazy" />
        ) : (
          <div className="ys-arrival-placeholder">
            <ShoppingCart size={24} strokeWidth={1.5} />
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="ys-arrival-info">
        <h3 className="ys-arrival-title">{title}</h3>
        <div className="ys-arrival-prices">
          <span className="ys-arrival-price">{formatUAH(price)}</span>
          {oldPrice && <span className="ys-arrival-old">{formatUAH(oldPrice)}</span>}
        </div>
      </div>
      
      {/* Quick action */}
      <button 
        className="ys-arrival-cart"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        title="Додати в кошик"
      >
        <ShoppingCart size={16} />
      </button>
    </Link>
  );
}

export default function NewArrivals() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/api/v2/catalog?sort=-created_at&limit=8`)
      .then(r => r.json())
      .then(d => {
        setItems(d.products || d.items || []);
        setLoading(false);
      })
      .catch(() => {
        fetch(`${API_URL}/api/products?limit=8`)
          .then(r => r.json())
          .then(d => {
            setItems(Array.isArray(d) ? d : (d.products || []));
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  }, []);

  if (loading) {
    return (
      <div data-testid="new-arrivals-section" className="ys-arrivals">
        <div className="ys-arrivals-header">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="ys-arrivals-grid">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="ys-arrival-card is-skeleton">
              <div className="ys-arrival-img" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div data-testid="new-arrivals-section" className="ys-arrivals">
      <div className="ys-arrivals-header">
        <h2 className="ys-arrivals-title">
          <Sparkles className="w-5 h-5" />
          Новинки
        </h2>
        <Link to="/catalog?sort=-created_at" className="ys-arrivals-link">
          Усі новинки <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="ys-arrivals-grid">
        {items.slice(0, 8).map(product => (
          <NewArrivalCard key={product.id || product._id} product={product} />
        ))}
      </div>
    </div>
  );
}
