/**
 * NovaPoshtaPicker — BottomSheet-based picker (mobile-friendly, NO keyboard overlap)
 *
 * Pattern:
 *   readonly input (tap-target) → opens BottomSheet with search input + scrollable list.
 *   City sheet auto-opens when no city selected. Warehouse sheet opens on tap.
 *
 * Props:
 *   value:    { cityRef, cityName, warehouseRef, warehouseName }
 *   onChange: (value) => void
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { searchCities, searchWarehouses } from '../lib/np-client';
import BottomSheet from './BottomSheet';
import './NovaPoshtaPicker.css';

export default function NovaPoshtaPicker({ value = {}, onChange }) {
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [whSheetOpen, setWhSheetOpen] = useState(false);

  const cityRef = value.cityRef || '';
  const cityName = value.cityName || '';
  const whRef = value.warehouseRef || '';
  const whName = value.warehouseName || '';

  const openCitySheet = () => setCitySheetOpen(true);
  const openWhSheet = () => {
    if (cityRef) setWhSheetOpen(true);
  };

  const handleCitySelect = (city) => {
    onChange?.({
      cityRef: city.ref,
      cityName: city.name,
      warehouseRef: '',
      warehouseName: '',
    });
    setCitySheetOpen(false);
    // Auto-open warehouse sheet after short delay for continuous flow
    setTimeout(() => setWhSheetOpen(true), 260);
  };

  const handleWhSelect = (wh) => {
    onChange?.({
      cityRef,
      cityName,
      warehouseRef: wh.ref,
      warehouseName: wh.name,
    });
    setWhSheetOpen(false);
  };

  return (
    <div className="np-picker" data-testid="np-picker">
      {/* CITY FIELD */}
      <div className="np-picker__field">
        <label className="np-picker__label">Місто *</label>
        <button
          type="button"
          className={`np-picker__trigger ${cityRef ? 'np-picker__trigger--filled' : ''}`}
          onClick={openCitySheet}
          data-testid="np-city-trigger"
        >
          <span className="np-picker__trigger-text">
            {cityName || 'Оберіть місто'}
          </span>
          {cityRef && <span className="np-picker__check">✓</span>}
        </button>
      </div>

      {/* WAREHOUSE FIELD */}
      <div className="np-picker__field">
        <label className="np-picker__label">Відділення *</label>
        <button
          type="button"
          className={`np-picker__trigger ${whRef ? 'np-picker__trigger--filled' : ''} ${!cityRef ? 'np-picker__trigger--disabled' : ''}`}
          onClick={openWhSheet}
          disabled={!cityRef}
          data-testid="np-wh-trigger"
        >
          <span className="np-picker__trigger-text">
            {whName || (cityRef ? 'Оберіть відділення' : 'Спочатку місто')}
          </span>
          {whRef && <span className="np-picker__check">✓</span>}
        </button>
      </div>

      {/* CITY SHEET */}
      <BottomSheet isOpen={citySheetOpen} onClose={() => setCitySheetOpen(false)}>
        <CityPickerSheet
          selectedRef={cityRef}
          onClose={() => setCitySheetOpen(false)}
          onSelect={handleCitySelect}
        />
      </BottomSheet>

      {/* WAREHOUSE SHEET */}
      <BottomSheet isOpen={whSheetOpen} onClose={() => setWhSheetOpen(false)}>
        <WarehousePickerSheet
          cityRef={cityRef}
          cityName={cityName}
          selectedRef={whRef}
          onClose={() => setWhSheetOpen(false)}
          onSelect={handleWhSelect}
        />
      </BottomSheet>
    </div>
  );
}

