import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ChevronRight, Sparkles, Store, ShieldCheck, Flame,
  Package, Utensils, Award, Plane, Leaf, CheckCircle2, Search, Truck, ShoppingBag, Heart, Star
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
    // Physical 3D tilt angles (max ±7.5 deg)
    const rotateY = (x / (rect.width / 2)) * 7.5;
    const rotateX = -(y / (rect.height / 2)) * 7.5;
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

  // Filter items based on dietary category
  const matchingBestsellers = bestsellers.filter((product) => {
    if (!product.is_bestseller) return false;
    if (selectedDietary === 'ALL') return true;
    return product.dietary_type === selectedDietary;
  });

  let sectionTitle = 'Bestsellers';
  let displayedItems = [];

  if (matchingBestsellers.length > 0) {
    sectionTitle = 'Bestsellers';
    displayedItems = matchingBestsellers;
  } else {
    sectionTitle = 'Items';
    const matchingCatalog = allProducts.filter((product) => {
      if (selectedDietary === 'ALL') return true;
      return product.dietary_type === selectedDietary;
    });
    displayedItems = matchingCatalog.length > 0 ? matchingCatalog : allProducts;
  }

  return (
    <div className="bg-[#151312] text-stone-900">
      
      {/* ========================================================
          MOBILE HERO SECTION (Matching Mobile Mockup in Image)
          ======================================================== */}
      <div className="sm:hidden bg-[#151312] text-white px-4 pt-5 pb-8 space-y-4">
        {/* Upper Kicker */}
        <p className="text-[11px] font-bold tracking-[0.25em] text-stone-400 uppercase text-center">
          AUTHENTIC NAGA PICKLES
        </p>

        {/* Big Serif Headline */}
        <h1 className="font-serif text-[2.2rem] font-medium leading-[1.12] tracking-tight text-center text-[#f7eedb]">
          Local Flavours <br />
          from <span className="text-[#dc4437]">Nagaland</span>
        </h1>

        {/* Subtitle Paragraph */}
        <p className="text-xs text-stone-300 leading-relaxed text-center max-w-xs mx-auto">
          Handcrafted pickles and traditional delicacies from local homes and producers.
        </p>

        {/* Mobile Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-1">
          {/* Primary Shop Pickles Button */}
          <Link
            to="/products"
            className="w-full py-3.5 px-6 bg-[#85191e] hover:bg-[#9c1e24] text-white font-bold text-xs rounded-full shadow-lg shadow-red-950/60 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <ShoppingBag size={16} />
            <span>Shop Pickles</span>
          </Link>

          {/* Secondary Liquid Glass Button */}
          <Link
            to="/brands"
            className="group relative w-full py-3.5 px-6 rounded-full font-bold text-xs text-white flex items-center justify-center gap-2 transition-all active:scale-95 backdrop-blur-2xl bg-white/[0.08] border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] overflow-hidden"
          >
            <span className="relative z-10">Explore Producers</span>
            <ArrowRight size={14} className="relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
          </Link>
        </div>

        {/* Hero Product Visual (Jars & Relishes) with Liquid Glass Badge */}
        <div className="relative py-2 flex flex-col items-center">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-[#181615]">
            <img
              src="/images/hero/hero_jars_showcase.jpg"
              alt="Authentic Wangs Naga Bamboo Shoot and Dried Beef Pickles"
              className="w-full h-auto object-cover max-h-[300px]"
            />
            {/* Liquid Glass Overlay Pill */}
            <div className="absolute top-3 left-3 backdrop-blur-xl bg-black/45 border border-white/20 text-white rounded-full px-3 py-1 text-[10px] font-bold flex items-center gap-1.5 shadow-lg">
              <Sparkles size={11} className="text-amber-400" />
              <span>100% Traditional Slow-Cure</span>
            </div>
          </div>
        </div>

        {/* 3 Bottom Feature Badges */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 text-center text-white">
          <div className="flex flex-col items-center gap-1">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white">
              <Leaf size={14} />
            </div>
            <span className="text-[10px] text-[#eae0d0] font-medium leading-tight">Locally Sourced Ingredients</span>
          </div>

          <div className="flex flex-col items-center gap-1 border-l border-white/10 pl-2">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white">
              <Utensils size={14} />
            </div>
            <span className="text-[10px] text-[#eae0d0] font-medium leading-tight">Traditional Recipes</span>
          </div>

          <div className="flex flex-col items-center gap-1 border-l border-white/10 pl-2">
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white">
              <Store size={14} />
            </div>
            <span className="text-[10px] text-[#eae0d0] font-medium leading-tight">Support Local Producers</span>
          </div>
        </div>
      </div>


      {/* ========================================================
          DESKTOP & TABLET HERO SECTION (Matching Desktop Mockup)
          ======================================================== */}
      <section className="hidden sm:block relative overflow-hidden bg-[#151312] text-white pt-8 pb-16 lg:py-20 border-b border-white/10">
        {/* Atmospheric Backlights */}
        <div className="absolute w-[45rem] h-[45rem] rounded-full bg-amber-600/[0.12] blur-[120px] pointer-events-none -top-10 right-0" />
        <div className="absolute w-[35rem] h-[35rem] rounded-full bg-[#85191e]/20 blur-[100px] pointer-events-none top-1/4 -left-10" />
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Typography, Actions, and Badges */}
          <div className="col-span-12 lg:col-span-6 space-y-6 flex flex-col items-start text-left z-10">
            {/* Upper Kicker */}
            <p className="text-xs font-bold tracking-[0.25em] text-stone-400 uppercase select-none">
              AUTHENTIC NAGA PICKLES
            </p>

            {/* Giant Serif Headline */}
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[4.25rem] font-medium leading-[1.08] tracking-tight text-[#f7eedb]">
              Local Flavours <br />
              from <span className="text-[#dc4437]">Nagaland</span>
            </h1>

            {/* Subtitle */}
            <p className="text-stone-300 text-sm sm:text-base leading-relaxed max-w-md font-normal">
              Handcrafted pickles and traditional delicacies from local homes and producers.
            </p>

            {/* Actions: Primary Crimson + Secondary Liquid Glass */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              {/* Primary Shop Pickles Pill */}
              <Link
                to="/products"
                className="px-8 py-3.5 bg-[#85191e] hover:bg-[#9c1e24] text-white font-bold text-sm rounded-full shadow-lg shadow-red-950/70 inline-flex items-center gap-2.5 transition-all active:scale-95 hover:shadow-red-900/50 cursor-pointer"
              >
                <ShoppingBag size={17} />
                <span>Shop Pickles</span>
              </Link>

              {/* Secondary Liquid Glass Pill */}
              <Link
                to="/brands"
                className="group relative px-7 py-3.5 rounded-full font-bold text-sm text-white inline-flex items-center gap-2 transition-all active:scale-95 overflow-hidden backdrop-blur-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] hover:border-white/35 cursor-pointer"
              >
                <span className="relative z-10">Explore Producers</span>
                <ArrowRight size={15} className="relative z-10 transition-transform group-hover:translate-x-1" />
                
                {/* Liquid Glass Highlight Sweep */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
              </Link>
            </div>

            {/* 3 Bottom Feature Badges with Vertical Dividers */}
            <div className="pt-8 border-t border-white/10 grid grid-cols-3 gap-4 w-full max-w-lg">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0">
                  <Leaf size={15} />
                </div>
                <span className="text-xs text-[#eae0d0] font-medium leading-tight">Locally Sourced Ingredients</span>
              </div>

              <div className="flex items-center gap-2.5 border-l border-white/10 pl-3">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0">
                  <Utensils size={15} />
                </div>
                <span className="text-xs text-[#eae0d0] font-medium leading-tight">Traditional Recipes</span>
              </div>

              <div className="flex items-center gap-2.5 border-l border-white/10 pl-3">
                <div className="w-8 h-8 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0">
                  <Store size={15} />
                </div>
                <span className="text-xs text-[#eae0d0] font-medium leading-tight">Support Local Producers</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Showcase with 3D Tilt & Floating Liquid Glass Badges */}
          <div
            className="col-span-12 lg:col-span-6 relative flex flex-col items-center justify-center select-none"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {/* Interactive 3D Perspective Wrapper */}
            <div
              className="relative w-full max-w-xl transition-transform duration-300 ease-out"
              style={{
                transform: tilt.active
                  ? `perspective(1200px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-8px) scale3d(1.02, 1.02, 1.02)`
                  : 'perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(0px) scale3d(1, 1, 1)',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Main Image Frame with Ambient Glow */}
              <div className="relative rounded-3xl overflow-hidden border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.7)] bg-[#181615]">
                <img
                  src="/images/hero/hero_jars_showcase.jpg"
                  alt="Authentic Wangs Naga Pickles - Bamboo Shoot and Shredded Beef Relish"
                  className="w-full h-auto object-cover max-h-[460px]"
                />

                {/* Subtle Inner Glass Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#151312]/70 via-transparent to-transparent pointer-events-none" />
                
                {/* Interactive Spotlight Sheen on Hover */}
                <div
                  className="absolute inset-0 pointer-events-none transition-opacity duration-300 mix-blend-overlay"
                  style={{
                    opacity: tilt.active ? 0.7 : 0.15,
                    background: `radial-gradient(circle 380px at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.5) 0%, transparent 65%)`,
                  }}
                />
              </div>

              {/* Floating Liquid Glass Badge 1 (Top-Left) */}
              <div className="absolute -top-4 -left-4 sm:-top-5 sm:-left-6 backdrop-blur-2xl bg-black/45 border border-white/20 rounded-2xl p-3 shadow-2xl flex items-center gap-2.5 text-white animate-hero-float">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                  <Star size={16} className="fill-amber-400" />
                </div>
                <div>
                  <span className="text-xs font-bold block leading-none">4.9 ★ Rating</span>
                  <span className="text-[10px] text-stone-300">1.2k+ Verified Reviews</span>
                </div>
              </div>

              {/* Floating Liquid Glass Badge 2 (Bottom-Right) */}
              <div className="absolute -bottom-4 -right-4 sm:-bottom-5 sm:-right-6 backdrop-blur-2xl bg-black/45 border border-white/20 rounded-2xl p-3 shadow-2xl flex items-center gap-2.5 text-white animate-hero-float [animation-delay:1.5s]">
                <div className="w-8 h-8 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
                  <Sparkles size={16} />
                </div>
                <div>
                  <span className="text-xs font-bold block leading-none">Bamboo Shoot &amp; Beef</span>
                  <span className="text-[10px] text-stone-300">Artisan Wood-Smoked</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ========================================================
          PAGE BODY: BRAND STORES, CATALOG, AND QUALITY ASSURANCE
          ======================================================== */}
      <div className="bg-[#faf8f5] text-stone-900 border-t border-stone-200">
        
        {/* 1. Official Brand Stores Strip */}
        <section className="bg-white border-b border-stone-200/80 py-6 sm:py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className="text-xs font-bold tracking-widest uppercase text-[#85191e]">Verified Producers</span>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 mt-0.5">
                  Official Brand Stores
                </h2>
              </div>
              <Link
                to="/brands"
                className="text-xs font-bold text-[#85191e] hover:text-[#9c1e24] flex items-center gap-1 group"
              >
                <span>View All Brands</span>
                <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>

            <div className="flex sm:grid gap-3 overflow-x-auto no-scrollbar scroll-smooth snap-x -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 pb-2 sm:pb-0">
              {loading ? (
                [1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="w-[185px] sm:w-auto shrink-0 snap-start h-16 rounded-2xl bg-stone-100 animate-pulse" />
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

        {/* 2. Handcrafted Bestsellers & Menu */}
        <div className="space-y-12 sm:space-y-16 py-10 sm:py-16">
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-end justify-between mb-6 sm:mb-8">
              <div>
                <span className="text-xs font-bold tracking-widest uppercase text-[#85191e]">
                  {bestsellers.some((p) => p.is_bestseller) ? 'Appetite Favorites' : 'Store Catalog'}
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
                  {bestsellers.some((p) => p.is_bestseller) ? 'Bestsellers' : 'Items'}
                </h2>
              </div>
              <Link
                to="/products"
                className="text-xs font-bold text-[#85191e] hover:text-[#9c1e24] flex items-center gap-1 group"
              >
                <span>View Full Menu</span>
                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-6">
              {loading
                ? [1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-96 rounded-2xl bg-stone-100 animate-pulse" />
                  ))
                : (bestsellers.some((p) => p.is_bestseller) ? bestsellers.filter((p) => p.is_bestseller) : allProducts).slice(0, 8).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))
              }
            </div>
          </section>

          {/* 3. The Wangs Assurance & Purity Standards */}
          <section className="border-t border-stone-200/90 pt-10 sm:pt-14">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center max-w-xl mx-auto mb-8">
                <span className="text-xs font-bold uppercase tracking-widest text-[#85191e]">Heritage Standards</span>
                <h3 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-1">
                  The Wangs Purity Promise
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 mt-2">
                  Handcrafted according to ancestral tribal methods with zero artificial flavor enhancers.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
                {/* Standard 1 */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs hover:shadow-xl hover:border-[#85191e]/50 transition-all duration-300 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-red-50 text-[#85191e] border border-red-200 flex items-center justify-center shadow-xs group-hover:scale-105 transition-all">
                        <ShieldCheck size={22} className="text-[#85191e]" />
                      </div>
                      <span className="text-[10px] font-mono font-bold tracking-widest text-[#85191e] bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full uppercase">
                        01 · Verified Quality
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-base sm:text-lg text-stone-900 group-hover:text-[#85191e] transition-colors">
                      Direct From Verified Brands
                    </h4>

                    <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                      Every batch is handcrafted in registered small-batch workshops under strict FSSAI food safety hygiene protocols.
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col gap-1.5 text-[11px] text-stone-700 font-medium">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-[#85191e] shrink-0" />
                      <span>FSSAI Registered Workshops</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-[#85191e] shrink-0" />
                      <span>Authentic Regional Recipes</span>
                    </div>
                  </div>
                </div>

                {/* Standard 2 */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs hover:shadow-xl hover:border-amber-500/50 transition-all duration-300 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-900 border border-amber-200/80 flex items-center justify-center shadow-xs group-hover:scale-105 transition-all">
                        <Plane size={22} className="text-amber-700" />
                      </div>
                      <span className="text-[10px] font-mono font-bold tracking-widest text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase">
                        02 · Express Air Cargo
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-base sm:text-lg text-stone-900 group-hover:text-amber-800 transition-colors">
                      Fresh Air Express Dispatch
                    </h4>

                    <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                      Dispatched directly from regional air terminals via speed air express with air-cushion protection across India.
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

                {/* Standard 3 */}
                <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs hover:shadow-xl hover:border-emerald-500/50 transition-all duration-300 flex flex-col justify-between group">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center justify-center shadow-xs group-hover:scale-105 transition-all">
                        <Leaf size={22} className="text-emerald-700" />
                      </div>
                      <span className="text-[10px] font-mono font-bold tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase">
                        03 · 100% Pure Ingredients
                      </span>
                    </div>

                    <h4 className="font-serif font-bold text-base sm:text-lg text-stone-900 group-hover:text-emerald-800 transition-colors">
                      Zero Synthetic Preservatives
                    </h4>

                    <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                      Cured naturally with cold-pressed virgin mustard oil, heirloom Raja Mircha, and genuine wood-smoke aging.
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col gap-1.5 text-[11px] text-stone-700 font-medium">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span>Cold-Pressed Virgin Mustard Oil</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                      <span>Wood-Smoked Curing Tradition</span>
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
