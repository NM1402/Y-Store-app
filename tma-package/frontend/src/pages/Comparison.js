import React from 'react';
import { Link } from 'react-router-dom';
import { useComparison } from '../contexts/ComparisonContext';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Scale, ShoppingBag, X, ShoppingCart, Star } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

const Comparison = () => {
  const { comparisonItems, removeFromComparison, clearComparison } = useComparison();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleAddToCart = (productId) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    addToCart(productId);
  };

  if (comparisonItems.length === 0) {
    return (
      <div className="min-h-screen py-16">
        <div className="container-main">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-gray-100 rounded-full p-8 mb-6">
              <Scale className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4">{t('comparisonEmpty')}</h2>
            <p className="text-gray-600 mb-8 max-w-md">
              {t('comparisonEmptyDesc')}
            </p>
            <Link to="/products">
              <Button size="lg" className="gap-2">
                <ShoppingBag className="w-5 h-5" />
                {t('goToShopping')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Define comparison attributes
  const attributes = [
    { key: 'images', label: t('image'), type: 'image' },
    { key: 'title', label: t('name'), type: 'text' },
    { key: 'price', label: t('price'), type: 'price' },
    { key: 'compare_price', label: t('oldPrice'), type: 'price' },
    { key: 'rating', label: t('rating'), type: 'rating' },
    { key: 'reviews_count', label: t('reviewsCount'), type: 'number' },
    { key: 'stock_level', label: t('inStock'), type: 'stock' },
    { key: 'short_description', label: t('description'), type: 'text' },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="container-main">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">{t('comparisonTitle')}</h1>
            <p className="text-gray-600">{comparisonItems.length} {t('productsForComparison')}</p>
          </div>
          {comparisonItems.length > 0 && (
            <Button
              variant="outline"
              onClick={clearComparison}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              {t('clearAll')}
            </Button>
          )}
        </div>

        {/* Comparison Table - Desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="bg-gray-50 p-4 text-left font-semibold sticky left-0 z-10 min-w-[200px]">
                    {t('characteristics')}
                  </th>
                  {comparisonItems.map((product) => (
                    <th key={product.id} className="bg-gray-50 p-4 min-w-[250px] relative">
                      <button
                        onClick={() => removeFromComparison(product.id)}
                        className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                        title={t('removeFromComparison')}
                      >
                        <X className="w-4 h-4 text-gray-600" />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {attributes.map((attr, index) => (
                  <tr key={attr.key} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-4 font-medium text-gray-700 sticky left-0 z-10 bg-inherit">
                      {attr.label}
                    </td>
                    {comparisonItems.map((product) => (
                      <td key={product.id} className="p-4">
                        {attr.type === 'image' && (
                          <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                <span className="text-4xl">📦</span>
                              </div>
                            )}
                          </div>
                        )}
                        {attr.type === 'text' && (
                          <span className={attr.key === 'title' ? 'font-semibold' : ''}>
                            {product[attr.key] || '—'}
                          </span>
                        )}
                        {attr.type === 'price' && product[attr.key] && (
                          <span className="text-lg font-bold text-[#121212]">
                            ${product[attr.key].toFixed(2)}
                          </span>
                        )}
                        {attr.type === 'price' && !product[attr.key] && <span>—</span>}
                        {attr.type === 'rating' && product[attr.key] > 0 && (
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < Math.floor(product[attr.key])
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                            <span className="ml-1 text-sm">({product[attr.key].toFixed(1)})</span>
                          </div>
                        )}
                        {attr.type === 'rating' && (!product[attr.key] || product[attr.key] === 0) && (
                          <span className="text-gray-400">{t('noRatings')}</span>
                        )}
                        {attr.type === 'number' && (
                          <span>{product[attr.key] || 0}</span>
                        )}
                        {attr.type === 'stock' && (
                          <span className={product[attr.key] > 0 ? 'text-green-600' : 'text-red-600'}>
                            {product[attr.key] > 0 ? `${product[attr.key]} ${t('pieces')}` : t('notAvailable')}
                          </span>
                        )}
                        {attr.type === 'boolean' && (
                          <span className={product[attr.key] ? 'text-green-600' : 'text-gray-400'}>
                            {product[attr.key] ? `✓ ${t('yes')}` : '—'}
                          </span>
                        )}
                        {attr.type === 'months' && product[attr.key] && (
                          <span>{product[attr.key]} {t('months')}</span>
                        )}
                        {attr.type === 'months' && !product[attr.key] && <span>—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
                {/* Action Row */}
                <tr className="bg-white">
                  <td className="p-4 font-medium text-gray-700 sticky left-0 z-10">
                    {t('actions')}
                  </td>
                  {comparisonItems.map((product) => (
                    <td key={product.id} className="p-4">
                      <div className="flex flex-col gap-2">
                        <Link to={`/product/${product.id}`}>
                          <Button variant="outline" className="w-full" size="sm">
                            {t('details')}
                          </Button>
                        </Link>
                        <Button
                          onClick={() => handleAddToCart(product.id)}
                          className="w-full"
                          size="sm"
                          disabled={product.stock_level === 0}
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          {product.stock_level === 0 ? t('notAvailable') : t('addToCart')}
                        </Button>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Comparison Cards - Mobile */}
        <div className="lg:hidden space-y-6">
          {comparisonItems.map((product) => (
            <div key={product.id} className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg">{product.title}</h3>
                <button
                  onClick={() => removeFromComparison(product.id)}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              
              {/* Image */}
              <div className="w-full h-48 rounded-lg overflow-hidden bg-gray-100 mb-4">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt={product.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <span className="text-4xl">📦</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('price')}:</span>
                  <span className="font-bold text-lg">${product.price.toFixed(2)}</span>
                </div>
                {product.rating > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{t('rating')}:</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{product.rating.toFixed(1)} ({product.reviews_count})</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('inStock')}:</span>
                  <span className={product.stock_level > 0 ? 'text-green-600' : 'text-red-600'}>
                    {product.stock_level > 0 ? `${product.stock_level} ${t('pieces')}` : t('notAvailable')}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Link to={`/product/${product.id}`} className="flex-1">
                  <Button variant="outline" className="w-full">{t('details')}</Button>
                </Link>
                <Button
                  onClick={() => handleAddToCart(product.id)}
                  className="flex-1"
                  disabled={product.stock_level === 0}
                >
                  {t('addToCart')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Comparison;
