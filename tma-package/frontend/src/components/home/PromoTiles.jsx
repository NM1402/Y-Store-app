import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";

export default function PromoTiles() {
  const { language } = useLanguage();
  const t = (uk, ru) => (language === "ru" ? ru : uk);

  const items = [
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="3" width="15" height="13"/>
          <path d="M16 8h4l3 3v5h-7V8zM5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z"/>
        </svg>
      ),
      title: t("Доставка НП 1–2 дні", "Доставка НП 1–2 дня"),
      sub: t("Безкоштовно від 2000 грн", "Бесплатно от 2000 грн"),
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
      title: t("Гарантія та сервіс", "Гарантия и сервис"),
      sub: t("Офіційні товари", "Официальные товары"),
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="1" y="4" width="22" height="16" rx="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
      ),
      title: t("Оплата карткою / Apple Pay", "Оплата картой / Apple Pay"),
      sub: t("Fondy — безпечно", "Fondy — безопасно"),
    },
    {
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      ),
      title: t("Швидке оформлення", "Быстрое оформление"),
      sub: t("Можна без реєстрації", "Можно без регистрации"),
    },
  ];

  return (
    <div className="ys-promo-tiles">
      {items.map((x, i) => (
        <div className="ys-promo-tile" key={i} data-testid={`promo-tile-${i}`}>
          <div className="ys-promo-icon">{x.icon}</div>
          <div className="ys-promo-text">
            <div className="ys-promo-title">{x.title}</div>
            <div className="ys-promo-sub">{x.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
