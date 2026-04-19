import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Package, Search, Loader2, Check } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const NovaPoshtaDelivery = ({ onAddressChange }) => {
  const [cityQuery, setCityQuery] = useState('');
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [cityError, setCityError] = useState('');
  
  const [warehouseQuery, setWarehouseQuery] = useState('');
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [showWarehouseDropdown, setShowWarehouseDropdown] = useState(false);
  const [loadingWarehouses, setLoadingWarehouses] = useState(false);
  
  const cityRef = useRef(null);
  const warehouseRef = useRef(null);

  // Search cities
  useEffect(() => {
    if (selectedCity) return;
    if (cityQuery.length < 2) {
      setCities([]);
      setShowCityDropdown(false);
      setCityError('');
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingCities(true);
      setCityError('');
      
      try {
        const res = await fetch(`${API_URL}/api/novaposhta/cities?query=${encodeURIComponent(cityQuery)}&limit=15`);
        const data = await res.json();
        
        console.log('City search result:', data); // Debug
        
        if (data.success && data.data && data.data.length > 0) {
          setCities(data.data);
          setShowCityDropdown(true);
        } else {
          setCities([]);
          setShowCityDropdown(false);
          setCityError('Місто не знайдено');
        }
      } catch (e) {
        console.error('City search error:', e);
        setCityError('Помилка пошуку');
      } finally {
        setLoadingCities(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [cityQuery, selectedCity]);

  // Load warehouses
  useEffect(() => {
    if (!selectedCity) {
      setWarehouses([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingWarehouses(true);
      try {
        const url = warehouseQuery 
          ? `${API_URL}/api/novaposhta/warehouses?city_ref=${selectedCity.ref}&number=${warehouseQuery}`
          : `${API_URL}/api/novaposhta/warehouses?city_ref=${selectedCity.ref}&limit=30`;
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.success && data.data) {
          setWarehouses(data.data);
          if (!selectedWarehouse) setShowWarehouseDropdown(true);
        }
      } catch (e) {
        console.error('Warehouse error:', e);
      } finally {
        setLoadingWarehouses(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedCity, warehouseQuery, selectedWarehouse]);

  // Select city
  const selectCity = (city) => {
    setSelectedCity(city);
    setCityQuery(city.city_name);
    setShowCityDropdown(false);
    setCities([]);
    setCityError('');
    setSelectedWarehouse(null);
    setWarehouseQuery('');
    
    onAddressChange?.({
      city: city.city_name,
      cityRef: city.ref,
      cityDescription: city.description,
      warehouse: null
    });
  };

  // Select warehouse
  const selectWarehouse = (wh) => {
    setSelectedWarehouse(wh);
    setWarehouseQuery(wh.number);
    setShowWarehouseDropdown(false);
    
    onAddressChange?.({
      city: selectedCity.city_name,
      cityRef: selectedCity.ref,
      cityDescription: selectedCity.description,
      warehouse: {
        ref: wh.ref,
        number: wh.number,
        address: wh.short_address,
        description: wh.description
      }
    });
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (cityRef.current && !cityRef.current.contains(e.target)) {
        setShowCityDropdown(false);
      }
      if (warehouseRef.current && !warehouseRef.current.contains(e.target)) {
        setShowWarehouseDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="space-y-4">
      {/* City */}
      <div className="relative" ref={cityRef}>
        <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
          <MapPin size={16} /> Місто
        </label>
        
        <div className="relative">
          <input
            type="text"
            value={cityQuery}
            onChange={(e) => {
              setCityQuery(e.target.value);
              if (selectedCity) setSelectedCity(null);
            }}
            onFocus={() => cities.length > 0 && !selectedCity && setShowCityDropdown(true)}
            placeholder="Введіть назву міста"
            className={`w-full h-12 px-4 pr-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 ${
              selectedCity ? 'border-green-500 bg-green-50' : 'border-gray-300'
            }`}
          />
          <div className="absolute right-3 top-3.5">
            {loadingCities ? (
              <Loader2 size={20} className="animate-spin text-green-500" />
            ) : selectedCity ? (
              <Check size={20} className="text-green-500" />
            ) : (
              <Search size={20} className="text-gray-400" />
            )}
          </div>
        </div>

        {selectedCity && (
          <p className="mt-1 text-xs text-green-600">✓ {selectedCity.description}</p>
        )}

        {cityQuery.length > 0 && cityQuery.length < 2 && !selectedCity && (
          <p className="mt-1 text-xs text-gray-500">Введіть ще {2 - cityQuery.length} символ(и)</p>
        )}

        {cityError && !loadingCities && !selectedCity && cityQuery.length >= 2 && (
          <p className="mt-2 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{cityError}</p>
        )}

        {showCityDropdown && cities.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border-2 border-green-500 rounded-xl shadow-xl max-h-60 overflow-y-auto">
            {cities.map((city) => (
              <div
                key={city.ref}
                onClick={() => selectCity(city)}
                className="px-4 py-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-0"
              >
                <div className="font-semibold text-gray-900">{city.city_name}</div>
                <div className="text-sm text-gray-500">{city.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warehouse */}
      {selectedCity && (
        <div className="relative" ref={warehouseRef}>
          <label className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
            <Package size={16} /> Відділення
          </label>
          
          <div className="relative">
            <input
              type="text"
              value={warehouseQuery}
              onChange={(e) => {
                setWarehouseQuery(e.target.value);
                if (selectedWarehouse) setSelectedWarehouse(null);
              }}
              onFocus={() => warehouses.length > 0 && !selectedWarehouse && setShowWarehouseDropdown(true)}
              placeholder="Введіть номер або оберіть зі списку"
              className={`w-full h-12 px-4 pr-10 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 ${
                selectedWarehouse ? 'border-green-500 bg-green-50' : 'border-gray-300'
              }`}
            />
            <div className="absolute right-3 top-3.5">
              {loadingWarehouses ? (
                <Loader2 size={20} className="animate-spin text-green-500" />
              ) : selectedWarehouse ? (
                <Check size={20} className="text-green-500" />
              ) : (
                <Search size={20} className="text-gray-400" />
              )}
            </div>
          </div>

          {showWarehouseDropdown && warehouses.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border-2 border-green-500 rounded-xl shadow-xl max-h-72 overflow-y-auto">
              {warehouses.map((wh) => (
                <div
                  key={wh.ref}
                  onClick={() => selectWarehouse(wh)}
                  className="px-4 py-3 hover:bg-green-50 cursor-pointer border-b border-gray-100 last:border-0"
                >
                  <div className="font-semibold text-green-600">Відділення №{wh.number}</div>
                  <div className="text-sm text-gray-600 mt-1">{wh.short_address}</div>
                </div>
              ))}
            </div>
          )}

          {selectedWarehouse && !showWarehouseDropdown && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <Package size={20} className="text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-green-800">Відділення №{selectedWarehouse.number}</div>
                <div className="text-sm text-green-700 mt-1">{selectedWarehouse.short_address}</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NovaPoshtaDelivery;
