/**
 * FiltersSidebar V3 - Dynamic filters from API with facets & chips
 * Supports: range, multiselect, select, boolean
 */
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { ChevronDown, ChevronUp, RotateCcw, X } from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

function clampNum(x, min, max) {
  const n = Number(x);
  if (!Number.isFinite(n)) return null;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function Section({ title, open, onToggle, children, count = 0 }) {
  return (
    <div style={{ marginBottom: '8px' }}>
      <button 
        type="button" 
        onClick={onToggle}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 0',
          background: 'none',
          border: 'none',
          borderBottom: '1px solid #f3f4f6',
          fontSize: '14px',
          fontWeight: 600,
          color: '#374151',
          cursor: 'pointer',
          textAlign: 'left'
        }}
      >
        <span>{title}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {count > 0 && (
            <span style={{ fontSize: '11px', background: '#2563eb', color: '#fff', padding: '2px 6px', borderRadius: '10px', fontWeight: 600 }}>
              {count}
            </span>
          )}
          <span style={{ color: '#9ca3af', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>
            {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </div>
      </button>
      {open && <div style={{ padding: '12px 0' }}>{children}</div>}
    </div>
  );
}

export default function FiltersSidebar({ 
  value, 
  onApply, 
  onReset, 
  categorySlug,
  brands = [] // Fallback static brands
}) {
  const [draft, setDraft] = useState(value || {});
  const [priceMin, setPriceMin] = useState(value?.priceMin ?? "");
  const [priceMax, setPriceMax] = useState(value?.priceMax ?? "");
  
  // Dynamic filter schema from API
  const [filterSchema, setFilterSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  // accordion state
  const [open, setOpen] = useState(() => {
    try {
      const raw = localStorage.getItem("ys_filters_open_v3");
      return raw ? JSON.parse(raw) : { price: true, brand: true };
    } catch {
      return { price: true, brand: true };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("ys_filters_open_v3", JSON.stringify(open));
    } catch {}
  }, [open]);

  // Fetch filter schema when category changes
  useEffect(() => {
    console.log('[FiltersSidebar] categorySlug:', categorySlug, 'API_URL:', API_URL);
    
    if (!categorySlug) {
      setFilterSchema(null);
      return;
    }

    setSchemaLoading(true);
    const url = `${API_URL}/api/v2/categories/${categorySlug}/filters`;
    console.log('[FiltersSidebar] Fetching:', url);
    
    fetch(url)
      .then(res => {
        console.log('[FiltersSidebar] Response status:', res.status);
        return res.ok ? res.json() : null;
      })
      .then(data => {
        console.log('[FiltersSidebar] Schema data:', data);
        setFilterSchema(data);
        // Open first 3 groups by default
        if (data?.groups) {
          const newOpen = { price: true };
          data.groups.slice(0, 3).forEach(g => {
            newOpen[g.name] = true;
          });
          setOpen(prev => ({ ...prev, ...newOpen }));
        }
      })
      .catch((err) => {
        console.error('[FiltersSidebar] Fetch error:', err);
        setFilterSchema(null);
      })
      .finally(() => setSchemaLoading(false));
  }, [categorySlug]);

  // sync draft when URL/value changed externally
  useEffect(() => {
    setDraft(value || {});
    setPriceMin(value?.priceMin ?? "");
    setPriceMax(value?.priceMax ?? "");
  }, [value]);

  const toggle = (k) => setOpen((p) => ({ ...p, [k]: !p[k] }));

  // dirty flag
  const dirty = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(value);
  }, [draft, value]);

  // Count active filters for a group
  const countActiveInGroup = (groupFilters) => {
    return groupFilters?.filter(f => {
      const val = draft[f.code];
      if (!val) return false;
      if (typeof val === 'object') return val.min || val.max;
      return true;
    }).length || 0;
  };

  // Handle multiselect change
  const handleMultiselect = (code, val, checked) => {
    const current = draft[code] ? draft[code].split(',') : [];
    let next;
    if (checked) {
      next = [...current, val].filter((v, i, arr) => arr.indexOf(v) === i);
    } else {
      next = current.filter(v => v !== val);
    }
    
    setDraft(prev => {
      if (next.length === 0) {
        const { [code]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [code]: next.join(',') };
    });
  };

  // Handle range change
  const handleRangeChange = (code, type, value) => {
    setDraft(prev => {
      const current = prev[code] || {};
      const next = { ...current, [type]: value ? parseFloat(value) : undefined };
      
      // Clean up empty values
      if (!next.min && !next.max) {
        const { [code]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [code]: next };
    });
  };

  // Handle boolean change
  const handleBooleanChange = (code, checked) => {
    setDraft(prev => {
      if (checked) {
        return { ...prev, [code]: 'true' };
      } else {
        const { [code]: _, ...rest } = prev;
        return rest;
      }
    });
  };

  // Apply filters
  const handleApply = () => {
    const finalFilters = { ...draft };
    
    // Add price
    const pMin = clampNum(priceMin, 0, 999999);
    const pMax = clampNum(priceMax, 0, 999999);
    if (pMin !== null) finalFilters.priceMin = pMin;
    if (pMax !== null) finalFilters.priceMax = pMax;
    
    onApply(finalFilters);
  };

  // Reset filters
  const handleReset = () => {
    setDraft({});
    setPriceMin("");
    setPriceMax("");
    onReset();
  };

  // Render filter by type
  const renderFilter = (filter) => {
    const { code, name, ui, unit, min_value, max_value, options } = filter;

    switch (ui) {
      case 'range':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="number"
                placeholder={min_value ? `від ${min_value}` : 'від'}
                value={draft[code]?.min || ''}
                onChange={(e) => handleRangeChange(code, 'min', e.target.value)}
                style={{ flex: 1, minWidth: 0, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', background: '#f9fafb' }}
              />
              <span style={{ color: '#9ca3af', flexShrink: 0 }}>—</span>
              <input
                type="number"
                placeholder={max_value ? `до ${max_value}` : 'до'}
                value={draft[code]?.max || ''}
                onChange={(e) => handleRangeChange(code, 'max', e.target.value)}
                style={{ flex: 1, minWidth: 0, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', background: '#f9fafb' }}
              />
            </div>
            {unit && <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'right' }}>{unit}</div>}
          </div>
        );

      case 'multiselect':
        const selected = draft[code] ? draft[code].split(',') : [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
            {options?.slice(0, 10).map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '4px 0' }}>
                <input
                  type="checkbox"
                  checked={selected.includes(opt.value)}
                  onChange={(e) => handleMultiselect(code, opt.value, e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#2563eb' }}
                />
                <span style={{ fontSize: '14px', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {opt.color_hex && (
                    <span 
                      style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: opt.color_hex, border: '1px solid #e5e7eb', flexShrink: 0 }}
                    />
                  )}
                  {opt.label || opt.value}
                </span>
                {opt.count > 0 && (
                  <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: 'auto' }}>({opt.count})</span>
                )}
              </label>
            ))}
            {options?.length > 10 && (
              <button style={{ fontSize: '13px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left' }}>
                Показати ще {options.length - 10}...
              </button>
            )}
          </div>
        );

      case 'boolean':
        return (
          <div className="ys-filter-checks">
            <label className="ys-filter-check">
              <input
                type="checkbox"
                checked={draft[code] === 'true'}
                onChange={(e) => handleBooleanChange(code, e.target.checked)}
              />
              <span className="ys-filter-check__box" />
              <span className="ys-filter-check__label">Так</span>
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  // Get price range from schema
  const priceRange = filterSchema?.price_range || { min: 0, max: 100000 };

  return (
    <aside className="ys-filters" style={{ padding: '16px', background: '#fff', borderRadius: '16px', border: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #e5e7eb' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>Фільтри</span>
        {(dirty || Object.keys(draft).length > 0) && (
          <button 
            onClick={handleReset}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '6px' }}
          >
            <RotateCcw size={14} />
            Скинути
          </button>
        )}
      </div>

      {/* Price Filter - Always show */}
      <Section title="Ціна" open={open.price} onToggle={() => toggle("price")}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="number"
              placeholder={priceRange.min || "від"}
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              style={{ flex: 1, minWidth: 0, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', background: '#f9fafb' }}
            />
            <span style={{ color: '#9ca3af' }}>—</span>
            <input
              type="number"
              placeholder={priceRange.max || "до"}
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              style={{ flex: 1, minWidth: 0, padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '14px', background: '#f9fafb' }}
            />
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'right' }}>грн</div>
        </div>
      </Section>

      {/* Dynamic Filters from Schema */}
      {filterSchema?.groups?.map(group => (
        <Section 
          key={group.name} 
          title={group.name} 
          open={open[group.name]} 
          onToggle={() => toggle(group.name)}
          count={countActiveInGroup(group.filters)}
        >
          {group.filters.map(filter => (
            <div key={filter.code} className="ys-filter-item">
              <div className="ys-filter-item__label">
                {filter.name}
                {filter.unit && <span className="ys-filter-item__unit">({filter.unit})</span>}
              </div>
              {renderFilter(filter)}
            </div>
          ))}
        </Section>
      ))}

      {/* Fallback: Static Brand Filter if no schema */}
      {!filterSchema && brands.length > 0 && (
        <Section 
          title="Бренд" 
          open={open.brand} 
          onToggle={() => toggle("brand")}
          count={draft.brand ? draft.brand.split(',').length : 0}
        >
          <div className="ys-filter-checks">
            {brands.map(b => {
              const selected = draft.brand ? draft.brand.split(',') : [];
              return (
                <label key={b} className="ys-filter-check">
                  <input
                    type="checkbox"
                    checked={selected.includes(b)}
                    onChange={(e) => handleMultiselect('brand', b, e.target.checked)}
                  />
                  <span className="ys-filter-check__box" />
                  <span className="ys-filter-check__label">{b}</span>
                </label>
              );
            })}
          </div>
        </Section>
      )}

      {/* In Stock Filter */}
      <Section title="Наявність" open={open.stock} onToggle={() => toggle("stock")}>
        <div className="ys-filter-checks">
          <label className="ys-filter-check">
            <input
              type="checkbox"
              checked={draft.in_stock === 'true'}
              onChange={(e) => handleBooleanChange('in_stock', e.target.checked)}
            />
            <span className="ys-filter-check__box" />
            <span className="ys-filter-check__label">Тільки в наявності</span>
          </label>
        </div>
      </Section>

      {/* Apply Button */}
      {dirty && (
        <div className="ys-filters__actions">
          <button className="ys-filters__apply" onClick={handleApply}>
            Застосувати
          </button>
        </div>
      )}

      {schemaLoading && (
        <div className="ys-filters__loading">Завантаження фільтрів...</div>
      )}
    </aside>
  );
}

/* Active Filter Chips */
export function ActiveFilterChipsV2({ filters, filterSchema, onRemove, onClearAll }) {
  if (!filters || Object.keys(filters).length === 0) return null;

  const getLabel = (code, value) => {
    // Special cases
    if (code === 'priceMin') return `від ${value} грн`;
    if (code === 'priceMax') return `до ${value} грн`;
    if (code === 'in_stock' && value === 'true') return 'В наявності';
    if (code === 'brand') return `Бренд: ${value}`;

    // Find in schema
    if (filterSchema) {
      for (const group of filterSchema.groups || []) {
        const filter = group.filters?.find(f => f.code === code);
        if (filter) {
          if (typeof value === 'object' && (value.min || value.max)) {
            const parts = [];
            if (value.min) parts.push(`від ${value.min}`);
            if (value.max) parts.push(`до ${value.max}`);
            return `${filter.name}: ${parts.join(' ')} ${filter.unit || ''}`;
          }
          if (value.includes?.(',')) {
            return `${filter.name}: ${value.split(',').length} обрано`;
          }
          const opt = filter.options?.find(o => o.value === value);
          return `${filter.name}: ${opt?.label || value}`;
        }
      }
    }

    return `${code}: ${value}`;
  };

  return (
    <div className="ys-active-chips">
      {Object.entries(filters).map(([code, value]) => (
        <button
          key={code}
          className="ys-chip"
          onClick={() => onRemove(code)}
        >
          {getLabel(code, value)}
          <X size={14} />
        </button>
      ))}
      {Object.keys(filters).length > 1 && (
        <button className="ys-chip ys-chip--clear" onClick={onClearAll}>
          Скинути всі
        </button>
      )}
    </div>
  );
}
