import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import axios from 'axios';
import { 
  Filter, 
  Grid, 
  List, 
  ChevronDown,
  X,
  SlidersHorizontal,
  SearchX
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import ProductCardCompact from '../components/ProductCardCompact';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CatalogV2 = () => {
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [filterValues, setFilterValues] = useState({ brands: [], price_range: { min: 0, max: 100000 } });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');

  // Parse filters from URL
  const filters = {
    category: searchParams.get('category') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    brand: searchParams.get('brand') || '',
    in_stock: searchParams.get('in_stock') === 'true' ? true : null,
    sort_by: searchParams.get('sort_by') || 'popular',
    page: parseInt(searchParams.get('page') || '1'),
  };

  const T = {
    uk: {
      catalog: 'Каталог',
      found: 'Знайдено товарів',
      filters: 'Фільтри',
      sortBy: 'Сортування',
      priceFrom: 'Ціна від',
      priceTo: 'Ціна до',
      brand: 'Бренд',
      inStock: 'Тільки в наявності',
      apply: 'Застосувати',
      reset: 'Скинути всі',
      popular: 'Популярні',
      priceAsc: 'Спочатку дешевші',
      priceDesc: 'Спочатку дорожчі',
      newest: 'Новинки',
      rating: 'За рейтингом',
      loading: 'Завантаження...',
      noProducts: 'Товарів не знайдено',
      noProductsDesc: 'Спробуйте змінити фільтри або пошукати щось інше',
      page: 'Сторінка',
      compare: 'Порівняти',
      compareItems: 'товарів',
      quickFilters: 'Швидкі фільтри',
      allBrands: 'Всі бренди',
      priceRange: 'Діапазон цін'
    },
    ru: {
      catalog: 'Каталог',
      found: 'Найдено товаров',
      filters: 'Фильтры',
      sortBy: 'Сортировка',
      priceFrom: 'Цена от',
      priceTo: 'Цена до',
      brand: 'Бренд',
      inStock: 'Только в наличии',
      apply: 'Применить',
      reset: 'Сбросить все',
      popular: 'Популярные',
      priceAsc: 'Сначала дешевле',
      priceDesc: 'Сначала дороже',
      newest: 'Новинки',
      rating: 'По рейтингу',
      loading: 'Загрузка...',
      noProducts: 'Товаров не найдено',
      noProductsDesc: 'Попробуйте изменить фильтры или поищите что-то другое',
      page: 'Страница',
      compare: 'Сравнить',
      compareItems: 'товаров',
      quickFilters: 'Быстрые фильтры',
      allBrands: 'Все бренды',
      priceRange: 'Диапазон цен'
    }
  };

  const txt = T[language] || T.uk;

  const sortOptions = [
    { value: 'popular', label: txt.popular },
    { value: 'price_asc', label: txt.priceAsc },
    { value: 'price_desc', label: txt.priceDesc },
    { value: 'new', label: txt.newest },
    { value: 'rating', label: txt.rating },
  ];

  // Quick filter presets
  const quickFilters = [
    { key: 'in_stock', label: txt.inStock, value: true },
    { key: 'sort_by', label: txt.priceAsc, value: 'price_asc' },
    { key: 'sort_by', label: txt.newest, value: 'new' },
  ];

  // Fetch products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        limit: 24
      };
      // Remove empty params
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });

      const response = await axios.get(`${API_URL}/api/v2/catalog`, { params });
      setProducts(response.data.products || []);
      setTotal(response.data.total || 0);
      setPages(response.data.pages || 1);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  // Fetch filter values
  const fetchFilterValues = useCallback(async () => {
    try {
      const params = filters.category ? { category: filters.category } : {};
      const response = await axios.get(`${API_URL}/api/v2/catalog/filters`, { params });
      setFilterValues(response.data);
    } catch (error) {
      console.error('Failed to fetch filter values:', error);
    }
  }, [filters.category]);

  useEffect(() => {
    fetchProducts();
    fetchFilterValues();
  }, [searchParams]);

  // Update URL params
  const updateFilters = (newFilters) => {
    const params = new URLSearchParams();
    Object.entries({ ...filters, ...newFilters, page: 1 }).forEach(([key, value]) => {
      if (value && value !== '' && value !== false) {
        params.set(key, String(value));
      }
    });
    setSearchParams(params);
  };

  const setPage = (page) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    setSearchParams(params);
  };

  const resetFilters = () => {
    const params = new URLSearchParams();
    if (filters.category) params.set('category', filters.category);
    setSearchParams(params);
  };

  // Active filters chips
  const activeFilters = [];
  if (filters.min_price) activeFilters.push({ key: 'min_price', label: `від ${filters.min_price} ₴` });
  if (filters.max_price) activeFilters.push({ key: 'max_price', label: `до ${filters.max_price} ₴` });
  if (filters.brand) activeFilters.push({ key: 'brand', label: filters.brand });
  if (filters.in_stock) activeFilters.push({ key: 'in_stock', label: txt.inStock });

  const removeFilter = (key) => {
    const params = new URLSearchParams(searchParams);
    params.delete(key);
    params.set('page', '1');
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="ys-container py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900">{txt.catalog}</h1>
            <p className="text-gray-500 mt-1">{txt.found}: {total.toLocaleString()}</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Mobile Filter Toggle */}
            <Button 
              variant="outline" 
              className="md:hidden"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="mobile-filter-toggle"
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              {txt.filters}
            </Button>

            {/* Sort */}
            <div className="relative">
              <select
                value={filters.sort_by}
                onChange={(e) => updateFilters({ sort_by: e.target.value })}
                data-testid="sort-select"
                className="appearance-none bg-white border border-gray-200 rounded-xl px-4 py-2.5 pr-10 font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sortOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* View Mode */}
            <div className="hidden md:flex items-center gap-1 bg-white rounded-xl border border-gray-200 p-1">
              <button 
                onClick={() => setViewMode('grid')}
                data-testid="view-mode-grid"
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                data-testid="view-mode-list"
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="text-sm text-gray-500 font-medium py-2">{txt.quickFilters}:</span>
          {quickFilters.map((qf, idx) => {
            const isActive = filters[qf.key] === qf.value || (qf.key === 'in_stock' && filters.in_stock === true);
            return (
              <button
                key={idx}
                onClick={() => {
                  if (isActive) {
                    removeFilter(qf.key);
                  } else {
                    updateFilters({ [qf.key]: qf.value });
                  }
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                }`}
              >
                {qf.label}
              </button>
            );
          })}
        </div>

        {/* Active Filters Chips */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-gray-500">Активні фільтри:</span>
            {activeFilters.map(f => (
              <button
                key={f.key}
                onClick={() => removeFilter(f.key)}
                data-testid={`filter-chip-${f.key}`}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold hover:bg-blue-200 transition-colors"
              >
                {f.label}
                <X className="w-3 h-3" />
              </button>
            ))}
            <button
              onClick={resetFilters}
              data-testid="reset-all-filters"
              className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm font-semibold hover:bg-gray-200 transition-colors"
            >
              {txt.reset}
            </button>
          </div>
        )}

        <div className="flex gap-6">
          {/* Filters Sidebar */}
          <aside className={`w-72 flex-shrink-0 ${showFilters ? 'block' : 'hidden'} md:block`}>
            <div className="sticky top-24">
              <Card className="p-6 bg-white/90 backdrop-blur border-0 shadow-lg rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Filter className="w-5 h-5 text-blue-600" />
                    {txt.filters}
                  </h3>
                  <button 
                    onClick={() => setShowFilters(false)}
                    className="md:hidden p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Price Range */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">{txt.priceRange}</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        value={filters.min_price}
                        onChange={(e) => updateFilters({ min_price: e.target.value })}
                        placeholder="від"
                        data-testid="price-min-input"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                      />
                    </div>
                    <span className="flex items-center text-gray-400">—</span>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={filters.max_price}
                        onChange={(e) => updateFilters({ max_price: e.target.value })}
                        placeholder="до"
                        data-testid="price-max-input"
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Brand */}
                {filterValues.brands?.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-700 mb-3">{txt.brand}</label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      <button
                        onClick={() => updateFilters({ brand: '' })}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          !filters.brand ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'
                        }`}
                      >
                        {txt.allBrands}
                      </button>
                      {filterValues.brands.map(brand => (
                        <button
                          key={brand}
                          onClick={() => updateFilters({ brand: brand })}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                            filters.brand === brand ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'
                          }`}
                        >
                          {brand}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* In Stock */}
                <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.in_stock === true}
                      onChange={(e) => updateFilters({ in_stock: e.target.checked ? true : null })}
                      data-testid="in-stock-checkbox"
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-sm">{txt.inStock}</span>
                  </label>
                </div>

                <Button 
                  onClick={resetFilters}
                  variant="outline"
                  className="w-full"
                  data-testid="reset-filters-btn"
                >
                  {txt.reset}
                </Button>
              </Card>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">{txt.loading}</p>
                </div>
              </div>
            ) : products.length === 0 ? (
              /* Empty State */
              <Card className="p-12 text-center bg-white/80 backdrop-blur rounded-2xl" data-testid="empty-state">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <SearchX className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{txt.noProducts}</h3>
                <p className="text-gray-500 mb-6">{txt.noProductsDesc}</p>
                <Button onClick={resetFilters} className="mx-auto">
                  {txt.reset}
                </Button>
              </Card>
            ) : (
              <>
                <div className={`ys-grid`} data-testid="products-grid">
                  {products.map(product => (
                    <ProductCardCompact key={product.id} product={product} viewMode={viewMode} />
                  ))}
                </div>

                {/* Pagination */}
                {pages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8" data-testid="pagination">
                    {Array.from({ length: Math.min(pages, 10) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-10 h-10 rounded-xl font-bold transition-all ${
                            pageNum === filters.page
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    {pages > 10 && (
                      <>
                        <span className="text-gray-400">...</span>
                        <button
                          onClick={() => setPage(pages)}
                          className={`w-10 h-10 rounded-xl font-bold bg-white border border-gray-200 hover:border-blue-300`}
                        >
                          {pages}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogV2;
