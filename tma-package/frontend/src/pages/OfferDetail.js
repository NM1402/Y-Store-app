import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import axios from 'axios';
import ProductCardCompact from '../components/ProductCardCompact';

const OfferDetail = () => {
  const { offerId } = useParams();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOffer();
  }, [offerId]);

  const fetchOffer = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/actual-offers/${offerId}`
      );
      setOffer(response.data);
    } catch (error) {
      console.error('Failed to fetch offer:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Пропозицію не знайдено</h2>
          <Link to="/" className="text-blue-600 hover:underline">
            Повернутися на головну
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner для предложения */}
      <div 
        className="relative h-[300px] md:h-[400px] overflow-hidden"
        style={{ backgroundColor: offer.background_color }}
      >
        {offer.banner_image_url && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${offer.banner_image_url})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent" />
        
        <div className="container-main h-full flex flex-col justify-center relative z-10">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-white/80 text-sm mb-4">
            <Link to="/" className="hover:text-white">Головна</Link>
            <ChevronRight className="w-4 h-4" />
            <span>Актуальні пропозиції</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">{offer.title}</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-2xl">
            {offer.title}
          </h1>
          
          {offer.subtitle && (
            <p className="text-2xl md:text-3xl text-white/90 drop-shadow-lg">
              {offer.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container-main py-8 md:py-12">
        {/* Описание предложения */}
        {(offer.description || offer.description_html) && (
          <div className="bg-white rounded-2xl p-6 md:p-8 mb-8 shadow-sm">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Про акцію</h2>
            {offer.description_html ? (
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: offer.description_html }}
              />
            ) : (
              <p className="text-lg text-gray-700 leading-relaxed">
                {offer.description}
              </p>
            )}
          </div>
        )}

        {/* Товары в предложении */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">
              Товари в акції
              {offer.products && offer.products.length > 0 && (
                <span className="text-gray-500 text-xl ml-3">
                  ({offer.products.length})
                </span>
              )}
            </h2>
            <Link 
              to="/products"
              className="text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium"
            >
              Всі товари
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>

          {!offer.products || offer.products.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm">
              <p className="text-gray-500 mb-4">Товарів в цій акції поки немає</p>
              <Link to="/products" className="text-blue-600 hover:underline font-medium">
                Переглянути весь каталог
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {offer.products.map((product) => (
                <ProductCardCompact key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* Дополнительная информация */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 md:p-8">
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🚚</div>
              <h3 className="font-bold mb-2">Безкоштовна доставка</h3>
              <p className="text-sm text-gray-600">При замовленні від 20 000 грн</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">💳</div>
              <h3 className="font-bold mb-2">Оплата при отриманні</h3>
              <p className="text-sm text-gray-600">Готівкою або карткою</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">✅</div>
              <h3 className="font-bold mb-2">Гарантія якості</h3>
              <p className="text-sm text-gray-600">Тільки перевірені товари</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">⚡</div>
              <h3 className="font-bold mb-2">Швидка відправка</h3>
              <p className="text-sm text-gray-600">Замовлення 24/7, відправка за 1-2 дні</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferDetail;
