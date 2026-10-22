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

              <p className="text-sm sm:text-base text-cream-200/80 max-w-xl font-normal leading-relaxed">
                Handcrafted in Kohima. Slow-cured smoked pork, GI-tagged King Chilli, and wild bamboo shoot pickles.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/products"
                  className="px-6 py-3.5 bg-chilli-700 hover:bg-chilli-800 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 group"
                >
                  <span>Shop Collection</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/about"
                  className="px-5 py-3.5 bg-forest-900/90 hover:bg-forest-800 text-cream-100 font-bold text-xs rounded-xl border border-forest-700/80 transition-all"
                >
                  Our Heritage
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

      {/* 4. The 4 Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-10">
          <span className="text-xs font-bold tracking-wider uppercase text-forest-700">The Tradition</span>
          <h2 className="font-serif text-3xl font-bold text-stone-900 mt-1">
            Artisanal Curing & Fermentation
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-2">
            <span className="text-2xl">🪵</span>
            <h3 className="font-serif font-bold text-sm text-stone-900">72h Oak Smoke</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Cured over aged hill oak hearths in Kohima.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-2">
            <span className="text-2xl">🌶️</span>
            <h3 className="font-serif font-bold text-sm text-stone-900">GI-Tagged Chilli</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Sun-wilted Naga Raja Mircha with citrus floral finish.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-2">
            <span className="text-2xl">🌿</span>
            <h3 className="font-serif font-bold text-sm text-stone-900">Axone & Bastenga</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Fermented soya and tender wild bamboo shoot umami.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-2">
            <span className="text-2xl">🫒</span>
            <h3 className="font-serif font-bold text-sm text-stone-900">Virgin Mustard Oil</h3>
            <p className="text-xs text-stone-500 leading-relaxed">
              Natural cold-pressed seal locking in tenderness.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Origin Story */}
      <section className="bg-cream-100 border-y border-stone-200/80 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-forest-800">
                Founding Kitchen
              </span>
              <h2 className="font-serif text-3xl font-bold text-stone-900 leading-tight">
                Crafted in Kohima for over 35 years.
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                Hand-cut pork cured over firewood hearths, seasoned with fermented soybeans (Axone), and infused with King Chilli. Wangs brings these rare regional recipes directly to your table.
              </p>
              <div className="pt-2 flex items-center gap-5">
                <Link
                  to="/products?category=pork-pickle"
                  className="px-5 py-2.5 bg-forest-900 hover:bg-forest-950 text-white font-bold text-xs rounded-xl shadow transition-colors"
                >
                  Taste Pork Pickles
                </Link>
                <div className="text-xs text-stone-500">
                  <span className="font-bold text-stone-800 block">Kohima, Nagaland</span>
                  <span>FSSAI Lic. #10023064000124</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-2 gap-4">
              <img
                src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80"
                alt="Firewood Cure"
                className="rounded-2xl object-cover h-48 w-full shadow-sm"
              />
              <img
                src="https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=500&q=80"
                alt="Naga King Chilli"
                className="rounded-2xl object-cover h-48 w-full shadow-sm"
              />
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

      {/* 6. Producer Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-forest-950 text-cream-50 rounded-3xl p-8 sm:p-12 border border-forest-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">Producer Collective</span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              Sell your authentic regional pickles on Wangs.
            </h2>
            <p className="text-xs sm:text-sm text-cream-300">
              Transparent 10% platform commission, pan-India logistics, and direct escrow payouts.
            </p>
          </div>
          <Link
            to="/manufacturer/register"
            className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-forest-950 font-bold text-xs rounded-xl shadow transition-colors whitespace-nowrap"
          >
            Apply as Producer
          </Link>
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
