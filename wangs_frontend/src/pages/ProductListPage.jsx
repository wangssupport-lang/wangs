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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-4 sm:space-y-6">
      {/* Brand Store Filter Indicator if active */}
      {brandParam && (
        <div className="flex items-center justify-between p-3.5 sm:p-4 bg-primary text-on-primary rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="text-secondary-fixed font-bold uppercase tracking-wider text-[10px]">Brand Store:</span>
            <span className="text-white font-serif font-bold text-sm">
              {products[0]?.manufacturer?.business_name || brandParam.replace(/-/g, ' ')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => updateFilter('brand', '')}
            className="flex items-center gap-1 text-xs text-white/90 hover:text-white px-2.5 py-1 rounded-lg bg-primary-container border border-white/20 active:scale-95 transition-all"
          >
            <span>Clear</span>
            <X size={12} />
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-surface-container-lowest p-3.5 sm:p-5 rounded-2xl border border-outline-variant/30 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="lg:hidden flex items-center gap-2 px-3.5 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold rounded-xl border border-outline-variant/30"
          >
            <Filter size={14} className="text-primary" />
            <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
          </button>

          <span className="text-xs text-on-surface-variant font-medium">
            Showing <strong className="text-on-surface font-bold">{products.length}</strong> of{' '}
            <strong className="text-on-surface font-bold">{totalCount}</strong> authentic products
          </span>

          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-primary hover:underline font-bold ml-1 hidden sm:inline"
            >
              Reset ({activeFiltersCount})
            </button>
          )}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="sort" className="text-on-surface-variant font-bold">Sort by:</label>
          <select
            id="sort"
            value={orderingParam}
            onChange={(e) => updateFilter('ordering', e.target.value)}
            className="bg-surface-container-low border border-outline-variant/40 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-semibold"
          >
            <option value="popularity">Popularity &amp; Bestsellers</option>
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
            !dietaryParam ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant/30'
          }`}
        >
          All Types
        </button>
        <button
          type="button"
          onClick={() => updateFilter('dietary_type', dietaryParam === 'NON_VEG' ? '' : 'NON_VEG')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            dietaryParam === 'NON_VEG' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant/30'
          }`}
        >
          Non-Veg
        </button>
        <button
          type="button"
          onClick={() => updateFilter('dietary_type', dietaryParam === 'VEG' ? '' : 'VEG')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            dietaryParam === 'VEG' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant/30'
          }`}
        >
          Veg
        </button>
        <button
          type="button"
          onClick={() => updateFilter('in_stock', inStockParam ? '' : 'true')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
            inStockParam ? 'bg-tertiary text-on-tertiary shadow-xs' : 'bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant/30'
          }`}
        >
          <span>In Stock</span>
        </button>
        <button
          type="button"
          onClick={() => updateFilter('spice_level', spiceParam === 'FIERY_KING_CHILLI' ? '' : 'FIERY_KING_CHILLI')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            spiceParam === 'FIERY_KING_CHILLI' ? 'bg-primary text-on-primary shadow-xs' : 'bg-surface-container text-on-surface hover:bg-surface-container-high border border-outline-variant/30'
          }`}
        >
          🌶️ King Chilli
        </button>
      </div>

      {/* Main Grid with Sidebar Filter */}
      <div className="grid grid-cols-1 gap-5 sm:gap-8 lg:grid-cols-4">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden lg:block space-y-6">
          {/* Categories Filter */}
          <div className="bg-surface-container-lowest lg:p-5 lg:rounded-2xl lg:border lg:border-outline-variant/30 lg:shadow-xs space-y-3">
            <h3 className="font-serif font-bold text-sm text-on-surface border-b border-outline-variant/20 pb-2">
              Categories
            </h3>
            <div className="space-y-1 text-xs font-medium">
              <button
                onClick={() => updateFilter('category', '')}
                className={`w-full text-left py-2 px-3 rounded-xl transition-all ${
                  !categoryParam ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
                }`}
              >
                All Pickles
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => updateFilter('category', c.slug)}
                  className={`w-full text-left py-2 px-3 rounded-xl transition-all flex items-center justify-between ${
                    categoryParam === c.slug ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
                  }`}
                >
                  <span>{c.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${categoryParam === c.slug ? 'bg-primary-container text-white' : 'bg-surface-container text-on-surface-variant'}`}>
                    {c.product_count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Brand Houses Filter */}
          {brands.length > 0 && (
            <div className="bg-surface-container-lowest lg:p-5 lg:rounded-2xl lg:border lg:border-outline-variant/30 lg:shadow-xs space-y-3">
              <h3 className="font-serif font-bold text-sm text-on-surface border-b border-outline-variant/20 pb-2">
                Brand Houses
              </h3>
              <div className="space-y-1 text-xs font-medium max-h-48 overflow-y-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => updateFilter('brand', '')}
                  className={`w-full text-left py-2 px-3 rounded-xl transition-all ${
                    !brandParam ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
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
                        isSelected ? 'bg-primary text-on-primary font-bold shadow-xs' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-primary'
                      }`}
                    >
                      <span className="truncate">{b.business_name}</span>
                      <ShieldCheck size={12} className={isSelected ? 'text-secondary-fixed' : 'text-tertiary'} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dietary Type Filter */}
          <div className="bg-surface-container-lowest lg:p-5 lg:rounded-2xl lg:border lg:border-outline-variant/30 lg:shadow-xs space-y-3">
            <h3 className="font-serif font-bold text-sm text-on-surface border-b border-outline-variant/20 pb-2">
              Dietary Preference
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { label: 'All Specialties', val: '' },
                { label: 'Non-Veg', val: 'NON_VEG' },
                { label: 'Veg', val: 'VEG' },
                { label: 'Veg mixed with Non-Veg', val: 'VEG_MIXED' },
              ].map((opt) => (
                <label key={opt.val} className="flex items-center gap-2.5 cursor-pointer text-on-surface-variant hover:text-on-surface font-medium">
                  <input
                    type="radio"
                    name="dietary"
                    checked={dietaryParam === opt.val}
                    onChange={() => updateFilter('dietary_type', opt.val)}
                    className="text-primary focus:ring-primary accent-primary"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Spice Level Filter */}
          <div className="bg-surface-container-lowest lg:p-5 lg:rounded-2xl lg:border lg:border-outline-variant/30 lg:shadow-xs space-y-3">
            <h3 className="font-serif font-bold text-sm text-on-surface border-b border-outline-variant/20 pb-2">
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
                <label key={opt.val} className="flex items-center gap-2.5 cursor-pointer text-on-surface-variant hover:text-on-surface font-medium">
                  <input
                    type="radio"
                    name="spice"
                    checked={spiceParam === opt.val}
                    onChange={() => updateFilter('spice_level', opt.val)}
                    className="text-primary focus:ring-primary accent-primary"
                  />
                  <span className={opt.val === 'FIERY_KING_CHILLI' ? 'text-primary font-bold' : ''}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Stock Availability */}
          <div className="bg-surface-container-lowest lg:p-5 lg:rounded-2xl lg:border lg:border-outline-variant/30 lg:shadow-xs">
            <label className="flex items-center gap-2.5 text-xs text-on-surface font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={inStockParam}
                onChange={(e) => updateFilter('in_stock', e.target.checked ? 'true' : '')}
                className="rounded text-primary focus:ring-primary accent-primary"
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
                <div key={i} className="h-96 bg-surface-container-low rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-3xl border border-error/30 bg-error-container/20 p-10 text-center">
              <h3 className="font-serif text-xl font-bold text-on-surface">Products couldn’t be loaded</h3>
              <p className="mt-2 text-sm text-on-surface-variant">{loadError}</p>
              <button
                onClick={() => setRetryCount((count) => count + 1)}
                className="mt-4 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-on-primary transition-colors hover:bg-primary-container"
              >
                Try again
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 p-14 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-surface-container mx-auto flex items-center justify-center text-outline">
                <Search size={28} />
              </div>
              <h3 className="font-serif font-bold text-xl text-on-surface">No matching pickles found</h3>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                Try clearing selected spice or dietary filters to view all handcrafted items.
              </p>
              <button
                onClick={clearAllFilters}
                className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold rounded-xl shadow-xs hover:bg-primary-container transition-colors"
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
                className="rounded-xl border border-outline-variant/30 px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-on-surface-variant">Page {pageParam}</span>
              <button
                type="button"
                disabled={!hasNextPage}
                onClick={() => updateFilter('page', String(pageParam + 1))}
                className="rounded-xl border border-outline-variant/30 px-4 py-2 text-sm font-medium text-on-surface transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </nav>
          )}
        </div>
      </div>

      {/* Mobile Slide-Up Filter Drawer (App-like Bottom Sheet - Solid, No Glass) */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden bg-stone-950/70 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-outline-variant/30 animate-slide-up">
            {/* Header */}
            <div className="px-5 py-4 border-b border-outline-variant/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-primary" />
                <h3 className="font-serif font-bold text-base text-on-surface">Filter Pickles</h3>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-bold">
                    {activeFiltersCount} active
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="p-1.5 rounded-full text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Filters Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Dietary */}
              <div>
                <h4 className="font-bold text-on-surface mb-2">Dietary Preference</h4>
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
                          ? 'border-primary bg-primary text-on-primary font-bold'
                          : 'border-outline-variant/30 bg-surface-container text-on-surface'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categories */}
              <div>
                <h4 className="font-bold text-on-surface mb-2">Categories</h4>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateFilter('category', '')}
                    className={`px-3 py-1.5 rounded-xl border text-xs transition-all ${
                      !categoryParam ? 'border-primary bg-primary text-on-primary font-bold' : 'border-outline-variant/30 bg-surface-container text-on-surface'
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
                        categoryParam === c.slug ? 'border-primary bg-primary text-on-primary font-bold' : 'border-outline-variant/30 bg-surface-container text-on-surface'
                      }`}
                    >
                      {c.name} ({c.product_count})
                    </button>
                  ))}
                </div>
              </div>

              {/* In-Stock Toggle */}
              <div className="pt-2 border-t border-outline-variant/20">
                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="font-bold text-on-surface">In-Stock Items Only</span>
                  <input
                    type="checkbox"
                    checked={inStockParam}
                    onChange={(e) => updateFilter('in_stock', e.target.checked ? 'true' : '')}
                    className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary"
                  />
                </label>
              </div>

              {/* Spice Spectrum */}
              <div className="pt-2 border-t border-outline-variant/20">
                <h4 className="font-bold text-on-surface mb-2">Heat Spectrum</h4>
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
                          ? 'border-primary bg-primary text-on-primary font-bold'
                          : 'border-outline-variant/30 bg-surface-container text-on-surface'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low flex gap-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
              <button
                type="button"
                onClick={() => { clearAllFilters(); setMobileFilterOpen(false); }}
                className="flex-1 py-3 text-on-surface font-bold border border-outline-variant/40 rounded-xl hover:bg-surface-container active:scale-95 transition-all text-xs"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="flex-[2] py-3 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl shadow-xs active:scale-95 transition-all text-xs"
              >
                Apply &amp; View Products
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
