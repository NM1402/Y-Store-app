/**
 * HomeSidebar - Categories sidebar for home page hero section
 * Foxtrot/Rozetka style with icons and hover effects
 */
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Package } from "lucide-react";
import { iconComponents, isEmoji, getIconComponent } from '../admin/shared/iconConfig';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * PROTECTED: Icon Display Component
 * Supports both EMOJI icons (📱, 💻) and Lucide icons (Smartphone, Laptop)
 * DO NOT MODIFY without updating MobileCategoriesSlider.jsx
 */
const IconDisplay = ({ icon, size = 20 }) => {
  if (!icon) {
    return <Package size={size} className="text-gray-400" />;
  }
  
  // Check if it's an emoji (non-ASCII characters)
  if (isEmoji(icon)) {
    return <span style={{ fontSize: size * 1.2 }}>{icon}</span>;
  }
  
  // Otherwise use Lucide icon component
  const IconComponent = getIconComponent(icon);
  if (IconComponent) {
    return <IconComponent size={size} className="text-gray-600" />;
  }
  
  // Fallback
  return <Package size={size} className="text-gray-400" />;
};

export default function HomeSidebar() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v2/catalog/tree`);
      if (res.ok) {
        const data = await res.json();
        // Handle multiple formats: {tree: [...]}, {items: [...]} or direct array
        const allCategories = data.tree || data.items || data;
        // Filter only root categories (parent_id === null) and take max 10
        const rootCategories = Array.isArray(allCategories) 
          ? allCategories.filter(c => c.parent_id === null).slice(0, 10)
          : [];
        setCategories(rootCategories);
      }
    } catch (error) {
      console.warn("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ys-home-sidebar" data-testid="home-sidebar">
        <div className="ys-home-sidebar-inner">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="ys-home-sidebar-item is-skeleton">
              <div className="ys-skel" style={{ width: 24, height: 24, borderRadius: 6 }} />
              <div className="ys-skel" style={{ height: 14, width: `${60 + i * 5}%`, borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // PROTECTED: Show placeholder if no categories (maintains layout)
  if (!categories.length) {
    return (
      <div 
        className="ys-home-sidebar" 
        data-testid="home-sidebar-empty"
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '16px',
          minHeight: '400px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#9ca3af',
          fontSize: '14px'
        }}
      >
        Каталог
      </div>
    );
  }

  return (
    <div 
      className="ys-home-sidebar" 
      data-testid="home-sidebar"
      style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '16px',
        overflow: 'hidden'
      }}
    >
      <div className="ys-home-sidebar-inner" style={{ display: 'flex', flexDirection: 'column' }}>
        {categories.map((cat) => {
          const hasChildren = cat.children && cat.children.length > 0;

          return (
            <Link
              key={cat.id}
              to={`/catalog?category=${cat.slug}`}
              className={`ys-home-sidebar-item ${hoveredId === cat.id ? "is-active" : ""}`}
              onMouseEnter={() => setHoveredId(cat.id)}
              onMouseLeave={() => setHoveredId(null)}
              data-testid={`sidebar-category-${cat.slug}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                color: hoveredId === cat.id ? '#2563eb' : '#374151',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
                borderBottom: '1px solid #f3f4f6',
                background: hoveredId === cat.id ? '#f8fafc' : 'transparent',
                transition: 'all 0.15s ease'
              }}
            >
              <span 
                className="ys-home-sidebar-icon"
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  background: hoveredId === cat.id ? '#eff6ff' : '#f3f4f6',
                  color: hoveredId === cat.id ? '#2563eb' : '#6b7280',
                  flexShrink: 0
                }}
              >
                <IconDisplay icon={cat.icon} size={20} />
              </span>
              <span 
                className="ys-home-sidebar-name"
                style={{
                  flex: 1,
                  minWidth: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {cat.name}
              </span>
              {hasChildren && (
                <ChevronRight 
                  size={16} 
                  className="ys-home-sidebar-arrow" 
                  style={{
                    color: '#9ca3af',
                    flexShrink: 0,
                    opacity: hoveredId === cat.id ? 1 : 0,
                    transform: hoveredId === cat.id ? 'translateX(0)' : 'translateX(-4px)',
                    transition: 'all 0.15s ease'
                  }}
                />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
