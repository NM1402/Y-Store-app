/**
 * BLOCK V2-21: Advantages Strip PRO
 * Trust & benefits section - retail level
 * Mobile: Horizontal scroll | Desktop: Grid
 */
import React from "react";
import { Truck, Shield, RefreshCw, CreditCard, Headphones, Gift } from "lucide-react";
import useIsMobile from "../../hooks/useIsMobile";

const advantages = [
  {
    icon: Truck,
    title: "Швидка доставка",
    subtitle: "1-2 дні по Україні",
  },
  {
    icon: Shield,
    title: "Гарантія якості",
    subtitle: "Офіційний товар",
  },
  {
    icon: RefreshCw,
    title: "Повернення 14 днів",
    subtitle: "Без питань",
  },
  {
    icon: CreditCard,
    title: "Зручна оплата",
    subtitle: "Карткою або готівкою",
  },
  {
    icon: Headphones,
    title: "Підтримка 24/7",
    subtitle: "Завжди на зв'язку",
  },
  {
    icon: Gift,
    title: "Бонуси та акції",
    subtitle: "Для постійних клієнтів",
  },
];

export default function AdvantagesStrip() {
  const isMobile = useIsMobile(768);

  if (isMobile) {
    return (
      <div data-testid="advantages-strip" className="ys-advantages-strip">
        {advantages.map((a, i) => (
          <div key={i} className="ys-advantage-item">
            <div className="ys-advantage-icon">
              <a.icon size={20} strokeWidth={1.5} />
            </div>
            <span className="ys-advantage-text">{a.title}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-testid="advantages-strip" className="ys-advantages">
      <div className="ys-advantages-grid">
        {advantages.map((a, i) => (
          <div key={i} className="ys-advantage">
            <div className="ys-advantage-icon">
              <a.icon size={26} strokeWidth={1.5} />
            </div>
            <h4 className="ys-advantage-title">{a.title}</h4>
            <p className="ys-advantage-text">{a.subtitle}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
