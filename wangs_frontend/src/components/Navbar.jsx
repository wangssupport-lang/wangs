import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag, Search, User, ChevronDown, ShieldCheck, Store,
  Sparkles, LogOut, Package, Heart, Truck, X, MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function Navbar() {
  const { user, isManufacturer, logout } = useAuth();
  const { itemsCount, setIsDrawerOpen } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  // Stored delivery pincode
  const [deliveryPincode, setDeliveryPincode] = useState(() => {
    try {
      return localStorage.getItem('wangs_delivery_pincode') || '560001';
    } catch {
      return '560001';
    }
  });
  const [tempPincode, setTempPincode] = useState(deliveryPincode);

  // Auto-close open menus on route change
  useEffect(() => {
    setUserDropdownOpen(false);
    setLocationModalOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    setSearchQuery(searchParams.get('search') || '');
  }, [searchParams]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSavePincode = (e) => {
    e.preventDefault();
    if (tempPincode.trim().length === 6) {
      setDeliveryPincode(tempPincode.trim());
      try {
        localStorage.setItem('wangs_delivery_pincode', tempPincode.trim());
      } catch (err) {
        console.error(err);
      }
      setLocationModalOpen(false);
      toast.success(`Delivery pincode set to ${tempPincode.trim()}`);
    } else {
      toast.error('Please enter a valid 6-digit Indian PIN code');
    }
  };

  const currentCategory = searchParams.get('category') || '';
  const isBrowsePage = location.pathname === '/' || location.pathname === '/products';

  return (
    <header className="sticky top-0 z-40 bg-[#fff8f4] shadow-xs w-full select-none">
      {/* ========================================================
          1. TOP ANNOUNCEMENT RIBBON (DESKTOP ONLY)
          ======================================================== */}
      <div className="hidden md:block bg-[#9b4100] text-white border-b border-[#bf550d] text-[11px] font-medium py-1.5 px-4">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between font-label-md">
          <div className="flex items-center gap-2">
            <Truck size={14} className="text-[#ffdbcb]" />
            <span>Complimentary Artisan Delivery on Sun-Cured Heritage Pickles above ₹499 Across India</span>
          </div>
          <div className="flex items-center gap-4 text-[#ffdbcb]">
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

      {/* ========================================================
          2. MAIN NAVIGATION BAR
          ======================================================== */}
      <div className="bg-[#fff8f4] border-b border-[#dec0b3]/30 text-[#1e1b18]">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8">
          
          {/* ----------------------------------------------------
              MOBILE TOP HEADER (Exact Match to Stitch Spec)
              ---------------------------------------------------- */}
          <div className="md:hidden flex flex-col gap-2 pt-2.5 pb-2">
            {/* Mobile Row 1: Logo & Title + Deliver To Pill + Bell + Avatar */}
            <div className="flex items-center justify-between gap-1.5">
              {/* Brand Logo & Wordmark */}
              <Link to="/" className="flex items-center gap-2 shrink-0">
                <img
                  src="/logo.png"
                  alt="Wangs Pickle Marketplace Logo"
                  className="h-8 w-8 object-contain"
                />
                <div className="flex flex-col">
                  <span className="font-serif text-lg font-bold text-[#9b4100] leading-none tracking-tight">
                    Wangs
                  </span>
                  <span className="text-[8px] uppercase tracking-wider text-[#574238] font-bold leading-tight mt-0.5">
                    PICKLE MARKETPLACE
                  </span>
                </div>
              </Link>

              {/* Right Controls: Delivery Location Pill + Notifications Bell + Profile Avatar */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Delivery Location Pill */}
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  aria-label="Delivery Location"
                  className="h-8 px-2 rounded-full bg-[#faf2ed] hover:bg-[#f4ece7] flex items-center gap-1 text-[#574238] transition-colors border border-[#dec0b3]/40 text-left active:scale-95"
                >
                  <span className="material-symbols-outlined text-[#9b4100] text-[15px]">location_on</span>
                  <div className="flex flex-col text-left leading-none">
                    <span className="text-[7.5px] text-[#8a7267] font-medium leading-none">Deliver to</span>
                    <span className="text-[10px] font-bold text-[#1e1b18] truncate max-w-[78px] leading-tight">
                      {deliveryPincode}
                    </span>
                  </div>
                  <ChevronDown size={11} className="text-[#8a7267] shrink-0 ml-0.5" />
                </button>

                {/* Notifications Bell */}
                <Link
                  to="/account"
                  aria-label="Notifications"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#574238] hover:text-[#9b4100] relative hover:bg-[#faf2ed] transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-[19px]">notifications</span>
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#9b4100]" />
                </Link>

                {/* Profile Avatar / User Icon */}
                <Link
                  to={user ? '/account' : '/login'}
                  aria-label="Account"
                  className="w-8 h-8 rounded-full ring-2 ring-[#dec0b3] shadow-xs overflow-hidden flex items-center justify-center bg-[#ffdcc3] text-[#2f1500] font-bold text-xs active:scale-95"
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
            <form onSubmit={handleSearch} className="relative w-full flex items-center bg-white rounded-full px-3.5 py-1.5 shadow-[0_1px_4px_rgba(30,27,24,0.06)] border border-[#dec0b3]/40 focus-within:shadow-[0_0_0_1.5px_#9b4100]">
              <Search size={15} className="text-[#8a7267] mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artisan achars, regional makers..."
                className="w-full bg-transparent text-xs text-[#1e1b18] placeholder:text-[#8a7267] focus:outline-none py-0.5"
              />
              <button
                type="button"
                onClick={() => toast.info('Voice search coming soon')}
                aria-label="Voice Search"
                className="w-6 h-6 flex items-center justify-center text-[#8a7267] hover:text-[#9b4100] transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[17px]">mic</span>
              </button>
            </form>

            {/* Mobile Row 3: Category Pills Strip (Shown on Home and Catalog) */}
            {isBrowsePage && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
                <Link
                  to="/products"
                  className={`h-7 px-3 rounded-full text-[11px] font-bold whitespace-nowrap flex items-center shrink-0 transition-colors ${
                    !currentCategory
                      ? 'bg-[#9b4100] text-white shadow-[0_2px_6px_rgba(155,65,0,0.25)]'
                      : 'bg-[#f4ece7] text-[#574238] hover:bg-[#eee7e1] border border-[#dec0b3]/30'
                  }`}
                >
                  All Pickles
                </Link>
                <Link
                  to="/products?category=andhra-gongura"
                  className={`h-7 px-3 rounded-full text-[11px] font-semibold whitespace-nowrap flex items-center shrink-0 transition-colors ${
                    currentCategory === 'andhra-gongura'
                      ? 'bg-[#9b4100] text-white shadow-[0_2px_6px_rgba(155,65,0,0.25)]'
                      : 'bg-[#f4ece7] text-[#574238] hover:bg-[#eee7e1] border border-[#dec0b3]/30'
                  }`}
                >
                  Andhra Avakaya
                </Link>
                <Link
                  to="/products?category=north-mustard"
                  className={`h-7 px-3 rounded-full text-[11px] font-semibold whitespace-nowrap flex items-center shrink-0 transition-colors ${
                    currentCategory === 'north-mustard'
                      ? 'bg-[#9b4100] text-white shadow-[0_2px_6px_rgba(155,65,0,0.25)]'
                      : 'bg-[#f4ece7] text-[#574238] hover:bg-[#eee7e1] border border-[#dec0b3]/30'
                  }`}
                >
                  North Mustard
                </Link>
                <Link
                  to="/products?category=sweet-chutneys"
                  className={`h-7 px-3 rounded-full text-[11px] font-semibold whitespace-nowrap flex items-center shrink-0 transition-colors ${
                    currentCategory === 'sweet-chutneys'
                      ? 'bg-[#9b4100] text-white shadow-[0_2px_6px_rgba(155,65,0,0.25)]'
                      : 'bg-[#f4ece7] text-[#574238] hover:bg-[#eee7e1] border border-[#dec0b3]/30'
                  }`}
                >
                  Sweet Chutneys
                </Link>
                <Link
                  to="/products?category=zero-oil"
                  className={`h-7 px-3 rounded-full text-[11px] font-semibold whitespace-nowrap flex items-center shrink-0 transition-colors ${
                    currentCategory === 'zero-oil'
                      ? 'bg-[#9b4100] text-white shadow-[0_2px_6px_rgba(155,65,0,0.25)]'
                      : 'bg-[#f4ece7] text-[#574238] hover:bg-[#eee7e1] border border-[#dec0b3]/30'
                  }`}
                >
                  Zero Oil
                </Link>
              </div>
            )}
          </div>

          {/* ----------------------------------------------------
              DESKTOP NAVIGATION ROW (Exact Match to Desktop Spec)
              ---------------------------------------------------- */}
          <div className="hidden md:flex h-16 sm:h-[72px] items-center justify-between gap-4">
            {/* Left: Brand Logo & Wordmark + Deliver To */}
            <div className="flex items-center gap-4 shrink-0">
              <Link to="/" className="group flex items-center gap-2.5 select-none shrink-0">
                <img
                  src="/logo.png"
                  alt="Wangs Pickle Marketplace Logo"
                  className="h-10 w-10 object-contain transition-transform duration-200 group-hover:scale-105"
                />
                <span className="font-serif text-[26px] font-bold tracking-tight leading-none text-[#9b4100] group-hover:text-[#bf550d] transition-colors">
                  Wangs
                </span>
              </Link>

              {/* Delivery Pin Dropdown (Desktop) */}
              <button
                type="button"
                onClick={() => setLocationModalOpen(true)}
                className="hidden lg:flex items-center gap-1.5 pl-4 text-xs font-medium text-[#574238] cursor-pointer hover:text-[#9b4100] transition-colors border-l border-[#dec0b3]/40"
              >
                <span className="material-symbols-outlined text-[18px] text-[#9b4100]">pin_drop</span>
                <span className="font-bold text-[#1e1b18]">Deliver to:</span>
                <span>{deliveryPincode} (Bengaluru)</span>
                <ChevronDown size={14} className="text-[#8a7267]" />
              </button>
            </div>

            {/* Middle: Global Search Bar with All Regions filter */}
            <div className="flex-1 max-w-xl mx-2">
              <form onSubmit={handleSearch} className="w-full flex items-center bg-[#faf2ed] rounded-full pl-4 pr-1.5 py-1.5 border border-[#dec0b3]/40 focus-within:bg-white focus-within:shadow-[0_0_0_1.5px_#9b4100] transition-all">
                <Search size={17} className="text-[#8a7267] mr-2 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 500+ handmade mango, garlic, gongura..."
                  className="w-full bg-transparent text-xs text-[#1e1b18] placeholder:text-[#8a7267] focus:outline-none"
                />
                
                {/* All Regions selector trigger */}
                <Link
                  to="/brands"
                  className="hidden sm:flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#574238] hover:text-[#9b4100] border-l border-[#dec0b3]/40 shrink-0 select-none transition-colors"
                >
                  <span>All Regions</span>
                  <ChevronDown size={12} className="text-[#8a7267]" />
                </Link>

                <button
                  type="submit"
                  className="bg-[#9b4100] hover:bg-[#bf550d] text-white text-xs font-bold px-3.5 py-1.5 rounded-full shrink-0 transition-colors ml-1 active:scale-95"
                >
                  Search
                </button>
              </form>
            </div>

            {/* Right: Actions Cluster */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Sell on Wangs CTA Button - Dark Olive Green Pill matching Stitch spec */}
              <Link
                to="/manufacturer/register"
                className="inline-flex items-center gap-1.5 bg-[#526048] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#3f4a36] transition-all shadow-xs active:scale-95"
              >
                <Store size={15} />
                <span>Sell on Wangs</span>
              </Link>

              {/* Wishlist Icon */}
              <Link
                to="/brands"
                className="relative p-2 rounded-full text-[#574238] hover:text-[#9b4100] hover:bg-[#faf2ed] transition-colors"
                title="Wishlist / Makers"
              >
                <Heart size={21} className="text-[#1e1b18]" />
              </Link>

              {/* Shopping Cart Pill Button */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="relative p-2 rounded-full text-[#574238] hover:text-[#9b4100] hover:bg-[#faf2ed] transition-colors cursor-pointer"
                aria-label={`Shopping Basket with ${itemsCount} items`}
                title="Cart"
              >
                <ShoppingBag size={21} className="text-[#1e1b18]" />
                {itemsCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 bg-[#9b4100] text-white font-bold text-[9px] leading-tight rounded-full flex items-center justify-center shadow-xs">
                    {itemsCount > 99 ? '99+' : itemsCount}
                  </span>
                )}
              </button>

              {/* User Profile / Sign In Dropdown */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-1.5 p-1 pr-2 rounded-full hover:bg-[#faf2ed] transition-all cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-[#9b4100] text-white flex items-center justify-center font-bold text-xs ring-2 ring-[#dec0b3]">
                      {(user.first_name || user.username || 'U')[0].toUpperCase()}
                    </div>
                    <ChevronDown size={13} className="text-[#8a7267]" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#dec0b3]/40 py-2 z-50 text-xs text-[#1e1b18]">
                      <div className="px-4 py-2.5 border-b border-[#dec0b3]/20 bg-[#faf2ed]">
                        <p className="font-bold text-[#1e1b18]">{user.first_name} {user.last_name}</p>
                        <p className="text-[#574238] truncate text-[11px]">{user.email}</p>
                      </div>

                      <Link
                        to="/account"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[#1e1b18] hover:bg-[#faf2ed] transition-colors font-medium"
                      >
                        <Package size={15} className="text-[#9b4100]" /> My Orders &amp; Addresses
                      </Link>

                      {isManufacturer ? (
                        <Link
                          to="/manufacturer"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-[#904d00] font-bold hover:bg-[#faf2ed] transition-colors"
                        >
                          <Store size={15} className="text-[#904d00]" /> Seller Dashboard
                        </Link>
                      ) : null}

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                          navigate('/');
                        }}
                        className="w-full text-left flex items-center gap-2.5 px-4 py-2.5 text-[#ba1a1a] hover:bg-[#ffdad6]/40 border-t border-[#dec0b3]/20 mt-1 transition-colors"
                      >
                        <LogOut size={15} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 p-1 pr-2 rounded-full hover:bg-[#faf2ed] transition-all"
                  title="Sign In / Register"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#dec0b3]">
                    <img
                      src="/images/stitch/stitch_27_20e177a3d5.jpg"
                      alt="Account"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                  <ChevronDown size={13} className="text-[#8a7267]" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================
            3. SUB-NAVIGATION CATEGORY STRIP (DESKTOP ONLY)
            Exact Match to Desktop Design Spec
            ======================================================== */}
        <div className="hidden md:block bg-[#faf2ed] border-t border-[#dec0b3]/30">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-7 overflow-x-auto no-scrollbar py-2 text-xs font-semibold text-[#574238] whitespace-nowrap">
            <Link to="/products?category=mango-achar" className="hover:text-[#9b4100] transition-colors py-0.5">Mango Achar</Link>
            <Link to="/products?category=andhra-gongura" className="hover:text-[#9b4100] transition-colors py-0.5">Andhra Gongura</Link>
            <Link to="/products?category=rajasthani-ker-sangri" className="hover:text-[#9b4100] transition-colors py-0.5">Rajasthani Ker Sangri</Link>
            <Link to="/products?category=south-indian-non-veg" className="hover:text-[#9b4100] transition-colors py-0.5">South Indian Non-Veg Pickles</Link>
            <Link to="/products?category=zero-oil" className="hover:text-[#9b4100] transition-colors py-0.5">Oil-Free Specials</Link>
            <Link to="/products?category=chilli-pickle" className="hover:text-[#9b4100] transition-colors py-0.5">Garlic &amp; Chutneys</Link>
            <Link to="/products?bestsellers=true" className="hover:text-[#9b4100] transition-colors py-0.5">Bestsellers</Link>
            <Link to="/brands" className="hover:text-[#9b4100] transition-colors py-0.5 flex items-center gap-1">
              <Sparkles size={12} className="text-[#904d00]" /> Direct From Farm
            </Link>
            <Link to="/products?dietary_type=NON_VEG" className="hover:text-[#9b4100] transition-colors py-0.5">Meat Pickles</Link>
          </div>
        </div>
      </div>

      {/* ========================================================
          DELIVERY LOCATION MODAL / POPUP
          ======================================================== */}
      {locationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
          <div className="bg-[#fff8f4] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-[#dec0b3]/40 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="text-[#9b4100]" size={20} />
                <h3 className="font-serif text-lg font-bold text-[#1e1b18]">Select Delivery Location</h3>
              </div>
              <button
                onClick={() => setLocationModalOpen(false)}
                className="p-1 rounded-full text-[#8a7267] hover:text-[#1e1b18] hover:bg-[#faf2ed]"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-[#574238] leading-relaxed">
              Enter your Indian postal PIN code to check regional express delivery from artisanal heritage kitchens.
            </p>

            <form onSubmit={handleSavePincode} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  maxLength={6}
                  value={tempPincode}
                  onChange={(e) => setTempPincode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit PIN code (e.g. 560001)"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#dec0b3] bg-white text-sm font-semibold text-[#1e1b18] placeholder:text-[#8a7267] focus:outline-none focus:ring-2 focus:ring-[#9b4100]"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(false)}
                  className="flex-1 py-2.5 rounded-full border border-[#dec0b3] text-xs font-semibold text-[#574238] hover:bg-[#faf2ed]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-full bg-[#9b4100] text-white text-xs font-bold hover:bg-[#bf550d] shadow-sm"
                >
                  Update Pincode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
