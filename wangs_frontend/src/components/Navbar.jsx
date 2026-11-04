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
    <header className="sticky top-0 z-40 shadow-xs">
      {/* 1. Top Announcement Ribbon - Stitch Terracotta (#9b4100) */}
      <div className="bg-primary text-on-primary border-b border-primary-container text-[11px] font-medium py-1.5 px-4 select-none">
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

      {/* 2. Main Navigation Bar - Stitch Heritage Warm Surface (#fff8f4) */}
      <div className="bg-surface/95 backdrop-blur-xl border-b border-outline-variant/30 text-on-surface">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-18 sm:h-20 items-center justify-between gap-4">
            
            {/* Mobile Left: Hamburger Menu Button */}
            <div className="flex md:hidden items-center">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 -ml-2 rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>

            {/* Brand Logo & Mountain Wordmark */}
            <div className="flex items-center gap-3 shrink-0">
              <Link to="/" className="group flex flex-shrink-0 items-center gap-2.5 sm:gap-3 select-none">
                <img
                  src="/logo-red.png"
                  alt="Wangs Pickle Marketplace Logo"
                  className="h-8 sm:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
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

              {/* Mobile Search Toggle */}
              <button
                type="button"
                onClick={() => setSearchOpen(!searchOpen)}
                className="md:hidden p-2 rounded-full text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                aria-label="Search catalog"
              >
                <Search size={20} />
              </button>

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
          <div className="border-t border-white/10 bg-[#191716] px-4 py-3 sm:py-4 transition-all animate-in fade-in slide-in-from-top-2">
            <div className="max-w-2xl mx-auto space-y-2">
              <form onSubmit={handleSearch} className="relative w-full">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bamboo shoot, king chilli, shredded beef, pork pickles..."
                  className="w-full pl-11 pr-24 py-2.5 bg-black/40 border border-white/20 rounded-full text-xs text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#85191e] focus:border-transparent font-medium"
                />
                <Search size={16} className="absolute left-4 top-3 text-stone-400" />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1 px-4 py-1.5 bg-[#85191e] hover:bg-[#9c1e24] text-white text-xs font-bold rounded-full transition-colors"
                >
                  Search
                </button>
              </form>
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-stone-400 pt-1">
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
                    className="px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/15 text-stone-300 border border-white/10 transition-colors"
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
          <div className="md:hidden border-t border-white/10 bg-[#161413] px-5 py-5 space-y-4 animate-in fade-in slide-in-from-top-2">
            <nav className="flex flex-col space-y-3 text-sm font-semibold">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 transition-colors ${
                  location.pathname === '/' ? 'text-[#dc4437] font-bold' : 'text-stone-200'
                }`}
              >
                Home
              </Link>
              <Link
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 transition-colors ${
                  location.pathname === '/products' ? 'text-[#dc4437] font-bold' : 'text-stone-200'
                }`}
              >
                Shop All Pickles
              </Link>
              <Link
                to="/brands"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 transition-colors ${
                  location.pathname === '/brands' ? 'text-[#dc4437] font-bold' : 'text-stone-200'
                }`}
              >
                Our Producers &amp; Brands
              </Link>
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 transition-colors ${
                  location.pathname === '/about' ? 'text-[#dc4437] font-bold' : 'text-stone-200'
                }`}
              >
                About Wangs
              </Link>
              <Link
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-1.5 transition-colors ${
                  location.pathname === '/contact' ? 'text-[#dc4437] font-bold' : 'text-stone-200'
                }`}
              >
                Contact &amp; Support
              </Link>
              <Link
                to="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1.5 text-stone-200 flex items-center justify-between"
              >
                <span>Track My Orders</span>
                <Package size={15} className="text-stone-400" />
              </Link>
            </nav>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#85191e] text-white flex items-center justify-center font-bold text-xs">
                    {(user.first_name || user.username || 'U')[0].toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-white">{user.first_name || user.username}</span>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 bg-[#f5e6d3] text-stone-950 font-bold rounded-full text-xs shadow-md"
                >
                  Sign In / Register
                </Link>
              )}
            </div>
          </div>
        )}

        {/* 3. Secondary Dietary Ribbon (Shown on catalog / product pages) */}
        {location.pathname !== '/' && (
          <nav className="border-t border-white/10 py-2 sm:py-2.5 text-xs font-medium text-stone-300 bg-[#12100f]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-0.5">
                <Link
                  to="/products"
                  className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                    !searchParams.get('dietary_type') && !searchParams.get('category') && !searchParams.get('search')
                      ? 'bg-[#85191e] text-white'
                      : 'bg-white/10 hover:bg-white/20 text-stone-200'
                  }`}
                >
                  All Pickles
                </Link>
                <Link
                  to="/products?dietary_type=NON_VEG"
                  className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                    searchParams.get('dietary_type') === 'NON_VEG'
                      ? 'bg-[#85191e] text-white'
                      : 'bg-white/10 hover:bg-white/20 text-stone-200'
                  }`}
                >
                  Non-Veg
                </Link>
                <Link
                  to="/products?dietary_type=VEG"
                  className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                    searchParams.get('dietary_type') === 'VEG'
                      ? 'bg-[#85191e] text-white'
                      : 'bg-white/10 hover:bg-white/20 text-stone-200'
                  }`}
                >
                  Veg
                </Link>
                <Link
                  to="/products?dietary_type=VEG_MIXED"
                  className={`px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap transition-colors ${
                    searchParams.get('dietary_type') === 'VEG_MIXED'
                      ? 'bg-[#85191e] text-white'
                      : 'bg-white/10 hover:bg-white/20 text-stone-200'
                  }`}
                >
                  Veg Mixed
                </Link>
              </div>

              <div className="hidden lg:flex items-center gap-5 text-xs text-stone-400">
                <Link
                  to="/brands"
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Store size={13} className="text-[#dc4437]" />
                  <span>Artisan Producers</span>
                </Link>
                <Link
                  to="/products?bestsellers=true"
                  className="flex items-center gap-1.5 hover:text-white transition-colors"
                >
                  <Sparkles size={13} className="text-amber-400" />
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
