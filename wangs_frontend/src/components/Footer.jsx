import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Truck, PackageCheck, Store, Mail,
  ArrowRight, CheckCircle2, Lock, Sparkles, HeartHandshake, Phone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';

export default function Footer() {
  const { allowSellerRegistration, isAuthorizedToSell, isManufacturer } = useAuth();
  const toast = useToast();

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribedSuccess, setSubscribedSuccess] = useState(false);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubscribing(true);
    try {
      await api.apiRequest('/maintenance/notify/', {
        method: 'POST',
        body: JSON.stringify({ email: newsletterEmail.trim() }),
      });
      setSubscribedSuccess(true);
      toast.success('Welcome to the Wangs Seasonal Harvest Guild! You will be notified when rare small batches go live.');
      setNewsletterEmail('');
    } catch (err) {
      // Even if network fails or email already registered, treat gracefully
      setSubscribedSuccess(true);
      toast.success('Thank you! You are subscribed to our seasonal batch alerts.');
      setNewsletterEmail('');
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <footer className="w-full bg-[#161311] text-stone-200 mt-20 border-t border-stone-800 selection:bg-[#9b4100] selection:text-white">
      {/* 1. Value Proposition & Trust Pillars Banner */}
      <div className="border-b border-stone-800/80 bg-[#1c1815]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 lg:py-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Pillar 1 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#9b4100]/20 text-[#ffb691] border border-[#9b4100]/40 flex items-center justify-center shrink-0">
                <Store size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-stone-100 font-serif">Artisan Earthen Kitchens</h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Connecting 320+ verified multi-generational regional makers directly with pickle connoisseurs.
                </p>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 text-emerald-300 border border-emerald-700/40 flex items-center justify-center shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-stone-100 font-serif">Zero Synthetic Preservatives</h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Sun-cured in wood-pressed oils with stone-ground heirloom spices and zero artificial additives.
                </p>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-950/60 text-amber-300 border border-amber-700/40 flex items-center justify-center shrink-0">
                <PackageCheck size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-stone-100 font-serif">Zero-Leak Transit Guard</h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Multi-cushioned shockproof packaging engineered specifically for glass &amp; ceramic martabans.
                </p>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-orange-950/60 text-orange-300 border border-orange-700/40 flex items-center justify-center shrink-0">
                <Truck size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-stone-100 font-serif">Express Regional Delivery</h4>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Within Kohima: 12 hrs (best case 30m–1h) · Nagaland: 1–2 days · Pan-India: 4–10 days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Heritage Producer Guild Callout (Controlled by Admin toggle) */}
      {(allowSellerRegistration || isAuthorizedToSell) && (
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 pt-8">
          <div className="relative overflow-hidden bg-gradient-to-r from-[#9b4100] via-[#a84705] to-[#783000] text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-amber-600/30">
            {/* Background Texture Accents */}
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-12 w-32 h-32 rounded-full bg-black/10 pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center lg:text-left max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-bold uppercase tracking-wider text-white">
                  <Sparkles size={13} className="text-amber-200" />
                  <span>Heritage Producer Guild</span>
                </div>
                <h3 className="font-serif font-bold text-2xl sm:text-3xl text-white leading-tight">
                  Are you a traditional, regional pickle maker?
                </h3>
                <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                  List your handcrafted recipes on Wangs Marketplace. Reach over 50,000+ pickle lovers across India with direct payouts, temperature-safe martaban courier pickups, and an introductory 0% commission window.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
                <Link
                  to={isManufacturer ? "/manufacturer" : "/manufacturer/register"}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-white text-[#9b4100] font-bold text-xs sm:text-sm text-center shadow-lg hover:bg-stone-100 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Store size={16} />
                  <span>{isManufacturer ? "Open Seller Studio" : "Register as Artisan Seller"}</span>
                </Link>
                <Link
                  to="/about"
                  className="w-full sm:w-auto px-5 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm text-center border border-white/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Learn How It Works</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Main Footer Links & Newsletter Grid */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Column 1: Brand Identity & Mission (4 cols on lg) */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="flex items-center gap-3 group w-fit">
              <div className="w-10 h-10 rounded-xl bg-[#fff8f4] p-1 flex items-center justify-center shadow-md border border-stone-700/60 transition-transform group-hover:scale-105">
                <img
                  src="/logo.png"
                  alt="Wangs Pickle Marketplace"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-2xl font-bold text-stone-100 tracking-tight leading-none">
                  Wangs
                </span>
                <span className="text-[9px] uppercase tracking-widest text-amber-500 font-bold leading-tight mt-1">
                  Artisanal Pickle Marketplace
                </span>
              </div>
            </Link>

            <p className="text-xs text-stone-400 leading-relaxed max-w-sm">
              Discover Bharat’s richest heirloom pickle traditions. Authentic, small-batch avakaya, gongura, lonche, uppinakayi, and pachadi — sun-matured by master culinary custodians and delivered in earthenware-safe protection.
            </p>

            <div className="pt-2 space-y-2 border-t border-stone-800 text-xs text-stone-400">
              <div className="flex items-center gap-2 text-stone-300">
                <Mail size={14} className="text-[#ffb691]" />
                <a href="mailto:support@wangspickle.com" className="hover:text-amber-400 transition-colors">
                  support@wangspickle.com
                </a>
              </div>
              <div className="flex items-center gap-2 text-stone-300">
                <Phone size={14} className="text-[#ffb691]" />
                <span>Mon – Sat, 9:00 AM – 7:00 PM IST</span>
              </div>
            </div>
          </div>

          {/* Column 2: Regional Heritage Belts (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-serif font-bold text-sm text-stone-100 uppercase tracking-wider text-[11px]">
              Regional Terroirs
            </h4>
            <ul className="space-y-2 text-xs text-stone-400 font-medium">
              <li>
                <Link to="/products?category=andhra-gongura" className="hover:text-amber-400 transition-colors">
                  Andhra Avakaya &amp; Gongura
                </Link>
              </li>
              <li>
                <Link to="/products?category=rajasthani-ker" className="hover:text-amber-400 transition-colors">
                  Rajasthani Ker Sangri
                </Link>
              </li>
              <li>
                <Link to="/products?category=punjabi-mustard" className="hover:text-amber-400 transition-colors">
                  Punjabi Cold-Pressed Mango
                </Link>
              </li>
              <li>
                <Link to="/products?category=northeast-bhoot" className="hover:text-amber-400 transition-colors">
                  North-East Bhoot Jolokia
                </Link>
              </li>
              <li>
                <Link to="/products?category=gujarati-chhundo" className="hover:text-amber-400 transition-colors">
                  Gujarati Sweet Chhundo
                </Link>
              </li>
              <li>
                <Link to="/products?category=malabar-lemon" className="hover:text-amber-400 transition-colors">
                  Kerala Malabar Kadumanga
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Artisanal Marketplace (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-serif font-bold text-sm text-stone-100 uppercase tracking-wider text-[11px]">
              Artisan Marketplace
            </h4>
            <ul className="space-y-2 text-xs text-stone-400 font-medium">
              {(allowSellerRegistration || isAuthorizedToSell) && (
                <li>
                  <Link
                    to={isManufacturer ? "/manufacturer" : "/manufacturer/register"}
                    className="text-amber-400 hover:text-amber-300 transition-colors font-bold flex items-center gap-1"
                  >
                    <span>{isManufacturer ? "Seller Studio Hub" : "Sell on Wangs (0% Fee)"}</span>
                  </Link>
                </li>
              )}
              <li>
                <Link to="/brands" className="hover:text-amber-400 transition-colors">
                  Verified Heritage Makers
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-amber-400 transition-colors">
                  Curated Small-Batch Catalog
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-amber-400 transition-colors">
                  Kitchen Hygiene Standards
                </Link>
              </li>
              <li>
                <Link to="/wangsadminspace" className="text-stone-500 hover:text-stone-300 transition-colors">
                  Marketplace Admin Portal
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Customer Care & Assurance (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-serif font-bold text-sm text-stone-100 uppercase tracking-wider text-[11px]">
              Customer Care
            </h4>
            <ul className="space-y-2 text-xs text-stone-400 font-medium">
              <li>
                <Link to="/account" className="hover:text-amber-400 transition-colors">
                  Track Jar Consignment
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="hover:text-amber-400 transition-colors">
                  Martaban Packaging Guard
                </Link>
              </li>
              <li>
                <Link to="/refunds" className="hover:text-amber-400 transition-colors">
                  Replacement Guarantee
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-amber-400 transition-colors">
                  Contact Food Curators
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-amber-400 transition-colors">
                  Platform Marketplace Terms
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Seasonal Harvest Alerts (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-serif font-bold text-sm text-stone-100 uppercase tracking-wider text-[11px]">
              Harvest Alerts
            </h4>
            <p className="text-xs text-stone-400 leading-relaxed">
              Get notified when limited summer Avakaya and winter Gobi-Shalgam batches are ready.
            </p>

            {subscribedSuccess ? (
              <div className="p-3 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                <span>You're on the harvest release alert list!</span>
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="space-y-2">
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="Enter your email"
                    value={newsletterEmail}
                    onChange={(e) => setNewsletterEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-xl text-xs text-white placeholder:text-stone-500 focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isSubscribing}
                    className="mt-1.5 w-full py-2 bg-[#9b4100] hover:bg-[#b54c00] text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Notify Me</span>
                    <ArrowRight size={13} />
                  </button>
                </div>
                <span className="text-[10px] text-stone-500 block">
                  Zero spam. Strictly seasonal crop batch dispatches.
                </span>
              </form>
            )}
          </div>
        </div>

        {/* 4. Bottom Legal & Payment Security Strip */}
        <div className="border-t border-stone-800/80 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-5 text-xs text-stone-400">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <p>© {new Date().getFullYear()} Wangs Pickle Marketplace Pvt Ltd. Handcrafted in India.</p>
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-stone-500">
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <Lock size={11} /> 256-Bit SSL Encrypted
              </span>
            </div>
          </div>

          {/* Legal Links (Clean without platform FSSAI mention) */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
            <Link to="/privacy" className="hover:text-stone-200 transition-colors">
              Privacy Policy
            </Link>
            <span className="text-stone-700">•</span>
            <Link to="/terms" className="hover:text-stone-200 transition-colors">
              Terms of Service
            </Link>
            <span className="text-stone-700">•</span>
            <Link to="/shipping" className="hover:text-stone-200 transition-colors">
              Shipping Policy
            </Link>
            <span className="text-stone-700">•</span>
            <Link to="/refunds" className="hover:text-stone-200 transition-colors">
              Refunds &amp; Cancellations
            </Link>
            <span className="text-stone-700">•</span>
            <Link to="/contact" className="hover:text-stone-200 transition-colors">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
