import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, ArrowRight } from 'lucide-react';
import axios from 'axios';

const PromotionDetail = () => {
  const { promotionId } = useParams();
  const navigate = useNavigate();
  const [promotion, setPromotion] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPromotion();
  }, [promotionId]);

  const fetchPromotion = async () => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/promotions/${promotionId}`
      );
      setPromotion(response.data);
    } catch (error) {
      console.error('Failed to fetch promotion:', error);
    } finally {
      setLoading(false);
    }
  };

  const Countdown = ({ endDate }) => {
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

    useEffect(() => {
      const calculateTimeLeft = () => {
        const difference = new Date(endDate) - new Date();
        
        if (difference > 0) {
          return {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60)
          };
        }
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      };

      const timer = setInterval(() => {
        setTimeLeft(calculateTimeLeft());
      }, 1000);

      return () => clearInterval(timer);
    }, [endDate]);

    const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

    return (
      <div className="bg-red-600 text-white px-6 py-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5" />
          <span className="font-semibold">{isExpired ? 'Акція закінчилась' : 'Акція закінчується через:'}</span>
        </div>
        {!isExpired && (
          <div className="flex gap-4 text-center">
            {timeLeft.days > 0 && (
              <div>
                <div className="text-4xl font-bold">{timeLeft.days}</div>
                <div className="text-sm opacity-90">днів</div>
              </div>
            )}
            <div>
              <div className="text-4xl font-bold">{String(timeLeft.hours).padStart(2, '0')}</div>
              <div className="text-sm opacity-90">годин</div>
            </div>
            <div>
              <div className="text-4xl font-bold">{String(timeLeft.minutes).padStart(2, '0')}</div>
              <div className="text-sm opacity-90">хвилин</div>
            </div>
            <div>
              <div className="text-4xl font-bold">{String(timeLeft.seconds).padStart(2, '0')}</div>
              <div className="text-sm opacity-90">секунд</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!promotion) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Акцію не знайдено</h2>
          <Link to="/promotions" className="text-blue-600 hover:underline">
            Повернутися до акцій
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div 
        className="relative h-[400px] md:h-[500px] overflow-hidden"
        style={{ backgroundColor: promotion.background_color }}
      >
        {promotion.image_url && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${promotion.image_url})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-transparent" />
        
        <div className="container-main h-full flex flex-col justify-center relative z-10">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-white/80 text-sm mb-4">
            <Link to="/" className="hover:text-white">Головна</Link>
            <ChevronRight className="w-4 h-4" />
            <Link to="/promotions" className="hover:text-white">Акції</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">{promotion.title}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-2xl">
                {promotion.title}
              </h1>
              
              {promotion.description && (
                <p className="text-xl md:text-2xl text-white/90 drop-shadow-lg max-w-2xl">
                  {promotion.description}
                </p>
              )}
            </div>

            {promotion.countdown_enabled && promotion.countdown_end_date && (
              <div>
                <Countdown endDate={promotion.countdown_end_date} />
              </div>
            )}
          </div>

          {promotion.discount_text && (
            <div className="mt-6">
              <div 
                className="inline-block px-8 py-4 rounded-2xl text-white font-bold text-3xl shadow-2xl"
                style={{ backgroundColor: promotion.badge_color }}
              >
                {promotion.discount_text}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container-main py-12">
        {/* Detailed Description */}
        {promotion.detailed_description && (
          <div className="bg-white rounded-2xl p-8 md:p-12 mb-8 shadow-sm">
            <h2 className="text-3xl font-bold mb-6">Детально про акцію</h2>
            <div className="prose prose-lg max-w-none">
              <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">
                {promotion.detailed_description}
              </p>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Готові скористатися акцією?</h2>
          <p className="text-xl mb-6 opacity-90">
            Переглядайте товари та додавайте до кошика прямо зараз!
          </p>
          <Link
            to={promotion.link_url || '/products'}
            className="inline-flex items-center gap-3 bg-white text-blue-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-all shadow-xl hover:scale-105"
          >
            Переглянути товари
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>

        {/* Benefits */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="text-5xl mb-4">🚚</div>
            <h3 className="font-bold text-lg mb-2">Безкоштовна доставка</h3>
            <p className="text-gray-600 text-sm">При замовленні від 20 000 грн</p>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="text-5xl mb-4">💳</div>
            <h3 className="font-bold text-lg mb-2">Оплата при отриманні</h3>
            <p className="text-gray-600 text-sm">Готівкою або карткою</p>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="font-bold text-lg mb-2">Гарантія якості</h3>
            <p className="text-gray-600 text-sm">Тільки перевірені товари</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PromotionDetail;
