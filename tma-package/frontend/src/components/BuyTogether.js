import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check } from 'lucide-react';
import { Button } from './ui/button';

const BuyTogether = ({ currentProductId, currentProductPrice }) => {
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([currentProductId]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRelatedProducts();
  }, [currentProductId]);

  const fetchRelatedProducts = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/products?limit=3`);
      const data = await response.json();
      setRelatedProducts(data.products || []);
    } catch (error) {
      console.error('Error fetching related products:', error);
    }
  };

  const toggleProduct = (productId) => {
    if (productId === currentProductId) return; // Can't deselect main product
    
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const calculateTotal = () => {
    let total = currentProductPrice || 0;
    relatedProducts.forEach(product => {
      if (selectedProducts.includes(product.id)) {
        total += product.sale_price || product.price;
      }
    });
    return total;
  };

  const handleBuySelected = () => {
    // Add selected products to cart
    selectedProducts.forEach(productId => {
      // Add to cart logic here
    });
    navigate('/cart');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-2xl font-bold mb-6">Купують разом</h2>

      <div className="space-y-4">
        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {relatedProducts.slice(0, 3).map((product, index) => (
            <React.Fragment key={product.id}>
              {/* Plus Icon */}
              {index > 0 && (
                <div className="hidden md:flex items-center justify-center">
                  <Plus className="w-6 h-6 text-gray-400" />
                </div>
              )}

              {/* Product Card */}
              <div
                className={`relative border-2 rounded-lg p-3 cursor-pointer transition-all ${
                  selectedProducts.includes(product.id)
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleProduct(product.id)}
              >
                {/* Checkbox */}
                <div className="absolute top-2 right-2 z-10">
                  <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                    selectedProducts.includes(product.id)
                      ? 'bg-green-500 border-green-500'
                      : 'bg-white border-gray-300'
                  }`}>
                    {selectedProducts.includes(product.id) && (
                      <Check className="w-4 h-4 text-white" />
                    )}
                  </div>
                </div>

                {/* Product Image */}
                <div className="aspect-square bg-gray-100 rounded-lg mb-2 overflow-hidden">
                  <img
                    src={product.images?.[0] || 'https://via.placeholder.com/200'}
                    alt={product.name}
                    className="w-full h-full object-contain p-2"
                  />
                </div>

                {/* Product Info */}
                <h3 className="text-sm font-medium line-clamp-2 mb-2">
                  {product.name}
                </h3>

                {/* Price */}
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">
                    {product.sale_price || product.price} ₴
                  </span>
                  {product.sale_price && (
                    <span className="text-xs text-gray-500 line-through">
                      {product.price} ₴
                    </span>
                  )}
                </div>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Total and Buy Button */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-600 mb-1">
              Вибрано товарів: {selectedProducts.length}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              Загалом: {calculateTotal().toFixed(2)} ₴
            </p>
          </div>

          <Button
            onClick={handleBuySelected}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            Купити разом
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BuyTogether;
