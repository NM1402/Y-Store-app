import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { generateProductRecommendations } from '../services/aiService';

const AIRecommendations = ({ product }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (product) {
      fetchRecommendations();
    }
  }, [product]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      
      // First, fetch available products
      const productsResponse = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/products?limit=20`
      );
      const availableProducts = await productsResponse.json();
      
      // Filter out current product
      const otherProducts = availableProducts.filter(p => p.id !== product.id);
      
      if (otherProducts.length === 0) {
        setRecommendations([]);
        setLoading(false);
        return;
      }

      // Get AI recommendations using OpenAI (TEST VERSION)
      const aiResponse = await generateProductRecommendations({
        productName: product.title,
        category: product.category_id,
        price: product.price,
        availableProducts: otherProducts.slice(0, 10) // Send max 10 products for context
      });

      if (aiResponse.success && aiResponse.recommendations.length > 0) {
        // Map AI recommendations to full product data
        const recommendedProducts = aiResponse.recommendations
          .map(rec => {
            const prod = otherProducts.find(p => p.id === rec.productId);
            if (prod) {
              return {
                ...prod,
                aiReason: rec.reason
              };
            }
            return null;
          })
          .filter(p => p !== null)
          .slice(0, 4);

        setRecommendations(recommendedProducts);
      } else {
        // Fallback: show random products from same category
        const sameCategoryProducts = otherProducts
          .filter(p => p.category_id === product.category_id)
          .slice(0, 4);
        setRecommendations(sameCategoryProducts);
      }
    } catch (error) {
      console.error('Error fetching AI recommendations:', error);
      // Fallback: show any products
      try {
        const response = await fetch(
          `${process.env.REACT_APP_BACKEND_URL}/api/products?limit=4`
        );
        const data = await response.json();
        setRecommendations(data.filter(p => p.id !== product?.id));
      } catch (e) {
        console.error('Fallback failed:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="my-12">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-6 h-6 text-purple-600" />
          <h2 className="text-2xl font-bold">AI Рекомендації</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-gray-100 rounded-lg h-64 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="my-12">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-6 h-6 text-purple-600 animate-pulse" />
        <h2 className="text-2xl font-bold">Вам може сподобатися</h2>
        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-semibold rounded-full">
          AI
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {recommendations.map((product) => (
          <div
            key={product.id}
            onClick={() => navigate(`/product/${product.id}`)}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer group"
          >
            {/* Product Image */}
            <div className="relative mb-4 bg-gray-100 rounded-lg overflow-hidden aspect-square">
              {product.images && product.images[0] ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-gray-400">No image</span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <h3 className="font-semibold text-sm mb-2 line-clamp-2 group-hover:text-blue-600">
              {product.name}
            </h3>

            {/* AI Reason */}
            {product.aiReason && (
              <p className="text-xs text-purple-600 mb-2 italic">
                ✨ {product.aiReason}
              </p>
            )}

            {/* Price */}
            <div className="flex items-center gap-2">
              {product.sale_price ? (
                <>
                  <span className="text-lg font-bold text-red-600">
                    {product.sale_price} ₴
                  </span>
                  <span className="text-sm text-gray-500 line-through">
                    {product.price} ₴
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold">
                  {product.price} ₴
                </span>
              )}
            </div>

            {/* Rating */}
            {product.rating > 0 && (
              <div className="flex items-center gap-1 mt-2">
                <span className="text-yellow-500">⭐</span>
                <span className="text-sm text-gray-600">
                  {product.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIRecommendations;
