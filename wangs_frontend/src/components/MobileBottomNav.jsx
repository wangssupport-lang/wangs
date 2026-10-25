import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Compass, Store, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

export default function MobileBottomNav({ onOpenCart }) {
  const { cart, itemsCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const cartTotal = cart?.financial_summary?.total_amount
    ? Math.round(parseFloat(cart.financial_summary.total_amount))
    : 0;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#faf9f6]/95 backdrop-blur-xl border-t border-stone-200/90 shadow-[0_-8px_25px_rgba(0,0,0,0.08)] pb-[calc(env(safe-area-inset-bottom,0px)+6px)] pt-1.5 px-2"
    >
      <div className="grid grid-cols-5 items-center justify-around max-w-md mx-auto text-center">
        {/* Home */}
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              isActive
                ? 'text-forest-900 font-bold scale-105'
                : 'text-stone-500 hover:text-stone-900 font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1 rounded-full ${isActive ? 'bg-forest-100 text-forest-900' : ''}`}>
                <Home size={19} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Home</span>
            </>
          )}
        </NavLink>

        {/* Explore / Catalog */}
        <NavLink
          to="/products"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              isActive
                ? 'text-forest-900 font-bold scale-105'
                : 'text-stone-500 hover:text-stone-900 font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1 rounded-full ${isActive ? 'bg-forest-100 text-forest-900' : ''}`}>
                <Compass size={19} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Explore</span>
            </>
          )}
        </NavLink>

        {/* Brands Spotlight */}
        <NavLink
          to="/brands"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              isActive
                ? 'text-forest-900 font-bold scale-105'
                : 'text-stone-500 hover:text-stone-900 font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1 rounded-full ${isActive ? 'bg-forest-100 text-forest-900' : ''}`}>
                <Store size={19} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Brands</span>
            </>
          )}
        </NavLink>

        {/* Shopping Basket */}
        <button
          type="button"
          onClick={onOpenCart}
          className="relative flex flex-col items-center justify-center py-1 rounded-xl transition-all text-stone-500 hover:text-stone-900 font-medium active:scale-95"
          aria-label="Shopping Cart"
        >
          <div className="relative p-1 rounded-full text-forest-900">
            <ShoppingBag size={20} strokeWidth={2.2} />
          </div>
          <span className="text-[10px] tracking-tight mt-0.5 font-bold text-forest-900">
            Cart
          </span>
        </button>

        {/* Account / Sign In */}
        <NavLink
          to={user ? '/account' : '/login'}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
              isActive
                ? 'text-forest-900 font-bold scale-105'
                : 'text-stone-500 hover:text-stone-900 font-medium'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`p-1 rounded-full ${isActive ? 'bg-forest-100 text-forest-900' : ''}`}>
                {user ? (
                  <div className="w-5 h-5 rounded-full bg-forest-900 text-white text-[10px] font-bold flex items-center justify-center">
                    {(user.first_name || user.username || 'U')[0].toUpperCase()}
                  </div>
                ) : (
                  <User size={19} strokeWidth={isActive ? 2.5 : 2} />
                )}
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">
                {user ? 'Account' : 'Sign In'}
              </span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
