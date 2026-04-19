/**
 * BLOCK V2-20: Recently Viewed Products
 * Shows products user has viewed from localStorage
 */
import React, { useEffect, useState } from "react";
import { Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "../ProductCard";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function RecentlyViewed() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
    
    if (!ids.length) {
      setLoading(false);
      return;
    }

    // Fetch products by IDs
    fetch(`${API_URL}/api/v2/products/by-ids`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: ids.slice(0, 8) })
    })
      .then(r => r.json())
      .then(data => {
        setItems(data.products || data || []);
        setLoading(false);
      })
      .catch(() => {
        // Fallback - just show from catalog
        fetch(`${API_URL}/api/v2/catalog?limit=4`)
          .then(r => r.json())
          .then(d => {
            setItems(d.products || d.items || []);
            setLoading(false);
          })
          .catch(() => setLoading(false));
      });
  }, []);

  if (loading || !items.length) return null;

  return (
    <div data-testid="recently-viewed" className="my-12 sm:my-16">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
          <Clock className="w-6 h-6 text-gray-500" />
          Ви переглядали
        </h2>
        <Link 
          to="/catalog"
          className="text-blue-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all"
        >
          Весь каталог <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {items.map(product => (
          <ProductCard key={product.id || product._id} product={product} />
        ))}
      </div>
    </div>
  );
}

// Helper function to add product to recently viewed
export function addToRecentlyViewed(productId) {
  if (!productId) return;
  
  let viewed = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
  viewed = viewed.filter(id => id !== productId);
  viewed.unshift(productId);
  viewed = viewed.slice(0, 12);
  localStorage.setItem("recentlyViewed", JSON.stringify(viewed));
}
