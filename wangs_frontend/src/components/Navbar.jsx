import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag, Search, User, ChevronDown, ShieldCheck, Store,
  Sparkles, LogOut, Package, Heart, Truck, X, MapPin, Bell, ArrowRight,
  Trash2, Check, CheckSquare, Square
} from 'lucide-react';
import SwipeableNotificationItem from './SwipeableNotificationItem';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';

export default function Navbar() {
  const { user, isManufacturer, isAuthorizedToSell, allowSellerRegistration, logout } = useAuth();
  const { itemsCount, setIsDrawerOpen } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  // Notifications State (Real-time Seller Inflow & Announcements)
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('wangs_read_seller_notifs') || '[]');
    } catch {
      return [];
    }
  });
  const [deletedNotifIds, setDeletedNotifIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('wangs_deleted_notif_ids') || '[]');
    } catch {
      return [];
    }
  });

  // Multi-select mode state (triggered by long-press on any notification or select button)
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedNotifIds, setSelectedNotifIds] = useState([]);

  // Load public notification feed with automatic background refresh
  useEffect(() => {
    let cancelled = false;
    async function loadNotifications() {
      try {
        const notifs = await api.getPublicNotifications();
        if (cancelled || !Array.isArray(notifs)) return;
        setNotifications(notifs);

        // If there is an unread new seller notification, notify user once per session
        const unreadSellerNotifs = notifs.filter(
          (n) => n.type === 'NEW_SELLER' && !readNotifIds.includes(n.id) && !deletedNotifIds.includes(n.id)
        );

        if (unreadSellerNotifs.length > 0) {
          const newest = unreadSellerNotifs[0];
          const sessionGreeted = sessionStorage.getItem('wangs_notified_newest_seller');
          if (sessionGreeted !== newest.id) {
            sessionStorage.setItem('wangs_notified_newest_seller', newest.id);
            toast.success(
              `New Artisan Seller Joined: ${newest.business_name} (${newest.location_district || 'India'}) is now live on Wangs!`,
              5000
            );
          }
        }
      } catch (err) {
        console.warn('Could not load public notifications', err);
      }
    }

    loadNotifications();

    // 15-second background refresh rate for real-time notification updates
    const pollInterval = setInterval(loadNotifications, 15000);

    // Refresh immediately on tab focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadNotifications();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [readNotifIds, deletedNotifIds]);

  // Notifications visible after excluding deleted ones
  const visibleNotifications = notifications.filter((n) => !deletedNotifIds.includes(n.id));
  const unreadCount = visibleNotifications.filter((n) => !readNotifIds.includes(n.id)).length;

  const markAllNotificationsAsRead = () => {
    const allIds = visibleNotifications.map((n) => n.id);
    const updated = Array.from(new Set([...readNotifIds, ...allIds]));
    setReadNotifIds(updated);
    try {
      localStorage.setItem('wangs_read_seller_notifs', JSON.stringify(updated));
    } catch {}
    toast.success('Marked all as read');
  };

  const handleNotificationClick = (notif) => {
    if (!readNotifIds.includes(notif.id)) {
      const updated = [...readNotifIds, notif.id];
      setReadNotifIds(updated);
      try {
        localStorage.setItem('wangs_read_seller_notifs', JSON.stringify(updated));
      } catch {}
    }
    setNotificationsOpen(false);
    setIsSelectMode(false);
    setSelectedNotifIds([]);
    navigate(notif.link || '/brands');
  };

  // 1. Delete single notification (invoked by swipe-left or quick-delete)
  const handleDeleteSingleNotification = (id) => {
    const next = [...deletedNotifIds, id];
    setDeletedNotifIds(next);
    setSelectedNotifIds((prev) => prev.filter((item) => item !== id));
    try {
      localStorage.setItem('wangs_deleted_notif_ids', JSON.stringify(next));
    } catch {}
    toast.success('Notification deleted');
  };

  // 2. Delete all notifications
  const handleDeleteAllNotifications = () => {
    if (visibleNotifications.length === 0) return;
    if (window.confirm(`Delete all ${visibleNotifications.length} notifications?`)) {
      const allIds = visibleNotifications.map((n) => n.id);
      const next = Array.from(new Set([...deletedNotifIds, ...allIds]));
      setDeletedNotifIds(next);
      setSelectedNotifIds([]);
      setIsSelectMode(false);
      try {
        localStorage.setItem('wangs_deleted_notif_ids', JSON.stringify(next));
      } catch {}
      toast.success('All notifications cleared');
    }
  };

  // 3. Delete selected notifications
  const handleDeleteSelectedNotifications = () => {
    if (selectedNotifIds.length === 0) return;
    const count = selectedNotifIds.length;
    if (window.confirm(`Delete ${count} selected notification${count > 1 ? 's' : ''}?`)) {
      const next = Array.from(new Set([...deletedNotifIds, ...selectedNotifIds]));
      setDeletedNotifIds(next);
      setSelectedNotifIds([]);
      setIsSelectMode(false);
      try {
        localStorage.setItem('wangs_deleted_notif_ids', JSON.stringify(next));
      } catch {}
      toast.success(`Deleted ${count} notification${count > 1 ? 's' : ''}`);
    }
  };

  // 4. Long press on any notification: activates selection mode and selects that item
  const handleNotificationLongPress = (id) => {
    setIsSelectMode(true);
    setSelectedNotifIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  // 5. Toggle individual notification selection in select mode
  const handleToggleSelectNotif = (id) => {
    setSelectedNotifIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // 6. Toggle Select All / Deselect All
  const handleToggleSelectAll = () => {
    if (selectedNotifIds.length === visibleNotifications.length) {
      setSelectedNotifIds([]);
    } else {
      setSelectedNotifIds(visibleNotifications.map((n) => n.id));
    }
  };

  const handleCloseNotifications = () => {
    setNotificationsOpen(false);
    setIsSelectMode(false);
    setSelectedNotifIds([]);
  };

  // Public Categories for dynamic category navigation pills
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await api.getCategories();
        const list = Array.isArray(res) ? res : res?.results || [];
        setCategories(list);
      } catch (err) {
        console.warn('Could not load categories in Navbar', err);
      }
    }
    loadCategories();

    const handleCategoriesChanged = () => loadCategories();
    window.addEventListener('wangs_categories_changed', handleCategoriesChanged);
    return () => window.removeEventListener('wangs_categories_changed', handleCategoriesChanged);
  }, []);

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
    setNotificationsOpen(false);
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

  const [ribbonIndex, setRibbonIndex] = useState(0);
  const RIBBON_MESSAGES = [
    { text: "Complimentary Express Delivery on Sun-Cured Heritage Pickles above ₹499 Across India", highlight: "100% Free" },
    { text: "Kohima Delivery: Delivered within 12 hrs (30m–1h best case) • Nagaland: 1–2 days", highlight: "Express Local" },
    { text: "Orders above ₹699 receive a Free Handcrafted Neem Wood Tasting Spoon!", highlight: "Free Gift" },
    { text: "Over 1,480+ heirloom jars cured & dispatched to connoisseurs across India this week", highlight: "High Demand" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setRibbonIndex((prev) => (prev + 1) % 4);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#fff8f4] shadow-xs w-full select-none">
      {/* ========================================================
          1. TOP ANNOUNCEMENT RIBBON (Psychological Social Proof & Trust)
          ======================================================== */}
      <div className="bg-[#9b4100] text-white border-b border-[#bf550d] text-[10.5px] sm:text-[11px] font-medium py-1 px-3 sm:px-4 transition-all duration-300">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between font-label-md">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
            <span className="truncate">{RIBBON_MESSAGES[ribbonIndex].text}</span>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[#ffdbcb] shrink-0">
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

              {/* Right Controls: Notifications Bell + Cart + Profile Avatar */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Notifications Bell */}
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(!notificationsOpen)}
                  aria-label="Notifications"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#574238] hover:text-[#9b4100] relative hover:bg-[#faf2ed] transition-colors active:scale-95 cursor-pointer"
                  title="Marketplace Notifications"
                >
                  <Bell size={18} className="text-[#574238]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[14px] h-[14px] px-0.5 bg-[#9b4100] text-white text-[8px] font-bold rounded-full flex items-center justify-center ring-2 ring-[#fff8f4]">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Shopping Bag / Cart */}
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  aria-label={`Shopping Basket with ${itemsCount} items`}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#574238] hover:text-[#9b4100] relative hover:bg-[#faf2ed] transition-colors active:scale-95 cursor-pointer"
                  title="Cart"
                >
                  <ShoppingBag size={18} className="text-[#1e1b18]" />
                  {itemsCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 bg-[#9b4100] text-white font-bold text-[8.5px] rounded-full flex items-center justify-center">
                      {itemsCount > 99 ? '99+' : itemsCount}
                    </span>
                  )}
                </button>

                {/* Profile / Account Icon */}
                <Link
                  to={user ? '/account' : '/login'}
                  aria-label="Account"
                  className="w-8 h-8 rounded-full border border-[#dec0b3]/50 shadow-xs flex items-center justify-center bg-[#faf2ed] text-[#574238] hover:text-[#9b4100] active:scale-95 transition-colors"
                >
                  {user ? (
                    <span className="font-bold text-xs text-[#9b4100]">
                      {(user.first_name || user.username || 'U')[0].toUpperCase()}
                    </span>
                  ) : (
                    <User size={18} />
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

            {/* Mobile Row 3: Category Pills Strip (Dynamically based on categories entered by Admin) */}
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
                {categories.map((c) => (
                  <Link
                    key={c.id || c.slug}
                    to={`/products?category=${encodeURIComponent(c.slug)}`}
                    className={`h-7 px-3 rounded-full text-[11px] font-semibold whitespace-nowrap flex items-center shrink-0 transition-colors ${
                      currentCategory === c.slug
                        ? 'bg-[#9b4100] text-white shadow-[0_2px_6px_rgba(155,65,0,0.25)]'
                        : 'bg-[#f4ece7] text-[#574238] hover:bg-[#eee7e1] border border-[#dec0b3]/30'
                    }`}
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ----------------------------------------------------
              DESKTOP NAVIGATION ROW (Exact Match to Desktop Spec)
              ---------------------------------------------------- */}
          <div className="hidden md:flex h-16 sm:h-[72px] items-center justify-between gap-4">
            {/* Left: Brand Logo & Wordmark */}
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
              {/* Sell with Us CTA Button */}
              {(allowSellerRegistration || isAuthorizedToSell) && (
                <Link
                  to={isManufacturer ? "/manufacturer" : "/manufacturer/register"}
                  className="inline-flex items-center gap-1.5 bg-[#526048] text-white text-xs font-bold px-4 py-2 rounded-full hover:bg-[#3f4a36] transition-all shadow-xs active:scale-95"
                >
                  <Store size={15} />
                  <span>Sell with Us</span>
                </Link>
              )}

              {/* Wishlist Icon */}
              <Link
                to="/brands"
                className="relative p-2 rounded-full text-[#574238] hover:text-[#9b4100] hover:bg-[#faf2ed] transition-colors"
                title="Wishlist / Makers"
              >
                <Heart size={21} className="text-[#1e1b18]" />
              </Link>

              {/* Notifications Bell (Desktop) */}
              <button
                type="button"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-full text-[#574238] hover:text-[#9b4100] hover:bg-[#faf2ed] transition-colors cursor-pointer"
                title="Marketplace Notifications"
              >
                <Bell size={21} className="text-[#1e1b18]" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 bg-[#9b4100] text-white font-bold text-[8.5px] leading-tight rounded-full flex items-center justify-center ring-2 ring-[#fff8f4]">
                    {unreadCount}
                  </span>
                )}
              </button>

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
                        <Package size={15} className="text-[#9b4100]" /> My Account &amp; Orders
                      </Link>

                      {(allowSellerRegistration || isAuthorizedToSell || isManufacturer) && (
                        <Link
                          to={isManufacturer ? "/manufacturer" : "/manufacturer/register"}
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-[#904d00] font-bold hover:bg-[#faf2ed] transition-colors"
                        >
                          <Store size={15} className="text-[#904d00]" /> Sell with Us
                        </Link>
                      )}

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
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-[#faf2ed] border border-[#dec0b3]/50 transition-all text-[#574238] hover:text-[#9b4100]"
                  title="Sign In / Register"
                >
                  <div className="w-7 h-7 rounded-full bg-[#faf2ed] flex items-center justify-center text-[#574238]">
                    <User size={18} />
                  </div>
                  <ChevronDown size={13} className="text-[#8a7267]" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================
            3. SUB-NAVIGATION CATEGORY STRIP (DESKTOP ONLY)
            Exact Match to Desktop Design Spec (Dynamic Admin Categories)
            ======================================================== */}
        <div className="hidden md:block bg-[#faf2ed] border-t border-[#dec0b3]/30">
          <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-6 overflow-x-auto no-scrollbar py-2 text-xs font-semibold text-[#574238] whitespace-nowrap">
            <Link
              to="/products"
              className={`py-0.5 transition-colors ${!currentCategory ? 'text-[#9b4100] font-bold' : 'hover:text-[#9b4100]'}`}
            >
              All Pickles
            </Link>
            {categories.map((c) => (
              <Link
                key={c.id || c.slug}
                to={`/products?category=${encodeURIComponent(c.slug)}`}
                className={`py-0.5 transition-colors ${currentCategory === c.slug ? 'text-[#9b4100] font-bold' : 'hover:text-[#9b4100]'}`}
              >
                {c.name}
              </Link>
            ))}
            <Link to="/products?bestsellers=true" className="hover:text-[#9b4100] transition-colors py-0.5 ml-auto flex items-center gap-1 font-bold text-[#9b4100]">
              <Sparkles size={12} className="text-[#904d00]" /> Bestsellers
            </Link>
            <Link to="/brands" className="hover:text-[#9b4100] transition-colors py-0.5">
              Artisan Brands
            </Link>
          </div>
        </div>
      </div>

      {/* ========================================================
          NOTIFICATION CENTER (Real-Time Seller Inflow & Alerts)
          ======================================================== */}
      {notificationsOpen && (
        <>
          {/* Backdrop for closing */}
          <div
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px]"
            onClick={handleCloseNotifications}
          />

          <div className="fixed md:absolute top-14 md:top-full right-2 md:right-8 z-50 w-[calc(100vw-16px)] md:w-[390px] max-h-[82vh] bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header: Normal Mode vs Multi-Select Mode */}
            {isSelectMode ? (
              <div className="p-3 bg-[#241f1a] text-white flex items-center justify-between border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="flex items-center gap-1.5 text-xs font-bold text-white hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    <div className="w-4 h-4 rounded border border-white/60 bg-white/10 flex items-center justify-center">
                      {selectedNotifIds.length === visibleNotifications.length && visibleNotifications.length > 0 && (
                        <Check size={12} className="text-amber-400 stroke-[3]" />
                      )}
                    </div>
                    <span>{selectedNotifIds.length === visibleNotifications.length ? 'Deselect All' : 'Select All'}</span>
                  </button>
                  <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full text-stone-200 font-mono">
                    {selectedNotifIds.length} of {visibleNotifications.length}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={selectedNotifIds.length === 0}
                    onClick={handleDeleteSelectedNotifications}
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Trash2 size={12} />
                    <span>Delete ({selectedNotifIds.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSelectMode(false);
                      setSelectedNotifIds([]);
                    }}
                    className="px-2 py-1 text-xs text-stone-300 hover:text-white font-bold transition-colors cursor-pointer rounded-lg hover:bg-white/10"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-gradient-to-r from-[#181512] via-[#241f1a] to-[#181512] text-white flex items-center justify-between border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#9b4100] flex items-center justify-center text-white shadow-xs">
                    <Bell size={15} />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-sm leading-tight text-white flex items-center gap-1.5">
                      <span>Notifications</span>
                      {visibleNotifications.length > 0 && (
                        <span className="text-[10px] font-mono text-amber-300 font-bold bg-white/10 px-1.5 py-0.2 rounded-full">
                          {visibleNotifications.length}
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-stone-300">New seller arrivals &amp; harvest batches</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllNotificationsAsRead}
                      className="text-[10px] text-amber-300 hover:text-white font-bold transition-colors cursor-pointer"
                    >
                      Mark read
                    </button>
                  )}

                  {visibleNotifications.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsSelectMode(true)}
                        className="text-[10px] text-stone-300 hover:text-amber-300 font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Select notifications to delete"
                      >
                        <CheckSquare size={12} />
                        <span>Select</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDeleteAllNotifications}
                        className="text-[10px] text-stone-300 hover:text-red-400 font-bold transition-colors cursor-pointer flex items-center gap-1"
                        title="Delete all notifications"
                      >
                        <Trash2 size={12} />
                        <span>Clear All</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleCloseNotifications}
                    className="p-1 text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}

            {/* List of Notifications */}
            <div className="overflow-y-auto flex-1 p-2 max-h-[60vh]">
              {visibleNotifications.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-400">
                  <Bell size={26} className="mx-auto text-stone-300 mb-2" />
                  <p className="font-semibold text-stone-700">You're all caught up!</p>
                  <p className="text-[11px] mt-0.5 text-stone-500">All notifications have been cleared or read.</p>
                </div>
              ) : (
                visibleNotifications.map((notif) => (
                  <SwipeableNotificationItem
                    key={notif.id}
                    notif={notif}
                    isRead={readNotifIds.includes(notif.id)}
                    isSelectMode={isSelectMode}
                    isSelected={selectedNotifIds.includes(notif.id)}
                    onToggleSelect={handleToggleSelectNotif}
                    onLongPress={handleNotificationLongPress}
                    onClick={handleNotificationClick}
                    onDelete={handleDeleteSingleNotification}
                  />
                ))
              )}
            </div>

            {/* Footer with Gesture Guidance */}
            <div className="p-2 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-500 px-3">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live updates</span>
              </span>
              <span className="text-stone-400 italic">
                Swipe left to delete · Long press to select
              </span>
            </div>
          </div>
        </>
      )}

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
