import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Smartphone, Laptop, Tv, Headphones, Home, Camera, Watch, Gamepad2, ChevronRight, Tag, Flame, Percent } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Default categories with icons
const DEFAULT_CATEGORIES = [
  { name: { uk: "Смартфони", ru: "Смартфоны" }, slug: "smartphones", icon: Smartphone },
  { name: { uk: "Ноутбуки", ru: "Ноутбуки" }, slug: "laptops", icon: Laptop },
  { name: { uk: "Планшети", ru: "Планшеты" }, slug: "tablets", icon: Laptop },
  { name: { uk: "Телевізори", ru: "Телевизоры" }, slug: "tv", icon: Tv },
  { name: { uk: "Аудіо", ru: "Аудио" }, slug: "audio", icon: Headphones },
  { name: { uk: "Фото та відео", ru: "Фото и видео" }, slug: "photo", icon: Camera },
  { name: { uk: "Побутова техніка", ru: "Бытовая техника" }, slug: "home", icon: Home },
  { name: { uk: "Аксесуари", ru: "Аксессуары" }, slug: "accessories", icon: Watch },
  { name: { uk: "Ігри та консолі", ru: "Игры и консоли" }, slug: "gaming", icon: Gamepad2 },
];

// Popular tags for quick navigation
const POPULAR_TAGS = [
  { label: "iPhone 15", slug: "iphone-15" },
  { label: "MacBook", slug: "macbook" },
  { label: "Samsung Galaxy", slug: "samsung-galaxy" },
  { label: "PlayStation 5", slug: "ps5" },
  { label: "AirPods", slug: "airpods" },
  { label: "Xiaomi", slug: "xiaomi" },
];

/**
 * MegaMenu 2.0 - Retail-level dropdown
 * BLOCK V2-15: Full-width 3-column mega menu
 */
export default function MegaMenu({ lang = "uk", onClose }) {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const navigate = useNavigate();

  // Load categories from API
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const r = await axios.get(`${API_URL}/api/v2/categories/tree`);
        const tree = r.data?.tree || r.data || [];
        if (tree.length > 0) {
          const mapped = tree.slice(0, 9).map((cat, idx) => ({
            id: cat.id,
            name: cat.name || { uk: cat.title, ru: cat.title },
            slug: cat.slug || cat.id,
            icon: DEFAULT_CATEGORIES[idx]?.icon || Smartphone,
            children: cat.children || [],
          }));
          setCategories(mapped);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    loadCategories();
  }, []);

  const getName = (cat) => {
    if (typeof cat.name === "object") {
      return cat.name[lang] || cat.name.uk || cat.name.ru || "";
    }
    return cat.name || "";
  };

  const activeCategory = categories.find((c) => c.slug === hoveredCategory);

  return (
    <div 
      className="mega-menu-2" 
      onMouseLeave={onClose}
      data-testid="mega-menu-2"
    >
      <div className="mega-menu-inner container">
        {/* Column 1 - Categories */}
        <div className="mega-col mega-col-categories">
          <h4 className="mega-col-title">Категорії</h4>
          <div className="mega-categories-list">
            {categories.map((cat) => {
              const Icon = cat.icon || Smartphone;
              return (
                <div
                  key={cat.slug || cat.id}
                  className={`mega-cat-item ${hoveredCategory === cat.slug ? "active" : ""}`}
                  onMouseEnter={() => setHoveredCategory(cat.slug)}
                >
                  <Link
                    to={`/catalog?category=${cat.slug || cat.id}`}
                    onClick={onClose}
                    className="mega-cat-link"
                  >
                    <Icon size={18} />
                    <span>{getName(cat)}</span>
                    {cat.children?.length > 0 && <ChevronRight size={14} className="mega-cat-arrow" />}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2 - Subcategories */}
        <div className="mega-col mega-col-subcategories">
          <h4 className="mega-col-title">
            {activeCategory ? getName(activeCategory) : "Підкатегорії"}
          </h4>
          <div className="mega-subcategories-grid">
            {activeCategory?.children?.length > 0 ? (
              activeCategory.children.map((sub) => (
                <Link
                  key={sub.id || sub.slug}
                  to={`/catalog?category=${sub.slug || sub.id}`}
                  onClick={onClose}
                  className="mega-sub-link"
                >
                  {sub.name || sub.title}
                </Link>
              ))
            ) : (
              <div className="mega-sub-empty">
                Наведіть на категорію для перегляду підкатегорій
              </div>
            )}
          </div>

          {/* Popular tags */}
          <div className="mega-popular">
            <h5 className="mega-popular-title">
              <Flame size={14} />
              Популярне
            </h5>
            <div className="mega-tags">
              {POPULAR_TAGS.map((tag) => (
                <span
                  key={tag.slug}
                  className="mega-tag"
                  onClick={() => { navigate(`/catalog?search=${tag.slug}`); onClose(); }}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Column 3 - Promo */}
        <div className="mega-col mega-col-promo">
          <div className="mega-promo-card mega-promo-sale">
            <Percent size={32} />
            <div className="mega-promo-info">
              <h4>Розпродаж</h4>
              <p>Знижки до -50% на сотні товарів</p>
            </div>
            <Link to="/catalog?sort=discount" onClick={onClose} className="mega-promo-btn">
              Переглянути
            </Link>
          </div>
          
          <div className="mega-promo-card mega-promo-new">
            <Tag size={32} />
            <div className="mega-promo-info">
              <h4>Новинки</h4>
              <p>Останні надходження в каталозі</p>
            </div>
            <Link to="/catalog?sort=newest" onClick={onClose} className="mega-promo-btn">
              Дивитись
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
