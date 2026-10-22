import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ShieldCheck, Flame, Sparkles, Award,
  Truck, CheckCircle, ChevronRight, Store, Star,
  Compass, Leaf, Clock, MapPin
} from 'lucide-react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Interactive heat explorer state
  const [selectedHeatGuide, setSelectedHeatGuide] = useState('pork');

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

  const heatProfiles = {
    pork: {
      name: 'Smoked Pork with King Chilli',
      heat: 'Hot (150k SHU)',
      terroir: 'Kohima District · Oak Firewood',
      curing: '72-Hour Hearth Smoking',
      notes: 'Deep campfire woodiness, intensely savory umami, lingering rounded chilli warmth.',
      pairWith: 'Steaming warm white sticky rice, Naga dal, and boiled mustard greens.'
    },
    chilli: {
      name: 'Pure Raja Mircha (King Chilli)',
      heat: 'Fiery (1,041,427 SHU)',
      terroir: 'Dimapur & Peren Hills · GI-Certified',
      curing: 'Sun-Wilted & Virgin Mustard Steep',
      notes: 'Immediate citrus floral fragrance followed by explosive, clean mountain heat.',
      pairWith: 'Tiny pea-sized spoonfuls alongside hearty stews or roasted potatoes.'
    },
    bamboo: {
      name: 'Fermented Bamboo Shoot (Bastenga)',
      heat: 'Medium (35k SHU)',
      terroir: 'Mokokchung Forest Slopes',
      curing: 'Earthen Jar Natural Fermentation',
      notes: 'Crisp, zesty, appetisingly sour tang balanced with roasted hill chillies.',
      pairWith: 'Fresh noodle bowls, fried fish, or alongside spicy pork curries.'
    },
    fruit: {
      name: 'Wild Naga Apple & Starfruit',
      heat: 'Mild (5k SHU)',
      terroir: 'Highland Kohima Orchards',
      curing: 'Organic Jaggery & Cumin Simmer',
      notes: 'Crisp firm bite with mouth-watering sweet and tangy undertones.',
      pairWith: 'Parathas, aged cheeses, or as an afternoon tea condiment.'
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Editorial Hero Section */}
      <section className="relative overflow-hidden bg-forest-950 text-cream-50 pt-12 pb-20 sm:py-24 border-b border-forest-900">
        {/* Subtle background ambient texture */}
        <div className="absolute inset-0 opacity-15 pointer-events-none mix-blend-overlay">
          <img
            src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1600&q=80"
            alt="Naga Smokehouse"
            className="w-full h-full object-cover object-center"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Narrative Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-forest-900/90 border border-forest-700/80 rounded-full text-xs text-cream-200">
                <span className="w-2 h-2 rounded-full bg-chilli-500 animate-pulse" />
                <span className="tracking-wide">Direct from Artisan Kitchens in Nagaland</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.12]">
                Firewood-Smoked Meats & Wild Hill Chillies.
              </h1>

              <p className="text-base sm:text-lg text-cream-200/90 leading-relaxed max-w-2xl font-normal">
                Authentic Naga culinary preservation handcrafted in Kohima and Mokokchung.
                Slow-cured smoked pork, GI-tagged King Chilli (Raja Mircha), and wild fermented bamboo shoot pickles, delivered fresh across India.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-3">
                <Link
                  to="/products"
                  className="px-6 py-3.5 bg-chilli-700 hover:bg-chilli-800 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
                >
                  <span>Explore Authentic Batches</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/about"
                  className="px-6 py-3.5 bg-forest-900/90 hover:bg-forest-800 text-cream-100 font-semibold text-sm rounded-xl border border-forest-700 transition-colors"
                >
                  The Heritage Story
                </Link>
              </div>

              {/* Verified Trust Strip */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-forest-900 text-cream-200">
                <div>
                  <p className="font-serif font-bold text-white text-lg sm:text-xl">72 Hours</p>
                  <p className="text-[11px] text-cream-300/80 mt-0.5">Oak Firewood Smoking</p>
                </div>
                <div>
                  <p className="font-serif font-bold text-white text-lg sm:text-xl">GI-Certified</p>
                  <p className="text-[11px] text-cream-300/80 mt-0.5">Raja Mircha Origin</p>
                </div>
                <div>
                  <p className="font-serif font-bold text-white text-lg sm:text-xl">100% Pure</p>
                  <p className="text-[11px] text-cream-300/80 mt-0.5">Cold-Pressed Mustard Oil</p>
                </div>
              </div>
            </div>

            {/* Right Hero Showcase Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md rounded-2xl overflow-hidden shadow-2xl border border-forest-800/80 bg-forest-900">
                <img
                  src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80"
                  alt="Arenla Heritage Smoked Pork"
                  className="w-full h-[400px] object-cover object-center"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/40 to-transparent flex flex-col justify-end p-6 sm:p-8">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 px-2 py-0.5 bg-forest-900/80 border border-amber-300/30 rounded-md">
                      Signature Release
                    </span>
                    <span className="text-[11px] text-cream-300">Kohima, Nagaland</span>
                  </div>

                  <h3 className="font-serif font-bold text-xl sm:text-2xl text-white leading-snug">
                    Arenla's Smoked Pork & King Chilli Pickle
                  </h3>

                  <p className="text-xs text-cream-200/90 mt-1.5 leading-relaxed line-clamp-2">
                    Smoked for 72 hours over oakwood hearths, cured in cold-pressed mustard oil with Raja Mircha.
                  </p>

                  <div className="mt-4 pt-3 border-t border-forest-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-xl font-bold text-white font-serif">₹380</span>
                      <span className="text-xs text-cream-300 ml-1.5">/ 250g Jar</span>
                    </div>

                    <Link
                      to="/product/arenla-signature-smoked-pork-king-chilli-pickle"
                      className="px-4 py-2 bg-cream-50 text-forest-950 font-bold text-xs rounded-xl hover:bg-white transition-colors shadow-sm"
                    >
                      Taste Batch
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4 Pillars of Wangs Authenticity */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cream-100 flex items-center justify-center text-forest-900 mb-4">
                <Flame size={20} className="text-chilli-600" />
              </div>
              <h4 className="font-serif font-bold text-base text-stone-900 mb-1.5">Traditional Wood Smoke</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Meats cured for days above traditional oakwood fire pits, creating an authentic rustic campfire depth.
              </p>
            </div>
            <span className="text-[11px] text-forest-800 font-semibold mt-4 block">No Liquid Smoke</span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cream-100 flex items-center justify-center text-forest-900 mb-4">
                <Sparkles size={20} className="text-amber-600" />
              </div>
              <h4 className="font-serif font-bold text-base text-stone-900 mb-1.5">GI-Tagged King Chilli</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                100% authentic Raja Mircha (Bhut Jolokia) harvested in Nagaland hills, celebrated for explosive heat and citrus aroma.
              </p>
            </div>
            <span className="text-[11px] text-forest-800 font-semibold mt-4 block">1,000,000+ Scoville</span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cream-100 flex items-center justify-center text-forest-900 mb-4">
                <Leaf size={20} className="text-emerald-700" />
              </div>
              <h4 className="font-serif font-bold text-base text-stone-900 mb-1.5">Indigenous Fermentations</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Ancestral fermentations including wild bamboo shoots (Bastenga) and fermented soybean cakes (Axone).
              </p>
            </div>
            <span className="text-[11px] text-forest-800 font-semibold mt-4 block">Complex Natural Umami</span>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-subtle flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-cream-100 flex items-center justify-center text-forest-900 mb-4">
                <ShieldCheck size={20} className="text-forest-700" />
              </div>
              <h4 className="font-serif font-bold text-base text-stone-900 mb-1.5">Direct Artisan Payouts</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Fair-trade multi-vendor model with verified FSSAI licensing and transparent 10% platform commission.
              </p>
            </div>
            <span className="text-[11px] text-forest-800 font-semibold mt-4 block">Empowering Naga Producers</span>
          </div>
        </div>
      </section>

      {/* Curated Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-forest-800">Curation</span>
            <h2 className="font-serif text-3xl font-bold text-stone-900 mt-1">
              Regional Naga Specialties
            </h2>
          </div>
          <Link to="/products" className="text-xs font-bold text-forest-900 hover:text-forest-950 flex items-center gap-1 group">
            <span>Explore full catalog</span>
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.slug}`}
              className="group relative bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-subtle hover:shadow-card-hover transition-all duration-300 flex flex-col"
            >
              <div className="aspect-[4/3] overflow-hidden bg-cream-100">
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
              </div>
              <div className="p-4 text-center">
                <h3 className="font-serif font-bold text-stone-900 text-sm group-hover:text-forest-800 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {cat.product_count} {cat.product_count === 1 ? 'batch' : 'batches'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Bestsellers Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 text-amber-900 text-xs font-semibold rounded-md border border-amber-200 mb-1">
              <Award size={13} />
              <span>Customer Acclaim</span>
            </div>
            <h2 className="font-serif text-3xl font-bold text-stone-900">
              Bestselling Artisan Pickles
            </h2>
          </div>
          <Link to="/products" className="text-xs font-bold text-forest-900 hover:text-forest-950 flex items-center gap-1">
            <span>View all products</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-88 bg-stone-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bestsellers.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Interactive Flavour & Spice Heat Scale Explorer */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-subtle p-6 sm:p-10">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-forest-800">
              Flavour Terroir Guide
            </span>
            <h2 className="font-serif text-3xl font-bold text-stone-900 mt-1">
              Navigating the Naga Heat & Smoke Matrix
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 mt-2">
              From delicate wild forest fruits to the legendary million-Scoville heat of Raja Mircha, select a profile to understand its curing and pairing.
            </p>
          </div>

          {/* Guide Switcher */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-w-2xl mx-auto mb-8 bg-cream-100 p-1 rounded-2xl">
            {[
              { id: 'fruit', label: 'Mild (Fruit)' },
              { id: 'bamboo', label: 'Medium (Bastenga)' },
              { id: 'pork', label: 'Hot (Smoked Pork)' },
              { id: 'chilli', label: 'Fiery (Raja Mircha)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedHeatGuide(tab.id)}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  selectedHeatGuide === tab.id
                    ? 'bg-forest-900 text-cream-50 shadow-sm'
                    : 'text-stone-700 hover:text-stone-950'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Profile Card */}
          {heatProfiles[selectedHeatGuide] && (
            <div className="bg-cream-50 rounded-2xl border border-stone-200/80 p-6 sm:p-8 max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              <div className="md:col-span-7 space-y-3">
                <span className="text-xs font-semibold text-chilli-700">
                  Heat Rating: {heatProfiles[selectedHeatGuide].heat}
                </span>
                <h3 className="font-serif font-bold text-2xl text-stone-900">
                  {heatProfiles[selectedHeatGuide].name}
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {heatProfiles[selectedHeatGuide].notes}
                </p>
                <div className="pt-2 text-xs text-stone-700 border-t border-stone-200">
                  <strong className="text-stone-900 block mb-0.5">Best Serving Pairing:</strong>
                  {heatProfiles[selectedHeatGuide].pairWith}
                </div>
              </div>

              <div className="md:col-span-5 bg-white p-5 rounded-xl border border-stone-200 text-xs space-y-2">
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Terroir & Origin</span>
                  <span className="font-semibold text-stone-900">{heatProfiles[selectedHeatGuide].terroir}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Curing Method</span>
                  <span className="font-semibold text-stone-900">{heatProfiles[selectedHeatGuide].curing}</span>
                </div>
                <div className="pt-2">
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-forest-800 hover:text-forest-950"
                  >
                    <span>Browse this category</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Featured Collection Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-bold tracking-wider uppercase text-forest-800">Fresh Harvest</span>
            <h2 className="font-serif text-3xl font-bold text-stone-900 mt-1">
              Handpicked Featured Batches
            </h2>
          </div>
          <Link to="/products" className="text-xs font-bold text-forest-900 hover:text-forest-950 flex items-center gap-1">
            <span>Explore full catalog</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Multi-Vendor Marketplace Producer Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-forest-950 text-cream-50 rounded-3xl p-8 sm:p-12 relative overflow-hidden border border-forest-900">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-forest-900 border border-forest-800 rounded-full text-xs text-amber-300">
                <Store size={14} />
                <span>Northeast India Multi-Vendor Platform</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-snug">
                Are you a food manufacturer in Nagaland?
              </h2>
              <p className="text-sm sm:text-base text-cream-200/90 leading-relaxed max-w-2xl">
                Wangs empowers authentic regional producers from Kohima, Dimapur, Mokokchung, and across Nagaland.
                Benefit from pan-India logistics, transparent 10% platform commission, direct automated payouts,
                and dedicated regulatory compliance support.
              </p>
              <div className="pt-2 flex flex-wrap gap-4">
                <Link
                  to="/manufacturer/register"
                  className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  Apply as a Manufacturer
                </Link>
                <Link
                  to="/about"
                  className="px-6 py-3.5 bg-forest-900 hover:bg-forest-800 text-cream-100 font-semibold text-xs rounded-xl border border-forest-800 transition-colors"
                >
                  Seller Guidelines & FSSAI Standards
                </Link>
              </div>
            </div>

            <div className="lg:col-span-4 bg-forest-900/80 p-6 sm:p-8 rounded-2xl border border-forest-800 space-y-3.5 text-xs text-cream-200">
              <h4 className="font-serif font-bold text-sm text-white border-b border-forest-800 pb-2">
                Why Sell on Wangs?
              </h4>
              <div className="flex items-start gap-2.5">
                <CheckCircle size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Fair, fixed 10% platform commission with zero listing fees</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Transparent seller dashboard with real-time order & net earnings tracking</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Pan-India cold-chain and air courier dispatch integration</span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Admin review safeguarding true artisanal Naga quality</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Customer Reviews & Press */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold tracking-wider uppercase text-forest-800">Verified Patrons</span>
          <h2 className="font-serif text-3xl font-bold text-stone-900 mt-1">
            Bringing the Aroma of the Hills to Homes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-stone-200/80 shadow-subtle flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex text-amber-500 gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-sm text-stone-700 italic leading-relaxed">
                "Having lived in Delhi for 8 years, finding real Naga smoked pork pickle that tastes like home felt impossible. Arenla Heritage signature pork pickle is identical to the ones my family used to make in Mokokchung. The oak smoke is phenomenal!"
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-stone-100">
              <p className="font-bold text-xs text-stone-900">Dr. K. Jamir</p>
              <p className="text-[11px] text-stone-500">Verified Buyer · New Delhi</p>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-stone-200/80 shadow-subtle flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex text-amber-500 gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-sm text-stone-700 italic leading-relaxed">
                "The Raja Mircha pickle is intense! It’s not just mindless heat; the mustard oil and mountain peppercorns give it an amazing floral citrus depth. A tiny spoonful elevates simple dal and rice into a feast."
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-stone-100">
              <p className="font-bold text-xs text-stone-900">Ananya Sen</p>
              <p className="text-[11px] text-stone-500">Food Critic · Bengaluru</p>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-7 rounded-2xl border border-stone-200/80 shadow-subtle flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex text-amber-500 gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-sm text-stone-700 italic leading-relaxed">
                "Ordered the Bastenga (fermented bamboo shoot) and wild apple pickle. Packed securely in sturdy glass jars with thick tamper seals, arrived in Mumbai within 4 days. Crisp, tangy, authentic Northeast India."
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-stone-100">
              <p className="font-bold text-xs text-stone-900">Vikramaditya Mehta</p>
              <p className="text-[11px] text-stone-500">Verified Buyer · Mumbai</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
