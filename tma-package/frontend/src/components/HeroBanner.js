import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useParallax } from '../hooks/useParallax';

const HeroBanner = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { offset, ref } = useParallax(0.3);

  useEffect(() => {
    fetchSlides();
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    
    return () => clearInterval(timer);
  }, [slides.length]);

  const fetchSlides = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/api/slides`);
      
      if (response.data.length === 0) {
        // Fallback to default slides if none configured
        setSlides([
          {
            id: 1,
            title: 'НОУТБУКИ ДЛЯ ТРИВАЛОЇ РОБОТИ',
            subtitle: 'ІЗ ЗАРЯДЖАННЯМ USB',
            background_gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            type: 'banner'
          }
        ]);
      } else {
        setSlides(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch slides:', error);
      // Fallback slides
      setSlides([
        {
          id: 1,
          title: 'НОУТБУКИ ДЛЯ ТРИВАЛОЇ РОБОТИ',
          subtitle: 'ІЗ ЗАРЯДЖАННЯМ USB',
          background_gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          type: 'banner'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleSlideClick = (slide) => {
    if (slide.button_link) {
      if (slide.button_link.startsWith('http')) {
        window.open(slide.button_link, '_blank');
      } else {
        navigate(slide.button_link);
      }
    } else if (slide.type === 'product' && slide.product_id) {
      navigate(`/product/${slide.product_id}`);
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

    if (timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0) {
      return null;
    }

    return (
      <div className="flex items-center gap-2 md:gap-4 bg-black/30 backdrop-blur-md px-3 md:px-6 py-2 md:py-3 rounded-full text-xs md:text-base">
        <Clock className="w-4 h-4 md:w-5 md:h-5" />
        <div className="flex gap-1 md:gap-3">
          {timeLeft.days > 0 && (
            <div className="text-center">
              <div className="text-lg md:text-2xl font-bold">{timeLeft.days}</div>
              <div className="text-[10px] md:text-xs opacity-80">днів</div>
            </div>
          )}
          <div className="text-center">
            <div className="text-lg md:text-2xl font-bold">{String(timeLeft.hours).padStart(2, '0')}</div>
            <div className="text-[10px] md:text-xs opacity-80">годин</div>
          </div>
          <div className="text-center">
            <div className="text-lg md:text-2xl font-bold">{String(timeLeft.minutes).padStart(2, '0')}</div>
            <div className="text-[10px] md:text-xs opacity-80">хвилин</div>
          </div>
          <div className="text-center hidden sm:block">
            <div className="text-lg md:text-2xl font-bold">{String(timeLeft.seconds).padStart(2, '0')}</div>
            <div className="text-[10px] md:text-xs opacity-80">секунд</div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="relative w-full h-[400px] rounded-2xl overflow-hidden bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse"></div>
    );
  }

  if (slides.length === 0) {
    return null;
  }

  return (
    <div ref={ref} className="relative w-full h-[300px] md:h-[400px] lg:h-[500px] rounded-xl md:rounded-3xl overflow-hidden shadow-2xl">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-all duration-700 cursor-pointer ${
            index === currentSlide ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
          }`}
          onClick={() => handleSlideClick(slide)}
        >
          {/* Background - для баннера используем изображение как фон с parallax */}
          {slide.type === 'banner' && slide.image_url ? (
            <div 
              className="absolute inset-0 bg-cover bg-center transform transition-transform duration-700 hover:scale-105"
              style={{ 
                backgroundImage: `linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.2)), url(${slide.image_url})`,
                transform: index === currentSlide ? `translateY(${offset * 0.5}px)` : 'translateY(0)',
              }}
            />
          ) : (
            <div 
              className="absolute inset-0 transform transition-transform duration-700 hover:scale-105"
              style={{ 
                background: slide.background_gradient,
                transform: index === currentSlide ? `translateY(${offset * 0.5}px)` : 'translateY(0)',
              }}
            />
          )}

          <div className="flex items-center justify-center h-full text-white relative z-10">
            {/* Промо текст в углу */}
            {slide.promo_text && (
              <div className="absolute top-4 right-4 md:top-8 md:right-8 bg-gradient-to-r from-red-600 to-pink-600 text-white px-4 py-2 md:px-8 md:py-4 rounded-2xl font-extrabold text-sm md:text-xl lg:text-2xl shadow-2xl animate-pulse transform rotate-3 hover:rotate-0 transition-transform">
                {slide.promo_text}
              </div>
            )}

            {/* Основной контент */}
            <div className="text-center px-4 md:px-6 max-w-4xl">
              {/* Для товара показываем его изображение */}
              {slide.type === 'product' && slide.product_id && (
                <div className="mb-4 md:mb-6">
                  {/* Здесь можно добавить изображение товара если нужно */}
                </div>
              )}
              
              <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-2 md:mb-3 drop-shadow-2xl px-2">
                {slide.title}
              </h2>
              
              {slide.subtitle && (
                <p className="text-lg md:text-2xl lg:text-3xl mb-3 md:mb-4 opacity-90 drop-shadow-lg px-2">{slide.subtitle}</p>
              )}
              
              {slide.description && (
                <p className="text-sm md:text-lg lg:text-xl opacity-80 mb-4 md:mb-6 drop-shadow-lg px-2">{slide.description}</p>
              )}

              {/* Обратный отсчет */}
              {slide.countdown_enabled && slide.countdown_end_date && (
                <div className="flex justify-center mb-4 md:mb-6">
                  <Countdown endDate={slide.countdown_end_date} />
                </div>
              )}

              {/* Кнопка действия */}
              {slide.button_text && (
                <button 
                  className="bg-gradient-to-r from-white to-gray-50 text-gray-900 px-8 md:px-12 py-3 md:py-5 rounded-full font-extrabold text-base md:text-xl lg:text-2xl hover:from-yellow-300 hover:to-orange-400 transition-all duration-300 shadow-2xl hover:scale-110 transform hover:rotate-1 active:scale-95"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSlideClick(slide);
                  }}
                >
                  {slide.button_text} →
                </button>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-300 z-10 hover:scale-110 active:scale-95 border-2 border-white/30"
          >
            <ChevronLeft className="w-7 h-7 text-white" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full flex items-center justify-center transition-all duration-300 z-10 hover:scale-110 active:scale-95 border-2 border-white/30"
          >
            <ChevronRight className="w-7 h-7 text-white" />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-3 rounded-full transition-all duration-300 hover:scale-110 ${
                index === currentSlide
                  ? 'bg-white w-10 shadow-lg'
                  : 'bg-white/50 w-3 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroBanner;
