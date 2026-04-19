/**
 * ActiveFilterChips - показывает активные фильтры с возможностью удаления
 */
import React from "react";

function Chip({ label, onRemove }) {
  return (
    <button 
      type="button" 
      className="ys-chip" 
      onClick={onRemove} 
      aria-label={`Видалити ${label}`}
    >
      <span className="ys-chip__label">{label}</span>
      <span className="ys-chip__x">×</span>
    </button>
  );
}

export default function ActiveFilterChips({ filters, onChange, onClearAll }) {
  const chips = [];

  if (filters?.q) {
    chips.push({
      key: "q",
      label: `Пошук: ${filters.q}`,
      remove: () => onChange({ ...filters, q: "" }),
    });
  }

  if (filters?.brands?.length) {
    for (const b of filters.brands) {
      chips.push({
        key: `brand:${b}`,
        label: b,
        remove: () =>
          onChange({
            ...filters,
            brands: filters.brands.filter((x) => x !== b),
          }),
      });
    }
  }

  if (filters?.priceMin != null || filters?.priceMax != null) {
    const l =
      filters.priceMin != null && filters.priceMax != null
        ? `Ціна: ${filters.priceMin}–${filters.priceMax} ₴`
        : filters.priceMin != null
          ? `Ціна від: ${filters.priceMin} ₴`
          : `Ціна до: ${filters.priceMax} ₴`;

    chips.push({
      key: "price",
      label: l,
      remove: () => onChange({ ...filters, priceMin: null, priceMax: null }),
    });
  }

  if (filters?.inStock) {
    chips.push({
      key: "stock",
      label: "В наявності",
      remove: () => onChange({ ...filters, inStock: false }),
    });
  }

  if (filters?.rating != null) {
    chips.push({
      key: "rating",
      label: `Рейтинг: ${filters.rating}+`,
      remove: () => onChange({ ...filters, rating: null }),
    });
  }

  if (filters?.sort && filters.sort !== "pop") {
    const map = {
      new: "Нові",
      price_asc: "Ціна ↑",
      price_desc: "Ціна ↓",
      rating_desc: "Рейтинг",
    };
    chips.push({
      key: "sort",
      label: `Сортування: ${map[filters.sort] || filters.sort}`,
      remove: () => onChange({ ...filters, sort: "pop" }),
    });
  }

  if (!chips.length) return null;

  return (
    <div className="ys-chips" style={{ marginBottom: 16, alignItems: "center", justifyContent: "flex-start" }}>
      <div className="ys-chips__row">
        {chips.map((c) => (
          <Chip key={c.key} label={c.label} onRemove={c.remove} />
        ))}
      </div>
      <button 
        type="button" 
        className="ys-link" 
        onClick={onClearAll}
        style={{ marginLeft: 12 }}
      >
        Скинути все
      </button>
    </div>
  );
}
