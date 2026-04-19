import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Star, Heart, GitCompare, ShoppingCart, Share2, ChevronRight, ChevronDown, ChevronUp,
  Truck, CreditCard, Shield, Clock, CheckCircle, Package, Info, Eye, AlertTriangle,
  Phone, MessageCircle, Zap, Award, RefreshCw, Percent
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useComparison } from '../contexts/ComparisonContext';
import { useLanguage } from '../contexts/LanguageContext';
import { productsAPI, reviewsAPI } from '../utils/api';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import AIRecommendations from '../components/AIRecommendations';
import ProductCardCompact from '../components/ProductCardCompact';
import ShareModal from '../components/ShareModal';
import { trackProductView, trackAddToCart } from '../lib/track';
import MobileBuyBar from '../components/product/MobileBuyBar';
import { addToRecentlyViewed } from '../components/home/RecentlyViewed';
// V2-24: SEO
import { SEOMeta, ProductSchema, BreadcrumbSchema } from '../components/seo';

// ============ GALLERY V3 ============
const GalleryV3 = ({ images = [], videos = [], productTitle, discount }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 50, y: 50 });
  
  const media = [
    ...images.map(img => ({ type: 'image', url: img })),
    ...videos.map(vid => ({ type: 'video', url: vid }))
  ];

  if (media.length === 0) {
    media.push({ type: 'image', url: 'https://via.placeholder.com/600' });
  }

  const currentMedia = media[selectedIndex];

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMousePosition({ x, y });
  };

  return (
    <div className="flex gap-4">
      {/* Thumbnails */}
      {media.length > 1 && (
        <div className="flex flex-col gap-2 w-20 flex-shrink-0">
          {media.map((item, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`aspect-square border-2 rounded-lg overflow-hidden transition-all ${
                selectedIndex === index
                  ? 'border-green-500 ring-2 ring-green-200'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
            >
              <img
                src={item.url}
                alt={`${productTitle} ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Image */}
      <div className="flex-1 relative">
        <div 
          className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden cursor-zoom-in"
          style={{ paddingBottom: '100%' }}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setIsZoomed(true)}
          onMouseLeave={() => setIsZoomed(false)}
        >
          {/* Discount Badge */}
          {discount > 0 && (
            <div className="absolute top-4 left-4 z-10 bg-red-500 text-white px-3 py-1.5 rounded-md text-sm font-bold">
              -{discount}%
            </div>
          )}

          {/* Main Image */}
          <div className="absolute inset-0 p-4 flex items-center justify-center">
            <img
              src={currentMedia.url}
              alt={productTitle}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{
                transform: isZoomed ? 'scale(1.8)' : 'scale(1)',
                transformOrigin: `${mousePosition.x}% ${mousePosition.y}%`,
              }}
            />
          </div>
        </div>

        {/* Trust Badges Below Gallery */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Гарантія 12 міс</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <Truck className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Безкоштовна доставка</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg">
            <RefreshCw className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Повернення 14 днів</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ STICKY BUY PANEL ============
const StickyBuyPanel = ({ product, quantity, onQuantityChange, onAddToCart, onBuyNow, isVisible }) => {
  if (!isVisible) return null;

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-50 transform transition-transform duration-300"
      data-testid="sticky-buy-panel"
    >
      <div className="container-main px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Product Info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <img
              src={product.images?.[0] || 'https://via.placeholder.com/60'}
              alt={product.title}
              className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{product.title}</h4>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-green-600">{product.price?.toLocaleString()} ₴</span>
                {product.compare_price && (
                  <span className="text-sm text-gray-400 line-through">{product.compare_price?.toLocaleString()} ₴</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Quantity */}
            <div className="flex items-center border border-gray-300 rounded-lg">
              <button
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                className="px-3 py-2 hover:bg-gray-100 transition-colors"
              >
                -
              </button>
              <span className="px-3 py-2 font-semibold min-w-[40px] text-center">{quantity}</span>
              <button
                onClick={() => onQuantityChange(Math.min(product.stock_level, quantity + 1))}
                className="px-3 py-2 hover:bg-gray-100 transition-colors"
              >
                +
              </button>
            </div>

            <Button
              onClick={onAddToCart}
              variant="outline"
              className="hidden md:flex"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              В кошик
            </Button>

            <Button
              onClick={onBuyNow}
              className="bg-green-600 hover:bg-green-700 text-white px-6"
            >
              Купити
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ SPECIFICATIONS TABLE ============
const SpecificationsTable = ({ product }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Build specifications from product data
  const specs = [];
  
  // Add from specifications array if exists
  if (product.specifications && Array.isArray(product.specifications)) {
    product.specifications.forEach(group => {
      if (group.fields) {
        group.fields.forEach(field => {
          specs.push({ key: field.key, value: field.value });
        });
      }
    });
  }
  
  // Add basic info
  specs.push({ key: 'Артикул', value: product.id?.substring(0, 8).toUpperCase() });
  specs.push({ key: 'Категорія', value: product.category_name || product.category_id });
  specs.push({ key: 'Наявність', value: product.stock_level > 0 ? `${product.stock_level} шт.` : 'Немає в наявності' });
  
  const visibleSpecs = isExpanded ? specs : specs.slice(0, 6);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <h3 className="text-lg font-bold px-6 py-4 bg-gray-50 border-b border-gray-200">
        Характеристики
      </h3>
      <div className="divide-y divide-gray-100">
        {visibleSpecs.map((spec, index) => (
          <div 
            key={index}
            className="grid grid-cols-2 gap-4 px-6 py-3 hover:bg-gray-50 transition-colors"
          >
            <span className="text-gray-600">{spec.key}</span>
            <span className="text-gray-900 font-medium">{spec.value}</span>
          </div>
        ))}
      </div>
      {specs.length > 6 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-3 text-green-600 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Згорнути
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Показати всі ({specs.length})
            </>
          )}
        </button>
      )}
    </div>
  );
};

// ============ REVIEWS SECTION V3 ============
const ReviewsSectionV3 = ({ productId, reviews = [] }) => {
  const [showAll, setShowAll] = useState(false);
  const visibleReviews = showAll ? reviews : reviews.slice(0, 3);

  if (reviews.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <h3 className="text-lg font-bold mb-4">Відгуки</h3>
        <p className="text-gray-500 mb-4">Поки що немає відгуків. Будьте першим!</p>
        <Button variant="outline">Написати відгук</Button>
      </div>
    );
  }

  // Calculate rating distribution
  const ratings = [5, 4, 3, 2, 1];
  const ratingCounts = ratings.map(r => reviews.filter(rev => rev.rating === r).length);
  const avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <h3 className="text-lg font-bold px-6 py-4 bg-gray-50 border-b border-gray-200">
        Відгуки ({reviews.length})
      </h3>
      
      {/* Rating Summary */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-gray-900">{avgRating}</div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${i < Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <div className="text-sm text-gray-500 mt-1">{reviews.length} відгуків</div>
          </div>
          <div className="flex-1 space-y-1">
            {ratings.map((rating, idx) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-sm text-gray-600 w-8">{rating}</span>
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${(ratingCounts[idx] / reviews.length) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-8">{ratingCounts[idx]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="divide-y divide-gray-100">
        {visibleReviews.map((review) => (
          <div key={review.id} className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="font-semibold text-green-600">
                  {review.user_name?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{review.user_name || 'Покупець'}</p>
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(review.created_at).toLocaleDateString('uk-UA')}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-gray-700">{review.comment}</p>
          </div>
        ))}
      </div>

      {reviews.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-4 text-green-600 font-medium hover:bg-gray-50 transition-colors border-t border-gray-200"
        >
          {showAll ? 'Згорнути' : `Показати всі відгуки (${reviews.length})`}
        </button>
      )}
    </div>
  );
};

// ============ SIMILAR PRODUCTS ============
const SimilarProducts = ({ product }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (product?.category_id) {
      fetchSimilar();
    }
  }, [product]);

  const fetchSimilar = async () => {
    try {
      const response = await productsAPI.getAll({
        category_id: product.category_id,
        limit: 8
      });
      const filtered = response.data.filter(p => p.id !== product.id).slice(0, 6);
      setProducts(filtered);
    } catch (error) {
      console.error('Failed to fetch similar products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || products.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-xl font-bold mb-6">Схожі товари</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {products.map((prod) => (
          <Link key={prod.id} to={`/product/${prod.id}`}>
            <ProductCardCompact product={prod} />
          </Link>
        ))}
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============
const ProductPageV3 = () => {
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
  const [showStickyPanel, setShowStickyPanel] = useState(false);
  
  const buyButtonRef = useRef(null);
  const viewers = useState(Math.floor(Math.random() * 15) + 5)[0];

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [id]);

  useEffect(() => {
    if (product) {
      trackProductView(id, product.title, product.price);
      // V2-20: Add to recently viewed
      addToRecentlyViewed(product.id || id);
    }
  }, [product, id]);

  // Sticky panel visibility
  useEffect(() => {
    const handleScroll = () => {
      if (buyButtonRef.current) {
        const rect = buyButtonRef.current.getBoundingClientRect();
        setShowStickyPanel(rect.bottom < 0);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getById(id);
      setProduct(response.data);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      toast.error('Не вдалося завантажити товар');
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await reviewsAPI.getByProduct(id);
      setReviews(response.data || []);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const handleAddToCart = async () => {
    trackAddToCart(product.id, quantity, product.price);
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    await addToCart(product.id, quantity);
    // Toast is handled by CartContext
  };

  const handleBuyNow = async () => {
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
      toast.success('Видалено з обраного');
    } else {
      addToFavorites(product);
      toast.success('Додано до обраного');
    }
  };

  const toggleComparison = () => {
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
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container-main px-4">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              <div className="lg:col-span-3 h-96 bg-gray-200 rounded-xl"></div>
              <div className="lg:col-span-2 space-y-4">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-12 bg-gray-200 rounded w-1/2"></div>
                <div className="h-32 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container-main px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Товар не знайдено</h2>
          <Button onClick={() => navigate('/products')}>Перейти до каталогу</Button>
        </div>
      </div>
    );
  }

  const images = product.images?.length > 0 ? product.images : ['https://via.placeholder.com/600'];
  const videos = product.videos || [];
  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  // V2-24: SEO breadcrumbs data
  const breadcrumbItems = [
    { name: 'Головна', url: '/' },
    { name: 'Каталог', url: '/catalog' },
    ...(product.category_name ? [{ 
      name: product.category_name, 
      url: `/catalog?category=${product.category_id}` 
    }] : []),
    { name: product.title }
  ];

  return (
    <div className="min-h-screen bg-gray-50" data-testid="product-page-v3">
      {/* V2-24: SEO Meta and Schema */}
      <SEOMeta 
        title={product.title}
        description={product.short_description || product.description?.substring(0, 160)}
        image={images[0]}
        url={`/product/${product.slug || product.id}`}
        type="product"
        product={{
          price: product.price,
          stock: product.stock_level,
          brand: product.brand
        }}
      />
      <ProductSchema product={{
        name: product.title,
        description: product.description,
        images: images,
        sku: product.sku || product.id,
        brand: product.brand,
        price: product.price,
        stock: product.stock_level,
        rating: product.rating,
        reviews_count: product.reviews_count,
        slug: product.slug || product.id
      }} />
      <BreadcrumbSchema items={breadcrumbItems} />

      <div className="container-main px-4 py-6">
        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6" data-testid="breadcrumbs">
          <Link to="/" className="hover:text-green-600 transition-colors">Головна</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/products" className="hover:text-green-600 transition-colors">Каталог</Link>
          {product.category_name && (
            <>
              <ChevronRight className="w-4 h-4" />
              <Link to={`/catalog?category=${product.category_id}`} className="hover:text-green-600 transition-colors">
                {product.category_name}
              </Link>
            </>
          )}
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium truncate max-w-xs">{product.title}</span>
        </nav>

        {/* Main Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
          {/* Gallery - 3 columns */}
          <div className="lg:col-span-3">
            <GalleryV3 
              images={images}
              videos={videos}
              productTitle={product.title}
              discount={discount}
            />
          </div>

          {/* Product Info - 2 columns */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-4">
              {/* Title */}
              <h1 className="text-2xl font-bold text-gray-900 mb-3" data-testid="product-title">
                {product.title}
              </h1>

              {/* Rating & Code */}
              <div className="flex items-center gap-4 text-sm mb-4">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{product.rating || 0}</span>
                  <span className="text-gray-500">({product.reviews_count || reviews.length} відгуків)</span>
                </div>
                <span className="text-gray-400">|</span>
                <span className="text-gray-500">Код: {product.id?.substring(0, 8).toUpperCase()}</span>
              </div>

              {/* Price */}
              <div className="border-y border-gray-200 py-4 mb-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-bold text-gray-900" data-testid="product-price">
                    {product.price?.toLocaleString()} ₴
                  </span>
                  {product.compare_price && (
                    <>
                      <span className="text-lg text-gray-400 line-through">
                        {product.compare_price?.toLocaleString()} ₴
                      </span>
                      <span className="px-2 py-0.5 bg-red-100 text-red-600 text-sm font-medium rounded">
                        -{discount}%
                      </span>
                    </>
                  )}
                </div>
                {product.compare_price && (
                  <div className="mt-1 text-green-600 text-sm font-medium">
                    Економія: {(product.compare_price - product.price).toLocaleString()} ₴
                  </div>
                )}
              </div>

              {/* Stock Status */}
              <div className="mb-4">
                {product.stock_level > 0 ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-700 font-medium">
                      Є в наявності ({product.stock_level} шт.)
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span className="text-red-700 font-medium">Немає в наявності</span>
                  </div>
                )}
              </div>

              {/* Low Stock Warning */}
              {product.stock_level > 0 && product.stock_level < 5 && (
                <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
                  <Zap className="w-4 h-4 text-orange-600" />
                  <span className="text-orange-700 text-sm font-medium">
                    Залишилось лише {product.stock_level} шт.! Купуйте зараз.
                  </span>
                </div>
              )}

              {/* Live Viewers */}
              <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <Eye className="w-4 h-4 text-blue-600" />
                <span className="text-blue-700 text-sm font-medium">
                  {viewers} людей зараз переглядають цей товар
                </span>
              </div>

              {/* Quantity */}
              {product.stock_level > 0 && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Кількість</label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="px-4 py-2 hover:bg-gray-100 transition-colors text-lg"
                          data-testid="decrease-quantity"
                        >
                          -
                        </button>
                        <span className="px-4 py-2 font-semibold min-w-[50px] text-center" data-testid="quantity-value">
                          {quantity}
                        </span>
                        <button
                          onClick={() => setQuantity(Math.min(product.stock_level, quantity + 1))}
                          className="px-4 py-2 hover:bg-gray-100 transition-colors text-lg"
                          data-testid="increase-quantity"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-gray-500 text-sm">
                        {(product.price * quantity).toLocaleString()} ₴
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-3 mb-4" ref={buyButtonRef}>
                    <Button
                      onClick={handleBuyNow}
                      className="w-full h-12 text-lg font-semibold bg-green-600 hover:bg-green-700"
                      data-testid="buy-now-button"
                    >
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Купити зараз
                    </Button>
                    <Button
                      onClick={handleAddToCart}
                      variant="outline"
                      className="w-full h-12 text-lg font-semibold"
                      data-testid="add-to-cart-button"
                    >
                      Додати до кошика
                    </Button>
                  </div>
                </>
              )}

              {/* Secondary Actions */}
              <div className="flex items-center justify-center gap-2 py-3 border-t border-gray-200">
                <button
                  onClick={toggleFavorite}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isFavorite(product.id)
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  data-testid="favorite-button"
                >
                  <Heart className={`w-5 h-5 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
                  <span className="text-sm font-medium hidden md:inline">
                    {isFavorite(product.id) ? 'В обраному' : 'В обране'}
                  </span>
                </button>
                <button
                  onClick={toggleComparison}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    isInComparison(product.id)
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  data-testid="compare-button"
                >
                  <GitCompare className="w-5 h-5" />
                  <span className="text-sm font-medium hidden md:inline">Порівняти</span>
                </button>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  data-testid="share-button"
                >
                  <Share2 className="w-5 h-5" />
                  <span className="text-sm font-medium hidden md:inline">Поділитися</span>
                </button>
              </div>

              {/* Delivery Info */}
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                <div className="flex items-start gap-3">
                  <Truck className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Доставка Новою Поштою</p>
                    <p className="text-sm text-gray-500">1-3 робочих дні</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Оплата</p>
                    <p className="text-sm text-gray-500">При отриманні або онлайн</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Гарантія</p>
                    <p className="text-sm text-gray-500">Офіційна гарантія 12 місяців</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        <div className="bg-white rounded-xl border border-gray-200 mb-8">
          {/* Tab Headers */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {[
              { id: 'description', label: 'Опис' },
              { id: 'specifications', label: 'Характеристики' },
              { id: 'reviews', label: `Відгуки (${reviews.length})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'text-green-600 border-b-2 border-green-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'description' && (
              <div className="prose prose-lg max-w-none" data-testid="description-content">
                {product.description_html ? (
                  <div 
                    dangerouslySetInnerHTML={{ __html: product.description_html }}
                    className="text-gray-700 leading-relaxed"
                  />
                ) : (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {product.description || 'Опис товару відсутній.'}
                  </p>
                )}
              </div>
            )}

            {activeTab === 'specifications' && (
              <SpecificationsTable product={product} />
            )}

            {activeTab === 'reviews' && (
              <ReviewsSectionV3 productId={product.id} reviews={reviews} />
            )}
          </div>
        </div>

        {/* Important Info Block */}
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <Info className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-lg text-gray-900 mb-3">Важлива інформація</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Обмін та повернення протягом 14 днів</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Перевіряйте товар при отриманні у відділенні</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full mt-2 flex-shrink-0"></span>
                  <span>Зберігайте чек для гарантійного обслуговування</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        <SimilarProducts product={product} />

        {/* AI Recommendations */}
        <div className="mt-8">
          <AIRecommendations product={product} />
        </div>
      </div>

      {/* Sticky Buy Panel */}
      {product.stock_level > 0 && (
        <StickyBuyPanel
          product={product}
          quantity={quantity}
          onQuantityChange={setQuantity}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          isVisible={showStickyPanel}
        />
      )}

      {/* Share Modal */}
      {product && (
        <ShareModal 
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          product={product}
        />
      )}

      {/* V2-23: Mobile Buy Bar */}
      {product && product.stock_level > 0 && (
        <MobileBuyBar 
          product={product} 
          onAdd={handleAddToCart}
        />
      )}
    </div>
  );
};

export default ProductPageV3;
