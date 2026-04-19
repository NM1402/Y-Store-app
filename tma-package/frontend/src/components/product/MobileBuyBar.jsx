/**
 * BLOCK V2-23: Mobile Buy Bar
 * Sticky bottom bar on product page for mobile
 */
import React from "react";
import { ShoppingCart, Heart } from "lucide-react";
import { useCart } from "../../contexts/CartContext";
import { useFavorites } from "../../contexts/FavoritesContext";

export default function MobileBuyBar({ product, onAdd }) {
  const { addToCart } = useCart();
  const { toggleFavorite, isFavorite } = useFavorites();

  const isInFavorite = isFavorite?.(product?.id);

  const handleAddToCart = () => {
    if (onAdd) {
      onAdd();
    } else {
      addToCart?.(product, 1);
    }
  };

  if (!product) return null;

  return (
    <>
      {/* Spacer to prevent content from being hidden behind the bar */}
      <div className="h-20 md:hidden" />
      
      <div 
        data-testid="mobile-buy-bar"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-[900] shadow-lg"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Price */}
          <div className="flex-shrink-0">
            <div className="text-xs text-gray-500">Ціна</div>
            <div className="text-lg font-bold text-blue-600">
              {product.price?.toLocaleString()} грн
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {/* Favorite Button */}
            <button 
              onClick={() => toggleFavorite?.(product)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 transition ${
                isInFavorite 
                  ? 'bg-red-50 border-red-300 text-red-500' 
                  : 'border-gray-200 text-gray-400'
              }`}
            >
              <Heart className={`w-5 h-5 ${isInFavorite ? 'fill-current' : ''}`} />
            </button>

            {/* Add to Cart Button */}
            <button 
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="flex-1 max-w-[200px] btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>В кошик</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
