import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, ShieldCheck, Flame, Sparkles, Award,
  Truck, CheckCircle, ChevronRight, Store, Star
} from 'lucide-react';
import { api } from '../api';
import ProductCard from '../components/ProductCard';

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [bestsellers, setBestsellers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-forest-950 text-cream-50 py-16 sm:py-24 border-b border-forest-900">
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
          <img
            src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1600&q=80"
            alt="Naga Pickles"
            className="w-full h-full object-cover object-center"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-forest-800/80 border border-forest-700 rounded-full text-xs text-cream-200">
                <Flame size={14} className="text-chilli-500 fill-current" />
                <span>The Authentic Flavours of Nagaland</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.15]">
                Firewood-Smoked Meats & Wild Hill Chillies.
              </h1>

              <p className="text-base sm:text-lg text-cream-200/90 leading-relaxed max-w-2xl font-normal">
                Born in my aunt’s kitchen in Kohima and crafted by verified regional food artisans.
                Experience slow-cured Naga smoked pork, fiery Raja Mircha (King Chilli), and fragrant wild bamboo shoot pickles delivered fresh across India.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/products"
                  className="px-6 py-3.5 bg-chilli-700 hover:bg-chilli-800 text-white font-semibold text-sm rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group"
                >
                  <span>Explore Authentic Pickles</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>

                <Link
                  to="/about"
                  className="px-6 py-3.5 bg-forest-900/80 hover:bg-forest-800 text-cream-100 font-semibold text-sm rounded-xl border border-forest-700 transition-colors"
                >
                  Our Aunt’s Story
                </Link>
              </div>

              {/* Badges Bar */}
              <div className="grid grid-cols-3 gap-4 pt-6 border-t border-forest-800/80 text-xs text-cream-300">
                <div>
                  <p className="font-bold text-white text-sm">35+ Years</p>
                  <p className="text-[11px] text-cream-400">Traditional Family Heritage</p>
                </div>
                <div>
                  <p className="font-bold text-white text-sm">GI-Tagged</p>
                  <p className="text-[11px] text-cream-400">Naga King Chilli Origin</p>
                </div>
                <div>
                  <p className="font-bold text-white text-sm">FSSAI Certified</p>
                  <p className="text-[11px] text-cream-400">Vetted Artisan Producers</p>
                </div>
              </div>
            </div>

            {/* Hero Image Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md rounded-2xl overflow-hidden shadow-2xl border-4 border-forest-800/60 bg-forest-900">
                <img
                  src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80"
                  alt="Aunt Arenla's Signature Smoked Pork"
                  className="w-full h-96 object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest-950/90 via-transparent to-transparent flex flex-col justify-end p-6">
                  <span className="text-xs uppercase tracking-wider text-amber-300 font-bold mb-1">
                    Featured Heritage Batch
                  </span>
                  <h3 className="font-serif font-bold text-xl text-white">
                    Aunt Arenla's Smoked Pork & King Chilli
                  </h3>
                  <p className="text-xs text-cream-200 mt-1">
                    Slowly smoked for 72 hours over aged oak wood in Kohima.
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-white">₹380 <span className="text-xs text-cream-300 font-normal">/ 250g</span></span>
                    <Link
                      to="/product/aunt-arenla-smoked-pork-king-chilli-pickle"
                      className="px-3.5 py-1.5 bg-cream-50 text-forest-950 font-bold text-xs rounded-lg hover:bg-white transition-colors"
                    >
                      Taste Now
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-forest-700">Curated Categories</span>
            <h2 className="font-serif text-3xl font-bold text-stone-900 mt-1">
              Shop by Naga Regional Specialties
            </h2>
          </div>
          <Link to="/products" className="text-xs font-semibold text-forest-800 hover:text-forest-950 flex items-center gap-1 group">
            <span>Browse All Pickles</span>
            <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.slug}`}
              className="group relative bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
            >
              <div className="aspect-[4/3] overflow-hidden bg-stone-100">
                <img
                  src={cat.image_url}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-3 text-center">
                <h3 className="font-serif font-bold text-stone-900 text-sm group-hover:text-forest-800 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  {cat.product_count} {cat.product_count === 1 ? 'variety' : 'varieties'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Bestselling Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-50 text-amber-800 text-xs font-semibold rounded-md border border-amber-200 mb-1">
              <Award size={13} />
              <span>Customer Favorites</span>
            </div>
            <h2 className="font-serif text-3xl font-bold text-stone-900">
              Bestselling Authentic Pickles
            </h2>
          </div>
          <Link to="/products" className="text-xs font-semibold text-forest-800 hover:text-forest-950 flex items-center gap-1">
            <span>View all products</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-80 bg-stone-100 animate-pulse rounded-xl" />
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

      {/* Brand Story Banner — Aunt Arenla's Kitchen */}
      <section className="bg-cream-100 border-y border-stone-200/80 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-forest-800">
                The Origin Story
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
                "It started with my aunt curing smoked pork over oak firewood in Kohima."
              </h2>
              <p className="text-sm text-stone-600 leading-relaxed">
                For over three decades, relatives and travelers would visit Kohima just to take back jars of Aunt Arenla’s
                famous smoked pork and fiery King Chilli pickles. Every jar was crafted by hand: local meats slow-smoked
                above the home hearth, seasoned with fermented soybeans (Axone), and infused in virgin cold-pressed mustard oil.
              </p>
              <p className="text-sm text-stone-600 leading-relaxed">
                We founded <strong>Wangs (wangs.in)</strong> to preserve and celebrate this endangered culinary craft.
                Today, Wangs not only brings my aunt’s recipes to every corner of India, but also provides a compliant,
                transparent marketplace for other verified Nagaland pickle artisans to share their generational craft.
              </p>
              <div className="pt-2 flex items-center gap-6">
                <Link
                  to="/products?category=pork-pickle"
                  className="px-5 py-2.5 bg-forest-800 hover:bg-forest-900 text-white font-semibold text-xs rounded-lg transition-colors"
                >
                  Taste Aunt Arenla's Pickles
                </Link>
                <div className="text-xs text-stone-500">
                  <span className="font-semibold text-stone-800 block">Kohima, Nagaland</span>
                  <span>FSSAI Lic. #10023064000124</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <img
                  src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=500&q=80"
                  alt="Oak Firewood Smoking"
                  className="rounded-xl object-cover h-52 w-full shadow-md"
                />
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <h4 className="font-serif font-bold text-stone-900 text-sm">Oak Wood Smoking</h4>
                  <p className="text-xs text-stone-500 mt-1">
                    Authentic Naga firewood cure giving an unmistakably deep, rustic campfire aroma.
                  </p>
                </div>
              </div>
              <div className="space-y-4 pt-6">
                <div className="bg-white p-4 rounded-xl border border-stone-200">
                  <h4 className="font-serif font-bold text-stone-900 text-sm">Pure King Chilli</h4>
                  <p className="text-xs text-stone-500 mt-1">
                    Authentic GI-certified Raja Mircha (Bhut Jolokia) with vibrant citrus notes and clean heat.
                  </p>
                </div>
                <img
                  src="https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=500&q=80"
                  alt="Naga King Chilli"
                  className="rounded-xl object-cover h-52 w-full shadow-md"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Collection Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider uppercase text-forest-700">Artisan Harvest</span>
            <h2 className="font-serif text-3xl font-bold text-stone-900 mt-1">
              Handpicked Featured Batches
            </h2>
          </div>
          <Link to="/products" className="text-xs font-semibold text-forest-800 hover:text-forest-950 flex items-center gap-1">
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

      {/* Multi-Vendor Marketplace Callout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-forest-900 text-cream-50 rounded-2xl p-8 sm:p-12 relative overflow-hidden border border-forest-800">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-forest-800 border border-forest-700 rounded-md text-xs text-amber-300">
                <Store size={14} />
                <span>Multi-Vendor Platform for Northeast India</span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-snug">
                Are you a food manufacturer in Nagaland?
              </h2>
              <p className="text-sm sm:text-base text-cream-200 leading-relaxed max-w-2xl">
                Wangs empowers authentic regional producers from Kohima, Dimapur, Mokokchung, and across Nagaland.
                Benefit from pan-India logistics, transparent 10% platform commission, direct automated payouts,
                and dedicated regulatory compliance support.
              </p>
              <div className="pt-2 flex flex-wrap gap-4">
                <Link
                  to="/manufacturer/register"
                  className="px-5 py-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-xl shadow-md transition-colors"
                >
                  Apply as a Manufacturer
                </Link>
                <Link
                  to="/about"
                  className="px-5 py-3 bg-forest-800 hover:bg-forest-700 text-cream-100 font-semibold text-xs rounded-xl border border-forest-700 transition-colors"
                >
                  Seller Guidelines & FSSAI Standards
                </Link>
              </div>
            </div>

            <div className="lg:col-span-4 bg-forest-950/80 p-6 rounded-xl border border-forest-800 space-y-3 text-xs text-cream-200">
              <h4 className="font-serif font-bold text-sm text-white border-b border-forest-800 pb-2">
                Why Sell on Wangs?
              </h4>
              <div className="flex items-start gap-2">
                <CheckCircle size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Fair, fixed 10% platform commission with no hidden listing fees</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Transparent seller dashboard with real-time order & net earnings tracking</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Pan-India cold-chain and courier dispatch integration</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle size={15} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span>Admin review safeguarding true artisanal Naga quality</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-semibold tracking-wider uppercase text-forest-700">Real Customer Love</span>
          <h2 className="font-serif text-3xl font-bold text-stone-900 mt-1">
            Bringing the Aroma of the Hills to Homes
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-sm text-stone-700 italic leading-relaxed">
                "Having lived in Delhi for 8 years, finding real Naga smoked pork pickle that tastes like home felt impossible. Aunt Arenla’s signature pork pickle is identical to the ones my grandmother used to make in Mokokchung. The oak smoke is phenomenal!"
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-stone-100">
              <p className="font-semibold text-xs text-stone-900">Dr. K. Jamir</p>
              <p className="text-[11px] text-stone-500">Verified Buyer · New Delhi</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-sm text-stone-700 italic leading-relaxed">
                "The Raja Mircha pickle is intense! It’s not just mindless heat; the mustard oil and mountain peppercorns give it an amazing floral citrus depth. A tiny spoonful elevates simple dal and rice into a feast."
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-stone-100">
              <p className="font-semibold text-xs text-stone-900">Ananya Sen</p>
              <p className="text-[11px] text-stone-500">Food Critic · Bengaluru</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="text-sm text-stone-700 italic leading-relaxed">
                "Ordered the Bastenga (fermented bamboo shoot) and wild apple pickle. Packed securely in sturdy glass jars with thick tamper seals, arrived in Mumbai within 4 days. Crisp, tangy, authentic Northeast India."
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-stone-100">
              <p className="font-semibold text-xs text-stone-900">Vikramaditya Mehta</p>
              <p className="text-[11px] text-stone-500">Verified Buyer · Mumbai</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
