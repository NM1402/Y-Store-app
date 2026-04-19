/**
 * P1.1: SidebarCatalog - now from API
 * Uses useCatalogFacets hook instead of static data
 */
import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useCatalogFacets } from "../hooks/useCatalogFacets";

// Icon mapping
const iconMap = {
  "Smartphone": "📱",
  "Laptop": "💻",
  "Tv": "📺",
  "Headphones": "🎧",
  "Watch": "⌚",
  "Camera": "📷",
  "Gamepad": "🎮",
  "Home": "🏠",
  "Shirt": "👕",
  "Package": "📦",
  "Monitor": "🖥️",
  "Tablet": "📲",
  "Speaker": "🔊",
  "Printer": "🖨️",
  "default": "📦"
};

export default function SidebarCatalog() {
  const { facets, loading } = useCatalogFacets();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const currentCategory = searchParams.get('category');

  if (loading) {
    return (
      <div className="sidebar-catalog">
        {[1,2,3,4,5,6,7,8].map(i => (
          <div key={i} className="sidebar-item opacity-50">
            <span className="sidebar-icon">📦</span>
            <span className="sidebar-name bg-gray-200 animate-pulse rounded" style={{width: '100px', height: '16px'}}></span>
          </div>
        ))}
      </div>
    );
  }

  const categories = facets?.categories || [];
  
  // Show only top 12 categories with products
  const visibleCategories = categories
    .filter(cat => !cat.parent_id && cat.count > 0)
    .slice(0, 12);

  if (!visibleCategories.length) {
    return null;
  }

  return (
    <div data-testid="sidebar-catalog" className="sidebar-catalog">
      {visibleCategories.map(cat => {
        const isActive = currentCategory === cat.slug || currentCategory === cat.id;
        return (
          <Link
            key={cat.id}
            to={`/catalog?category=${cat.slug || cat.id}`}
            className={`sidebar-item ${isActive ? 'active' : ''}`}
          >
            <span className="sidebar-icon">
              {iconMap[cat.icon] || iconMap.default}
            </span>
            <span className="sidebar-name">{cat.name}</span>
            {cat.count > 0 && (
              <span className="text-xs text-gray-400 ml-auto mr-2">{cat.count}</span>
            )}
            <ChevronRight size={16} className="sidebar-arrow" />
          </Link>
        );
      })}
    </div>
  );
}
