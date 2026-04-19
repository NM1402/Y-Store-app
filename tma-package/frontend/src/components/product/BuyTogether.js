import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { productsAPI } from '../../utils/api';
import { Button } from '../ui/button';
import { toast } from 'sonner';

const BuyTogether = ({ product }) => {
  const [complementaryProducts, setComplementaryProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const fetchComplementaryProducts = React.useCallback(async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll({
        category_id: product.category_id,
        limit: 10
      });
      
      // Filter out current product and select 1-2 random complementary products
      const products = Array.isArray(response.data) ? response.data : response;
      const filtered = products
        .filter(p => p.id !== product.id && p.stock_level > 0)
        .slice(0, 2);
      
      setComplementaryProducts(filtered);
      // Pre-select first complementary product
      if (filtered.length > 0) {
        setSelectedProducts([filtered[0]]);
      }
    } catch (error) {
      console.error('Failed to fetch complementary products:', error);
    } finally {
      setLoading(false);
    }
  }, [product]);

  useEffect(() => {
    if (product?.category_id) {
      fetchComplementaryProducts();
    }
  }, [product, fetchComplementaryProducts]);

  const toggleProductSelection = (prod) => {
    setSelectedProducts(prev => {
      const isSelected = prev.some(p => p.id === prod.id);
      if (isSelected) {
        return prev.filter(p => p.id !== prod.id);
      } else {
        return [...prev, prod];
      }
    });
  };

  const calculateTotalPrice = () => {
    const mainPrice = product.price;
    const complementaryPrice = selectedProducts.reduce((sum, p) => sum + p.price, 0);
    return mainPrice + complementaryPrice;
  };

  const handleAddAllToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      // Add main product
      await addToCart(product.id, 1);
      
      // Add selected complementary products
      for (const complementaryProduct of selectedProducts) {
        await addToCart(complementaryProduct.id, 1);
      }
      
      toast.success(t('addAllToCart') + '!');
    } catch (error) {
      toast.error('Не удалось добавить товары в корзину');
    }
  };

  if (loading || complementaryProducts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-8">
      <h2 className="text-2xl font-bold mb-6">
        {t('buyTogether')}
      </h2>

      <div className="flex flex-col lg:flex-row gap-6 items-stretch">
        {/* Main Product */}
        <div className="flex-1 min-w-0">
          <div className="border-2 border-blue-500 rounded-xl p-4 h-full bg-blue-50/30">
            <div className="flex gap-4 items-center">
              <div className="w-24 h-24 bg-white rounded-lg flex-shrink-0 border border-gray-200">
                <img
                  src={product.images?.[0] || 'https://via.placeholder.com/100'}
                  alt={product.title}
                  className="w-full h-full object-contain p-2"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                  {product.title}
                </h3>
                <div className="text-xl font-bold text-blue-600">
                  ${product.price.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Plus Icon */}
        <div className="flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <Plus className="w-6 h-6 text-gray-600" />
          </div>
        </div>

        {/* Complementary Products */}
        {complementaryProducts.map((complementaryProduct, index) => (
          <React.Fragment key={complementaryProduct.id}>
            <div className="flex-1 min-w-0">
              <div
                onClick={() => toggleProductSelection(complementaryProduct)}
                className={`border-2 rounded-xl p-4 h-full cursor-pointer transition-all ${
                  selectedProducts.some(p => p.id === complementaryProduct.id)
                    ? 'border-green-500 bg-green-50/30'
                    : 'border-gray-300 bg-gray-50/30 hover:border-gray-400'
                }`}
              >
                <div className="flex gap-4 items-center">
                  <div className="w-24 h-24 bg-white rounded-lg flex-shrink-0 border border-gray-200">
                    <img
                      src={complementaryProduct.images?.[0] || 'https://via.placeholder.com/100'}
                      alt={complementaryProduct.title}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-2">
                      {complementaryProduct.title}
                    </h3>
                    <div className="text-xl font-bold text-green-600">
                      ${complementaryProduct.price.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProducts.some(p => p.id === complementaryProduct.id)}
                      onChange={() => {}}
                      className="w-4 h-4 text-green-600 rounded border-gray-300 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">{t('addThisProduct')}</span>
                  </label>
                </div>
              </div>
            </div>
            
            {index < complementaryProducts.length - 1 && (
              <div className="flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-gray-600" />
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Total Price and Add All Button */}
      {selectedProducts.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-lg">{t('totalPrice')}:</span>
              <span className="text-3xl font-bold text-black">
                ${calculateTotalPrice().toFixed(2)}
              </span>
              {(product.compare_price || selectedProducts.some(p => p.compare_price)) && (
                <span className="text-sm text-green-600 font-medium">
                  ({t('savings')} $
                  {((product.compare_price || product.price) + 
                    selectedProducts.reduce((sum, p) => sum + (p.compare_price || p.price), 0) - 
                    calculateTotalPrice()).toFixed(2)})
                </span>
              )}
            </div>
            <Button
              onClick={handleAddAllToCart}
              className="w-full sm:w-auto h-14 px-8 text-lg font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              {t('addAllToCart')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyTogether;
