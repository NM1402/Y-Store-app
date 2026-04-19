import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, Package, Smartphone, Laptop, Monitor, Tv, Watch, Camera, Headphones, Gamepad, Home as HomeIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { categoriesAPI } from '../utils/api';
import { useCatalog } from '../contexts/CatalogContext';
import { useLanguage } from '../contexts/LanguageContext';

// Lucide icon mapping
const lucideIcons = {
  'Smartphone': Smartphone,
  'Laptop': Laptop,
  'Monitor': Monitor,
  'Tv': Tv,
  'Watch': Watch,
  'Camera': Camera,
  'Headphones': Headphones,
  'Gamepad': Gamepad,
  'Home': HomeIcon,
};

// Get icon component - ALWAYS render as emoji/text span
const IconDisplay = ({ icon, size = 18, className = "" }) => {
  if (!icon) return null;
  // Always render as span - emoji or text
  return <span style={{ fontSize: size }} className={className}>{icon}</span>;
};

const CatalogDropdown = () => {
  const { isCatalogOpen, closeCatalog } = useCatalog();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [categories, setCategories] = useState([]);
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isCatalogOpen) {
      fetchCategories();
    }
  }, [isCatalogOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeCatalog();
      }
    };

    if (isCatalogOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCatalogOpen, closeCatalog]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesAPI.getAll();
      const data = response.data || [];
      console.log('CatalogDropdown categories:', data.slice(0, 3).map(c => ({name: c.name, icon: c.icon})));
      setCategories(data);
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

  const getSubcategories = (parentId) => {
    return categories.filter(cat => cat.parent_id === parentId);
  };

  if (!isCatalogOpen) return null;

  // Get main categories (no parent)
  const mainCategories = categories.filter(cat => !cat.parent_id);
  const hoveredCategoryData = hoveredCategory ? categories.find(c => c.id === hoveredCategory) : null;
  const subcategories = hoveredCategory ? getSubcategories(hoveredCategory) : [];

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={closeCatalog}
      />

      {/* Dropdown Menu */}
      <div 
        ref={dropdownRef}
        className="fixed left-0 right-0 bg-white shadow-2xl z-50 overflow-hidden"
        style={{ top: '130px', maxHeight: '600px' }}
      >
        <div className="flex max-w-screen-2xl mx-auto">
            {/* Left Column - Main Categories */}
            <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto max-h-[600px]">
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="py-4">
                  {mainCategories.map((category) => {
                    const hasSubcategories = getSubcategories(category.id).length > 0;
                    
                    return (
                      <div
                        key={category.id}
                        onMouseEnter={() => hasSubcategories && setHoveredCategory(category.id)}
                        onClick={() => !hasSubcategories && handleCategoryClick(category.id)}
                        className={`px-6 py-3 flex items-center gap-3 cursor-pointer transition-colors ${
                          hoveredCategory === category.id
                            ? 'bg-white text-blue-600'
                            : 'hover:bg-white hover:text-gray-900'
                        }`}
                      >
                        {category.icon && (
                          <span className="w-6 flex-shrink-0 flex items-center justify-center">
                            <IconDisplay icon={category.icon} size={20} />
                          </span>
                        )}
                        <span className="font-medium text-sm flex-1">{category.name}</span>
                        {hasSubcategories && (
                          <ChevronRight className="w-4 h-4 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right Area - Subcategories in columns */}
            <div className="flex-1 bg-white overflow-y-auto max-h-[600px]">
              {hoveredCategoryData && subcategories.length > 0 ? (
                <div className="p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">
                    {hoveredCategoryData.name}
                  </h3>
                  
                  {/* Subcategories in 3 columns */}
                  <div className="grid grid-cols-3 gap-x-8 gap-y-6">
                    {subcategories.map((subcat) => {
                      const subSubcategories = getSubcategories(subcat.id);
                      
                      return (
                        <div key={subcat.id} className="space-y-2">
                          {/* Subcategory Title */}
                          <button
                            onClick={() => handleCategoryClick(subcat.id)}
                            className="font-semibold text-gray-900 hover:text-blue-600 transition-colors text-left text-sm"
                          >
                            {subcat.name}
                          </button>
                          
                          {/* Sub-subcategories */}
                          {subSubcategories.length > 0 && (
                            <ul className="space-y-1 ml-0">
                              {subSubcategories.slice(0, 5).map((subSubcat) => (
                                <li key={subSubcat.id}>
                                  <button
                                    onClick={() => handleCategoryClick(subSubcat.id)}
                                    className="text-gray-600 hover:text-blue-600 transition-colors text-left text-xs block"
                                  >
                                    {subSubcat.name}
                                  </button>
                                </li>
                              ))}
                              {subSubcategories.length > 5 && (
                                <li>
                                  <button
                                    onClick={() => handleCategoryClick(subcat.id)}
                                    className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                                  >
                                    {t('showAll')} →
                                  </button>
                                </li>
                              )}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* "View All" Button */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => handleCategoryClick(hoveredCategoryData.id)}
                      className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                    >
                      {t('allProductsInCategory')} &quot;{hoveredCategoryData.name}&quot; →
                    </button>
                  </div>
                </div>
              ) : hoveredCategoryData ? (
                <div className="p-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {hoveredCategoryData.name}
                  </h3>
                  <button
                    onClick={() => handleCategoryClick(hoveredCategoryData.id)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    {t('viewProducts')}
                  </button>
                </div>
              ) : (
                <div className="p-8 flex items-center justify-center h-full">
                  <div className="text-center text-gray-400">
                    <p className="text-lg mb-2">{t('hoverCategory')}</p>
                    <p className="text-sm">{t('toSeeSubcategories')}</p>
                  </div>
                </div>
              )}
            </div>
        </div>
      </div>
    </>
  );
};

export default CatalogDropdown;
