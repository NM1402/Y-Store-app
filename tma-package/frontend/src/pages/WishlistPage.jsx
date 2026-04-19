/**
 * Wishlist Page - Backend synchronized
 * BLOCK V2-19
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "../components/ui/button";
import ProductCard from "../components/ProductCard";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function WishlistPage() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const guestToken = localStorage.getItem("guest_cabinet_token") || `guest_${Date.now()}`;
    localStorage.setItem("guest_cabinet_token", guestToken);

    fetch(`${API_URL}/api/v2/wishlist?guest_token=${guestToken}`)
      .then(r => r.json())
      .then(data => {
        setItems(data.items || []);
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleItem = async (productId) => {
    const guestToken = localStorage.getItem("guest_cabinet_token");
    
    try {
      const response = await fetch(`${API_URL}/api/v2/wishlist/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, guest_token: guestToken })
      });
      const data = await response.json();
      setItems(data.items || []);
      setProducts(prev => prev.filter(p => data.items.includes(p.id)));
    } catch (err) {
      console.error('Toggle wishlist error:', err);
    }
  };

  const clearWishlist = async () => {
    const guestToken = localStorage.getItem("guest_cabinet_token");
    
    try {
      await fetch(`${API_URL}/api/v2/wishlist/clear?guest_token=${guestToken}`, {
        method: 'DELETE'
      });
      setItems([]);
      setProducts([]);
    } catch (err) {
      console.error('Clear wishlist error:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div data-testid="wishlist-empty" className="min-h-screen py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-gradient-to-br from-red-100 to-pink-100 rounded-full p-8 mb-6">
              <Heart className="w-16 h-16 text-red-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Список обраного порожній</h2>
            <p className="text-gray-600 mb-8 max-w-md">
              Ви ще не додали жодного товару в обране. Почніть переглядати товари і додавайте сподобані!
            </p>
            <Link to="/catalog">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-red-500 to-pink-500">
                <ShoppingBag className="w-5 h-5" />
                Перейти до каталогу
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="wishlist-page" className="min-h-screen bg-gradient-to-br from-gray-50 via-red-50/30 to-pink-50/30 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Heart className="w-8 h-8 text-red-500 fill-red-500" />
              Обране
            </h1>
            <p className="text-gray-600">{items.length} товарів</p>
          </div>
          <Button
            variant="outline"
            onClick={clearWishlist}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Очистити все
          </Button>
        </div>

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          // Fallback - show item IDs if no product details
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {items.map(id => (
              <div key={id} className="border p-4 rounded-xl bg-white shadow-sm">
                <div className="text-gray-500">Product ID: {id}</div>
                <button 
                  onClick={() => toggleItem(id)}
                  className="mt-2 text-red-500 hover:text-red-700"
                >
                  Видалити
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
