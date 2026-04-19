import React, { useMemo, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { Check, Package } from "lucide-react";

export default function BuyTogether({ baseProduct, items = [], onAddToCart }) {
  const { language } = useLanguage();
  const t = (uk, ru) => (language === "ru" ? ru : uk);

  const list = useMemo(() => (Array.isArray(items) ? items.slice(0, 4) : []), [items]);
  const [checked, setChecked] = useState(() => new Set(list.map((x) => x?.id || x?.slug)));

  if (!list.length) return null;

  const toggle = (key) => {
    setChecked((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const selected = list.filter((x) => checked.has(x?.id || x?.slug));
  const total = selected.reduce((s, x) => s + Number(x?.price || 0), Number(baseProduct?.price || 0));

  const handleAddAll = () => {
    if (onAddToCart) {
      onAddToCart(baseProduct, 1);
      selected.forEach((p) => onAddToCart(p, 1));
    }
  };

  return (
    <div className="ys-buytogether" data-testid="buy-together">
      <div className="ys-buytogether-title">{t("Купують разом", "Покупают вместе")}</div>

      <div className="ys-buytogether-list">
        {list.map((p) => {
          const key = p?.id || p?.slug;
          const isOn = checked.has(key);
          const img = p?.image || (p?.images || [])[0];
          return (
            <label key={key} className={"ys-buytogether-item" + (isOn ? " is-checked" : "")}>
              <input
                type="checkbox"
                checked={isOn}
                onChange={() => toggle(key)}
                style={{ display: "none" }}
              />
              <div className="ys-buytogether-check">
                {isOn && <Check size={14} />}
              </div>
              <div className="ys-buytogether-thumb">
                {img ? <img src={img} alt="" /> : <Package size={20} style={{ opacity: 0.3 }} />}
              </div>
              <div className="ys-buytogether-meta">
                <div className="ys-buytogether-name">{p?.title || p?.name}</div>
                <div className="ys-buytogether-price">{p?.price} грн</div>
              </div>
            </label>
          );
        })}
      </div>

      <div className="ys-buytogether-footer">
        <div className="ys-buytogether-total">
          {t("Разом:", "Итого:")} <strong>{Math.round(total)} грн</strong>
        </div>
        <button className="ys-btn ys-btn-primary" onClick={handleAddAll} type="button" data-testid="add-bundle-btn">
          {t("Додати комплект", "Добавить комплект")}
        </button>
      </div>
    </div>
  );
}
