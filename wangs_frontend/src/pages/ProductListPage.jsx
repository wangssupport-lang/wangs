import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, SlidersHorizontal, Search, RefreshCw, X } from 'lucide-react';
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title & Breadcrumb */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl font-bold text-stone-900">
          Authentic Naga Pickles & Condiments
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Explore artisanal batches handcrafted in Kohima and Mokokchung with GI-tagged King Chilli and traditional oak curing.
        </p>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200/80 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg"
          >
            <Filter size={14} />
            <span>Filters</span>
          </button>

          <span className="text-xs text-stone-500">
            Showing <strong className="text-stone-900">{products.length}</strong> authentic products
          </span>

          {(categoryParam || searchParam || spiceParam || dietaryParam || inStockParam) && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-chilli-700 hover:underline flex items-center gap-1"
            >
              <X size={12} /> Clear all filters
            </button>
          )}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="sort" className="text-stone-500 font-medium">Sort by:</label>
          <select
            id="sort"
            value={orderingParam}
            onChange={(e) => updateFilter('ordering', e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-1 focus:ring-forest-700 font-medium"
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
        <aside className={`lg:block ${mobileFilterOpen ? 'block' : 'hidden'} space-y-6 bg-white lg:bg-transparent p-5 lg:p-0 rounded-xl border lg:border-none border-stone-200 shadow-sm lg:shadow-none`}>
          {/* Categories Filter */}
          <div className="border-b border-stone-200 pb-5">
            <h3 className="font-serif font-bold text-sm text-stone-900 mb-3">Categories</h3>
            <div className="space-y-1.5 text-xs">
              <button
                onClick={() => updateFilter('category', '')}
                className={`w-full text-left py-1 px-2 rounded-md transition-colors ${
                  !categoryParam ? 'bg-forest-900 text-white font-semibold' : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                All Pickles
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => updateFilter('category', c.slug)}
                  className={`w-full text-left py-1 px-2 rounded-md transition-colors flex items-center justify-between ${
                    categoryParam === c.slug ? 'bg-forest-900 text-white font-semibold' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <span>{c.name}</span>
                  <span className="text-[10px] opacity-75">{c.product_count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dietary Type Filter */}
          <div className="border-b border-stone-200 pb-5">
            <h3 className="font-serif font-bold text-sm text-stone-900 mb-3">Dietary Type</h3>
            <div className="space-y-1.5 text-xs">
              {[
                { label: 'All Types', val: '' },
                { label: 'Non-Vegetarian (Smoked Pork & Beef)', val: 'NON_VEG' },
                { label: '100% Vegetarian (Axone, Veg, Fruit)', val: 'VEG' },
              ].map((opt) => (
                <label key={opt.val} className="flex items-center gap-2 cursor-pointer text-stone-700 hover:text-stone-900">
                  <input
                    type="radio"
                    name="dietary"
                    checked={dietaryParam === opt.val}
                    onChange={() => updateFilter('dietary_type', opt.val)}
                    className="text-forest-800 focus:ring-forest-800"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Spice Level Filter */}
          <div className="border-b border-stone-200 pb-5">
            <h3 className="font-serif font-bold text-sm text-stone-900 mb-3">Heat / Spice Level</h3>
            <div className="space-y-1.5 text-xs">
              {[
                { label: 'All Levels', val: '' },
                { label: 'Mild Spice (Wild Fruit, Jaggery)', val: 'MILD' },
                { label: 'Medium Spice (Bamboo shoot)', val: 'MEDIUM' },
                { label: 'Hot Naga Spice', val: 'HOT' },
                { label: 'Fiery King Chilli 🌶️ (Raja Mircha)', val: 'FIERY_KING_CHILLI' },
              ].map((opt) => (
                <label key={opt.val} className="flex items-center gap-2 cursor-pointer text-stone-700 hover:text-stone-900">
                  <input
                    type="radio"
                    name="spice"
                    checked={spiceParam === opt.val}
                    onChange={() => updateFilter('spice_level', opt.val)}
                    className="text-chilli-700 focus:ring-chilli-700"
                  />
                  <span className={opt.val === 'FIERY_KING_CHILLI' ? 'text-chilli-700 font-semibold' : ''}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Stock Availability */}
          <div className="pb-4">
            <label className="flex items-center gap-2 text-xs text-stone-700 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={inStockParam}
                onChange={(e) => updateFilter('in_stock', e.target.checked ? 'true' : '')}
                className="rounded text-forest-800 focus:ring-forest-800"
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
                <div key={i} className="h-88 bg-stone-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-cream-100 mx-auto flex items-center justify-center mb-4">
                <Search size={24} className="text-stone-400" />
              </div>
              <h3 className="font-serif font-bold text-lg text-stone-900">No matching Naga pickles found</h3>
              <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
                Try adjusting your search keywords or clearing spice and dietary filters.
              </p>
              <button
                onClick={clearAllFilters}
                className="mt-4 px-4 py-2 bg-forest-800 text-white text-xs font-semibold rounded-lg hover:bg-forest-900"
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
