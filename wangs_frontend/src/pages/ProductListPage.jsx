import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, SlidersHorizontal, Search, RefreshCw, X, Flame, Sparkles } from 'lucide-react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';

export default function ProductListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Filter states
  const categoryParam = searchParams.get('category') || '';
  const searchParam = searchParams.get('search') || '';
  const spiceParam = searchParams.get('spice_level') || '';
  const dietaryParam = searchParams.get('dietary_type') || '';
  const orderingParam = searchParams.get('ordering') || 'popularity';
  const inStockParam = searchParams.get('in_stock') === 'true';

  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await api.getCategories();
        setCategories(cats?.results || cats || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      try {
        const params = {};
        if (categoryParam) params.category = categoryParam;
        if (searchParam) params.search = searchParam;
        if (spiceParam) params.spice_level = spiceParam;
        if (dietaryParam) params.dietary_type = dietaryParam;
        if (orderingParam) params.ordering = orderingParam;
        if (inStockParam) params.in_stock = 'true';

        const data = await api.getProducts(params);
        setProducts(data.results || data || []);
      } catch (err) {
        console.error('Failed to load products', err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, [categoryParam, searchParam, spiceParam, dietaryParam, orderingParam, inStockParam]);

  const updateFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
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

  const activeFiltersCount = [categoryParam, searchParam, spiceParam, dietaryParam, inStockParam ? 'true' : ''].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cream-100 via-white to-cream-100 p-8 sm:p-10 rounded-3xl border border-stone-200/90 shadow-artisan flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-forest-700">Artisan Curation</span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-950 mt-1">
            Naga Pickle Pantry
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-2 max-w-xl leading-relaxed">
            Authentic firewood-smoked meats, fermented bamboo shoot, and wild King Chilli preserves handcrafted in Kohima and Mokokchung.
          </p>
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
            Showing <strong className="text-stone-900 font-bold">{products.length}</strong> authentic products
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

      {/* Main Grid with Sidebar Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Filter Sidebar */}
        <aside className={`lg:block ${mobileFilterOpen ? 'block' : 'hidden'} space-y-6 bg-white lg:bg-transparent p-6 lg:p-0 rounded-3xl border lg:border-none border-stone-200 shadow-artisan lg:shadow-none`}>
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

          {/* Dietary Type Filter */}
          <div className="bg-white lg:p-5 lg:rounded-2xl lg:border lg:border-stone-200/80 lg:shadow-sm space-y-3">
            <h3 className="font-serif font-bold text-sm text-stone-950 border-b border-stone-100 pb-2">
              Dietary Preference
            </h3>
            <div className="space-y-2 text-xs">
              {[
                { label: 'All Specialties', val: '' },
                { label: 'Non-Vegetarian (Smoked Pork & Beef)', val: 'NON_VEG' },
                { label: '100% Vegetarian (Axone, Veg, Fruit)', val: 'VEG' },
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
                { label: 'Hot Naga Spice (Firewood pork)', val: 'HOT' },
                { label: 'Fiery King Chilli 🌶️ (Raja Mircha)', val: 'FIERY_KING_CHILLI' },
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-96 bg-stone-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-14 text-center space-y-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-cream-100 mx-auto flex items-center justify-center text-stone-400">
                <Search size={28} />
              </div>
              <h3 className="font-serif font-bold text-xl text-stone-900">No matching Naga pickles found</h3>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
