import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Search, X, ShieldCheck, ChevronDown, Check } from 'lucide-react';
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
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Search input state
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

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
    setSearchInput(searchParam);
  }, [searchParam]);

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
    setSearchInput('');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilter('search', searchInput.trim());
  };

  const sortOptions = [
    { label: 'Popularity', value: 'popularity' },
    { label: 'Spice: High to Low', value: 'spice_desc' },
    { label: 'Price: Low to High', value: 'price_asc' },
    { label: 'Price: High to Low', value: 'price_desc' },
    { label: 'Cured Date', value: 'newest' },
  ];

  const currentSortLabel = sortOptions.find((o) => o.value === orderingParam)?.label || 'Popularity';

  const activeFiltersCount = [categoryParam, searchParam, brandParam, spiceParam, dietaryParam, inStockParam ? 'true' : ''].filter(Boolean).length;

  return (
    <div className="bg-[#FAF9F6] text-[#1C1917] min-h-screen pb-16">
      {/* 1. STICKY SEARCH & CATEGORY PILL NAVIGATION */}
      <div className="sticky top-16 sm:top-20 z-30 bg-[#FAF9F6]/95 backdrop-blur-md border-b border-[#E7E5E4] px-4 sm:px-6 lg:px-8 py-3 shadow-xs">
        <div className="max-w-[1360px] mx-auto flex flex-col gap-2.5">
          {/* Search Pill */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full bg-[#efeeeb] rounded-full px-4 py-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#F59E0B] focus-within:shadow-sm transition-all">
            <Search size={17} className="text-stone-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search king chilli, smoked pork, axone, bamboo shoot..."
              className="w-full bg-transparent text-[#1C1917] text-xs sm:text-sm placeholder:text-stone-400 focus:outline-none"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); updateFilter('search', ''); }}
                className="text-stone-400 hover:text-[#1C1917] p-1"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
            <button
              type="submit"
              className="ml-2 px-3 py-1 bg-[#1C1917] hover:bg-[#0B2417] text-white text-xs font-bold rounded-full transition-colors flex-shrink-0"
            >
              Search
            </button>
          </form>

          {/* Category Filter Chips (Horizontal Scroll) */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              type="button"
              onClick={() => { updateFilter('dietary_type', ''); updateFilter('category', ''); updateFilter('spice_level', ''); }}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold active:scale-95 transition-all ${
                !dietaryParam && !categoryParam && !spiceParam
                  ? 'bg-[#1C1917] text-white shadow-xs'
                  : 'bg-[#efeeeb] text-[#1C1917] hover:bg-[#e3e2e0]'
              }`}
            >
              All ({totalCount})
            </button>

            <button
              type="button"
              onClick={() => updateFilter('dietary_type', dietaryParam === 'NON_VEG' ? '' : 'NON_VEG')}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all ${
                dietaryParam === 'NON_VEG'
                  ? 'bg-[#1C1917] text-white shadow-xs'
                  : 'bg-[#efeeeb] text-[#1C1917] hover:bg-[#e3e2e0]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
              <span>Non-Veg</span>
            </button>

            <button
              type="button"
              onClick={() => updateFilter('dietary_type', dietaryParam === 'VEG' ? '' : 'VEG')}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all ${
                dietaryParam === 'VEG'
                  ? 'bg-[#1C1917] text-white shadow-xs'
                  : 'bg-[#efeeeb] text-[#1C1917] hover:bg-[#e3e2e0]'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
              <span>Veg</span>
            </button>

            <button
              type="button"
              onClick={() => updateFilter('spice_level', spiceParam === 'FIERY_KING_CHILLI' ? '' : 'FIERY_KING_CHILLI')}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 text-[#F59E0B] active:scale-95 transition-all ${
                spiceParam === 'FIERY_KING_CHILLI'
                  ? 'bg-[#1C1917] text-white shadow-xs'
                  : 'bg-[#efeeeb] text-[#1C1917] hover:bg-[#e3e2e0]'
              }`}
            >
              <span>🔥</span>
              <span>Fiery Hot</span>
            </button>

            <button
              type="button"
              onClick={() => updateFilter('in_stock', inStockParam ? '' : 'true')}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 active:scale-95 transition-all ${
                inStockParam
                  ? 'bg-[#059669] text-white shadow-xs'
                  : 'bg-[#efeeeb] text-[#1C1917] hover:bg-[#e3e2e0]'
              }`}
            >
              <span>In Stock Only</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-4 space-y-4">
        {/* Brand Store Filter Indicator if active */}
        {brandParam && (
          <div className="flex items-center justify-between p-3.5 bg-[#0B2417] text-white rounded-2xl shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <span className="text-[#F59E0B] font-bold uppercase tracking-wider text-[10px]">Brand Store:</span>
              <span className="font-serif font-bold text-sm">
                {products[0]?.manufacturer?.business_name || brandParam.replace(/-/g, ' ')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => updateFilter('brand', '')}
              className="flex items-center gap-1 text-xs text-stone-300 hover:text-white px-3 py-1 rounded-full bg-white/10 border border-white/20"
            >
              <span>Clear</span>
              <X size={12} />
            </button>
          </div>
        )}

        {/* 2. ACTIVE RESULTS & SORT HEADER STRIP */}
        <div className="flex items-center justify-between pt-1 pb-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
            <span className="font-serif font-bold text-base sm:text-lg text-[#1C1917]">
              {totalCount} Artisanal Batches
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile filter button */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden flex items-center gap-1.5 bg-[#efeeeb] px-3 py-1.5 rounded-full text-xs font-bold text-[#1C1917]"
            >
              <Filter size={13} />
              <span>Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}</span>
            </button>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSortMenuOpen(!sortMenuOpen)}
                className="flex items-center gap-1.5 bg-[#efeeeb] hover:bg-[#e3e2e0] px-3.5 py-1.5 rounded-full text-[#1C1917] text-xs font-semibold transition-colors"
              >
                <span className="text-stone-500 font-normal">Sort:</span>
                <span className="font-bold">{currentSortLabel}</span>
                <ChevronDown size={14} className="text-stone-400" />
              </button>

              {sortMenuOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setSortMenuOpen(false)} />
                  <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-stone-200 py-1.5 z-40 text-xs">
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          updateFilter('ordering', opt.value);
                          setSortMenuOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 font-medium text-[#1C1917] hover:bg-stone-50 flex items-center justify-between"
                      >
                        <span className={orderingParam === opt.value ? 'font-bold text-[#0B2417]' : ''}>
                          {opt.label}
                        </span>
                        {orderingParam === opt.value && (
                          <Check size={14} className="text-[#059669]" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 3. ARTISANAL NARRATIVE TICKER */}
        <div className="bg-[#0B2417] text-[#FAF9F6] rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-[#F59E0B] shrink-0" />
            <p className="font-sans text-[11px] text-white/90 uppercase tracking-widest font-semibold truncate">
              Slow-Cured in Small Batches • Northeast Heritage
            </p>
          </div>
          <span className="font-sans text-xs text-[#F59E0B] font-bold shrink-0 ml-2">
            100% Raw
          </span>
        </div>

        {/* 4. MAIN PRODUCT GRID (2-Column Mobile, 4-Column Desktop) */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 pt-2">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block space-y-5">
            {/* Categories Filter */}
            <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#1C1917] border-b border-stone-100 pb-2">
                Categories
              </h3>
              <div className="space-y-1 text-xs font-medium">
                <button
                  onClick={() => updateFilter('category', '')}
                  className={`w-full text-left py-2 px-3 rounded-xl transition-all ${
                    !categoryParam ? 'bg-[#1C1917] text-white font-bold shadow-xs' : 'text-stone-700 hover:bg-[#f4f3f1]'
                  }`}
                >
                  All Pickles
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => updateFilter('category', c.slug)}
                    className={`w-full text-left py-2 px-3 rounded-xl transition-all flex items-center justify-between ${
                      categoryParam === c.slug ? 'bg-[#1C1917] text-white font-bold shadow-xs' : 'text-stone-700 hover:bg-[#f4f3f1]'
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${categoryParam === c.slug ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'}`}>
                      {c.product_count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Houses Filter */}
            {brands.length > 0 && (
              <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-3">
                <h3 className="font-serif font-bold text-sm text-[#1C1917] border-b border-stone-100 pb-2">
                  Official Brand Houses
                </h3>
                <div className="space-y-1 text-xs font-medium max-h-48 overflow-y-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => updateFilter('brand', '')}
                    className={`w-full text-left py-2 px-3 rounded-xl transition-all ${
                      !brandParam ? 'bg-[#1C1917] text-white font-bold shadow-xs' : 'text-stone-700 hover:bg-[#f4f3f1]'
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
                          isSelected ? 'bg-[#1C1917] text-white font-bold shadow-xs' : 'text-stone-700 hover:bg-[#f4f3f1]'
                        }`}
                      >
                        <span className="truncate">{b.business_name}</span>
                        <ShieldCheck size={12} className={isSelected ? 'text-[#F59E0B]' : 'text-[#059669]'} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dietary Filter */}
            <div className="bg-white p-5 rounded-2xl border border-[#E7E5E4] shadow-xs space-y-3">
              <h3 className="font-serif font-bold text-sm text-[#1C1917] border-b border-stone-100 pb-2">
                Dietary Type
              </h3>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'All Specialties', val: '' },
                  { label: 'Non-Veg', val: 'NON_VEG' },
                  { label: 'Veg', val: 'VEG' },
                  { label: 'Veg mixed with Non-Veg', val: 'VEG_MIXED' },
                ].map((opt) => (
                  <label key={opt.val} className="flex items-center gap-2.5 cursor-pointer text-stone-700 hover:text-[#1C1917] font-medium">
                    <input
                      type="radio"
                      name="dietary"
                      checked={dietaryParam === opt.val}
                      onChange={() => updateFilter('dietary_type', opt.val)}
                      className="text-[#0B2417] focus:ring-[#0B2417]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Reset Filters */}
            {activeFiltersCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="w-full py-2.5 bg-[#efeeeb] hover:bg-[#e3e2e0] text-[#1C1917] text-xs font-bold rounded-xl transition-colors"
              >
                Reset All Filters ({activeFiltersCount})
              </button>
            )}
          </aside>

          {/* Product Cards Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-80 bg-[#f4f3f1] rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : loadError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
                <h3 className="font-serif text-xl font-bold text-[#1C1917]">Products couldn’t be loaded</h3>
                <p className="mt-2 text-sm text-stone-600">{loadError}</p>
                <button
                  onClick={() => setRetryCount((count) => count + 1)}
                  className="mt-4 rounded-full bg-[#0B2417] px-6 py-2.5 text-xs font-bold text-white transition-colors hover:bg-black"
                >
                  Try again
                </button>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#E7E5E4] p-12 text-center space-y-4 shadow-xs">
                <div className="w-14 h-14 rounded-full bg-[#efeeeb] mx-auto flex items-center justify-center text-stone-400">
                  <Search size={24} />
                </div>
                <h3 className="font-serif font-bold text-xl text-[#1C1917]">No matching pickles found</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                  Try clearing selected spice or dietary filters to view all handcrafted items.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-5 py-2.5 bg-[#1C1917] hover:bg-[#0B2417] text-white text-xs font-bold rounded-full shadow-xs transition-colors"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && !loadError && totalCount > 0 && (
              <nav aria-label="Product pages" className="mt-10 flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={!hasPreviousPage}
                  onClick={() => updateFilter('page', String(pageParam - 1))}
                  className="rounded-full border border-stone-300 bg-white px-5 py-2 text-xs font-bold text-[#1C1917] transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-stone-500 font-medium">Page {pageParam}</span>
                <button
                  type="button"
                  disabled={!hasNextPage}
                  onClick={() => updateFilter('page', String(pageParam + 1))}
                  className="rounded-full border border-stone-300 bg-white px-5 py-2 text-xs font-bold text-[#1C1917] transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </nav>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Slide-Up Filter Drawer */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-stone-200">
            {/* Header */}
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-[#0B2417]" />
                <h3 className="font-serif font-bold text-base text-[#1C1917]">Filter Pickles</h3>
                {activeFiltersCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] text-xs font-bold">
                    {activeFiltersCount} active
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Filters Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Dietary */}
              <div>
                <h4 className="font-bold text-[#1C1917] mb-2">Dietary Preference</h4>
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
                          ? 'border-[#0B2417] bg-[#f4f3f1] text-[#0B2417] font-bold'
                          : 'border-stone-200 bg-stone-50 text-stone-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* In-Stock Toggle */}
              <div className="pt-2 border-t border-stone-100">
                <label className="flex items-center justify-between cursor-pointer py-1">
                  <span className="font-bold text-[#1C1917]">In-Stock Items Only</span>
                  <input
                    type="checkbox"
                    checked={inStockParam}
                    onChange={(e) => updateFilter('in_stock', e.target.checked ? 'true' : '')}
                    className="w-5 h-5 rounded text-[#0B2417] focus:ring-[#0B2417]"
                  />
                </label>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-stone-200 bg-stone-50 flex gap-3 pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
              <button
                type="button"
                onClick={() => { clearAllFilters(); setMobileFilterOpen(false); }}
                className="flex-1 py-3 text-stone-700 font-bold border border-stone-300 rounded-full hover:bg-stone-100 text-xs"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="flex-[2] py-3 bg-[#0B2417] text-white font-bold rounded-full shadow text-xs"
              >
                Apply & View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
