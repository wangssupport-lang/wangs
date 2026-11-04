import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, ChevronRight, Sparkles, Store, ShieldCheck, Flame,
  Package, Utensils, Award, Plane, Leaf, CheckCircle2, Search, Truck, Zap
} from 'lucide-react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import BrandCard from '../components/BrandCard';
import { getBrandsFromProducts } from '../utils/brands';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function HomePage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const toast = useToast();

  const [bestsellers, setBestsellers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, glareX: 50, glareY: 50, active: false });

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all', 'non-veg', 'veg', 'veg-nonveg', 'bestsellers'

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const x = clientX - rect.width / 2;
    const y = clientY - rect.height / 2;
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

  const handleQuickAdd = async (product, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (addingId) return;
    setAddingId(product.id);
    try {
      await addToCart(product.id, 1);
      toast.success(`Packed ${product.title} into your pantry cart`);
    } catch (err) {
      toast.error(err.message || 'Could not add to cart');
    } finally {
      setTimeout(() => setAddingId(null), 800);
    }
  };

  // Filtered curated pantry items according to the category ribbon
  const filteredProducts = allProducts.filter((product) => {
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'non-veg') return product.dietary_type === 'NON_VEG';
    if (selectedCategory === 'veg') return product.dietary_type === 'VEG';
    if (selectedCategory === 'veg-nonveg') return product.dietary_type === 'VEG_MIXED';
    if (selectedCategory === 'bestsellers') return product.is_bestseller;
    return true;
  });

  return (
    <div className="bg-[#FAF9F6] text-[#1C1917] min-h-screen">
      {/* 1. VISUAL HERO BANNER (Artisanal Cellar Framing) */}
      <section className="relative w-full bg-[#0B2417] text-white overflow-hidden shadow-md">
        {/* Subtle Ambient Glows */}
        <div className="absolute -top-12 -right-12 w-80 h-80 bg-[#F59E0B]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Narrative Column */}
            <div className="lg:col-span-7 flex flex-col items-start gap-4">
              {/* Eyebrow Tag */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#F59E0B] font-sans text-[11px] font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                Artisanal Regional Cures
              </div>

              {/* Newsreader Headline */}
              <h1 className="font-serif text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Discover Authentic Pickles, <br className="hidden sm:inline" />
                <span className="text-[#F59E0B]">Delivered Fresh to You.</span>
              </h1>

              {/* Micro Storytelling Copy */}
              <p className="font-sans text-sm sm:text-base text-white/80 max-w-xl leading-relaxed">
                Rare, heritage cures fermented in stone jars and smoked over wild hill-wood across Northeast India. Handcrafted by master regional artisans without synthetic vinegar or preservatives.
              </p>

              {/* Primary Action CTA */}
              <div className="flex flex-wrap items-center gap-3 pt-2 w-full sm:w-auto">
                <Link
                  to="/products"
                  className="inline-flex items-center justify-between gap-3 px-6 py-3.5 rounded-full bg-[#F59E0B] hover:bg-[#d97706] text-[#1C1917] font-sans text-sm font-bold shadow-lg active:scale-95 transition-all"
                >
                  <span>Shop Authentic Pickles</span>
                  <ArrowRight size={17} className="text-[#1C1917]" />
                </Link>
                <Link
                  to="/brands"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-sans text-sm font-semibold border border-white/20 active:scale-95 transition-all"
                >
                  <Store size={15} className="text-[#F59E0B]" />
                  <span>Artisan Brands</span>
                </Link>
              </div>

              {/* Trust Ribbon Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-white text-xs font-medium">
                  <Plane size={14} className="text-[#F59E0B]" />
                  <span>All-India Air Express</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-white text-xs font-medium">
                  <ShieldCheck size={14} className="text-[#059669]" />
                  <span>100% FSSAI Certified</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-white text-xs font-medium">
                  <Leaf size={14} className="text-[#059669]" />
                  <span>Cold-Pressed Mustard Oil</span>
                </div>
              </div>
            </div>

            {/* Right Visual Column (Pouch Composition with 3D Parallax Tilt) */}
            <div
              className="lg:col-span-5 relative flex flex-col items-center justify-center select-none pt-4 lg:pt-0"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              <div
                className="relative w-full max-w-[340px] sm:max-w-md flex flex-col items-center transition-transform duration-300 ease-out"
                style={{
                  transform: tilt.active
                    ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.03, 1.03, 1.03)`
                    : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <div className="relative overflow-hidden rounded-3xl p-1">
                  <img
                    src="/featured-pouches.png"
                    alt="Authentic Artisanal Regional Pickles"
                    className="w-full h-auto object-contain drop-shadow-[0_20px_35px_rgba(0,0,0,0.7)]"
                  />
                  {/* Subtle glare overlay on mouse move */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-opacity duration-300 mix-blend-overlay"
                    style={{
                      opacity: tilt.active ? 0.7 : 0.2,
                      background: `radial-gradient(circle 320px at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.45) 0%, rgba(245, 158, 11, 0.2) 40%, transparent 70%)`,
                    }}
                  />
                </div>
                {/* Pedestal floor shadow */}
                <div className="w-[82%] h-4 bg-black/80 rounded-full blur-md -mt-2 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE CATEGORY FILTER RIBBON */}
      <section className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full font-sans text-xs sm:text-sm font-semibold whitespace-nowrap active:scale-95 transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'bg-[#efeeeb] text-[#1C1917] hover:bg-[#e3e2e0]'
            }`}
          >
            All Pickles
          </button>
          <button
            onClick={() => setSelectedCategory('non-veg')}
            className={`px-4 py-2 rounded-full font-sans text-xs sm:text-sm font-semibold whitespace-nowrap active:scale-95 transition-all flex items-center gap-1.5 ${
              selectedCategory === 'non-veg'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'bg-[#efeeeb] text-[#1C1917] hover:bg-[#e3e2e0]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-600" />
            <span>Non-Veg</span>
          </button>
          <button
            onClick={() => setSelectedCategory('veg')}
            className={`px-4 py-2 rounded-full font-sans text-xs sm:text-sm font-semibold whitespace-nowrap active:scale-95 transition-all flex items-center gap-1.5 ${
              selectedCategory === 'veg'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'bg-[#efeeeb] text-[#1C1917] hover:bg-[#e3e2e0]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#059669]" />
            <span>Veg</span>
          </button>
          <button
            onClick={() => setSelectedCategory('veg-nonveg')}
            className={`px-4 py-2 rounded-full font-sans text-xs sm:text-sm font-semibold whitespace-nowrap active:scale-95 transition-all ${
              selectedCategory === 'veg-nonveg'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'bg-[#efeeeb] text-[#1C1917] hover:bg-[#e3e2e0]'
            }`}
          >
            Veg + Non-Veg
          </button>
          <button
            onClick={() => setSelectedCategory('bestsellers')}
            className={`px-4 py-2 rounded-full font-sans text-xs sm:text-sm font-semibold whitespace-nowrap active:scale-95 transition-all ${
              selectedCategory === 'bestsellers'
                ? 'bg-[#1C1917] text-white shadow-xs'
                : 'bg-[#efeeeb] text-[#1C1917] hover:bg-[#e3e2e0]'
            }`}
          >
            ⭐ Bestsellers
          </button>
        </div>
      </section>

      {/* 3. ARTISAN BESTSELLERS SHOWCASE (Horizontal Carousel) */}
      <section className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4 flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="font-sans text-[11px] font-bold text-[#F59E0B] uppercase tracking-wider block">
              Seasonal Cellar
            </span>
            <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-[#1C1917]">
              Artisan Bestsellers
            </h2>
          </div>
          <Link
            to="/products"
            className="font-sans text-xs sm:text-sm text-[#0B2417] hover:text-[#F59E0B] font-bold flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <ChevronRight size={15} />
          </Link>
        </div>

        {/* Horizontal Product Scroller */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth py-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-shrink-0 w-64 h-80 bg-[#f4f3f1] rounded-2xl animate-pulse" />
            ))
          ) : bestsellers.length > 0 ? (
            bestsellers.slice(0, 8).map((product) => {
              const price = Math.round(Number(product.price) || 0);
              const brand = product.manufacturer?.business_name || 'Artisan Workshop';
              const provenance = product.origin_district || product.manufacturer?.location_district || 'Northeast';
              const imageUrl = product.primary_image_url || '/featured-pouches.png';
              const weight = product.weight_grams ? `${product.weight_grams}g Jar` : '250g Glass Jar';

              return (
                <article
                  key={product.id}
                  className="flex-shrink-0 w-64 bg-[#f4f3f1] rounded-2xl p-3 flex flex-col justify-between shadow-xs border border-stone-200/70 hover:shadow-md hover:border-[#0B2417]/30 transition-all duration-300 relative group"
                >
                  <Link to={`/product/${product.slug}`} className="block">
                    <div className="relative w-full h-44 rounded-xl overflow-hidden bg-[#efeeeb] mb-3">
                      <img
                        src={imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      {/* Dietary Tag */}
                      <div className="absolute top-2 left-2 flex items-center gap-1 bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded-full text-[9.5px] font-bold uppercase shadow-xs">
                        <span className={`w-1.5 h-1.5 rounded-full ${product.dietary_type === 'VEG' ? 'bg-[#059669]' : 'bg-red-600'}`} />
                        <span className={product.dietary_type === 'VEG' ? 'text-[#059669]' : 'text-red-600'}>
                          {product.dietary_type === 'VEG' ? 'VEG' : 'NON-VEG'}
                        </span>
                      </div>
                      {/* Provenance */}
                      <div className="absolute top-2 right-2 bg-[#1C1917]/80 text-white backdrop-blur-xs px-2 py-0.5 rounded-full text-[9px] font-mono">
                        {provenance}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-sans text-[10px] font-semibold text-stone-500 uppercase tracking-wider truncate">
                        {brand}
                      </span>
                      <h3 className="font-serif font-bold text-[#1C1917] text-base line-clamp-1 group-hover:text-[#0B2417] transition-colors">
                        {product.title}
                      </h3>
                      <p className="font-sans text-xs text-stone-600 line-clamp-2 leading-relaxed">
                        {product.description || 'Slow-cured authentic regional recipe with pure cold-pressed mustard oil.'}
                      </p>

                      {/* Heat Flame Indicator */}
                      <div className="flex items-center gap-1 text-[#F59E0B] mt-1 text-xs font-bold">
                        <span>🔥</span>
                        {product.spice_level === 'EXTRA_HOT' ? (
                          <>
                            <span>🔥</span>
                            <span>🔥</span>
                            <span className="text-[10px] text-stone-500 ml-1 font-sans">Extra Hot</span>
                          </>
                        ) : product.spice_level === 'HOT' ? (
                          <>
                            <span>🔥</span>
                            <span className="text-[10px] text-stone-500 ml-1 font-sans">High Heat</span>
                          </>
                        ) : (
                          <span className="text-[10px] text-stone-500 ml-1 font-sans">Mild Zest</span>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="flex items-center justify-between mt-3 pt-2 bg-white/70 rounded-xl px-2.5 py-1.5 border border-stone-200/50">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-stone-500">{weight}</span>
                      <span className="font-serif font-bold text-base text-[#1C1917]">₹{price}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleQuickAdd(product, e)}
                      disabled={addingId === product.id}
                      className="px-3.5 py-1.5 rounded-full bg-[#0B2417] hover:bg-black text-white font-sans text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-xs"
                    >
                      {addingId === product.id ? '...' : '+ Add'}
                    </button>
                  </div>
                </article>
              );
            })
          ) : null}
        </div>
      </section>

      {/* 4. OFFICIAL BRAND STORES (Artisan Verification Carousel) */}
      <section className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div className="bg-[#f4f3f1]/80 rounded-2xl p-4 sm:p-6 border border-stone-200/70">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={22} className="text-[#0B2417]" />
              <div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#1C1917]">
                  Official Brand Stores
                </h2>
                <span className="font-sans text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                  Direct Workshop Dispatch
                </span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#ECFDF5] text-[#059669] font-sans text-[11px] font-bold">
              100% Verified
            </span>
          </div>

          {/* Store Badges Slider */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth py-1 -mx-2 px-2 sm:mx-0 sm:px-0">
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="flex-shrink-0 w-52 h-20 rounded-2xl bg-white animate-pulse" />
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

      {/* 5. CURATED SMALL-BATCH PANTRY ITEMS (2-Column Mobile, 4-Column Desktop Grid) */}
      <section className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-4">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="font-sans text-[11px] font-bold text-[#0B2417] uppercase tracking-wider block">
              Rare Batches
            </span>
            <h2 className="font-serif text-xl sm:text-2xl lg:text-3xl font-bold text-[#1C1917]">
              Curated Pantry Items
            </h2>
          </div>
          <span className="font-sans text-xs text-stone-500 hidden sm:inline">
            250g Stone Pouch & Heritage Jars
          </span>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
          {loading ? (
            [1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-80 rounded-2xl bg-[#f4f3f1] animate-pulse" />
            ))
          ) : filteredProducts.length > 0 ? (
            filteredProducts.slice(0, 12).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-sm text-stone-500">
              No artisanal items found in this category.
            </div>
          )}
        </div>
      </section>

      {/* 6. THE WANGS PURITY ASSURANCE & CRAFT STANDARDS */}
      <section className="w-full border-t border-[#E7E5E4] mt-8 sm:mt-12 py-10 sm:py-14 bg-white">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12">
            <span className="font-sans text-[11px] font-bold text-[#F59E0B] uppercase tracking-widest block">
              Purity &amp; Provenance
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#1C1917] mt-1">
              The Wangs Assurance Standard
            </h3>
            <p className="font-sans text-xs sm:text-sm text-stone-500 mt-2">
              Uncompromising dedication to traditional culinary curing methods, zero chemical preservatives, and direct dispatch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Card 1 */}
            <div className="bg-[#FAF9F6] rounded-2xl p-6 border border-[#E7E5E4] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#ECFDF5] text-[#059669] flex items-center justify-center">
                    <ShieldCheck size={20} />
                  </div>
                  <span className="font-sans text-[10px] font-bold tracking-widest text-[#059669] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full uppercase">
                    01 · VERIFIED QUALITY
                  </span>
                </div>
                <h4 className="font-serif font-bold text-lg text-[#1C1917]">
                  Direct From Verified Brands
                </h4>
                <p className="font-sans text-xs text-stone-600 mt-2 leading-relaxed">
                  Every batch is cured in registered artisanal workshops under strict FSSAI food hygiene and safety standards.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-stone-200 flex flex-col gap-1.5 text-xs text-stone-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#059669] shrink-0" />
                  <span>FSSAI Certified Small Batches</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#059669] shrink-0" />
                  <span>Authentic Regional Lineage</span>
                </div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-[#FAF9F6] rounded-2xl p-6 border border-[#E7E5E4] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-800 flex items-center justify-center">
                    <Plane size={20} />
                  </div>
                  <span className="font-sans text-[10px] font-bold tracking-widest text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full uppercase">
                    02 · EXPRESS LOGISTICS
                  </span>
                </div>
                <h4 className="font-serif font-bold text-lg text-[#1C1917]">
                  All-India Air Express Dispatch
                </h4>
                <p className="font-sans text-xs text-stone-600 mt-2 leading-relaxed">
                  Packed in shock-absorbing air cushions to ensure complete leak-proof protection across all Indian PIN codes.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-stone-200 flex flex-col gap-1.5 text-xs text-stone-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-amber-600 shrink-0" />
                  <span>Direct Air Express Shipping</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-amber-600 shrink-0" />
                  <span>Shock-Proof Zero Leakage Seal</span>
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-[#FAF9F6] rounded-2xl p-6 border border-[#E7E5E4] shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center">
                    <Leaf size={20} />
                  </div>
                  <span className="font-sans text-[10px] font-bold tracking-widest text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase">
                    03 · HERITAGE PURITY
                  </span>
                </div>
                <h4 className="font-serif font-bold text-lg text-[#1C1917]">
                  Zero Synthetic Preservatives
                </h4>
                <p className="font-sans text-xs text-stone-600 mt-2 leading-relaxed">
                  Cured purely with raw wood-churned cold-pressed mustard oil, indigenous King Chilli, and wood-smoke fermentation.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-stone-200 flex flex-col gap-1.5 text-xs text-stone-700">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#059669] shrink-0" />
                  <span>100% Cold-Pressed Mustard Oil</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-[#059669] shrink-0" />
                  <span>No Added Chemical Stabilizers</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
