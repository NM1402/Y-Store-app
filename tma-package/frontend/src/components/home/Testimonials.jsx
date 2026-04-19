import React, { useState, useEffect } from "react";
import { Star, Quote, ChevronLeft, ChevronRight, MessageCircle, ThumbsUp } from "lucide-react";
import { useLanguage } from "../../contexts/LanguageContext";

const API_URL = process.env.REACT_APP_BACKEND_URL;

/**
 * Testimonials V3 - Customer reviews section with i18n
 * BLOCK V3-RETAIL: Homepage Component
 */

// Default testimonials (fallback)
const defaultTestimonials = {
  ua: [
    {
      name: "Олександр К.",
      rating: 5,
      text: "Замовляв iPhone, все прийшло вчасно і в ідеальному стані. Рекомендую!",
      date: "2 дні тому",
      product: "iPhone 15 Pro",
      avatar: "О",
      helpful: 24
    },
    {
      name: "Марина В.",
      rating: 5,
      text: "Відмінний магазин! Консультанти допомогли з вибором ноутбука. Дуже задоволена покупкою.",
      date: "Тиждень тому",
      product: "MacBook Air M3",
      avatar: "М",
      helpful: 18
    },
    {
      name: "Дмитро С.",
      rating: 5,
      text: "Швидка доставка, якісний товар, приємні ціни. Буду замовляти ще!",
      date: "2 тижні тому",
      product: "Samsung Galaxy S24",
      avatar: "Д",
      helpful: 31
    },
    {
      name: "Анна П.",
      rating: 5,
      text: "Чудовий сервіс! Замовила навушники, отримала наступного дня. Якість супер!",
      date: "3 дні тому",
      product: "AirPods Pro 2",
      avatar: "А",
      helpful: 15
    }
  ],
  ru: [
    {
      name: "Александр К.",
      rating: 5,
      text: "Заказывал iPhone, все пришло вовремя и в идеальном состоянии. Рекомендую!",
      date: "2 дня назад",
      product: "iPhone 15 Pro",
      avatar: "А",
      helpful: 24
    },
    {
      name: "Марина В.",
      rating: 5,
      text: "Отличный магазин! Консультанты помогли с выбором ноутбука. Очень довольна покупкой.",
      date: "Неделю назад",
      product: "MacBook Air M3",
      avatar: "М",
      helpful: 18
    },
    {
      name: "Дмитрий С.",
      rating: 5,
      text: "Быстрая доставка, качественный товар, приятные цены. Буду заказывать еще!",
      date: "2 недели назад",
      product: "Samsung Galaxy S24",
      avatar: "Д",
      helpful: 31
    },
    {
      name: "Анна П.",
      rating: 5,
      text: "Чудесный сервис! Заказала наушники, получила на следующий день. Качество супер!",
      date: "3 дня назад",
      product: "AirPods Pro 2",
      avatar: "А",
      helpful: 15
    }
  ]
};

