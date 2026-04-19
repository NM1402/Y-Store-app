/**
 * Mobile Categories Slider
 * Horizontal scrollable category pills for mobile
 * PROTECTED: Uses shared iconConfig - DO NOT DUPLICATE icon logic
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { iconComponents, isEmoji, getIconComponent } from '../admin/shared/iconConfig';

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * PROTECTED: Icon Display Component
 * Supports both EMOJI icons (📱, 💻) and Lucide icons (Smartphone, Laptop)
 * Matches HomeSidebar.jsx implementation
 */
const IconDisplay = ({ icon, size = 24 }) => {
  if (!icon) {
    return <Package size={size} className="text-gray-400" />;
  }
  
  // Check if it's an emoji
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

export default function MobileCategoriesSlider() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.slice(0, 10));
      }
    } catch (error) {
      console.warn("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="ys-categories-scroll">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="ys-cat-pill">
            <div className="ys-cat-pill-icon animate-pulse bg-gray-200" />
            <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!categories.length) return null;

  return (
    <div className="ys-categories-scroll" data-testid="mobile-categories">
      {categories.map((cat) => (
        <Link
          key={cat.id}
          to={`/catalog?category=${cat.slug || cat.id}`}
          className="ys-cat-pill"
          data-testid={`mobile-cat-${cat.slug}`}
        >
          <div className="ys-cat-pill-icon">
            <IconDisplay icon={cat.icon} size={24} />
          </div>
          <span className="ys-cat-pill-name">{cat.name}</span>
        </Link>
      ))}
    </div>
  );
}
