import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import ProductCard from '../components/ProductCard';

export default function HomePage() {
  const navigate = useNavigate();
  const [bestsellers, setBestsellers] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Flash deal countdown timer simulation
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 18, seconds: 42 });

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
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter products based on active filter pill
  const filteredProducts = allProducts.filter((product) => {
    if (activeFilter === 'ALL') return true;
    const title = (product.title || '').toLowerCase();
    const desc = (product.description || '').toLowerCase();
    const heat = product.heat_level || '';
    if (activeFilter === 'SPICY') {
      return heat === 'HOT' || heat === 'EXTRA_HOT' || title.includes('chilli') || title.includes('mirch') || title.includes('spicy');
    }
    if (activeFilter === 'OIL_FREE') {
      return title.includes('sundried') || title.includes('oil-free') || desc.includes('oil free') || title.includes('chunda');
    }
    if (activeFilter === 'ZERO_SUGAR') {
      return !title.includes('sweet') && !title.includes('sugar') && !title.includes('chunda');
    }
    return true;
  });

  const displayProducts = filteredProducts.length > 0 ? filteredProducts : (bestsellers.length > 0 ? bestsellers : allProducts);

  // Fallback mock items if catalog is still initializing
  const fallbackCurated = [
    {
      id: 'mock-1',
      title: 'Whole Desi Garlic Sun-Cured Kachi Ghani Achar (400g)',
      slug: 'desi-garlic-achar',
      price: 280,
      mrp: 330,
      origin_district: 'Karnal, HR',
      manufacturer: { business_name: 'Dadi Rasoi (Est. 1984)' },
      rating: 4.8,
      review_count: 920,
      primary_image_url: '/images/stitch/stitch_11_699d18f354.jpg',
      heat_level: 'MEDIUM',
    },
    {
      id: 'mock-2',
      title: 'Sun-Glazed Keri Chunda with Roasted Jeera (450g)',
      slug: 'keri-chunda',
      price: 260,
      mrp: 299,
      origin_district: 'Surat, GJ',
      manufacturer: { business_name: 'Bapuji Gruh Udyog (Est. 1976)' },
      rating: 4.9,
      review_count: 1410,
      primary_image_url: '/images/stitch/stitch_14_b16d8dd4cd.jpg',
      heat_level: 'MILD',
    },
    {
      id: 'mock-3',
      title: 'Smoked Bhut Jolokia & Bamboo Shoot Pickle (250g)',
      slug: 'bhut-jolokia-pickle',
      price: 399,
      mrp: 499,
      origin_district: 'Guwahati, AS',
      manufacturer: { business_name: 'Brahmaputra Organics (Est. 2012)' },
      rating: 4.7,
      review_count: 640,
      primary_image_url: '/images/stitch/stitch_1_c441147494.jpg',
      heat_level: 'EXTRA_HOT',
    },
    {
      id: 'mock-4',
      title: 'Banarasi Bharwa Lal Mirch (Whole Stuffed Red Chili) 500g',
      slug: 'banarasi-bharwa-lal-mirch',
      price: 365,
      mrp: 440,
      origin_district: 'Varanasi, UP',
      manufacturer: { business_name: 'Awadh Heritage Achar Ghar (Est. 1968)' },
      rating: 4.9,
      review_count: 2110,
      primary_image_url: '/images/stitch/stitch_12_c5839b9db5.jpg',
      heat_level: 'HOT',
    },
    {
      id: 'mock-5',
      title: 'Desi Baby Jackfruit (Kathal) Masala Achar (500g)',
      slug: 'baby-jackfruit-achar',
      price: 315,
      mrp: 360,
      origin_district: 'Bettiah, BR',
      manufacturer: { business_name: 'Champaran Dadi Ma Pickle Udyog' },
      rating: 4.8,
      review_count: 890,
      primary_image_url: '/images/stitch/stitch_19_afd0c67404.jpg',
      heat_level: 'MEDIUM',
    },
    {
      id: 'mock-6',
      title: 'Fiery Andhra Guntur Avakaya Raw Mango (400g)',
      slug: 'andhra-guntur-avakaya',
      price: 320,
      mrp: 380,
      origin_district: 'Vijayawada, AP',
      manufacturer: { business_name: 'Laxmi Homemade Pickles (Est. 1991)' },
      rating: 4.9,
      review_count: 1850,
      primary_image_url: '/images/stitch/stitch_23_65b6bffc80.jpg',
      heat_level: 'EXTRA_HOT',
    },
  ];

  const itemsToRender = displayProducts.length > 0 ? displayProducts : fallbackCurated;

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <div className="w-full bg-background min-h-screen text-on-surface">
      {/* ========================================================
          SECTION 1: HERO ANNOUNCEMENT & MARKETPLACE BANNER
          ======================================================== */}
      <section className="w-full bg-surface-container-low px-4 sm:px-6 lg:px-12 py-10 sm:py-16">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Headlines & Copy */}
          <div className="lg:col-span-7 flex flex-col gap-5 sm:gap-6">
            <div className="inline-flex items-center gap-1.5 bg-primary-fixed text-on-primary-fixed px-4 py-1.5 rounded-full w-fit shadow-xs">
              <span className="material-symbols-outlined text-[18px]">local_fire_department</span>
              <span className="font-label-md text-xs sm:text-sm font-bold uppercase tracking-wide">
                Direct From 18 Spice States
              </span>
            </div>

            <h1 className="font-display-lg text-3xl sm:text-5xl lg:text-6xl font-serif text-on-surface tracking-tight leading-[1.12]">
              Authentic Indian Pickles, Handcrafted by Heritage Makers.
            </h1>

            <p className="font-body-lg text-base sm:text-lg text-on-surface-variant max-w-2xl leading-relaxed">
              Connecting 320+ certified artisanal pickle manufacturers across 18 states directly with pickle lovers. Sun-cured in wood-pressed mustard oil, stone-ground spices, zero synthetic preservatives.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="#artisan-bestsellers"
                className="bg-primary text-on-primary font-title-md text-sm sm:text-base px-6 py-3.5 rounded-full shadow-md hover:bg-primary-container transition-all flex items-center gap-2 font-bold active:scale-95"
              >
                <span>Shop Regional Pickles</span>
                <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
              </a>

              <Link
                to="/manufacturer/register"
                className="bg-surface text-on-surface font-title-md text-sm sm:text-base px-6 py-3.5 rounded-full shadow-sm hover:bg-surface-variant border border-outline-variant/40 transition-all flex items-center gap-2 font-semibold active:scale-95"
              >
                <span className="material-symbols-outlined text-secondary text-[20px]">storefront</span>
                <span>Register as a Manufacturer (0% Commission)</span>
              </Link>
            </div>

            {/* Metric Stat Cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-3 max-w-xl">
              <div className="bg-surface-container-lowest p-3.5 sm:p-4 rounded-xl shadow-xs border border-outline-variant/30">
                <span className="font-headline-md text-xl sm:text-2xl font-serif text-primary font-bold block">
                  14,200+
                </span>
                <span className="font-label-md text-[11px] sm:text-xs text-on-surface-variant">
                  Jars Delivered Pan-India
                </span>
              </div>

              <div className="bg-surface-container-lowest p-3.5 sm:p-4 rounded-xl shadow-xs border border-outline-variant/30">
                <div className="flex items-center gap-1">
                  <span className="font-headline-md text-xl sm:text-2xl font-serif text-secondary font-bold">
                    4.8
                  </span>
                  <span className="material-symbols-outlined text-secondary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    star
                  </span>
                </div>
                <span className="font-label-md text-[11px] sm:text-xs text-on-surface-variant">
                  Average Batch Rating
                </span>
              </div>

              <div className="bg-surface-container-lowest p-3.5 sm:p-4 rounded-xl shadow-xs border border-outline-variant/30">
                <span className="font-headline-md text-xl sm:text-2xl font-serif text-tertiary font-bold block">
                  320+
                </span>
                <span className="font-label-md text-[11px] sm:text-xs text-on-surface-variant">
                  Verified Heritage Kitchens
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative bg-surface-container-highest rounded-3xl overflow-hidden shadow-xl p-3 sm:p-4 border border-outline-variant/30">
              <img
                src="/images/stitch/stitch_3_d0bc312725.jpg"
                alt="Traditional Indian raw mango pickle achar marinating inside glazed ceramic martaban earthen jar under warm golden sun"
                className="w-full h-[360px] sm:h-[440px] object-cover rounded-2xl shadow-md"
              />

              {/* Floating Badge 1: Top Left */}
              <div className="absolute top-6 left-6 bg-surface/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-outline-variant/30">
                <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
                <span className="font-label-md text-xs font-bold text-on-surface">Sun-Cured Batch #24 Active</span>
              </div>

              {/* Floating Badge 2: Bottom Right */}
              <div className="absolute bottom-6 right-6 bg-inverse-surface/92 text-inverse-on-surface backdrop-blur-md p-3.5 rounded-xl shadow-xl flex items-center gap-3 max-w-[260px] border border-white/10">
                <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-on-secondary-container text-[22px]">thermostat</span>
                </div>
                <div>
                  <p className="font-label-sm text-[10px] uppercase tracking-wider text-secondary-fixed-dim font-bold">Terroir Fermentation</p>
                  <p className="font-title-md text-xs sm:text-sm font-semibold leading-tight">21-Day Earthen Jar Maturation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          MOBILE DEAL OF THE DAY CAROUSEL (Mobile Exclusive)
          ======================================================== */}
      <section className="sm:hidden px-4 py-6 bg-surface-container flex flex-col gap-4">
        {/* Banner Voucher Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary-container p-4 text-on-primary shadow-sm">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded-full bg-white/20 font-label-sm text-[10px] font-bold tracking-wider uppercase">
              The Great Achar Season
            </span>
            <span className="font-label-sm text-[11px] font-semibold text-secondary-fixed">
              Voucher: ACHAR15
            </span>
          </div>
          <h3 className="font-headline-sm text-lg font-serif font-bold mt-2">
            Sun-Cured Rajasthan Mirch & Avakaya
          </h3>
          <p className="font-body-sm text-xs opacity-90 mt-0.5">
            Flat 15% OFF your first verified batch jar with free heritage clay packaging.
          </p>
        </div>

        {/* Flash Deal Countdown Bar */}
        <div className="flex items-center justify-between bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 shadow-xs">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[20px]">timer</span>
            <span className="font-title-md text-xs font-bold text-on-surface">Sun-Cured Flash Deal</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-xs font-bold text-primary">
            <span className="bg-primary-fixed px-1.5 py-0.5 rounded">{pad(timeLeft.hours)}h</span>
            <span>:</span>
            <span className="bg-primary-fixed px-1.5 py-0.5 rounded">{pad(timeLeft.minutes)}m</span>
            <span>:</span>
            <span className="bg-primary-fixed px-1.5 py-0.5 rounded">{pad(timeLeft.seconds)}s</span>
          </div>
        </div>

        {/* Horizontal Deal Slider */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-none">
          {/* Mobile Deal 1 */}
          <div className="w-[200px] shrink-0 bg-surface-container-lowest rounded-xl p-2.5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="relative w-full h-32 rounded-lg overflow-hidden bg-surface-container">
              <img
                src="/images/stitch/stitch_23_65b6bffc80.jpg"
                alt="Spicy Avakaya Mango"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-error text-on-error font-label-sm text-[9px] font-bold">
                25% OFF
              </span>
            </div>
            <div className="mt-2 flex flex-col gap-0.5">
              <span className="font-label-sm text-[10px] text-outline truncate">
                Laxmi Homemade • AP
              </span>
              <h4 className="font-title-md text-xs font-bold text-on-surface line-clamp-1">
                Spicy Avakaya Mango
              </h4>
              <span className="font-body-sm text-[11px] text-tertiary">350g Ceramic Jar</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-title-lg text-sm font-bold text-primary">₹289</span>
                <span className="font-body-sm text-[10px] text-outline line-through">₹385</span>
              </div>
            </div>
            <Link
              to="/products?search=avakaya"
              className="mt-2 w-full py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-xs font-bold flex items-center justify-center gap-1 active:scale-95 shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">add</span> Add
            </Link>
          </div>

          {/* Mobile Deal 2 */}
          <div className="w-[200px] shrink-0 bg-surface-container-lowest rounded-xl p-2.5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="relative w-full h-32 rounded-lg overflow-hidden bg-surface-container">
              <img
                src="/images/stitch/stitch_16_a066fa5198.jpg"
                alt="Banarasi Lal Mirch"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-error text-on-error font-label-sm text-[9px] font-bold">
                18% OFF
              </span>
            </div>
            <div className="mt-2 flex flex-col gap-0.5">
              <span className="font-label-sm text-[10px] text-outline truncate">
                Bikaner Spices • RJ
              </span>
              <h4 className="font-title-md text-xs font-bold text-on-surface line-clamp-1">
                Banarasi Lal Mirch
              </h4>
              <span className="font-body-sm text-[11px] text-tertiary">400g Hand-Cured</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-title-lg text-sm font-bold text-primary">₹349</span>
                <span className="font-body-sm text-[10px] text-outline line-through">₹425</span>
              </div>
            </div>
            <Link
              to="/products?search=mirch"
              className="mt-2 w-full py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-xs font-bold flex items-center justify-center gap-1 active:scale-95 shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">add</span> Add
            </Link>
          </div>

          {/* Mobile Deal 3 */}
          <div className="w-[200px] shrink-0 bg-surface-container-lowest rounded-xl p-2.5 shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div className="relative w-full h-32 rounded-lg overflow-hidden bg-surface-container">
              <img
                src="/images/stitch/stitch_2_680ed7686a.jpg"
                alt="Desi Garlic Pickle"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-error text-on-error font-label-sm text-[9px] font-bold">
                30% OFF
              </span>
            </div>
            <div className="mt-2 flex flex-col gap-0.5">
              <span className="font-label-sm text-[10px] text-outline truncate">
                Dadi Rasoi • HR
              </span>
              <h4 className="font-title-md text-xs font-bold text-on-surface line-clamp-1">
                Desi Garlic Pickle
              </h4>
              <span className="font-body-sm text-[11px] text-tertiary">300g Jar</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="font-title-lg text-sm font-bold text-primary">₹249</span>
                <span className="font-body-sm text-[10px] text-outline line-through">₹359</span>
              </div>
            </div>
            <Link
              to="/products?search=garlic"
              className="mt-2 w-full py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-xs font-bold flex items-center justify-center gap-1 active:scale-95 shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">add</span> Add
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 2: EXPLORE INDIAN PICKLE TRADITIONS (TERROIR BELTS)
          ======================================================== */}
      <section className="w-full px-4 sm:px-6 lg:px-12 py-12 sm:py-16">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <div>
              <span className="font-label-md text-xs sm:text-sm uppercase tracking-wider text-primary font-bold">
                Terroir & Regional Heritage
              </span>
              <h2 className="font-headline-lg text-2xl sm:text-4xl font-serif text-on-surface mt-1">
                Explore Indian Pickle Traditions
              </h2>
              <p className="font-body-md text-sm sm:text-base text-on-surface-variant mt-0.5">
                Every state cures with unique heirloom oils, micro-climates, and regional chilis.
              </p>
            </div>

            <Link
              to="/products"
              className="mt-3 md:mt-0 flex items-center gap-1 text-primary font-label-lg text-sm font-bold hover:underline"
            >
              <span>View All 18 States Directory</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>

          {/* 6 Regional Terroir Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Region 1: Andhra Pradesh */}
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
                <h3 className="font-title-md text-sm sm:text-base font-bold text-on-surface group-hover:text-primary transition-colors leading-tight mt-0.5">
                  Avakaya & Gongura
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant mt-1 line-clamp-2">
                  Fiery Guntur chillies, wood-pressed til oil.
                </p>
              </div>
              <span className="font-label-sm text-[11px] text-outline mt-3 block">
                54 Kitchens
              </span>
            </Link>

            {/* Region 2: Rajasthan & Gujarat */}
            <Link
              to="/products?search=rajasthan"
              className="group bg-surface-container-low rounded-2xl p-3.5 shadow-xs hover:shadow-md border border-outline-variant/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="h-32 rounded-xl overflow-hidden bg-surface-container-highest mb-3">
                  <img
                    src="/images/stitch/stitch_28_e70c8eaecf.jpg"
                    alt="Marwari Ker Sangri and dried desert berries"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <span className="font-label-sm text-[10px] text-secondary uppercase font-bold">
                  Rajasthan & Gujarat
                </span>
                <h3 className="font-title-md text-sm sm:text-base font-bold text-on-surface group-hover:text-secondary transition-colors leading-tight mt-0.5">
                  Ker Sangri & Methia
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant mt-1 line-clamp-2">
                  Wild Thar desert flora, dry roasted fenugreek.
                </p>
              </div>
              <span className="font-label-sm text-[11px] text-outline mt-3 block">
                42 Kitchens
              </span>
            </Link>

            {/* Region 3: Punjab & Awadh */}
            <Link
              to="/products?search=punjab"
              className="group bg-surface-container-low rounded-2xl p-3.5 shadow-xs hover:shadow-md border border-outline-variant/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="h-32 rounded-xl overflow-hidden bg-surface-container-highest mb-3">
                  <img
                    src="/images/stitch/stitch_8_bc173752a7.jpg"
                    alt="Punjabi winter seasonal Gobhi Gajar Shalgam pickle"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <span className="font-label-sm text-[10px] text-tertiary uppercase font-bold">
                  Punjab & Awadh
                </span>
                <h3 className="font-title-md text-sm sm:text-base font-bold text-on-surface group-hover:text-tertiary transition-colors leading-tight mt-0.5">
                  Gobhi-Gajar & Nimbu
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant mt-1 line-clamp-2">
                  Sweet and sour jaggery glaze with whole cloves.
                </p>
              </div>
              <span className="font-label-sm text-[11px] text-outline mt-3 block">
                68 Kitchens
              </span>
            </Link>

            {/* Region 4: Kerala & Coastal */}
            <Link
              to="/products?search=kerala"
              className="group bg-surface-container-low rounded-2xl p-3.5 shadow-xs hover:shadow-md border border-outline-variant/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="h-32 rounded-xl overflow-hidden bg-surface-container-highest mb-3">
                  <img
                    src="/images/stitch/stitch_5_9a78255073.jpg"
                    alt="Whole baby mangoes known as Vadu Manga"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <span className="font-label-sm text-[10px] text-primary uppercase font-bold">
                  Kerala & Coastal
                </span>
                <h3 className="font-title-md text-sm sm:text-base font-bold text-on-surface group-hover:text-primary transition-colors leading-tight mt-0.5">
                  Vadu Manga & Prawns
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant mt-1 line-clamp-2">
                  Tender baby mangoes & coastal cured seafood.
                </p>
              </div>
              <span className="font-label-sm text-[11px] text-outline mt-3 block">
                38 Kitchens
              </span>
            </Link>

            {/* Region 5: Northeast India */}
            <Link
              to="/products?search=bamboo"
              className="group bg-surface-container-low rounded-2xl p-3.5 shadow-xs hover:shadow-md border border-outline-variant/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="h-32 rounded-xl overflow-hidden bg-surface-container-highest mb-3">
                  <img
                    src="/images/stitch/stitch_31_04e626101e.jpg"
                    alt="Fermented Assam bamboo shoot pickle infused with Bhut Jolokia"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <span className="font-label-sm text-[10px] text-error uppercase font-bold">
                  Northeast India
                </span>
                <h3 className="font-title-md text-sm sm:text-base font-bold text-on-surface group-hover:text-error transition-colors leading-tight mt-0.5">
                  Bhut Jolokia & Bamboo
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant mt-1 line-clamp-2">
                  Fermented tender shoots with smoke chillies.
                </p>
              </div>
              <span className="font-label-sm text-[11px] text-outline mt-3 block">
                29 Kitchens
              </span>
            </Link>

            {/* Region 6: Maharashtra & MP */}
            <Link
              to="/products?search=thecha"
              className="group bg-surface-container-low rounded-2xl p-3.5 shadow-xs hover:shadow-md border border-outline-variant/30 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="h-32 rounded-xl overflow-hidden bg-surface-container-highest mb-3">
                  <img
                    src="/images/stitch/stitch_10_baeadf8fdb.jpg"
                    alt="Rustic Kolhapuri crushed green chili garlic Thecha paste"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <span className="font-label-sm text-[10px] text-secondary uppercase font-bold">
                  Maharashtra & MP
                </span>
                <h3 className="font-title-md text-sm sm:text-base font-bold text-on-surface group-hover:text-secondary transition-colors leading-tight mt-0.5">
                  Kolhapuri Thecha & Mirch
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

      {/* ========================================================
          SECTION 3: CURATED ARTISAN BESTSELLERS (MODERN GRID)
          ======================================================== */}
      <section className="w-full bg-surface-container-low px-4 sm:px-6 lg:px-12 py-12 sm:py-16" id="artisan-bestsellers">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-secondary-fixed text-on-secondary-fixed px-3 py-1 rounded-full font-label-sm text-xs font-bold uppercase mb-2">
                <span className="material-symbols-outlined text-[15px]">local_fire_department</span>
                <span>Fresh Batches Daily</span>
              </div>
              <h2 className="font-headline-lg text-2xl sm:text-4xl font-serif text-on-surface">
                Curated Artisan Pickle Bestsellers
              </h2>
              <p className="font-body-md text-sm sm:text-base text-on-surface-variant mt-0.5">
                Lab-tested, sun-fermented batches shipped directly from heritage cottage makers.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className={`px-4 py-2 rounded-full font-label-md text-xs sm:text-sm font-bold transition-all ${
                  activeFilter === 'ALL'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface hover:bg-surface-variant border border-outline-variant/30'
                }`}
              >
                All Batches
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('SPICY')}
                className={`px-4 py-2 rounded-full font-label-md text-xs sm:text-sm font-bold transition-all ${
                  activeFilter === 'SPICY'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface hover:bg-surface-variant border border-outline-variant/30'
                }`}
              >
                Fiery Spice (🌶️🌶️🌶️)
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('OIL_FREE')}
                className={`px-4 py-2 rounded-full font-label-md text-xs sm:text-sm font-bold transition-all ${
                  activeFilter === 'OIL_FREE'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface hover:bg-surface-variant border border-outline-variant/30'
                }`}
              >
                Oil-Free / Sundried
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('ZERO_SUGAR')}
                className={`px-4 py-2 rounded-full font-label-md text-xs sm:text-sm font-bold transition-all ${
                  activeFilter === 'ZERO_SUGAR'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'bg-surface-container-lowest text-on-surface hover:bg-surface-variant border border-outline-variant/30'
                }`}
              >
                Zero Sugar
              </button>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {itemsToRender.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 4: SELL ON WANGS CALLOUT BANNER
          ======================================================== */}
      <section className="w-full px-4 sm:px-6 lg:px-12 py-10 sm:py-14" id="artisan-seller-callout">
        <div className="max-w-[1440px] mx-auto rounded-3xl bg-surface-container p-6 sm:p-10 border border-outline-variant/40 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl flex flex-col gap-3 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                <span className="material-symbols-outlined text-[26px]">soup_kitchen</span>
              </div>
              <div>
                <span className="font-label-sm text-xs text-primary font-bold uppercase tracking-wider block">
                  Artisan Maker Guild
                </span>
                <h3 className="font-headline-sm text-xl sm:text-2xl font-serif text-on-surface font-bold leading-tight">
                  Turn Your Family Recipe Into a Business
                </h3>
              </div>
            </div>

            <p className="font-body-md text-sm sm:text-base text-on-surface-variant leading-relaxed">
              Join 320+ verified home cooks and regional manufacturers delivering authentic Indian flavors directly to food lovers nationwide with 0% platform fee for the first 30 days.
            </p>

            <div className="flex items-center justify-center md:justify-start gap-6 pt-2">
              <div className="flex flex-col">
                <span className="font-title-lg text-lg sm:text-xl font-bold text-primary">320+</span>
                <span className="font-label-sm text-xs text-outline">Active Makers</span>
              </div>
              <div className="h-8 w-px bg-outline-variant/40" />
              <div className="flex flex-col">
                <span className="font-title-lg text-lg sm:text-xl font-bold text-primary">₹0 Fee</span>
                <span className="font-label-sm text-xs text-outline">To List Batches</span>
              </div>
              <div className="h-8 w-px bg-outline-variant/40" />
              <div className="flex flex-col">
                <span className="font-title-lg text-lg sm:text-xl font-bold text-primary">Pan-India</span>
                <span className="font-label-sm text-xs text-outline">Jar Logistics</span>
              </div>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <Link
              to="/manufacturer/register"
              className="w-full md:w-auto px-8 py-4 rounded-full bg-primary text-on-primary font-label-lg text-sm sm:text-base font-bold shadow-md hover:bg-primary-container active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[20px]">storefront</span>
              <span>Register as Artisan Seller</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 5: CUSTOMER REVIEWS & SPICE COMMUNITY
          ======================================================== */}
      <section className="w-full bg-surface-container-low px-4 sm:px-6 lg:px-12 py-12 sm:py-16">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
            <div>
              <span className="font-label-md text-xs sm:text-sm uppercase tracking-wider text-primary font-bold">
                Verified Gourmands
              </span>
              <h2 className="font-headline-lg text-2xl sm:text-4xl font-serif text-on-surface mt-1">
                Tales from the Spice Community
              </h2>
              <p className="font-body-md text-sm sm:text-base text-on-surface-variant mt-0.5">
                Over 14,000+ meals elevated by authentic village flavors.
              </p>
            </div>

            <div className="flex items-center gap-1.5 mt-3 md:mt-0">
              <div className="flex text-secondary">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              </div>
              <span className="font-title-md text-sm sm:text-base font-bold text-on-surface">4.8 / 5.0</span>
              <span className="font-body-sm text-xs text-outline">(3,480+ batch ratings)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Review 1 */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex text-secondary">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className="material-symbols-outlined text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    ))}
                  </div>
                  <span className="bg-tertiary-fixed text-on-tertiary-fixed text-label-sm font-label-sm px-2 py-0.5 rounded text-[11px] font-bold">
                    Verified Purchase
                  </span>
                </div>

                <p className="font-body-md text-sm text-on-surface leading-relaxed">
                  "The Guntur Avakaya brought tears to my eyes—literally and emotionally. It is the EXACT flavor my grandmother made in Vijayawada 30 years ago. No supermarket brand comes within a mile of this wood-pressed aroma."
                </p>

                <div className="h-32 rounded-xl overflow-hidden bg-surface-container-high my-1">
                  <img
                    src="/images/stitch/stitch_30_fb45f00afe.jpg"
                    alt="Curd rice with pickle"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-outline-variant/30 mt-3">
                <div className="w-10 h-10 rounded-full bg-secondary-fixed flex items-center justify-center font-title-md text-sm text-on-secondary-fixed font-bold">
                  AK
                </div>
                <div>
                  <h4 className="font-title-md text-sm font-bold text-on-surface">Ananya K.</h4>
                  <p className="font-body-sm text-xs text-on-surface-variant">Bengaluru • Mango Avakaya (500g)</p>
                </div>
              </div>
            </div>

            {/* Review 2 */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex text-secondary">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className="material-symbols-outlined text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    ))}
                  </div>
                  <span className="bg-tertiary-fixed text-on-tertiary-fixed text-label-sm font-label-sm px-2 py-0.5 rounded text-[11px] font-bold">
                    Verified Purchase
                  </span>
                </div>

                <p className="font-body-md text-sm text-on-surface leading-relaxed">
                  "The packaging is impeccable. Arrived in a leak-proof double-vacuum cocoon with zero oil spillage. The stuffed Banarasi red chili had the perfect punch of roasted amchur and whole mustard oil."
                </p>

                <div className="h-32 rounded-xl overflow-hidden bg-surface-container-high my-1">
                  <img
                    src="/images/stitch/stitch_22_2b98edc9ec.jpg"
                    alt="Martaban on dining table"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-outline-variant/30 mt-3">
                <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center font-title-md text-sm text-on-primary-fixed font-bold">
                  VS
                </div>
                <div>
                  <h4 className="font-title-md text-sm font-bold text-on-surface">Vikramaditya S.</h4>
                  <p className="font-body-sm text-xs text-on-surface-variant">Gurugram • Banarasi Mirch (500g)</p>
                </div>
              </div>
            </div>

            {/* Review 3 */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex text-secondary">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <span key={i} className="material-symbols-outlined text-[17px]" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    ))}
                  </div>
                  <span className="bg-tertiary-fixed text-on-tertiary-fixed text-label-sm font-label-sm px-2 py-0.5 rounded text-[11px] font-bold">
                    Verified Purchase
                  </span>
                </div>

                <p className="font-body-md text-sm text-on-surface leading-relaxed">
                  "Being away from Assam, getting authentic Bhut Jolokia pickle without chemical preservatives felt impossible until Wangs. Smoky, brutal heat, and rich bamboo shoots. Re-ordering batch #12!"
                </p>

                <div className="h-32 rounded-xl overflow-hidden bg-surface-container-high my-1">
                  <img
                    src="/images/stitch/stitch_7_dced7e9a07.jpg"
                    alt="Ghost pepper pickle on bell metal plate"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-outline-variant/30 mt-3">
                <div className="w-10 h-10 rounded-full bg-tertiary-fixed flex items-center justify-center font-title-md text-sm text-on-tertiary-fixed font-bold">
                  DB
                </div>
                <div>
                  <h4 className="font-title-md text-sm font-bold text-on-surface">Debashree B.</h4>
                  <p className="font-body-sm text-xs text-on-surface-variant">Mumbai • Bhut Jolokia Pickle (250g)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          SECTION 6: TRUST BADGES STRIP
          ======================================================== */}
      <section className="w-full px-4 sm:px-6 lg:px-12 py-10 sm:py-12 border-t border-outline-variant/30">
        <div className="max-w-[1440px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed shrink-0">
              <span className="material-symbols-outlined text-[22px] sm:text-[26px]">oil_barrel</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-xs sm:text-sm font-bold text-on-surface leading-tight">
                Pure Cold-Pressed
              </span>
              <span className="font-label-sm text-[11px] sm:text-xs text-outline">
                Authentic Mustard Oil
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed shrink-0">
              <span className="material-symbols-outlined text-[22px] sm:text-[26px]">science</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-xs sm:text-sm font-bold text-on-surface leading-tight">
                Lab-Tested
              </span>
              <span className="font-label-sm text-[11px] sm:text-xs text-outline">
                FSSAI Certified Purity
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary-fixed flex items-center justify-center text-on-primary-fixed shrink-0">
              <span className="material-symbols-outlined text-[22px] sm:text-[26px]">handshake</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-xs sm:text-sm font-bold text-on-surface leading-tight">
                Direct from Artisan
              </span>
              <span className="font-label-sm text-[11px] sm:text-xs text-outline">
                No Factory Fillers
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-surface-variant flex items-center justify-center text-on-surface-variant shrink-0">
              <span className="material-symbols-outlined text-[22px] sm:text-[26px]">security</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-md text-xs sm:text-sm font-bold text-on-surface leading-tight">
                Zero-Leak Guard
              </span>
              <span className="font-label-sm text-[11px] sm:text-xs text-outline">
                Cushioned Jar Transit
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
