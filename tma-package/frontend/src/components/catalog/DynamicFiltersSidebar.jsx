import React from "react";
import { Filter, RotateCcw, Check } from "lucide-react";

export default function DynamicFiltersSidebar({ filters = [], state = {}, setState, loading = false }) {
  const set = (patch) => setState(prev => ({ ...prev, ...patch }));

  const hasActiveFilters = Object.keys(state).some(k => state[k] !== undefined && state[k] !== "");

  if (filters.length === 0) {
    return (
      <div className="bg-[var(--ys-bg-secondary)] rounded-xl p-4 border border-[var(--ys-border)]">
        <div className="flex items-center gap-2 font-bold text-[var(--ys-text)] mb-3">
          <Filter size={18} />
          Фільтри
        </div>
        <p className="text-sm text-[var(--ys-text-secondary)]">
          Фільтри для цієї категорії не налаштовані
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--ys-bg-secondary)] rounded-xl p-4 border border-[var(--ys-border)]" data-testid="filters-sidebar">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 font-bold text-[var(--ys-text)]">
          <Filter size={18} />
          Фільтри
        </div>
        {hasActiveFilters && (
          <button 
            className="text-xs text-[var(--ys-primary)] hover:underline flex items-center gap-1"
            onClick={() => setState({})}
            data-testid="reset-filters-btn"
          >
            <RotateCcw size={12} />
            Скинути
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filters.map(f => {
          // Price range filter
          if (f.type === "range" && f.key === "price") {
            return (
              <div key={f.key} data-testid="filter-price">
                <label className="block text-sm font-medium text-[var(--ys-text-secondary)] mb-2">
                  {f.label}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    className="w-full px-3 py-2 bg-[var(--ys-bg)] border border-[var(--ys-border)] rounded-lg text-[var(--ys-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ys-primary)]"
                    type="number" 
                    value={state.min_price ?? ""} 
                    placeholder={`від ${f.min}`}
                    onChange={(e) => set({ min_price: e.target.value ? Number(e.target.value) : undefined })}
                    data-testid="filter-min-price"
                  />
                  <input 
                    className="w-full px-3 py-2 bg-[var(--ys-bg)] border border-[var(--ys-border)] rounded-lg text-[var(--ys-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ys-primary)]"
                    type="number" 
                    value={state.max_price ?? ""} 
                    placeholder={`до ${f.max}`}
                    onChange={(e) => set({ max_price: e.target.value ? Number(e.target.value) : undefined })}
                    data-testid="filter-max-price"
                  />
                </div>
                <div className="text-xs text-[var(--ys-text-secondary)] mt-1">
                  Діапазон: {f.min?.toLocaleString()} — {f.max?.toLocaleString()} грн
                </div>
              </div>
            );
          }

          // Boolean filter (in_stock)
          if (f.type === "boolean" && f.key === "in_stock") {
            return (
              <label 
                key={f.key} 
                className="flex gap-3 items-center cursor-pointer group"
                data-testid="filter-in-stock"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  state.in_stock 
                    ? 'bg-[var(--ys-primary)] border-[var(--ys-primary)]' 
                    : 'border-[var(--ys-border)] group-hover:border-[var(--ys-primary)]'
                }`}>
                  {state.in_stock && <Check size={14} className="text-white" />}
                </div>
                <input
                  type="checkbox"
                  checked={!!state.in_stock}
                  onChange={(e) => set({ in_stock: e.target.checked ? true : undefined })}
                  className="sr-only"
                />
                <span className="text-sm text-[var(--ys-text)]">{f.label}</span>
              </label>
            );
          }

          // Select/Color filter
          if (f.type === "select" || f.type === "color") {
            const current = state[`attr_${f.key}`] || "";
            return (
              <div key={f.key} data-testid={`filter-${f.key}`}>
                <label className="block text-sm font-medium text-[var(--ys-text-secondary)] mb-2">
                  {f.label}
                </label>
                {f.type === "color" ? (
                  <div className="flex flex-wrap gap-2">
                    {(f.options || []).map(o => (
                      <button
                        key={o}
                        onClick={() => set({ [`attr_${f.key}`]: current === o ? undefined : o })}
                        className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                          current === o 
                            ? 'border-[var(--ys-primary)] bg-[var(--ys-primary)]/10 text-[var(--ys-primary)]' 
                            : 'border-[var(--ys-border)] hover:border-[var(--ys-primary)] text-[var(--ys-text)]'
                        }`}
                        data-testid={`filter-${f.key}-${o}`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                ) : (
                  <select 
                    className="w-full px-3 py-2 bg-[var(--ys-bg)] border border-[var(--ys-border)] rounded-lg text-[var(--ys-text)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--ys-primary)]"
                    value={current} 
                    onChange={(e) => set({ [`attr_${f.key}`]: e.target.value || undefined })}
                    data-testid={`filter-${f.key}-select`}
                  >
                    <option value="">Всі</option>
                    {(f.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
              </div>
            );
          }

          return null;
        })}
      </div>

      {hasActiveFilters && (
        <button 
          className="w-full mt-4 px-4 py-2 bg-[var(--ys-bg)] border border-[var(--ys-border)] rounded-lg text-[var(--ys-text)] text-sm hover:bg-[var(--ys-bg-secondary)] transition-colors flex items-center justify-center gap-2"
          onClick={() => setState({})}
          data-testid="reset-filters-btn-bottom"
        >
          <RotateCcw size={14} />
          Скинути всі фільтри
        </button>
      )}
    </div>
  );
}
