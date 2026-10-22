import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag, Search, User, Menu, X, Shield,
  Truck, CheckCircle, ChevronDown, Store, LogOut, Package
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200">
      {/* Top Notification Banner */}
      <div className="bg-forest-900 text-cream-100 text-xs py-1.5 px-4 border-b border-forest-800">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-1.5 py-0.2 bg-chilli-700 text-white text-[10px] font-semibold rounded">
              Direct from Kohima
            </span>
            <span className="text-cream-200 text-[11px] hidden sm:inline">
              Handcrafted in Nagaland · Authentic traditional smoking & wild fermentation · Free delivery on orders over ₹999
            </span>
          </div>

          {/* Quick PIN Code Check */}
          <form onSubmit={handleCheckPincode} className="flex items-center gap-1.5">
            <Truck size={13} className="text-forest-400" />
            <input
              type="text"
              maxLength={6}
              value={pincode}
              onChange={(e) => setPincode(e.target.value)}
              placeholder="PIN code"
              className="w-20 px-2 py-0.5 bg-forest-950/70 border border-forest-700 rounded text-[11px] text-cream-100 placeholder:text-forest-400 focus:outline-none focus:border-forest-400"
            />
            <button
              type="submit"
              disabled={checkingPin}
              className="text-[11px] px-2 py-0.5 bg-forest-700 hover:bg-forest-600 rounded text-cream-50 font-medium transition-colors"
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

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-forest-900 text-cream-100 flex items-center justify-center font-serif font-black text-xl shadow-md border border-forest-700 group-hover:scale-105 transition-transform">
              W
            </div>
            <div>
              <span className="font-serif font-bold text-2xl tracking-tight text-forest-950 block leading-tight">
                Wangs
              </span>
              <span className="text-[10px] tracking-wider text-forest-700 font-semibold uppercase block">
                Naga Pickle Marketplace
              </span>
            </div>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-md relative mx-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search smoked pork, king chilli, bamboo shoot..."
              className="w-full pl-10 pr-4 py-2 bg-cream-50 border border-stone-200 rounded-full text-xs text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-forest-700/20 focus:border-forest-700 transition-all"
            />
            <Search size={16} className="absolute left-3.5 top-2.5 text-stone-400" />
            <button
              type="submit"
              className="absolute right-1.5 top-1 px-3 py-1 bg-forest-800 hover:bg-forest-900 text-white text-xs font-medium rounded-full transition-colors"
            >
              Search
            </button>
          </form>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-3">
            {/* Manufacturer Portal Link */}
            <Link
              to={isManufacturer ? "/manufacturer" : "/manufacturer/register"}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-forest-800 hover:text-forest-950 bg-forest-50 hover:bg-forest-100 rounded-lg transition-colors border border-forest-200/60"
            >
              <Store size={14} className="text-forest-700" />
              <span>{isManufacturer ? 'Seller Portal' : 'Sell with Us'}</span>
            </Link>

            {/* Admin Portal Link */}
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-chilli-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors"
              >
                <Shield size={13} />
                <span>Admin Hub</span>
              </Link>
            )}

            {/* Account Dropdown */}
            <div className="relative">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-stone-700 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                  >
                    <User size={15} className="text-forest-800" />
                    <span className="hidden sm:inline font-semibold">{user.first_name || user.username}</span>
                    <ChevronDown size={13} className="text-stone-400" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-stone-200 py-1.5 z-50 text-xs">
                      <div className="px-4 py-2 border-b border-stone-100">
                        <p className="font-semibold text-stone-900">{user.first_name} {user.last_name}</p>
                        <p className="text-stone-500 truncate text-[11px]">{user.email}</p>
                        <span className="inline-block mt-1 px-1.5 py-0.5 bg-stone-100 text-stone-600 text-[10px] font-semibold rounded">
                          Role: {user.role}
                        </span>
                      </div>

                      <Link
                        to="/account"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-stone-700 hover:bg-cream-100"
                      >
                        <Package size={14} /> My Orders & Profile
                      </Link>

                      {isManufacturer && (
                        <Link
                          to="/manufacturer"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-forest-800 font-semibold hover:bg-cream-100"
                        >
                          <Store size={14} /> Manufacturer Dashboard
                        </Link>
                      )}

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-chilli-700 font-semibold hover:bg-red-50"
                        >
                          <Shield size={14} /> Admin Dashboard
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                          navigate('/');
                        }}
                        className="w-full text-left flex items-center gap-2 px-4 py-2 text-stone-600 hover:bg-red-50 hover:text-red-700 border-t border-stone-100 mt-1"
                      >
                        <LogOut size={14} /> Log Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-700 hover:text-forest-900 hover:bg-cream-100 transition-colors"
                >
                  <User size={15} />
                  <span>Sign In</span>
                </Link>
              )}
            </div>

            {/* Cart Button */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="relative p-2.5 rounded-xl bg-forest-900 hover:bg-forest-950 text-white shadow-sm flex items-center justify-center transition-transform hover:scale-105"
              aria-label="Shopping Cart"
            >
              <ShoppingBag size={18} />
              {itemsCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-chilli-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                  {itemsCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-stone-700 hover:text-stone-900"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <nav className="hidden md:flex items-center gap-6 py-2.5 border-t border-stone-100 text-xs font-medium text-stone-700 overflow-x-auto">
          <Link to="/products" className="hover:text-forest-800 transition-colors whitespace-nowrap font-semibold text-forest-900">
            All Pickles
          </Link>
          <Link to="/products?category=pork-pickle" className="hover:text-forest-800 transition-colors whitespace-nowrap">
            Smoked Pork Pickles
          </Link>
          <Link to="/products?category=chilli-pickle" className="hover:text-forest-800 transition-colors whitespace-nowrap">
            Raja Mircha (King Chilli)
          </Link>
          <Link to="/products?category=bamboo-shoot-pickle" className="hover:text-forest-800 transition-colors whitespace-nowrap">
            Bamboo Shoot (Bastenga)
          </Link>
          <Link to="/products?category=vegetarian-pickles" className="hover:text-forest-800 transition-colors whitespace-nowrap">
            Axone & Veg Pickles
          </Link>
          <Link to="/products?category=fruit-pickle" className="hover:text-forest-800 transition-colors whitespace-nowrap">
            Wild Fruit & Starfruit
          </Link>
          <Link to="/about" className="hover:text-forest-800 transition-colors whitespace-nowrap text-stone-500 ml-auto">
            Our Naga Heritage
          </Link>
        </nav>

        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-stone-200 flex flex-col gap-3">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search authentic pickles..."
                className="w-full pl-9 pr-4 py-2 bg-cream-50 border border-stone-200 rounded-lg text-xs"
              />
              <Search size={15} className="absolute left-3 top-2.5 text-stone-400" />
            </form>

            <div className="flex flex-col gap-2 text-sm pt-2">
              <Link to="/products" onClick={() => setMobileMenuOpen(false)} className="py-1 font-semibold text-forest-900">
                All Authentic Pickles
              </Link>
              <Link to="/products?category=pork-pickle" onClick={() => setMobileMenuOpen(false)} className="py-1 text-stone-700">
                Pork Pickle
              </Link>
              <Link to="/products?category=chilli-pickle" onClick={() => setMobileMenuOpen(false)} className="py-1 text-stone-700">
                King Chilli (Raja Mircha)
              </Link>
              <Link to="/products?category=bamboo-shoot-pickle" onClick={() => setMobileMenuOpen(false)} className="py-1 text-stone-700">
                Bamboo Shoot (Bastenga)
              </Link>
              <Link to="/products?category=vegetarian-pickles" onClick={() => setMobileMenuOpen(false)} className="py-1 text-stone-700">
                Axone & Vegetarian
              </Link>
              <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="py-1 text-stone-600">
                About Wangs
              </Link>
              <Link to="/manufacturer/register" onClick={() => setMobileMenuOpen(false)} className="py-1 text-forest-800 font-medium">
                Register as Manufacturer
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
