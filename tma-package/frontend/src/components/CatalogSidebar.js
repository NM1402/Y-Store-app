import React, { useState, useEffect } from 'react';
import { 
  X, ChevronRight, ChevronDown, Search,
  Smartphone, Laptop, Monitor, Tv, Watch, Camera, Headphones, Gamepad,
  Home, Zap, ShoppingBag, Coffee, Microwave, Fan, Wind, Snowflake,
  Shirt, Heart, Book, Music, Car, Bike, Dumbbell, Baby,
  Pill, Leaf, Palette, Wrench, Hammer, Lightbulb, Wifi, Speaker
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { categoriesAPI } from '../utils/api';
import { useCatalog } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';

const CatalogSidebar = () => {
  const { isCatalogOpen, closeCatalog } = useCatalog();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [loading, setLoading] = useState(false);

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
      const response = await categoriesAPI.getAll();
      console.log('Loaded categories:', response.data);
      setCategories(response.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleCategoryClick = (categoryId) => {
    closeCatalog();
    navigate(`/products?category_id=${categoryId}`);
  };

  const filteredCategories = categories.filter(cat =>
    cat.name?.toLowerCase().includes(categorySearch.toLowerCase())
  );

  if (!isCatalogOpen) return null;

  return (
    <>
      {/* Overlay - закрывает весь экран */}
      <div
        className="fixed inset-0 bg-black bg-opacity-70 z-[45] transition-opacity"
        onClick={closeCatalog}
      />

      {/* Sidebar - на весь экран на мобильных */}
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
              {filteredCategories.map((category) => (
                <div key={category.id}>
                  <button
                    onClick={() => handleCategoryClick(category.id)}
                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-blue-50 transition-colors active:bg-blue-100 group"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:from-blue-200 group-hover:to-purple-200 transition-all">
                        {(() => {
                          console.log('Category:', category.name, 'Icon:', category.icon, 'Found:', !!iconComponents[category.icon]);
                          const IconComponent = iconComponents[category.icon || 'Smartphone'];
                          return IconComponent ? <IconComponent className="w-7 h-7 text-blue-600" /> : <ShoppingBag className="w-7 h-7 text-gray-400" />;
                        })()}
                      </div>
                      <span className="font-semibold text-gray-900 text-left text-base leading-tight">{category.name}</span>
                    </div>
                    <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0 ml-3 group-hover:text-blue-600 transition-colors" />
                  </button>
                </div>
              ))}
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
    </>
  );
};

export default CatalogSidebar;
