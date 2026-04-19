import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { productsAPI, categoriesAPI } from '../utils/api';
import ProductCardCompact from '../components/ProductCardCompact';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { Label } from '../components/ui/label';
import { Filter, X, Grid, List, ArrowUpDown, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Products = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [expandedCategories, setExpandedCategories] = useState([]);
  const [categorySearch, setCategorySearch] = useState('');

  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('category') || '';

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [search, categoryId, sortBy]);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (categoryId) params.category_id = categoryId;
      if (priceRange[0] > 0) params.min_price = priceRange[0];
      if (priceRange[1] < 1000) params.max_price = priceRange[1];
      if (sortBy) params.sort_by = sortBy;
      
      const response = await productsAPI.getAll(params);
      setProducts(response.data);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (catId) => {
    if (catId === categoryId) {
      searchParams.delete('category');
    } else {
      searchParams.set('category', catId);
    }
    setSearchParams(searchParams);
  };

  const toggleCategory = (catId) => {
    setExpandedCategories(prev => 
      prev.includes(catId) 
        ? prev.filter(id => id !== catId)
        : [...prev, catId]
    );
  };

  const handleSortChange = (value) => {
    setSortBy(value);
  };

  const clearFilters = () => {
    setSearchParams({});
    setPriceRange([0, 1000]);
    setSortBy('newest');
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F7F7F7]">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 py-6">
        <div className="container-main px-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {search ? `${t('searchResults')}: "${search}"` : t('catalogTitle')}
            </h1>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="lg:hidden rounded-xl"
            >
              <Filter className="w-4 h-4 mr-2" />
              {t('filters')}
            </Button>
          </div>
        </div>
      </div>

      <div className="container-main px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - Filters */}
          <div className={`${
            showFilters ? 'block' : 'hidden'
          } lg:block w-full lg:w-72 flex-shrink-0`}>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden sticky top-6 shadow-sm">
              {/* Price Filter */}
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-semibold text-base text-gray-900 mb-4">{t('priceLabel')}</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                      placeholder={t('from')}
                    />
                    <span className="text-gray-400">—</span>
                    <input
                      type="number"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 1000])}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                      placeholder={t('to')}
                    />
                  </div>
                  <Slider
                    min={0}
                    max={1000}
                    step={10}
                    value={priceRange}
                    onValueChange={setPriceRange}
                    className="py-2"
                  />
                  <Button
                    onClick={fetchProducts}
                    className="w-full bg-green-600 hover:bg-green-700 rounded-xl h-11 font-medium"
                  >
                    {t('apply')}
                  </Button>
                </div>
              </div>

              {/* Categories Filter */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-base text-gray-900">{t('section')}</h3>
                  {categoryId && (
                    <button
                      onClick={() => handleCategoryChange('')}
                      className="text-sm text-green-600 hover:text-green-700 font-medium"
                    >
                      {t('reset')}
                    </button>
                  )}
                </div>

                {/* Category Search */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    placeholder={t('search')}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                  />
                </div>

                {/* Categories List */}
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {filteredCategories.map((category) => (
                    <div key={category.id}>
                      <div
                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
                          categoryId === category.id
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'hover:bg-gray-50 border border-transparent'
                        }`}
                      >
                        <div 
                          className="flex items-center gap-3 flex-1"
                          onClick={() => handleCategoryChange(category.id)}
                        >
                          <input
                            type="checkbox"
                            checked={categoryId === category.id}
                            onChange={() => handleCategoryChange(category.id)}
                            className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="flex-1 text-sm font-medium">
                            {category.name}
                          </span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {products.filter(p => p.category_id === category.id).length}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCategory(category.id);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors ml-1"
                        >
                          {expandedCategories.includes(category.id) ? (
                            <ChevronDown className="w-4 h-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                      </div>
                      
                      {/* Subcategories placeholder */}
                      {expandedCategories.includes(category.id) && (
                        <div className="ml-6 mt-1 space-y-1">
                          <div className="text-xs text-gray-400 p-2">
                            {t('subcategories')}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Products */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Sort */}
                  <Select value={sortBy} onValueChange={handleSortChange}>
                    <SelectTrigger className="w-[200px] h-11 rounded-xl border-gray-200 focus:border-green-500 focus:ring-green-100">
                      <ArrowUpDown className="w-4 h-4 mr-2 text-gray-500" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-gray-200 shadow-lg">
                      <SelectItem value="popularity" className="rounded-lg">{t('sortByPopularity')}</SelectItem>
                      <SelectItem value="newest" className="rounded-lg">{t('newest')}</SelectItem>
                      <SelectItem value="price_asc" className="rounded-lg">{t('priceLowToHigh')}</SelectItem>
                      <SelectItem value="price_desc" className="rounded-lg">{t('priceHighToLow')}</SelectItem>
                      <SelectItem value="rating" className="rounded-lg">{t('byRating')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* View Mode */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2.5 rounded-lg transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white shadow-sm text-green-600'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Grid className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2.5 rounded-lg transition-all ${
                      viewMode === 'list'
                        ? 'bg-white shadow-sm text-green-600'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <List className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Results count */}
              <div className="mt-3 text-sm text-gray-500">
                {t('foundProducts')}: <span className="font-semibold text-gray-900">{products.length}</span>
              </div>
            </div>

            {/* Products Grid */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
                <p className="text-gray-500 text-lg">{t('noProductsFound')}</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4'
                : 'space-y-4'
              }>
                {products.map((product) => (
                  <ProductCardCompact 
                    key={product.id} 
                    product={product} 
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Products;