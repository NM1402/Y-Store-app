import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ChevronRight, Smartphone, Laptop, Tablet, Tv, Headphones, Camera, Home, Watch, Gamepad2, Lightbulb } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ICONS = {
  smartphones: Smartphone,
  laptops: Laptop,
  tablets: Tablet,
  tv: Tv,
  audio: Headphones,
  'photo-video': Camera,
  appliances: Home,
  accessories: Watch,
  gaming: Gamepad2,
  'smart-home': Lightbulb,
};

const MegaMenuV2 = ({ language = 'uk', onClose }) => {
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/v2/categories/tree`);
        const tree = res.data.tree || [];
        setCategories(tree);
        if (tree.length > 0) {
          setActiveCategory(tree[0]);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  const getName = (cat) => {
    if (language === 'uk') return cat.name_uk || cat.name || cat.slug;
    return cat.name_ru || cat.name || cat.slug;
  };

  const getIcon = (slug) => {
    const Icon = ICONS[slug] || Smartphone;
    return Icon;
  };

  const T = {
    uk: {
      allProducts: 'Всі товари',
      promo: 'Вигідно сьогодні',
      promoTitle: 'Знижки до -30%',
      promoDesc: 'На популярні категорії',
      promoBtn: 'До акцій'
    },
    ru: {
      allProducts: 'Все товары',
      promo: 'Выгодно сегодня',
      promoTitle: 'Скидки до -30%',
      promoDesc: 'На популярные категории',
      promoBtn: 'К акциям'
    }
  };

  const txt = T[language] || T.uk;

  return (
    <div className="absolute left-0 right-0 top-full bg-white border-t border-gray-100 shadow-2xl z-50">
      <div className="container-main py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Categories List */}
          <div className="col-span-3 border-r border-gray-100 pr-6">
            <nav className="space-y-1">
              {categories.map((cat) => {
                const Icon = getIcon(cat.slug);
                const isActive = activeCategory?.id === cat.id;
                
                return (
                  <button
                    key={cat.id}
                    onMouseEnter={() => setActiveCategory(cat)}
                    onClick={() => {
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600' 
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-semibold flex-1">{getName(cat)}</span>
                    {cat.children?.length > 0 && (
                      <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-blue-500' : 'text-gray-400'}`} />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Subcategories */}
          <div className="col-span-6">
            {activeCategory && (
              <>
                <Link 
                  to={`/catalog?category=${activeCategory.slug}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-2 text-xl font-bold text-gray-900 mb-4 hover:text-blue-600 transition-colors"
                >
                  {getName(activeCategory)}
                  <ChevronRight className="w-5 h-5" />
                </Link>

                <div className="grid grid-cols-3 gap-6">
                  {activeCategory.children?.map((subcat) => (
                    <div key={subcat.id}>
                      <Link
                        to={`/catalog?category=${subcat.slug}`}
                        onClick={onClose}
                        className="font-bold text-gray-800 hover:text-blue-600 transition-colors block mb-2"
                      >
                        {getName(subcat)}
                      </Link>
                      
                      {subcat.children?.length > 0 && (
                        <ul className="space-y-1">
                          {subcat.children.slice(0, 5).map((item) => (
                            <li key={item.id}>
                              <Link
                                to={`/catalog?category=${item.slug}`}
                                onClick={onClose}
                                className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
                              >
                                {getName(item)}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>

                {/* View All */}
                <Link
                  to={`/catalog?category=${activeCategory.slug}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-2 mt-6 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                >
                  {txt.allProducts} <ChevronRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Promo Block */}
          <div className="col-span-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl p-6 text-white h-full flex flex-col justify-between">
              <div>
                <span className="text-sm font-semibold opacity-90">{txt.promo}</span>
                <h3 className="text-2xl font-black mt-2">{txt.promoTitle}</h3>
                <p className="text-sm opacity-80 mt-2">{txt.promoDesc}</p>
              </div>
              <Link
                to="/promotions"
                onClick={onClose}
                className="inline-flex items-center gap-2 bg-white text-blue-600 px-4 py-2 rounded-xl font-bold mt-4 hover:bg-blue-50 transition-colors w-fit"
              >
                {txt.promoBtn} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MegaMenuV2;
