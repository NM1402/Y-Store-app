/**
 * BLOCK V2-21: Quick View Modal
 * Modal for quick product preview without page navigation
 */
import React, { useEffect, useState } from "react";
import { X, ShoppingCart, Heart, Scale, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { useCart } from "../../contexts/CartContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { toggleCompare, isInCompare } from "../../utils/compare";

export default function QuickViewModal({ product, onClose }) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [inCompare, setInCompare] = useState(false);
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  useEffect(() => {
    // Lock scroll
    document.body.style.overflow = 'hidden';
    
    // ESC to close
    function handleEsc(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleEsc);
    
    // Check if in compare
    setInCompare(isInCompare(product?.id));
    
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener("keydown", handleEsc);
    };
  }, [onClose, product?.id]);

  if (!product) return null;

  const images = product.images || [];
  const isInFavorite = isFavorite?.(product.id);

  const handleAddToCart = () => {
    addToCart?.(product, quantity);
    onClose();
  };

  const handleToggleCompare = () => {
    toggleCompare(product.id);
    setInCompare(!inCompare);
  };

  const nextImage = () => setSelectedImage((prev) => (prev + 1) % images.length);
  const prevImage = () => setSelectedImage((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div 
      data-testid="quick-view-modal"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-[900px] max-h-[90vh] overflow-hidden shadow-2xl animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white transition shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Left - Images */}
          <div className="md:w-1/2 p-6 bg-gray-50">
            {/* Main Image */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-white mb-4">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No image
                </div>
              )}
              
              {/* Nav Arrows */}
              {images.length > 1 && (
                <>
                  <button 
                    onClick={prevImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={nextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition ${
                      i === selectedImage ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right - Info */}
          <div className="md:w-1/2 p-6 flex flex-col">
            {/* Brand */}
            {product.brand && (
              <span className="text-sm text-gray-500 font-medium mb-1">{product.brand}</span>
            )}
            
            {/* Name */}
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              {product.name}
            </h2>

            {/* Price */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl sm:text-3xl font-bold text-blue-600">
                {product.price?.toLocaleString()} грн
              </span>
              {product.old_price && (
                <span className="text-lg text-gray-400 line-through">
                  {product.old_price?.toLocaleString()} грн
                </span>
              )}
              {product.old_price && (
                <span className="bg-red-100 text-red-600 text-sm font-bold px-2 py-1 rounded-lg">
                  -{Math.round((1 - product.price / product.old_price) * 100)}%
                </span>
              )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2 mb-4">
              {product.stock > 0 ? (
                <>
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-green-600 font-medium">В наявності</span>
                </>
              ) : (
                <span className="text-red-600 font-medium">Немає в наявності</span>
              )}
            </div>

            {/* Short Description */}
            {product.short_description && (
              <p className="text-gray-600 mb-6 line-clamp-3">
                {product.short_description}
              </p>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-gray-700">Кількість:</span>
              <div className="flex items-center border rounded-xl overflow-hidden">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition"
                >
                  -
                </button>
                <span className="w-12 text-center font-semibold">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-auto">
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-5 h-5" />
                В кошик
              </button>
              
              <button
                onClick={() => toggleFavorite?.(product)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition ${
                  isInFavorite 
                    ? 'bg-red-50 border-red-300 text-red-500' 
                    : 'border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500'
                }`}
              >
                <Heart className={`w-5 h-5 ${isInFavorite ? 'fill-current' : ''}`} />
              </button>
              
              <button
                onClick={handleToggleCompare}
                className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition ${
                  inCompare 
                    ? 'bg-blue-50 border-blue-300 text-blue-500' 
                    : 'border-gray-200 text-gray-400 hover:border-blue-300 hover:text-blue-500'
                }`}
              >
                <Scale className="w-5 h-5" />
              </button>
            </div>

            {/* Product Link */}
            <a
              href={`/product/${product.slug || product.id}`}
              className="block mt-4 text-center text-blue-600 font-semibold hover:underline"
            >
              Перейти на сторінку товару →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
