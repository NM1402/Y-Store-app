/**
 * BLOCK V3-RETAIL: Deal of the Day
 * Premium countdown timer with featured product + i18n support
 */
import React, { useState, useEffect, useCallback } from "react";
import { Flame, Clock, ShoppingCart, Zap, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useCart } from "../../contexts/CartContext";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function DealOfDay() {
  const { t, language } = useLanguage();
  const { addItem } = useCart();
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());
  const [product, setProduct] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  function calculateTimeLeft() {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    return Math.floor((endOfDay - now) / 1000);
  }

  useEffect(() => {
    // Fetch bestseller or discounted product
    const fetchDealProduct = async () => {
      try {
        // Try catalog first for discounted products
        const res = await fetch(`${API_URL}/api/v2/catalog?sort=discount&limit=1`);
        const data = await res.json();
        const items = data.products || data.items || [];
        
        if (items.length) {
          setProduct(items[0]);
        } else {
          // Fallback to regular products
          const fallback = await fetch(`${API_URL}/api/products?is_bestseller=true&limit=1`);
          const fbData = await fallback.json();
          const fbItems = fbData.items || fbData || [];
          if (fbItems.length) setProduct(fbItems[0]);
        }
      } catch (err) {
        console.error("DealOfDay fetch error:", err);
      }
    };
    fetchDealProduct();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(prev => prev > 0 ? prev - 1 : calculateTimeLeft());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const pad = (n) => String(n).padStart(2, '0');

  const handleAddToCart = useCallback(async () => {
    if (!product || isAdding) return;
    setIsAdding(true);
    try {
      await addItem(product.id || product._id, 1);
    } finally {
      setTimeout(() => setIsAdding(false), 500);
    }
  }, [product, addItem, isAdding]);

  // Calculate discount percentage
  const discountPercent = product?.old_price 
    ? Math.round((1 - product.price / product.old_price) * 100)
    : 0;

  // Translations
  const texts = {
    ua: {
      hotPrice: "Гаряча ціна дня",
      hurryUp: "Встигни купити!",
      hours: "годин",
      minutes: "хвилин", 
      seconds: "секунд",
      buy: "Купити",
      discount: "Знижка",
      left: "Залишилось"
    },
    ru: {
      hotPrice: "Горячая цена дня",
      hurryUp: "Успей купить!",
      hours: "часов",
      minutes: "минут",
      seconds: "секунд",
      buy: "Купить",
      discount: "Скидка",
      left: "Осталось"
    }
  };
  
  const txt = texts[language] || texts.ua;

  return (
    <section 
      data-testid="deal-of-day"
      className="relative overflow-hidden bg-gradient-to-br from-rose-600 via-pink-600 to-purple-700 text-white rounded-2xl shadow-2xl my-12 sm:my-16"
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-yellow-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative p-6 sm:p-10 lg:p-12">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-12">
          
          {/* Left - Timer Section */}
          <div className="text-center lg:text-left flex-shrink-0">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
              <Flame className="w-5 h-5 text-yellow-300 animate-bounce" />
              <span className="text-sm font-bold uppercase tracking-wider">
                {txt.hotPrice}
              </span>
              <Zap className="w-4 h-4 text-yellow-300" />
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6 drop-shadow-lg">
              {txt.hurryUp}
            </h2>
            
            {/* Countdown Timer */}
            <div className="flex items-center gap-2 sm:gap-4 justify-center lg:justify-start">
              {/* Hours */}
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 sm:p-4 min-w-[70px] sm:min-w-[90px] border border-white/20">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black tabular-nums">
                  {pad(hours)}
                </div>
                <div className="text-xs sm:text-sm font-medium opacity-80 mt-1">
                  {txt.hours}
                </div>
              </div>
              
              <span className="text-3xl sm:text-4xl font-bold animate-pulse">:</span>
              
              {/* Minutes */}
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 sm:p-4 min-w-[70px] sm:min-w-[90px] border border-white/20">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black tabular-nums">
                  {pad(minutes)}
                </div>
                <div className="text-xs sm:text-sm font-medium opacity-80 mt-1">
                  {txt.minutes}
                </div>
              </div>
              
              <span className="text-3xl sm:text-4xl font-bold animate-pulse">:</span>
              
              {/* Seconds */}
              <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3 sm:p-4 min-w-[70px] sm:min-w-[90px] border border-white/20">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-black tabular-nums text-yellow-300">
                  {pad(seconds)}
                </div>
                <div className="text-xs sm:text-sm font-medium opacity-80 mt-1">
                  {txt.seconds}
                </div>
              </div>
            </div>
          </div>

          {/* Right - Product Card */}
          {product && (
            <div className="flex-1 max-w-lg w-full">
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-xl transform hover:scale-[1.02] transition-transform duration-300">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  {/* Product Image */}
                  <div className="relative">
                    {product.images?.[0] && (
                      <img 
                        src={product.images[0]} 
                        alt={product.name || product.title}
                        className="w-32 h-32 sm:w-40 sm:h-40 object-contain rounded-xl"
                      />
                    )}
                    {/* Discount Badge */}
                    {discountPercent > 0 && (
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-sm font-bold px-2 py-1 rounded-lg shadow-lg flex items-center gap-1">
                        <TrendingDown className="w-3 h-3" />
                        -{discountPercent}%
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="text-center sm:text-left flex-1">
                    <h3 className="font-bold text-gray-800 text-lg sm:text-xl line-clamp-2 mb-2">
                      {product.name || product.title}
                    </h3>
                    
                    {/* Price */}
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start mb-4">
                      {product.old_price && (
                        <span className="text-gray-400 line-through text-lg">
                          {product.old_price?.toLocaleString()} ₴
                        </span>
                      )}
                      <span className="text-2xl sm:text-3xl font-black text-rose-600">
                        {product.price?.toLocaleString()} ₴
                      </span>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button 
                        onClick={handleAddToCart}
                        disabled={isAdding}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                      >
                        <ShoppingCart className="w-5 h-5" />
                        {txt.buy}
                      </button>
                      <Link 
                        to={`/product/${product.slug || product.id || product._id}`}
                        className="flex-1 inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-5 py-3 rounded-xl font-bold transition-all"
                      >
                        {t('details') || 'Детальніше'}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
