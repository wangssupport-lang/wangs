import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag, Search, User, Menu, X, ChevronDown, Home,
  Shield, ShieldCheck, Store,
  Sparkles, Star, LogOut, Package, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../api';
import { getBrandsFromProducts } from '../utils/brands';

export default function Navbar() {
  const { user, isAdmin, isManufacturer, isAuthorizedToSell, logout } = useAuth();
  const { itemsCount, cart, setIsDrawerOpen } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [searchFocused, setSearchFocused] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [brands, setBrands] = useState([]);

  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    async function loadBrands() {
      try {
        const brandsData = await api.getBrands();
        if (brandsData && brandsData.length > 0) {
          setBrands(brandsData);
        } else {
          const [bestsellers, featured] = await Promise.all([
            api.getBestsellerProducts(),
            api.getFeaturedProducts(),
          ]);
          setBrands(getBrandsFromProducts(bestsellers, featured));
        }
      } catch (err) {
        console.error('Failed to load brands', err);
      }
    }
    loadBrands();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchFocused(false);
    }
  };

  const handleQuickSearch = (term) => {
    setSearchQuery(term);
    setSearchFocused(false);
    navigate(`/products?search=${encodeURIComponent(term)}`);
  };

  const cartTotal = cart?.financial_summary?.total_amount
    ? Math.round(parseFloat(cart.financial_summary.total_amount))
    : 0;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/90 shadow-xs">
      {/* Main Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-[4.75rem] items-center justify-between gap-4">
          {/* Brand Logo & Wordmark */}
          <Link to="/" className="group flex flex-shrink-0 items-center gap-2.5 sm:gap-3.5 select-none">
            <img
              src="/logo.png"
              alt="Wangs"
              className="h-8 w-auto sm:h-9 sm:w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <span className="font-brand font-black text-2xl sm:text-[1.85rem] tracking-[0.14em] leading-none text-forest-950 uppercase group-hover:text-forest-800 transition-colors">
              Wangs
            </span>
          </Link>

          {/* Desktop Search Bar with Auto-Suggestions Popover */}
          <div className="hidden md:flex flex-1 max-w-xl relative mx-4">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search king chilli, bamboo shoot, artisan pickles..."
                className="w-full pl-11 pr-24 py-2.5 bg-stone-100/80 border border-stone-200/90 rounded-full text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-800 focus:bg-white transition-all font-medium"
              />
              <Search size={16} className="absolute left-4 top-3 text-stone-400" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-20 top-3 text-stone-400 hover:text-stone-600"
                >
                  <X size={15} />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 top-1 px-4 py-1.5 bg-forest-900 hover:bg-forest-950 text-white text-xs font-bold rounded-full shadow-xs transition-colors"
              >
                Search
              </button>
            </form>

            {/* Quick Autocomplete Suggestions Dropdown */}
            {searchFocused && (
              <div
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-stone-200 p-4 z-50 space-y-3"
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="flex justify-between items-center text-stone-400 text-[10px] font-bold uppercase tracking-wider">
                  <span>Popular Artisanal Cures</span>
                  <button onClick={() => setSearchFocused(false)} className="text-stone-400 hover:text-stone-600">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'King Chilli (Bhut Jolokia)',
                    'Shredded Chicken Pickle',
                    'Prawn Fusion Pickle',
                    'Bastenga Bamboo Shoot',
                    'Fermented Axone Soya',
                    'Wild Mountain Apple',
                  ].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleQuickSearch(tag)}
                      className="px-3 py-1 bg-stone-100 hover:bg-forest-900 hover:text-white rounded-full text-stone-700 transition-colors text-[11px] font-medium"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Action Icons: Home, Sign In / Account, Cart */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Homepage Link Button */}
            <Link
              to="/"
              className="flex items-center justify-center p-2 sm:px-3 sm:py-2 rounded-xl text-stone-800 hover:bg-stone-100 transition-all border border-stone-200 shadow-2xs active:scale-95"
              aria-label="Home"
              title="Home"
            >
              <Home size={16} className="text-forest-900" />
              <span className="hidden sm:inline text-xs font-bold ml-1.5">Home</span>
            </Link>

            {/* User Account / Sign In */}
            <div className="relative">
              {user ? (
                <div>
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-stone-800 hover:bg-stone-100 transition-colors border border-stone-200"
                  >
                    <div className="w-6 h-6 rounded-full bg-forest-900 text-white flex items-center justify-center font-bold text-[10px]">
                      {(user.first_name || user.username || 'U')[0].toUpperCase()}
                    </div>
                    <span className="hidden sm:inline">{user.first_name || user.username}</span>
                    <ChevronDown size={13} className="text-stone-400" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 text-xs">
                      <div className="px-4 py-2.5 border-b border-stone-100 bg-stone-50">
                        <p className="font-bold text-stone-900">{user.first_name} {user.last_name}</p>
                        <p className="text-stone-500 truncate text-[11px]">{user.email}</p>
                      </div>

                      <Link
                        to="/account"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-stone-700 hover:bg-stone-100 transition-colors font-medium"
                      >
                        <Package size={15} className="text-forest-700" /> My Orders & Addresses
                      </Link>

                      {isManufacturer ? (
                        <Link
                          to="/manufacturer"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-forest-900 font-bold hover:bg-stone-100 transition-colors"
                        >
                          <Store size={15} className="text-forest-700" /> Seller Dashboard
                        </Link>
                      ) : isAuthorizedToSell ? (
                        <Link
                          to="/manufacturer/register"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-forest-900 font-bold hover:bg-stone-100 transition-colors"
                        >
                          <Store size={15} className="text-forest-700" /> Sell with Us
                        </Link>
                      ) : null}

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                          navigate('/');
                        }}
                        className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-stone-600 hover:bg-red-50 hover:text-red-700 border-t border-stone-100 mt-1 transition-colors"
                      >
                        <LogOut size={15} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-800 hover:bg-stone-100 transition-all border border-stone-200 shadow-2xs"
                >
                  <User size={15} className="text-forest-900" />
                  <span className="hidden sm:inline">Sign In</span>
                </Link>
              )}
            </div>

            {/* Shopping Basket Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="group relative px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl bg-forest-900 hover:bg-forest-950 text-white shadow-md flex items-center gap-2 transition-all active:scale-95"
              aria-label={`Shopping Basket with ${itemsCount} items`}
            >
              <div className="relative">
                <ShoppingBag size={18} className="text-cream-100 group-hover:scale-110 transition-transform" />
                {itemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 min-w-[17px] h-[17px] px-1 bg-amber-400 text-forest-950 font-black text-[9px] leading-tight rounded-full flex items-center justify-center border border-forest-950 shadow-xs animate-scale-up">
                    {itemsCount > 99 ? '99+' : itemsCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-xs font-bold tracking-tight">
                Cart {itemsCount > 0 ? `· ₹${cartTotal}` : ''}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar (Directly accessible without drawer) */}
        <div className="md:hidden pb-2.5 pt-0.5">
          <form onSubmit={handleSearch} className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search king chilli, bamboo shoot, artisan pickles..."
              className="w-full pl-9 pr-16 py-2 bg-stone-100/90 border border-stone-200/90 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-forest-800 focus:bg-white shadow-2xs font-medium"
            />
            <Search size={15} className="absolute left-3 top-2.5 text-stone-400" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-12 top-2.5 text-stone-400 hover:text-stone-600 p-0.5"
                aria-label="Clear search query"
              >
                <X size={13} />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1 top-1 px-3 py-1 bg-forest-900 text-white text-[11px] font-bold rounded-lg shadow-2xs active:scale-95 transition-transform"
            >
              Go
            </button>
          </form>
        </div>

        {/* 3. Refined Artisanal Navigation Ribbon (Balanced Storefront Navigation) */}
        <nav className="relative z-10 flex items-center justify-between border-t border-stone-200/70 py-2 sm:py-2.5 text-xs font-medium text-stone-600 gap-3">
          {/* Left: Dietary Filters (Responsive & fluid on mobile) */}
          <div className="w-full lg:w-auto flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
            <Link
              to="/products"
              className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full transition-all whitespace-nowrap text-[11px] sm:text-xs font-semibold ${
                !searchParams.get('dietary_type') && !searchParams.get('category') && !searchParams.get('search')
                  ? 'bg-forest-950 text-white shadow-xs'
                  : 'bg-stone-100/90 text-stone-700 hover:bg-stone-200 hover:text-stone-950'
              }`}
            >
              <span className="sm:hidden">All</span>
              <span className="hidden sm:inline">All Pickles</span>
            </Link>

            <Link
              to="/products?dietary_type=NON_VEG"
              className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full transition-all whitespace-nowrap text-[11px] sm:text-xs font-semibold ${
                searchParams.get('dietary_type') === 'NON_VEG'
                  ? 'bg-forest-950 text-white shadow-xs'
                  : 'bg-stone-100/90 text-stone-700 hover:bg-stone-200 hover:text-stone-950'
              }`}
            >
              Non-Veg
            </Link>

            <Link
              to="/products?dietary_type=VEG"
              className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full transition-all whitespace-nowrap text-[11px] sm:text-xs font-semibold ${
                searchParams.get('dietary_type') === 'VEG'
                  ? 'bg-forest-950 text-white shadow-xs'
                  : 'bg-stone-100/90 text-stone-700 hover:bg-stone-200 hover:text-stone-950'
              }`}
            >
              Veg
            </Link>

            <Link
              to="/products?dietary_type=VEG_MIXED"
              className={`px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-full transition-all whitespace-nowrap text-[11px] sm:text-xs font-semibold ${
                searchParams.get('dietary_type') === 'VEG_MIXED'
                  ? 'bg-forest-950 text-white shadow-xs'
                  : 'bg-stone-100/90 text-stone-700 hover:bg-stone-200 hover:text-stone-950'
              }`}
            >
              <span className="sm:hidden">Veg Mixed</span>
              <span className="hidden sm:inline">Veg mixed with Non-Veg</span>
            </Link>
          </div>

          {/* Right: Quick Curated Storefront Shortcuts (Desktop) */}
          <div className="hidden lg:flex items-center gap-5 text-xs text-stone-600 flex-shrink-0">
            <Link
              to="/brands"
              className="flex items-center gap-1.5 text-stone-700 hover:text-forest-950 transition-colors font-semibold"
            >
              <Store size={13} className="text-amber-600" />
              <span>Artisan Brands</span>
            </Link>

            <Link
              to="/products?bestsellers=true"
              className="flex items-center gap-1.5 text-stone-700 hover:text-forest-950 transition-colors font-semibold"
            >
              <Sparkles size={13} className="text-amber-500" />
              <span>Bestsellers</span>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
