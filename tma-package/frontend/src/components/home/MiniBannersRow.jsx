import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useIsMobile from "../../hooks/useIsMobile";

export default function MiniBannersRow() {
  const { language } = useLanguage();
  const t = (uk, ru) => (language === "ru" ? ru : uk);
  const scrollRef = React.useRef(null);
  const isMobile = useIsMobile(768);

  const banners = [
    {
      title: t("Топ смартфони", "Топ смартфоны"),
      text: t("Хіти продажу + вигідні ціни", "Хиты продаж + выгодные цены"),
      to: "/catalog?category=smartphones",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
    {
      title: t("Ноутбуки для роботи", "Ноутбуки для работы"),
      text: t("Офіс, навчання, ігри", "Офис, учеба, игры"),
      to: "/catalog?category=laptops",
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    },
    {
      title: t("Розумний дім", "Умный дом"),
      text: t("Датчики, камери, хаби", "Датчики, камеры, хабы"),
      to: "/catalog?category=smart-home",
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    },
  ];

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="ys-popular-categories-section">
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <h2 className="text-lg md:text-xl font-bold text-gray-900">Популярні категорії</h2>
        {!isMobile && banners.length > 3 && (
          <div className="flex gap-2">
            <button 
              onClick={() => scroll('left')} 
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => scroll('right')} 
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      <div 
        ref={scrollRef} 
        className={isMobile ? "ys-scroll-horizontal" : "ys-mini-banners"}
      >
        {banners.map((b, i) => (
          <Link 
            className="ys-mini-banner" 
            key={i} 
            to={b.to}
            style={{ background: b.gradient }}
            data-testid={`mini-banner-${i}`}
          >
            <h3>{b.title}</h3>
            <p className={isMobile ? "text-xs opacity-90" : ""}>{b.text}</p>
            <span className="ys-mini-cta">
              {t("Дивитись", "Смотреть")}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginLeft: 4}}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
