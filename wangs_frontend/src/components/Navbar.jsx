import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag, Search, User, Menu, X, Shield,
  Truck, CheckCircle, ChevronDown, Store, LogOut, Package, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../api';

export default function Navbar() {
  const { user, isAdmin, isManufacturer, logout } = useAuth();
  const { itemsCount, setIsDrawerOpen } = useCart();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate('/products');
    }
  };

  const handleCheckPincode = async (e) => {
    e.preventDefault();
    if (!pincode || pincode.length !== 6) {
      alert('Please enter a 6-digit PIN code');
      return;
    }
    setCheckingPin(true);
    try {
      const res = await api.checkPincode(pincode);
      setPincodeResult(res);
      setTimeout(() => setPincodeResult(null), 5000);
    } catch (err) {
      alert('Invalid PIN code or service unavailable');
    } finally {
      setCheckingPin(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-stone-200/80 transition-all">
      {/* Top Heritage Notice & Serviceability Bar */}
      <div className="bg-forest-950 text-cream-100 text-xs py-2 px-4 border-b border-forest-900">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-chilli-700 text-white text-[10px] font-bold tracking-wider uppercase rounded-full">
              <Sparkles size={11} /> Nagaland Direct
            </span>
            <span className="text-cream-200 text-[11px] hidden md:inline">
              Firewood-cured Naga meats & wild mountain chillies · <strong>Free Delivery</strong> on orders over ₹999
            </span>
          </div>

          {/* Quick PIN Code Availability Checker */}
          <form onSubmit={handleCheckPincode} className="flex items-center gap-1.5">
            <Truck size={13} className="text-cream-300" />
            <input
              type="text"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="Delivery PIN"
              className="w-24 px-2 py-0.5 bg-forest-900/90 border border-forest-700/80 rounded-md text-[11px] text-cream-100 placeholder:text-stone-400 focus:outline-none focus:border-cream-300"
            />
            <button
              type="submit"
              disabled={checkingPin}
              className="text-[11px] px-2.5 py-0.5 bg-cream-100 hover:bg-white rounded-md text-forest-950 font-semibold transition-colors"
            >
              {checkingPin ? '...' : 'Check'}
            </button>
            {pincodeResult && (
              <span className="text-[11px] text-emerald-300 flex items-center gap-1 font-medium ml-1">
                <CheckCircle size={12} /> {pincodeResult.region} ({pincodeResult.estimated_delivery})
              </span>
            )}
          </form>
        </div>
      </div>

      {/* Main Brand Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
            <div className="w-11 h-11 rounded-2xl bg-forest-900 text-cream-50 flex items-center justify-center font-serif font-black text-2xl shadow-sm border border-forest-800 group-hover:scale-105 transition-transform">
              W
            </div>
            <div>
              <span className="font-serif font-bold text-2xl tracking-tight text-forest-950 block leading-tight">
                Wangs
              </span>
              <span className="text-[10px] tracking-widest text-forest-700 font-semibold uppercase block">
                Naga Pickle Marketplace
              </span>
            </div>
          </Link>

          {/* Search Box */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md relative mx-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search smoked pork, king chilli, bamboo shoot..."
              className="w-full pl-10 pr-20 py-2.5 bg-white border border-stone-200/90 rounded-full text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-800/15 focus:border-forest-800 shadow-subtle transition-all"
            />
            <Search size={15} className="absolute left-3.5 top-3 text-stone-400" />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 px-3 py-1 bg-forest-900 hover:bg-forest-950 text-cream-50 text-[11px] font-semibold rounded-full transition-colors"
            >
              Search
            </button>
          </form>

          {/* Right Action Icons */}
          <div className="flex items-center gap-3">
            {/* Manufacturer Portal Link */}
            <Link
              to={isManufacturer ? "/manufacturer" : "/manufacturer/register"}
              className="hidden lg:flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-forest-900 hover:text-forest-950 bg-forest-100/70 hover:bg-forest-100 rounded-xl transition-colors border border-forest-200/70"
            >
              <Store size={14} className="text-forest-700" />
              <span>{isManufacturer ? 'Producer Hub' : 'Sell with Wangs'}</span>
            </Link>

            {/* Admin Hub Link */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-chilli-700 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-colors"
              >
                <Shield size={13} />
                <span>Admin Hub</span>
              </Link>
            )}

            {/* User Account Dropdown */}
            <div className="relative">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-800 hover:bg-stone-100/80 transition-colors"
                  >
                    <div className="w-6 h-6 rounded-full bg-forest-800 text-cream-50 flex items-center justify-center text-[11px] font-bold">
                      {user.first_name?.[0] || user.username[0].toUpperCase()}
                    </div>
                    <span className="hidden sm:inline">{user.first_name || user.username}</span>
                    <ChevronDown size={13} className="text-stone-400" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200/80 py-2 z-50 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2.5 border-b border-stone-100">
                        <p className="font-bold text-stone-900">{user.first_name} {user.last_name}</p>
                        <p className="text-stone-500 truncate text-[11px]">{user.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-forest-50 text-forest-800 text-[10px] font-bold rounded-full">
                          Role: {user.role}
                        </span>
                      </div>

                      <Link
                        to="/account"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-stone-700 hover:bg-cream-100"
                      >
                        <Package size={14} className="text-forest-700" /> My Orders & Saved Addresses
                      </Link>

                      {isManufacturer && (
                        <Link
                          to="/manufacturer"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-forest-800 font-semibold hover:bg-cream-100"
                        >
                          <Store size={14} className="text-forest-700" /> Producer Dashboard
                        </Link>
                      )}

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-chilli-700 font-semibold hover:bg-red-50"
                        >
                          <Shield size={14} className="text-chilli-600" /> Admin Console
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                          navigate('/');
                        }}
                        className="w-full text-left flex items-center gap-2.5 px-4 py-2 text-stone-600 hover:bg-red-50 hover:text-red-700 border-t border-stone-100 mt-1"
                      >
                        <LogOut size={14} /> Log Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-800 hover:text-forest-950 hover:bg-white/80 transition-colors border border-transparent hover:border-stone-200"
                >
                  <User size={15} />
                  <span>Sign In</span>
                </Link>
              )}
            </div>

            {/* Cart Trigger Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="relative p-2.5 rounded-xl bg-forest-900 hover:bg-forest-950 text-cream-50 shadow-sm flex items-center justify-center transition-all hover:scale-105"
              aria-label="Shopping Cart"
            >
              <ShoppingBag size={18} />
              {itemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-chilli-700 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {itemsCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-stone-700 hover:text-stone-900"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Sub-Navigation Categories Bar */}
        <nav className="hidden md:flex items-center gap-7 py-3 border-t border-stone-200/70 text-xs font-medium text-stone-700 overflow-x-auto">
          <Link to="/products" className="hover:text-forest-900 transition-colors whitespace-nowrap font-bold text-forest-950">
            All Pickles
          </Link>
          <Link to="/products?category=pork-pickle" className="hover:text-forest-900 transition-colors whitespace-nowrap">
            Smoked Pork
          </Link>
          <Link to="/products?category=chilli-pickle" className="hover:text-forest-900 transition-colors whitespace-nowrap">
            King Chilli (Raja Mircha)
          </Link>
          <Link to="/products?category=bamboo-shoot-pickle" className="hover:text-forest-900 transition-colors whitespace-nowrap">
            Bamboo Shoot (Bastenga)
          </Link>
          <Link to="/products?category=vegetarian-pickles" className="hover:text-forest-900 transition-colors whitespace-nowrap">
            Axone & Plant-Based
          </Link>
          <Link to="/products?category=fruit-pickle" className="hover:text-forest-900 transition-colors whitespace-nowrap">
            Wild Fruit & Starfruit
          </Link>
          <Link to="/about" className="hover:text-forest-900 transition-colors whitespace-nowrap text-stone-500 ml-auto font-normal">
            Heritage & Sourcing Standards
          </Link>
        </nav>

        {/* Mobile Nav Accordion */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-stone-200 flex flex-col gap-3">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search authentic pickles..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs"
              />
              <Search size={15} className="absolute left-3 top-2.5 text-stone-400" />
            </form>

            <div className="flex flex-col gap-2 text-sm pt-2">
              <Link to="/products" onClick={() => setMobileMenuOpen(false)} className="py-1 font-bold text-forest-950">
                All Authentic Pickles
              </Link>
              <Link to="/products?category=pork-pickle" onClick={() => setMobileMenuOpen(false)} className="py-1 text-stone-700">
                Smoked Pork Pickles
              </Link>
              <Link to="/products?category=chilli-pickle" onClick={() => setMobileMenuOpen(false)} className="py-1 text-stone-700">
                Raja Mircha (King Chilli)
              </Link>
              <Link to="/products?category=bamboo-shoot-pickle" onClick={() => setMobileMenuOpen(false)} className="py-1 text-stone-700">
                Bamboo Shoot (Bastenga)
              </Link>
              <Link to="/products?category=vegetarian-pickles" onClick={() => setMobileMenuOpen(false)} className="py-1 text-stone-700">
                Axone & Plant-Based Pickles
              </Link>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="py-1 text-stone-600">
                Heritage Story
              </Link>
              <Link to="/manufacturer/register" onClick={() => setMobileMenuOpen(false)} className="py-1 text-forest-800 font-semibold">
                Register as Manufacturer
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
