import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Laptop, 
  Smartphone, 
  Gamepad2, 
  WashingMachine, 
  Shirt, 
  Sofa, 
  Hammer, 
  Dumbbell, 
  Baby,
  PackageOpen,
  BookOpen,
  Dog,
  Sparkles,
  Gift,
  ChevronDown,
  ChevronRight,
  Monitor,
  Tablet,
  Headphones,
  Watch,
  Camera
} from 'lucide-react';
import { categoriesAPI } from '../utils/api';

const CategorySidebar = ({ categories, selectedCategory, onCategoryClick }) => {
  const navigate = useNavigate();
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [categoriesData, setCategoriesData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch categories from API
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await categoriesAPI.getAll();
      
      // Organize categories with subcategories
      const organized = organizeCategories(response.data);
      setCategoriesData(organized);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const organizeCategories = (categories) => {
    // Get parent categories
    const parents = categories.filter(cat => !cat.parent_id);
    
    // Map subcategories to parents
    return parents.map(parent => ({
      ...parent,
      subcategories: categories.filter(cat => cat.parent_id === parent.id)
    }));
  };

  // Icon mapping for categories
  const iconMap = {
    'electronics': Laptop,
    'smartphones-tv': Smartphone,
    'gaming': Gamepad2,
    'appliances': WashingMachine,
    'fashion': Shirt,
    'home-garden': Sofa,
    'sports': Dumbbell,
    'beauty': Sparkles,
    'kids': Baby,
    'pets': Dog
  };

  // Categories structure - only from API (no fallback)
  const categoryStructure = loading ? [] : categoriesData;

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleCategoryClick = (categoryId) => {
    navigate(`/products?category=${categoryId}`);
  };

  const handleSubcategoryClick = (subcategoryId) => {
    navigate(`/products?subcategory=${subcategoryId}`);
  };

  return (
    <aside className="w-80 flex-shrink-0 space-y-4">
      {/* Categories */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Завантаження...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {categoryStructure.map((category) => {
              const IconComponent = iconMap[category.slug] || category.icon || PackageOpen;
              const isExpanded = expandedCategories.includes(category.id);
              const isSelected = selectedCategory === category.id;
            
            return (
              <div key={category.id}>
                {/* Main Category */}
                <div
                  className={`flex items-center justify-between p-4 transition-colors hover:bg-gray-50 cursor-pointer ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div 
                    className="flex items-center gap-4 flex-1"
                    onClick={() => handleCategoryClick(category.id)}
                  >
                    <div className={`w-12 h-12 flex items-center justify-center rounded-xl ${
                      isSelected ? 'bg-blue-100' : 'bg-gray-100'
                    }`}>
                      <IconComponent className={`w-7 h-7 ${
                        isSelected ? 'text-blue-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <span className={`font-medium text-left text-sm ${
                      isSelected ? 'text-blue-700' : 'text-gray-800'
                    }`}>
                      {category.name}
                    </span>
                  </div>
                  
                  {/* Expand/Collapse Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleCategory(category.id);
                    }}
                    className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                </div>
                
                {/* Subcategories */}
                {isExpanded && category.subcategories && category.subcategories.length > 0 && (
                  <div className="bg-gray-50 px-4 py-2">
                    {category.subcategories.map((subcategory) => (
                      <button
                        key={subcategory.id}
                        onClick={() => handleSubcategoryClick(subcategory.id)}
                        className="w-full text-left py-2 px-4 text-sm text-gray-700 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                      >
                        {subcategory.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>
    </aside>
  );
};

export default CategorySidebar;