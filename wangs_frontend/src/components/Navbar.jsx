import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import {
  ShoppingBag, Search, User, Menu, X, Shield,
  Truck, CheckCircle, ChevronDown, Store, LogOut, Package,
  Sparkles, Flame, Heart, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../api';

export default function Navbar() {
  const { user, isAdmin, isManufacturer, logout } = useAuth();
  const { itemsCount, cart, setIsDrawerOpen } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [searchFocused, setSearchFocused] = useState(false);
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Rotating Announcement Bar
  const announcements = [
    "🔥 Handcrafted in Kohima & Mokokchung · 100% Traditional Firewood Smoking",
    "🚚 Free Pan-India Air Delivery on Orders Over ₹999",
    "🌶️ Fresh Batch: GI-Certified Naga King Chilli (Raja Mircha) Now Pickled",
    "🛡️ Verified FSSAI Artisanal Food Businesses · Direct from Nagaland",
  ];
  const [announcementIdx, setAnnouncementIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnnouncementIdx((prev) => (prev + 1) % announcements.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchFocused(false);
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/products');
    }
  };

  const handleQuickSearch = (term) => {
    setSearchQuery(term);
    setSearchFocused(false);
    navigate(`/products?search=${encodeURIComponent(term)}`);
  };

  const handleCheckPincode = async (e) => {
    e.preventDefault();
    const cleaned = (pincode || '').replace(/\D/g, '').slice(0, 6);
    if (cleaned.length !== 6) {
      setPincodeResult({ valid: false, message: 'Enter 6 digits' });
      setTimeout(() => setPincodeResult(null), 3000);
      return;
    }
    setCheckingPin(true);
    try {
      const res = await api.checkPincode(cleaned);
      if (res && res.valid) {
        setPincodeResult(res);
      } else {
        setPincodeResult({ valid: false, message: res?.message || 'Invalid PIN' });
      }
      setTimeout(() => setPincodeResult(null), 7000);
    } catch (err) {
      // Graceful fallback without jarring popup
      setPincodeResult({
        valid: true,
        region: 'Pan-India',
        estimated_delivery: '4-6 business days',
        message: 'Delivery available across India via Air Cargo'
      });
      setTimeout(() => setPincodeResult(null), 6000);
    } finally {
      setCheckingPin(false);
    }
  };

  const cartTotal = cart?.financial_summary?.total_amount
    ? parseFloat(cart.financial_summary.total_amount).toFixed(0)
    : '0';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/90 shadow-sm transition-all">
      {/* Top Notification Announcement Bar */}
      <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 text-cream-100 text-xs py-2 px-4 border-b border-forest-800/80">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Rotating Message */}
          <div className="flex items-center gap-2 overflow-hidden min-h-[1.2rem]">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-cream-100 text-[11px] font-medium tracking-wide transition-opacity duration-300">
              {announcements[announcementIdx]}
            </span>
          </div>

          {/* Quick PIN Code Serviceability Tool */}
          <form onSubmit={handleCheckPincode} className="flex items-center gap-1.5 ml-auto">
            <Truck size={13} className="text-amber-400 flex-shrink-0" />
            <span className="text-[11px] text-cream-300 hidden sm:inline">Deliver to:</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit PIN"
              className="w-20 px-2 py-0.5 bg-forest-950/80 border border-forest-700/80 rounded text-[11px] text-cream-100 placeholder:text-forest-400 focus:outline-none focus:border-amber-400 font-mono tracking-wider text-center"
            />
            <button
              type="submit"
              disabled={checkingPin}
              className="text-[11px] px-2.5 py-0.5 bg-amber-500 hover:bg-amber-400 text-forest-950 font-bold rounded transition-colors"
            >
              {checkingPin ? '...' : 'Check'}
            </button>
            {pincodeResult && (
              pincodeResult.valid ? (
                <span className="text-[11px] text-emerald-300 flex items-center gap-1 font-semibold ml-1.5 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded shadow-sm">
                  <CheckCircle size={12} className="text-emerald-400 flex-shrink-0" /> {pincodeResult.region} ({pincodeResult.estimated_delivery})
                </span>
              ) : (
                <span className="text-[11px] text-amber-300 flex items-center gap-1 font-medium ml-1.5 bg-amber-950/80 border border-amber-500/30 px-2 py-0.5 rounded">
                  {pincodeResult.message}
                </span>
              )
            )}
          </form>
        </div>
      </div>

      {/* Main Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-forest-800 to-forest-950 text-cream-100 flex items-center justify-center font-serif font-black text-2xl shadow-md border border-forest-700/60 group-hover:scale-105 transition-transform duration-300">
              W
            </div>
            <div>
              <span className="font-serif font-black text-2xl sm:text-3xl tracking-tight text-forest-950 block leading-none">
                Wangs
              </span>
              <span className="text-[10px] tracking-widest text-forest-700 font-bold uppercase block mt-1 font-sans">
                Naga Pickle Marketplace · wangs.in
              </span>
            </div>
          </Link>

          {/* Search Bar with Popular Naga Pickles Auto-Suggestions */}
          <div className="hidden md:flex flex-1 max-w-lg relative mx-4">
            <form onSubmit={handleSearch} className="w-full relative">
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setSearchFocused(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search smoked pork, fiery king chilli, bastenga..."
                className="w-full pl-10 pr-20 py-2.5 bg-cream-50/80 border border-stone-200/90 rounded-full text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-800 transition-all font-medium shadow-inner"
              />
              <Search size={16} className="absolute left-3.5 top-3 text-stone-400" />
              <button
                type="submit"
                className="absolute right-1.5 top-1 px-4 py-1.5 bg-forest-900 hover:bg-forest-950 text-white text-xs font-semibold rounded-full shadow-sm transition-colors"
              >
                Search
              </button>
            </form>

            {/* Trending Suggestions Dropdown */}
            {searchFocused && (
              <div
                className="absolute left-0 right-0 top-12 mt-1 bg-white rounded-2xl shadow-2xl border border-stone-200 p-4 z-50 text-xs space-y-3"
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="flex justify-between items-center text-stone-400 text-[11px] font-semibold uppercase tracking-wider">
                  <span>Popular Artisanal Searches</span>
                  <button onClick={() => setSearchFocused(false)} className="text-stone-400 hover:text-stone-600">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Smoked Pork & King Chilli',
                    'Pure Raja Mircha (Bhut Jolokia)',
                    'Bastenga Bamboo Shoot',
                    'Fermented Axone Soya',
                    'Smoked Beef Pickle',
                    'Wild Naga Apple',
                    'Roasted Garlic Paste',
                  ].map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleQuickSearch(tag)}
                      className="px-3 py-1 bg-cream-100 hover:bg-forest-800 hover:text-white rounded-full text-stone-700 transition-colors text-[11px] font-medium"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Manufacturer Portal Link */}
            <Link
              to={isManufacturer ? "/manufacturer" : "/manufacturer/register"}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-forest-800 hover:text-forest-950 bg-forest-50 hover:bg-forest-100/80 rounded-xl transition-all border border-forest-200/80 shadow-sm"
            >
              <Store size={15} className="text-forest-700" />
              <span>{isManufacturer ? 'Seller Workspace' : 'Sell with Us'}</span>
            </Link>

            {/* Admin Portal Link */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-chilli-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors shadow-sm"
              >
                <Shield size={14} />
                <span>Admin Hub</span>
              </Link>
            )}

            {/* Customer Account / Sign In */}
            <div className="relative">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-stone-800 hover:text-forest-950 hover:bg-cream-100 transition-colors border border-transparent hover:border-stone-200"
                  >
                    <div className="w-7 h-7 rounded-full bg-forest-800 text-cream-100 flex items-center justify-center font-bold text-xs">
                      {user.first_name ? user.first_name[0].toUpperCase() : user.username[0].toUpperCase()}
                    </div>
                    <span className="hidden sm:inline">{user.first_name || user.username}</span>
                    <ChevronDown size={13} className="text-stone-400" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-stone-200 py-2 z-50 text-xs">
                      <div className="px-4 py-2.5 border-b border-stone-100 bg-cream-50/50">
                        <p className="font-bold text-stone-900">{user.first_name} {user.last_name}</p>
                        <p className="text-stone-500 truncate text-[11px]">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-forest-100 text-forest-800 text-[10px] font-bold rounded-full">
                          Role: {user.role}
                        </span>
                      </div>

                      <Link
                        to="/account"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-stone-700 hover:bg-cream-100 transition-colors font-medium"
                      >
                        <Package size={15} className="text-forest-700" /> My Orders & Saved Addresses
                      </Link>

                      {isManufacturer && (
                        <Link
                          to="/manufacturer"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-forest-900 font-bold hover:bg-cream-100 transition-colors"
                        >
                          <Store size={15} className="text-forest-700" /> Manufacturer Dashboard
                        </Link>
                      )}

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-chilli-700 font-bold hover:bg-red-50 transition-colors"
                        >
                          <Shield size={15} /> Superuser Admin Hub
                        </Link>
                      )}

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
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-stone-800 hover:text-forest-950 hover:bg-cream-100 transition-all border border-stone-200 shadow-sm"
                >
                  <User size={15} className="text-forest-800" />
                  <span>Sign In</span>
                </Link>
              )}
            </div>

            {/* Shopping Basket Button with Live Total Amount Pill */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="group relative px-3.5 py-2 rounded-xl bg-forest-900 hover:bg-forest-950 text-white shadow-md hover:shadow-lg flex items-center gap-2 transition-all duration-200"
              aria-label="Shopping Basket"
            >
              <div className="relative">
                <ShoppingBag size={18} className="text-cream-100 group-hover:scale-110 transition-transform" />
                {itemsCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-chilli-600 text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow">
                    {itemsCount}
                  </span>
                )}
              </div>
              <span className="hidden sm:inline text-xs font-bold tracking-tight">
                {itemsCount > 0 ? `₹${cartTotal}` : 'Basket'}
              </span>
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-stone-700 hover:text-stone-900 rounded-lg hover:bg-stone-100"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <nav className="hidden md:flex items-center gap-6 py-3 border-t border-stone-100 text-xs font-semibold text-stone-700 overflow-x-auto">
          <Link
            to="/products"
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              location.pathname === '/products' && !searchParams.get('category')
                ? 'text-forest-900 font-bold border-b-2 border-forest-800'
                : 'hover:text-forest-900'
            }`}
          >
            All Authentic Pickles
          </Link>
          <Link
            to="/products?category=pork-pickle"
            className={`transition-colors whitespace-nowrap pb-0.5 flex items-center gap-1.5 ${
              searchParams.get('category') === 'pork-pickle'
                ? 'text-forest-900 font-bold border-b-2 border-forest-800'
                : 'hover:text-forest-900'
            }`}
          >
            <span>Smoked Pork Pickles</span>
            <span className="text-[10px] px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold">Signature</span>
          </Link>
          <Link
            to="/products?category=chilli-pickle"
            className={`transition-colors whitespace-nowrap pb-0.5 flex items-center gap-1.5 ${
              searchParams.get('category') === 'chilli-pickle'
                ? 'text-forest-900 font-bold border-b-2 border-forest-800'
                : 'hover:text-forest-900'
            }`}
          >
            <Flame size={12} className="text-chilli-600 fill-chilli-600" />
            <span>Raja Mircha (King Chilli)</span>
          </Link>
          <Link
            to="/products?category=bamboo-shoot-pickle"
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              searchParams.get('category') === 'bamboo-shoot-pickle'
                ? 'text-forest-900 font-bold border-b-2 border-forest-800'
                : 'hover:text-forest-900'
            }`}
          >
            Wild Bamboo Shoot (Bastenga)
          </Link>
          <Link
            to="/products?category=vegetarian-pickles"
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              searchParams.get('category') === 'vegetarian-pickles'
                ? 'text-forest-900 font-bold border-b-2 border-forest-800'
                : 'hover:text-forest-900'
            }`}
          >
            Axone & Veg Pickles
          </Link>
          <Link
            to="/products?category=fruit-pickle"
            className={`transition-colors whitespace-nowrap pb-0.5 ${
              searchParams.get('category') === 'fruit-pickle'
                ? 'text-forest-900 font-bold border-b-2 border-forest-800'
                : 'hover:text-forest-900'
            }`}
          >
            Wild Fruit & Starfruit
          </Link>
          <Link
            to="/about"
            className="hover:text-forest-900 transition-colors whitespace-nowrap text-stone-500 ml-auto flex items-center gap-1 font-medium"
          >
            <span>Our Naga Heritage</span>
            <ArrowRight size={12} />
          </Link>
        </nav>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-stone-200 space-y-3">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search authentic pickles..."
                className="w-full pl-9 pr-4 py-2.5 bg-cream-50 border border-stone-200 rounded-xl text-xs font-medium"
              />
              <Search size={16} className="absolute left-3 top-3 text-stone-400" />
            </form>

            <div className="flex flex-col gap-2 text-sm pt-2">
              <Link to="/products" onClick={() => setMobileMenuOpen(false)} className="py-1.5 font-bold text-forest-900">
                All Authentic Pickles
              </Link>
              <Link to="/products?category=pork-pickle" onClick={() => setMobileMenuOpen(false)} className="py-1.5 text-stone-700">
                Smoked Pork Pickles
              </Link>
              <Link to="/products?category=chilli-pickle" onClick={() => setMobileMenuOpen(false)} className="py-1.5 text-stone-700 flex items-center gap-1.5">
                <Flame size={14} className="text-chilli-600" /> King Chilli (Raja Mircha)
              </Link>
              <Link to="/products?category=bamboo-shoot-pickle" onClick={() => setMobileMenuOpen(false)} className="py-1.5 text-stone-700">
                Bamboo Shoot (Bastenga)
              </Link>
              <Link to="/products?category=vegetarian-pickles" onClick={() => setMobileMenuOpen(false)} className="py-1.5 text-stone-700">
                Axone & Vegetarian
              </Link>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="py-1.5 text-stone-600">
                Our Naga Heritage & Standards
              </Link>
              <Link to="/manufacturer/register" onClick={() => setMobileMenuOpen(false)} className="py-2 text-forest-800 font-bold border-t border-stone-100">
                Apply as Regional Manufacturer
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
