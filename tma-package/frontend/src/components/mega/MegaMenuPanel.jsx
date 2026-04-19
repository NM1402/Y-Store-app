/**
 * MegaMenuPanel - 3-column layout panel
 * B15 MegaMenu PRO
 */
import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export default function MegaMenuPanel({ category, featured = [], onClose }) {
  if (!category) return null;

  const subcategories = category.children || category.sub || [];

  return (
    <div className="ys-mega-panel" data-testid="mega-menu-panel">
      <div className="ys-mega-grid">
        {/* COLUMN 1 — Subcategories */}
        <div className="ys-mega-col">
          <div className="ys-mega-col-title">{category.name}</div>
          <ul className="ys-mega-list">
            {subcategories.slice(0, 12).map((sub) => (
              <li key={sub.slug || sub.id}>
                <Link 
                  to={`/catalog?category=${sub.slug}`} 
                  className="ys-mega-link"
                  onClick={onClose}
                >
                  {sub.name}
                  <ChevronRight size={14} />
                </Link>
              </li>
            ))}
          </ul>
          {subcategories.length > 0 && (
            <Link 
              to={`/catalog?category=${category.slug}`}
              className="ys-mega-view-all"
              onClick={onClose}
            >
              Дивитись все
              <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {/* COLUMN 2 — Featured products */}
        <div className="ys-mega-col">
          <div className="ys-mega-col-title">Популярне</div>
          <div className="ys-mega-featured">
            {featured.slice(0, 4).map((p) => (
              <Link 
                key={p.slug || p.id} 
                to={`/product/${p.slug || p.id}`} 
                className="ys-mega-product"
                onClick={onClose}
              >
                <div className="ys-mega-product-img">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.title} loading="lazy" />
                  ) : (
                    <div className="ys-mega-product-placeholder" />
                  )}
                </div>
                <div className="ys-mega-product-info">
                  <div className="ys-mega-product-title">{p.title}</div>
                  <div className="ys-mega-product-price">{p.price?.toLocaleString()} грн</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* COLUMN 3 — Banner */}
        <div className="ys-mega-col">
          <div className="ys-mega-banner">
            <div className="ys-mega-banner-inner">
              <span className="ys-mega-banner-badge">Акція</span>
              <div className="ys-mega-banner-title">Знижки до -40%</div>
              <div className="ys-mega-banner-subtitle">на техніку {category.name}</div>
              <Link 
                to={`/catalog?category=${category.slug}&discount=true`}
                className="ys-btn ys-btn-sm ys-btn-light"
                onClick={onClose}
              >
                Дивитись
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
