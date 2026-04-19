/**
 * BLOCK V2-20: Product Section
 * Mobile: Horizontal slider | Desktop: Grid
 * Uses CSS-based responsive instead of JS for instant hydration
 */
import React, { useEffect, useState, useRef } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCardCompact from "../ProductCardCompact";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ProductSection({ title, sort, category, link, icon: Icon }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (sort) params.set("sort", sort);
    if (category) params.set("category", category);
    params.set("limit", "12");

    fetch(`${API_URL}/api/v2/catalog?${params}`)
      .then(r => r.json())
      .then(d => {
        setItems(d.products || d.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sort, category]);

  if (loading) {
    return (
      <div className="my-6">
        <div className="h-6 w-40 bg-gray-200 rounded-lg animate-pulse mb-4" />
        <div className="ys-product-section-skeleton">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-gray-100 rounded-xl animate-pulse" style={{aspectRatio: '1', minHeight: 200}} />
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div data-testid={`product-section-${sort || category}`} className="my-6 md:my-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 md:mb-5">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />}
          {title}
        </h2>
        {link && (
          <Link 
            to={link}
            className="text-sm text-blue-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all py-2 md:py-0"
          >
            <span className="hidden sm:inline">Усі товари</span>
            <span className="sm:hidden">Усі</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        )}
      </div>

      {/* Mobile: Horizontal Scroll (CSS hidden on desktop) */}
      <div 
        ref={scrollRef}
        className="ys-products-scroll-mobile"
        data-testid="product-scroll-mobile"
      >
        {items.slice(0, 10).map(product => (
          <ProductCardCompact key={`scroll-${product.id || product._id}`} product={product} />
        ))}
      </div>

      {/* Desktop: Grid (CSS hidden on mobile) */}
      <div className="ys-products-grid-desktop">
        {items.slice(0, 8).map(product => (
          <ProductCardCompact key={`grid-${product.id || product._id}`} product={product} />
        ))}
      </div>
    </div>
  );
}
