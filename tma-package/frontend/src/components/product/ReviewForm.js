import React, { useState, useEffect } from 'react';
import { Star, ShoppingBag, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { reviewsAPI } from '../../utils/api';
import { toast } from 'sonner';
import { useLanguage } from '../../contexts/LanguageContext';
import axios from 'axios';

const ReviewForm = ({ productId, onReviewAdded, isAuthenticated, onLoginRequired }) => {
  const { t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && productId) {
      checkCanReview();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, productId]);

  const checkCanReview = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/products/${productId}/can-review`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCanReview(response.data);
    } catch (error) {
      console.error('Failed to check review eligibility:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      onLoginRequired();
      return;
    }

    if (!comment.trim()) {
      toast.error(t('language') === 'ru' ? 'Пожалуйста, напишите отзыв' : 'Будь ласка, напишіть відгук');
      return;
    }

    try {
      setIsSubmitting(true);
      await reviewsAPI.create({
        product_id: productId,
        rating,
        comment: comment.trim()
      });
      
      toast.success(t('language') === 'ru' ? 'Отзыв добавлен!' : 'Відгук додано!');
      setComment('');
      setRating(5);
      onReviewAdded();
      await checkCanReview(); // Refresh eligibility
    } catch (error) {
      console.error('Failed to submit review:', error);
      const errorMsg = error.response?.data?.detail || 
                      (t('language') === 'ru' ? 'Ошибка при добавлении отзыва' : 'Помилка при додаванні відгуку');
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && isAuthenticated) {
    return (
      <div className="bg-gray-50 rounded-2xl p-6 mb-6">
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-6 mb-6">
      <h3 className="text-xl font-bold text-gray-900 mb-4">
        {t('language') === 'ru' ? 'Оставить отзыв' : 'Залишити відгук'}
      </h3>
      
      {!isAuthenticated ? (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-900">
            {t('language') === 'ru' 
              ? 'Для добавления отзыва необходимо войти в аккаунт'
              : 'Для додавання відгуку необхідно увійти в акаунт'
            }
          </p>
        </div>
      ) : canReview && !canReview.has_purchased ? (
        <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
          <ShoppingBag className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-900 mb-1">
              {t('language') === 'ru' 
                ? 'Отзывы могут оставлять только покупатели'
                : 'Відгуки можуть залишати тільки покупці'
              }
            </p>
            <p className="text-xs text-orange-700">
              {t('language') === 'ru' 
                ? 'Купите этот товар, чтобы оставить отзыв о нем'
                : 'Купіть цей товар, щоб залишити відгук про нього'
              }
            </p>
          </div>
        </div>
      ) : canReview && canReview.already_reviewed ? (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
          <Star className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-900">
            {t('language') === 'ru' 
              ? 'Вы уже оставили отзыв на этот товар'
              : 'Ви вже залишили відгук на цей товар'
            }
          </p>
        </div>
      ) : null}

      {isAuthenticated && canReview && canReview.can_review && (
        <form onSubmit={handleSubmit}>
        {/* Rating */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('language') === 'ru' ? 'Ваша оценка' : 'Ваша оцінка'}
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('language') === 'ru' ? 'Ваш отзыв' : 'Ваш відгук'}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={t('shareYourOpinion')}
            disabled={!isAuthenticated}
          />
        </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting || !comment.trim()}
            className="w-full"
          >
            {isSubmitting
              ? (t('language') === 'ru' ? 'Отправка...' : 'Відправка...')
              : (t('language') === 'ru' ? 'Отправить отзыв' : 'Надіслати відгук')
            }
          </Button>
        </form>
      )}
    </div>
  );
};

export default ReviewForm;
