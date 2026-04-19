import React from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../contexts/FavoritesContext';
import { useLanguage } from '../contexts/LanguageContext';
import ProductCard from '../components/ProductCard';
import { Heart, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';

const Favorites = () => {
  const { favorites, clearFavorites } = useFavorites();
  const { t } = useLanguage();

  if (favorites.length === 0) {
    return (
      <div className="min-h-screen py-16">
        <div className="container-main">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-gray-100 rounded-full p-8 mb-6">
              <Heart className="w-16 h-16 text-gray-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Список избранного пуст</h2>
            <p className="text-gray-600 mb-8 max-w-md">
              Вы еще не добавили ни одного товара в избранное. Начните просматривать товары и добавляйте понравившиеся!
            </p>
            <Link to="/products">
              <Button size="lg" className="gap-2">
                <ShoppingBag className="w-5 h-5" />
                Перейти к покупкам
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container-main">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Избранное</h1>
            <p className="text-gray-600">{favorites.length} товаров</p>
          </div>
          {favorites.length > 0 && (
            <Button
              variant="outline"
              onClick={clearFavorites}
              className="text-red-600 border-red-600 hover:bg-red-50"
            >
              Очистить все
            </Button>
          )}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {favorites.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Favorites;
