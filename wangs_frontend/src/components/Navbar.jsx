import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag, Search, User, Menu, X, ChevronDown, Home,
  Shield, ShieldCheck, Store,
  Sparkles, Star, LogOut, Package, ArrowRight, Heart, Leaf, Truck, Utensils
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [brands, setBrands] = useState([]);

  // Auto-close open menus on page change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
    setSearchOpen(false);
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
      setSearchOpen(false);
    }
  };

  const handleQuickSearch = (term) => {
    setSearchQuery(term);
    setSearchOpen(false);
    navigate(`/products?search=${encodeURIComponent(term)}`);
  };

  return (
    <header className="sticky top-0 z-40 bg-surface shadow-xs">
      {/* 1. Top Announcement Ribbon - Desktop Only */}
      <div className="hidden md:block bg-primary text-on-primary border-b border-primary-container text-[11px] font-medium py-1.5 px-4 select-none">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between font-label-md text-label-md">
          <div className="flex items-center gap-2">
            <Truck size={14} className="text-primary-fixed" />
            <span>Complimentary Artisan Delivery on Sun-Cured Heritage Pickles above ₹499 Across India</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-primary-fixed">
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} /> FSSAI Certified Purity
            </span>
            <span className="opacity-40">|</span>
            <span className="flex items-center gap-1">
              <Sparkles size={13} /> 100% Sun-Matured Batches
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Bar - Stitch Heritage Solid Warm Surface (#fff8f4) */}
      <div className="bg-surface border-b border-outline-variant/30 text-on-surface">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8">
          {/* Mobile Top Header (Exact Match to Stitch Screen 0d46c0ef01b74bf9a068fe978dfcc07f / Image 1) */}
          <div className="md:hidden flex flex-col gap-2.5 pt-2.5 pb-2">
            {/* Mobile Row 1: Logo & Title + Location + Bell + Avatar */}
            <div className="flex items-center justify-between gap-1.5">
              {/* Brand Logo & Wordmark */}
              <Link to="/" className="flex items-center gap-2 shrink-0">
                <img
                  src="/logo.png"
                  alt="Wangs Pickle Marketplace Logo"
                  className="h-8 w-8 object-contain"
                />
                <div className="flex flex-col">
                  <span className="font-title-lg text-lg font-bold text-primary leading-none tracking-tight">
                    Wangs
                  </span>
                  <span className="font-label-sm text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold">
                    Pickle Bazaar
                  </span>
                </div>
              </Link>

              {/* Right Controls: Delivery Location Pill + Notifications + Profile Avatar */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Delivery Location Pill */}
                <button
                  type="button"
                  aria-label="Delivery Location"
                  className="h-9 px-2.5 rounded-full bg-surface-container-low hover:bg-surface-container flex items-center gap-1 text-on-surface-variant transition-colors border border-outline-variant/30 text-left"
                >
                  <span className="material-symbols-outlined text-primary text-[16px]">location_on</span>
                  <div className="flex flex-col text-left leading-tight">
                    <span className="font-label-sm text-[8px] text-outline leading-tight font-medium">Deliver to</span>
                    <span className="font-label-md text-[11px] font-bold text-on-surface truncate max-w-[85px] leading-tight">
                      Bangalore 560...
                    </span>
                  </div>
                  <ChevronDown size={12} className="text-outline shrink-0 ml-0.5" />
                </button>

                {/* Notifications Bell with unread dot */}
                <Link
                  to="/account"
                  aria-label="Notifications"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary relative hover:bg-surface-container-low transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">notifications</span>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
                </Link>

                {/* Profile Avatar / Cart Link */}
                <Link
                  to={user ? '/account' : '/login'}
                  className="w-8 h-8 rounded-full ring-2 ring-primary-fixed shadow-xs overflow-hidden flex items-center justify-center bg-secondary-fixed text-on-secondary-fixed font-bold text-xs"
                >
                  {user ? (
                    (user.first_name || user.username || 'U')[0].toUpperCase()
                  ) : (
                    <img
                      src="/images/stitch/stitch_27_20e177a3d5.jpg"
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                </Link>
              </div>
            </div>

            {/* Mobile Row 2: Search Input */}
            <form onSubmit={handleSearch} className="relative w-full flex items-center bg-surface-container-lowest rounded-full px-3.5 py-1.5 shadow-[0_2px_10px_rgba(30,27,24,0.04)] border border-outline-variant/30 focus-within:shadow-[0_0_0_1.5px_#9b4100]">
              <Search size={16} className="text-outline mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artisan achars, regional makers..."
                className="w-full bg-transparent text-xs text-on-surface placeholder:text-outline focus:outline-none py-0.5"
              />
              <button
                type="button"
                aria-label="Voice Search"
                className="w-7 h-7 flex items-center justify-center text-outline hover:text-primary transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">mic</span>
              </button>
            </form>

            {/* Mobile Row 3: Category Pills Strip */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
              <Link
                to="/products"
                className="h-7 px-3 rounded-full bg-primary text-on-primary font-label-sm text-[11px] font-bold whitespace-nowrap shadow-[0_2px_6px_rgba(155,65,0,0.25)] flex items-center shrink-0"
              >
                All Pickles
              </Link>
              <Link
                to="/products?category=andhra-gongura"
                className="h-7 px-3 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-[11px] font-semibold whitespace-nowrap border border-outline-variant/20 flex items-center shrink-0"
              >
                Andhra Avakaya
              </Link>
              <Link
                to="/products?category=north-mustard"
                className="h-7 px-3 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-[11px] font-semibold whitespace-nowrap border border-outline-variant/20 flex items-center shrink-0"
              >
                North Mustard
              </Link>
              <Link
                to="/products?category=sweet-chutneys"
                className="h-7 px-3 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-[11px] font-semibold whitespace-nowrap border border-outline-variant/20 flex items-center shrink-0"
              >
                Sweet Chutneys
              </Link>
              <Link
                to="/products?category=zero-oil"
                className="h-7 px-3 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high font-label-sm text-[11px] font-semibold whitespace-nowrap border border-outline-variant/20 flex items-center shrink-0"
              >
                Zero Oil
              </Link>
            </div>
          </div>

          {/* Desktop Navigation Row */}
          <div className="hidden md:flex h-18 sm:h-20 items-center justify-between gap-4">
            {/* Brand Logo & Mountain Wordmark */}
            <div className="flex items-center gap-3 shrink-0">
              <Link to="/" className="group flex flex-shrink-0 items-center gap-2.5 sm:gap-3 select-none">
                <img
                  src="/logo.png"
                  alt="Wangs Pickle Marketplace Logo"
                  className="h-9 w-9 sm:h-10 sm:w-10 object-contain transition-transform duration-200 group-hover:scale-105"
                />
                <span className="font-headline-md font-bold text-2xl sm:text-[1.85rem] tracking-tight leading-none text-primary group-hover:text-primary-container transition-colors">
                  Wangs
                </span>
              </Link>

              {/* Delivery Pin Dropdown (Desktop) */}
              <div className="hidden lg:flex items-center gap-1 pl-3 font-label-md text-label-md text-on-surface-variant cursor-pointer hover:text-primary transition-colors border-l border-outline-variant/30">
                <span className="material-symbols-outlined text-[18px] text-primary">pin_drop</span>
                <span className="font-semibold text-on-surface">Deliver to:</span>
                <span>560001 (Bengaluru)</span>
                <ChevronDown size={14} className="text-outline" />
              </div>
            </div>

            {/* Global Search Bar (Desktop) */}
            <div className="flex-1 max-w-xl hidden md:flex items-center">
              <form onSubmit={handleSearch} className="w-full flex items-center bg-surface-container-low rounded-full px-4 py-2 border border-outline-variant/30 focus-within:bg-surface-container-lowest focus-within:shadow-[0_0_0_1.5px_#9b4100] transition-all">
                <Search size={18} className="text-outline mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 500+ handmade mango, garlic, gongura, lime pickles, or regional makers..."
                  className="w-full bg-transparent font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none"
                />
                <button type="submit" className="font-label-sm text-label-sm font-bold text-primary pl-2 shrink-0 hover:text-primary-container transition-colors">
                  Search
                </button>
              </form>
            </div>

            {/* Right Action Cluster */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Sell on Wangs CTA Button */}
              <Link
                to="/manufacturer/register"
                className="hidden sm:inline-flex items-center gap-1.5 bg-tertiary text-on-tertiary font-label-md text-label-md px-3.5 py-1.5 rounded-full hover:bg-tertiary-container hover:text-on-tertiary-container transition-all shadow-xs"
              >
                <Store size={15} />
                <span>Sell on Wangs</span>
              </Link>

              {/* Wishlist Icon */}
              <Link
                to="/brands"
                className="p-2 rounded-full text-on-surface-variant hover:text-primary transition-colors"
                title="Wishlist"
              >
                <Heart size={21} className="text-on-surface" />
              </Link>

              {/* Shopping Cart Pill Button */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="relative p-2 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                aria-label={`Shopping Basket with ${itemsCount} items`}
                title="Cart"
              >
                <ShoppingBag size={22} className="text-on-surface" />
                {itemsCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 bg-primary text-on-primary font-bold text-[9px] leading-tight rounded-full flex items-center justify-center shadow-xs">
                    {itemsCount > 99 ? '99+' : itemsCount}
                  </span>
                )}
              </button>

              {/* Sign In / User Profile Dropdown */}
              <div className="relative hidden sm:block">
                {user ? (
                  <>
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-surface-container hover:bg-surface-container-high transition-all shadow-xs border border-outline-variant/30 text-on-surface"
                    >
                      <div className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-[10px]">
                        {(user.first_name || user.username || 'U')[0].toUpperCase()}
                      </div>
                      <span className="hidden sm:inline">{user.first_name || user.username}</span>
                      <ChevronDown size={13} className="text-outline" />
                    </button>

                    {userDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/40 py-2 z-50 text-xs text-on-surface">
                        <div className="px-4 py-2.5 border-b border-outline-variant/20 bg-surface-container-low">
                          <p className="font-bold text-on-surface">{user.first_name} {user.last_name}</p>
                          <p className="text-on-surface-variant truncate text-[11px]">{user.email}</p>
                        </div>

                        <Link
                          to="/account"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-on-surface hover:bg-surface-container transition-colors font-medium"
                        >
                          <Package size={15} className="text-primary" /> My Orders &amp; Addresses
                        </Link>

                        {isManufacturer ? (
                          <Link
                            to="/manufacturer"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-secondary font-bold hover:bg-surface-container transition-colors"
                          >
                            <Store size={15} className="text-secondary" /> Seller Dashboard
                          </Link>
                        ) : null}

                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            logout();
                            navigate('/');
                          }}
                          className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-error hover:bg-error-container/40 border-t border-outline-variant/20 mt-1 transition-colors"
                        >
                          <LogOut size={15} /> Sign Out
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 bg-primary hover:bg-primary-container text-on-primary font-bold text-xs rounded-full shadow-xs transition-all active:scale-95"
                  >
                    <User size={14} />
                    <span>Sign In</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Sub-navigation Category Strip (Stitch Warm Low Surface) */}
        <div className="bg-surface-container-low border-t border-outline-variant/20">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 overflow-x-auto no-scrollbar py-2 text-xs font-semibold text-on-surface-variant whitespace-nowrap">
            <Link to="/products" className="hover:text-primary transition-colors py-0.5">All Pickles</Link>
            <Link to="/products?category=mango-achar" className="hover:text-primary transition-colors py-0.5">Mango Achar</Link>
            <Link to="/products?category=andhra-gongura" className="hover:text-primary transition-colors py-0.5">Andhra Gongura</Link>
            <Link to="/products?category=rajasthani-ker-sangri" className="hover:text-primary transition-colors py-0.5">Rajasthani Ker Sangri</Link>
            <Link to="/products?category=south-indian-non-veg" className="hover:text-primary transition-colors py-0.5">South Indian Non-Veg</Link>
            <Link to="/products?category=bamboo-shoot-pickle" className="hover:text-primary transition-colors py-0.5">Bhut Jolokia &amp; Bamboo</Link>
            <Link to="/products?category=chilli-pickle" className="hover:text-primary transition-colors py-0.5">Garlic &amp; Chutneys</Link>
            <Link to="/brands" className="hover:text-primary transition-colors py-0.5 flex items-center gap-1">
              <Sparkles size={12} className="text-secondary" /> Verified Makers
            </Link>
          </div>
        </div>

        {/* Search Popover Drawer (when search icon is toggled) */}
        {searchOpen && (
          <div className="border-t border-outline-variant/30 bg-surface-container px-4 py-3 sm:py-4 transition-all animate-in fade-in slide-in-from-top-2">
            <div className="max-w-2xl mx-auto space-y-2">
              <form onSubmit={handleSearch} className="relative w-full">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bamboo shoot, king chilli, shredded beef, pork pickles..."
                  className="w-full pl-11 pr-24 py-2.5 bg-surface-container-lowest border border-outline-variant/40 rounded-full text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-medium"
                />
                <Search size={16} className="absolute left-4 top-3 text-outline" />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1 px-4 py-1.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-bold rounded-full transition-colors"
                >
                  Search
                </button>
              </form>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-on-surface-variant pt-1 font-medium">
                <span>Quick:</span>
                {[
                  'Bamboo Shoot',
                  'King Chilli',
                  'Shredded Beef',
                  'Smoked Pork',
                  'Fermented Soya (Axone)',
                ].map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => handleQuickSearch(term)}
                    className="px-2.5 py-0.5 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-outline-variant/30 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Slide-Out Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-outline-variant/30 bg-surface-container px-5 py-5 space-y-4 animate-in fade-in slide-in-from-top-2">
            <nav className="flex flex-col space-y-3 text-sm font-semibold">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 transition-colors ${
                  location.pathname === '/' ? 'text-primary font-bold' : 'text-on-surface'
                }`}
              >
                Home
              </Link>
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 transition-colors ${
                  location.pathname === '/products' ? 'text-primary font-bold' : 'text-on-surface'
                }`}
              >
                Shop All Pickles
              </Link>
              <Link
                to="/brands"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 transition-colors ${
                  location.pathname === '/brands' ? 'text-primary font-bold' : 'text-on-surface'
                }`}
              >
                Our Producers &amp; Brands
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 transition-colors ${
                  location.pathname === '/about' ? 'text-primary font-bold' : 'text-on-surface'
                }`}
              >
                About Wangs
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 transition-colors ${
                  location.pathname === '/contact' ? 'text-primary font-bold' : 'text-on-surface'
                }`}
              >
                Contact &amp; Support
              </Link>
              <Link
                to="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-on-surface flex items-center justify-between"
              >
                <span>Track My Orders</span>
                <Package size={15} className="text-on-surface-variant" />
              </Link>
            </nav>

            <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between">
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-xs">
                    {(user.first_name || user.username || 'U')[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-on-surface">{user.first_name || user.username}</span>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 bg-primary text-on-primary font-bold rounded-full text-xs shadow-md"
                >
                  Sign In / Register
                </Link>
              )}
            </div>
          </div>
        )}

        {/* 3. Secondary Dietary Ribbon (Shown on catalog / product pages) */}
        {location.pathname !== '/' && (
          <nav className="border-t border-outline-variant/20 py-2 sm:py-2.5 text-xs font-medium text-on-surface-variant bg-surface-container">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
                <Link
                  to="/products"
                  className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                    !searchParams.get('dietary_type') && !searchParams.get('category') && !searchParams.get('search')
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-outline-variant/30'
                  }`}
                >
                  All Pickles
                </Link>
                <Link
                  to="/products?dietary_type=NON_VEG"
                  className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                    searchParams.get('dietary_type') === 'NON_VEG'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-outline-variant/30'
                  }`}
                >
                  Non-Veg
                </Link>
                <Link
                  to="/products?dietary_type=VEG"
                  className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                    searchParams.get('dietary_type') === 'VEG'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-outline-variant/30'
                  }`}
                >
                  Veg
                </Link>
                <Link
                  to="/products?dietary_type=VEG_MIXED"
                  className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                    searchParams.get('dietary_type') === 'VEG_MIXED'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface border border-outline-variant/30'
                  }`}
                >
                  Veg Mixed
                </Link>
              </div>

              <div className="hidden lg:flex items-center gap-5 text-xs text-on-surface-variant font-semibold">
                <Link
                  to="/brands"
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Store size={13} className="text-secondary" />
                  <span>Artisan Producers</span>
                </Link>
                <Link
                  to="/products?bestsellers=true"
                  className="flex items-center gap-1.5 hover:text-primary transition-colors"
                >
                  <Sparkles size={13} className="text-secondary" />
                  <span>Bestsellers</span>
                </Link>
              </div>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
