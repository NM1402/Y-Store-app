/**
 * Compare Page - Product comparison
 * BLOCK V2-19
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCompare, clearCompare, toggleCompare } from "../utils/compare";
import { Scale, X, ShoppingCart, Heart, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Compare() {
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = getCompare();
    setItems(ids);
    
    if (ids.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch full product details
    fetch(`${API_URL}/api/v2/compare/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_ids: ids })
    })
      .then(r => r.json())
      .then(data => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleRemove = (id) => {
    toggleCompare(id);
    setItems(prev => prev.filter(x => x !== id));
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  // Get all specification keys
  const allSpecs = new Set();
  products.forEach(p => {
    (p.specifications || []).forEach(spec => {
      if (spec.name || spec.key) {
        allSpecs.add(spec.name || spec.key);
      }
    });
  });

  const getSpecValue = (product, specName) => {
    const spec = (product.specifications || []).find(
      s => s.name === specName || s.key === specName
    );
    return spec?.value || '—';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (items.length < 2) {
    return (
      <div data-testid="compare-empty" className="min-h-screen py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 rounded-full p-8 mb-6">
              <Scale className="w-16 h-16 text-blue-500" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Додайте мінімум 2 товари</h2>
            <p className="text-gray-600 mb-8 max-w-md">
              Для порівняння потрібно обрати хоча б два товари. Перейдіть в каталог і додайте товари для порівняння.
            </p>
            <Link to="/catalog">
              <Button size="lg" className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600">
                <ArrowLeft className="w-5 h-5" />
                Перейти до каталогу
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="compare-page" className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Scale className="w-8 h-8 text-blue-600" />
              Порівняння товарів
            </h1>
            <p className="text-gray-600">{products.length} товарів</p>
          </div>
          <Button variant="outline" onClick={clearCompare} className="text-red-600">
            Очистити все
          </Button>
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Product Headers */}
              <thead>
                <tr className="border-b">
                  <th className="p-4 text-left w-48 bg-gray-50">Товар</th>
                  {products.map(product => (
                    <th key={product.id} className="p-4 text-center min-w-[250px]">
                      <div className="relative">
                        <button
                          onClick={() => handleRemove(product.id)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full hover:bg-red-600 transition"
                        >
                          <X className="w-4 h-4 mx-auto" />
                        </button>
                        <Link to={`/product/${product.slug || product.id}`}>
                          {product.images?.[0] && (
                            <img 
                              src={product.images[0]} 
                              alt={product.name}
                              className="w-32 h-32 object-contain mx-auto mb-4"
                            />
                          )}
                          <h3 className="font-semibold text-gray-900 hover:text-blue-600 transition">
                            {product.name}
                          </h3>
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {/* Price Row */}
                <tr className="border-b bg-blue-50">
                  <td className="p-4 font-semibold">Ціна</td>
                  {products.map(product => (
                    <td key={product.id} className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {product.price?.toLocaleString()} грн
                      </div>
                      {product.old_price && (
                        <div className="text-sm text-gray-500 line-through">
                          {product.old_price?.toLocaleString()} грн
                        </div>
                      )}
                    </td>
                  ))}
                </tr>

                {/* Stock Row */}
                <tr className="border-b">
                  <td className="p-4 font-semibold">Наявність</td>
                  {products.map(product => (
                    <td key={product.id} className="p-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        product.stock > 0 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {product.stock > 0 ? 'В наявності' : 'Немає'}
                      </span>
                    </td>
                  ))}
                </tr>

                {/* Brand Row */}
                <tr className="border-b">
                  <td className="p-4 font-semibold">Бренд</td>
                  {products.map(product => (
                    <td key={product.id} className="p-4 text-center">
                      {product.brand || '—'}
                    </td>
                  ))}
                </tr>

                {/* Dynamic Specs */}
                {[...allSpecs].map(specName => (
                  <tr key={specName} className="border-b">
                    <td className="p-4 font-semibold">{specName}</td>
                    {products.map(product => (
                      <td key={product.id} className="p-4 text-center">
                        {getSpecValue(product, specName)}
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Actions Row */}
                <tr className="bg-gray-50">
                  <td className="p-4 font-semibold">Дії</td>
                  {products.map(product => (
                    <td key={product.id} className="p-4 text-center">
                      <div className="flex flex-col gap-2">
                        <Button className="w-full bg-blue-600 hover:bg-blue-700">
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          В кошик
                        </Button>
                        <Button variant="outline" className="w-full">
                          <Heart className="w-4 h-4 mr-2" />
                          В обране
                        </Button>
                      </div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
