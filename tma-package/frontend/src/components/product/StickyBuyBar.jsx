import React from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { ShoppingCart, CreditCard } from "lucide-react";

export default function StickyBuyBar({ product, onAdd, onBuy }) {
  const { language } = useLanguage();
  const t = (uk, ru) => (language === "ru" ? ru : uk);

  if (!product) return null;

  return (
    <div className="ys-sticky-buy" data-testid="sticky-buy-bar">
      <div className="ys-sticky-buy-inner ys-container">
        <div className="ys-sticky-buy-left">
          <div className="ys-sticky-buy-title">{product.title || product.name}</div>
          <div className="ys-sticky-buy-price">{product.price} грн</div>
        </div>

        <div className="ys-sticky-buy-actions">
          <button className="ys-btn" onClick={onAdd} type="button" data-testid="sticky-add-btn">
            <ShoppingCart size={16} style={{ marginRight: 6 }} />
            {t("У кошик", "В корзину")}
          </button>
          <button className="ys-btn ys-btn-primary" onClick={onBuy} type="button" data-testid="sticky-buy-btn">
            <CreditCard size={16} style={{ marginRight: 6 }} />
            {t("Купити", "Купить")}
          </button>
        </div>
      </div>
    </div>
  );
}