/* -------------------- CITY SHEET CONTENT -------------------- */
function CityPickerSheet({ selectedRef, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState(true);
  const inputRef = useRef(null);
  const reqId = useRef(0);
  const timer = useRef(null);

  const fetchCities = useCallback(async (q) => {
    const clean = (q || '').trim();
    if (clean.length < 2) {
      setItems([]);
      setHint(true);
      return;
    }
    const rid = ++reqId.current;
    setLoading(true);
    setHint(false);
    try {
      const data = await searchCities(clean, 20);
      if (rid === reqId.current) setItems(data?.items || []);
    } catch (_e) {
      if (rid === reqId.current) setItems([]);
    } finally {
      if (rid === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 200);
  }, []);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchCities(v), 250);
  };

  return (
    <div className="np-sheet">
      <div className="np-sheet__header">
        <h2 className="np-sheet__title">Оберіть місто</h2>
        <button className="np-sheet__close" onClick={onClose} aria-label="Закрити">
          <X size={20} />
        </button>
      </div>
      <div className="np-sheet__search">
        <input
          ref={inputRef}
          type="text"
          className="np-sheet__search-input"
          placeholder="Почніть вводити місто"
          value={query}
          onChange={handleChange}
          autoComplete="off"
          data-testid="np-city-input"
        />
      </div>
      <div className="np-sheet__list" data-testid="np-city-list">
        {hint && <div className="np-sheet__hint">Введіть 2+ літери для пошуку</div>}
        {loading && <div className="np-sheet__hint">Пошук...</div>}
        {!loading && !hint && items.length === 0 && (
          <div className="np-sheet__hint">Нічого не знайдено</div>
        )}
        {items.map((c, idx) => (
          <button
            key={c.ref}
            type="button"
            className={`np-sheet__item ${selectedRef === c.ref ? 'np-sheet__item--selected' : ''}`}
            onClick={() => onSelect(c)}
            data-testid={`np-city-item-${idx}`}
          >
            <div className="np-sheet__item-name">{c.name}</div>
            {c.region && <div className="np-sheet__item-sub">{c.region} обл.</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

/* -------------------- WAREHOUSE SHEET CONTENT -------------------- */
function WarehousePickerSheet({ cityRef, cityName, selectedRef, onClose, onSelect }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const reqId = useRef(0);
  const timer = useRef(null);

  const fetchWh = useCallback(
    async (q) => {
      if (!cityRef) return;
      const rid = ++reqId.current;
      setLoading(true);
      try {
        const data = await searchWarehouses(cityRef, q || '', 50);
        if (rid === reqId.current) setItems(data?.items || []);
      } catch (_e) {
        if (rid === reqId.current) setItems([]);
      } finally {
        if (rid === reqId.current) setLoading(false);
      }
    },
    [cityRef]
  );

  useEffect(() => {
    fetchWh('');
  }, [fetchWh]);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchWh(v), 200);
  };

  return (
    <div className="np-sheet">
      <div className="np-sheet__header">
        <div>
          <h2 className="np-sheet__title">Відділення</h2>
          {cityName && <div className="np-sheet__subtitle">м. {cityName}</div>}
        </div>
        <button className="np-sheet__close" onClick={onClose} aria-label="Закрити">
          <X size={20} />
        </button>
      </div>
      <div className="np-sheet__search">
        <input
          ref={inputRef}
          type="text"
          className="np-sheet__search-input"
          placeholder="Номер або адреса відділення"
          value={query}
          onChange={handleChange}
          autoComplete="off"
          data-testid="np-wh-input"
        />
      </div>
      <div className="np-sheet__list" data-testid="np-wh-list">
        {loading && <div className="np-sheet__hint">Завантаження...</div>}
        {!loading && items.length === 0 && (
          <div className="np-sheet__hint">Немає відділень</div>
        )}
        {items.map((w, idx) => (
          <button
            key={w.ref}
            type="button"
            className={`np-sheet__item ${selectedRef === w.ref ? 'np-sheet__item--selected' : ''}`}
            onClick={() => onSelect(w)}
            data-testid={`np-wh-item-${idx}`}
          >
            <div className="np-sheet__item-name">{w.name}</div>
            {w.short && <div className="np-sheet__item-sub">{w.short}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}
