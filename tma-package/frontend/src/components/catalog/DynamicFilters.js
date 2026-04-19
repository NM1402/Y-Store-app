import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ChevronDown, ChevronUp, Filter, RotateCcw, Sliders } from 'lucide-react';
import { Button } from '../ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * Dynamic Catalog Filters Component
 * Renders filters based on category schema from API
 */
const DynamicFilters = ({ 
  categorySlug, 
  onFiltersChange, 
  appliedFilters = {},
  className = ''
}) => {
  const [filterSchema, setFilterSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [localFilters, setLocalFilters] = useState({});
  const [showMobile, setShowMobile] = useState(false);

  // Fetch filter schema for category
  const fetchFilterSchema = useCallback(async () => {
    if (!categorySlug) {
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/v2/categories/${categorySlug}/filters`);
      if (!res.ok) throw new Error('Failed to fetch filters');
      const data = await res.json();
      setFilterSchema(data);
      
      // Expand first 3 groups by default
      const groups = {};
      data.groups?.slice(0, 3).forEach(g => {
        groups[g.name] = true;
      });
      setExpandedGroups(groups);
    } catch (err) {
      console.error('Error fetching filter schema:', err);
    } finally {
      setLoading(false);
    }
  }, [categorySlug]);

  useEffect(() => {
    fetchFilterSchema();
  }, [fetchFilterSchema]);

  useEffect(() => {
    setLocalFilters(appliedFilters);
  }, [appliedFilters]);

  // Apply filters with debounce
  const applyFilters = useCallback((newFilters) => {
    setLocalFilters(newFilters);
    onFiltersChange?.(newFilters);
  }, [onFiltersChange]);

  // Handle range filter change
  const handleRangeChange = (code, type, value) => {
    const newFilters = { ...localFilters };
    if (!newFilters[code]) newFilters[code] = {};
    newFilters[code][type] = value ? parseFloat(value) : undefined;
    
    // Clean up empty values
    if (!newFilters[code].min && !newFilters[code].max) {
      delete newFilters[code];
    }
    
    applyFilters(newFilters);
  };

  // Handle multiselect filter change
  const handleMultiselectChange = (code, value, checked) => {
    const newFilters = { ...localFilters };
    let currentValues = newFilters[code] ? newFilters[code].split(',') : [];
    
    if (checked) {
      currentValues.push(value);
    } else {
      currentValues = currentValues.filter(v => v !== value);
    }
    
    if (currentValues.length > 0) {
      newFilters[code] = currentValues.join(',');
    } else {
      delete newFilters[code];
    }
    
    applyFilters(newFilters);
  };

  // Handle boolean filter change
  const handleBooleanChange = (code, checked) => {
    const newFilters = { ...localFilters };
    if (checked) {
      newFilters[code] = 'true';
    } else {
      delete newFilters[code];
    }
    applyFilters(newFilters);
  };

  // Handle select filter change
  const handleSelectChange = (code, value) => {
    const newFilters = { ...localFilters };
    if (value) {
      newFilters[code] = value;
    } else {
      delete newFilters[code];
    }
    applyFilters(newFilters);
  };

  // Clear all filters
  const clearAllFilters = () => {
    applyFilters({});
  };

  // Count active filters
  const activeFilterCount = Object.keys(localFilters).length;

  // Toggle group expansion
  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  // Check if value is selected in multiselect
  const isValueSelected = (code, value) => {
    const current = localFilters[code];
    if (!current) return false;
    return current.split(',').includes(value);
  };

  // Render single filter
  const renderFilter = (filter) => {
    const { code, name, ui, unit, min_value, max_value, options } = filter;

    switch (ui) {
      case 'range':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder={min_value ? `від ${min_value}` : 'від'}
                value={localFilters[code]?.min || ''}
                onChange={(e) => handleRangeChange(code, 'min', e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
              />
              <span className="text-zinc-500">—</span>
              <input
                type="number"
                placeholder={max_value ? `до ${max_value}` : 'до'}
                value={localFilters[code]?.max || ''}
                onChange={(e) => handleRangeChange(code, 'max', e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            {unit && (
              <div className="text-xs text-zinc-500 text-right">{unit}</div>
            )}
          </div>
        );

      case 'multiselect':
        return (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {options?.map(opt => (
              <label 
                key={opt.value} 
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={isValueSelected(code, opt.value)}
                  onChange={(e) => handleMultiselectChange(code, opt.value, e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                />
                <span className="flex items-center gap-2 text-sm text-zinc-300 group-hover:text-white">
                  {opt.color_hex && (
                    <span 
                      className="w-4 h-4 rounded-full border border-zinc-600"
                      style={{ backgroundColor: opt.color_hex }}
                    />
                  )}
                  {opt.label || opt.value}
                </span>
                {opt.count > 0 && (
                  <span className="ml-auto text-xs text-zinc-500">({opt.count})</span>
                )}
              </label>
            ))}
            {(!options || options.length === 0) && (
              <div className="text-sm text-zinc-500">Немає доступних варіантів</div>
            )}
          </div>
        );

      case 'select':
        return (
          <select
            value={localFilters[code] || ''}
            onChange={(e) => handleSelectChange(code, e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
          >
            <option value="">Всі</option>
            {options?.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label || opt.value} {opt.count > 0 && `(${opt.count})`}
              </option>
            ))}
          </select>
        );

      case 'boolean':
        return (
          <div className="space-y-2">
            {options?.map(opt => (
              <label 
                key={opt.value}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={localFilters[code] === 'true' && opt.value === 'true'}
                  onChange={(e) => handleBooleanChange(code, e.target.checked && opt.value === 'true')}
                  className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                />
                <span className="text-sm text-zinc-300 group-hover:text-white">
                  {opt.label}
                </span>
                {opt.count > 0 && (
                  <span className="ml-auto text-xs text-zinc-500">({opt.count})</span>
                )}
              </label>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-zinc-800 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!filterSchema || !filterSchema.groups?.length) {
    return null;
  }

  const FilterContent = () => (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Filter size={18} className="text-amber-400" />
          Фільтри
        </h3>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            className="text-zinc-400 hover:text-white"
          >
            <RotateCcw size={14} className="mr-1" />
            Скинути ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Quick Filters */}
      {filterSchema.quick_filters?.length > 0 && (
        <div className="pb-4 border-b border-zinc-700">
          <div className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
            Популярні
          </div>
          <div className="space-y-3">
            {filterSchema.quick_filters.map(filter => (
              <div key={filter.code}>
                <div className="text-sm text-zinc-300 mb-2 flex items-center gap-2">
                  {filter.name}
                  {filter.unit && <span className="text-zinc-500">({filter.unit})</span>}
                </div>
                {renderFilter(filter)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Groups */}
      {filterSchema.groups.map(group => (
        <div key={group.name} className="border-b border-zinc-700/50 pb-4">
          <button
            onClick={() => toggleGroup(group.name)}
            className="w-full flex items-center justify-between py-2 text-zinc-300 hover:text-white"
          >
            <span className="font-medium">{group.name}</span>
            {expandedGroups[group.name] ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </button>
          
          {expandedGroups[group.name] && (
            <div className="mt-3 space-y-4">
              {group.filters.map(filter => (
                <div key={filter.code}>
                  <div className="text-sm text-zinc-400 mb-2 flex items-center gap-2">
                    {filter.name}
                    {filter.unit && <span className="text-zinc-500">({filter.unit})</span>}
                  </div>
                  {renderFilter(filter)}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={`hidden lg:block ${className}`}>
        <FilterContent />
      </div>

      {/* Mobile Button */}
      <div className="lg:hidden">
        <Button
          onClick={() => setShowMobile(true)}
          variant="outline"
          className="w-full flex items-center justify-center gap-2"
        >
          <Sliders size={18} />
          Фільтри
          {activeFilterCount > 0 && (
            <span className="bg-amber-500 text-black text-xs px-2 py-0.5 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Mobile Drawer */}
      {showMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div 
            className="absolute inset-0 bg-black/70" 
            onClick={() => setShowMobile(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-zinc-900 rounded-t-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-zinc-700">
              <h3 className="font-semibold text-white">Фільтри</h3>
              <button 
                onClick={() => setShowMobile(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
              <FilterContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Active Filter Chips Component
 * Shows applied filters as removable chips
 */
export const ActiveFilterChips = ({ 
  filters = {}, 
  filterSchema,
  onRemove,
  onClearAll 
}) => {
  if (Object.keys(filters).length === 0) return null;

  const getFilterLabel = (code, value) => {
    if (!filterSchema) return `${code}: ${value}`;
    
    // Find filter in schema
    let filter = null;
    filterSchema.quick_filters?.forEach(f => {
      if (f.code === code) filter = f;
    });
    filterSchema.groups?.forEach(g => {
      g.filters?.forEach(f => {
        if (f.code === code) filter = f;
      });
    });

    if (!filter) return `${code}: ${value}`;

    // Format value
    if (typeof value === 'object' && (value.min || value.max)) {
      const parts = [];
      if (value.min) parts.push(`від ${value.min}`);
      if (value.max) parts.push(`до ${value.max}`);
      return `${filter.name}: ${parts.join(' ')} ${filter.unit || ''}`;
    }

    // For multiselect, show count
    if (value.includes(',')) {
      const count = value.split(',').length;
      return `${filter.name}: ${count} вибрано`;
    }

    // For boolean
    if (value === 'true') {
      return filter.name;
    }

    // Find option label
    const option = filter.options?.find(o => o.value === value);
    return `${filter.name}: ${option?.label || value}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {Object.entries(filters).map(([code, value]) => (
        <button
          key={code}
          onClick={() => onRemove(code)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full text-sm text-amber-400 hover:bg-amber-500/20 transition-colors"
        >
          {getFilterLabel(code, value)}
          <X size={14} />
        </button>
      ))}
      
      {Object.keys(filters).length > 1 && (
        <button
          onClick={onClearAll}
          className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white"
        >
          Скинути всі
        </button>
      )}
    </div>
  );
};

export default DynamicFilters;
