import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Compass, Store, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function MobileBottomNav({ onOpenCart }) {
  const { cart, itemsCount, isDrawerOpen } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Hide bottom nav when full-screen cart drawer or modal is open to prevent overlapping
  if (isDrawerOpen) return null;

  const cartTotal = cart?.financial_summary?.total_amount
    ? Math.round(parseFloat(cart.financial_summary.total_amount))
    : 0;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#151312]/94 backdrop-blur-2xl border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] pb-[calc(env(safe-area-inset-bottom,0px)+6px)] pt-1.5 px-2 text-stone-300"
    >
      <div className="grid grid-cols-5 items-center justify-around max-w-md mx-auto text-center">
        {/* Home */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 transition-all group ${
              isActive ? 'text-white font-bold' : 'text-stone-400 hover:text-stone-200 font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`flex items-center justify-center transition-all ${
                isActive ? 'px-3.5 py-1 rounded-full bg-white/[0.12] text-white border border-white/20 shadow-[0_0_14px_rgba(220,68,55,0.35)]' : 'p-1 text-stone-400'
              }`}>
                <Home size={18} strokeWidth={isActive ? 2.4 : 1.9} />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-bold text-white' : 'text-stone-400'}`}>
                Home
              </span>
            </>
          )}
        </NavLink>

        {/* Explore / Catalog */}
        <NavLink
          to="/products"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 transition-all group ${
              isActive ? 'text-white font-bold' : 'text-stone-400 hover:text-stone-200 font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`flex items-center justify-center transition-all ${
                isActive ? 'px-3.5 py-1 rounded-full bg-white/[0.12] text-white border border-white/20 shadow-[0_0_14px_rgba(220,68,55,0.35)]' : 'p-1 text-stone-400'
              }`}>
                <Compass size={18} strokeWidth={isActive ? 2.4 : 1.9} />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-bold text-white' : 'text-stone-400'}`}>
                Explore
              </span>
            </>
          )}
        </NavLink>

        {/* Brands Spotlight */}
        <NavLink
          to="/brands"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center py-1 transition-all group ${
              isActive ? 'text-white font-bold' : 'text-stone-400 hover:text-stone-200 font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`flex items-center justify-center transition-all ${
                isActive ? 'px-3.5 py-1 rounded-full bg-white/[0.12] text-white border border-white/20 shadow-[0_0_14px_rgba(220,68,55,0.35)]' : 'p-1 text-stone-400'
              }`}>
                <Store size={18} strokeWidth={isActive ? 2.4 : 1.9} />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-bold text-white' : 'text-stone-400'}`}>
                Brands
              </span>
            </>
          )}
        </NavLink>

        {/* Shopping Basket */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative flex flex-col items-center justify-center py-1 transition-all text-stone-400 hover:text-white font-medium active:scale-95 group"
          aria-label={`Shopping Cart with ${itemsCount} items`}
        >
          <div className="relative p-1 text-stone-400 group-hover:text-white flex items-center justify-center">
            <ShoppingBag size={18} strokeWidth={1.9} />
            {itemsCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[17px] h-[17px] px-1 bg-[#85191e] text-white font-black text-[9px] leading-tight rounded-full flex items-center justify-center shadow-xs border border-[#151312]">
                {itemsCount > 99 ? '99+' : itemsCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-medium text-stone-400 group-hover:text-white">
            Cart
          </span>
        </button>

        {/* Account / Sign In */}
        <NavLink
          to={user ? '/account' : '/login'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 transition-all group ${
              isActive ? 'text-white font-bold' : 'text-stone-400 hover:text-stone-200 font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`flex items-center justify-center transition-all ${
                isActive ? 'px-3.5 py-1 rounded-full bg-white/[0.12] text-white border border-white/20 shadow-[0_0_14px_rgba(220,68,55,0.35)]' : 'p-1 text-stone-400'
              }`}>
                <User size={18} strokeWidth={isActive ? 2.4 : 1.9} />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-bold text-white' : 'text-stone-400'}`}>
                {user ? 'Account' : 'Sign In'}
              </span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
