import React, { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useLanguage } from '../contexts/LanguageContext';
import { productsAPI } from '../utils/api';
import { Button } from '../components/ui/button';
import { Trash2, ShoppingBag, ArrowLeft } from 'lucide-react';
import { useState } from 'react';

const Cart = () => {
  const { cart, removeFromCart, clearCart, fetchCart } = useCart();
  const { t } = useLanguage();
  const [products, setProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch cart on mount to ensure we have latest data
    fetchCart();
  }, []);

  useEffect(() => {
    fetchCartProducts();
  }, [cart]);

  const fetchCartProducts = async () => {
    try {
      setLoading(true);
      const productPromises = cart?.items?.map((item) =>
        productsAPI.getById(item.product_id).catch(() => null)
      ) || [];
      
      const productResults = await Promise.all(productPromises);
      const productsMap = {};
      
      productResults.forEach((res, idx) => {
        if (res) {
          productsMap[cart.items[idx].product_id] = res.data;
        }
      });
      
      setProducts(productsMap);
    } catch (error) {
      console.error('Failed to fetch cart products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckout = () => {
    navigate('/checkout');
  };

  const cartItems = cart?.items || [];
  const total = cartItems.reduce((sum, item) => {
    const product = products[item.product_id];
    return sum + (product?.price || item.price) * item.quantity;
  }, 0);

  if (cartItems.length === 0) {
    return (
      <div data-testid="empty-cart" className="min-h-[70vh] flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center space-y-8 animate-fadeIn">
          <div className="relative">
            <ShoppingBag className="w-32 h-32 mx-auto text-gray-300 animate-pulse" />
            <div className="absolute -top-2 -right-2 w-16 h-16 bg-blue-100 rounded-full blur-2xl opacity-50 animate-ping"></div>
          </div>
          <div>
            <h2 className="text-4xl font-extrabold bg-gradient-to-r from-gray-600 to-gray-400 bg-clip-text text-transparent mb-3">
              {t('yourCartIsEmpty')}
            </h2>
            <p className="text-gray-600 text-lg">{t('addSomeProducts')}</p>
          </div>
          <Link to="/products">
            <Button 
              data-testid="continue-shopping-button" 
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-6 rounded-2xl text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              {t('continueShopping')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="cart-page" className="min-h-screen py-12 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="container-main">
        <div className="flex items-center justify-between mb-10 animate-slideInLeft">
          <div>
            <h1 data-testid="cart-title" className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {t('shoppingCart')}
            </h1>
            <p className="text-gray-600 mt-2">Перегляньте товари перед оформленням</p>
          </div>
          <Button
            data-testid="clear-cart-button"
            variant="ghost"
            onClick={clearCart}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 px-6 py-3 rounded-xl font-semibold transition-all duration-300 hover:scale-105"
          >
            <Trash2 className="w-5 h-5 mr-2" />
            {t('clearCart')}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-32 rounded-2xl"></div>
              ))
            ) : (
              cartItems.map((item, index) => {
                const product = products[item.product_id];
                if (!product) return null;

                return (
                  <div
                    key={item.product_id}
                    data-testid={`cart-item-${item.product_id}`}
                    className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 flex gap-6 hover:shadow-xl hover:border-blue-300 transition-all duration-300 animate-fadeIn"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    {/* Product Image */}
                    <Link to={`/product/${product.id}`} className="flex-shrink-0 group">
                      <div className="w-28 h-28 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                        {product.images && product.images[0] ? (
                          <img
                            src={product.images[0]}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-4xl">📦</span>
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Product Info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <Link to={`/product/${product.id}`}>
                          <h3 className="font-bold text-xl hover:text-blue-600 transition-colors">
                            {product.title}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                            {t('quantity')}: <strong>{item.quantity}</strong>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <span data-testid={`item-price-${item.product_id}`} className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          ${(product.price * item.quantity).toFixed(2)}
                        </span>
                        <Button
                          data-testid={`remove-item-${item.product_id}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(item.product_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl p-3 transition-all duration-300 hover:scale-110"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1 animate-slideInRight">
            <div className="bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-3xl p-8 space-y-6 sticky top-24 shadow-2xl">
              <h2 className="text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t('orderSummary')}
              </h2>
              
              <div className="space-y-4 py-6 border-t-2 border-b-2 border-gray-200">
                <div className="flex justify-between text-gray-700 text-lg">
                  <span className="font-medium">{t('subtotal')} ({cartItems.length} {t('items')})</span>
                  <span className="font-bold">${total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-700 text-lg">
                  <span className="font-medium">{t('shipping')}</span>
                  <span className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full">
                    🎉 {t('free')}
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
                <div className="flex justify-between items-center">
                  <span className="text-xl font-bold">{t('total')}</span>
                  <span data-testid="cart-total" className="text-4xl font-extrabold">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Fixed Button Layout */}
              <div className="space-y-4">
                <Button
                  data-testid="proceed-to-checkout-button"
                  onClick={handleCheckout}
                  size="lg"
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-2xl text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                >
                  {t('proceedToCheckout')} →
                </Button>

                <Link to="/products" className="block">
                  <Button 
                    data-testid="continue-shopping-link" 
                    variant="outline" 
                    className="w-full border-2 border-gray-300 hover:border-blue-600 hover:bg-blue-50 py-4 rounded-2xl text-lg font-semibold transition-all duration-300"
                  >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    {t('continueShopping')}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;