import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Star, ThumbsUp, ThumbsDown, Flag } from 'lucide-react';
import { toast } from 'sonner';
import api from '../utils/api';

const ReviewsSection = ({ productId }) => {
  const { isAuthenticated, user } = useAuth();
  const { t } = useLanguage();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    try {
      const response = await api.get(`/products/${productId}/reviews`);
      setReviews(response.data);
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Войдите чтобы оставить отзыв');
      return;
    }

    setLoading(true);
    try {
      await api.post('/reviews', {
        product_id: productId,
        rating,
        comment
      });
      toast.success('Отзыв добавлен!');
      setComment('');
      setRating(5);
      fetchReviews();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Ошибка добавления отзыва');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div data-testid="reviews-section" className="mt-16">
      <h2 className="text-3xl font-bold mb-8">{t('customerReviews')}</h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Reviews List */}
        <div className="lg:col-span-2 space-y-4">
          {reviews.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <p className="text-gray-500 text-lg">{t('noReviews')}</p>
            </div>
          ) : (
            reviews.map((review) => (
              <div
                key={review.id}
                data-testid={`review-${review.id}`}
                className="bg-[#F0F8FF] rounded-2xl p-6"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#0071E3] rounded-full flex items-center justify-center text-white font-semibold text-lg">
                      {review.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#121212]">{review.user_name}</h4>
                      <p className="text-sm text-gray-600">{formatDate(review.created_at)}</p>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <Flag className="w-4 h-4" />
                  </button>
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < review.rating
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>

                {/* Comment */}
                <p className="text-[#121212] leading-relaxed">{review.comment}</p>

                {/* Actions */}
                <div className="flex items-center gap-4 mt-4">
                  <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-green-600">
                    <ThumbsUp className="w-4 h-4" />
                    <span>0</span>
                  </button>
                  <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600">
                    <ThumbsDown className="w-4 h-4" />
                    <span>0</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Review Form */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 sticky top-24">
            <h3 className="text-xl font-bold mb-6">{t('writeReview')}</h3>

            {isAuthenticated ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium mb-3">Рейтинг</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-8 h-8 cursor-pointer ${
                            star <= rating
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300 hover:text-yellow-400'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ваш отзыв
                  </label>
                  <Textarea
                    data-testid="review-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                    rows={6}
                    placeholder={t('shareYourExperience')}
                    className="resize-none"
                  />
                </div>

                {/* Submit */}
                <Button
                  data-testid="submit-review"
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Отправка...' : 'Добавить отзыв'}
                </Button>
              </form>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">
                  Войдите чтобы оставить отзыв
                </p>
                <Button onClick={() => window.location.href = '/login'}>
                  Войти
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewsSection;