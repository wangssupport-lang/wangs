import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';
import ProductCard from '../components/ProductCard';

export default function HomePage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const toast = useToast();
  const [bestsellers, setBestsellers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Flash deal countdown timer simulation: 04h : 18m : 14s
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 18, seconds: 14 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 4, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const [bestData, prodData] = await Promise.all([
          api.getBestsellerProducts(),
          api.getProducts({ page_size: 24 }),
        ]);
        const best = bestData?.results || bestData || [];
        const prods = prodData?.results || prodData || [];
        setBestsellers(best.length > 0 ? best : prods);
        setAllProducts(prods);
      } catch (err) {
        console.error('Failed to load products for homepage', err);
      }
    }
    loadData();
  }, []);

  const handleQuickAdd = async (e, title, id = null) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (id && typeof id === 'number') {
        await addToCart(id, 1);
      }
      toast.success(`Added ${title} to Jar Bag`);
    } catch (err) {
      toast.error('Added to cart');
    }
  };

  const pad = (n) => String(n).padStart(2, '0');

  // Desktop 6 Featured Products matching Image 1 exactly
  const desktopCurated = [
    {
      id: 'dt-1',
      title: 'Heritage Cold-Pressed Cut Mango Avakaya (500g)',
      slug: 'heritage-cold-pressed-cut-mango-avakaya',
      price: 349,
      mrp: 410,
      origin_district: 'Guntur, AP',
      manufacturer: { business_name: 'Laxmi Homemade Pickles (Est. 1991)' },
      rating: 4.9,
      review_count: 1154,
      primary_image_url: '/images/stitch/stitch_15_a71e4355c8.jpg',
      heat_level: 'EXTRA_HOT',
      micro_badge: 'Sun-Matured Batch #16 • Packed 4 days ago',
    },
    {
      id: 'dt-2',
      title: 'Whole Desi Garlic Sun-Cured Kachi Ghani Achar (400g)',
      slug: 'whole-desi-garlic-sun-cured-kachi-ghani-achar',
      price: 280,
      mrp: 330,
      origin_district: 'Moradabad, UP',
      manufacturer: { business_name: 'Radha Rasoi & Sons (Est. 1981)' },
      rating: 4.8,
      review_count: 920,
      primary_image_url: '/images/stitch/stitch_11_699d18f354.jpg',
      heat_level: 'MEDIUM',
      micro_badge: 'Wood Churned Oil • Packed 2 days ago',
    },
    {
      id: 'dt-3',
      title: 'Sun-Glazed Keri Chunda with Roasted Jeera (450g)',
      slug: 'sun-glazed-keri-chunda-with-roasted-jeera',
      price: 260,
      mrp: 299,
      origin_district: 'Surat, GJ',
      manufacturer: { business_name: 'Bapuji Gruh Udyog (Est. 1976)' },
      rating: 4.9,
      review_count: 1410,
      primary_image_url: '/images/stitch/stitch_13_ce5bb9d20e.jpg',
      heat_level: 'MILD',
      micro_badge: '100% Terrace Sun-Matured • Zero Oil',
    },
    {
      id: 'dt-4',
      title: 'Smoked Bhut Jolokia & Bamboo Shoot Pickle (250g)',
      slug: 'smoked-bhut-jolokia-bamboo-shoot-pickle',
      price: 399,
      mrp: 499,
      origin_district: 'Guwahati, AS',
      manufacturer: { business_name: 'Brahmaputra Organics (Est. 2012)' },
      rating: 4.7,
      review_count: 640,
      primary_image_url: '/images/stitch/stitch_1_c441147494.jpg',
      heat_level: 'EXTRA_HOT',
      micro_badge: 'Wild Foraged • Batch #11',
    },
    {
      id: 'dt-5',
      title: 'Banarasi Bharwa Lal Mirch (Whole Stuffed Red Chili) 500g',
      slug: 'banarasi-bharwa-lal-mirch-whole-stuffed',
      price: 365,
      mrp: 440,
      origin_district: 'Varanasi, UP',
      manufacturer: { business_name: 'Awadh Heritage Achar Ghar (Est. 1968)' },
      rating: 4.9,
      review_count: 2110,
      primary_image_url: '/images/stitch/stitch_12_c5839b9db5.jpg',
      heat_level: 'HOT',
      micro_badge: 'Hand-Stuffed With 14 Whole Spices',
    },
    {
      id: 'dt-6',
      title: 'Desi Baby Jackfruit (Kathal) Masala Achar (500g)',
      slug: 'desi-baby-jackfruit-kathal-masala-achar',
      price: 315,
      mrp: 360,
      origin_district: 'Bettiah, BR',
      manufacturer: { business_name: 'Champaran Dadi Ma Pickle Udyog' },
      rating: 4.8,
      review_count: 890,
      primary_image_url: '/images/stitch/stitch_19_afd0c67404.jpg',
      heat_level: 'MEDIUM',
      micro_badge: 'Pure Mustard Oil • Batch #19',
    },
  ];

  return (
    <div className="w-full bg-background min-h-screen text-on-surface">
      {/* ========================================================
          DESKTOP VIEW (EXACTLY MATCHING IMAGE 1)
          ======================================================== */}
      <div className="hidden md:block">
        {/* Section 1: Hero Announcement & Marketplace Banner */}
        <section className="w-full bg-surface-container-low px-6 lg:px-12 py-12 lg:py-16">
          <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left 7 Columns */}
            <div className="col-span-7 flex flex-col gap-5">
              <div className="inline-flex items-center gap-1.5 bg-primary-fixed text-on-primary-fixed px-3.5 py-1 rounded-full w-fit shadow-xs">
                <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                <span className="font-label-md text-xs font-bold uppercase tracking-wide">
                  Direct From 18 Spice States
                </span>
              </div>

              <h1 className="font-display-lg text-4xl lg:text-[54px] font-serif text-on-surface tracking-tight leading-[1.12]">
                Authentic Indian Pickles, <br />
                Handcrafted by Heritage <br />
                Makers.
              </h1>

              <p className="font-body-lg text-base text-on-surface-variant max-w-2xl leading-relaxed">
                Connecting 320+ certified artisanal pickle manufacturers across 18 states directly with pickle lovers. Sun-cured in wood-pressed mustard oil, stone-ground spices, zero synthetic preservatives.
              </p>

              {/* CTA Buttons */}
              <div className="flex items-center gap-3.5 pt-2">
                <a
                  href="#artisan-bestsellers"
                  className="bg-primary text-on-primary font-title-md text-sm px-6 py-3.5 rounded-full shadow-md hover:bg-primary-container transition-all flex items-center gap-2 font-bold active:scale-95"
                >
                  <span>Shop Regional Pickles</span>
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </a>

                <Link
                  to="/manufacturer/register"
                  className="bg-surface text-on-surface font-title-md text-sm px-6 py-3.5 rounded-full shadow-xs hover:bg-surface-variant border border-outline-variant/40 transition-all flex items-center gap-2 font-semibold active:scale-95"
                >
                  <span className="material-symbols-outlined text-secondary text-[18px]">storefront</span>
                  <span>Register as a Manufacturer (0% Commission)</span>
                </Link>
              </div>

              {/* 3 Metric Stat Cards */}
              <div className="grid grid-cols-3 gap-3.5 pt-3 max-w-xl">
                <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-outline-variant/30">
                  <span className="font-headline-md text-2xl font-serif text-primary font-bold block">
                    14,200+
                  </span>
                  <span className="font-label-md text-xs text-on-surface-variant">
                    Jars Delivered Pan-India
                  </span>
                </div>

                <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-outline-variant/30">
                  <div className="flex items-center gap-1">
                    <span className="font-headline-md text-2xl font-serif text-secondary font-bold">
                      4.8
                    </span>
                    <span className="material-symbols-outlined text-secondary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      star
                    </span>
                  </div>
                  <span className="font-label-md text-xs text-on-surface-variant">
                    Average Batch Rating
                  </span>
                </div>

                <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-outline-variant/30">
                  <span className="font-headline-md text-2xl font-serif text-tertiary font-bold block">
                    320+
                  </span>
                  <span className="font-label-md text-xs text-on-surface-variant">
                    Verified Heritage Kitchens
                  </span>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Hero Visual Showcase */}
            <div className="col-span-5 relative">
              <div className="relative bg-surface-container-highest rounded-3xl overflow-hidden shadow-xl p-3 border border-outline-variant/30">
                <img
                  src="/images/stitch/stitch_3_d0bc312725.jpg"
                  alt="Traditional Indian raw mango pickle achar inside glazed ceramic martaban earthen jar under warm golden sun"
                  className="w-full h-[420px] object-cover rounded-2xl shadow-md"
                />

                {/* Floating Badge 1: Top Left - Solid Clean Surface */}
                <div className="absolute top-6 left-6 bg-surface px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-outline-variant/30">
                  <span className="material-symbols-outlined text-secondary text-[17px]">verified</span>
                  <span className="font-label-md text-xs font-bold text-on-surface">Sun-Cured Batch #24 Active</span>
                </div>

                {/* Floating Badge 2: Bottom Right - Solid Clean Badge */}
                <div className="absolute bottom-6 right-6 bg-inverse-surface text-inverse-on-surface p-3.5 rounded-xl shadow-xl flex items-center gap-3 max-w-[260px] border border-white/10">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-secondary-container text-[22px]">thermostat</span>
                  </div>
                  <div>
                    <p className="font-label-sm text-[10px] uppercase tracking-wider text-secondary-fixed-dim font-bold">Terroir Fermentation</p>
                    <p className="font-title-md text-xs font-semibold leading-tight">21-Day Earthen Jar Maturation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Explore Indian Pickle Traditions (6 Heritage Belts) */}
        <section className="w-full px-6 lg:px-12 py-14">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="font-label-md text-xs uppercase tracking-wider text-primary font-bold">
                  TERROIR &amp; REGIONAL HERITAGE
                </span>
                <h2 className="font-headline-lg text-3xl font-serif text-on-surface mt-1">
                  Explore Indian Pickle Traditions
                </h2>
                <p className="font-body-md text-sm text-on-surface-variant mt-0.5">
                  Every state cures with unique heirloom oils, micro-climates, and regional chilis.
                </p>
              </div>

              <Link
                to="/products"
                className="flex items-center gap-1 text-primary font-label-lg text-sm font-bold hover:underline"
              >
                <span>View All 18 States Directory</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>

            {/* 6 Terroir Cards Grid */}
            <div className="grid grid-cols-6 gap-4">
              {/* Andhra Pradesh */}
              <Link
                to="/products?search=andhra"
                className="group bg-surface-container-low rounded-2xl p-3.5 shadow-xs hover:shadow-md border border-outline-variant/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-32 rounded-xl overflow-hidden bg-surface-container-highest mb-3">
                    <img
                      src="/images/stitch/stitch_23_65b6bffc80.jpg"
                      alt="Traditional Andhra Avakaya pickle"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <span className="font-label-sm text-[10px] text-primary uppercase font-bold">
                    Andhra Pradesh
                  </span>
                  <h3 className="font-title-md text-sm font-bold text-on-surface group-hover:text-primary transition-colors leading-tight mt-0.5">
                    Avakaya &amp; Gongura
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-1 line-clamp-2">
                    Fiery Guntur chillies, wood-pressed til oil.
                  </p>
                </div>
                <span className="font-label-sm text-[11px] text-outline mt-3 block">
                  54 Kitchens
                </span>
              </Link>

              {/* Rajasthan & Gujarat */}
              <Link
                to="/products?search=rajasthan"
                className="group bg-surface-container-low rounded-2xl p-3.5 shadow-xs hover:shadow-md border border-outline-variant/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-32 rounded-xl overflow-hidden bg-surface-container-highest mb-3">
                    <img
                      src="/images/stitch/stitch_28_e70c8eaecf.jpg"
                      alt="Marwari Ker Sangri"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <span className="font-label-sm text-[10px] text-secondary uppercase font-bold">
                    Rajasthan &amp; Gujarat
                  </span>
                  <h3 className="font-title-md text-sm font-bold text-on-surface group-hover:text-secondary transition-colors leading-tight mt-0.5">
                    Ker Sangri &amp; Methia
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-1 line-clamp-2">
                    Wild Thar desert flora, dry roasted fenugreek.
                  </p>
                </div>
                <span className="font-label-sm text-[11px] text-outline mt-3 block">
                  42 Kitchens
                </span>
              </Link>

              {/* Punjab & Awadh */}
              <Link
                to="/products?search=punjab"
                className="group bg-surface-container-low rounded-2xl p-3.5 shadow-xs hover:shadow-md border border-outline-variant/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-32 rounded-xl overflow-hidden bg-surface-container-highest mb-3">
                    <img
                      src="/images/stitch/stitch_8_bc173752a7.jpg"
                      alt="Gobhi Gajar Shalgam pickle"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <span className="font-label-sm text-[10px] text-tertiary uppercase font-bold">
                    Punjab &amp; Awadh
                  </span>
                  <h3 className="font-title-md text-sm font-bold text-on-surface group-hover:text-tertiary transition-colors leading-tight mt-0.5">
                    Gobhi-Gajar &amp; Nimbu
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-1 line-clamp-2">
                    Sweet and sour jaggery glaze with whole cloves.
                  </p>
                </div>
                <span className="font-label-sm text-[11px] text-outline mt-3 block">
                  68 Kitchens
                </span>
              </Link>

              {/* Kerala & Coastal */}
              <Link
                to="/products?search=kerala"
                className="group bg-surface-container-low rounded-2xl p-3.5 shadow-xs hover:shadow-md border border-outline-variant/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-32 rounded-xl overflow-hidden bg-surface-container-highest mb-3">
                    <img
                      src="/images/stitch/stitch_5_9a78255073.jpg"
                      alt="Vadu Manga"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <span className="font-label-sm text-[10px] text-primary uppercase font-bold">
                    Kerala &amp; Coastal
                  </span>
                  <h3 className="font-title-md text-sm font-bold text-on-surface group-hover:text-primary transition-colors leading-tight mt-0.5">
                    Vadu Manga &amp; Prawns
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-1 line-clamp-2">
                    Tender baby mangoes &amp; coastal cured seafood.
                  </p>
                </div>
                <span className="font-label-sm text-[11px] text-outline mt-3 block">
                  38 Kitchens
                </span>
              </Link>

              {/* Northeast India */}
              <Link
                to="/products?search=bamboo"
                className="group bg-surface-container-low rounded-2xl p-3.5 shadow-xs hover:shadow-md border border-outline-variant/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-32 rounded-xl overflow-hidden bg-surface-container-highest mb-3">
                    <img
                      src="/images/stitch/stitch_31_04e626101e.jpg"
                      alt="Bhut Jolokia & Bamboo"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <span className="font-label-sm text-[10px] text-error uppercase font-bold">
                    Northeast India
                  </span>
                  <h3 className="font-title-md text-sm font-bold text-on-surface group-hover:text-error transition-colors leading-tight mt-0.5">
                    Bhut Jolokia &amp; Bamboo
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-1 line-clamp-2">
                    Fermented tender shoots with smoke chillies.
                  </p>
                </div>
                <span className="font-label-sm text-[11px] text-outline mt-3 block">
                  29 Kitchens
                </span>
              </Link>

              {/* Maharashtra & MP */}
              <Link
                to="/products?search=thecha"
                className="group bg-surface-container-low rounded-2xl p-3.5 shadow-xs hover:shadow-md border border-outline-variant/30 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="h-32 rounded-xl overflow-hidden bg-surface-container-highest mb-3">
                    <img
                      src="/images/stitch/stitch_10_baeadf8fdb.jpg"
                      alt="Kolhapuri Thecha & Mirch"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <span className="font-label-sm text-[10px] text-secondary uppercase font-bold">
                    Maharashtra &amp; MP
                  </span>
                  <h3 className="font-title-md text-sm font-bold text-on-surface group-hover:text-secondary transition-colors leading-tight mt-0.5">
                    Kolhapuri Thecha &amp; Mirch
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-1 line-clamp-2">
                    Coarse ground spicy chilies and Banarasi pods.
                  </p>
                </div>
                <span className="font-label-sm text-[11px] text-outline mt-3 block">
                  45 Kitchens
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* Section 3: Curated Artisan Pickle Bestsellers (3x2 Grid) */}
        <section className="w-full bg-surface-container-low px-6 lg:px-12 py-14" id="artisan-bestsellers">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-secondary-fixed text-on-secondary-fixed px-3 py-1 rounded-full font-label-sm text-xs font-bold uppercase mb-2">
                  <span className="material-symbols-outlined text-[15px]">local_fire_department</span>
                  <span>FRESH BATCHES DAILY</span>
                </div>
                <h2 className="font-headline-lg text-3xl font-serif text-on-surface">
                  Curated Artisan Pickle Bestsellers
                </h2>
                <p className="font-body-md text-sm text-on-surface-variant mt-0.5">
                  Lab-tested, sun-fermented batches shipped directly from heritage cottage makers.
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-4 py-1.5 rounded-full font-label-md text-xs font-bold transition-all ${
                    activeFilter === 'ALL'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-variant border border-outline-variant/30'
                  }`}
                >
                  All Batches
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('SPICY')}
                  className={`px-4 py-1.5 rounded-full font-label-md text-xs font-bold transition-all ${
                    activeFilter === 'SPICY'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-variant border border-outline-variant/30'
                  }`}
                >
                  Fiery Spice 🌶️🌶️🌶️
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('OIL_FREE')}
                  className={`px-4 py-1.5 rounded-full font-label-md text-xs font-bold transition-all ${
                    activeFilter === 'OIL_FREE'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-variant border border-outline-variant/30'
                  }`}
                >
                  Oil-Free / Sundried
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('ZERO_SUGAR')}
                  className={`px-4 py-1.5 rounded-full font-label-md text-xs font-bold transition-all ${
                    activeFilter === 'ZERO_SUGAR'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-variant border border-outline-variant/30'
                  }`}
                >
                  Zero Sugar
                </button>
              </div>
            </div>

            {/* 3x2 Grid */}
            <div className="grid grid-cols-3 gap-6">
              {desktopCurated.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Tales from the Spice Community */}
        <section className="w-full bg-surface-container-low px-6 lg:px-12 py-14">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <span className="font-label-md text-xs uppercase tracking-wider text-primary font-bold">
                  VERIFIED GOURMANDS
                </span>
                <h2 className="font-headline-lg text-3xl font-serif text-on-surface mt-1">
                  Tales from the Spice Community
                </h2>
                <p className="font-body-md text-sm text-on-surface-variant mt-0.5">
                  Over 14,000+ meals elevated by authentic village flavors.
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="flex text-secondary">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className="material-symbols-outlined text-[19px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </div>
                <span className="font-title-md text-sm font-bold text-on-surface">4.8 / 5.0</span>
                <span className="font-body-sm text-xs text-outline">(3,480+ batch ratings)</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Review 1 */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/30 flex flex-col justify-between">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex text-secondary">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      ))}
                    </div>
                    <span className="bg-tertiary-fixed text-on-tertiary-fixed text-label-sm font-label-sm px-2 py-0.5 rounded text-[10px] font-bold">
                      Verified Purchase
                    </span>
                  </div>

                  <p className="font-body-md text-xs text-on-surface leading-relaxed">
                    "The Guntur Avakaya brought tears to my eyes—literally and emotionally. It is the EXACT flavor my grandmother made in Vijayawada 30 years ago. No supermarket brand comes within a mile of this wood-pressed aroma."
                  </p>

                  <div className="h-28 rounded-xl overflow-hidden bg-surface-container-high my-1">
                    <img
                      src="/images/stitch/stitch_30_fb45f00afe.jpg"
                      alt="Curd rice with pickle"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-outline-variant/30 mt-3">
                  <div className="w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center font-title-md text-xs text-on-secondary-fixed font-bold">
                    AK
                  </div>
                  <div>
                    <h4 className="font-title-md text-xs font-bold text-on-surface">Ananya K.</h4>
                    <p className="font-body-sm text-[11px] text-on-surface-variant">Bengaluru • Mango Avakaya (500g)</p>
                  </div>
                </div>
              </div>

              {/* Review 2 */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/30 flex flex-col justify-between">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex text-secondary">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      ))}
                    </div>
                    <span className="bg-tertiary-fixed text-on-tertiary-fixed text-label-sm font-label-sm px-2 py-0.5 rounded text-[10px] font-bold">
                      Verified Purchase
                    </span>
                  </div>

                  <p className="font-body-md text-xs text-on-surface leading-relaxed">
                    "The packaging is impeccable. Arrived in a leak-proof double-vacuum cocoon with zero oil spillage. The stuffed Banarasi red chili had the perfect punch of roasted amchur and whole mustard oil."
                  </p>

                  <div className="h-28 rounded-xl overflow-hidden bg-surface-container-high my-1">
                    <img
                      src="/images/stitch/stitch_22_2b98edc9ec.jpg"
                      alt="Martaban on dining table"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-outline-variant/30 mt-3">
                  <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center font-title-md text-xs text-on-primary-fixed font-bold">
                    VS
                  </div>
                  <div>
                    <h4 className="font-title-md text-xs font-bold text-on-surface">Vikramaditya S.</h4>
                    <p className="font-body-sm text-[11px] text-on-surface-variant">Gurugram • Banarasi Mirch (500g)</p>
                  </div>
                </div>
              </div>

              {/* Review 3 */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/30 flex flex-col justify-between">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex text-secondary">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <span key={i} className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      ))}
                    </div>
                    <span className="bg-tertiary-fixed text-on-tertiary-fixed text-label-sm font-label-sm px-2 py-0.5 rounded text-[10px] font-bold">
                      Verified Purchase
                    </span>
                  </div>

                  <p className="font-body-md text-xs text-on-surface leading-relaxed">
                    "Being away from Assam, getting authentic Bhut Jolokia pickle without chemical preservatives felt impossible until Wangs. Smoky, brutal heat, and rich bamboo shoots. Re-ordering batch #12!"
                  </p>

                  <div className="h-28 rounded-xl overflow-hidden bg-surface-container-high my-1">
                    <img
                      src="/images/stitch/stitch_7_dced7e9a07.jpg"
                      alt="Ghost pepper pickle on bell metal plate"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-outline-variant/30 mt-3">
                  <div className="w-9 h-9 rounded-full bg-tertiary-fixed flex items-center justify-center font-title-md text-xs text-on-tertiary-fixed font-bold">
                    DB
                  </div>
                  <div>
                    <h4 className="font-title-md text-xs font-bold text-on-surface">Debashree B.</h4>
                    <p className="font-body-sm text-[11px] text-on-surface-variant">Mumbai • Bhut Jolokia Pickle (250g)</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ========================================================
          MOBILE VIEW (EXACTLY MATCHING STITCH IMAGES 1, 2 & 3)
          ======================================================== */}
      <div className="md:hidden flex flex-col gap-4 px-3.5 pt-3 pb-8">
        {/* 1. Hero Promo Banner Card (The Great Achar Season) */}
        <section className="flex flex-col gap-2">
          <div className="relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-primary via-primary-container to-secondary shadow-md text-on-primary min-h-[160px] p-4 flex flex-col justify-between">
            <div className="flex flex-col gap-1 z-10">
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-label-sm text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                <span className="material-symbols-outlined text-[13px]">local_fire_department</span>
                <span>FRESH BATCH LIVE</span>
              </span>
              <h2 className="font-headline-sm text-[22px] font-serif font-bold text-white leading-tight mt-0.5">
                The Great Achar Season
              </h2>
              <p className="font-body-sm text-[11px] text-white/90 max-w-[260px] leading-snug line-clamp-2">
                Authentic Andhra Avakaya &amp; Gongura small-batches straight from Guntur clay jars.
              </p>
            </div>

            <div className="flex items-center justify-between z-10 pt-2">
              <div className="flex items-center gap-1.5 bg-white/15 px-2.5 py-1 rounded-lg">
                <span className="font-label-sm text-[10px] text-secondary-fixed">CODE:</span>
                <span className="font-label-md text-xs font-bold text-white tracking-wider">ACHAR15</span>
              </div>
              <Link
                to="/products?category=andhra-gongura"
                className="px-3.5 py-1.5 rounded-full bg-white text-primary font-label-md text-xs font-bold shadow-sm active:scale-95 transition-transform flex items-center gap-1"
              >
                <span>Shop Now</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </Link>
            </div>

            {/* Slide Indicator Dots */}
            <div className="absolute bottom-2.5 right-28 flex items-center gap-1 z-20">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
            </div>
          </div>

          {/* Fast Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-3.5 px-3.5 py-1">
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-xs font-bold whitespace-nowrap shadow-xs shrink-0 transition-colors ${
                activeFilter === 'ALL'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/30'
              }`}
            >
              All Pickles
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('HOT')}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-xs font-medium whitespace-nowrap border border-outline-variant/30 shrink-0 flex items-center gap-1 transition-colors ${
                activeFilter === 'HOT'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              <span>🌶️</span> Fiery Hot
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('MANGO')}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-xs font-medium whitespace-nowrap border border-outline-variant/30 shrink-0 transition-colors ${
                activeFilter === 'MANGO'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              Mango Specials
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('ZERO_OIL')}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-xs font-medium whitespace-nowrap border border-outline-variant/30 shrink-0 transition-colors ${
                activeFilter === 'ZERO_OIL'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              Oil-Free
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('GARLIC')}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-xs font-medium whitespace-nowrap border border-outline-variant/30 shrink-0 transition-colors ${
                activeFilter === 'GARLIC'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              Garlic &amp; Chutney
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('NON_VEG')}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-xs font-medium whitespace-nowrap border border-outline-variant/30 shrink-0 transition-colors ${
                activeFilter === 'NON_VEG'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              Non-Veg Pickles
            </button>
          </div>
        </section>

        {/* 2. Flash Deals / Deal of the Day Section */}
        <section className="flex flex-col gap-2.5 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[16px]">bolt</span>
              </div>
              <div>
                <span className="font-title-md text-sm font-bold text-on-surface flex items-center gap-1 leading-tight">
                  Deal of the Day
                </span>
                <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-[10px]">
                  <span className="material-symbols-outlined text-[12px] text-primary">timer</span>
                  <span>Batch ends in:</span>
                  <span className="font-bold text-primary font-mono">{pad(timeLeft.hours)}h : {pad(timeLeft.minutes)}m : {pad(timeLeft.seconds)}s</span>
                </div>
              </div>
            </div>
            <Link to="/products" className="text-primary font-label-md text-xs font-bold flex items-center gap-0.5">
              <span>See All</span>
              <span className="material-symbols-outlined text-[15px]">chevron_right</span>
            </Link>
          </div>

          {/* Horizontal Deal Cards Slider */}
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
            {/* Deal Item 1: Spicy Avakaya Mango */}
            <div className="w-[190px] shrink-0 bg-surface-container-lowest rounded-xl p-2.5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <div className="relative w-full h-32 rounded-lg overflow-hidden bg-surface-container">
                  <img
                    src="/images/stitch/stitch_23_65b6bffc80.jpg"
                    alt="Spicy Avakaya Mango"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-error text-on-error font-label-sm text-[9px] font-bold">
                    25% OFF
                  </span>
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full bg-surface-container-lowest flex items-center gap-0.5 shadow-xs border border-outline-variant/30">
                    <span className="material-symbols-outlined text-[11px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-label-sm text-[10px] font-bold text-on-surface">4.9</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-0.5">
                  <span className="font-label-sm text-[10px] text-outline truncate flex items-center gap-1">
                    Laxmi Homemade <span className="material-symbols-outlined text-[11px] text-tertiary">verified</span>
                  </span>
                  <h4 className="font-title-md text-xs font-bold text-on-surface line-clamp-1 leading-snug">
                    Spicy Avakaya Mango
                  </h4>
                  <span className="font-body-sm text-[10px] text-tertiary">350g Ceramic Jar</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="font-title-lg text-sm font-bold text-primary">₹289</span>
                    <span className="font-body-sm text-[10px] text-outline line-through">₹385</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => handleQuickAdd(e, 'Spicy Avakaya Mango', 1)}
                className="mt-2 w-full py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-[15px]">add</span> Add
              </button>
            </div>

            {/* Deal Item 2: Banarasi Lal Mirch */}
            <div className="w-[190px] shrink-0 bg-surface-container-lowest rounded-xl p-2.5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <div className="relative w-full h-32 rounded-lg overflow-hidden bg-surface-container">
                  <img
                    src="/images/stitch/stitch_16_a066fa5198.jpg"
                    alt="Banarasi Lal Mirch"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-error text-on-error font-label-sm text-[9px] font-bold">
                    18% OFF
                  </span>
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full bg-surface-container-lowest flex items-center gap-0.5 shadow-xs border border-outline-variant/30">
                    <span className="material-symbols-outlined text-[11px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-label-sm text-[10px] font-bold text-on-surface">4.8</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-0.5">
                  <span className="font-label-sm text-[10px] text-outline truncate flex items-center gap-1">
                    Bikaner Spices <span className="material-symbols-outlined text-[11px] text-tertiary">verified</span>
                  </span>
                  <h4 className="font-title-md text-xs font-bold text-on-surface line-clamp-1 leading-snug">
                    Banarasi Lal Mirch
                  </h4>
                  <span className="font-body-sm text-[10px] text-tertiary">400g Hand-Cured</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="font-title-lg text-sm font-bold text-primary">₹349</span>
                    <span className="font-body-sm text-[10px] text-outline line-through">₹425</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => handleQuickAdd(e, 'Banarasi Lal Mirch', 2)}
                className="mt-2 w-full py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-[15px]">add</span> Add
              </button>
            </div>

            {/* Deal Item 3: Desi Garlic Pickle */}
            <div className="w-[190px] shrink-0 bg-surface-container-lowest rounded-xl p-2.5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <div className="relative w-full h-32 rounded-lg overflow-hidden bg-surface-container">
                  <img
                    src="/images/stitch/stitch_11_699d18f354.jpg"
                    alt="Desi Garlic Pickle"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-error text-on-error font-label-sm text-[9px] font-bold">
                    30% OFF
                  </span>
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full bg-surface-container-lowest flex items-center gap-0.5 shadow-xs border border-outline-variant/30">
                    <span className="material-symbols-outlined text-[11px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="font-label-sm text-[10px] font-bold text-on-surface">5.0</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-0.5">
                  <span className="font-label-sm text-[10px] text-outline truncate flex items-center gap-1">
                    Dadi Rasoi <span className="material-symbols-outlined text-[11px] text-tertiary">verified</span>
                  </span>
                  <h4 className="font-title-md text-xs font-bold text-on-surface line-clamp-1 leading-snug">
                    Desi Garlic Pickle
                  </h4>
                  <span className="font-body-sm text-[10px] text-tertiary">300g Jar</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="font-title-lg text-sm font-bold text-primary">₹249</span>
                    <span className="font-body-sm text-[10px] text-outline line-through">₹359</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => handleQuickAdd(e, 'Desi Garlic Pickle', 3)}
                className="mt-2 w-full py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-xs"
              >
                <span className="material-symbols-outlined text-[15px]">add</span> Add
              </button>
            </div>
          </div>
        </section>

        {/* 3. Shop by Heritage Pickle Belts (Exact match to Image 2) */}
        <section className="flex flex-col gap-2 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-sm text-base font-serif font-bold text-on-surface">
                Heritage Pickle Belts
              </h2>
              <p className="font-body-sm text-[11px] text-on-surface-variant">
                Trace unique terroir, native chilies &amp; traditional sun-curing
              </p>
            </div>
            <span className="text-tertiary font-label-sm text-[10px] uppercase tracking-wider font-bold shrink-0">
              6 Terroirs
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {/* Belt 1: Andhra */}
            <Link
              to="/products?search=andhra"
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-center active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden shadow-xs relative p-0.5 bg-secondary-container">
                <img
                  src="/images/stitch/stitch_12_c5839b9db5.jpg"
                  alt="Andhra"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="font-title-md text-xs font-bold text-on-surface leading-tight">Andhra</span>
              <span className="font-label-sm text-[10px] text-outline">Guntur Hot</span>
            </Link>

            {/* Belt 2: Rajasthan */}
            <Link
              to="/products?search=rajasthan"
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-center active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden shadow-xs relative p-0.5 bg-primary-fixed">
                <img
                  src="/images/stitch/stitch_21_bf7f51feb7.jpg"
                  alt="Rajasthan"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="font-title-md text-xs font-bold text-on-surface leading-tight">Rajasthan</span>
              <span className="font-label-sm text-[10px] text-outline">Kair Sangri</span>
            </Link>

            {/* Belt 3: Kerala */}
            <Link
              to="/products?search=kerala"
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-center active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden shadow-xs relative p-0.5 bg-tertiary-fixed">
                <img
                  src="/images/stitch/stitch_24_e2003018f3.jpg"
                  alt="Kerala"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="font-title-md text-xs font-bold text-on-surface leading-tight">Kerala</span>
              <span className="font-label-sm text-[10px] text-outline">Curry Leaf &amp; Fish</span>
            </Link>

            {/* Belt 4: Punjab */}
            <Link
              to="/products?search=punjab"
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-center active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden shadow-xs relative p-0.5 bg-secondary-fixed">
                <img
                  src="/images/stitch/stitch_18_db2cc363df.jpg"
                  alt="Punjab"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="font-title-md text-xs font-bold text-on-surface leading-tight">Punjab</span>
              <span className="font-label-sm text-[10px] text-outline">Pachranga Mix</span>
            </Link>

            {/* Belt 5: Varanasi */}
            <Link
              to="/products?search=banarasi"
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-center active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden shadow-xs relative p-0.5 bg-primary-container">
                <img
                  src="/images/stitch/stitch_6_cad333af7f.jpg"
                  alt="Varanasi"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="font-title-md text-xs font-bold text-on-surface leading-tight">Varanasi</span>
              <span className="font-label-sm text-[10px] text-outline">Sun Stuffed Lal</span>
            </Link>

            {/* Belt 6: Bengal */}
            <Link
              to="/products?search=mustard"
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-center active:scale-95 transition-transform"
            >
              <div className="w-16 h-16 rounded-full overflow-hidden shadow-xs relative p-0.5 bg-surface-variant">
                <img
                  src="/images/stitch/stitch_17_e5f18411f9.jpg"
                  alt="Bengal"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
              <span className="font-title-md text-xs font-bold text-on-surface leading-tight">Bengal</span>
              <span className="font-label-sm text-[10px] text-outline">Kasundi Mustard</span>
            </Link>
          </div>
        </section>

        {/* 4. Curated Bestsellers 2-Column Grid (Exact match to Images 2 & 3) */}
        <section className="flex flex-col gap-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-sm text-base font-serif font-bold text-on-surface">
                Curated Bestsellers
              </h2>
              <p className="font-body-sm text-[11px] text-on-surface-variant">
                Sun-ripened, small batch, 100% preservative-free
              </p>
            </div>
            <Link
              to="/products"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] font-semibold border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[13px] text-tertiary">tune</span>
              <span>Filter</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Item 1: Traditional Cut Raw Mango Avakaya */}
            <article className="bg-surface-container-lowest rounded-xl p-2 shadow-xs border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <div className="relative w-full h-36 rounded-lg overflow-hidden bg-surface-container">
                  <img
                    src="/images/stitch/stitch_20_91c854d291.jpg"
                    alt="Traditional Cut Raw Mango Avakaya"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5 items-start">
                    <span className="px-1.5 py-0.5 rounded bg-primary text-on-primary font-label-sm text-[9px] font-bold shadow-xs">
                      BESTSELLER
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Wishlist"
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white text-on-surface-variant flex items-center justify-center shadow-xs border border-outline-variant/30 active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[15px]">favorite</span>
                  </button>
                  <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-surface-container-lowest font-label-sm text-[9px] font-bold text-primary flex items-center gap-0.5 shadow-xs border border-outline-variant/20">
                    <span>🌶️🌶️🌶️🌶️</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-[10px] text-outline truncate flex items-center gap-0.5">
                      Annapurna <span className="material-symbols-outlined text-[11px] text-tertiary">verified</span>
                    </span>
                    <div className="flex items-center gap-0.5 text-secondary font-label-sm text-[10px] font-bold shrink-0">
                      <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> 4.9
                    </div>
                  </div>
                  <h3 className="font-title-md text-xs font-bold line-clamp-2 leading-snug text-on-surface">
                    Traditional Cut Raw Mango Avakaya
                  </h3>
                  <span className="font-body-sm text-[10px] text-tertiary truncate">500g Glass Pot</span>
                </div>
              </div>

              <div className="mt-2 pt-1 border-t border-outline-variant/30 flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="font-title-lg text-sm font-bold text-primary">₹320</span>
                    <span className="font-body-sm text-[10px] text-outline line-through">₹400</span>
                  </div>
                  <span className="font-label-sm text-[9px] text-error font-bold">20% off</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleQuickAdd(e, 'Traditional Cut Raw Mango Avakaya', 1)}
                  className="w-full py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span> Add
                </button>
              </div>
            </article>

            {/* Item 2: Sun-Dried Bharwa Lal Mirch */}
            <article className="bg-surface-container-lowest rounded-xl p-2 shadow-xs border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <div className="relative w-full h-36 rounded-lg overflow-hidden bg-surface-container">
                  <img
                    src="/images/stitch/stitch_25_1986794434.jpg"
                    alt="Sun-Dried Bharwa Lal Mirch"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5 items-start">
                    <span className="px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container font-label-sm text-[9px] font-bold shadow-xs">
                      45-DAY CURE
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Wishlist"
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white text-on-surface-variant flex items-center justify-center shadow-xs border border-outline-variant/30 active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[15px]">favorite</span>
                  </button>
                  <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-surface-container-lowest font-label-sm text-[9px] font-bold text-primary flex items-center gap-0.5 shadow-xs border border-outline-variant/20">
                    <span>🌶️🌶️🌶️</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-[10px] text-outline truncate flex items-center gap-0.5">
                      Ganga Heritage <span className="material-symbols-outlined text-[11px] text-tertiary">verified</span>
                    </span>
                    <div className="flex items-center gap-0.5 text-secondary font-label-sm text-[10px] font-bold shrink-0">
                      <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> 4.8
                    </div>
                  </div>
                  <h3 className="font-title-md text-xs font-bold line-clamp-2 leading-snug text-on-surface">
                    Sun-Dried Bharwa Lal Mirch
                  </h3>
                  <span className="font-body-sm text-[10px] text-tertiary truncate">450g Ceramic Pot</span>
                </div>
              </div>

              <div className="mt-2 pt-1 border-t border-outline-variant/30 flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="font-title-lg text-sm font-bold text-primary">₹385</span>
                    <span className="font-body-sm text-[10px] text-outline line-through">₹450</span>
                  </div>
                  <span className="font-label-sm text-[9px] text-error font-bold">14% off</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleQuickAdd(e, 'Sun-Dried Bharwa Lal Mirch', 2)}
                  className="w-full py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span> Add
                </button>
              </div>
            </article>

            {/* Item 3: Kachi Haldi Turmeric Root Pickle */}
            <article className="bg-surface-container-lowest rounded-xl p-2 shadow-xs border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <div className="relative w-full h-36 rounded-lg overflow-hidden bg-surface-container">
                  <img
                    src="/images/stitch/stitch_9_df068d00ff.jpg"
                    alt="Kachi Haldi Turmeric Root Pickle"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5 items-start">
                    <span className="px-1.5 py-0.5 rounded bg-tertiary text-on-tertiary font-label-sm text-[9px] font-bold shadow-xs">
                      IMMUNITY
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Wishlist"
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white text-on-surface-variant flex items-center justify-center shadow-xs border border-outline-variant/30 active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[15px]">favorite</span>
                  </button>
                  <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-surface-container-lowest font-label-sm text-[9px] font-bold text-primary flex items-center gap-0.5 shadow-xs border border-outline-variant/20">
                    <span>🌶️🌶️</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-[10px] text-outline truncate flex items-center gap-0.5">
                      Marwar Org <span className="material-symbols-outlined text-[11px] text-tertiary">verified</span>
                    </span>
                    <div className="flex items-center gap-0.5 text-secondary font-label-sm text-[10px] font-bold shrink-0">
                      <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> 4.7
                    </div>
                  </div>
                  <h3 className="font-title-md text-xs font-bold line-clamp-2 leading-snug text-on-surface">
                    Kachi Haldi Turmeric Root Pickle
                  </h3>
                  <span className="font-body-sm text-[10px] text-tertiary truncate">350g Glass Jar</span>
                </div>
              </div>

              <div className="mt-2 pt-1 border-t border-outline-variant/30 flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="font-title-lg text-sm font-bold text-primary">₹295</span>
                    <span className="font-body-sm text-[10px] text-outline line-through">₹360</span>
                  </div>
                  <span className="font-label-sm text-[9px] text-error font-bold">18% off</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleQuickAdd(e, 'Kachi Haldi Turmeric Root Pickle', 3)}
                  className="w-full py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span> Add
                </button>
              </div>
            </article>

            {/* Item 4: Kerala King Fish (Meen) Achar */}
            <article className="bg-surface-container-lowest rounded-xl p-2 shadow-xs border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <div className="relative w-full h-36 rounded-lg overflow-hidden bg-surface-container">
                  <img
                    src="/images/stitch/stitch_29_49dca0be64.jpg"
                    alt="Kerala King Fish (Meen) Achar"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5 items-start">
                    <span className="px-1.5 py-0.5 rounded bg-primary-container text-on-primary-container font-label-sm text-[9px] font-bold shadow-xs">
                      COASTAL
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Wishlist"
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white text-on-surface-variant flex items-center justify-center shadow-xs border border-outline-variant/30 active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[15px]">favorite</span>
                  </button>
                  <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-surface-container-lowest font-label-sm text-[9px] font-bold text-primary flex items-center gap-0.5 shadow-xs border border-outline-variant/20">
                    <span>🌶️🌶️🌶️🌶️</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-[10px] text-outline truncate flex items-center gap-0.5">
                      Malabar Kitc <span className="material-symbols-outlined text-[11px] text-tertiary">verified</span>
                    </span>
                    <div className="flex items-center gap-0.5 text-secondary font-label-sm text-[10px] font-bold shrink-0">
                      <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> 4.9
                    </div>
                  </div>
                  <h3 className="font-title-md text-xs font-bold line-clamp-2 leading-snug text-on-surface">
                    Kerala King Fish (Meen) Achar
                  </h3>
                  <span className="font-body-sm text-[10px] text-tertiary truncate">300g Vacuum Glass</span>
                </div>
              </div>

              <div className="mt-2 pt-1 border-t border-outline-variant/30 flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="font-title-lg text-sm font-bold text-primary">₹449</span>
                    <span className="font-body-sm text-[10px] text-outline line-through">₹520</span>
                  </div>
                  <span className="font-label-sm text-[9px] text-error font-bold">13% off</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleQuickAdd(e, 'Kerala King Fish (Meen) Achar', 4)}
                  className="w-full py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span> Add
                </button>
              </div>
            </article>

            {/* Item 5: Sweet Lime & Lemon Chunda */}
            <article className="bg-surface-container-lowest rounded-xl p-2 shadow-xs border border-outline-variant/30 flex flex-col justify-between">
              <div>
                <div className="relative w-full h-36 rounded-lg overflow-hidden bg-surface-container">
                  <img
                    src="/images/stitch/stitch_13_ce5bb9d20e.jpg"
                    alt="Sweet Lime & Lemon Chunda"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5 items-start">
                    <span className="px-1.5 py-0.5 rounded bg-secondary-fixed text-on-secondary-fixed font-label-sm text-[9px] font-bold shadow-xs">
                      ZERO OIL
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label="Wishlist"
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white text-on-surface-variant flex items-center justify-center shadow-xs border border-outline-variant/30 active:scale-90 transition-transform"
                  >
                    <span className="material-symbols-outlined text-[15px]">favorite</span>
                  </button>
                  <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-surface-container-lowest font-label-sm text-[9px] font-bold text-primary flex items-center gap-0.5 shadow-xs border border-outline-variant/20">
                    <span>🌶️</span>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-[10px] text-outline truncate flex items-center gap-0.5">
                      Kathiyawad <span className="material-symbols-outlined text-[11px] text-tertiary">verified</span>
                    </span>
                    <div className="flex items-center gap-0.5 text-secondary font-label-sm text-[10px] font-bold shrink-0">
                      <span className="material-symbols-outlined text-[11px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> 4.8
                    </div>
                  </div>
                  <h3 className="font-title-md text-xs font-bold line-clamp-2 leading-snug text-on-surface">
                    Sweet Lime &amp; Lemon Chunda
                  </h3>
                  <span className="font-body-sm text-[10px] text-tertiary truncate">400g Glass Jar</span>
                </div>
              </div>

              <div className="mt-2 pt-1 border-t border-outline-variant/30 flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between">
                  <div className="flex items-baseline gap-1">
                    <span className="font-title-lg text-sm font-bold text-primary">₹260</span>
                    <span className="font-body-sm text-[10px] text-outline line-through">₹310</span>
                  </div>
                  <span className="font-label-sm text-[9px] text-error font-bold">16% off</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleQuickAdd(e, 'Sweet Lime & Lemon Chunda', 5)}
                  className="w-full py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span> Add
                </button>
              </div>
            </article>
          </div>
        </section>

        {/* 5. Sell Your Pickles on Wangs Banner Card (Exact match to Image 3) */}
        <section className="relative overflow-hidden rounded-xl bg-surface-container p-4 flex flex-col gap-3 shadow-xs border border-outline-variant/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
              <span className="material-symbols-outlined text-[28px]">soup_kitchen</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-[10px] text-primary font-bold uppercase tracking-wider">
                Artisan Maker Guild
              </span>
              <h3 className="font-headline-sm text-sm font-serif font-bold text-on-surface leading-tight">
                Turn Your Family Recipe Into a Business
              </h3>
            </div>
          </div>
          <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
            Join 320+ verified home cooks and regional manufacturers delivering authentic Indian flavors directly to food lovers nationwide.
          </p>
          <div className="flex items-center gap-4 py-1">
            <div className="flex flex-col">
              <span className="font-title-lg text-base font-bold text-primary">320+</span>
              <span className="font-label-sm text-[10px] text-outline">Active Makers</span>
            </div>
            <div className="h-6 w-px bg-outline-variant/40" />
            <div className="flex flex-col">
              <span className="font-title-lg text-base font-bold text-primary">₹0 Fee</span>
              <span className="font-label-sm text-[10px] text-outline">To List Batches</span>
            </div>
            <div className="h-6 w-px bg-outline-variant/40" />
            <div className="flex flex-col">
              <span className="font-title-lg text-base font-bold text-primary">Pan-India</span>
              <span className="font-label-sm text-[10px] text-outline">Jar Logistics</span>
            </div>
          </div>
          <Link
            to="/manufacturer/register"
            className="w-full h-11 rounded-full bg-primary text-on-primary font-label-lg text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-xs"
          >
            <span className="material-symbols-outlined text-[19px]">storefront</span>
            <span>Register as Seller</span>
          </Link>
        </section>

        {/* 6. Trust Badges Strip (2x2 Grid) */}
        <section className="grid grid-cols-2 gap-2.5 pt-1">
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <div className="w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed shrink-0">
              <span className="material-symbols-outlined text-[19px]">oil_barrel</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-xs font-bold text-on-surface leading-tight">Pure Cold-Pressed</span>
              <span className="font-label-sm text-[10px] text-outline">Authentic Mustard Oil</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <div className="w-9 h-9 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed shrink-0">
              <span className="material-symbols-outlined text-[19px]">science</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-xs font-bold text-on-surface leading-tight">Lab-Tested</span>
              <span className="font-label-sm text-[10px] text-outline">FSSAI Certified Purity</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed shrink-0">
              <span className="material-symbols-outlined text-[19px]">handshake</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-xs font-bold text-on-surface leading-tight">Direct from Artisan</span>
              <span className="font-label-sm text-[10px] text-outline">No Factory Fillers</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-surface-container-low border border-outline-variant/30">
            <div className="w-9 h-9 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant shrink-0">
              <span className="material-symbols-outlined text-[19px]">security</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-xs font-bold text-on-surface leading-tight">Zero-Leak Guard</span>
              <span className="font-label-sm text-[10px] text-outline">Cushioned Jar Transit</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
