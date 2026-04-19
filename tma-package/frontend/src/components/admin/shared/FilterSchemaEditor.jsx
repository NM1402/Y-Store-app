import React, { useMemo, useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, AlertCircle } from "lucide-react";

const TYPE_OPTIONS = [
  { value: "select", label: "Select (список)" },
  { value: "range", label: "Range (діапазон)" },
  { value: "boolean", label: "Boolean (так/ні)" },
  { value: "color", label: "Color (кольори)" },
];

const keyRe = /^[a-z0-9_]{2,32}$/;

export default function FilterSchemaEditor({ value = [], onChange, lang = "uk" }) {
  const [rows, setRows] = useState(value || []);

  useEffect(() => {
    setRows(value || []);
  }, [value]);

  const normalized = useMemo(() => rows.map(r => ({
    key: (r.key || "").trim(),
    type: r.type || "select",
    multi: r.multi !== false,
    label_uk: r.label_uk || "",
    label_ru: r.label_ru || "",
  })), [rows]);

  const set = (next) => {
    setRows(next);
    onChange?.(next);
  };

  const addRow = () => {
    set([...normalized, { key: "", type: "select", multi: true, label_uk: "", label_ru: "" }]);
  };

  const delRow = (idx) => {
    const next = normalized.filter((_, i) => i !== idx);
    set(next);
  };

  const upd = (idx, patch) => {
    const next = normalized.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    set(next);
  };

  return (
    <div className="bg-[var(--ys-bg-secondary)] rounded-xl p-4 border border-[var(--ys-border)]">
      <div className="flex justify-between items-center gap-3 mb-4">
        <div className="font-bold text-[var(--ys-text)]">Схема фільтрів (filterSchema)</div>
        <button 
          className="flex items-center gap-2 px-3 py-2 bg-[var(--ys-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
          type="button" 
          onClick={addRow}
          data-testid="add-filter-btn"
        >
          <Plus size={16} />
          Додати фільтр
        </button>
      </div>

      <div className="space-y-3">
        {normalized.length === 0 && (
          <div className="text-center py-8 text-[var(--ys-text-secondary)]">
            <AlertCircle className="mx-auto mb-2" size={32} />
            <p>Фільтри не налаштовані</p>
            <p className="text-sm">Додайте фільтри для цієї категорії</p>
          </div>
        )}
        
        {normalized.map((r, idx) => {
          const keyOk = !r.key || keyRe.test(r.key);
          return (
            <div 
              key={idx} 
              className="bg-[var(--ys-bg)] rounded-lg p-4 border border-[var(--ys-border)]"
              data-testid={`filter-row-${idx}`}
            >
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {/* Key */}
                <div>
                  <label className="block text-sm font-medium text-[var(--ys-text-secondary)] mb-1">key</label>
                  <input
                    className="w-full px-3 py-2 bg-[var(--ys-bg-secondary)] border border-[var(--ys-border)] rounded-lg text-[var(--ys-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ys-primary)]"
                    value={r.key}
                    onChange={(e) => upd(idx, { key: e.target.value })}
                    placeholder="brand, memory, price"
                    data-testid={`filter-key-${idx}`}
                  />
                  {!keyOk && (
                    <div className="text-xs text-red-500 mt-1">
                      key: тільки латиниця/цифри/_, 2-32
                    </div>
                  )}
                </div>

                {/* Type */}
                <div>
                  <label className="block text-sm font-medium text-[var(--ys-text-secondary)] mb-1">type</label>
                  <select 
                    className="w-full px-3 py-2 bg-[var(--ys-bg-secondary)] border border-[var(--ys-border)] rounded-lg text-[var(--ys-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ys-primary)]"
                    value={r.type} 
                    onChange={(e) => upd(idx, { type: e.target.value })}
                    data-testid={`filter-type-${idx}`}
                  >
                    {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                {/* Multi */}
                <div>
                  <label className="block text-sm font-medium text-[var(--ys-text-secondary)] mb-1">multi</label>
                  <label className="flex gap-2 items-center mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={r.multi !== false}
                      onChange={(e) => upd(idx, { multi: e.target.checked })}
                      disabled={r.type === "range" || r.type === "boolean"}
                      className="w-4 h-4 accent-[var(--ys-primary)]"
                      data-testid={`filter-multi-${idx}`}
                    />
                    <span className="text-sm text-[var(--ys-text)]">Мультивибір</span>
                  </label>
                </div>

                {/* Labels */}
                <div>
                  <label className="block text-sm font-medium text-[var(--ys-text-secondary)] mb-1">labels</label>
                  <input 
                    className="w-full px-3 py-2 bg-[var(--ys-bg-secondary)] border border-[var(--ys-border)] rounded-lg text-[var(--ys-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ys-primary)] mb-2"
                    value={r.label_uk} 
                    onChange={(e) => upd(idx, { label_uk: e.target.value })} 
                    placeholder="UA назва"
                    data-testid={`filter-label-uk-${idx}`}
                  />
                  <input 
                    className="w-full px-3 py-2 bg-[var(--ys-bg-secondary)] border border-[var(--ys-border)] rounded-lg text-[var(--ys-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ys-primary)]"
                    value={r.label_ru} 
                    onChange={(e) => upd(idx, { label_ru: e.target.value })} 
                    placeholder="RU назва"
                    data-testid={`filter-label-ru-${idx}`}
                  />
                </div>

                {/* Delete */}
                <div className="flex items-end">
                  <button 
                    className="px-3 py-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                    type="button" 
                    onClick={() => delRow(idx)}
                    data-testid={`filter-delete-${idx}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="text-xs text-[var(--ys-text-secondary)] mt-3 bg-[var(--ys-bg-secondary)] p-2 rounded">
                Порада: price має бути type=range і key=price, наявність — type=boolean key=in_stock.
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
