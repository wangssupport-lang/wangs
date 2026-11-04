import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag, Search, User, Menu, X, ChevronDown, Home,
  Shield, ShieldCheck, Store,
  Sparkles, Star, LogOut, Package, ArrowRight, Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../api';
import { getBrandsFromProducts } from '../utils/brands';

export default function Navbar() {
  const { user, isAdmin, isManufacturer, isAuthorizedToSell, logout } = useAuth();
  const { itemsCount, cart, setIsDrawerOpen } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [searchFocused, setSearchFocused] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const [brands, setBrands] = useState([]);

  // Auto-close open menus on page change
  useEffect(() => {
    setMobileProfileOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  // Detect whether this client/device has a registered seller account
  const [isRegisteredSellerDevice, setIsRegisteredSellerDevice] = useState(() => {
    try {
      return localStorage.getItem('wangs_is_registered_seller') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleStatusChange = () => {
      try {
        setIsRegisteredSellerDevice(localStorage.getItem('wangs_is_registered_seller') === 'true');
      } catch {
        setIsRegisteredSellerDevice(false);
      }
    };
    window.addEventListener('wangs_seller_status_changed', handleStatusChange);
    window.addEventListener('storage', handleStatusChange);
    return () => {
      window.removeEventListener('wangs_seller_status_changed', handleStatusChange);
      window.removeEventListener('storage', handleStatusChange);
    };
  }, []);

  const isRegisteredSellerUser = Boolean(
    user && (
      isManufacturer ||
      isAuthorizedToSell ||
      user?.can_sell ||
      user?.role === 'MANUFACTURER' ||
      user?.role === 'ADMIN'
    )
  );

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
    <header className="sticky top-0 z-40 bg-[#0B2417]/95 backdrop-blur-xl border-b border-white/10 shadow-[0_1px_8px_rgba(0,0,0,0.06)] text-white">
      {/* Main Header Row */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 sm:h-20 items-center justify-between gap-4">
          {/* Brand Logo & Wordmark */}
          <Link to="/" className="group flex flex-shrink-0 items-center gap-2.5 sm:gap-3.5 select-none">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-white/10 p-0.5 flex items-center justify-center ring-1 ring-white/20">
              <img
                src="/logo.png"
                alt="Wangs"
                className="w-full h-full rounded-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-2xl sm:text-[1.85rem] tracking-tight leading-none text-white group-hover:text-amber-300 transition-colors">
                Wangs
              </span>
              <span className="font-sans text-[10px] font-bold tracking-widest text-[#F59E0B] uppercase">
                Artisanal Cures
              </span>
            </div>
          </Link>

          {/* Desktop Search Bar with Auto-Suggestions Popover */}
          <div className="hidden md:flex flex-1 max-w-md relative mx-4">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search king chilli, bamboo shoot, artisan pickles..."
                className="w-full pl-10 pr-24 py-2 bg-white/10 border border-white/15 rounded-full text-xs text-white placeholder:text-stone-300 focus:outline-none focus:ring-1 focus:ring-[#F59E0B] focus:border-[#F59E0B] focus:bg-white/15 transition-all font-medium"
              />
              <Search size={16} className="absolute left-3.5 top-2.5 text-stone-300" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-20 top-2.5 text-stone-300 hover:text-white"
                >
                  <X size={15} />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1 top-1 px-3.5 py-1 bg-[#F59E0B] hover:bg-[#d97706] text-[#1C1917] text-xs font-bold rounded-full shadow-xs transition-colors"
              >
                Search
              </button>
            </form>

            {/* Quick Autocomplete Suggestions Dropdown */}
            {searchFocused && (
              <div
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-stone-200 p-4 z-50 space-y-3 text-stone-900"
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
                      className="px-3 py-1 bg-stone-100 hover:bg-[#0B2417] hover:text-white rounded-full text-stone-700 transition-colors text-[11px] font-medium"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Actions: Circular Profile Logo & Circular Cart */}
            <div className="flex md:hidden items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMobileProfileOpen(!mobileProfileOpen)}
                  className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:text-amber-300 active:scale-95 transition-all"
                  aria-label="User Profile"
                  title={user ? `${user.first_name || user.username}` : 'Profile & Account'}
                >
                  <User size={18} className="text-white" />
                </button>

                {/* Mobile Profile Dropdown (User Info, Track Item, Logout) */}
                {mobileProfileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40 bg-black/30"
                      onClick={() => setMobileProfileOpen(false)}
                    />
                    <div className="absolute right-0 top-11 w-64 bg-white rounded-2xl shadow-2xl border border-stone-200 z-50 overflow-hidden text-xs text-stone-900 animate-in fade-in zoom-in-95">
                      {/* User Info */}
                      {user ? (
                        <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#0B2417] text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {(user.first_name || user.username || 'U')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-stone-900 truncate">
                              {user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user.username}
                            </p>
                            <p className="text-stone-500 truncate text-[11px]">{user.email}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 space-y-2">
                          <p className="font-bold text-stone-900">Welcome to Wangs</p>
                          <p className="text-[11px] text-stone-500">Sign in to track orders and save your address</p>
                          <Link
                            to="/login"
                            onClick={() => setMobileProfileOpen(false)}
                            className="block text-center w-full py-2 bg-[#0B2417] hover:bg-black text-white font-bold rounded-xl text-xs shadow-2xs"
                          >
                            Sign In / Register
                          </Link>
                        </div>
                      )}

                      {/* Track Item & Orders */}
                      <Link
                        to="/account"
                        onClick={() => setMobileProfileOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-stone-800 hover:bg-stone-50 transition-colors font-medium border-b border-stone-100"
                      >
                        <Package size={16} className="text-[#0B2417] shrink-0" />
                        <div className="min-w-0">
                          <p className="font-semibold text-stone-900">Track Item & Orders</p>
                          <p className="text-[10px] text-stone-500">Live order shipment status</p>
                        </div>
                      </Link>

                      {/* Seller space if registered */}
                      {isManufacturer ? (
                        <Link
                          to="/manufacturer"
                          onClick={() => setMobileProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-forest-900 font-bold hover:bg-stone-50 transition-colors border-b border-stone-100"
                        >
                          <Store size={15} className="text-forest-700 shrink-0" />
                          <span>Seller Dashboard</span>
                        </Link>
                      ) : null}

                      {/* Logout */}
                      {user && (
                        <button
                          type="button"
                          onClick={() => {
                            setMobileProfileOpen(false);
                            logout();
                            navigate('/');
                          }}
                          className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors font-semibold"
                        >
                          <LogOut size={15} className="shrink-0" />
                          <span>Sign Out</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => setIsDrawerOpen(true)}
                className="relative w-9 h-9 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center shadow-xs active:scale-95 transition-transform"
                aria-label={`Shopping Basket with ${itemsCount} items`}
              >
                <ShoppingBag size={17} className="text-white" />
                {itemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-[#F59E0B] text-[#1C1917] font-bold text-[10px] leading-tight rounded-full flex items-center justify-center shadow-xs">
                    {itemsCount > 99 ? '99+' : itemsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2 sm:gap-2.5">
              {/* Homepage Link Button */}
              <Link
                to="/"
                className="flex items-center justify-center p-2 sm:px-3 sm:py-2 rounded-full text-stone-200 hover:text-white hover:bg-white/10 transition-all border border-white/15 shadow-2xs active:scale-95 text-xs font-semibold"
                aria-label="Home"
                title="Home"
              >
                <Home size={15} className="text-[#F59E0B]" />
                <span className="hidden sm:inline ml-1.5 font-bold">Home</span>
              </Link>

              {/* User Account / Sign In */}
              <div className="flex items-center gap-2">
                {/* Direct Seller Space button for logged-in registered sellers */}
                {isRegisteredSellerUser && (
                  <Link
                    to="/manufacturer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-stone-200 hover:text-white hover:bg-white/10 transition-all border border-white/15 shadow-2xs"
                    title="Artisan Seller Space"
                  >
                    <Store size={14} className="text-[#F59E0B]" />
                    <span>Seller Space</span>
                  </Link>
                )}

                {user ? (
                  <div className="relative">
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold text-white hover:bg-white/10 transition-colors border border-white/15"
                    >
                      <div className="w-6 h-6 rounded-full bg-[#F59E0B] text-[#1C1917] flex items-center justify-center font-bold text-[10px]">
                        {(user.first_name || user.username || 'U')[0].toUpperCase()}
                      </div>
                      <span className="hidden sm:inline">{user.first_name || user.username}</span>
                      <ChevronDown size={13} className="text-stone-300" />
                    </button>

                    {userDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 text-xs text-stone-900">
                        <div className="px-4 py-2.5 border-b border-stone-100 bg-stone-50">
                          <p className="font-bold text-stone-900">{user.first_name} {user.last_name}</p>
                          <p className="text-stone-500 truncate text-[11px]">{user.email}</p>
                        </div>

                        <Link
                          to="/account"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-stone-700 hover:bg-stone-100 transition-colors font-medium"
                        >
                          <Package size={15} className="text-[#0B2417]" /> My Orders & Addresses
                        </Link>

                        {isManufacturer ? (
                          <Link
                            to="/manufacturer"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-[#0B2417] font-bold hover:bg-stone-100 transition-colors"
                          >
                            <Store size={15} className="text-[#0B2417]" /> Seller Dashboard
                          </Link>
                        ) : isAuthorizedToSell ? (
                          <Link
                            to="/manufacturer/register"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-[#0B2417] font-bold hover:bg-stone-100 transition-colors"
                          >
                            <Store size={15} className="text-[#0B2417]" /> Sell with Us
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
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Keep this button to sellers only who have registered else don't */}
                    {isRegisteredSellerDevice && (
                      <Link
                        to="/manufacturer/login"
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold text-stone-200 hover:text-white hover:bg-white/10 transition-all border border-white/15 shadow-2xs"
                        title="Artisan Seller Portal & Login"
                      >
                        <Store size={14} className="text-[#F59E0B]" />
                        <span>Seller Login</span>
                      </Link>
                    )}
                    <Link
                      to="/login"
                      className="flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold text-white hover:bg-white/10 transition-all border border-white/15 shadow-2xs"
                    >
                      <User size={15} className="text-[#F59E0B]" />
                      <span className="hidden sm:inline">Sign In</span>
                    </Link>
                  </div>
                )}
              </div>

              {/* Desktop Shopping Basket Button */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="group relative px-4 py-2 rounded-full bg-[#F59E0B] hover:bg-[#d97706] text-[#1C1917] shadow-md flex items-center gap-2 transition-all active:scale-95"
                aria-label={`Shopping Basket with ${itemsCount} items`}
              >
                <div className="relative">
                  <ShoppingBag size={17} className="text-[#1C1917]" />
                  {itemsCount > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 bg-[#0B2417] text-white font-bold text-[9px] leading-tight rounded-full flex items-center justify-center border border-white/40 shadow-xs">
                      {itemsCount > 99 ? '99+' : itemsCount}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline text-xs font-bold tracking-tight">
                  Cart
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Refined Artisanal Navigation Ribbon */}
        <nav className={`relative z-10 items-center justify-between border-t border-white/10 py-2 sm:py-2.5 text-xs font-medium text-stone-300 gap-3 ${location.pathname === '/' ? 'hidden md:flex' : 'flex'}`}>
          {/* Left: Dietary Filters */}
          <div className="w-full lg:w-auto flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
            <Link
              to="/products"
              className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full transition-all whitespace-nowrap text-[11px] sm:text-xs font-semibold ${
                !searchParams.get('dietary_type') && !searchParams.get('category') && !searchParams.get('search')
                  ? 'bg-[#F59E0B] text-[#1C1917] font-bold shadow-xs'
                  : 'bg-white/10 text-stone-200 hover:bg-white/20 hover:text-white'
              }`}
            >
              <span>All Pickles</span>
            </Link>

            <Link
              to="/products?dietary_type=NON_VEG"
              className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full transition-all whitespace-nowrap text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 ${
                searchParams.get('dietary_type') === 'NON_VEG'
                  ? 'bg-[#F59E0B] text-[#1C1917] font-bold shadow-xs'
                  : 'bg-white/10 text-stone-200 hover:bg-white/20 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span>Non-Veg</span>
            </Link>

            <Link
              to="/products?dietary_type=VEG"
              className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full transition-all whitespace-nowrap text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 ${
                searchParams.get('dietary_type') === 'VEG'
                  ? 'bg-[#F59E0B] text-[#1C1917] font-bold shadow-xs'
                  : 'bg-white/10 text-stone-200 hover:bg-white/20 hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Veg</span>
            </Link>

            <Link
              to="/products?dietary_type=VEG_MIXED"
              className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full transition-all whitespace-nowrap text-[11px] sm:text-xs font-semibold ${
                searchParams.get('dietary_type') === 'VEG_MIXED'
                  ? 'bg-[#F59E0B] text-[#1C1917] font-bold shadow-xs'
                  : 'bg-white/10 text-stone-200 hover:bg-white/20 hover:text-white'
              }`}
            >
              <span>Veg + Non-Veg</span>
            </Link>
          </div>

          {/* Right: Quick Curated Storefront Shortcuts (Desktop) */}
          <div className="hidden lg:flex items-center gap-5 text-xs text-stone-300 flex-shrink-0">
            <Link
              to="/brands"
              className="flex items-center gap-1.5 text-stone-200 hover:text-[#F59E0B] transition-colors font-semibold"
            >
              <Store size={13} className="text-[#F59E0B]" />
              <span>Artisan Brands</span>
            </Link>

            <Link
              to="/products?bestsellers=true"
              className="flex items-center gap-1.5 text-stone-200 hover:text-[#F59E0B] transition-colors font-semibold"
            >
              <Sparkles size={13} className="text-[#F59E0B]" />
              <span>⭐ Bestsellers</span>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
