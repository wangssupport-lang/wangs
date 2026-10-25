import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Store, Heart, MapPin, Mail, Phone, ExternalLink, ArrowRight, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { isAuthorizedToSell, isManufacturer, allowSellerRegistration } = useAuth();
  // STRICTLY hide unless the platform admin explicitly turns ON seller registration in Admin Space
  const showSellWithUs = Boolean(allowSellerRegistration);

  return (
    <footer className="bg-forest-950 text-stone-300 pt-10 sm:pt-16 pb-28 md:pb-12 border-t border-forest-900 mt-10 sm:mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Sell with Us Producer Callout Banner - STRICTLY displayed ONLY when admin allows seller registration */}
        {showSellWithUs && (
          <div className="mb-6 sm:mb-8 p-3.5 sm:p-5 rounded-2xl bg-gradient-to-r from-forest-900 via-forest-850 to-forest-900 border border-forest-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-0.5 max-w-lg">
              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Store size={11} /> Producer Collective
              </span>
              <h3 className="font-serif font-bold text-sm sm:text-base text-white">
                Sell with Us on Wangs
              </h3>
              <p className="text-[11px] text-stone-300/80 leading-normal">
                Join verified artisan producers reaching food lovers across India with express air fulfillment. Mandatory FSSAI license required.
              </p>
            </div>
            <Link
              to="/manufacturer/register"
              className="self-start sm:self-center px-4 py-2 bg-amber-400 hover:bg-amber-300 text-forest-950 font-bold text-[11px] sm:text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 whitespace-nowrap active:scale-98"
            >
              <span>{isManufacturer ? 'Seller Dashboard' : 'Apply to Sell with Us'}</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        )}

        {/* Main Footer Grid: 2 columns on mobile, 5 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-10 pb-8 sm:pb-12 border-b border-forest-900">
          {/* Brand Info with Real Green Crest */}
          <div className="col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-3 sm:mb-4 group select-none">
              <img
                src="/logo-white.png"
                alt="Wangs"
                className="h-8 w-auto sm:h-9 sm:w-auto object-contain transition-transform duration-200 group-hover:scale-105"
              />
              <span className="font-brand font-black text-2xl sm:text-[1.85rem] tracking-[0.14em] leading-none text-white uppercase group-hover:text-amber-300 transition-colors">
                Wangs
              </span>
            </Link>

            <p className="text-xs text-stone-400 leading-relaxed mb-4 sm:mb-6 max-w-sm">
              India’s multi-vendor marketplace connecting verified artisanal producers, slow-cured smoked meats, King Chillies, and natural ferments directly to your doorstep.
            </p>

            <div className="flex items-center gap-2 text-xs text-forest-300 bg-forest-900/60 p-2.5 sm:p-3 rounded-xl border border-forest-800/80 max-w-md">
              <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
              <span className="text-[11px] sm:text-xs">
                All sellers are verified food manufacturers holding valid FSSAI food business licensing and hygiene compliance.
              </span>
            </div>
          </div>

          {/* Specialties */}
          <div className="col-span-1">
            <h4 className="font-serif font-bold text-white text-sm sm:text-base mb-3 sm:mb-4 tracking-wide">
              Pickle Catalog
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/products?category=chilli-pickle" className="hover:text-white transition-colors">
                  King Chilli
                </Link>
              </li>
              <li>
                <Link to="/products?category=bamboo-shoot-pickle" className="hover:text-white transition-colors">
                  Fermented Bamboo
                </Link>
              </li>
              <li>
                <Link to="/products?category=vegetarian-pickles" className="hover:text-white transition-colors">
                  Axone Chutneys
                </Link>
              </li>
              <li>
                <Link to="/products" className="hover:text-white transition-colors text-amber-300 font-medium">
                  All Pickles →
                </Link>
              </li>
            </ul>
          </div>

          {/* Marketplace & Sellers */}
          <div className="col-span-1">
            <h4 className="font-serif font-bold text-white text-sm sm:text-base mb-3 sm:mb-4 tracking-wide">
              {showSellWithUs ? 'Sell with Us' : 'Producers'}
            </h4>
            <ul className="space-y-2 text-xs">
              {showSellWithUs && (
                <li>
                  <Link to="/manufacturer/register" className="hover:text-amber-200 transition-colors text-amber-300 font-bold flex items-center gap-1">
                    <Store size={12} /> Sell with Us
                  </Link>
                </li>
              )}
              {isAuthorizedToSell && (
                <li>
                  <Link to="/manufacturer" className="hover:text-white transition-colors">
                    Seller Portal
                  </Link>
                </li>
              )}
              <li>
                <Link to="/brands" className="hover:text-white transition-colors">
                  Artisan Brands
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  FSSAI Standards
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Producer Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Transparency */}
          <div className="col-span-2 sm:col-span-1">
            <h4 className="font-serif font-bold text-white text-sm sm:text-base mb-3 sm:mb-4 tracking-wide">
              Legal & Help
            </h4>
            <ul className="space-y-2 text-xs flex flex-wrap gap-x-4 sm:flex-col sm:space-y-2 sm:gap-x-0">
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/shipping" className="hover:text-white transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link to="/refunds" className="hover:text-white transition-colors">
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Customer Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-3 text-center sm:text-left">
          <p>© {new Date().getFullYear()} Wangs Marketplace (wangs.in). All rights reserved.</p>
          <div className="flex items-center gap-3 text-stone-400 text-[11px]">
            <span>Express Pan-India Air Delivery</span>
            <span className="opacity-30">·</span>
            <span>100% Verified Artisan Producers</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
