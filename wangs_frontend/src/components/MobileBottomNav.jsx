import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface border-t border-outline-variant/30 flex items-center justify-around py-2 px-2 text-on-surface-variant font-label-sm shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[calc(env(safe-area-inset-bottom,0px)+6px)] transform-gpu backface-hidden"
    >
      {/* 1. Home */}
      <NavLink
        to="/"
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 transition-colors ${
            isActive ? 'text-primary font-bold' : 'hover:text-primary'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              home
            </span>
            <span className="text-[10px] tracking-tight">Home</span>
          </>
        )}
      </NavLink>

      {/* 2. Explore */}
      <NavLink
        to="/products"
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 transition-colors ${
            isActive ? 'text-primary font-bold' : 'hover:text-primary'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              explore
            </span>
            <span className="text-[10px] tracking-tight">Explore</span>
          </>
        )}
      </NavLink>

      {/* 3. Wishlist */}
      <button
        type="button"
        onClick={() => {
          if (!user) {
            requireAuth(() => navigate('/brands'), 'save items to your wishlist');
            return;
          }
          navigate('/brands');
        }}
        className={`flex flex-col items-center gap-0.5 transition-colors cursor-pointer ${
          location.pathname === '/brands' ? 'text-primary font-bold' : 'hover:text-primary'
        }`}
      >
        <span
          className="material-symbols-outlined text-[22px]"
          style={{ fontVariationSettings: location.pathname === '/brands' ? "'FILL' 1" : "'FILL' 0" }}
        >
          favorite
        </span>
        <span className="text-[10px] tracking-tight">Wishlist</span>
      </button>

      {/* 4. Account / Profile */}
      <NavLink
        to={user ? "/account" : "/login"}
        className={({ isActive }) =>
          `flex flex-col items-center gap-0.5 transition-colors ${
            isActive ? 'text-primary font-bold' : 'hover:text-primary'
          }`
        }
      >
        {({ isActive }) => (
          <>
            <span
              className="material-symbols-outlined text-[22px]"
              style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
            >
              person
            </span>
            <span className="text-[10px] tracking-tight">Account</span>
          </>
        )}
      </NavLink>

      {/* 5. Cart Bag */}
      <button
        type="button"
        onClick={onOpenCart}
        className="flex flex-col items-center gap-0.5 hover:text-primary transition-colors relative"
        aria-label={`Jar bag with ${itemsCount} items`}
      >
        <div className="relative">
          <span className="material-symbols-outlined text-[22px]">shopping_bag</span>
          {itemsCount > 0 && (
            <span className="absolute -top-1 -right-2 min-w-[17px] h-[17px] px-1 bg-primary text-on-primary font-bold text-[9px] leading-tight rounded-full flex items-center justify-center shadow-xs">
              {itemsCount > 99 ? '99+' : itemsCount}
            </span>
          )}
        </div>
        <span className="text-[10px] tracking-tight">Cart</span>
      </button>
    </nav>
  );
}
