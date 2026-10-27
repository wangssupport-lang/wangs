import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ChevronRight, Sparkles, Store, ShieldCheck, Flame,
  Package, Utensils, Award, Plane, Leaf, CheckCircle2
} from 'lucide-react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import BrandCard from '../components/BrandCard';
import { getBrandsFromProducts } from '../utils/brands';

/* Shared section wrapper: every section uses the same edges so everything lines up */
function Section({ title, eyebrow, linkTo, linkLabel = 'View all', children, className = '' }) {
  return (
    <section className={`px-4 sm:px-6 lg:px-8 py-8 sm:py-12 ${className}`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-end justify-between gap-3 mb-4 sm:mb-6">
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-forest-800 mb-1">
                {eyebrow}
              </p>
            )}
            <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 leading-tight">
              {title}
            </h2>
          </div>
          {linkTo && (
            <Link
              to={linkTo}
              className="shrink-0 inline-flex items-center gap-1 text-sm font-semibold text-forest-800 min-h-[44px]"
            >
              {linkLabel} <ChevronRight size={16} />
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [bestsellers, setBestsellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const [bestData, catData] = await Promise.all([
          api.getBestsellerProducts ? api.getBestsellerProducts() : api.getProducts(),
          api.getCategories ? api.getCategories() : [],
        ]);
        if (cancelled) return;
        const bestProducts = bestData?.results || (Array.isArray(bestData) ? bestData : []);
        setBestsellers(bestProducts);
        setCategories(catData?.results || (Array.isArray(catData) ? catData : []));

        try {
          const brandsData = await api.getBrands();
          if (cancelled) return;
          if (brandsData && brandsData.length > 0) {
            setBrands(brandsData);
          } else {
            setBrands(getBrandsFromProducts(bestProducts));
          }
        } catch (err) {
          if (!cancelled) setBrands(getBrandsFromProducts(bestProducts));
        }
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadData();
    return () => { cancelled = true; };
  }, []);

  const trust = [
    { icon: Leaf, title: 'Handcrafted', text: 'Small-batch, made the traditional way' },
    { icon: ShieldCheck, title: 'Verified artisans', text: 'Every artisan producer is vetted by us' },
    { icon: Award, title: 'Quality first', text: 'Fresh, authentic, no shortcuts' },
    { icon: Plane, title: 'Ships across India', text: 'Carefully packed and delivered' },
  ];

  const skeleton = (n, cls) =>
    Array.from({ length: n }).map((_, i) => (
      <div key={i} className={`animate-pulse bg-stone-200/70 rounded-2xl ${cls}`} />
    ));

  return (
    <div className="overflow-x-hidden">
      {/* ================= HERO ================= */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-8 pb-10 sm:pt-14 sm:pb-16 bg-gradient-to-b from-cream-50 to-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-800/10 text-forest-800 px-3 py-1.5 text-xs font-bold">
              <Sparkles size={14} /> Artisanal food marketplace
            </span>
            <h1 className="mt-4 font-serif font-bold text-stone-900 text-[2rem] leading-[1.1] sm:text-5xl lg:text-6xl">
              Handcrafted pickles & flavours, straight from the artisan producer
            </h1>
            <p className="mt-4 text-base sm:text-lg text-stone-600 max-w-xl mx-auto lg:mx-0">
              Discover authentic, small-batch foods from trusted artisans, delivered fresh to your door.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                to="/products"
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-2xl bg-forest-900 text-white font-bold shadow-lg active:scale-[0.98] transition"
              >
                Shop now <ArrowRight size={18} />
              </Link>
              <Link
                to="/brands"
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-2xl bg-white text-stone-800 font-bold border border-stone-200 active:scale-[0.98] transition"
              >
                <Store size={18} /> Explore brands
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-4 gap-y-2 justify-center lg:justify-start text-xs sm:text-sm text-stone-600">
              {['Free of preservatives*', 'Verified artisans', 'Pan-India delivery'].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-forest-800" /> {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Hero visual: top products as a tidy 2x2 preview */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute -inset-4 rounded-[2rem] bg-forest-800/5 blur-2xl pointer-events-none" aria-hidden />
            <div className="relative grid grid-cols-2 gap-3 sm:gap-4">
              {(loading ? [] : bestsellers.slice(0, 4)).map((p, i) => {
                const imgUrl = p.primary_image_url || p.image || p.images?.[0]?.image_url || p.images?.[0];
                const title = p.title || p.name || 'Artisanal Pickle';
                return (
                  <Link
                    key={p.id || p._id || p.slug || i}
                    to={`/product/${p.slug}`}
                    className={`block rounded-2xl overflow-hidden bg-white border border-stone-200 shadow-sm ${i % 2 ? 'translate-y-3' : ''}`}
                  >
                    <div className="aspect-square bg-stone-100">
                      {imgUrl && (
                        <img
                          src={imgUrl}
                          alt={title}
                          loading={i < 2 ? 'eager' : 'lazy'}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <p className="px-3 py-2 text-xs sm:text-sm font-semibold text-stone-800 line-clamp-1">{title}</p>
                  </Link>
                );
              })}
              {loading && skeleton(4, 'aspect-square')}
            </div>
          </div>
        </div>
      </section>

      {/* ================= TRUST ================= */}
      <section className="px-4 sm:px-6 lg:px-8 py-6 bg-white border-y border-stone-100">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {trust.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-cream-50">
              <span className="shrink-0 grid place-items-center w-10 h-10 rounded-xl bg-forest-800/10 text-forest-800">
                <Icon size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-stone-900">{title}</p>
                <p className="text-xs text-stone-500 leading-snug">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= CATEGORIES ================= */}
      {(loading || categories.length > 0) && (
        <Section title="Shop by category" eyebrow="Browse">
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex sm:flex-wrap gap-2.5 overflow-x-auto sm:overflow-visible no-scrollbar snap-x pb-1">
            {loading
              ? skeleton(5, 'h-11 w-28 shrink-0 rounded-full')
              : categories.map((c) => {
                  const name = typeof c === 'string' ? c : c.name;
                  return (
                    <Link
                      key={name}
                      to={`/products?category=${encodeURIComponent(name)}`}
                      className="snap-start shrink-0 inline-flex items-center gap-2 min-h-[44px] px-5 rounded-full bg-white border border-stone-200 text-sm font-semibold text-stone-800 active:bg-forest-800 active:text-white"
                    >
                      <Utensils size={14} className="text-forest-800" /> {name}
                    </Link>
                  );
                })}
          </div>
        </Section>
      )}

      {/* ================= BESTSELLERS ================= */}
      <Section title="Bestsellers" eyebrow="Customer favourites" linkTo="/products" className="bg-white">
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
          {loading
            ? skeleton(4, 'aspect-[3/4]')
            : bestsellers.map((p) => (
                <ProductCard key={p.id || p._id || p.slug} product={p} />
              ))}
        </div>
        {!loading && bestsellers.length === 0 && (
          <p className="text-center text-sm text-stone-500 py-8">Products will appear here soon.</p>
        )}
      </Section>

      {/* ================= BRANDS ================= */}
      {(loading || brands.length > 0) && (
        <Section title="Brands we love" eyebrow="Artisans" linkTo="/brands">
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 overflow-x-auto md:overflow-visible no-scrollbar snap-x snap-mandatory pb-2">
            {loading
              ? skeleton(3, 'h-40 w-64 shrink-0 md:w-auto')
              : brands.slice(0, 8).map((b, i) => (
                  <div key={b.id || b.slug || b.name || i} className="snap-start shrink-0 w-[78%] sm:w-72 md:w-auto">
                    <BrandCard brand={b} />
                  </div>
                ))}
          </div>
        </Section>
      )}

      {/* ================= SELLER CTA ================= */}
      <section className="px-4 sm:px-6 lg:px-8 pb-10 sm:pb-16">
        <div className="max-w-7xl mx-auto relative overflow-hidden rounded-3xl bg-forest-900 text-white p-6 sm:p-10 lg:p-12">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/5 pointer-events-none" aria-hidden />
          <div className="relative flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-10 text-center lg:text-left">
            <div className="flex-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/70">
                <Flame size={14} /> For artisans
              </span>
              <h2 className="mt-2 font-serif text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
                Craft pickles or specialty foods? Sell on Wangs.
              </h2>
              <p className="mt-3 text-sm sm:text-base text-white/80 max-w-xl mx-auto lg:mx-0">
                Reach customers across India with your own storefront, easy order management and shipping support.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/manufacturer/register"
                className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-2xl bg-white text-forest-900 font-bold active:scale-[0.98] transition"
              >
                <Package size={18} /> Become a seller
              </Link>
              <Link
                to="/manufacturer/login"
                className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-2xl border border-white/30 font-bold active:bg-white/10"
              >
                Seller login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
