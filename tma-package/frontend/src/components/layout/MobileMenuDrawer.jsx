/**
 * BLOCK V2-23: Mobile Menu Drawer
 * Slide-in mobile navigation with categories
 */
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  X, ChevronRight, ChevronLeft, Home, ShoppingBag, Heart, 
  User, Phone, Gift, Percent, Truck
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function MobileMenuDrawer({ open, onClose }) {
  const [tree, setTree] = useState([]);
  const [active, setActive] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    
    fetch(`${API_URL}/api/v2/categories/tree`)
      .then(r => r.json())
      .then(data => setTree(data.tree || data || []))
      .catch(console.error);
    
    // Lock scroll
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const goToCategory = (slug) => {
    navigate(`/catalog?category=${slug}`);
    onClose();
  };

  const quickLinks = [
    { icon: Home, label: "Головна", link: "/" },
    { icon: ShoppingBag, label: "Каталог", link: "/catalog" },
    { icon: Heart, label: "Обране", link: "/wishlist" },
    { icon: User, label: "Кабінет", link: "/cabinet" },
    { icon: Percent, label: "Акції", link: "/promotions" },
    { icon: Phone, label: "Контакти", link: "/contact" },
  ];

  return (
    <div data-testid="mobile-menu-drawer" className="fixed inset-0 z-[1000]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
        onClick={onClose} 
      />

      {/* Drawer */}
      <div className="absolute left-0 top-0 h-full w-[86%] max-w-[360px] bg-white shadow-2xl overflow-hidden animate-slideInLeft">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="font-bold text-lg">Y-Store</div>
          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="h-[calc(100%-64px)] overflow-y-auto">
          {/* Categories */}
          {!active ? (
            <>
              {/* Category Title */}
              <div className="p-4 border-b">
                <h3 className="font-bold text-gray-900">Категорії</h3>
              </div>

              {/* Category List */}
              <div className="divide-y">
                {tree.map(cat => (
                  <button
                    key={cat.slug || cat.id}
                    onClick={() => cat.children?.length ? setActive(cat) : goToCategory(cat.slug)}
                    className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition"
                  >
                    <span className="font-medium text-gray-800">{cat.name}</span>
                    {cat.children?.length > 0 && (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                ))}
              </div>

              {/* Quick Links */}
              <div className="p-4 border-t mt-4">
                <h3 className="font-bold text-gray-900 mb-3">Швидкі посилання</h3>
                <div className="grid grid-cols-3 gap-3">
                  {quickLinks.map(({ icon: Icon, label, link }) => (
                    <Link
                      key={link}
                      to={link}
                      onClick={onClose}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-100 transition"
                    >
                      <Icon className="w-5 h-5 text-gray-600" />
                      <span className="text-xs text-gray-600">{label}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Promo Banner */}
              <div className="m-4 p-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                <div className="flex items-center gap-2 mb-2">
                  <Gift className="w-5 h-5" />
                  <span className="text-sm font-semibold">Акція</span>
                </div>
                <div className="text-lg font-bold">-10% при онлайн оплаті</div>
                <p className="text-sm opacity-80 mt-1">На всі товари в каталозі</p>
              </div>

              {/* Delivery Info */}
              <div className="m-4 p-4 rounded-xl bg-gray-50 flex items-center gap-3">
                <Truck className="w-6 h-6 text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900">Безкоштовна доставка</div>
                  <div className="text-sm text-gray-600">При замовленні від 1000 грн</div>
                </div>
              </div>
            </>
          ) : (
            /* Subcategories View */
            <>
              {/* Back Button */}
              <button
                onClick={() => setActive(null)}
                className="w-full flex items-center gap-2 px-4 py-4 border-b hover:bg-gray-50 transition"
              >
                <ChevronLeft className="w-5 h-5 text-blue-600" />
                <span className="text-blue-600 font-medium">Назад</span>
              </button>

              {/* Category Title */}
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-bold text-gray-900 text-lg">{active.name}</h3>
              </div>

              {/* All Category Link */}
              <button
                onClick={() => goToCategory(active.slug)}
                className="w-full flex items-center justify-between px-4 py-4 border-b hover:bg-blue-50 transition"
              >
                <span className="font-semibold text-blue-600">Усі товари в {active.name}</span>
                <ChevronRight className="w-5 h-5 text-blue-600" />
              </button>

              {/* Subcategory List */}
              <div className="divide-y">
                {active.children?.map(child => (
                  <button
                    key={child.slug || child.id}
                    onClick={() => goToCategory(child.slug)}
                    className="w-full flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition"
                  >
                    <span className="text-gray-800">{child.name}</span>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
