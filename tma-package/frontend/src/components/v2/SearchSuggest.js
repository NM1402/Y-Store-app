import React from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

const SearchSuggest = ({ suggestions = [], onClose, language = 'uk' }) => {
  if (suggestions.length === 0) return null;

  const T = {
    uk: { viewAll: 'Показати всі результати' },
    ru: { viewAll: 'Показать все результаты' }
  };

  const txt = T[language] || T.uk;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden z-50">
      <div className="max-h-96 overflow-y-auto">
        {suggestions.map((product) => {
          const img = product.images?.[0] || 'https://via.placeholder.com/100';
          const discount = product.compare_price && product.compare_price > product.price
            ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100)
            : null;

          return (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              onClick={onClose}
              className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
            >
              <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                <img src={img} alt={product.title} className="w-full h-full object-cover" />
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{product.title}</p>
                <p className="text-sm text-gray-500">{product.category_name}</p>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">{product.price?.toLocaleString()} ₴</span>
                  {discount && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">
                      -{discount}%
                    </span>
                  )}
                </div>
                {product.compare_price && product.compare_price > product.price && (
                  <span className="text-sm text-gray-400 line-through">
                    {product.compare_price?.toLocaleString()} ₴
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-gray-100 p-3">
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors"
        >
          <Search className="w-4 h-4" />
          {txt.viewAll}
        </button>
      </div>
    </div>
  );
};

export default SearchSuggest;
