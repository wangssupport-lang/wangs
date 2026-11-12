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
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <section className="relative mb-8 sm:mb-10 overflow-hidden rounded-3xl bg-surface-container-low border border-outline-variant/30 px-6 py-8 sm:px-10 sm:py-12 shadow-xs">
        <div className="relative max-w-2xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            <Store size={15} /> The heritage kitchens behind the pantry
          </p>
          <h1 className="mt-3 font-serif text-3xl font-medium leading-tight text-on-surface sm:text-5xl">
            Explore Verified Pickle Brands
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-on-surface-variant sm:text-base">
            Every recipe carries a regional heritage story. Get to know the independent village kitchens and verified artisanal makers crafting authentic small-batch pickles.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="animate-pulse overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest">
              <div className="aspect-[5/3] bg-surface-container-low" />
              <div className="space-y-2 p-5">
                <div className="h-4 w-2/3 rounded bg-surface-container" />
                <div className="h-3 w-1/3 rounded bg-surface-container-low" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="rounded-2xl border border-error/30 bg-error-container/20 p-6 text-center">
          <p className="text-sm text-on-surface">{error}</p>
          <button
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-on-primary hover:bg-primary-container shadow-xs"
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
        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-10 text-center">
          <h2 className="font-serif text-2xl font-semibold text-on-surface">More Brand Kitchens Coming Soon</h2>
          <p className="mt-2 text-sm text-on-surface-variant">We’re working with verified cottage kitchens across 18 states to bring you more small-batch heirloom recipes.</p>
        </div>
      )}

      <div className="mt-10 flex justify-center">
        <Link to="/products" className="group inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-xs font-semibold text-white transition-colors hover:bg-red-700 shadow-md">
          Browse all products <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
