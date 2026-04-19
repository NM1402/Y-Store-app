import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ChevronRight, Search,
  Smartphone, Laptop, Monitor, Tv, Watch, Camera, Headphones, Gamepad,
  Home, Zap, ShoppingBag, Coffee, Microwave, Fan, Wind, Snowflake,
  Shirt, Heart, Book, Music, Car, Bike, Dumbbell, Baby,
  Pill, Leaf, Palette, Wrench, Hammer, Lightbulb, Wifi, Speaker
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCatalog } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Multi-Level Catalog Component (Foxtrot-style)
 * 
 * Features:
 * - Hierarchical category tree
 * - Hover fly-out submenu
 * - Icon support for categories
 * - Search functionality
 * - Responsive design
 */
const MultiLevelCatalog = () => {
  const { isCatalogOpen, closeCatalog } = useCatalog();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [loading, setLoading] = useState(false);
  const submenuRef = useRef(null);

  // Icon mapping
  const iconComponents = {
    'Smartphone': Smartphone, 'Laptop': Laptop, 'Monitor': Monitor, 'Tv': Tv,
    'Watch': Watch, 'Camera': Camera, 'Headphones': Headphones, 'Gamepad': Gamepad,
    'Home': Home, 'Zap': Zap, 'ShoppingBag': ShoppingBag, 'Coffee': Coffee,
    'Microwave': Microwave, 'Fan': Fan, 'Wind': Wind, 'Snowflake': Snowflake,
    'Shirt': Shirt, 'Heart': Heart, 'Book': Book, 'Music': Music,
    'Car': Car, 'Bike': Bike, 'Dumbbell': Dumbbell, 'Baby': Baby,
    'Pill': Pill, 'Leaf': Leaf, 'Palette': Palette, 'Wrench': Wrench,
    'Hammer': Hammer, 'Lightbulb': Lightbulb, 'Wifi': Wifi, 'Speaker': Speaker
  };

  useEffect(() => {
    if (isCatalogOpen) {
      fetchCategories();
    }
  }, [isCatalogOpen]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/categories?tree=true`);
      console.log('Loaded tree categories:', response.data);
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId) => {
    closeCatalog();
    navigate(`/products?category_id=${categoryId}`);
  };

  const handleMouseEnter = (category) => {
    if (category.children && category.children.length > 0) {
      setHoveredCategory(category);
    }
  };

  const handleMouseLeave = () => {
    // Small delay before closing to prevent flickering
    setTimeout(() => {
      if (!submenuRef.current?.matches(':hover')) {
        setHoveredCategory(null);
      }
    }, 100);
  };

  // Filter categories for search
  const filterCategories = (cats, query) => {
    if (!query) return cats;
    
    return cats.filter(cat => {
      const matchesName = cat.name?.toLowerCase().includes(query.toLowerCase());
      const hasMatchingChildren = cat.children?.some(child => 
        child.name?.toLowerCase().includes(query.toLowerCase())
      );
      return matchesName || hasMatchingChildren;
    });
  };

  const filteredCategories = filterCategories(categories, categorySearch);

  if (!isCatalogOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-70 z-[45] transition-opacity"
        onClick={closeCatalog}
      />

      {/* Main Sidebar */}
      <div className="fixed left-0 top-0 h-full w-full sm:w-96 md:w-[400px] lg:w-[450px] bg-white shadow-2xl z-50 overflow-y-auto transform transition-transform">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {t('catalog')}
            </h2>
            <button
              onClick={closeCatalog}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder={t('search')}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Categories List */}
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredCategories.length === 0 ? (
            <p className="text-center text-gray-500 py-8">{t('noProductsFound')}</p>
          ) : (
            <div className="space-y-2">
              {filteredCategories.map((category) => {
                const IconComponent = iconComponents[category.icon] || ShoppingBag;
                const hasChildren = category.children && category.children.length > 0;

                return (
                  <div 
                    key={category.id}
                    onMouseEnter={() => handleMouseEnter(category)}
                    onMouseLeave={handleMouseLeave}
                    className="relative"
                  >
                    <button
                      onClick={() => !hasChildren && handleCategoryClick(category.id)}
                      className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-blue-50 transition-colors active:bg-blue-100 group cursor-pointer"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:from-blue-200 group-hover:to-purple-200 transition-all">
                          <IconComponent className="w-7 h-7 text-blue-600" />
                        </div>
                        <span className="font-semibold text-gray-900 text-left text-base leading-tight">
                          {category.name}
                        </span>
                      </div>
                      {hasChildren && (
                        <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0 ml-3 group-hover:text-blue-600 transition-colors" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent p-4 border-t border-gray-200">
          <button
            onClick={() => {
              closeCatalog();
              navigate('/products');
            }}
            className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('language') === 'ru' ? 'Посмотреть все товары' : 'Подивитись всі товари'}
          </button>
        </div>
      </div>

      {/* Submenu Flyout */}
      {hoveredCategory && hoveredCategory.children && hoveredCategory.children.length > 0 && (
        <div
          ref={submenuRef}
          className="fixed top-0 left-[400px] md:left-[400px] lg:left-[450px] h-full w-[320px] md:w-[350px] bg-white shadow-2xl z-[51] overflow-y-auto border-l border-gray-200"
          onMouseEnter={() => setHoveredCategory(hoveredCategory)}
          onMouseLeave={() => setHoveredCategory(null)}
        >
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 pb-3 border-b border-gray-200">
              {hoveredCategory.name}
            </h3>
            <div className="space-y-1">
              {hoveredCategory.children.map((child) => {
                const ChildIconComponent = iconComponents[child.icon] || ShoppingBag;
                
                return (
                  <button
                    key={child.id}
                    onClick={() => handleCategoryClick(child.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors active:bg-blue-100 text-left group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-blue-100 group-hover:to-purple-100">
                      <ChildIconComponent className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      {child.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MultiLevelCatalog;
