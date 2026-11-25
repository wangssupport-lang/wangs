import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  ShoppingBag, Search, User, ChevronDown, ChevronLeft, ChevronRight, ShieldCheck, Store,
  Sparkles, LogOut, Package, Heart, Truck, X, MapPin, Bell, ArrowRight,
  Trash2, Check, CheckSquare, Square, Mic
} from 'lucide-react';
import SwipeableNotificationItem from './SwipeableNotificationItem';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';

export default function Navbar() {
  const { user, requireAuth, isManufacturer, isAuthorizedToSell, allowSellerRegistration, logout } = useAuth();
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

  // Keep ref synchronized to avoid tearing down poll interval on every read/delete
  const readNotifIdsRef = useRef(readNotifIds);
  readNotifIdsRef.current = readNotifIds;
  const deletedNotifIdsRef = useRef(deletedNotifIds);
  deletedNotifIdsRef.current = deletedNotifIds;

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

        // Fast-path equality check to eliminate unnecessary re-renders
        setNotifications((prev) => {
          if (
            prev.length === notifs.length &&
            prev.every((item, idx) => item.id === notifs[idx]?.id && item.updated_at === notifs[idx]?.updated_at)
          ) {
            return prev;
          }
          return notifs;
        });

        // If there is an unread new seller notification, notify user once per session
        const curRead = readNotifIdsRef.current;
        const curDeleted = deletedNotifIdsRef.current;
        const unreadSellerNotifs = notifs.filter(
          (n) => n.type === 'NEW_SELLER' && !curRead.includes(n.id) && !curDeleted.includes(n.id)
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

    // 30-second background refresh rate for smooth real-time notification updates
    const pollInterval = setInterval(loadNotifications, 30000);

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
  }, []);

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
  const [isRibbonPaused, setIsRibbonPaused] = useState(false);

  const DEFAULT_RIBBON_MESSAGES = [
    {
      id: 'express-free',
      text: "Complimentary Express Delivery on Sun-Cured Heritage Pickles above ₹499 Across India",
      highlight: "100% Free",
      badge_color: "bg-emerald-600 text-white",
      link: "/products"
    },
    {
      id: 'kohima-local',
      text: "Kohima Delivery: Delivered within 12 hrs (30m–1h best case) • Nagaland: 1–2 days",
      highlight: "Express Local",
      badge_color: "bg-amber-400 text-stone-900 font-bold",
      link: "/delivery"
    },
    {
      id: 'free-spoon',
      text: "Orders above ₹699 receive a Free Handcrafted Neem Wood Tasting Spoon!",
      highlight: "Free Gift",
      badge_color: "bg-amber-300 text-stone-900 font-bold",
      link: "/products?bestsellers=true"
    },
    {
      id: 'heritage-demand',
      text: "Over 1,480+ heirloom packs cured & dispatched to connoisseurs across India this week",
      highlight: "High Demand",
      badge_color: "bg-white/20 text-white border border-white/30",
      link: "/products"
    }
  ];

  const cleanNoticeList = (list) => {
    if (!Array.isArray(list)) return [];
    return list.filter((n) => n && n.text && !n.text.toLowerCase().includes('ubecujwbc') && !n.text.toLowerCase().includes('wecwe'));
  };

  const [notices, setNotices] = useState(() => {
    try {
      const cached = localStorage.getItem('wangs_storefront_notices_cache') || sessionStorage.getItem('wangs_storefront_notices_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        const cleaned = cleanNoticeList(parsed);
        if (cleaned.length > 0) return cleaned;
      }
    } catch {}
    return DEFAULT_RIBBON_MESSAGES;
  });

  useEffect(() => {
    let cancelled = false;
    async function loadStorefrontNotices() {
      try {
        const res = await api.getPublicStorefrontNotices();
        const rawList = Array.isArray(res) ? res : res?.results || [];
        const list = cleanNoticeList(rawList);
        if (!cancelled && list.length > 0) {
          setNotices(list);
          try {
            localStorage.setItem('wangs_storefront_notices_cache', JSON.stringify(list));
            sessionStorage.setItem('wangs_storefront_notices_cache', JSON.stringify(list));
          } catch {}
        }
      } catch (err) {
        console.warn('Could not load dynamic storefront notices', err);
      }
    }

    loadStorefrontNotices();

    const handleNoticesChanged = () => loadStorefrontNotices();
    const handleStorageChange = (e) => {
      if (e.key === 'wangs_storefront_notices_cache' && e.newValue) {
        try {
          const updated = cleanNoticeList(JSON.parse(e.newValue));
          if (updated.length > 0) setNotices(updated);
        } catch {}
      } else if (e.key === 'wangs_notices_version') {
        loadStorefrontNotices();
      }
    };

    window.addEventListener('wangs_notices_changed', handleNoticesChanged);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      cancelled = true;
      window.removeEventListener('wangs_notices_changed', handleNoticesChanged);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const activeNotices = notices.length > 0 ? notices : DEFAULT_RIBBON_MESSAGES;

  const handlePrevNotice = (e) => {
    e?.stopPropagation?.();
    setRibbonIndex((prev) => (prev - 1 + activeNotices.length) % activeNotices.length);
  };

  const handleNextNotice = (e) => {
    e?.stopPropagation?.();
    setRibbonIndex((prev) => (prev + 1) % activeNotices.length);
  };

  useEffect(() => {
    if (isRibbonPaused) return;
    const timer = setInterval(() => {
      setRibbonIndex((prev) => (prev + 1) % activeNotices.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isRibbonPaused, activeNotices.length]);

  const currentNotice = activeNotices[ribbonIndex % activeNotices.length] || DEFAULT_RIBBON_MESSAGES[0];

  return (
    <header className="sticky top-0 z-40 bg-[#fbf8f3] shadow-xs w-full select-none border-b border-stone-200/60">
      {/* ========================================================
          1. TOP ANNOUNCEMENT NOTICE RIBBON (Dark Forest Green)
          ======================================================== */}
      <div
        className="bg-[#28452e] text-white text-[10px] sm:text-[11.5px] font-medium py-1.5 px-2 sm:px-4 transition-all duration-300 select-none"
        onMouseEnter={() => setIsRibbonPaused(true)}
        onMouseLeave={() => setIsRibbonPaused(false)}
        onTouchStart={() => setIsRibbonPaused(true)}
        onTouchEnd={() => setIsRibbonPaused(false)}
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-1.5">
          {/* Left Arrow */}
          <button
            type="button"
            onClick={handlePrevNotice}
            className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0 cursor-pointer"
            aria-label="Previous Notice"
            title="Previous Notice"
          >
            <ChevronLeft size={13} />
          </button>

          {/* Center Notice Content with Keyed Smooth Fade/Slide */}
          <Link
            to={currentNotice.link || '/products'}
            key={ribbonIndex}
            className="flex-1 min-w-0 flex items-center justify-center gap-1.5 overflow-hidden text-center hover:opacity-95 transition-opacity cursor-pointer animate-in fade-in duration-300"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse hidden xs:inline-block" />
            <span className="truncate tracking-tight font-medium">
              Handmade in small batches in Nagaland · Free Delivery Across India on orders above ₹499
            </span>
          </Link>

          {/* Right Arrow */}
          <button
            type="button"
            onClick={handleNextNotice}
            className="p-0.5 rounded text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0 cursor-pointer"
            aria-label="Next Notice"
            title="Next Notice"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* ========================================================
          2. MAIN NAVIGATION BAR
          ======================================================== */}
      <div className="bg-white border-b border-stone-200/50 text-stone-900">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8">
          
          {/* ----------------------------------------------------
              MOBILE TOP HEADER
              ---------------------------------------------------- */}
          <div className="md:hidden flex flex-col gap-2 pt-2.5 pb-2">
            <div className="flex items-center justify-between gap-1.5">
              {/* Brand Logo */}
              <Link to="/" className="flex items-center select-none shrink-0">
                <span className="font-logo text-2xl text-[#ab331c] tracking-normal leading-none">
                  Wangs
                </span>
              </Link>

              {/* Right Controls: Cart Pill + Profile Avatar */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  aria-label={`Shopping Basket with ${itemsCount} items`}
                  className="border border-stone-900 text-stone-900 text-[11px] font-bold px-3 py-1 rounded-full hover:bg-stone-900 hover:text-white transition-colors cursor-pointer"
                >
                  Cart ({itemsCount})
                </button>

                <Link
                  to={user ? '/account' : '/login'}
                  aria-label="Account"
                  className="w-7 h-7 rounded-full border border-stone-300 flex items-center justify-center bg-white text-stone-700 active:scale-95 transition-colors"
                >
                  {user ? (
                    <span className="font-bold text-xs text-[#ab331c]">
                      {(user.first_name || user.username || 'U')[0].toUpperCase()}
                    </span>
                  ) : (
                    <User size={15} />
                  )}
                </Link>
              </div>
            </div>

            {/* Mobile Row 2: Search Input */}
            <form onSubmit={handleSearch} className="relative w-full flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search pickles, spices..."
                className="w-full bg-white text-xs text-stone-900 placeholder:text-stone-400 rounded-full pl-4 pr-8 py-2 border border-stone-300 focus:outline-none focus:border-stone-900"
              />
              <button
                type="submit"
                className="absolute right-3 text-stone-400 hover:text-stone-800"
              >
                <Search size={14} />
              </button>
            </form>

            {/* Mobile Row 3: Category Nav Links */}
            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 text-xs font-medium text-stone-700">
              <Link to="/products" className="whitespace-nowrap hover:text-[#ab331c]">Pickles</Link>
              <Link to="/gift-boxes" className="whitespace-nowrap hover:text-[#ab331c] inline-flex items-center gap-1.5">
                <span>Gift Boxes</span>
                <span className="relative overflow-hidden inline-flex items-center gap-1 bg-[#f6df9d] text-stone-900 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ab331c] animate-pulse" />
                  <span>Coming Soon</span>
                  <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer-sweep" />
                </span>
              </Link>
              <Link to="/brands" className="whitespace-nowrap hover:text-[#ab331c]">Brands</Link>
            </div>
          </div>

          {/* ----------------------------------------------------
              DESKTOP NAVIGATION ROW (Exact Match to New Theme Spec)
              ---------------------------------------------------- */}
          <div className="hidden md:flex h-16 sm:h-[72px] items-center justify-between gap-4">
            {/* Left: Brand Logo & Wordmark */}
            <div className="flex items-center gap-6 lg:gap-8 shrink-0">
              <Link to="/" className="group flex items-center select-none shrink-0">
                <span className="font-logo text-3xl sm:text-4xl leading-none text-[#ab331c] group-hover:opacity-90 transition-opacity tracking-normal">
                  Wangs
                </span>
              </Link>

              {/* Navigation Links: Pickles, Gift Boxes (Coming Soon), Brands */}
              <nav className="flex items-center gap-5 lg:gap-7 text-xs font-medium text-stone-800">
                <Link to="/products" className="hover:text-[#ab331c] transition-colors">
                  Pickles
                </Link>
                <Link to="/gift-boxes" className="hover:text-[#ab331c] transition-colors inline-flex items-center gap-1.5 group">
                  <span>Gift Boxes</span>
                  <span className="relative overflow-hidden inline-flex items-center gap-1 bg-[#f6df9d] text-stone-900 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-[#e5c465]/60">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ab331c] opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#ab331c]" />
                    </span>
                    <span>Coming Soon</span>
                    <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer-sweep" />
                  </span>
                </Link>
                <Link to="/brands" className="hover:text-[#ab331c] transition-colors">
                  Brands
                </Link>
              </nav>
            </div>

            {/* Right: Search Input + Cart (0) Pill Button + Account */}
            <div className="flex items-center gap-3 shrink-0">
              <form onSubmit={handleSearch} className="relative flex items-center">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search pickles, spices..."
                  className="w-44 lg:w-56 bg-white rounded-full pl-4 pr-8 py-1.5 border border-stone-300 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2.5 text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
                  aria-label="Submit search"
                >
                  <Search size={14} />
                </button>
              </form>

              {/* Shopping Cart Pill Button - Exact Match: Cart (N) */}
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="border border-stone-900 hover:bg-stone-900 hover:text-white text-stone-900 text-xs font-semibold px-4 py-1.5 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                aria-label={`Shopping Basket with ${itemsCount} items`}
                title="Cart"
              >
                <span>Cart ({itemsCount})</span>
              </button>

              {/* User Profile / Notifications / Seller links */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-1 p-1 pr-1.5 rounded-full hover:bg-stone-200/50 transition-all cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#ab331c] text-white flex items-center justify-center font-bold text-xs">
                      {(user.first_name || user.username || 'U')[0].toUpperCase()}
                    </div>
                    <ChevronDown size={12} className="text-stone-500" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 z-50 text-xs text-stone-900">
                      <div className="px-4 py-2.5 border-b border-stone-100 bg-stone-50">
                        <p className="font-bold text-stone-900">{user.first_name} {user.last_name}</p>
                        <p className="text-stone-500 truncate text-[11px]">{user.email}</p>
                      </div>

                      <Link
                        to="/account"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-stone-900 hover:bg-stone-50 transition-colors font-medium"
                      >
                        <Package size={15} className="text-[#ab331c]" /> My Account &amp; Orders
                      </Link>

                      {(isManufacturer || allowSellerRegistration) && (
                        <Link
                          to={isManufacturer ? "/manufacturer" : "/manufacturer/register"}
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-stone-900 hover:bg-stone-50 transition-colors font-medium"
                        >
                          <Store size={15} className="text-[#28452e]" /> {isManufacturer ? "Seller Studio" : "Sell with Us"}
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-red-600 hover:bg-red-50 transition-colors font-medium text-left cursor-pointer"
                      >
                        <LogOut size={15} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to="/login"
                  className="text-xs font-semibold text-stone-700 hover:text-stone-900 px-2.5 py-1.5 transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
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

          {/* Modal Container: Mobile bottom-sheet with drag pill, desktop dropdown anchored under bell */}
          <div className="fixed inset-x-0 bottom-0 md:bottom-auto md:inset-x-auto md:absolute md:top-full md:right-4 lg:md:right-8 z-50 w-full md:w-[420px] max-h-[85vh] md:max-h-[80vh] bg-white rounded-t-3xl md:rounded-2xl shadow-2xl border-t md:border border-stone-200 overflow-hidden flex flex-col animate-in slide-in-from-bottom md:slide-in-from-top-2 duration-200 pb-[calc(env(safe-area-inset-bottom,0px)+8px)] md:pb-0">
            {/* Mobile Drag Handle */}
            <div className="md:hidden w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2.5 shrink-0" />
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

            {/* List of Notifications - GPU accelerated 120Hz momentum scrolling */}
            <div className="overflow-y-auto flex-1 p-2 max-h-[60vh] overscroll-contain gpu-accelerated" style={{ WebkitOverflowScrolling: 'touch' }}>
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