const Testimonials = () => {
  const { language, t } = useLanguage();
  const [testimonials, setTestimonials] = useState(defaultTestimonials[language] || defaultTestimonials.ua);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Update testimonials when language changes
  useEffect(() => {
    setTestimonials(defaultTestimonials[language] || defaultTestimonials.ua);
  }, [language]);

  // Try to fetch real reviews
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`${API_URL}/api/reviews/featured?limit=6`);
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            const mapped = data.map(r => ({
              name: r.user_name || r.author || 'Покупець',
              rating: r.rating || 5,
              text: r.comment || r.text || r.review || '',
              date: formatDate(r.created_at, language),
              product: r.product_name || r.product?.name || '',
              avatar: (r.user_name || 'П').charAt(0).toUpperCase(),
              helpful: r.likes || r.helpful_count || 0
            }));
            if (mapped.length > 0) setTestimonials(mapped);
          }
        }
      } catch (err) {
        // Use default testimonials
      }
    };
    fetchReviews();
  }, [language]);

  const formatDate = (dateStr, lang) => {
    if (!dateStr) return lang === 'ru' ? 'Недавно' : 'Нещодавно';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (lang === 'ru') {
      if (diff === 0) return 'Сегодня';
      if (diff === 1) return 'Вчера';
      if (diff < 7) return `${diff} дней назад`;
      if (diff < 14) return 'Неделю назад';
      return `${Math.floor(diff / 7)} недель назад`;
    } else {
      if (diff === 0) return 'Сьогодні';
      if (diff === 1) return 'Вчора';
      if (diff < 7) return `${diff} днів тому`;
      if (diff < 14) return 'Тиждень тому';
      return `${Math.floor(diff / 7)} тижнів тому`;
    }
  };

  const nextSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const prevSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    setTimeout(() => setIsAnimating(false), 300);
  };

  // Auto-slide
  useEffect(() => {
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, []);

  const texts = {
    ua: {
      title: "Відгуки покупців",
      subtitle: "Що кажуть наші клієнти",
      helpful: "корисний",
      verifiedPurchase: "Підтверджена покупка"
    },
    ru: {
      title: "Отзывы покупателей",
      subtitle: "Что говорят наши клиенты",
      helpful: "полезный",
      verifiedPurchase: "Подтвержденная покупка"
    }
  };

  const txt = texts[language] || texts.ua;

  // Get visible testimonials (3 for desktop, 1 for mobile)
  const getVisibleTestimonials = () => {
    const result = [];
    for (let i = 0; i < 3; i++) {
      const idx = (currentIndex + i) % testimonials.length;
      result.push(testimonials[idx]);
    }
    return result;
  };

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-b from-gray-50 to-white" data-testid="testimonials">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full mb-4">
            <MessageCircle className="w-4 h-4" />
            <span className="text-sm font-medium">{txt.subtitle}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            {txt.title}
          </h2>
        </div>

        {/* Testimonials Carousel */}
        <div className="relative">
          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-all hover:scale-110 hidden md:flex"
            aria-label="Previous testimonial"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <button
            onClick={nextSlide}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-all hover:scale-110 hidden md:flex"
            aria-label="Next testimonial"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
            {getVisibleTestimonials().map((testimonial, i) => (
              <div
                key={`${testimonial.name}-${i}`}
                className={`bg-white rounded-2xl p-6 shadow-lg border border-gray-100 transform transition-all duration-300 ${
                  isAnimating ? 'opacity-80 scale-95' : 'opacity-100 scale-100'
                } hover:shadow-xl hover:-translate-y-1`}
              >
                {/* Quote Icon */}
                <Quote className="w-8 h-8 text-blue-200 mb-4" />
                
                {/* Review Text */}
                <p className="text-gray-700 text-base leading-relaxed mb-6 min-h-[80px]">
                  "{testimonial.text}"
                </p>
                
                {/* Product Badge */}
                {testimonial.product && (
                  <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-sm px-3 py-1 rounded-full mb-4">
                    <span>{testimonial.product}</span>
                  </div>
                )}
                
                {/* User Info */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                      {/* Rating */}
                      <div className="flex items-center gap-1">
                        {[...Array(testimonial.rating)].map((_, j) => (
                          <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Date & Helpful */}
                  <div className="text-right">
                    <span className="text-sm text-gray-500 block">{testimonial.date}</span>
                    <div className="flex items-center gap-1 text-gray-400 text-sm mt-1">
                      <ThumbsUp className="w-3 h-3" />
                      <span>{testimonial.helpful}</span>
                    </div>
                  </div>
                </div>
                
                {/* Verified Badge */}
                <div className="flex items-center gap-1 text-green-600 text-xs mt-3">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{txt.verifiedPurchase}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Dots Navigation */}
          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  if (!isAnimating) {
                    setIsAnimating(true);
                    setCurrentIndex(i);
                    setTimeout(() => setIsAnimating(false), 300);
                  }
                }}
                className={`w-3 h-3 rounded-full transition-all ${
                  i === currentIndex 
                    ? 'bg-blue-600 w-8' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
