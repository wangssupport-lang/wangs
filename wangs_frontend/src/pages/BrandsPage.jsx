import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Store } from 'lucide-react';
import { api } from '../api';
import BrandCard from '../components/BrandCard';
import { getBrandsFromProducts } from '../utils/brands';

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadBrands() {
      setLoading(true);
      setError('');
      try {
        const brandsData = await api.getBrands();
        if (brandsData && brandsData.length > 0) {
          if (!cancelled) setBrands(brandsData);
        } else {
          const [bestsellers, featured] = await Promise.all([
            api.getBestsellerProducts(),
            api.getFeaturedProducts(),
          ]);
          if (!cancelled) setBrands(getBrandsFromProducts(bestsellers, featured));
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to load brands', err);
          setError(err.message || 'Could not load brands. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadBrands();
    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <section className="relative mb-10 overflow-hidden rounded-3xl bg-[#f1eee6] px-6 py-10 sm:px-10 sm:py-14">
        <div className="absolute -right-8 -top-16 h-56 w-56 rounded-full border-[28px] border-white/30 sm:right-10 sm:top-1/2 sm:-translate-y-1/2" />
        <div className="relative max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-forest-700">
            <Store size={15} /> The people behind the pantry
          </p>
          <h1 className="mt-4 font-serif text-4xl font-medium leading-tight text-stone-900 sm:text-5xl">
            Explore Verified Pickle Brands
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-stone-600 sm:text-base">
            Every jar carries a story. Get to know the independent brands and verified artisan sellers crafting authentic handcrafted flavours.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="animate-pulse overflow-hidden rounded-2xl border border-stone-200 bg-white">
              <div className="aspect-[5/3] bg-stone-200" />
              <div className="space-y-2 p-5">
                <div className="h-4 w-2/3 rounded bg-stone-200" />
                <div className="h-3 w-1/3 rounded bg-stone-100" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm text-red-800">{error}</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="mt-4 rounded-lg bg-red-800 px-4 py-2 text-xs font-semibold text-white hover:bg-red-900"
          >
            Try again
          </button>
        </div>
      ) : brands.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand) => (
            <BrandCard key={brand.id || brand.slug || brand.business_name || brand.name} brand={brand} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center">
          <h2 className="font-serif text-2xl font-semibold text-stone-900">More Brand Stores Coming Soon</h2>
          <p className="mt-2 text-sm text-stone-600">We’re working with verified artisan sellers to bring you more small-batch flavours.</p>
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <Link to="/products" className="group inline-flex items-center gap-2 rounded-full bg-forest-900 px-5 py-3 text-xs font-semibold text-white transition-colors hover:bg-forest-800">
          Browse all products <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
