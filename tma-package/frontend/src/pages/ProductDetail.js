import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useComparison } from '../contexts/ComparisonContext';
import { useLanguage } from '../contexts/LanguageContext';
import { productsAPI, reviewsAPI } from '../utils/api';
import { Star, Heart, GitCompare, ShoppingCart, Minus, Plus, ChevronRight, Package, Shield, Truck, Eye, AlertTriangle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import ProductGallery from '../components/ProductGallery';
import ProductSpecs from '../components/ProductSpecs';
import DeliveryOptions from '../components/DeliveryOptions';
import BuyTogether from '../components/BuyTogether';
import AIRecommendations from '../components/AIRecommendations';
import ReviewsSection from '../components/ReviewsSection';
import { trackProductView, trackAddToCart } from '../lib/track';

const ProductDetail = () => {
  const { id } = useParams();
  const { t } = useLanguage();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [selectedImage, setSelectedImage] = useState(0);
  
  // Social proof - fake live viewers
  const [viewers] = useState(Math.floor(Math.random() * 15) + 5);
  
  const { addToCart } = useCart();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { addToComparison, removeFromComparison, isInComparison } = useComparison();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProduct();
  }, [id]);

  // Track product view
  useEffect(() => {
    if (product) {
      trackProductView(id, product.title, product.price);
    }
  }, [product, id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getById(id);
      setProduct(response.data);
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    // Track add to cart
    trackAddToCart(id, quantity, product?.price);
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    addToCart(product.id, quantity);
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const result = await addToCart(product.id, quantity);
    if (result.success) {
      // Small delay to ensure cart state is fully updated before navigation
      setTimeout(() => {
        navigate('/cart');
      }, 300);
    }
  };

  const handleToggleFavorite = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isFavorite(product.id)) {
      removeFromFavorites(product.id);
      toast.success('Видалено з обраного');
    } else {
      addToFavorites(product);
      toast.success('Додано в обране');
    }
  };

  const handleToggleComparison = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isInComparison(product.id)) {
      removeFromComparison(product.id);
      toast.success('Видалено з порівняння');
    } else {
      addToComparison(product);
      toast.success('Додано до порівняння');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-12 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <div className="container-main">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-pulse">
            <div className="shimmer h-[600px] rounded-3xl"></div>
            <div className="space-y-6">
              <div className="shimmer h-16 w-3/4 rounded-2xl"></div>
              <div className="shimmer h-12 w-1/2 rounded-2xl"></div>
              <div className="shimmer h-32 w-full rounded-2xl"></div>
              <div className="shimmer h-16 w-full rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen py-12 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <div className="container-main text-center animate-fadeIn">
          <h2 className="text-3xl font-bold text-gray-400">Product not found</h2>
        </div>
      </div>
    );
  }

  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  const images = product.images && product.images.length > 0 ? product.images : [null];

  return (
    <div data-testid="product-detail-page" className="min-h-screen py-12 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="container-main">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
          {/* Images Section */}
          <div className="space-y-6 animate-slideInLeft">
            {/* Main Image */}
            <div className="relative aspect-ratio-1-1 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl overflow-hidden shadow-2xl group">
              {images[selectedImage] ? (
                <img
                  data-testid="main-product-image"
                  src={images[selectedImage]}
                  alt={product.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-8xl">📦</span>
                </div>
              )}
              {discount > 0 && (
                <div className="absolute top-6 right-6 bg-gradient-to-r from-red-600 to-pink-600 text-white px-6 py-3 rounded-2xl font-extrabold text-xl shadow-2xl animate-pulse transform rotate-3">
                  -{discount}%
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    data-testid={`thumbnail-${idx}`}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-ratio-1-1 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden border-3 transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                      selectedImage === idx ? 'border-blue-600 ring-4 ring-blue-200' : 'border-transparent'
                    }`}
                  >
                    {img ? (
                      <img src={img} alt={`${product.title} ${idx + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl">📦</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info Section */}
          <div className="space-y-8 animate-slideInRight">
            <div>
              <h1 data-testid="product-title" className="text-3xl md:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-6 leading-tight">
                {product.title}
              </h1>
              
              {/* Rating */}
              {product.rating > 0 && (
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-6 h-6 transition-all ${
                          i < Math.floor(product.rating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600 text-lg font-medium">({product.reviews_count} відгуків)</span>
                </div>
              )}

              {/* Price */}
              <div className="bg-gradient-to-br from-white to-blue-50 rounded-3xl p-6 shadow-xl mb-6">
                <div className="flex flex-wrap items-center gap-4">
                  <span data-testid="product-price" className="text-4xl md:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    ${product.price.toFixed(2)}
                  </span>
                  {product.compare_price && (
                    <>
                      <span className="text-xl md:text-2xl text-gray-400 line-through">
                        ${product.compare_price.toFixed(2)}
                      </span>
                      <span data-testid="discount-badge" className="bg-gradient-to-r from-red-600 to-pink-600 text-white px-5 py-2 rounded-full font-bold text-lg shadow-lg">
                        🔥 -{discount}% OFF
                      </span>
                    </>
                  )}
                </div>
                {product.compare_price && (
                  <div className="mt-3 text-green-600 font-bold text-lg bg-green-50 px-4 py-2 rounded-full inline-block">
                    💰 Ви економите ${(product.compare_price - product.price).toFixed(2)}
                  </div>
                )}
              </div>

              {/* Short Description */}
              {product.short_description && (
                <p className="text-xl text-gray-600 mb-6 leading-relaxed">{product.short_description}</p>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-3 text-base p-4 rounded-2xl bg-white shadow-md">
              {product.stock_level > 0 ? (
                <>
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-600 font-bold text-lg">
                    ✅ В наявності ({product.stock_level} шт.)
                  </span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-red-600 font-bold text-lg">❌ Немає в наявності</span>
                </>
              )}
            </div>
            
            {/* Low Stock Warning */}
            {product.stock_level > 0 && product.stock_level < 5 && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Залишилось лише {product.stock_level} шт.!</span>
              </div>
            )}
            
            {/* Social Proof */}
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700">
              <Eye className="w-5 h-5" />
              <span className="font-medium">{viewers} людей переглядають цей товар</span>
            </div>

            {/* Quantity Selector */}
            {product.stock_level > 0 && (
              <div className="space-y-6">
                <div className="flex items-center gap-6 bg-white rounded-2xl p-4 shadow-md">
                  <label className="font-bold text-lg">Кількість:</label>
                  <div className="flex items-center border-2 border-blue-600 rounded-2xl overflow-hidden shadow-lg">
                    <button
                      data-testid="decrease-quantity"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-6 py-3 hover:bg-blue-50 transition-colors font-bold text-xl text-blue-600"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span data-testid="quantity-value" className="px-8 py-3 border-x-2 border-blue-600 font-bold text-xl min-w-[80px] text-center">
                      {quantity}
                    </span>
                    <button
                      data-testid="increase-quantity"
                      onClick={() => setQuantity(Math.min(product.stock_level, quantity + 1))}
                      className="px-6 py-3 hover:bg-blue-50 transition-colors font-bold text-xl text-blue-600"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col md:flex-row gap-4">
                  <Button
                    data-testid="add-to-cart-button"
                    onClick={handleAddToCart}
                    size="lg"
                    className="flex-1 bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-4 rounded-2xl text-xl font-bold transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    <ShoppingCart className="w-6 h-6 mr-2" />
                    {t('addToCart')}
                  </Button>
                  <Button
                    data-testid="buy-now-button"
                    onClick={handleBuyNow}
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-2xl text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                  >
                    {t('buyNow') || 'Купити зараз'} →
                  </Button>
                </div>

                {/* Wishlist & Compare */}
                <div className="flex gap-4">
                  <button
                    onClick={handleToggleFavorite}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 ${
                      isFavorite(product.id)
                        ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg'
                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-red-600'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
                    {isFavorite(product.id) ? 'В обраному' : 'В обране'}
                  </button>
                  <button
                    onClick={handleToggleComparison}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 ${
                      isInComparison(product.id)
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-blue-600'
                    }`}
                  >
                    <GitCompare className="w-5 h-5" />
                    {isInComparison(product.id) ? 'Порівнюється' : 'Порівняти'}
                  </button>
                </div>
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t-2 border-gray-200">
              <div className="text-center space-y-3 p-4 rounded-2xl hover:bg-white hover:shadow-lg transition-all duration-300">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl flex items-center justify-center">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm font-bold text-gray-700">Безкоштовна доставка</p>
              </div>
              <div className="text-center space-y-3 p-4 rounded-2xl hover:bg-white hover:shadow-lg transition-all duration-300">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm font-bold text-gray-700">Безпечна оплата</p>
              </div>
              <div className="text-center space-y-3 p-4 rounded-2xl hover:bg-white hover:shadow-lg transition-all duration-300">
                <div className="w-16 h-16 mx-auto bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center">
                  <Truck className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm font-bold text-gray-700">Швидка доставка</p>
              </div>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="mt-16 bg-gradient-to-br from-white to-blue-50 border-2 border-blue-200 rounded-3xl p-10 shadow-2xl animate-fadeIn">
          <h2 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-8">Опис товару</h2>
          <div data-testid="product-description" className="prose prose-lg max-w-none text-gray-700">
            {product.description.split('\n').map((paragraph, idx) => (
              <p key={idx} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Reviews Section */}
        <ReviewsSection productId={product.id} />

        {/* AI Recommendations */}
        <AIRecommendations product={product} />
      </div>
    </div>
  );
};

export default ProductDetail;