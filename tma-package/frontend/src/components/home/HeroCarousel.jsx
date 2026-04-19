/**
 * BLOCK V3-RETAIL: Hero Carousel
 * Premium auto-rotating banner carousel with i18n support
 */
import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";

const slidesData = {
  ua: [
    {
      id: 1,
      title: "Знижки до -30%",
      subtitle: "На техніку Apple",
      cta: "Переглянути",
      link: "/catalog?brand=Apple",
      image: "https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=1600&h=600&fit=crop&q=80",
      gradient: "from-blue-900/80 via-purple-900/60 to-transparent"
    },
    {
      id: 2,
      title: "Телевізори 4K",
      subtitle: "Від 9 999 грн",
      cta: "До каталогу",
      link: "/catalog?category=tv",
      image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1600&h=600&fit=crop&q=80",
      gradient: "from-slate-900/80 via-blue-900/60 to-transparent"
    },
    {
      id: 3,
      title: "Новинки Samsung",
      subtitle: "Galaxy S24 вже в наявності",
      cta: "Замовити",
      link: "/catalog?brand=Samsung",
      image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=1600&h=600&fit=crop&q=80",
      gradient: "from-indigo-900/80 via-pink-900/60 to-transparent"
    },
    {
      id: 4,
      title: "Ноутбуки для роботи",
      subtitle: "MacBook, Dell, Lenovo",
      cta: "Обрати",
      link: "/catalog?category=laptops",
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1600&h=600&fit=crop&q=80",
      gradient: "from-gray-900/80 via-slate-800/60 to-transparent"
    }
  ],
  ru: [
    {
      id: 1,
      title: "Скидки до -30%",
      subtitle: "На технику Apple",
      cta: "Посмотреть",
      link: "/catalog?brand=Apple",
      image: "https://images.unsplash.com/photo-1491933382434-500287f9b54b?w=1600&h=600&fit=crop&q=80",
      gradient: "from-blue-900/80 via-purple-900/60 to-transparent"
    },
    {
      id: 2,
      title: "Телевизоры 4K",
      subtitle: "От 9 999 грн",
      cta: "В каталог",
      link: "/catalog?category=tv",
      image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=1600&h=600&fit=crop&q=80",
      gradient: "from-slate-900/80 via-blue-900/60 to-transparent"
    },
    {
      id: 3,
      title: "Новинки Samsung",
      subtitle: "Galaxy S24 уже в наличии",
      cta: "Заказать",
      link: "/catalog?brand=Samsung",
      image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=1600&h=600&fit=crop&q=80",
      gradient: "from-indigo-900/80 via-pink-900/60 to-transparent"
    },
    {
      id: 4,
      title: "Ноутбуки для работы",
      subtitle: "MacBook, Dell, Lenovo",
      cta: "Выбрать",
      link: "/catalog?category=laptops",
      image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=1600&h=600&fit=crop&q=80",
      gradient: "from-gray-900/80 via-slate-800/60 to-transparent"
    }
  ]
};

export default function HeroCarousel() {
  const { language } = useLanguage();
  const [slides, setSlides] = useState(slidesData[language] || slidesData.ua);
  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState([true, false, false, false]);

  // Update slides when language changes
  useEffect(() => {
    setSlides(slidesData[language] || slidesData.ua);
  }, [language]);

  // Preload images
  useEffect(() => {
    slides.forEach((slide, i) => {
      if (i === 0) return;
      const img = new Image();
      img.src = slide.image;
      img.onload = () => {
        setImagesLoaded(prev => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      };
    });
  }, [slides]);

  const goTo = useCallback((i) => {
    if (i === index || isTransitioning) return;
    setIsTransitioning(true);
    setIndex(i);
    setTimeout(() => setIsTransitioning(false), 700);
  }, [index, isTransitioning]);

  const prev = useCallback(() => {
    goTo((index - 1 + slides.length) % slides.length);
  }, [index, goTo, slides.length]);

  const next = useCallback(() => {
    goTo((index + 1) % slides.length);
  }, [index, goTo, slides.length]);

  // Auto-play
  useEffect(() => {
    if (isHovered) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [isHovered, next]);

  const slide = slides[index];

  return (
    <div 
      data-testid="hero-carousel"
      className="relative h-[400px] sm:h-[500px] lg:h-[600px] rounded-2xl overflow-hidden shadow-2xl group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Images - All preloaded */}
      {slides.map((s, i) => (
        <img
          key={s.id}
          src={s.image}
          alt={s.title}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            i === index ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ zIndex: i === index ? 1 : 0 }}
          loading={i === 0 ? "eager" : "lazy"}
        />
      ))}
      
      {/* Gradient Overlay */}
      <div 
        className={`absolute inset-0 bg-gradient-to-r ${slide.gradient} transition-all duration-700`} 
        style={{ zIndex: 2 }} 
      />

      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }}>
        <div className="absolute top-10 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex items-center px-8 sm:px-12 lg:px-16" style={{ zIndex: 10 }}>
        <div className="max-w-2xl">
          {/* Badge */}
          <div 
            key={`badge-${index}`}
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full mb-4 animate-fadeInUp"
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">
              {language === 'ru' ? 'Специальное предложение' : 'Спеціальна пропозиція'}
            </span>
          </div>
          
          <h2 
            key={`title-${index}`}
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 drop-shadow-lg animate-fadeInUp"
            style={{ animationDelay: '100ms' }}
          >
            {slide.title}
          </h2>
          <p 
            key={`subtitle-${index}`}
            className="text-xl sm:text-2xl text-white/90 mb-8 animate-fadeInUp"
            style={{ animationDelay: '200ms' }}
          >
            {slide.subtitle}
          </p>
          <Link 
            to={slide.link}
            className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-blue-50 px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 animate-fadeInUp"
            style={{ animationDelay: '300ms' }}
          >
            {slide.cta}
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button 
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg z-20"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button 
        onClick={next}
        aria-label="Next slide"
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg z-20"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Dots Navigation */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === index 
                ? 'bg-white w-8' 
                : 'bg-white/50 w-2 hover:bg-white/70'
            }`}
          />
        ))}
      </div>

      {/* Progress Bar */}
      {!isHovered && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
          <div 
            key={`progress-${index}`}
            className="h-full bg-white/60"
            style={{ 
              animation: 'heroProgress 5s linear',
              width: '100%'
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes heroProgress {
          from { width: 0%; }
          to { width: 100%; }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
