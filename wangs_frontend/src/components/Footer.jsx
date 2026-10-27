import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { isAuthorizedToSell, isManufacturer, allowSellerRegistration } = useAuth();
  const showSellWithUs = Boolean(allowSellerRegistration);

  return (
    <footer className="bg-forest-950 text-stone-400 py-8 md:py-10 border-t border-forest-900/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pb-6 border-b border-forest-900/80 text-center md:text-left">
          {/* Brand Wordmark & 1-line Tagline */}
          <div className="space-y-1.5">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <img
                src="/logo-white.png"
                alt="Wangs"
                className="h-7 w-auto object-contain"
              />
              <span className="font-brand font-black text-xl tracking-[0.14em] text-white uppercase">
                Wangs
              </span>
            </Link>
            <p className="text-xs text-stone-400 max-w-sm">
              Artisan cured regional pickles, delivered fresh nationwide.
            </p>
          </div>

          {/* Essential Store Navigation */}
          <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-2.5 text-xs font-medium text-stone-300">
            <Link to="/products" className="hover:text-white transition-colors">
              Pickles
            </Link>
            <Link to="/brands" className="hover:text-white transition-colors">
              Brands
            </Link>
            <Link to="/about" className="hover:text-white transition-colors">
              About
            </Link>
            <Link to="/contact" className="hover:text-white transition-colors">
              Contact
            </Link>
            {showSellWithUs && (
              <Link
                to="/manufacturer/register"
                className="text-amber-300 hover:text-amber-200 font-semibold transition-colors"
              >
                {isManufacturer ? 'Seller Dashboard' : 'Sell with Us'}
              </Link>
            )}
            {isAuthorizedToSell && !showSellWithUs && (
              <Link to="/manufacturer" className="hover:text-white transition-colors">
                Seller Portal
              </Link>
            )}
          </div>
        </div>

        {/* Required Policies & Copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-stone-500 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link to="/terms" className="hover:text-stone-300 transition-colors">
              Terms
            </Link>
            <span>·</span>
            <Link to="/privacy" className="hover:text-stone-300 transition-colors">
              Privacy
            </Link>
            <span>·</span>
            <Link to="/shipping" className="hover:text-stone-300 transition-colors">
              Shipping
            </Link>
            <span>·</span>
            <Link to="/refunds" className="hover:text-stone-300 transition-colors">
              Refunds
            </Link>
          </div>

          <p>© {new Date().getFullYear()} Wangs (wangs.in). All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
