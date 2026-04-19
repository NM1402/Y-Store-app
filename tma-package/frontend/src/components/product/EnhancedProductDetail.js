import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Star, Heart, GitCompare, ShoppingCart, Share2, ChevronRight, ChevronUp,
  Truck, CreditCard, Shield, Clock, CheckCircle, Package, Info, Eye, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCart } from '../../contexts/CartContext';
import { useFavorites } from '../../contexts/FavoritesContext';
import { useComparison } from '../../contexts/ComparisonContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { productsAPI, reviewsAPI } from '../../utils/api';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import AIRecommendations from '../AIRecommendations';
import ProductCardCompact from '../ProductCardCompact';
import BuyTogether from './BuyTogether';
import ProductImageGallery from './ProductImageGallery';
import ReviewForm from './ReviewForm';
import ProductComments from './ProductComments';
import ShareModal from '../ShareModal';
import { trackProductView, trackAddToCart } from '../../lib/track';

const EnhancedProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { addToComparison, removeFromComparison, isInComparison } = useComparison();
  const { t } = useLanguage();
  
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Social proof - live viewers
  const [viewers] = useState(Math.floor(Math.random() * 15) + 5);

  useEffect(() => {
    fetchProduct();
    fetchReviews();
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
      toast.error('Не удалось загрузить товар');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await reviewsAPI.getByProduct(id);
      setReviews(response.data);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const handleAddToCart = async () => {
    // Track add to cart
    trackAddToCart(product.id, quantity, product.price);
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const result = await addToCart(product.id, quantity);
    if (result.success) {
      toast.success('Товар добавлен в корзину');
    }
  };

  const handleBuyNow = async () => {
    // Track add to cart + buy
    trackAddToCart(product.id, quantity, product.price);
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    const result = await addToCart(product.id, quantity);
    if (result.success) {
      setTimeout(() => navigate('/checkout'), 300);
    }
  };

  const toggleFavorite = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (isFavorite(product.id)) {
      removeFromFavorites(product.id);
    } else {
      addToFavorites(product);
    }
  };

  const toggleComparison = () => {
    if (isInComparison(product.id)) {
      removeFromComparison(product.id);
    } else {
      addToComparison(product);
    }
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-main py-12">
        <p className="text-center text-gray-600">Товар не найден</p>
      </div>
    );
  }

  const images = product.images && product.images.length > 0 
    ? product.images 
    : ['https://via.placeholder.com/600'];
  
  const videos = product.videos || [];

  const discount = product.compare_price 
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-main">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <Link to="/" className="hover:text-blue-600">{t('language') === 'ru' ? 'Главная' : 'Головна'}</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/products" className="hover:text-blue-600">{t('language') === 'ru' ? 'Товары' : 'Товари'}</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900">{product.title}</span>
        </nav>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-12">
          {/* Left: Gallery - Takes 3 columns */}
          <div className="lg:col-span-3">
            <ProductImageGallery 
              images={images}
              videos={videos}
              productTitle={product.title}
              discount={discount}
            />
          </div>

          {/* Right: Product Info - Takes 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-8 border border-gray-200">
              {/* Title & Code */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-3">{product.title}</h1>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Код:</span>
                    <span className="font-semibold text-gray-900">{product.id.substring(0, 8).toLowerCase()}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{product.rating || 5}</span>
                    <span className="text-gray-500">({product.reviews_count || 0} {t('language') === 'ru' ? 'отзывов' : 'відгуків'})</span>
                  </div>
                </div>
              </div>

              {/* Price Section */}
              <div className="border-y border-gray-200 py-6 mb-6">
                {product.compare_price ? (
                  // With discount
                  <div className="space-y-3">
                    <div className="flex items-baseline gap-4">
                      <div className="text-5xl font-bold text-black">
                        ${product.price.toFixed(2)}
                      </div>
                      <div className="text-2xl text-gray-400 line-through">
                        ${product.compare_price.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Without discount
                  <div className="text-5xl font-bold text-black">
                    ${product.price.toFixed(2)}
                  </div>
                )}
              </div>

              {/* Availability */}
              <div className="mb-6">
                {product.stock_level > 0 ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-600">
                      {t('language') === 'ru' ? 'Есть в наличии' : 'Є в наявності'} ({product.stock_level} {t('language') === 'ru' ? 'шт' : 'шт'})
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 rounded-lg">
                    <Info className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-600">
                      {t('language') === 'ru' ? 'Нет в наличии' : 'Немає в наявності'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Low Stock Warning */}
              {product.stock_level > 0 && product.stock_level < 5 && (
                <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
                  <AlertTriangle className="w-5 h-5" />
                  <span className="font-semibold">
                    {t('language') === 'ru' ? `Осталось всего ${product.stock_level} шт!` : `Залишилось лише ${product.stock_level} шт!`}
                  </span>
                </div>
              )}
              
              {/* Social Proof - Live Viewers */}
              <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-700">
                <Eye className="w-5 h-5" />
                <span className="font-medium">
                  {viewers} {t('language') === 'ru' ? 'человек смотрят этот товар' : 'людей переглядають цей товар'}
                </span>
              </div>

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Кількість
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-gray-300 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-2 hover:bg-gray-100 transition-colors"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 font-semibold min-w-[50px] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock_level, quantity + 1))}
                      className="px-4 py-2 hover:bg-gray-100 transition-colors"
                      disabled={quantity >= product.stock_level}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mb-6">
                <Button
                  onClick={handleBuyNow}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  disabled={product.stock_level === 0}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Купити зараз
                </Button>
                <Button
                  onClick={handleAddToCart}
                  variant="outline"
                  className="w-full h-14 text-lg font-semibold"
                  disabled={product.stock_level === 0}
                >
                  Додати до кошика
                </Button>
              </div>

              {/* Secondary Actions */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={toggleFavorite}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isFavorite(product.id)
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
                  <span className="text-sm font-medium">
                    {isFavorite(product.id) ? 'В избранном' : 'В избранное'}
                  </span>
                </button>
                <button
                  onClick={toggleComparison}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isInComparison(product.id)
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <GitCompare className="w-5 h-5" />
                  <span className="text-sm font-medium">Сравнить</span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Поділитися</span>
                </button>
              </div>

              {/* Delivery Time Info */}
              <div className="mt-8 pt-8 border-t border-gray-200">
                <div className="flex items-center gap-3 text-gray-700">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">
                    {t('language') === 'ru' ? 'Срок отправки: 1-3 рабочих дня' : 'Термін відправки: 1-3 робочі дні'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-2xl border border-gray-200 mb-12">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {['description', 'specifications', 'reviews'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-4 font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab === 'description' && 'Опис товару'}
                {tab === 'specifications' && 'Характеристики'}
                {tab === 'reviews' && `Відгуки (${reviews.length})`}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-8">
            {activeTab === 'description' && (
              <div className="prose prose-lg max-w-none">
                {product.description_html ? (
                  <div 
                    className="text-gray-700 leading-relaxed product-description"
                    dangerouslySetInnerHTML={{ __html: product.description_html }}
                    style={{
                      fontSize: '16px',
                      lineHeight: '1.8',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word'
                    }}
                  />
                ) : (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-base" style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word'
                  }}>
                    {product.description}
                  </p>
                )}
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="space-y-4">
                {/* Rozetka-style specifications */}
                <div className="bg-white">
                  <h3 className="text-xl font-bold mb-4 text-gray-900">Характеристики</h3>
                  
                  {/* Specifications Table - Rozetka exact style */}
                  <div className="bg-gray-50 rounded-lg overflow-hidden">
                    <div className="divide-y divide-gray-200">
                      {product.specifications && product.specifications.length > 0 ? (
                        product.specifications[0]?.group_name ? (
                          // Flatten all groups into single table (Rozetka style)
                          product.specifications.flatMap((group) => 
                            group.fields || []
                          ).map((field, index) => (
                            <div 
                              key={index}
                              className="grid grid-cols-2 gap-4 px-4 py-3 hover:bg-gray-100 transition-colors"
                            >
                              <div className="text-sm text-gray-600">{field.key}</div>
                              <div className="text-sm text-gray-900">{field.value}</div>
                            </div>
                          ))
                        ) : (
                          // Old format fallback
                          <div className="px-4 py-3 text-sm text-gray-600">
                            Характеристики у старому форматі. Оновіть товар в адмін-панелі.
                          </div>
                        )
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-600">
                          Характеристики не вказані
                        </div>
                      )}
                      
                      {/* Add basic product info */}
                      <div className="grid grid-cols-2 gap-4 px-4 py-3 hover:bg-gray-100 transition-colors">
                        <div className="text-sm text-gray-600">Категорія</div>
                        <div className="text-sm text-gray-900">{product.category_name || product.category_id}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 px-4 py-3 hover:bg-gray-100 transition-colors">
                        <div className="text-sm text-gray-600">Артикул</div>
                        <div className="text-sm text-gray-900">{product.id.substring(0, 8)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 px-4 py-3 hover:bg-gray-100 transition-colors">
                        <div className="text-sm text-gray-600">Наявність</div>
                        <div className="text-sm text-gray-900">
                          {product.stock_level > 0 ? `${product.stock_level} шт` : 'Немає в наявності'}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 px-4 py-3 hover:bg-gray-100 transition-colors">
                        <div className="text-sm text-gray-600">Рейтинг</div>
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {product.rating || 0} / 5
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 px-4 py-3 hover:bg-gray-100 transition-colors">
                        <div className="text-sm text-gray-600">Ціна</div>
                        <div className="text-sm text-gray-900 font-medium">
                          ₴{product.price ? product.price.toLocaleString() : 0}
                        </div>
                      </div>
                      {product.category_name && (
                        <div className="grid grid-cols-2 gap-4 px-4 py-3 hover:bg-gray-100 transition-colors">
                          <div className="text-sm text-gray-600">EAN</div>
                          <div className="text-sm text-gray-900">{product.id.split('-').pop()}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Show/Hide button - Rozetka style */}
                  {product.specifications && product.specifications.length > 0 && (
                    <div className="mt-3">
                      <button 
                        onClick={() => {/* toggle collapse */}}
                        className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
                      >
                        <ChevronUp className="w-4 h-4" />
                        Приховати ↑
                      </button>
                    </div>
                  )}
                </div>

                {/* Videos section if available */}
                {product.videos && product.videos.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-xl font-bold mb-4 text-gray-900">Відео огляди</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {product.videos.map((videoUrl, index) => (
                        <div key={index} className="aspect-video">
                          <a 
                            href={videoUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block w-full h-full bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors border border-gray-200"
                          >
                            <div className="text-center">
                              <svg className="w-16 h-16 mx-auto text-gray-400 mb-2" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                              </svg>
                              <p className="text-sm text-gray-600">Переглянути відео {index + 1}</p>
                            </div>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div>
                {/* Review Form */}
                <ReviewForm
                  productId={product.id}
                  isAuthenticated={isAuthenticated}
                  onReviewAdded={fetchReviews}
                  onLoginRequired={() => navigate('/login')}
                />

                {/* Reviews List */}
                {reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-200 pb-6">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="font-semibold text-gray-600">
                              {review.user_name?.[0]?.toUpperCase() || 'U'}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold">{review.user_name || 'Анонім'}</p>
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-700">{review.comment}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {new Date(review.created_at).toLocaleDateString('uk-UA')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    Поки що немає відгуків. Будьте першим!
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Comments Section - Below tabs */}
          {activeTab === 'description' && (
            <ProductComments 
              productId={product.id}
              isAuthenticated={isAuthenticated}
              onLoginRequired={() => navigate('/login')}
            />
          )}
        </div>

        {/* Important Information Block */}
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-yellow-600 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 mb-4">Важлива інформація</h3>
              <ul className="space-y-3 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span><strong>Обмін та повернення протягом 14 днів</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-2 h-2 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>
                    <strong>Перевірка товару:</strong> При отриманні товару у поштовому відділенні перевірте його на цілісність, наявність браку та деформацій, магазин не несе відповідальність за пошкоджений товар перевізником
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Buy Together Section */}
        <BuyTogether product={product} />

        {/* Similar Products from Same Category */}
        <SimilarProducts product={product} />

        {/* AI Recommendations */}
        <AIRecommendations product={product} />
      </div>

      {/* Share Modal */}
      {product && (
        <ShareModal 
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          product={product}
        />
      )}
    </div>
  );
};

// Similar Products Component
const SimilarProducts = ({ product }) => {
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    if (product?.category_id) {
      fetchSimilarProducts();
    }
  }, [product]);

  const fetchSimilarProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll({
        category_id: product.category_id,
        limit: 8
      });
      
      // Filter out current product
      const filtered = response.data.filter(p => p.id !== product.id).slice(0, 7);
      setSimilarProducts(filtered);
    } catch (error) {
      console.error('Failed to fetch similar products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || similarProducts.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl p-8 border border-gray-200 mb-8">
      <h2 className="text-2xl font-bold mb-6">
        {t('language') === 'ru' ? 'Похожие товары из этой категории' : 'Схожі товари з цієї категорії'}
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {similarProducts.map((prod) => (
          <div 
            key={prod.id}
            onClick={() => window.location.href = `/product/${prod.id}`}
            className="cursor-pointer"
          >
            <ProductCardCompact product={prod} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default EnhancedProductDetail;
