import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { allowSellerRegistration, isAuthorizedToSell, isManufacturer } = useAuth();

  return (
    <footer className="w-full bg-surface-container-high text-on-surface mt-16 border-t border-outline-variant/30">
      {/* Heritage Producer Program Banner - Controlled by Admin allowSellerRegistration Toggle */}
      {(allowSellerRegistration || isAuthorizedToSell) && (
        <div className="bg-[#9b4100] text-white py-10 px-4 sm:px-6 shadow-sm">
          <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-xl text-center md:text-left">
              <span className="font-label-md text-xs bg-white/20 text-white px-3 py-1 rounded-full inline-block mb-2 font-bold tracking-wide">
                Heritage Producer Guild
              </span>
              <h3 className="font-headline-md text-2xl sm:text-3xl font-serif text-white font-bold mb-2">
                Are you a regional pickle maker?
              </h3>
              <p className="font-body-md text-sm sm:text-base text-white/90 leading-relaxed">
                Start selling your handcrafted pickles across India with 0% commission for your first 30 days. We manage temperature-safe regional jar logistics.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
              <Link
                to={isManufacturer ? "/manufacturer" : "/manufacturer/register"}
                className="bg-white text-[#9b4100] font-title-md text-sm sm:text-base px-6 py-3 rounded-full text-center hover:bg-stone-50 font-bold shadow-md active:scale-95 transition-all"
              >
                {isManufacturer ? "Seller Dashboard" : "Register as Artisan Seller"}
              </Link>
              <Link
                to="/about"
                className="bg-transparent border border-white/60 text-white font-title-md text-sm sm:text-base px-6 py-3 rounded-full text-center hover:bg-white/10 active:scale-95 transition-all font-semibold"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Footer Content */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Wangs"
                className="h-9 w-9 object-contain"
              />
              <span className="font-headline-md text-2xl font-serif font-bold text-primary tracking-tight">
                Wangs
              </span>
            </div>

            <p className="font-body-md text-sm text-on-surface-variant max-w-sm leading-relaxed">
              Discover India's deepest culinary heirloom traditions. Unadulterated achars, lonche, uppinakayi, and chutneys sourced directly from verified village kitchens.
            </p>
          </div>

          {/* Column 2: Artisanal Marketplace */}
          <div>
            <h4 className="font-title-md text-base text-on-surface font-bold mb-4">
              Artisanal Marketplace
            </h4>
            <ul className="flex flex-col gap-2.5 font-body-md text-sm text-on-surface-variant">
              {(allowSellerRegistration || isAuthorizedToSell) && (
                <li>
                  <Link
                    to={isManufacturer ? "/manufacturer" : "/manufacturer/register"}
                    className="text-secondary font-semibold hover:text-primary transition-colors"
                  >
                    {isManufacturer ? "Seller Dashboard" : "Sell on Wangs (Artisan Portal)"}
                  </Link>
                </li>
              )}
              <li>
                <Link to="/products" className="hover:text-primary transition-colors">
                  Top Rated Grandmother Recipes
                </Link>
              </li>
              <li>
                <Link to="/brands" className="hover:text-primary transition-colors">
                  Verified Heritage Makers
                </Link>
              </li>
              <li>
                <Link to="/account" className="hover:text-primary transition-colors">
                  Track My Ceramic Delivery
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary transition-colors">
                  Quality &amp; Lab Reports
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Culinary Assurance */}
          <div>
            <h4 className="font-title-md text-base text-on-surface font-bold mb-4">
              Culinary Assurance
            </h4>
            <ul className="flex flex-col gap-2.5 font-body-md text-sm text-on-surface-variant">
              <li>
                <Link to="/shipping" className="hover:text-primary transition-colors">
                  Zero-Leak Jar Transit Guard
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary transition-colors">
                  Earthen Jar Maturation Protocol
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary transition-colors">
                  Zero Synthetic Preservatives
                </Link>
              </li>
              <li>
                <Link to="/refunds" className="hover:text-primary transition-colors">
                  Refunds &amp; Replacement
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-primary transition-colors">
                  Contact Food Curators
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="border-t border-outline-variant/30 mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-body-sm text-xs text-on-surface-variant">
          <p>© {new Date().getFullYear()} Wangs Pickle Marketplace Pvt Ltd. Dedicated to preserving Indian heirloom pickles.</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <span className="opacity-40">•</span>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            <span className="opacity-40">•</span>
            <Link to="/refunds" className="hover:text-primary transition-colors">Shipping &amp; Refunds</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
