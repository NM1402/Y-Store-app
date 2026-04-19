/**
 * CatalogV3 - Layout Core v3: Sidebar Grid + URL state + Filters + Mobile Drawer
 */
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { SlidersHorizontal, ChevronDown, Check } from "lucide-react";
import { fetchProducts } from "../api/products";
import { getCatalogFilters, getCatalogProducts } from "../api/catalogV2";
import { parseFiltersFromSearch, buildSearchFromFilters } from "../utils/urlFilters";
import ActiveFilterChips from "../components/catalog/ActiveFilterChips";
import Pagination from "../components/catalog/Pagination";
import ProductSkeletonGrid from "../components/catalog/ProductSkeletonGrid";
import FiltersSidebar from "../components/catalog/FiltersSidebar";
import ProductCardCompact from "../components/ProductCardCompact";
import { MobileFiltersDrawer } from "../components/mobile";
import useIsMobile from "../hooks/useIsMobile";
import { useLanguage } from "../contexts/LanguageContext";
import SEO from "../components/SEO";

// Custom Sort Dropdown Component
function SortDropdown({ value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const currentOption = options.find(o => o.id === value) || options[0];

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="ys-sort-dropdown" ref={dropdownRef}>
      <button 
        className="ys-sort-btn"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="sort-dropdown-btn"
      >
        <span className="ys-sort-label">Сортування:</span>
        <span className="ys-sort-value">{currentOption.label}</span>
        <ChevronDown size={18} className={`ys-sort-chevron ${isOpen ? 'is-open' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="ys-sort-menu" data-testid="sort-menu">
          {options.map((opt) => (
            <button
              key={opt.id}
              className={`ys-sort-option ${value === opt.id ? 'is-active' : ''}`}
              onClick={() => {
                onChange(opt.id);
                setIsOpen(false);
              }}
            >
              <span>{opt.label}</span>
              {value === opt.id && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CatalogV3() {
  const location = useLocation();
  const navigate = useNavigate();
  const { categorySlug } = useParams();
  const { language } = useLanguage();
  const isMobile = useIsMobile();

  // 1) init from URL
  const init = useMemo(() => parseFiltersFromSearch(location.search), [location.search]);

  const [filters, setFilters] = useState(init.filters);
  const [page, setPage] = useState(init.page);

  // 2) sync with URL changes
  useEffect(() => {
    const next = parseFiltersFromSearch(location.search);
    setFilters(next.filters);
    setPage(next.page);
  }, [location.search]);

  // 3) data state
  const [data, setData] = useState({ meta: { page: 1, pages: 1, total: 0 }, items: [] });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // Mobile drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Dynamic filters from API (V2)
  const [dynamicFilters, setDynamicFilters] = useState([]);
  const [categoryInfo, setCategoryInfo] = useState(null);

  // Available brands for filters (fallback, will be replaced by dynamic filters)
  const availableBrands = ["Apple", "Samsung", "Xiaomi", "Sony", "LG", "Lenovo", "HP", "Asus", "Acer", "Philips"];

  // 4a) Fetch dynamic filters when categorySlug changes
  useEffect(() => {
    if (!categorySlug) {
      setDynamicFilters([]);
      setCategoryInfo(null);
      return;
    }
    
    getCatalogFilters(categorySlug, language)
      .then((res) => {
        setDynamicFilters(res.filters || []);
        setCategoryInfo(res.category || null);
      })
      .catch((e) => {
        console.warn("Failed to load filters:", e);
        setDynamicFilters([]);
      });
  }, [categorySlug, language]);

  // 4b) fetch products on filter/page/category change
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setErr(null);

    // Build params for V2 API
    const params = { page, limit: 24 };
    if (filters.minPrice) params.min_price = filters.minPrice;
    if (filters.maxPrice) params.max_price = filters.maxPrice;
    if (filters.inStock) params.in_stock = true;
    
    // Map sort keys to backend format
    const sortMap = { pop: 'popular', new: 'new', price_asc: 'price_asc', price_desc: 'price_desc' };
    if (filters.sort) params.sort = sortMap[filters.sort] || filters.sort;
    if (filters.q) params.q = filters.q;
    
    // Add dynamic attribute filters
    if (filters.brands?.length) params.attr_brand = filters.brands.join(',');
    Object.keys(filters).forEach(key => {
      if (key.startsWith('attr_') && filters[key]) {
        params[key] = Array.isArray(filters[key]) ? filters[key].join(',') : filters[key];
      }
    });

    // Use V2 API if categorySlug is provided, otherwise fallback to old API
    const fetchPromise = categorySlug
      ? getCatalogProducts(categorySlug, params, language)
      : fetchProducts(filters, page, 24);

    fetchPromise
      .then((d) => {
        if (!alive) return;
        // Handle different response formats
        const items = d.products || d.items || [];
        const total = d.total || items.length;
        const pages = d.pages || Math.ceil(total / 24);
        setData({
          items,
          meta: { page, pages, total }
        });
      })
      .catch((e) => {
        if (!alive) return;
        setErr(e?.message || "Error");
      })
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
  }, [filters, page, categorySlug, language]);

  // 5) push state to URL
  const pushToUrl = (nextFilters, nextPage) => {
    const search = buildSearchFromFilters(nextFilters, nextPage);
    navigate({ pathname: location.pathname, search }, { replace: false });
  };

  const onFiltersApply = (nextFilters) => {
    pushToUrl(nextFilters, 1); // reset page on filter change
    setDrawerOpen(false);
  };

  const onFiltersChange = (nextFilters) => {
    pushToUrl(nextFilters, 1);
  };

  const onClearAll = () => {
    pushToUrl({
      q: "",
      brands: [],
      priceMin: null,
      priceMax: null,
      inStock: false,
      rating: null,
      category: filters.category, // keep category
      sort: "pop",
    }, 1);
  };

  const products = data.items || [];
  const pages = data.meta?.pages || 1;
  const total = data.meta?.total || 0;

  const texts = language === "uk" ? {
    catalog: "Каталог",
    found: "товарів",
    filters: "Фільтри",
    empty: "Нічого не знайдено",
    error: "Помилка",
    loading: "Завантаження...",
    sort: "Сортування",
    popular: "Популярні",
    new: "Новинки",
    priceAsc: "Ціна ↑",
    priceDesc: "Ціна ↓",
    close: "Закрити"
  } : {
    catalog: "Каталог",
    found: "товаров",
    filters: "Фильтры",
    empty: "Ничего не найдено",
    error: "Ошибка",
    loading: "Загрузка...",
    sort: "Сортировка",
    popular: "Популярные",
    new: "Новинки",
    priceAsc: "Цена ↑",
    priceDesc: "Цена ↓",
    close: "Закрыть"
  };

  return (
    <>
      <div className="ys-page">
        <section className="ys-section">
          <div className="ys-container">
            <div className="ys-catalog">
              {/* SIDEBAR (desktop) */}
              {!isMobile && (
                <aside className="ys-catalog-sidebar">
                  <FiltersSidebar
                    value={filters}
                    onApply={onFiltersApply}
                    onReset={onClearAll}
                    brands={availableBrands}
                    categorySlug={filters.category}
                  />
                </aside>
              )}

              {/* MAIN */}
              <main className="ys-catalog-main">
                {/* Toolbar */}
                <div className="ys-catalog-toolbar">
                  <div>
                    <h1 className="ys-catalog-title">{categoryInfo?.name || texts.catalog}</h1>
                    <p className="ys-catalog-subtitle">
                      {total} {texts.found}
                    </p>
                  </div>

                  {/* Mobile filters button */}
                  {isMobile && (
                    <button
                      className="ys-btn ys-btn-outline"
                      onClick={() => setDrawerOpen(true)}
                      style={{ height: 40, borderRadius: 12, padding: "0 16px", display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <SlidersHorizontal size={16} />
                      {texts.filters}
                    </button>
                  )}

                  {/* Custom Sort Dropdown */}
                  <SortDropdown
                    value={filters.sort || "pop"}
                    onChange={(val) => onFiltersChange({ ...filters, sort: val })}
                    options={[
                      { id: "pop", label: texts.popular },
                      { id: "new", label: texts.new },
                      { id: "price_asc", label: texts.priceAsc },
                      { id: "price_desc", label: texts.priceDesc },
                    ]}
                  />
                </div>

                {/* Active filter chips */}
                <ActiveFilterChips 
                  filters={filters} 
                  onChange={onFiltersChange} 
                  onClearAll={onClearAll} 
                />

                {/* Products */}
                {loading ? (
                  <ProductSkeletonGrid count={12} />
                ) : err ? (
                  <div className="ys-card ys-empty" style={{ padding: 40, background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb" }}>
                    {texts.error}: {err}
                  </div>
                ) : products.length === 0 ? (
                  <div className="ys-card ys-empty" style={{ padding: 40, background: "#fff", borderRadius: 16, border: "1px solid #e5e7eb" }}>
                    {texts.empty}
                  </div>
                ) : (
                  <div className="ys-products-grid">
                    {products.map((p) => (
                      <ProductCardCompact key={p.id} product={p} />
                    ))}
                  </div>
                )}

                {/* Pagination */}
                <Pagination
                  page={data.meta?.page || page}
                  pages={data.meta?.pages || 1}
                  onPage={(p) => pushToUrl(filters, p)}
                />
              </main>
            </div>
          </div>
        </section>
      </div>

      {/* Mobile filters drawer - B16 */}
      <MobileFiltersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onApply={() => onFiltersApply(filters)}
      >
        <FiltersSidebar
          value={filters}
          onApply={onFiltersApply}
          onReset={onClearAll}
          brands={availableBrands}
        />
      </MobileFiltersDrawer>
    </>
  );
}
