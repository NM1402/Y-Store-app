import React, { useState, useEffect } from 'react';
import { Star, Quote, Calendar, Package } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Featured Reviews Component for Homepage
 * Displays selected reviews chosen by admin
 */
const FeaturedReviews = () => {
  const { t } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedReviews();
  }, []);

  const fetchFeaturedReviews = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/reviews/featured`
      );
      setReviews(response.data || []);
    } catch (error) {
      console.error('Failed to fetch featured reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(t('language') === 'ru' ? 'ru-RU' : 'uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </section>
    );
  }

  if (reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-gradient-to-b from-white via-blue-50 to-purple-50">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <Quote className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            {t('language') === 'ru' ? 'Отзывы наших покупателей' : 'Відгуки наших покупців'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t('language') === 'ru' 
              ? 'Реальные мнения реальных людей о наших товарах'
              : 'Реальні думки реальних людей про наші товари'
            }
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100 relative overflow-hidden group"
            >
              {/* Decorative gradient */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-600"></div>
              
              {/* Quote icon */}
              <div className="absolute top-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Quote className="w-16 h-16 text-blue-600" />
              </div>

              {/* Rating */}
              <div className="mb-4 relative z-10">
                {renderStars(review.rating)}
              </div>

              {/* Review text */}
              <p className="text-gray-700 text-sm mb-6 line-clamp-4 leading-relaxed relative z-10">
                "{review.comment}"
              </p>

              {/* Product info */}
              <div className="mb-4 pb-4 border-b border-gray-100 relative z-10">
                <div className="flex items-start gap-2">
                  <Package className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      {t('language') === 'ru' ? 'Товар:' : 'Товар:'}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 line-clamp-2">
                      {review.product_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* User info and date */}
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900">
                      {review.user_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('language') === 'ru' ? 'Покупатель' : 'Покупець'}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(review.created_at)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verified badge */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {t('language') === 'ru' ? 'Проверено' : 'Перевірено'}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Show all reviews link */}
        <div className="text-center mt-12">
          <a
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            {t('language') === 'ru' ? 'Посмотреть все товары' : 'Переглянути всі товари'}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default FeaturedReviews;
