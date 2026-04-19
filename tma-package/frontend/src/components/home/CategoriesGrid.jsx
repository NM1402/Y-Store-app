/**
 * BLOCK V2-20: Categories Grid
 * Visual category navigation grid
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  Smartphone, Monitor, Headphones, Watch, Camera, 
  Gamepad2, Home, Car, Shirt, Gift
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

const categoryIcons = {
  'smartphones': { icon: Smartphone, color: 'from-blue-500 to-indigo-600' },
  'electronics': { icon: Monitor, color: 'from-purple-500 to-pink-600' },
  'computers': { icon: Monitor, color: 'from-slate-600 to-slate-800' },
  'audio': { icon: Headphones, color: 'from-orange-500 to-red-600' },
  'watches': { icon: Watch, color: 'from-teal-500 to-cyan-600' },
  'cameras': { icon: Camera, color: 'from-amber-500 to-orange-600' },
  'gaming': { icon: Gamepad2, color: 'from-green-500 to-emerald-600' },
  'home': { icon: Home, color: 'from-rose-500 to-pink-600' },
  'auto': { icon: Car, color: 'from-sky-500 to-blue-600' },
  'fashion': { icon: Shirt, color: 'from-violet-500 to-purple-600' },
};

const defaultIcon = { icon: Gift, color: 'from-gray-500 to-gray-700' };

export default function CategoriesGrid() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetch(`${API_URL}/api/v2/categories/tree`)
      .then(r => r.json())
      .then(data => {
        const tree = data.tree || data || [];
        setCategories(tree.slice(0, 8));
      })
      .catch(console.error);
  }, []);

  if (!categories.length) return null;

  return (
    <div data-testid="categories-grid" className="my-12 sm:my-16">
      <h2 className="text-xl sm:text-2xl font-bold mb-6">Популярні категорії</h2>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {categories.map(cat => {
          const { icon: Icon, color } = categoryIcons[cat.slug] || defaultIcon;
          return (
            <Link
              key={cat.slug || cat.id}
              to={`/catalog?category=${cat.slug || cat.id}`}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-white transition-all hover:scale-105 hover:shadow-lg"
              style={{ background: `linear-gradient(135deg, var(--tw-gradient-stops))` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-90`} />
              <div className="relative z-10">
                <Icon className="w-8 h-8 mb-3 opacity-80 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold text-lg">{cat.name}</h3>
                {cat.children?.length > 0 && (
                  <p className="text-sm opacity-80 mt-1">
                    {cat.children.length} підкатегорій
                  </p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
