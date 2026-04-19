/**
 * Search Results Page
 * BLOCK S2.0
 */
import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Filter, ArrowLeft } from "lucide-react";
import ProductCard from "../components/ProductCard";
import { Button } from "../components/ui/button";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [data, setData] = useState({ products: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!query) {
      setData({ products: [], total: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`${API_URL}/api/v2/search?q=${encodeURIComponent(query)}&page=${page}`)
      .then(r => r.json())
      .then(result => {
        setData({
          products: result.products || result.items || [],
          total: result.total || 0
        });
        setLoading(false);
      })
      .catch(() => {
        setData({ products: [], total: 0 });
        setLoading(false);
      });
  }, [query, page]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div data-testid="search-results-page" className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link to="/catalog" className="inline-flex items-center text-gray-600 hover:text-blue-600 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад до каталогу
          </Link>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Search className="w-8 h-8 text-blue-600" />
            Результати пошуку
          </h1>
          {query && (
            <p className="text-gray-600">
              Знайдено <span className="font-semibold text-blue-600">{data.total}</span> товарів за запитом "<span className="font-medium">{query}</span>"
            </p>
          )}
        </div>

        {data.products.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl shadow-sm">
            <div className="bg-gray-100 rounded-full p-8 mb-6">
              <Search className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Нічого не знайдено</h2>
            <p className="text-gray-600 mb-8 max-w-md">
              На жаль, за запитом "{query}" нічого не знайдено. Спробуйте змінити запит або перегляньте наш каталог.
            </p>
            <Link to="/catalog">
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600">
                Перейти до каталогу
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {data.products.map((product) => (
                <ProductCard key={product.id || product._id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {data.total > 12 && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: Math.ceil(data.total / 12) }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setPage(i + 1)}
                    className={`w-10 h-10 rounded-xl font-bold transition-all ${
                      page === i + 1
                        ? 'bg-blue-600 text-white shadow-lg'
                        : 'bg-white border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
