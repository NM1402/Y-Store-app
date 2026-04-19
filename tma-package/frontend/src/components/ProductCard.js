import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Star, Heart, Video, FileText, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { useCart } from '../contexts/CartContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import QuickViewModal from './QuickViewModal';

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showQuickView, setShowQuickView] = useState(false);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    addToCart(product.id);
  };

  const handleToggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isFavorite(product.id)) {
      removeFromFavorites(product.id);
      toast.success(t('removedFromFavorites'));
    } else {
      addToFavorites(product);
      toast.success(t('addedToFavorites'));
    }
  };

  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  // Get images array
  const images = product.images && product.images.length > 0 
    ? product.images 
    : ['https://via.placeholder.com/400'];

  // Check for new features
  const hasVideos = product.videos && product.videos.length > 0;
  const hasSpecs = product.specifications && product.specifications.length > 0;
  const hasMultipleImages = images.length > 1;

  const nextImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowQuickView(true);
  };

  return (
    <>
    <Link
      data-testid={`product-card-${product.id}`}
      to={`/product/${product.id}`}
      className="group card hover:shadow-xl flex flex-col h-full"
    >
      {/* Image with Slider */}
      <div className="relative image-zoom rounded-xl overflow-hidden bg-[#F7F7F7] aspect-ratio-1-1 mb-4 flex-shrink-0">
        <img
          src={images[currentImageIndex]}
          alt={product.title}
          className="w-full h-full object-cover transition-opacity duration-300"
        />
        
        {/* Image Navigation Arrows */}
        {hasMultipleImages && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4 text-gray-800" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4 text-gray-800" />
            </button>
            
            {/* Image Dots Indicator */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    idx === currentImageIndex 
                      ? 'bg-white w-4' 
                      : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
        
        {/* Badges Container - Top Left */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {discount > 0 && (
            <div data-testid="discount-badge" className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-semibold shadow-lg">
              -{discount}%
            </div>
          )}
          {hasVideos && (
            <div className="bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
              <Video className="w-3 h-3" />
              Відео
            </div>
          )}
          {hasSpecs && (
            <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-lg flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Характеристики
            </div>
          )}
        </div>

        {/* Action Buttons - Top Right */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            onClick={handleToggleFavorite}
            className={`p-2 rounded-full backdrop-blur-sm transition-all shadow-lg ${
              isFavorite(product.id)
                ? 'bg-red-500 text-white'
                : 'bg-white/80 text-gray-600 hover:bg-white'
            }`}
            title={isFavorite(product.id) ? 'Удалить из избранного' : 'Добавить в избранное'}
          >
            <Heart
              className={`w-5 h-5 ${isFavorite(product.id) ? 'fill-current' : ''}`}
            />
          </button>
          <button
            onClick={handleQuickView}
            className="p-2 rounded-full backdrop-blur-sm transition-all shadow-lg bg-white/80 text-gray-600 hover:bg-white opacity-0 group-hover:opacity-100"
            title="Швидкий перегляд"
          >
            <Eye className="w-5 h-5" />
          </button>
        </div>
        
        {product.stock_level === 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white font-semibold">Немає в наявності</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1">
        {/* Category */}
        {product.category_name && (
          <div className="mb-2">
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
              {product.category_name}
            </span>
          </div>
        )}

        {/* Title - Fixed height */}
        <h3 data-testid="product-title" className="font-semibold text-lg text-[#121212] line-clamp-2 group-hover:text-[#0071E3] mb-2 min-h-[3.5rem]">
          {product.title}
        </h3>

        {/* Description - Fixed height */}
        <div className="mb-3 min-h-[2.5rem]">
          {product.short_description && (
            <p className="text-sm text-gray-600 line-clamp-2">
              {product.short_description}
            </p>
          )}
        </div>

        {/* Rating */}
        <div className="mb-3 min-h-[1.5rem]">
          {product.rating > 0 && (
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(product.rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="text-sm text-gray-600 ml-1">({product.reviews_count})</span>
            </div>
          )}
        </div>

        {/* Spacer to push price and button to bottom */}
        <div className="flex-1"></div>

        {/* Price - Always at the same position */}
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span data-testid="product-price" className="text-2xl font-bold text-[#121212]">
              ${product.price.toFixed(2)}
            </span>
            {product.compare_price && (
              <span className="text-lg text-gray-400 line-through">
                ${product.compare_price.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Add to Cart Button - Always at bottom */}
        <Button
          data-testid={`add-to-cart-${product.id}`}
          onClick={handleAddToCart}
          className="w-full mt-auto"
          disabled={product.stock_level === 0}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          {product.stock_level === 0 ? t('outOfStock') : t('addToCart')}
        </Button>
      </div>
    </Link>
    
    {/* Quick View Modal */}
    <QuickViewModal 
      product={product}
      isOpen={showQuickView}
      onClose={() => setShowQuickView(false)}
    />
  </>
  );
};

export default ProductCard;