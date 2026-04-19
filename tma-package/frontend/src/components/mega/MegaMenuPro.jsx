/**
 * MegaMenuPro - Desktop mega menu with hover intent
 * B15 MegaMenu PRO - Uses categories tree from API
 */
import React, { useState, useEffect, useRef } from "react";
import MegaMenuPanel from "./MegaMenuPanel";
import useHoverIntent from "../../hooks/useHoverIntent";
import { getCategoriesTree } from "../../api/categories";
import { 
  Smartphone, Laptop, Tablet, Tv, Headphones, Watch, Home, Camera, 
  Gamepad2, Package, Lightbulb, Coffee, Monitor, Speaker, Gift,
  ShoppingBag, Cpu, HardDrive, Battery, Zap
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Icon mapping - lucide-react icons OR emoji as-is
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
  'Coffee': Coffee,
  'Monitor': Monitor,
  'Speaker': Speaker,
  'Gift': Gift,
  'ShoppingBag': ShoppingBag,
  'Cpu': Cpu,
  'HardDrive': HardDrive,
  'Battery': Battery,
  'Zap': Zap,
};

// Get icon - either Lucide component or emoji span
const getIcon = (iconName, size = 20) => {
  if (!iconName) return <Package size={size} className="text-gray-400" />;
  
  // If icon name is in Lucide map, use Lucide
  const LucideIcon = iconMap[iconName];
  if (LucideIcon) {
    return <LucideIcon size={size} className="text-gray-600" />;
  }
  
  // Otherwise show as emoji/text
  return <span style={{ fontSize: size }}>{iconName}</span>;
};

export default function MegaMenuPro({ isOpen, onClose }) {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [featured, setFeatured] = useState([]);
  const { onEnter, onLeave, cancel } = useHoverIntent(100);
  const menuRef = useRef(null);

  // Fetch categories from tree API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const tree = await getCategoriesTree();
        // tree is already hierarchical with children
        setCategories(tree);
      } catch (e) {
        console.error('Failed to fetch categories', e);
      }
    };
    fetchCategories();
  }, []);

  // Fetch featured products for active category
  useEffect(() => {
    if (!activeCategory) {
      setFeatured([]);
      return;
    }
    
    const fetchFeatured = async () => {
      try {
        const categorySlug = activeCategory.slug;
        const res = await fetch(`${API_URL}/api/products?category=${categorySlug}&limit=4`);
        const data = await res.json();
        setFeatured(data.products || data || []);
      } catch (e) {
        console.error('Failed to fetch featured', e);
      }
    };
    fetchFeatured();
  }, [activeCategory]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose?.();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCategoryEnter = (cat) => {
    cancel(); // Cancel any pending close
    setActiveCategory(cat);
  };

  const handleCategoryLeave = () => {
    // Don't close immediately - let handleMenuLeave handle it
    // This allows moving from category to panel
  };

  const handleMenuEnter = () => {
    cancel();
  };

  const handleMenuLeave = () => {
    onLeave(() => {
      setActiveCategory(null);
      onClose?.();
    }, 200); // Delay before closing
  };

  return (
    <div 
      className="ys-mega-wrapper" 
      ref={menuRef}
      onMouseEnter={handleMenuEnter}
      onMouseLeave={handleMenuLeave}
      data-testid="mega-menu"
    >
      <div className="ys-mega-container">
        {/* Category list */}
        <nav className="ys-mega-nav">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`ys-mega-item ${activeCategory?.id === cat.id ? 'is-active' : ''}`}
              onMouseEnter={() => handleCategoryEnter(cat)}
              onMouseLeave={handleCategoryLeave}
            >
              <span className="ys-mega-item-icon">{getIcon(cat.icon)}</span>
              <span className="ys-mega-item-name">{cat.name}</span>
            </div>
          ))}
        </nav>

        {/* Panel */}
        {activeCategory && (
          <div onMouseEnter={handleMenuEnter}>
            <MegaMenuPanel 
              category={activeCategory} 
              featured={featured}
              onClose={onClose}
            />
          </div>
        )}
      </div>
    </div>
  );
}
