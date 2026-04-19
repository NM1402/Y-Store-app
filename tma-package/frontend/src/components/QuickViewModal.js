import React, { useState } from 'react';
import { X, ShoppingCart, Heart, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Button } from './ui/button';
import { useCart } from '../contexts/CartContext';
import { useFavorites } from '../contexts/FavoritesContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const QuickViewModal = ({ product, isOpen, onClose }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const navigate = useNavigate();

  if (!isOpen || !product) return null;

  const images = product.images && product.images.length > 0 ? product.images : [null];

  const handleAddToCart = () => {
    addToCart(product.id, quantity);
    // Toast is handled by CartContext
  };

  const handleToggleFavorite = () => {
    if (isFavorite(product.id)) {
      removeFavorite(product.id);
      toast.success('Видалено з обраного');
    } else {
      addFavorite(product);
      toast.success('Додано в обране');
    }
  };

  const handleViewFull = () => {
    onClose();
    navigate(`/product/${product.id}`);
  };

  const nextImage = () => {
    setSelectedImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setSelectedImage((prev) => (prev - 1 + images.length) % images.length);
  };

  const discount = product.compare_price
    ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={onClose}>
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white rounded-full p-3 shadow-xl hover:shadow-2xl transition-all hover:scale-110 active:scale-95"
        >
          <X className="w-6 h-6 text-gray-700" />
        </button>

        <div className="grid md:grid-cols-2 gap-8 p-8">
          {/* Images Section */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl overflow-hidden group">
              {images[selectedImage] ? (
                <img
                  src={images[selectedImage]}
                  alt={product.title}
                  className="w-full h-full object-contain p-8 group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-6xl">📦</span>
                </div>
              )}

              {/* Discount Badge */}
              {discount > 0 && (
                <div className="absolute top-4 right-4 bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-2 rounded-full font-bold text-lg shadow-xl animate-pulse">
                  -{discount}%
                </div>
              )}

              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white hover:scale-110 transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`flex-shrink-0 w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? 'border-blue-600 ring-4 ring-blue-200 scale-105' : 'border-transparent hover:border-gray-300'
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

          {/* Product Info */}
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-4 leading-tight">
                {product.title || product.name}
              </h2>

              {/* Rating */}
              {product.rating > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < Math.floor(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-gray-600">({product.reviews_count || 0} відгуків)</span>
                </div>
              )}

              {/* Price */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-6 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    ${product.price.toFixed(2)}
                  </span>
                  {product.compare_price && (
                    <span className="text-xl text-gray-400 line-through">
                      ${product.compare_price.toFixed(2)}
                    </span>
                  )}
                </div>
                {product.compare_price && (
                  <div className="mt-2 text-green-600 font-bold">
                    💰 Економія ${(product.compare_price - product.price).toFixed(2)}
                  </div>
                )}
              </div>

              {/* Description */}
              {product.short_description && (
                <p className="text-gray-600 leading-relaxed">{product.short_description}</p>
              )}
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-green-600 font-bold">
                ✅ В наявності ({product.stock_level || 0} шт.)
              </span>
            </div>

            {/* Quantity Selector */}
            <div className="flex items-center gap-4">
              <span className="font-bold text-gray-700">Кількість:</span>
              <div className="flex items-center border-2 border-blue-600 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-4 py-2 hover:bg-blue-50 transition-colors font-bold text-blue-600"
                >
                  -
                </button>
                <span className="px-6 py-2 border-x-2 border-blue-600 font-bold min-w-[60px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock_level || 10, quantity + 1))}
                  className="px-4 py-2 hover:bg-blue-50 transition-colors font-bold text-blue-600"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={handleAddToCart}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-4 rounded-xl text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Додати в кошик
              </Button>

              <div className="flex gap-3">
                <Button
                  onClick={handleToggleFavorite}
                  variant="outline"
                  className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                    isFavorite(product.id)
                      ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white border-transparent'
                      : 'border-2 hover:border-red-600'
                  }`}
                >
                  <Heart className={`w-5 h-5 mr-2 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
                  {isFavorite(product.id) ? 'В обраному' : 'В обране'}
                </Button>
                <Button
                  onClick={handleViewFull}
                  variant="outline"
                  className="flex-1 border-2 hover:border-blue-600 py-3 rounded-xl font-semibold"
                >
                  Детальніше →
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
