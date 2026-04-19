/**
 * P1.1: PopularCategories - now from API
 * Uses usePopularCategories hook instead of static data
 */
import { Link } from "react-router-dom";
import { usePopularCategories } from "../hooks/useCatalogFacets";

// Gradient colors for categories
const gradientColors = [
  "from-blue-500 to-blue-600",
  "from-purple-500 to-purple-600", 
  "from-green-500 to-green-600",
  "from-orange-500 to-orange-600",
  "from-pink-500 to-pink-600",
  "from-cyan-500 to-cyan-600",
  "from-red-500 to-red-600",
  "from-indigo-500 to-indigo-600",
];

// Icon mapping from category icon field
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
  "default": "🛒"
};

export default function PopularCategories() {
  const { categories, loading } = usePopularCategories(8);

  if (loading) {
    return (
      <div>
        <h2 className="ys-section-title">Популярні категорії</h2>
        <div className="ys-categories-scroll">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="ys-category-card bg-gray-200 animate-pulse" style={{minHeight: '100px', minWidth: '160px'}} />
          ))}
        </div>
      </div>
    );
  }

  // If API fails, use fallback
  if (!categories.length) {
    return null;
  }

  return (
    <div data-testid="popular-categories">
      <h2 className="ys-section-title">Популярні категорії</h2>
      <div className="ys-categories-scroll">
        {categories.map((cat, index) => (
          <Link
            key={cat.id}
            to={`/catalog?category=${cat.slug || cat.id}`}
            className={`ys-category-card bg-gradient-to-br ${gradientColors[index % gradientColors.length]}`}
          >
            <span className="ys-category-icon">
              {iconMap[cat.icon] || iconMap.default}
            </span>
            <span className="ys-category-name">{cat.name}</span>
            {cat.count > 0 && (
              <span className="text-xs opacity-75">{cat.count} товарів</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
