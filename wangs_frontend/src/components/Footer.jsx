import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { allowSellerRegistration, isManufacturer } = useAuth();

  return (
    <footer className="w-full bg-[#1c1917] text-stone-300 py-6 sm:py-8 mt-16 sm:mt-24 border-t border-stone-800 text-xs font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-stone-400">
          <span className="font-serif font-bold text-stone-200">© Wangs</span>
          <span>·</span>
          <span className="text-stone-300">wangs.in</span>
          <span>·</span>
          <span className="text-amber-400/90 font-medium">FSSAI Lic. #10023064000124</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-stone-400 text-xs">
          <Link to="/shipping" className="hover:text-stone-100 transition-colors">
            Shipping
          </Link>
          <span>·</span>
          <Link to="/refunds" className="hover:text-stone-100 transition-colors">
            Returns
          </Link>
          <span>·</span>
          <Link to="/privacy" className="hover:text-stone-100 transition-colors">
            Privacy
          </Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-stone-100 transition-colors">
            Terms
          </Link>
          <span>·</span>
          <Link to="/contact" className="hover:text-stone-100 transition-colors">
            Contact
          </Link>
          {(isManufacturer || allowSellerRegistration) && (
            <>
              <span>·</span>
              <Link
                to={isManufacturer ? "/manufacturer" : "/manufacturer/register"}
                className="text-[#f6df9d] hover:underline font-medium"
              >
                {isManufacturer ? "Seller Studio" : "Sell on Wangs"}
              </Link>
            </>
          )}
        </div>
      </div>
    </footer>
  );
}
