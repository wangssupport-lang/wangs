import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Search, X, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Filter states
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('search') || '';
  const brandParam = searchParams.get('brand') || searchParams.get('manufacturer') || '';
  const spiceParam = searchParams.get('spice_level') || '';
  const dietaryParam = searchParams.get('dietary_type') || '';
  const orderingParam = searchParams.get('ordering') || 'popularity';
  const inStockParam = searchParams.get('in_stock') === 'true';
  const pageParam = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);

  useEffect(() => {
    async function loadMeta() {
      try {
        const [cats, brnds] = await Promise.all([
          api.getCategories().catch(() => []),
          api.getBrands().catch(() => []),
        ]);
        setCategories(cats?.results || cats || []);
        setBrands(Array.isArray(brnds) ? brnds : brnds?.results || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadMeta();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      if (!cancelled) {
        setLoading(true);
        setLoadError('');
      }
      try {
        const params = {};
        if (categoryParam) params.category = categoryParam;
        if (searchParam) params.search = searchParam;
        if (brandParam) params.brand = brandParam;
        if (spiceParam) params.spice_level = spiceParam;
        if (dietaryParam) params.dietary_type = dietaryParam;
        if (orderingParam) params.ordering = orderingParam;
        if (inStockParam) params.in_stock = 'true';
        params.page = String(pageParam);

        const data = await api.getProducts(params);
        const results = Array.isArray(data) ? data : data?.results || [];
        if (cancelled) return;
        setProducts(results);
        setTotalCount(Array.isArray(data) ? data.length : data?.count || 0);
        setHasNextPage(Boolean(data?.next));
        setHasPreviousPage(Boolean(data?.previous));
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load products', err);
        setProducts([]);
        setTotalCount(0);
        setHasNextPage(false);
        setHasPreviousPage(false);
        setLoadError(err.message || 'Could not load products. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProducts();
    return () => {
      cancelled = true;
    };
  }, [categoryParam, searchParam, brandParam, spiceParam, dietaryParam, orderingParam, inStockParam, pageParam, retryCount]);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (key !== 'page') next.delete('page');
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const activeFiltersCount = [categoryParam, searchParam, brandParam, spiceParam, dietaryParam, inStockParam ? 'true' : ''].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cream-100 via-white to-cream-100 p-8 sm:p-10 rounded-3xl border border-stone-200/90 shadow-artisan flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-forest-700">Artisan Curation</span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-950 mt-1">
            Artisanal Pickles
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-2 max-w-xl leading-relaxed">
            Small-batch firewood-smoked meats, wild chillies, and mountain ferments.
          </p>
          {brandParam && (
            <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-900 text-cream-100 text-xs font-semibold shadow-sm">
              <span>Brand Store: <strong className="text-amber-300 font-bold">{products[0]?.manufacturer?.business_name || brandParam.replace(/-/g, ' ')}</strong></span>
              <button
                type="button"
                onClick={() => updateFilter('brand', '')}
                className="hover:text-amber-300 ml-1 p-0.5 rounded-full hover:bg-forest-800 transition-colors"
                title="Clear brand filter"
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>

        {activeFiltersCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="self-start sm:self-auto px-4 py-2 bg-chilli-50 hover:bg-chilli-100 text-chilli-700 border border-chilli-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <X size={13} /> Reset Filters ({activeFiltersCount})
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="lg:hidden flex items-center gap-2 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl"
          >
            <Filter size={14} />
            <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
          </button>

          <span className="text-xs text-stone-500 font-medium">
            Showing <strong className="text-stone-900 font-bold">{products.length}</strong> of{' '}
            <strong className="text-stone-900 font-bold">{totalCount}</strong> authentic products
          </span>
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="sort" className="text-stone-500 font-bold">Sort by:</label>
          <select
            id="sort"
            value={orderingParam}
            onChange={(e) => updateFilter('ordering', e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-forest-800 font-semibold"
          >
            <option value="popularity">Popularity & Bestsellers</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="newest">Newest Batches</option>
          </select>
        </div>
      </div>

      {/* Quick 1-Tap Mobile Filter Chips (Horizontal Scroll) */}
      <div className="flex lg:hidden items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 -mt-4">
        <button
          type="button"
          onClick={() => updateFilter('dietary_type', '')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            !dietaryParam ? 'bg-forest-900 text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          All Types
        </button>
        <button
          type="button"
          onClick={() => updateFilter('dietary_type', dietaryParam === 'NON_VEG' ? '' : 'NON_VEG')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            dietaryParam === 'NON_VEG' ? 'bg-forest-900 text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          Non-Veg
        </button>
        <button
          type="button"
          onClick={() => updateFilter('dietary_type', dietaryParam === 'VEG' ? '' : 'VEG')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            dietaryParam === 'VEG' ? 'bg-forest-900 text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          Veg
        </button>
        <button
          type="button"
          onClick={() => updateFilter('in_stock', inStockParam ? '' : 'true')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
            inStockParam ? 'bg-emerald-700 text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          <span>In Stock</span>
        </button>
        <button
          type="button"
          onClick={() => updateFilter('spice_level', spiceParam === 'FIERY_KING_CHILLI' ? '' : 'FIERY_KING_CHILLI')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            spiceParam === 'FIERY_KING_CHILLI' ? 'bg-chilli-700 text-white shadow-xs' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
          }`}
        >
          🔥 King Chilli
        </button>
      </div>

      {/* Main Grid with Sidebar Filter */}
      <div className="grid grid-cols-1 gap-5 sm:gap-8 lg:grid-cols-4">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden lg:block space-y-6">
          {/* Categories Filter */}
          <div className="bg-white lg:p-5 lg:rounded-2xl lg:border lg:border-stone-200/80 lg:shadow-sm space-y-3">
            <h3 className="font-serif font-bold text-sm text-stone-950 border-b border-stone-100 pb-2">
              Categories
            </h3>
            <div className="space-y-1 text-xs font-medium">
              <button
                onClick={() => updateFilter('category', '')}
                className={`w-full text-left py-2 px-3 rounded-xl transition-all ${
                  !categoryParam ? 'bg-forest-900 text-white font-bold shadow-sm' : 'text-stone-700 hover:bg-cream-100'
                }`}
              >
                All Pickles
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => updateFilter('category', c.slug)}
                  className={`w-full text-left py-2 px-3 rounded-xl transition-all flex items-center justify-between ${
                    categoryParam === c.slug ? 'bg-forest-900 text-white font-bold shadow-sm' : 'text-stone-700 hover:bg-cream-100'
                  }`}
                >
                  <span>{c.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${categoryParam === c.slug ? 'bg-forest-800 text-white' : 'bg-stone-100 text-stone-500'}`}>
                    {c.product_count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Brand Houses Filter */}
          {brands.length > 0 && (
            <div className="bg-white lg:p-5 lg:rounded-2xl lg:border lg:border-stone-200/80 lg:shadow-sm space-y-3">
              <h3 className="font-serif font-bold text-sm text-stone-950 border-b border-stone-100 pb-2">
                Brand Houses
              </h3>
              <div className="space-y-1 text-xs font-medium max-h-48 overflow-y-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => updateFilter('brand', '')}
                  className={`w-full text-left py-2 px-3 rounded-xl transition-all ${
                    !brandParam ? 'bg-forest-900 text-white font-bold shadow-sm' : 'text-stone-700 hover:bg-cream-100'
                  }`}
                >
                  All Brand Houses
                </button>
                {brands.map((b) => {
                  const bSlug = b.slug || b.business_name;
                  const isSelected = brandParam.toLowerCase() === bSlug.toLowerCase() || (b.business_name && brandParam.toLowerCase() === b.business_name.toLowerCase());
                  return (
                    <button
                      key={b.id || b.slug}
                      type="button"
                      onClick={() => updateFilter('brand', bSlug)}
                      className={`w-full text-left py-2 px-3 rounded-xl transition-all flex items-center justify-between ${
                        isSelected ? 'bg-forest-900 text-white font-bold shadow-sm' : 'text-stone-700 hover:bg-cream-100'
                      }`}
                    >
                      <span className="truncate">{b.business_name}</span>
                      <ShieldCheck size={12} className={isSelected ? 'text-amber-300' : 'text-emerald-600'} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dietary Type Filter */}
          <div className="bg-white lg:p-5 lg:rounded-2xl lg:border lg:border-stone-200/80 lg:shadow-sm space-y-3">
            <h3 className="font-serif font-bold text-sm text-stone-950 border-b border-stone-100 pb-2">
              Dietary Preference
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { label: 'All Specialties', val: '' },
                { label: 'Non-Veg', val: 'NON_VEG' },
                { label: 'Veg', val: 'VEG' },
                { label: 'Veg mixed with Non-Veg', val: 'VEG_MIXED' },
              ].map((opt) => (
                <label key={opt.val} className="flex items-center gap-2.5 cursor-pointer text-stone-700 hover:text-stone-950 font-medium">
                  <input
                    type="radio"
                    name="dietary"
                    checked={dietaryParam === opt.val}
                    onChange={() => updateFilter('dietary_type', opt.val)}
                    className="text-forest-900 focus:ring-forest-900"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Spice Level Filter */}
          <div className="bg-white lg:p-5 lg:rounded-2xl lg:border lg:border-stone-200/80 lg:shadow-sm space-y-3">
            <h3 className="font-serif font-bold text-sm text-stone-950 border-b border-stone-100 pb-2">
              Heat / Scoville Spectrum
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { label: 'All Heat Levels', val: '' },
                { label: 'Mild Spice (Jaggery, Wild Apple)', val: 'MILD' },
                { label: 'Medium Spice (Bamboo shoot)', val: 'MEDIUM' },
                { label: 'Hot Firewood Spice', val: 'HOT' },
                { label: 'Fiery King Chilli (Raja Mircha)', val: 'FIERY_KING_CHILLI' },
              ].map((opt) => (
                <label key={opt.val} className="flex items-center gap-2.5 cursor-pointer text-stone-700 hover:text-stone-950 font-medium">
                  <input
                    type="radio"
                    name="spice"
                    checked={spiceParam === opt.val}
                    onChange={() => updateFilter('spice_level', opt.val)}
                    className="text-chilli-700 focus:ring-chilli-700"
                  />
                  <span className={opt.val === 'FIERY_KING_CHILLI' ? 'text-chilli-700 font-bold' : ''}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Stock Availability */}
          <div className="bg-white lg:p-5 lg:rounded-2xl lg:border lg:border-stone-200/80 lg:shadow-sm">
            <label className="flex items-center gap-2.5 text-xs text-stone-800 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={inStockParam}
                onChange={(e) => updateFilter('in_stock', e.target.checked ? 'true' : '')}
                className="rounded text-forest-900 focus:ring-forest-900"
              />
              <span>In-stock items only</span>
            </label>
          </div>
        </aside>

        {/* Product Cards Grid */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-96 bg-stone-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
              <h3 className="font-serif text-xl font-bold text-stone-900">Products couldn’t be loaded</h3>
              <p className="mt-2 text-sm text-stone-600">{loadError}</p>
              <button
                onClick={() => setRetryCount((count) => count + 1)}
                className="mt-4 rounded-xl bg-forest-900 px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-forest-950"
              >
                Try again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-14 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-cream-100 mx-auto flex items-center justify-center text-stone-400">
                <Search size={28} />
              </div>
              <h3 className="font-serif font-bold text-xl text-stone-900">No matching pickles found</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                Try clearing selected spice or dietary filters to view all handcrafted items.
              </p>
              <button
                onClick={clearAllFilters}
                className="px-5 py-2.5 bg-forest-900 text-white text-xs font-bold rounded-xl shadow-md hover:bg-forest-950 transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          {!loading && !loadError && totalCount > 0 && (
            <nav aria-label="Product pages" className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                disabled={!hasPreviousPage}
                onClick={() => updateFilter('page', String(pageParam - 1))}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-stone-500">Page {pageParam}</span>
              <button
                type="button"
                disabled={!hasNextPage}
                onClick={() => updateFilter('page', String(pageParam + 1))}
                className="rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          )}
        </div>
      </div>

      {/* Mobile Slide-Up Filter Drawer (App-like Bottom Sheet) */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden bg-stone-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-stone-200 animate-slide-up">
            {/* Header */}
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-forest-900" />
                <h3 className="font-serif font-bold text-base text-stone-900">Filter Pickles</h3>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-forest-100 text-forest-900 text-xs font-bold">
                    {activeFiltersCount} active
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Filters Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Dietary */}
              <div>
                <h4 className="font-bold text-stone-900 mb-2">Dietary Preference</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'All Types', val: '' },
                    { label: 'Non-Veg', val: 'NON_VEG' },
                    { label: 'Veg', val: 'VEG' },
                    { label: 'Veg Mixed', val: 'VEG_MIXED' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => updateFilter('dietary_type', opt.val)}
                      className={`py-2 px-3 rounded-xl font-medium text-left border transition-all ${
                        dietaryParam === opt.val
                          ? 'border-forest-900 bg-forest-50 text-forest-950 font-bold'
                          : 'border-stone-200 bg-stone-50 text-stone-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <h4 className="font-bold text-stone-900 mb-2">Categories</h4>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateFilter('category', '')}
                    className={`px-3 py-1.5 rounded-xl border text-xs transition-all ${
                      !categoryParam ? 'border-forest-900 bg-forest-900 text-white font-bold' : 'border-stone-200 bg-stone-50 text-stone-700'
                    }`}
                  >
                    All
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => updateFilter('category', c.slug)}
                      className={`px-3 py-1.5 rounded-xl border text-xs transition-all ${
                        categoryParam === c.slug ? 'border-forest-900 bg-forest-900 text-white font-bold' : 'border-stone-200 bg-stone-50 text-stone-700'
                      }`}
                    >
                      {c.name} ({c.product_count})
                    </button>
                  ))}
                </div>
              </div>

              {/* In-Stock Toggle */}
              <div className="pt-2 border-t border-stone-100">
                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="font-bold text-stone-900">In-Stock Items Only</span>
                  <input
                    type="checkbox"
                    checked={inStockParam}
                    onChange={(e) => updateFilter('in_stock', e.target.checked ? 'true' : '')}
                    className="w-5 h-5 rounded text-forest-900 focus:ring-forest-900"
                  />
                </label>
              </div>

              {/* Spice Spectrum */}
              <div className="pt-2 border-t border-stone-100">
                <h4 className="font-bold text-stone-900 mb-2">Heat Spectrum</h4>
                <div className="space-y-1.5">
                  {[
                    { label: 'All Heat Levels', val: '' },
                    { label: 'Mild Spice', val: 'MILD' },
                    { label: 'Medium Spice', val: 'MEDIUM' },
                    { label: 'Hot Firewood Spice', val: 'HOT' },
                    { label: 'Fiery King Chilli (Raja Mircha)', val: 'FIERY_KING_CHILLI' },
                  ].map((opt) => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => updateFilter('spice_level', opt.val)}
                      className={`w-full py-2 px-3 rounded-xl font-medium text-left border transition-all ${
                        spiceParam === opt.val
                          ? 'border-forest-900 bg-forest-50 text-forest-950 font-bold'
                          : 'border-stone-200 bg-stone-50 text-stone-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex gap-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
              <button
                type="button"
                onClick={() => { clearAllFilters(); setMobileFilterOpen(false); }}
                className="flex-1 py-3 text-stone-700 font-bold border border-stone-300 rounded-xl hover:bg-stone-100 active:scale-95 transition-all text-xs"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="flex-[2] py-3 bg-forest-900 text-white font-bold rounded-xl shadow active:scale-95 transition-all text-xs"
              >
                Apply & View Products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
