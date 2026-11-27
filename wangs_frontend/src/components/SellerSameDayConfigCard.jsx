import React, { useState, useEffect } from 'react';
import { Zap, MapPin, Clock, PauseCircle, PlayCircle, CheckCircle2, Save, RefreshCw } from 'lucide-react';
import { api } from '../api';

const WEEKDAYS = [
  { id: 0, label: 'Mon' },
  { id: 1, label: 'Tue' },
  { id: 2, label: 'Wed' },
  { id: 3, label: 'Thu' },
  { id: 4, label: 'Fri' },
  { id: 5, label: 'Sat' },
  { id: 6, label: 'Sun' },
];

export default function SellerSameDayConfigCard({ toast }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    same_day_enabled: false,
    same_day_paused: false,
    same_day_dispatch_town: '',
    same_day_dispatch_district: '',
    same_day_dispatch_state: 'Nagaland',
    same_day_operating_days: [0, 1, 2, 3, 4, 5],
    same_day_cutoff_time: '18:00',
    same_day_covered_towns: [],
    same_day_covered_pincodes: [],
  });
  const [products, setProducts] = useState([]);
  const [platformCoverage, setPlatformCoverage] = useState({
    zones: [],
    supported_towns: [],
    supported_pincodes: [],
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const res = await api.getManufacturerSameDaySettings();
        if (res?.settings) setSettings(res.settings);
        if (Array.isArray(res?.products)) setProducts(res.products);
        if (res?.platform_coverage) setPlatformCoverage(res.platform_coverage);
      } catch (err) {
        console.warn('Could not load same-day settings', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const toggleDay = (dayId) => {
    setSettings((prev) => {
      const exists = prev.same_day_operating_days.includes(dayId);
      return {
        ...prev,
        same_day_operating_days: exists
          ? prev.same_day_operating_days.filter((d) => d !== dayId)
          : [...prev.same_day_operating_days, dayId].sort((a, b) => a - b),
      };
    });
  };

  const toggleTown = (town) => {
    setSettings((prev) => {
      const exists = prev.same_day_covered_towns.some((t) => t.toLowerCase() === town.toLowerCase());
      return {
        ...prev,
        same_day_covered_towns: exists
          ? prev.same_day_covered_towns.filter((t) => t.toLowerCase() !== town.toLowerCase())
          : [...prev.same_day_covered_towns, town],
      };
    });
  };

  const togglePincode = (pin) => {
    setSettings((prev) => {
      const exists = prev.same_day_covered_pincodes.includes(pin);
      return {
        ...prev,
        same_day_covered_pincodes: exists
          ? prev.same_day_covered_pincodes.filter((p) => p !== pin)
          : [...prev.same_day_covered_pincodes, pin],
      };
    });
  };

  const toggleProductSameDay = (productId) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, same_day_eligible: !p.same_day_eligible } : p))
    );
  };

  const updateProductStock = (productId, nextStock) => {
    const qty = Math.max(0, parseInt(nextStock, 10) || 0);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, stock_quantity: qty } : p))
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.updateManufacturerSameDaySettings({
        ...settings,
        product_updates: products.map((p) => ({
          id: p.id,
          same_day_eligible: Boolean(p.same_day_eligible),
          stock_quantity: p.stock_quantity,
        })),
      });
      if (res?.settings) setSettings(res.settings);
      if (Array.isArray(res?.products)) setProducts(res.products);
      toast?.success('Get It Today settings saved successfully!');
    } catch (err) {
      toast?.error(err.message || 'Failed to save Get It Today settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-stone-200 flex items-center gap-2 text-xs text-stone-500">
        <RefreshCw size={14} className="animate-spin" />
        <span>Loading Get It Today (Same-Day) configuration...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-2xl border border-stone-200/90 p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
            <Zap size={18} />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-stone-900">
              Get It Today — Same-Day Fulfilment
            </h3>
            <p className="text-xs text-stone-500">
              Configure dispatch location, platform-supported coverage, operating schedule, cutoff time, and eligible products.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSettings((prev) => ({ ...prev, same_day_enabled: !prev.same_day_enabled }))}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
              settings.same_day_enabled
                ? 'bg-emerald-700 text-white'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            <CheckCircle2 size={13} />
            <span>{settings.same_day_enabled ? 'Same-Day Enabled' : 'Enable Same-Day'}</span>
          </button>

          {settings.same_day_enabled && (
            <button
              type="button"
              onClick={() => setSettings((prev) => ({ ...prev, same_day_paused: !prev.same_day_paused }))}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                settings.same_day_paused
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              {settings.same_day_paused ? <PlayCircle size={13} /> : <PauseCircle size={13} />}
              <span>{settings.same_day_paused ? 'Paused (Resume)' : 'Pause Same-Day'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Dispatch Location & Cutoff */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <label className="block font-bold text-stone-700 mb-1">Dispatch Town / City</label>
          <input
            type="text"
            value={settings.same_day_dispatch_town}
            onChange={(e) => setSettings({ ...settings, same_day_dispatch_town: e.target.value })}
            placeholder="e.g. Kohima"
            className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-emerald-700"
          />
        </div>
        <div>
          <label className="block font-bold text-stone-700 mb-1">Dispatch District</label>
          <input
            type="text"
            value={settings.same_day_dispatch_district}
            onChange={(e) => setSettings({ ...settings, same_day_dispatch_district: e.target.value })}
            placeholder="e.g. Kohima"
            className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-emerald-700"
          />
        </div>
        <div>
          <label className="block font-bold text-stone-700 mb-1">Dispatch State</label>
          <input
            type="text"
            value={settings.same_day_dispatch_state}
            onChange={(e) => setSettings({ ...settings, same_day_dispatch_state: e.target.value })}
            placeholder="e.g. Nagaland"
            className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-emerald-700"
          />
        </div>
        <div>
          <label className="block font-bold text-stone-700 mb-1 flex items-center gap-1">
            <Clock size={12} /> Daily Cutoff Time (IST)
          </label>
          <input
            type="time"
            value={settings.same_day_cutoff_time}
            onChange={(e) => setSettings({ ...settings, same_day_cutoff_time: e.target.value })}
            className="w-full px-3 py-2 border border-stone-300 rounded-xl focus:outline-none focus:border-emerald-700 font-mono"
          />
        </div>
      </div>

      {/* Operating Days */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-stone-700">Operating Days for Same-Day Orders</label>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d) => {
            const active = settings.same_day_operating_days.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDay(d.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-colors ${
                  active
                    ? 'bg-[#28452e] text-white border-[#28452e]'
                    : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Platform-Supported Delivery Coverage */}
      <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-stone-800">
          <MapPin size={14} className="text-emerald-800" />
          <span>Supported Delivery Towns &amp; PIN Codes (Platform Approved Zones Only)</span>
        </div>

        {platformCoverage.zones.length === 0 ? (
          <p className="text-xs text-amber-800">
            No active platform same-day delivery zones configured yet.
          </p>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold text-stone-500 mb-1.5">Towns / Cities:</p>
              <div className="flex flex-wrap gap-1.5">
                {platformCoverage.supported_towns.map((town) => {
                  const selected = settings.same_day_covered_towns.some((t) => t.toLowerCase() === town.toLowerCase());
                  return (
                    <button
                      key={town}
                      type="button"
                      onClick={() => toggleTown(town)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-pointer capitalize ${
                        selected
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-stone-700 border-stone-300 hover:border-emerald-700'
                      }`}
                    >
                      {town}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-stone-500 mb-1.5">PIN Codes:</p>
              <div className="flex flex-wrap gap-1.5">
                {platformCoverage.supported_pincodes.map((pin) => {
                  const selected = settings.same_day_covered_pincodes.includes(pin);
                  return (
                    <button
                      key={pin}
                      type="button"
                      onClick={() => togglePincode(pin)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold border cursor-pointer ${
                        selected
                          ? 'bg-emerald-700 text-white border-emerald-700'
                          : 'bg-white text-stone-700 border-stone-300 hover:border-emerald-700'
                      }`}
                    >
                      {pin}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Per-Product Same-Day Eligibility & Stock */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-stone-700">
          Product-Level Get It Today Eligibility &amp; Stock
        </label>
        <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
          {products.length === 0 ? (
            <p className="p-4 text-xs text-stone-500">No products found in your catalog.</p>
          ) : (
            products.map((prod) => (
              <div key={prod.id} className="p-3 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-stone-900 truncate">{prod.title}</p>
                  <p className="text-[11px] text-stone-500">
                    ₹{prod.price} · {prod.status} {prod.is_active ? '' : '· Inactive'}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <label className="flex items-center gap-1.5 text-[11px] text-stone-600">
                    <span>Stock:</span>
                    <input
                      type="number"
                      min="0"
                      value={prod.stock_quantity}
                      onChange={(e) => updateProductStock(prod.id, e.target.value)}
                      className="w-16 px-2 py-1 border border-stone-300 rounded-lg text-center font-mono font-bold text-stone-900"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => toggleProductSameDay(prod.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                      prod.same_day_eligible
                        ? 'bg-[#28452e] text-white'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {prod.same_day_eligible ? 'Same-Day On' : 'Same-Day Off'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-full bg-[#28452e] hover:bg-[#1e3523] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          <span>{saving ? 'Saving...' : 'Save Get It Today Settings'}</span>
        </button>
      </div>
    </form>
  );
}
