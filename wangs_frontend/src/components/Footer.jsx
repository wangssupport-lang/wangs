import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Footer() {
  const { isAuthorizedToSell, isManufacturer, allowSellerRegistration } = useAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email && email.includes('@')) {
      setSubscribed(true);
      toast.success('Welcome to The Spice Heritage Club! Check your inbox for private batch invitations.');
      setEmail('');
    } else {
      toast.error('Please enter a valid email address');
    }
  };

  return (
    <footer className="w-full bg-surface-container-high text-on-surface mt-16 border-t border-outline-variant/30">
      {/* Heritage Producer Program Banner */}
      <div className="bg-primary-container text-on-primary-container py-10 px-4 sm:px-6">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-xl text-center md:text-left">
            <span className="font-label-md text-xs bg-surface/20 text-white px-3 py-1 rounded-full inline-block mb-2 font-bold tracking-wide">
              Heritage Producer Guild
            </span>
            <h3 className="font-headline-md text-2xl sm:text-3xl font-serif text-white mb-2">
              Are you a regional pickle maker?
            </h3>
            <p className="font-body-md text-sm sm:text-base text-white/90 leading-relaxed">
              Start selling your handcrafted pickles across India with 0% commission for your first 30 days. We manage temperature-safe regional jar logistics.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0 w-full sm:w-auto">
            <Link
              to="/manufacturer/register"
              className="bg-surface text-primary font-title-md text-sm sm:text-base px-6 py-3 rounded-full text-center hover:bg-surface-bright font-bold shadow-md active:scale-95 transition-all"
            >
              Register as Artisan Seller
            </Link>
            <Link
              to="/about"
              className="bg-transparent border border-white/40 text-white font-title-md text-sm sm:text-base px-6 py-3 rounded-full text-center hover:bg-white/10 active:scale-95 transition-all font-semibold"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand & Newsletter Column */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-serif font-black text-lg">
                W
              </span>
              <span className="font-headline-md text-2xl font-serif font-bold text-primary tracking-tight">
                Wangs
              </span>
            </div>

            <p className="font-body-md text-sm text-on-surface-variant max-w-sm leading-relaxed">
              Discover India's deepest culinary heirloom traditions. Unadulterated achars, lonche, uppinakayi, and chutneys sourced directly from verified village kitchens.
            </p>

            {/* Newsletter Subscription */}
            <div className="flex flex-col gap-2 max-w-md pt-2">
              <span className="font-label-md text-xs sm:text-sm text-on-surface font-bold uppercase tracking-wider">
                Join The Spice Heritage Club
              </span>
              <form onSubmit={handleSubscribe} className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full bg-surface-container-lowest px-4 py-2.5 rounded-xl font-body-sm text-sm text-on-surface placeholder:text-outline border border-outline-variant/40 focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="bg-primary text-on-primary font-label-md text-sm px-5 py-2.5 rounded-xl hover:bg-primary-container font-bold transition-colors shrink-0 shadow-sm active:scale-95"
                >
                  {subscribed ? 'Joined!' : 'Subscribe'}
                </button>
              </form>
              <span className="font-body-sm text-xs text-outline">
                Weekly stories of grandmothers, spices & private batch tastings.
              </span>
            </div>
          </div>

          {/* Column 1: Regional Terroirs */}
          <div>
            <h4 className="font-title-md text-base text-on-surface font-bold mb-4">
              Regional Terroirs
            </h4>
            <ul className="flex flex-col gap-2.5 font-body-md text-sm text-on-surface-variant">
              <li>
                <Link to="/products?search=andhra" className="hover:text-primary transition-colors">
                  Andhra Pradesh (Guntur Chillies)
                </Link>
              </li>
              <li>
                <Link to="/products?search=banarasi" className="hover:text-primary transition-colors">
                  Varanasi & Awadh Achar
                </Link>
              </li>
              <li>
                <Link to="/products?search=rajasthan" className="hover:text-primary transition-colors">
                  Marwari Ker Sangri & Gunda
                </Link>
              </li>
              <li>
                <Link to="/products?search=kerala" className="hover:text-primary transition-colors">
                  Coastal Malabar Fish & Prawns
                </Link>
              </li>
              <li>
                <Link to="/products?search=bamboo" className="hover:text-primary transition-colors">
                  Northeast Bhut Jolokia & Bamboo
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Artisanal Marketplace */}
          <div>
            <h4 className="font-title-md text-base text-on-surface font-bold mb-4">
              Artisanal Marketplace
            </h4>
            <ul className="flex flex-col gap-2.5 font-body-md text-sm text-on-surface-variant">
              <li>
                <Link to="/manufacturer/register" className="text-secondary font-semibold hover:text-primary transition-colors">
                  Sell on Wangs (Artisan Portal)
                </Link>
              </li>
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
                <Link to="/account/orders" className="hover:text-primary transition-colors">
                  Track My Ceramic Delivery
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary transition-colors">
                  Quality & Lab Reports
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
                  Refunds & Replacement
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
            <span className="font-semibold text-secondary">FSSAI Lic: 10023999000122</span>
            <span className="opacity-40">•</span>
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <span className="opacity-40">•</span>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            <span className="opacity-40">•</span>
            <Link to="/refunds" className="hover:text-primary transition-colors">Shipping & Refunds</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
