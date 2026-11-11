import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, Compass, Heart, User, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function MobileBottomNav({ onOpenCart }) {
  const { itemsCount, isDrawerOpen } = useCart();
  const { user, requireAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Hide bottom nav when cart drawer is active
  if (isDrawerOpen) return null;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#fff8f4]/95 backdrop-blur-md border-t border-[#dec0b3]/40 flex items-center justify-around py-1.5 px-2 shadow-[0_-4px_16px_rgba(30,27,24,0.06)] pb-[calc(env(safe-area-inset-bottom,0px)+8px)] transform-gpu select-none"
    >
      {/* 1. Home */}
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl transition-all duration-200 active:scale-95 ${
            isActive
              ? 'text-[#9b4100] font-bold bg-[#faf2ed]'
              : 'text-[#8a7267] hover:text-[#9b4100]'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Home size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#9b4100]' : 'text-[#8a7267]'} />
            <span className="text-[10px] tracking-tight mt-0.5">Home</span>
          </>
        )}
      </NavLink>

      {/* 2. Explore / All Pickles */}
      <NavLink
        to="/products"
        className={({ isActive }) =>
          `flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl transition-all duration-200 active:scale-95 ${
            isActive
              ? 'text-[#9b4100] font-bold bg-[#faf2ed]'
              : 'text-[#8a7267] hover:text-[#9b4100]'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <Compass size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#9b4100]' : 'text-[#8a7267]'} />
            <span className="text-[10px] tracking-tight mt-0.5">Explore</span>
          </>
        )}
      </NavLink>

      {/* 3. Wishlist / Artisans */}
      <button
        type="button"
        onClick={() => {
          if (!user) {
            requireAuth(() => navigate('/brands'), 'save items to your wishlist');
            return;
          }
          navigate('/brands');
        }}
        className={`flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-95 ${
          location.pathname === '/brands'
            ? 'text-[#9b4100] font-bold bg-[#faf2ed]'
            : 'text-[#8a7267] hover:text-[#9b4100]'
        }`}
      >
        <Heart
          size={20}
          strokeWidth={location.pathname === '/brands' ? 2.5 : 2}
          className={location.pathname === '/brands' ? 'text-[#9b4100] fill-[#9b4100]' : 'text-[#8a7267]'}
        />
        <span className="text-[10px] tracking-tight mt-0.5">Wishlist</span>
      </button>

      {/* 4. Cart Bag (Center Highlight or Primary Action) */}
      <button
        type="button"
        onClick={onOpenCart}
        className="flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl text-[#8a7267] hover:text-[#9b4100] transition-all duration-200 cursor-pointer active:scale-95 relative"
        aria-label={`Shopping Basket with ${itemsCount} items`}
      >
        <div className="relative">
          <ShoppingBag size={20} strokeWidth={2} />
          {itemsCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[17px] h-[17px] px-1 bg-[#9b4100] text-white font-bold text-[9px] leading-tight rounded-full flex items-center justify-center shadow-xs ring-2 ring-[#fff8f4]">
              {itemsCount > 99 ? '99+' : itemsCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight mt-0.5">Basket</span>
      </button>

      {/* 5. Account / Profile */}
      <NavLink
        to={user ? "/account" : "/login"}
        className={({ isActive }) =>
          `flex flex-col items-center justify-center min-w-[56px] py-1 px-1.5 rounded-xl transition-all duration-200 active:scale-95 ${
            isActive
              ? 'text-[#9b4100] font-bold bg-[#faf2ed]'
              : 'text-[#8a7267] hover:text-[#9b4100]'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <User size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? 'text-[#9b4100]' : 'text-[#8a7267]'} />
            <span className="text-[10px] tracking-tight mt-0.5">{user ? 'Account' : 'Sign In'}</span>
          </>
        )}
      </NavLink>
    </nav>
  );
}
