import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ChevronRight, Sparkles, Store, ShieldCheck, Flame,
  Package, Utensils, Award, Plane, Leaf, CheckCircle2, Search, Truck, RotateCw
} from 'lucide-react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import BrandCard from '../components/BrandCard';
import { getBrandsFromProducts } from '../utils/brands';

export default function HomePage() {
  const navigate = useNavigate();
  const [bestsellers, setBestsellers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50, active: false });

  // Mobile view states
  const [mobileSearch, setMobileSearch] = useState('');
  const [selectedDietary, setSelectedDietary] = useState('ALL');

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const x = clientX - rect.width / 2;
    const y = clientY - rect.height / 2;
    // Smooth physical 3D tilt angles (max ±7.5 deg)
    const rotateY = (x / (rect.width / 2)) * 7.5;
    const rotateX = -(y / (rect.height / 2)) * 7.5;
    // Real-time spotlight glare coordinates
    const glareX = Math.max(0, Math.min(100, Math.round((clientX / rect.width) * 100)));
    const glareY = Math.max(0, Math.min(100, Math.round((clientY / rect.height) * 100)));
    setTilt({ x: rotateX, y: rotateY, glareX, glareY, active: true });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0, glareX: 50, glareY: 50, active: false });
  };

  useEffect(() => {
    async function loadData() {
      try {
        const [bestData, catData, prodData] = await Promise.all([
          api.getBestsellerProducts(),
          api.getCategories(),
          api.getProducts({ page_size: 24 }),
        ]);
        const bestProducts = bestData?.results || bestData || [];
        const allProds = prodData?.results || prodData || [];
        setBestsellers(bestProducts.length > 0 ? bestProducts : allProds);
        setAllProducts(allProds);
        setCategories(catData?.results || catData || []);
        try {
          const brandsData = await api.getBrands();
          if (brandsData && brandsData.length > 0) {
            setBrands(brandsData);
          } else {
            const featuredData = await api.getFeaturedProducts();
            setBrands(getBrandsFromProducts(bestData, featuredData));
          }
        } catch (err) {
          setBrands(getBrandsFromProducts(bestData));
        }
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleMobileSearch = (e) => {
    e.preventDefault();
    if (mobileSearch.trim()) {
      navigate(`/products?search=${encodeURIComponent(mobileSearch.trim())}`);
    }
  };

  // 1. Filter bestsellers matching selected dietary type
  let displayedBestsellers = bestsellers.filter((product) => {
    if (selectedDietary === 'ALL') return true;
    return product.dietary_type === selectedDietary;
  });

  // 2. If no bestsellers in this category, look into all catalog items for this dietary type
  if (displayedBestsellers.length === 0 && selectedDietary !== 'ALL') {
    displayedBestsellers = allProducts.filter((product) => product.dietary_type === selectedDietary);
  }

  // 3. When no bestsellers or items can be predicted for this specific filter (or in a new store),
  // instead of an empty screen ("No pickles found in this category"), show available artisan favorites!
  const isFallbackCategory = displayedBestsellers.length === 0;
  if (isFallbackCategory) {
    displayedBestsellers = bestsellers.length > 0 ? bestsellers : allProducts;
  }

  return (
    <div>
      {/* MOBILE SHOWCASE (Designed based on mobile reference screenshot) */}
      <div className="sm:hidden px-4 pt-3 pb-8 space-y-4 bg-[#fbfaf8]">
        {/* 1. Mobile Search Bar */}
        <form onSubmit={handleMobileSearch} className="relative w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={mobileSearch}
            onChange={(e) => setMobileSearch(e.target.value)}
            placeholder="Search pickles or brands"
            className="w-full pl-10 pr-4 py-2.5 bg-[#f0ede6] border border-stone-200/70 rounded-full text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-forest-800 focus:bg-white transition-all font-medium"
          />
        </form>

        {/* 2. Dietary Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 -mx-4 px-4">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'NON_VEG', label: 'Non-veg' },
            { id: 'VEG', label: 'Veg' },
            { id: 'VEG_MIXED', label: 'Veg mixed' },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setSelectedDietary(pill.id)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedDietary === pill.id
                  ? 'bg-[#123826] text-white shadow-xs'
                  : 'bg-[#f0ede6] text-stone-700 hover:bg-stone-200 hover:text-stone-950'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* 3. Deep Green Artisan Hero Card */}
        <div className="relative overflow-hidden rounded-[26px] bg-[#123826] text-white p-5 shadow-xs text-center">
          {/* Ambient golden aura */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_30%,rgba(241,184,68,0.14),transparent)] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center space-y-3">
            {/* Top Micro Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full border border-amber-400/35 bg-amber-400/10 text-amber-300 text-[10px] font-bold">
              <span>Artisan cured · Verified brands</span>
            </div>

            {/* Headline */}
            <h1 className="font-serif text-[1.48rem] font-bold leading-tight">
              <span className="text-white block">Authentic regional</span>
              <span className="text-[#f1b844] block">pickles, delivered fresh</span>
            </h1>

            {/* 3 Stylized Pickle Jars */}
            <div className="relative w-full max-w-[220px] py-0.5 flex flex-col items-center justify-center">
              <img
                src="/featured-pouches.png"
                alt="Authentic Artisanal Regional Pickles"
                className="w-full h-auto max-h-[112px] object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.65)]"
              />
              <div className="w-[78%] h-2 bg-black/60 rounded-full blur-xs -mt-1 pointer-events-none" />
            </div>

            {/* Freshly Crafted Indicator */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1b4832] text-emerald-300 text-[10.5px] font-semibold border border-emerald-500/20 shadow-2xs">
              <Sparkles size={11} className="text-emerald-400" />
              <span>Freshly crafted</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 w-full pt-1">
              <Link
                to="/products"
                className="flex-1 py-2.5 px-4 bg-[#f1b844] hover:bg-[#e2a835] text-stone-950 font-black text-xs rounded-full flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all text-center whitespace-nowrap"
              >
                <span>Shop pickles</span>
                <ArrowRight size={13} className="text-stone-950" />
              </Link>
              <Link
                to="/brands"
                className="flex-1 py-2.5 px-4 bg-transparent border border-white/40 hover:border-white text-white font-bold text-xs rounded-full flex items-center justify-center active:scale-95 transition-all text-center whitespace-nowrap"
              >
                <span>Brands</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 4. Trust Indicators Strip */}
        <div className="flex items-center justify-center gap-2.5 py-1 text-xs text-stone-600 font-medium">
          <span className="flex items-center gap-1">
            <ShieldCheck size={14} className="text-forest-900" />
            <span>Verified</span>
          </span>
          <span className="text-stone-300">•</span>
          <span className="flex items-center gap-1">
            <Truck size={14} className="text-forest-900" />
            <span>Fresh dispatch</span>
          </span>
          <span className="text-stone-300">•</span>
          <span className="flex items-center gap-1">
            <Award size={14} className="text-forest-900" />
            <span>FSSAI</span>
          </span>
        </div>

        {/* 5. Mobile Bestsellers Section */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-serif font-bold text-base text-stone-900">
                Bestsellers
              </h2>
              {isFallbackCategory && selectedDietary !== 'ALL' && (
                <p className="text-[10px] text-amber-800 font-medium">
                  Artisan favorites curated for you
                </p>
              )}
            </div>
            <Link
              to="/products"
              className="text-xs font-semibold text-stone-500 hover:text-stone-900"
            >
              View all
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-stone-100 animate-pulse" />
              ))
            ) : displayedBestsellers.length > 0 ? (
              displayedBestsellers.slice(0, 6).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-2 py-8 text-center text-xs text-stone-500">
                No pickles found in this category.
              </div>
            )}
          </div>
        </div>

        {/* 6. Mobile Brand Stores Section */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif font-bold text-base text-stone-900">
              Brand stores
            </h2>
            <Link
              to="/brands"
              className="text-xs font-semibold text-stone-500 hover:text-stone-900"
            >
              View all
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x -mx-4 px-4 pb-2">
            {loading ? (
              [1, 2].map((i) => (
                <div key={i} className="w-[200px] shrink-0 h-16 rounded-2xl bg-stone-100 animate-pulse" />
              ))
            ) : brands.length > 0 ? (
              brands.slice(0, 6).map((brand) => (
                <BrandCard
                  key={brand.id || brand.slug || brand.business_name}
                  brand={brand}
                  compact={true}
                />
              ))
            ) : null}
          </div>
        </div>
      </div>

      {/* DESKTOP & TABLET VIEW */}
      <div className="hidden sm:block">
        {/* 1. Vibrant Artisanal Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#06180f] via-[#0b2417] to-[#081b11] text-white sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24 border-b border-amber-500/20">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_40%,rgba(245,158,11,0.14),transparent)] pointer-events-none" />

          {/* DESKTOP & TABLET HERO (Spacious layout with 3D physics & full copy) */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 sm:grid-cols-12 gap-6 sm:gap-8 lg:gap-12 items-center grid">
          {/* Hero Left Content */}
          <div className="sm:col-span-7 lg:col-span-6 space-y-4 sm:space-y-6 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-forest-950/80 border border-amber-400/40 text-amber-300 text-[11px] sm:text-xs font-bold mx-auto lg:mx-0 shadow-sm backdrop-blur-md">
              <Sparkles size={13} className="text-amber-400 flex-shrink-0 animate-pulse" />
              <span className="truncate">Artisanal Regional Cures · Direct From Verified Brands</span>
            </div>

            <h1 className="font-serif text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.08] tracking-tight">
              Discover Authentic Pickles, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-amber-200">
                Delivered Fresh to You.
              </span>
            </h1>

            <p className="text-xs sm:text-sm lg:text-base text-stone-200/90 max-w-xl leading-relaxed mx-auto lg:mx-0">
              Slow-cured authentic King Chilli, shredded chicken, fiery ghost pepper, and traditional bamboo shoot recipes. Sourced directly from verified artisan producers and shipped fresh nationwide.
            </p>

            {/* CTAs: Side-by-side with gold gradient & frosted glass */}
            <div className="flex flex-row items-center justify-center lg:justify-start gap-2.5 sm:gap-3.5 pt-1 w-full sm:w-auto">
              <Link
                to="/products"
                className="flex-1 sm:flex-initial justify-center px-5 py-3 sm:px-7 sm:py-3.5 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 hover:to-amber-200 text-forest-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2 active:scale-98 text-center whitespace-nowrap hover:scale-[1.02]"
              >
                <span>Shop Authentic Pickles</span>
                <ArrowRight size={15} className="flex-shrink-0" />
              </Link>
              <Link
                to="/brands"
                className="flex-1 sm:flex-initial justify-center px-4 py-3 sm:px-6 sm:py-3.5 bg-white/10 hover:bg-white/15 text-cream-50 font-bold text-xs sm:text-sm rounded-xl border border-white/20 hover:border-amber-400/50 backdrop-blur-md shadow-sm transition-all flex items-center gap-2 active:scale-98 text-center whitespace-nowrap hover:scale-[1.02]"
              >
                <Store size={15} className="text-amber-400 flex-shrink-0" />
                <span>Artisan Brands</span>
              </Link>
            </div>

            {/* Trust Micro-Badges */}
            <div className="pt-2 sm:pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-3 sm:gap-5 text-[11px] text-stone-300">
              <span className="flex items-center gap-1.5">
                <Award size={14} className="text-amber-300 flex-shrink-0" />
                <span>Verified Artisan Brands</span>
              </span>
            </div>
          </div>

          {/* Hero Right Visual: Pro 3D Physics, Floating & Ambient Lighting */}
          <div
            className="sm:col-span-5 lg:col-span-6 relative flex flex-col items-center justify-center pt-2 sm:pt-6 lg:pt-8 select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Ambient luxury lighting with breathing aura & mouse parallax */}
            <div
              className="absolute w-96 h-96 sm:w-[38rem] sm:h-[38rem] rounded-full bg-gradient-to-tr from-amber-500/30 via-red-900/30 to-forest-800/40 blur-3xl pointer-events-none -top-4 animate-ambient-aura transition-transform duration-500 ease-out"
              style={{
                transform: tilt.active
                  ? `translate3d(${-tilt.y * 1.8}px, ${tilt.x * 1.8}px, 0)`
                  : undefined,
              }}
            />

            {/* Pulsing golden energy rings behind pouches */}
            <div className="absolute w-72 h-72 sm:w-[26rem] sm:h-[26rem] rounded-full border border-amber-400/25 pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse-ring" />
            <div className="absolute w-80 h-80 sm:w-[30rem] sm:h-[30rem] rounded-full bg-gradient-to-tr from-amber-500/20 via-orange-500/20 to-transparent blur-2xl pointer-events-none top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ambient-aura" />

            {/* Drifting golden embers for hearth & firewood warmth */}
            <div className="absolute top-1/4 right-8 w-2 h-2 rounded-full bg-amber-400/80 blur-[0.6px] animate-ember-1 pointer-events-none" />
            <div className="absolute top-1/3 left-10 w-2.5 h-2.5 rounded-full bg-orange-400/70 blur-[0.7px] animate-ember-2 pointer-events-none" />
            <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 rounded-full bg-amber-300/80 blur-[0.5px] animate-ember-3 pointer-events-none" />
            <div className="absolute -top-3 right-12 w-2 h-2 rounded-full bg-amber-400/70 blur-[0.8px] animate-drift-slow pointer-events-none" />
            <div className="absolute top-20 left-6 w-2.5 h-2.5 rounded-full bg-amber-300/50 blur-[0.8px] animate-drift-alt pointer-events-none" />
            <div className="absolute -bottom-2 right-1/4 w-1.5 h-1.5 rounded-full bg-amber-200/60 blur-[0.6px] animate-drift-slow pointer-events-none [animation-delay:3s]" />

            <Link
              to="/products?brand=lia-chuka"
              className="relative group w-full flex flex-col items-center cursor-pointer"
              style={{ perspective: '1200px' }}
            >
              {/* Outer 3D Interactive Tilt Cradle with elevation lift on hover */}
              <div
                className="relative w-full flex flex-col items-center transition-transform duration-300 ease-out"
                style={{
                  transform: tilt.active
                    ? `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-14px) scale3d(1.04, 1.04, 1.04)`
                    : 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Continuous organic multi-phase levitation (persists smoothly even while tilting) */}
                <div className="relative w-full flex flex-col items-center animate-hero-float">
                  {/* Image wrapper with interactive cursor spotlight & continuous sheen sweep */}
                  <div className="relative overflow-hidden rounded-3xl p-1">
                    {/* Pulsing red-gold backglow right under the pouches */}
                    <div className="absolute inset-0 bg-gradient-to-t from-red-600/25 via-amber-500/20 to-transparent blur-2xl pointer-events-none" />

                    <img
                      src="/featured-pouches.png"
                      alt="Lia Chuka Traditional Bambooshoot, Pork and Chicken Pickles"
                      className="w-full max-w-[280px] xs:max-w-xs sm:max-w-md lg:max-w-[42rem] xl:max-w-[45rem] h-auto object-contain select-none transition-all duration-500 drop-shadow-[0_16px_36px_rgba(0,0,0,0.65)] group-hover:drop-shadow-[0_32px_56px_rgba(217,119,6,0.38)]"
                    />

                    {/* Automatic Periodic Metallic Sheen Sweep (Every 5 seconds) */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent -translate-x-full animate-auto-sheen pointer-events-none" />

                    {/* Interactive Cursor Spotlight Glare Sheen */}
                    <div
                      className="absolute inset-0 pointer-events-none transition-opacity duration-300 mix-blend-overlay"
                      style={{
                        opacity: tilt.active ? 0.8 : 0.25,
                        background: `radial-gradient(circle 380px at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.5) 0%, rgba(251, 191, 36, 0.2) 35%, transparent 65%)`,
                      }}
                    />

                    {/* Extra Specular Sheen sweep on user hover */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-200/30 to-transparent -translate-x-full group-hover:animate-shimmer-sweep pointer-events-none" />
                  </div>

                  {/* Curated Spotlight Pedestal Glow underneath base of pouches */}
                  <div className="w-[88%] h-6 sm:h-8 bg-gradient-to-r from-transparent via-amber-400/20 to-transparent blur-md rounded-full -mt-2 mx-auto pointer-events-none" />

                  {/* Red/Crimson Packaging Floor Underglow */}
                  <div
                    className="w-[86%] h-5 sm:h-8 bg-red-600/30 rounded-[100%] blur-xl -mt-4 sm:-mt-6 mx-auto pointer-events-none transition-all duration-300"
                    style={{
                      transform: tilt.active
                        ? `translateX(${-tilt.y * 2.5}px) scaleX(0.95)`
                        : undefined,
                      opacity: tilt.active ? 0.5 : 0.75,
                    }}
                  />

                  {/* Grounding Multi-layered Contact Shadow underneath base of pouches */}
                  <div
                    className={`w-[94%] h-8 sm:h-12 bg-black/85 rounded-[100%] blur-2xl -mt-5 sm:-mt-6 mx-auto pointer-events-none transition-all duration-300 ${
                      tilt.active ? '' : 'animate-hero-shadow'
                    }`}
                    style={{
                      transform: tilt.active
                        ? `translateX(${-tilt.y * 3.5}px) translateY(12px) scaleX(0.92) scaleY(0.42)`
                        : undefined,
                      opacity: tilt.active ? 0.6 : 0.85,
                    }}
                  />
                  <div
                    className="w-[78%] h-4 sm:h-6 bg-black/95 rounded-[100%] blur-md -mt-3.5 sm:-mt-5 mx-auto pointer-events-none transition-all duration-300"
                    style={{
                      transform: tilt.active
                        ? `translateX(${-tilt.y * 2}px) scaleX(0.9)`
                        : undefined,
                      opacity: tilt.active ? 0.75 : 0.95,
                    }}
                  />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>


      {/* 2. Official Brand Stores */}
      <section className="bg-stone-50/70 border-b border-stone-200/80 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-stone-900">
              Official Brand Stores
            </h2>
            <Link
              to="/brands"
              className="text-xs font-semibold text-stone-600 hover:text-stone-900 flex items-center gap-0.5 group"
            >
              <span>View All Brands</span>
              <ChevronRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          {/* Minimal Brand Cards: Horizontal swipe on mobile, clean grid on desktop */}
          <div className="flex sm:grid gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 pb-1 sm:pb-0">
            {loading ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="w-[185px] sm:w-auto shrink-0 snap-start h-14 rounded-2xl bg-stone-200/60 animate-pulse" />
              ))
            ) : brands.length > 0 ? (
              brands.slice(0, 8).map((brand) => (
                <BrandCard
                  key={brand.id || brand.slug || brand.business_name}
                  brand={brand}
                  compact={true}
                />
              ))
            ) : null}
          </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <div className="space-y-10 sm:space-y-16 mt-6 sm:mt-12 pb-12 sm:pb-16">
        {/* 4. Slow-Cured Artisanal Bestsellers */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-5 sm:mb-8">
            <div>
              <span className="text-xs font-bold tracking-widest uppercase text-forest-800">Slow-Cured Pantry</span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
                Artisan Favorites
              </h2>
            </div>
            <Link
              to="/products"
              className="text-xs font-bold text-forest-800 hover:text-forest-950 flex items-center gap-1 group"
            >
              <span>View Full Catalog</span>
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {loading
              ? [1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-96 rounded-2xl bg-stone-100 animate-pulse" />
                ))
              : (bestsellers.length > 0 ? bestsellers : allProducts).slice(0, 8).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))
            }
          </div>
        </section>

        {/* 5. The Wangs Assurance & Purity Standard */}
        <section className="mt-12 sm:mt-16 border-t border-stone-200/90 pt-8 sm:pt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* 3 Value Proposition Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {/* Card 1 */}
              <div className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200/90 shadow-2xs hover:shadow-md hover:border-forest-700/40 transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-emerald-100 transition-all">
                      <ShieldCheck size={22} className="text-emerald-700" />
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-800 bg-emerald-50/80 border border-emerald-200/60 px-2.5 py-0.5 rounded-full uppercase">
                      01 · Verified Quality
                    </span>
                  </div>

                  <h4 className="font-serif font-bold text-base sm:text-lg text-stone-900 group-hover:text-forest-900 transition-colors">
                    Direct From Verified Brands
                  </h4>

                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                    Every batch is handcrafted in registered small-batch workshops under strict FSSAI food safety hygiene.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col gap-1.5 text-[11px] text-stone-700 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>FSSAI Registered Workshops</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                    <span>Authentic Regional Recipes</span>
                  </div>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200/90 shadow-2xs hover:shadow-md hover:border-amber-700/40 transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200/80 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-amber-100 transition-all">
                      <Plane size={22} className="text-amber-800" />
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-amber-900 bg-amber-50/80 border border-amber-200/60 px-2.5 py-0.5 rounded-full uppercase">
                      02 · Express Logistics
                    </span>
                  </div>

                  <h4 className="font-serif font-bold text-base sm:text-lg text-stone-900 group-hover:text-forest-900 transition-colors">
                    Air Express Dispatch
                  </h4>

                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                    Packed with shock-absorbing air-cushion protection to preserve fresh seal across 26,000+ Indian PIN codes.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col gap-1.5 text-[11px] text-stone-700 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-amber-600 shrink-0" />
                    <span>Free Air Shipping on All Orders</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-amber-600 shrink-0" />
                    <span>Shock-Proof Zero Leakage Seal</span>
                  </div>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200/90 shadow-2xs hover:shadow-md hover:border-forest-700/40 transition-all duration-300 flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-stone-100 text-forest-900 border border-stone-200/80 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:bg-stone-200 transition-all">
                      <Leaf size={22} className="text-forest-800" />
                    </div>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-stone-700 bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-full uppercase">
                      03 · Heritage Ingredients
                    </span>
                  </div>

                  <h4 className="font-serif font-bold text-base sm:text-lg text-stone-900 group-hover:text-forest-900 transition-colors">
                    Zero Synthetic Preservatives
                  </h4>

                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                    Cured naturally with cold-pressed mustard oil, native Raja Mircha, and traditional wood-smoke aging.
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col gap-1.5 text-[11px] text-stone-700 font-medium">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-forest-600 shrink-0" />
                    <span>100% Cold-Pressed Mustard Oil</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-forest-600 shrink-0" />
                    <span>Traditional Wood-Smoke Curing</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  </div>
);
}
