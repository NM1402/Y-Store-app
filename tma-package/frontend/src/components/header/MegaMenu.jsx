/**
 * MegaMenu Component - Retail level
 * BLOCK MM2.0
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Smartphone, Monitor, Headphones, Watch, Camera, 
  Gamepad2, Home, Car, Shirt, Gift, Heart, Dog,
  ChevronRight
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const categoryIcons = {
  'smartphones': Smartphone,
  'computers': Monitor,
  'audio': Headphones,
  'watches': Watch,
  'cameras': Camera,
  'gaming': Gamepad2,
  'home': Home,
  'auto': Car,
  'fashion': Shirt,
  'gifts': Gift,
  'beauty': Heart,
  'pets': Dog,
};

export default function MegaMenu({ onClose }) {
  const [categories, setCategories] = useState([]);
  const [active, setActive] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${API_URL}/api/v2/categories/tree`)
      .then(r => r.json())
      .then(data => {
        setCategories(data.tree || data || []);
        if (data.tree?.[0] || data[0]) {
          setActive(data.tree?.[0] || data[0]);
        }
      })
      .catch(console.error);
  }, []);

  const handleCategoryClick = (slug) => {
    navigate(`/catalog?category=${slug}`);
    onClose?.();
  };

  const IconComponent = (slug) => {
    const Icon = categoryIcons[slug] || Gift;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <div 
      data-testid="mega-menu"
      className="absolute top-full left-0 w-full bg-white shadow-2xl border-t z-50"
      onMouseLeave={onClose}
    >
      <div className="container mx-auto flex py-6 min-h-[400px]">

        {/* LEFT COLUMN - Categories */}
        <div className="w-1/4 border-r pr-4">
          <div className="space-y-1">
            {categories.map(cat => (
              <div
                key={cat.slug}
                onMouseEnter={() => setActive(cat)}
                onClick={() => handleCategoryClick(cat.slug)}
                className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all ${
                  active?.slug === cat.slug 
                    ? 'bg-blue-50 text-blue-600' 
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {IconComponent(cat.slug)}
                  <span className="font-medium">{cat.name}</span>
                </div>
                {cat.children?.length > 0 && (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* MIDDLE COLUMN - Subcategories */}
        <div className="w-2/4 px-8">
          {active && (
            <>
              <h3 className="font-bold text-xl mb-6 text-gray-900">{active.name}</h3>
              {active.children?.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  {active.children.map(child => (
                    <div
                      key={child.slug}
                      onClick={() => handleCategoryClick(child.slug)}
                      className="cursor-pointer py-2 px-3 rounded-lg hover:bg-gray-50 hover:text-blue-600 transition-colors"
                    >
                      {child.name}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Підкатегорії будуть додані пізніше</p>
              )}
              
              {/* View All Button */}
              <button
                onClick={() => handleCategoryClick(active.slug)}
                className="mt-6 text-blue-600 font-semibold hover:underline flex items-center gap-2"
              >
                Дивитися всі {active.name}
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* RIGHT PROMO */}
        <div className="w-1/4 pl-4">
          <div className="bg-gradient-to-br from-blue-600 to-purple-700 text-white rounded-2xl p-6 h-full flex flex-col justify-between">
            <div>
              <div className="text-sm opacity-80 mb-2">Спеціальна пропозиція</div>
              <div className="text-2xl font-bold mb-4">
                -15% на аксесуари
              </div>
              <p className="text-sm opacity-80">
                При покупці смартфону - знижка на всі аксесуари
              </p>
            </div>
            <button 
              onClick={() => { navigate('/catalog?discount=true'); onClose?.(); }}
              className="bg-white text-blue-600 font-bold py-2 px-4 rounded-xl mt-4 hover:bg-blue-50 transition"
            >
              Детальніше
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
