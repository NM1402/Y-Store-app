/**
 * Catalog v2.1 — real filter state with sorting
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api-client';
import telegram from '../lib/telegram-sdk';
import TopBar from '../components/TopBar';
import ProductCard from '../components/ProductCard-v2';
import Page from '../components/Page';
import './Catalog-v2.css';

const SORT_OPTIONS = [
  { id: 'popular', label: 'Популярні' },
  { id: 'price_asc', label: 'Дешевше' },
  { id: 'price_desc', label: 'Дорожче' },
  { id: 'discount', label: 'Зі знижкою' },
];

const Catalog = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    sort: 'popular',
    inStock: false,
  });

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryParam]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (categoryParam) params.category = categoryParam;
      const data = await api.getProducts(params);
      setProducts(data.items || data || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      telegram.showAlert('Помилка завантаження товарів');
    } finally {
      setLoading(false);
    }
  };

  const setSort = (sortId) => {
    telegram.haptic('light');
    setFilters((prev) => ({ ...prev, sort: sortId }));
  };

  const toggleInStock = () => {
    telegram.haptic('light');
    setFilters((prev) => ({ ...prev, inStock: !prev.inStock }));
  };

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (filters.inStock) {
      list = list.filter(p => p.in_stock !== false);
    }
    switch (filters.sort) {
      case 'price_asc':
        list.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price_desc':
        list.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'discount':
        list = list
          .filter(p => p.old_price && p.old_price > p.price)
          .sort((a, b) => {
            const da = 1 - a.price / a.old_price;
            const db = 1 - b.price / b.old_price;
            return db - da;
          });
        break;
      case 'popular':
      default:
        list.sort((a, b) => (b.popularity || b.views || 0) - (a.popularity || a.views || 0));
        break;
    }
    return list;
  }, [products, filters]);

  return (
    <Page>
      <div className="tma-page">
        <TopBar title="Каталог" />
        <div className="tma-page-content">
          <div className="catalog-v2" data-testid="catalog-screen">
            {/* Sort chips */}
            <div className="catalog-v2__filters" data-testid="catalog-filters">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  className={`catalog-v2__chip ${filters.sort === opt.id ? 'catalog-v2__chip--active' : ''}`}
                  onClick={() => setSort(opt.id)}
                  data-testid={`catalog-sort-${opt.id}`}
                >
                  {opt.label}
                </button>
              ))}
              <button
                className={`catalog-v2__chip catalog-v2__chip--toggle ${filters.inStock ? 'catalog-v2__chip--active' : ''}`}
                onClick={toggleInStock}
                data-testid="catalog-filter-instock"
              >
                В наявності
              </button>
            </div>

            {/* Grid */}
            {loading ? (
              <div className="catalog-v2__loading"><div className="spinner" /></div>
            ) : filteredProducts.length === 0 ? (
              <div className="catalog-v2__empty" data-testid="catalog-empty">
                За обраними фільтрами нічого не знайдено
              </div>
            ) : (
              <div className="catalog-v2__grid" data-testid="catalog-grid">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Page>
  );
};

export default Catalog;
