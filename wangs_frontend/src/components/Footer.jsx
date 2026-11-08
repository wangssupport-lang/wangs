import React from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, Store, Mail,
  ArrowRight, Sparkles, Phone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { allowSellerRegistration, isManufacturer } = useAuth();

  return (
    <footer className="w-full bg-[#161311] text-stone-200 mt-20 border-t border-stone-800 selection:bg-[#9b4100] selection:text-white">
      {/* 1. Express Regional Delivery Banner */}
      <div className="border-b border-stone-800/80 bg-[#1c1815]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-5">
          <div className="flex items-center gap-3.5 max-w-xl">
            <div className="w-10 h-10 rounded-xl bg-orange-950/60 text-orange-300 border border-orange-700/40 flex items-center justify-center shrink-0">
              <Truck size={20} />
            </div>
            <div className="space-y-0.5">
              <h4 className="font-bold text-sm text-stone-100 font-serif">Express Regional Delivery</h4>
              <p className="text-xs text-stone-400 leading-relaxed">
                Within Kohima: 12 hrs (best case 30m–1h) · Nagaland: 1–2 days · Pan-India: 4–10 days.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Heritage Producer Guild Callout (Strictly controlled by Admin toggle) */}
      {Boolean(allowSellerRegistration) && (
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

      {/* 3. Main Footer Links */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-10 lg:py-14">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10">
          {/* Column 1: Brand Identity & Mission */}
          <div className="space-y-4 max-w-md">
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

            <p className="text-xs text-stone-400 leading-relaxed">
              Discover Bharat’s richest heirloom pickle traditions. Authentic, small-batch avakaya, gongura, lonche, uppinakayi, and pachadi — sun-matured by master culinary custodians and delivered in earthenware-safe protection.
            </p>

            <div className="pt-2 space-y-2 border-t border-stone-800 text-xs text-stone-400">
              <div className="flex items-center gap-2 text-stone-300">
                <Mail size={14} className="text-[#ffb691]" />
                <a href="mailto:wangssupport@gmail.com" className="hover:text-amber-400 transition-colors">
                  wangssupport@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2 text-stone-300">
                <Phone size={14} className="text-[#ffb691]" />
                <span>Mon – Sat, 9:00 AM – 7:00 PM IST</span>
              </div>
            </div>
          </div>

          {/* Column 2: Artisan Marketplace */}
          <div className="space-y-3">
            <h4 className="font-serif font-bold text-sm text-stone-100 uppercase tracking-wider text-[11px]">
              Artisan Marketplace
            </h4>
            <ul className="space-y-2.5 text-xs text-stone-400 font-medium">
              {(isManufacturer || allowSellerRegistration) && (
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
            </ul>
          </div>
        </div>

        {/* 4. Bottom Legal Strip */}
        <div className="border-t border-stone-800/80 mt-12 pt-8 flex items-center justify-center text-xs text-stone-400">
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
