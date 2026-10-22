import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ShieldCheck, Flame, Sparkles, Award,
  Truck, CheckCircle, ChevronRight, Store, Star,
  UtensilsCrossed, Compass, HeartHandshake, Eye
} from 'lucide-react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Interactive Heat Spectrum Explorer state
  const [selectedHeat, setSelectedHeat] = useState('ALL');

  useEffect(() => {
    async function loadData() {
      try {
        const [featData, bestData, catData] = await Promise.all([
          api.getFeaturedProducts(),
          api.getBestsellerProducts(),
          api.getCategories(),
        ]);
        setFeatured(featData?.results || featData || []);
        setBestsellers(bestData?.results || bestData || []);
        setCategories(catData?.results || catData || []);
      } catch (err) {
        console.error('Failed to load homepage data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const heatFilteredBestsellers = selectedHeat === 'ALL'
    ? bestsellers
    : bestsellers.filter((p) => p.spice_level === selectedHeat);

  return (
    <div className="space-y-16 sm:space-y-28">
      {/* 1. Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-forest-950 via-forest-900 to-forest-950 text-cream-50 pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-forest-800/80">
        {/* Subtle Decorative Ambient Glows */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-forest-700/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-chilli-900/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Editorial Headline & Value Pillars */}
            <div className="lg:col-span-7 space-y-7">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-forest-800/80 border border-forest-700/80 rounded-full text-xs text-cream-200 shadow-sm backdrop-blur-sm">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <span className="font-semibold tracking-wide uppercase text-[10px] text-amber-300">
                  Rare Regional Culinary Preserves
                </span>
                <span className="text-forest-400">·</span>
                <span className="text-[11px] text-cream-300 font-medium">Nagaland, Northeast India</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12]">
                Firewood-Smoked Meats & Wild Hill Chillies.
              </h1>

              <p className="text-base sm:text-lg text-cream-200/90 leading-relaxed max-w-2xl font-normal">
                Born in traditional kitchens in Kohima and crafted by verified regional food artisans.
                Experience slow-cured Naga smoked pork, fiery Raja Mircha (King Chilli), and fragrant wild bamboo shoot pickles delivered fresh across India.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/products"
                  className="px-7 py-4 bg-chilli-700 hover:bg-chilli-800 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2.5 group hover:scale-102"
                >
                  <span>Explore Authentic Batches</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/about"
                  className="px-6 py-4 bg-forest-900/90 hover:bg-forest-800 text-cream-100 font-bold text-sm rounded-xl border border-forest-700/80 transition-all shadow-sm"
                >
                  Our Heritage & Tradition
                </Link>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-forest-800/80 text-xs">
                <div>
                  <p className="font-serif font-black text-white text-lg sm:text-xl">35+ Years</p>
                  <p className="text-[11px] text-cream-300/80 mt-0.5 font-medium">Family Heritage Cure</p>
                </div>
                <div>
                  <p className="font-serif font-black text-white text-lg sm:text-xl">72 Hours</p>
                  <p className="text-[11px] text-cream-300/80 mt-0.5 font-medium">Oak Firewood Smoke</p>
                </div>
                <div>
                  <p className="font-serif font-black text-amber-400 text-lg sm:text-xl">GI-Tagged</p>
                  <p className="text-[11px] text-cream-300/80 mt-0.5 font-medium">Naga Raja Mircha</p>
                </div>
                <div>
                  <p className="font-serif font-black text-white text-lg sm:text-xl">100%</p>
                  <p className="text-[11px] text-cream-300/80 mt-0.5 font-medium">FSSAI Certified Sellers</p>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md rounded-3xl overflow-hidden shadow-2xl border-2 border-forest-700/60 bg-forest-900 group">
                <img
                  src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80"
                  alt="Arenla's Signature Smoked Pork"
                  className="w-full h-[420px] object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />

                {/* Subtle vignette gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/40 to-transparent flex flex-col justify-end p-7">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/90 text-forest-950 text-[10px] font-black uppercase tracking-wider rounded-md mb-2 w-max">
                    <Sparkles size={11} /> Signature Batch
                  </div>
                  <h3 className="font-serif font-bold text-2xl text-white leading-tight">
                    Arenla's Smoked Pork & King Chilli
                  </h3>
                  <p className="text-xs text-cream-200 mt-1.5 leading-relaxed font-normal">
                    Indigenous Nagaland pork slow-smoked over aged oak embers for 72 hours, steeped in pure cold-pressed mustard oil.
                  </p>
                  <div className="mt-4 pt-3 border-t border-forest-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-cream-400 block font-medium">Net 250g Glass Jar</span>
                      <span className="text-xl font-serif font-bold text-white">₹380</span>
                    </div>
                    <Link
                      to="/product/arenla-signature-smoked-pork-king-chilli-pickle"
                      className="px-4 py-2.5 bg-cream-50 hover:bg-white text-forest-950 font-bold text-xs rounded-xl shadow-md transition-all hover:scale-105"
                    >
                      Taste This Batch
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Interactive Heat Spectrum Explorer */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-stone-200 shadow-artisan">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold tracking-wider uppercase text-chilli-700">Interactive Taste Navigator</span>
              <h2 className="font-serif text-3xl font-bold text-stone-900 mt-1">
                Explore by Heat & Spice Intensity
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                From mellow wild fruit chutneys to million-Scoville King Chilli preserves.
              </p>
            </div>

            {/* Heat Buttons Filter */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              {[
                { id: 'ALL', label: 'All Heat Levels' },
                { id: 'MILD', label: 'Mild (Jaggery & Apple)' },
                { id: 'MEDIUM', label: 'Medium (Bastenga)' },
                { id: 'HOT', label: 'Hot (Smoked Meat)' },
                { id: 'FIERY_KING_CHILLI', label: 'Fiery Raja Mircha 🌶️' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedHeat(tab.id)}
                  className={`px-3.5 py-2 rounded-xl transition-all ${
                    selectedHeat === tab.id
                      ? 'bg-forest-900 text-white shadow-sm'
                      : 'bg-cream-100 hover:bg-cream-200 text-stone-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {heatFilteredBestsellers.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 3. Categories Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-forest-700">Artisanal Specialties</span>
            <h2 className="font-serif text-3xl font-bold text-stone-900 mt-1">
              Curated Regional Naga Categories
            </h2>
          </div>
          <Link to="/products" className="text-xs font-bold text-forest-800 hover:text-forest-950 flex items-center gap-1 group">
            <span>Browse Full Pantry</span>
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-5">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.slug}`}
              className="group relative bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-artisan hover:shadow-artisan-hover transition-all duration-300 flex flex-col hover:border-forest-700/40"
            >
              <div className="aspect-[4/3] overflow-hidden bg-cream-100">
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                />
              </div>
              <div className="p-3.5 text-center">
                <h3 className="font-serif font-bold text-stone-900 text-sm group-hover:text-forest-800 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                  {cat.product_count} {cat.product_count === 1 ? 'variety' : 'varieties'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 4. The 4 Pillars of Authentic Naga Pickling */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold tracking-wider uppercase text-forest-700">Culinary Integrity</span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
            Why Authentic Naga Pickles are Different
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 mt-2">
            No mass factory acidification. No synthetic coloring. Just traditional highland food preservation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-artisan space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              🪵
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">72-Hour Firewood Smoke</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Meats are seasoned and hung above traditional wood hearths in Kohima, absorbing deep campfire aromatics before bottling.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-artisan space-y-3">
            <div className="w-12 h-12 rounded-xl bg-red-50 text-chilli-700 flex items-center justify-center font-bold">
              🌶️
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">GI-Tagged Raja Mircha</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Genuine King Chilli (Bhut Jolokia) cultivated in Nagaland volcanic hill soils, providing clean heat and floral citrus finish.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-artisan space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
              🌿
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">Natural Axone & Bastenga</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Fermented soybean cakes (Axone) and sour wild bamboo shoot (Bastenga) impart a deep, complex umami profile found nowhere else.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-artisan space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
              🫒
            </div>
            <h3 className="font-serif font-bold text-base text-stone-900">Pure Mustard Oil Barrier</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Submerged completely under cold-pressed virgin mustard oil with mountain salt, naturally preserving meat tenderness for 9+ months.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Origin Story Showcase — Arenla's Heritage Kitchen */}
      <section className="bg-gradient-to-b from-cream-100 to-cream-200/60 border-y border-stone-200 py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-forest-800 text-cream-100 rounded-full text-xs font-bold uppercase tracking-wider">
                Founding Artisan Kitchen
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
                "It started with traditional curing of smoked pork over oak firewood in Kohima."
              </h2>
              <p className="text-sm text-stone-700 leading-relaxed">
                For over three decades, relatives and travelers would visit Kohima just to take back jars of Arenla’s
                famous smoked pork and fiery King Chilli pickles. Every jar was crafted by hand: local meats slow-smoked
                above the home hearth, seasoned with fermented soybeans (Axone), and infused in virgin cold-pressed mustard oil.
              </p>
              <p className="text-sm text-stone-700 leading-relaxed">
                We founded <strong>Wangs (wangs.in)</strong> to preserve and celebrate this endangered culinary craft.
                Today, Wangs brings these time-honored recipes to every corner of India, while providing a compliant,
                transparent marketplace for verified Nagaland pickle artisans to share their generational craft.
              </p>
              <div className="pt-2 flex items-center gap-6">
                <Link
                  to="/products?category=pork-pickle"
                  className="px-6 py-3 bg-forest-900 hover:bg-forest-950 text-white font-bold text-xs rounded-xl transition-all shadow-md"
                >
                  Taste Heritage Pickles
                </Link>
                <div className="text-xs text-stone-600 font-medium">
                  <span className="font-bold text-stone-900 block font-serif">Kohima, Nagaland</span>
                  <span>FSSAI Lic. #10023064000124</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <img
                  src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80"
                  alt="Oak Firewood Smoking"
                  className="rounded-2xl object-cover h-56 w-full shadow-md"
                />
                <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                  <h4 className="font-serif font-bold text-stone-900 text-sm">Oak Wood Smoking</h4>
                  <p className="text-xs text-stone-500 mt-1">
                    Authentic Naga firewood cure giving an unmistakably deep, rustic campfire aroma.
                  </p>
                </div>
              </div>
              <div className="space-y-4 pt-6">
                <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
                  <h4 className="font-serif font-bold text-stone-900 text-sm">Pure King Chilli</h4>
                  <p className="text-xs text-stone-500 mt-1">
                    Authentic GI-certified Raja Mircha with vibrant citrus notes and clean fiery heat.
                  </p>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=500&q=80"
                  alt="Naga King Chilli"
                  className="rounded-2xl object-cover h-56 w-full shadow-md"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Featured Batches Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-forest-700">Artisan Harvest</span>
            <h2 className="font-serif text-3xl font-bold text-stone-900 mt-1">
              Handpicked Featured Batches
            </h2>
          </div>
          <Link to="/products" className="text-xs font-bold text-forest-800 hover:text-forest-950 flex items-center gap-1">
            <span>Explore full pantry</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* 7. Multi-Vendor Manufacturer Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 text-cream-50 rounded-3xl p-8 sm:p-14 border border-forest-800 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-forest-800 border border-forest-700 rounded-full text-xs text-amber-300 font-bold">
                <Store size={14} />
                <span>Northeast India Producer Collective</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-snug">
                Are you an authentic food producer in Nagaland?
              </h2>
              <p className="text-sm sm:text-base text-cream-200 leading-relaxed max-w-2xl font-normal">
                Wangs empowers verified regional producers from Kohima, Dimapur, Mokokchung, and across Nagaland.
                Benefit from pan-India logistics, transparent 10% platform commission, direct automated payouts,
                and dedicated regulatory compliance support.
              </p>
              <div className="pt-3 flex flex-wrap gap-4">
                <Link
                  to="/manufacturer/register"
                  className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-forest-950 font-bold text-xs rounded-xl shadow-md transition-all hover:scale-102"
                >
                  Apply as a Manufacturer
                </Link>
                <Link
                  to="/about"
                  className="px-6 py-3.5 bg-forest-800 hover:bg-forest-700 text-cream-100 font-bold text-xs rounded-xl border border-forest-700 transition-colors"
                >
                  Seller Guidelines & FSSAI Standards
                </Link>
              </div>
            </div>

            <div className="lg:col-span-4 bg-forest-950/90 p-6 rounded-2xl border border-forest-800/80 space-y-3.5 text-xs text-cream-200 backdrop-blur-sm">
              <h4 className="font-serif font-bold text-sm text-white border-b border-forest-800 pb-2">
                Why Sell on Wangs?
              </h4>
              <div className="flex items-start gap-2.5">
                <CheckCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Fixed 10% platform commission with zero hidden listing fees</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Real-time seller dashboard with order packing & net payout records</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle size={16} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Pan-India air-courier dispatch integration</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Customer Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold tracking-wider uppercase text-forest-700">Customer Appreciation</span>
          <h2 className="font-serif text-3xl font-bold text-stone-900 mt-1">
            Bringing the Aroma of the Hills to Homes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-7 rounded-2xl border border-stone-200 shadow-artisan flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="flex text-amber-500 gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-stone-700 italic leading-relaxed">
                "Having lived in Delhi for 8 years, finding real Naga smoked pork pickle that tastes like home felt impossible. Arenla Heritage signature pork pickle is identical to the ones my family used to make in Mokokchung. The oak smoke is phenomenal!"
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-forest-800 text-cream-100 flex items-center justify-center font-bold text-xs">
                KJ
              </div>
              <div>
                <p className="font-bold text-xs text-stone-900">Dr. K. Jamir</p>
                <p className="text-[11px] text-stone-500">Verified Buyer · New Delhi</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-stone-200 shadow-artisan flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="flex text-amber-500 gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-stone-700 italic leading-relaxed">
                "The Raja Mircha pickle is intense! It’s not just mindless heat; the mustard oil and mountain peppercorns give it an amazing floral citrus depth. A tiny spoonful elevates simple dal and rice into a feast."
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-forest-800 text-cream-100 flex items-center justify-center font-bold text-xs">
                AS
              </div>
              <div>
                <p className="font-bold text-xs text-stone-900">Ananya Sen</p>
                <p className="text-[11px] text-stone-500">Food Critic · Bengaluru</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-7 rounded-2xl border border-stone-200 shadow-artisan flex flex-col justify-between">
            <div className="space-y-3.5">
              <div className="flex text-amber-500 gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-stone-700 italic leading-relaxed">
                "Ordered the Bastenga (fermented bamboo shoot) and wild apple pickle. Packed securely in sturdy glass jars with thick tamper seals, arrived in Mumbai within 4 days. Crisp, tangy, authentic Northeast India."
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-forest-800 text-cream-100 flex items-center justify-center font-bold text-xs">
                VM
              </div>
              <div>
                <p className="font-bold text-xs text-stone-900">Vikramaditya Mehta</p>
                <p className="text-[11px] text-stone-500">Verified Buyer · Mumbai</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
