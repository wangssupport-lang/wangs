import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Heart, MapPin, Mail, Phone, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-forest-950 text-stone-300 pt-16 pb-12 border-t border-forest-900 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-forest-900">
          {/* Brand Info */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5 mb-4 group">
              <div className="w-10 h-10 rounded-xl bg-forest-800 text-cream-100 flex items-center justify-center font-serif font-black text-xl border border-forest-700">
                W
              </div>
              <div>
                <span className="font-serif font-bold text-2xl tracking-tight text-white block">
                  Wangs
                </span>
                <span className="text-[10px] tracking-wider text-forest-400 font-semibold uppercase block">
                  wangs.in · Authentic Naga Marketplace
                </span>
              </div>
            </Link>

            <p className="text-sm text-stone-400 leading-relaxed mb-6 max-w-sm">
              Rooted in over 35 years of authentic family pickling tradition in Kohima, Wangs is India’s dedicated multi-vendor marketplace
              bringing heritage Naga smoked meats, GI-tagged King Chillies, and natural forest ferments directly to your dining table.
            </p>

            <div className="flex items-center gap-2 text-xs text-forest-300 bg-forest-900/60 p-3 rounded-lg border border-forest-800/80 max-w-md">
              <ShieldCheck size={18} className="text-emerald-400 flex-shrink-0" />
              <span>
                All sellers are verified food manufacturers holding valid FSSAI food business licensing and hygiene compliance.
              </span>
            </div>
          </div>

          {/* Authentic Specialties */}
          <div>
            <h4 className="font-serif font-bold text-white text-base mb-4 tracking-wide">
              Naga Specialties
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/products?category=pork-pickle" className="hover:text-white transition-colors">
                  Firewood Smoked Pork
                </Link>
              </li>
              <li>
                <Link to="/products?category=chilli-pickle" className="hover:text-white transition-colors">
                  Raja Mircha (King Chilli)
                </Link>
              </li>
              <li>
                <Link to="/products?category=bamboo-shoot-pickle" className="hover:text-white transition-colors">
                  Fermented Bamboo Shoot (Bastenga)
                </Link>
              </li>
              <li>
                <Link to="/products?category=vegetarian-pickles" className="hover:text-white transition-colors">
                  Axone (Fermented Soya) Chutneys
                </Link>
              </li>
              <li>
                <Link to="/products?category=fruit-pickle" className="hover:text-white transition-colors">
                  Wild Naga Apple & Starfruit
                </Link>
              </li>
            </ul>
          </div>

          {/* Marketplace & Sellers */}
          <div>
            <h4 className="font-serif font-bold text-white text-base mb-4 tracking-wide">
              For Producers
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/manufacturer/register" className="hover:text-white transition-colors text-amber-300 font-medium">
                  Apply to Sell on Wangs
                </Link>
              </li>
              <li>
                <Link to="/manufacturer" className="hover:text-white transition-colors">
                  Manufacturer Portal Login
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-white transition-colors">
                  Our Curation & Quality Standards
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Direct Producer Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance */}
          <div>
            <h4 className="font-serif font-bold text-white text-base mb-4 tracking-wide">
              Transparency & Legal
            </h4>
            <ul className="space-y-2 text-xs">
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
                  Shipping & Delivery Policy
                </Link>
              </li>
              <li>
                <Link to="/refunds" className="hover:text-white transition-colors">
                  Returns & Refunds
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact Customer Care
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© {new Date().getFullYear()} Wangs Marketplace (wangs.in). All rights reserved.</p>
          <div className="flex items-center gap-4 text-stone-400">
            <span>Kohima · Dimapur · Mokokchung</span>
            <span>·</span>
            <span>Made with pride in Nagaland, India</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
