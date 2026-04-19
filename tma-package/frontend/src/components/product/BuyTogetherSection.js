import React, { useState, useEffect } from 'react';
import { Plus, ShoppingCart } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { productsAPI } from '../../utils/api';
import { Button } from '../ui/button';
import { toast } from 'sonner';

const BuyTogetherSection = ({ currentProduct }) => {
  const [relatedProduct, setRelatedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const { t } = useLanguage();

  useEffect(() => {
    if (currentProduct) {
      fetchRelatedProduct();
    }
  }, [currentProduct]);

  const fetchRelatedProduct = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll({
        category_id: currentProduct.category_id,
        limit: 10
      });
      
      // Get random product from same category, excluding current
      const filtered = response.data.filter(p => p.id !== currentProduct.id);
      if (filtered.length > 0) {
        const randomIndex = Math.floor(Math.random() * Math.min(filtered.length, 5));
        setRelatedProduct(filtered[randomIndex]);
      }
    } catch (error) {
      console.error('Failed to fetch related product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuyTogether = async () => {
    const result1 = await addToCart(currentProduct.id, 1);
    const result2 = await addToCart(relatedProduct.id, 1);
    
    if (result1.success && result2.success) {
      toast.success(t('language') === 'ru' 
        ? 'Оба товара добавлены в корзину' 
        : 'Обидва товари додано до кошика'
      );
    }
  };

  if (loading || !relatedProduct) {
    return null;
  }

  const totalPrice = currentProduct.price + relatedProduct.price;
  const totalOldPrice = (currentProduct.compare_price || currentProduct.price) + 
                        (relatedProduct.compare_price || relatedProduct.price);
  const totalSavings = totalOldPrice - totalPrice;

  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-8">
      <h2 className="text-2xl font-bold mb-6">
        {t('language') === 'ru' ? 'Покупают вместе' : 'Купують разом'}
      </h2>

      <div className="flex items-center gap-6">
        {/* Current Product */}
        <div className="flex-1">
          <div className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="aspect-square bg-gray-50 rounded-lg mb-3 overflow-hidden">
              <img 
                src={currentProduct.images?.[0] || 'https://via.placeholder.com/300'} 
                alt={currentProduct.title}
                className="w-full h-full object-contain p-2"
              />
            </div>
            <h3 className="font-semibold text-sm mb-2 line-clamp-2">{currentProduct.title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-black">
                ${currentProduct.price.toFixed(2)}
              </span>
              {currentProduct.compare_price && (
                <span className="text-sm text-gray-400 line-through">
                  ${currentProduct.compare_price.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Plus Icon */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
            <Plus className="w-6 h-6 text-gray-600" />
          </div>
        </div>

        {/* Related Product */}
        <div className="flex-1">
          <div className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="aspect-square bg-gray-50 rounded-lg mb-3 overflow-hidden">
              <img 
                src={relatedProduct.images?.[0] || 'https://via.placeholder.com/300'} 
                alt={relatedProduct.title}
                className="w-full h-full object-contain p-2"
              />
            </div>
            <h3 className="font-semibold text-sm mb-2 line-clamp-2">{relatedProduct.title}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-black">
                ${relatedProduct.price.toFixed(2)}
              </span>
              {relatedProduct.compare_price && (
                <span className="text-sm text-gray-400 line-through">
                  ${relatedProduct.compare_price.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Total Price and Buy Button */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">
              {t('language') === 'ru' ? 'Общая стоимость:' : 'Загальна вартість:'}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-black">
                ${totalPrice.toFixed(2)}
              </span>
              {totalSavings > 0 && (
                <>
                  <span className="text-xl text-gray-400 line-through">
                    ${totalOldPrice.toFixed(2)}
                  </span>
                  <span className="text-sm font-semibold text-green-600 bg-green-50 px-3 py-1 rounded-full">
                    {t('language') === 'ru' ? 'Экономия' : 'Економія'} ${totalSavings.toFixed(2)}
                  </span>
                </>
              )}
            </div>
          </div>

          <Button
            onClick={handleBuyTogether}
            className="h-14 px-8 text-lg font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
          >
            <ShoppingCart className="w-5 h-5 mr-2" />
            {t('language') === 'ru' ? 'Купить вместе' : 'Купити разом'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BuyTogetherSection;
