import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin, Navigation, Clock, ShoppingBag, ArrowRight,
  RefreshCw, Search, X, Edit3
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { resolveProductImage } from '../utils/image';
import SeoHead from '../components/SeoHead';

const STORAGE_KEY = 'wangs_get_it_today_location_v1';

export default function GetItTodayPage() {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const toast = useToast();

  const [locationState, setLocationState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { postal_code: '', town: '', district: '', state: '' };
  });

  const [formLoc, setFormLoc] = useState(locationState);
  const [editingLocation, setEditingLocation] = useState(
    !locationState.postal_code && !locationState.town && !locationState.district
  );
  const [detectingGeo, setDetectingGeo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState({
    status_code: 'LOCATION_REQUIRED',
    message: 'Select or detect your location to see products available for same-day delivery.',
    products: [],
  });
  const [availableZones, setAvailableZones] = useState([]);
  const [addingId, setAddingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const hasSelectedLocation = Boolean(
    (locationState.postal_code || '').trim() ||
    (locationState.town || '').trim() ||
    (locationState.district || '').trim()
  );

  const loadAvailability = useCallback(async (loc) => {
    const clean = {
      postal_code: (loc.postal_code || '').trim(),
      town: (loc.town || '').trim(),
      district: (loc.district || '').trim(),
      state: (loc.state || '').trim(),
    };
    if (!clean.postal_code && !clean.town && !clean.district) {
      setResult({
        status_code: 'LOCATION_REQUIRED',
        message: 'Select or detect your location to see products available for same-day delivery.',
        products: [],
      });
      return;
    }

    setLoading(true);
    try {
      const data = await api.getItTodayProducts(clean);
      setResult(data);
    } catch (err) {
      toast.error(err.message || 'Could not check same-day availability');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    api.detectGetItTodayLocation({})
      .then((res) => {
        if (Array.isArray(res?.available_zones)) {
          setAvailableZones(res.available_zones);
        }
      })
      .catch(() => {});
  }, []);

  // Derive location from logged-in user's saved address if no location was manually set
  useEffect(() => {
    if (!user || hasSelectedLocation) return;
    let cancelled = false;
    api.getAddresses()
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res) ? res : (res?.results || []);
        if (!list.length) return;
        const chosen = list.find((a) => a.is_default) || list[0];
        const userLoc = {
          postal_code: (chosen.postal_code || '').trim(),
          town: (chosen.city || '').trim(),
          district: (chosen.city || '').trim(),
          state: (chosen.state || '').trim(),
        };
        if (userLoc.postal_code || userLoc.town) {
          setLocationState(userLoc);
          setFormLoc(userLoc);
          setEditingLocation(false);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user, hasSelectedLocation]);

  useEffect(() => {
    if (hasSelectedLocation) {
      loadAvailability(locationState);
    }
  }, [hasSelectedLocation, locationState, loadAvailability]);

  const applyLocation = async (nextLoc) => {
    const clean = {
      postal_code: (nextLoc.postal_code || '').trim(),
      town: (nextLoc.town || '').trim(),
      district: (nextLoc.district || '').trim(),
      state: (nextLoc.state || '').trim(),
    };
    if (!clean.postal_code && !clean.town && !clean.district) {
      toast.error('Enter a town, district, or 6-digit PIN code');
      return;
    }
    try {
      const validated = await api.detectGetItTodayLocation(clean);
      if (Array.isArray(validated?.available_zones)) {
        setAvailableZones(validated.available_zones);
      }
    } catch {}

    setLocationState(clean);
    setFormLoc(clean);
    setEditingLocation(false);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch {}
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    applyLocation(formLoc);
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation unavailable. Enter your location manually.');
      setEditingLocation(true);
      return;
    }

    setDetectingGeo(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1`
          );
          if (!resp.ok) throw new Error('Reverse geocoding unavailable');
          const geo = await resp.json();
          const addr = geo.address || {};
          const detected = {
            postal_code: (addr.postcode || '').replace(/\s+/g, '').slice(0, 6),
            town: addr.city || addr.town || addr.village || addr.suburb || '',
            district: addr.state_district || addr.county || '',
            state: addr.state || '',
          };
          if (!detected.postal_code && !detected.town && !detected.district) {
            toast.error('Could not detect town or PIN. Enter manually.');
            setEditingLocation(true);
          } else {
            await applyLocation(detected);
            toast.success('Location detected');
          }
        } catch {
          toast.error('Could not resolve address. Enter manually.');
          setEditingLocation(true);
        } finally {
          setDetectingGeo(false);
        }
      },
      () => {
        setDetectingGeo(false);
        setEditingLocation(true);
        toast.error('Location permission denied. Enter manually.');
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleAddToCart = async (product) => {
    setAddingId(product.id);
    try {
      await addToCart(product.id, 1);
      toast.success(`${product.title} added to basket`);
    } catch (err) {
      toast.error(err.message || 'Could not add item');
    } finally {
      setAddingId(null);
    }
  };

  const formattedLocationLabel = [
    locationState.town,
    locationState.district && locationState.district !== locationState.town ? locationState.district : '',
    locationState.postal_code ? `PIN ${locationState.postal_code}` : '',
  ]
    .filter(Boolean)
    .join(', ');

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredProducts = (result.products || []).filter((p) => {
    if (!normalizedQuery) return true;
    const text = [
      p.title,
      p.same_day_info?.seller_name,
      p.manufacturer?.business_name,
      p.category?.name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return text.includes(normalizedQuery);
  });

  return (
    <div className="relative overflow-hidden">
      {/* Subtle Ambient Orbs for True Liquid-Glass Refraction */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-16 -left-20 w-72 h-72 rounded-full bg-emerald-200/35 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute top-10 -right-16 w-72 h-72 rounded-full bg-amber-200/35 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4">
      <SeoHead
        title="Get It Today | Same-Day Regional Delivery at Wangs"
        description="Discover products available near you and get them delivered today on Wangs."
        canonicalPath="/get-it-today"
      />

      {/* Minimal Editorial Header */}
      <div className="flex items-end justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Get It Today
          </h1>
          <p className="text-xs sm:text-sm text-stone-600">
            Discover products available near you and get them delivered today.
          </p>
        </div>
        {result.status_code === 'PRODUCTS_AVAILABLE' && filteredProducts.length > 0 && (
          <span className="hidden sm:inline-flex items-center px-3.5 py-1.5 rounded-full bg-white/65 backdrop-blur-xl border border-white/90 ring-1 ring-stone-200/60 text-[11px] font-semibold text-[#28452e] shadow-[0_4px_14px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]">
            {filteredProducts.length} ready today
          </span>
        )}
      </div>

      {/* Multi-Layer Liquid-Glass Location + Search Card */}
      <div className="bg-gradient-to-br from-white/80 via-white/65 to-white/45 backdrop-blur-xl rounded-2xl border border-white/90 ring-1 ring-stone-900/5 p-3 sm:p-4 space-y-2.5 shadow-[0_12px_36px_rgba(28,25,23,0.06),inset_0_1px_1px_rgba(255,255,255,0.95)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-full bg-[#ab331c]/12 backdrop-blur-md border border-[#ab331c]/15 text-[#ab331c] flex items-center justify-center shrink-0">
              <MapPin size={14} />
            </span>
            <span className="text-xs sm:text-sm font-semibold text-stone-800 break-words">
              {hasSelectedLocation ? formattedLocationLabel : 'Select delivery location'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={detectingGeo}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ab331c]/90 hover:bg-[#ab331c] backdrop-blur-md border border-white/25 text-white text-[11px] font-bold shadow-[0_6px_18px_rgba(171,51,28,0.28),inset_0_1px_0_rgba(255,255,255,0.3)] hover:shadow-[0_8px_22px_rgba(171,51,28,0.36)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer disabled:opacity-60"
            >
              {detectingGeo ? <RefreshCw size={11} className="animate-spin" /> : <Navigation size={11} />}
              <span>{detectingGeo ? 'Detecting' : 'Detect Location'}</span>
            </button>
            <button
              type="button"
              onClick={() => setEditingLocation((prev) => !prev)}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/55 hover:bg-white/90 backdrop-blur-lg border border-white/90 ring-1 ring-stone-200/70 shadow-[0_4px_14px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.95)] hover:-translate-y-0.5 active:translate-y-0 text-stone-800 text-[11px] font-semibold transition-all duration-200 cursor-pointer"
            >
              <Edit3 size={11} />
              <span>{editingLocation ? 'Close' : 'Change Area'}</span>
            </button>
          </div>
        </div>

        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3.5 text-stone-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pickles, sellers..."
            className="w-full bg-white/60 focus:bg-white/95 backdrop-blur-md text-xs text-stone-900 placeholder:text-stone-400 rounded-full pl-9 pr-9 py-2 border border-white/80 ring-1 ring-stone-200/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)] focus:outline-none focus:ring-2 focus:ring-[#28452e]/20 transition-all duration-200"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {editingLocation && (
          <form onSubmit={handleManualSubmit} className="pt-2.5 border-t border-stone-100 space-y-2.5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <input
                type="text"
                value={formLoc.town}
                onChange={(e) => setFormLoc({ ...formLoc, town: e.target.value })}
                placeholder="Town / City"
                className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#28452e]"
              />
              <input
                type="text"
                value={formLoc.district}
                onChange={(e) => setFormLoc({ ...formLoc, district: e.target.value })}
                placeholder="District"
                className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#28452e]"
              />
              <input
                type="text"
                value={formLoc.state}
                onChange={(e) => setFormLoc({ ...formLoc, state: e.target.value })}
                placeholder="State"
                className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs focus:outline-none focus:border-[#28452e]"
              />
              <input
                type="text"
                maxLength={6}
                value={formLoc.postal_code}
                onChange={(e) => setFormLoc({ ...formLoc, postal_code: e.target.value.replace(/\D/g, '') })}
                placeholder="PIN Code"
                className="px-3 py-1.5 rounded-xl border border-stone-300 text-xs font-mono focus:outline-none focus:border-[#28452e]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {availableZones.map((z) => (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() =>
                      applyLocation({
                        town: z.cities?.[0] ? z.cities[0].replace(/\b\w/g, (c) => c.toUpperCase()) : z.name,
                        district: z.cities?.[0] ? z.cities[0].replace(/\b\w/g, (c) => c.toUpperCase()) : '',
                        state: z.state || 'Nagaland',
                        postal_code: z.postal_codes?.[0] || '',
                      })
                    }
                    className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-semibold cursor-pointer"
                  >
                    {z.name}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                className="px-4 py-1.5 rounded-full bg-[#28452e] text-white text-xs font-bold cursor-pointer ml-auto"
              >
                Apply
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-xs text-stone-500 flex items-center justify-center gap-2">
          <RefreshCw size={15} className="animate-spin text-[#ab331c]" />
          <span>Checking availability...</span>
        </div>
      ) : result.status_code === 'PRODUCTS_AVAILABLE' ? (
        filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-2">
            <p className="text-xs sm:text-sm text-stone-700">No same-day products match &ldquo;{searchQuery}&rdquo;.</p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="px-4 py-1.5 rounded-full border border-stone-300 text-xs font-semibold cursor-pointer"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((product) => {
              const info = product.same_day_info || {};
              const img = resolveProductImage(product.primary_image_url || product.images?.[0]?.image_url);
              return (
                <div
                  key={product.id}
                  className="group bg-white/75 hover:bg-white/95 backdrop-blur-lg rounded-2xl border border-white/90 ring-1 ring-stone-200/60 overflow-hidden flex flex-col justify-between shadow-[0_8px_28px_rgba(28,25,23,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] hover:shadow-[0_16px_36px_rgba(28,25,23,0.09)] hover:-translate-y-1 transition-all duration-300"
                >
                  <div>
                    <Link to={`/product/${product.slug}`} className="block aspect-square bg-[#fbf8f3] overflow-hidden relative">
                      <img src={img} alt={product.title} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500" />
                      <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-[#28452e]/80 backdrop-blur-md border border-white/30 text-white text-[9px] font-bold shadow-[0_4px_12px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.25)]">
                        Today
                      </span>
                    </Link>

                    <div className="p-2.5 sm:p-3 space-y-1">
                      <Link to={`/product/${product.slug}`} className="block font-serif text-xs sm:text-sm font-bold text-stone-900 group-hover:text-[#ab331c] transition-colors leading-snug line-clamp-2">
                        {product.title}
                      </Link>
                      <p className="text-xs sm:text-sm font-bold text-[#ab331c]">
                        ₹{Number(product.price).toFixed(0)}
                      </p>
                      <p className="text-[10px] sm:text-[11px] text-stone-500 truncate">
                        {info.seller_name || product.manufacturer?.business_name}
                        {info.seller_location ? ` · ${info.seller_location}` : ''}
                      </p>
                      {info.estimated_delivery_window && (
                        <p className="text-[10px] text-emerald-800 font-medium flex items-start gap-1 leading-tight">
                          <Clock size={10} className="shrink-0 mt-0.5" />
                          <span>{info.estimated_delivery_window}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="px-2.5 pb-2.5 sm:px-3 sm:pb-3">
                    <button
                      type="button"
                      onClick={() => handleAddToCart(product)}
                      disabled={addingId === product.id}
                      className="w-full py-2 rounded-full bg-[#ab331c]/90 hover:bg-[#ab331c] backdrop-blur-md border border-white/25 text-white text-[11px] sm:text-xs font-bold flex items-center justify-center gap-1 shadow-[0_4px_14px_rgba(171,51,28,0.24),inset_0_1px_0_rgba(255,255,255,0.28)] hover:shadow-[0_8px_20px_rgba(171,51,28,0.34)] active:scale-[0.98] transition-all duration-200 cursor-pointer disabled:opacity-60"
                    >
                      <ShoppingBag size={12} />
                      <span>{addingId === product.id ? 'Adding...' : 'Add to Cart'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="bg-white/75 backdrop-blur-xl rounded-2xl border border-white/90 ring-1 ring-stone-200/60 p-6 sm:p-10 text-center space-y-3 shadow-[0_8px_28px_rgba(28,25,23,0.05)]">
          <p className="text-xs sm:text-sm text-stone-700 max-w-md mx-auto">
            {result.message}
          </p>
          {result.status_code !== 'LOCATION_REQUIRED' && (
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#28452e]/95 hover:bg-[#28452e] text-white text-xs font-bold shadow-[0_4px_14px_rgba(40,69,46,0.25)] transition-all"
            >
              <span>Explore All Wangs Products</span>
              <ArrowRight size={13} />
            </Link>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
