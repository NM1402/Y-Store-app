/**
 * MegaMenuMobile - Mobile accordion menu
 * B15 MegaMenu PRO - Uses categories tree from API
 */
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getCategoriesTree } from "../../api/categories";
import { 
  ChevronDown, ChevronRight, X, Smartphone, Laptop, Tablet, Tv, 
  Headphones, Watch, Home, Camera, Gamepad2, Package, Lightbulb
} from "lucide-react";

const iconMap = {
  'Smartphone': Smartphone,
  'Laptop': Laptop,
  'Tablet': Tablet,
  'Tv': Tv,
  'Headphones': Headphones,
  'Watch': Watch,
  'Home': Home,
  'Camera': Camera,
  'Gamepad2': Gamepad2,
  'Package': Package,
  'Lightbulb': Lightbulb,
  // Emoji fallbacks
  '📱': Smartphone,
  '💻': Laptop,
  '📲': Tablet,
  '📺': Tv,
  '🎧': Headphones,
  '⌚': Watch,
  '🏠': Home,
  '📷': Camera,
  '🎮': Gamepad2,
  '🏡': Lightbulb,
};

export default function MegaMenuMobile({ isOpen, onClose }) {
  const [categories, setCategories] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const tree = await getCategoriesTree();
        setCategories(tree);
      } catch (e) {
        console.error('Failed to fetch categories', e);
      }
    };
    fetchCategories();
  }, []);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getIcon = (iconName) => {
    const IconComponent = iconMap[iconName] || Package;
    return <IconComponent size={20} />;
  };

  return (
    <>
      <div className="ys-mega-mobile-backdrop" onClick={onClose} />
      <div className="ys-mega-mobile" data-testid="mega-menu-mobile">
        <div className="ys-mega-mobile-header">
          <span className="ys-mega-mobile-title">Каталог</span>
          <button className="ys-mega-mobile-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="ys-mega-mobile-body">
          {categories.map((cat) => (
            <div key={cat.id} className="ys-mega-mobile-section">
              <button 
                className={`ys-mega-mobile-item ${expandedId === cat.id ? 'is-expanded' : ''}`}
                onClick={() => toggleExpand(cat.id)}
              >
                <span className="ys-mega-mobile-item-icon">{getIcon(cat.icon)}</span>
                <span className="ys-mega-mobile-item-name">{cat.name}</span>
                <span className="ys-mega-mobile-item-arrow">
                  {expandedId === cat.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </span>
              </button>

              {expandedId === cat.id && cat.children?.length > 0 && (
                <div className="ys-mega-mobile-children">
                  <Link 
                    to={`/catalog?category=${cat.slug}`}
                    className="ys-mega-mobile-child ys-mega-mobile-child-all"
                    onClick={onClose}
                  >
                    Все у категорії {cat.name}
                  </Link>
                  {cat.children.map((sub) => (
                    <Link 
                      key={sub.id}
                      to={`/catalog?category=${sub.slug}`}
                      className="ys-mega-mobile-child"
                      onClick={onClose}
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
