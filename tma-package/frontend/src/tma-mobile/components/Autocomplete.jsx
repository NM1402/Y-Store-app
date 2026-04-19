/**
 * Autocomplete — reusable dropdown suggestion input
 * props:
 *   value, onChange (string)
 *   onSelect (item) → called when user picks suggestion
 *   fetcher (query) → async () => { items: [...] }
 *   renderItem (item, idx) → JSX
 *   placeholder, disabled, minChars (default 1), data-testid
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import './Autocomplete.css';

export default function Autocomplete({
  value,
  onChange,
  onSelect,
  fetcher,
  renderItem,
  placeholder = 'Почніть вводити…',
  disabled = false,
  minChars = 1,
  testId,
  inputTestId,
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const timerRef = useRef(null);
  const reqIdRef = useRef(0);

  const fetchItems = useCallback(async (q) => {
    if (!q || q.length < minChars) {
      setItems([]);
      setOpen(false);
      return;
    }
    const rid = ++reqIdRef.current;
    setLoading(true);
    try {
      const data = await fetcher(q);
      if (rid !== reqIdRef.current) return; // stale
      setItems(data?.items || []);
      setOpen(true);
      setActiveIdx(-1);
    } catch (e) {
      setItems([]);
      setOpen(false);
    } finally {
      if (rid === reqIdRef.current) setLoading(false);
    }
  }, [fetcher, minChars]);

  const handleChange = (e) => {
    const v = e.target.value;
    onChange(v);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchItems(v), 220);
  };

  const handlePick = (item) => {
    onSelect?.(item);
    setOpen(false);
    setItems([]);
    setActiveIdx(-1);
  };

  const handleKey = (e) => {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      handlePick(items[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, []);

  return (
    <div className="np-ac" ref={rootRef} data-testid={testId}>
      <input
        ref={inputRef}
        type="text"
        className="np-ac__input checkout__input"
        placeholder={placeholder}
        value={value || ''}
        onChange={handleChange}
        onKeyDown={handleKey}
        onFocus={() => { if (items.length > 0) setOpen(true); }}
        disabled={disabled}
        autoComplete="off"
        data-testid={inputTestId}
      />
      {loading && <div className="np-ac__spinner" />}
      {open && items.length > 0 && (
        <div className="np-ac__list" data-testid={testId ? `${testId}-list` : undefined}>
          {items.map((item, idx) => (
            <button
              key={item.ref || item.id || idx}
              type="button"
              className={`np-ac__item ${idx === activeIdx ? 'np-ac__item--active' : ''}`}
              onClick={() => handlePick(item)}
              onMouseEnter={() => setActiveIdx(idx)}
              data-testid={testId ? `${testId}-item-${idx}` : undefined}
            >
              {renderItem ? renderItem(item, idx) : item.name}
            </button>
          ))}
        </div>
      )}
      {open && !loading && items.length === 0 && (value || '').length >= minChars && (
        <div className="np-ac__empty">Нічого не знайдено</div>
      )}
    </div>
  );
}
