import React, { useState, useEffect } from 'react';
import {
  Truck, ShieldCheck, Lock, Unlock, AlertCircle, Plus,
  CheckCircle2, XCircle, Clock, Package, DollarSign,
  Download, Printer, RefreshCw, Calculator, HelpCircle,
  ChevronRight, ExternalLink, ArrowRight, Eye, Trash2, Edit3,
  Calendar, MapPin, Tag, Sliders, Check, Search, Filter
} from 'lucide-react';
import { api } from '../api';

export default function AdminDeliveryTab({ toast }) {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('rates'); // 'rates', 'presets', 'zones', 'couriers', 'promotions'

  // Filters
  const [scopeFilter, setScopeFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [lockedFilter, setLockedFilter] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [submittingRate, setSubmittingRate] = useState(false);
  const [rateForm, setRateForm] = useState({
    title: '',
    scope: 'ZONE_DEFAULT',
    product: '',
    manufacturer: '',
    zone: '',
    courier: '',
    delivery_method: 'STANDARD',
    is_locked: true,
    base_rate: '80.00',
    per_package_rate: '80.00',
    max_items_per_package: 4,
    max_weight_per_package_grams: 1500,
    included_weight_grams: 1000,
    additional_weight_rate: '6.00',
    additional_weight_step_grams: 100,
    is_free_delivery: false,
    min_order_amount_for_free_delivery: '',
    same_day_cutoff_time: '',
    scheduled_days_of_week: 'MON, WED, FRI',
    min_packages_for_anyday: 2,
    estimated_delivery_days_min: 1,
    estimated_delivery_days_max: 2,
    estimated_delivery_note: '',
  });

  // Zone Modal
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [zoneForm, setZoneForm] = useState({
    name: '',
    code: '',
    state: 'Nagaland',
    description: '',
    cities_str: '',
    postal_codes_str: '',
    is_active: true
  });

  // Courier Modal
  const [courierModalOpen, setCourierModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState(null);
  const [courierForm, setCourierForm] = useState({
    name: '',
    code: '',
    description: '',
    pickup_origin: 'Kohima',
    pickup_charge: '0.00',
    tracking_url_template: '',
    is_active: true
  });

  // Promotion Modal
  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [promoForm, setPromoForm] = useState({
    name: '',
    promo_type: 'FREE_SHIPPING',
    discount_value: '0.00',
    min_spend: '999.00',
    zone: '',
    is_active: true
  });

  const loadOverview = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminDeliveryOverview();
      setOverview(res);
    } catch (err) {
      console.error('Failed to load admin delivery overview:', err);
      toast?.error(err.message || 'Failed to load delivery overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  // Presets activation
  const handleApplyPresets = async (activate = true) => {
    try {
      const res = await api.applyAdminDeliveryPresets(activate);
      toast?.success(res.detail || 'Presets applied successfully!');
      await loadOverview();
    } catch (err) {
      toast?.error(err.message || 'Failed to load SwiftZone presets');
    }
  };

  // Toggle approval requirement
  const handleToggleApprovalRequirement = async () => {
    try {
      const res = await api.toggleAdminMfgRateApproval();
      toast?.success(res.detail);
      await loadOverview();
    } catch (err) {
      toast?.error(err.message || 'Failed to toggle approval setting');
    }
  };

  // Toggle lock
  const handleToggleLock = async (rateId) => {
    try {
      const res = await api.toggleLockAdminDeliveryRate(rateId);
      toast?.success(res.detail);
      await loadOverview();
    } catch (err) {
      toast?.error(err.message || 'Failed to toggle rate lock');
    }
  };

  // Approve / Reject
  const handleApproveRate = async (rateId, action, reason = '') => {
    try {
      const res = await api.approveAdminDeliveryRate(rateId, { action, reason });
      toast?.success(res.detail);
      await loadOverview();
    } catch (err) {
      toast?.error(err.message || 'Failed to update rate approval');
    }
  };

  // Delete rate
  const handleDeleteRate = async (rateId, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete rate "${title}"?`)) return;
    try {
      await api.deleteAdminDeliveryRate(rateId);
      toast?.success('Rate deleted successfully');
      await loadOverview();
    } catch (err) {
      toast?.error(err.message || 'Failed to delete rate');
    }
  };

  // Rate Form Handlers
  const openNewRateModal = () => {
    setEditingRate(null);
    setRateForm({
      title: '',
      scope: 'ZONE_DEFAULT',
      product: '',
      manufacturer: '',
      zone: overview?.zones?.[0]?.id || '',
      courier: overview?.couriers?.[0]?.id || '',
      delivery_method: 'STANDARD',
      is_locked: true,
      base_rate: '80.00',
      per_package_rate: '80.00',
      max_items_per_package: 4,
      max_weight_per_package_grams: 1500,
      included_weight_grams: 1000,
      additional_weight_rate: '6.00',
      additional_weight_step_grams: 100,
      is_free_delivery: false,
      min_order_amount_for_free_delivery: '',
      same_day_cutoff_time: '',
      scheduled_days_of_week: 'MON, WED, FRI',
      min_packages_for_anyday: 2,
      estimated_delivery_days_min: 1,
      estimated_delivery_days_max: 2,
      estimated_delivery_note: '',
    });
    setRateModalOpen(true);
  };

  const openEditRateModal = (rate) => {
    setEditingRate(rate);
    const sched = Array.isArray(rate.scheduled_days_of_week)
      ? rate.scheduled_days_of_week.join(', ')
      : '';
    setRateForm({
      title: rate.title || '',
      scope: rate.scope || 'ZONE_DEFAULT',
      product: rate.product || '',
      manufacturer: rate.manufacturer || '',
      zone: rate.zone || '',
      courier: rate.courier || '',
      delivery_method: rate.delivery_method || 'STANDARD',
      is_locked: Boolean(rate.is_locked),
      base_rate: rate.base_rate || '0.00',
      per_package_rate: rate.per_package_rate || '0.00',
      max_items_per_package: rate.max_items_per_package || 4,
      max_weight_per_package_grams: rate.max_weight_per_package_grams || 1500,
      included_weight_grams: rate.included_weight_grams || 1000,
      additional_weight_rate: rate.additional_weight_rate || '6.00',
      additional_weight_step_grams: rate.additional_weight_step_grams || 100,
      is_free_delivery: Boolean(rate.is_free_delivery),
      min_order_amount_for_free_delivery: rate.min_order_amount_for_free_delivery || '',
      same_day_cutoff_time: rate.same_day_cutoff_time || '',
      scheduled_days_of_week: sched,
      min_packages_for_anyday: rate.min_packages_for_anyday || 2,
      estimated_delivery_days_min: rate.estimated_delivery_days_min || 1,
      estimated_delivery_days_max: rate.estimated_delivery_days_max || 2,
      estimated_delivery_note: rate.estimated_delivery_note || '',
    });
    setRateModalOpen(true);
  };

  const handleSaveRate = async (e) => {
    e.preventDefault();
    try {
      setSubmittingRate(true);
      const schedArr = rateForm.scheduled_days_of_week
        ? rateForm.scheduled_days_of_week.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
        : [];

      const payload = {
        ...rateForm,
        product: rateForm.product ? Number(rateForm.product) : null,
        manufacturer: rateForm.manufacturer ? Number(rateForm.manufacturer) : null,
        zone: rateForm.zone ? Number(rateForm.zone) : null,
        courier: rateForm.courier ? Number(rateForm.courier) : null,
        scheduled_days_of_week: schedArr,
        same_day_cutoff_time: rateForm.same_day_cutoff_time || null,
        min_order_amount_for_free_delivery: rateForm.min_order_amount_for_free_delivery || null,
      };

      if (editingRate) {
        await api.updateAdminDeliveryRate(editingRate.id, payload);
        toast?.success('Delivery rate updated successfully');
      } else {
        await api.createAdminDeliveryRate(payload);
        toast?.success('New delivery rate configured successfully');
      }
      setRateModalOpen(false);
      await loadOverview();
    } catch (err) {
      toast?.error(err.message || 'Failed to save delivery rate');
    } finally {
      setSubmittingRate(false);
    }
  };

  // Zone Save Handlers
  const handleSaveZone = async (e) => {
    e.preventDefault();
    try {
      const cities = zoneForm.cities_str.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
      const pins = zoneForm.postal_codes_str.split(',').map(s => s.trim()).filter(Boolean);

      const payload = {
        name: zoneForm.name,
        code: zoneForm.code.toUpperCase().replace(/\s+/g, '_'),
        state: zoneForm.state,
        description: zoneForm.description,
        cities,
        postal_codes: pins,
        is_active: zoneForm.is_active
      };

      if (editingZone) {
        await api.updateAdminDeliveryZone(editingZone.id, payload);
        toast?.success('Zone updated successfully');
      } else {
        await api.createAdminDeliveryZone(payload);
        toast?.success('New delivery zone created');
      }
      setZoneModalOpen(false);
      await loadOverview();
    } catch (err) {
      toast?.error(err.message || 'Failed to save delivery zone');
    }
  };

  const handleDeleteZone = async (id, name) => {
    if (!window.confirm(`Delete zone "${name}"? Existing rates using this zone may be affected.`)) return;
    try {
      await api.deleteAdminDeliveryZone(id);
      toast?.success('Delivery zone removed');
      await loadOverview();
    } catch (err) {
      toast?.error(err.message || 'Failed to delete zone');
    }
  };

  // Filtered rates list
  const filteredRates = (overview?.rates || []).filter(r => {
    if (scopeFilter && r.scope !== scopeFilter) return false;
    if (zoneFilter && String(r.zone) !== String(zoneFilter)) return false;
    if (lockedFilter === 'locked' && !r.is_locked) return false;
    if (lockedFilter === 'unlocked' && r.is_locked) return false;
    if (approvalFilter && r.approval_status !== approvalFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (r.title || '').toLowerCase().includes(q);
      const matchZone = (r.zone_name || '').toLowerCase().includes(q);
      const matchMfg = (r.manufacturer_name || '').toLowerCase().includes(q);
      const matchProd = (r.product_title || '').toLowerCase().includes(q);
      if (!matchTitle && !matchZone && !matchMfg && !matchProd) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="py-20 text-center">
        <RefreshCw size={36} className="animate-spin text-forest-800 mx-auto mb-3" />
        <p className="text-xs text-stone-500 font-mono">Loading Delivery & Shipping Administration...</p>
      </div>
    );
  }

  const stats = overview?.stats || {};

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-forest-100 text-forest-900">
              <Truck size={20} />
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-900">
              Shipping & Delivery Management
            </h2>
          </div>
          <p className="text-xs text-stone-500 max-w-2xl">
            Configure courier services (SwiftZone, BlueDart, India Post, Bus/Sumo), delivery zones, multi-package packing rates, weight surcharges, and rate locking.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleApplyPresets(true)}
            className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Load standard presets for Kohima, Dimapur, Zubza, Zakhama, BlueDart, etc."
          >
            <Download size={14} />
            <span>Load SwiftZone Presets</span>
          </button>

          <button
            onClick={openNewRateModal}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>New Delivery Rate</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[10px] text-stone-500 uppercase font-bold block">Total Rates</span>
          <span className="text-2xl font-bold font-serif text-stone-900">{stats.total_rates || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[10px] text-stone-500 uppercase font-bold block">Active Rates</span>
          <span className="text-2xl font-bold font-serif text-emerald-800">{stats.active_rates || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[10px] text-stone-500 uppercase font-bold block">Admin Locked</span>
          <span className="text-2xl font-bold font-serif text-amber-900 flex items-center gap-1">
            <Lock size={16} /> {stats.locked_rates || 0}
          </span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[10px] text-stone-500 uppercase font-bold block">Pending Review</span>
          <span className="text-2xl font-bold font-serif text-indigo-900">{stats.pending_approvals || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[10px] text-stone-500 uppercase font-bold block">Delivery Zones</span>
          <span className="text-2xl font-bold font-serif text-stone-900">{stats.total_zones || 0}</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-[10px] text-stone-500 uppercase font-bold block">Courier Partners</span>
          <span className="text-2xl font-bold font-serif text-stone-900">{stats.total_couriers || 0}</span>
        </div>
      </div>

      {/* Approval Requirement Toggle Ribbon */}
      <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <ShieldCheck size={20} className={overview?.require_mfg_rate_approval ? 'text-emerald-700' : 'text-stone-400'} />
          <div>
            <span className="font-bold text-stone-900 block">Manufacturer Rate Approval Policy</span>
            <span className="text-stone-500">
              {overview?.require_mfg_rate_approval
                ? 'Rates created by manufacturers must be reviewed and approved by Admin before activation.'
                : 'Manufacturer rates activate automatically upon creation without requiring manual approval.'}
            </span>
          </div>
        </div>

        <button
          onClick={handleToggleApprovalRequirement}
          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer shrink-0 ${
            overview?.require_mfg_rate_approval
              ? 'bg-emerald-800 text-white hover:bg-emerald-900'
              : 'bg-stone-200 text-stone-800 hover:bg-stone-300'
          }`}
        >
          {overview?.require_mfg_rate_approval ? 'Require Approval: ON' : 'Require Approval: OFF'}
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('rates')}
          className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'rates'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Shipping Rate Tables ({overview?.rates?.length || 0})
        </button>
        <button
          onClick={() => setActiveSubTab('presets')}
          className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'presets'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          SwiftZone & Partner Presets
        </button>
        <button
          onClick={() => setActiveSubTab('zones')}
          className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'zones'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Delivery Zones & PIN Codes ({overview?.zones?.length || 0})
        </button>
        <button
          onClick={() => setActiveSubTab('couriers')}
          className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'couriers'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Courier Services ({overview?.couriers?.length || 0})
        </button>
        <button
          onClick={() => setActiveSubTab('promotions')}
          className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'promotions'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Shipping Promotions ({overview?.promotions?.length || 0})
        </button>
      </div>

      {/* ==============================================================
          TAB 1: SHIPPING RATE TABLES
         ============================================================== */}
      {activeSubTab === 'rates' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Search rate, zone, product..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl w-48 focus:ring-2 focus:ring-slate-900"
              />

              <select
                value={scopeFilter}
                onChange={e => setScopeFilter(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl"
              >
                <option value="">All Scopes</option>
                <option value="ADMIN_DEFAULT">Admin Platform Default</option>
                <option value="ZONE_DEFAULT">Admin Zone Default</option>
                <option value="MANUFACTURER_ZONE">Manufacturer Zone Rate</option>
                <option value="PRODUCT_SPECIFIC">Product Specific</option>
              </select>

              <select
                value={zoneFilter}
                onChange={e => setZoneFilter(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl"
              >
                <option value="">All Zones</option>
                {overview?.zones?.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>

              <select
                value={lockedFilter}
                onChange={e => setLockedFilter(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl"
              >
                <option value="">All Locks</option>
                <option value="locked">Locked Only</option>
                <option value="unlocked">Unlocked Only</option>
              </select>

              <select
                value={approvalFilter}
                onChange={e => setApprovalFilter(e.target.value)}
                className="px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-xl"
              >
                <option value="">All Approvals</option>
                <option value="APPROVED">Approved</option>
                <option value="PENDING">Pending Review</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            <button
              onClick={loadOverview}
              className="p-1.5 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100"
              title="Refresh rates"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {/* Rates Table */}
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 bg-stone-50 text-stone-500 font-mono text-[10px] uppercase">
                    <th className="py-3 px-4">Rate & Scope</th>
                    <th className="py-3 px-4">Zone / Target</th>
                    <th className="py-3 px-4">Method & Courier</th>
                    <th className="py-3 px-4">Base / Per Box</th>
                    <th className="py-3 px-4">Weight Rules</th>
                    <th className="py-3 px-4">Lock Status</th>
                    <th className="py-3 px-4">Approval</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredRates.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-stone-400">
                        No delivery rates match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRates.map(rate => (
                      <tr key={rate.id} className="hover:bg-stone-50/50">
                        <td className="py-3 px-4">
                          <span className="font-bold text-stone-900 block font-serif">{rate.title}</span>
                          <span className="text-[10px] font-mono text-stone-400 uppercase">{rate.scope_display}</span>
                        </td>
                        <td className="py-3 px-4">
                          {rate.product_title && (
                            <span className="text-stone-800 font-bold block truncate max-w-[140px]">
                              {rate.product_title}
                            </span>
                          )}
                          <span className="text-stone-600 block">{rate.zone_name || 'Marketplace Platform Default'}</span>
                          {rate.manufacturer_name && (
                            <span className="text-[10px] text-stone-400 block truncate max-w-[140px]">
                              Mfg: {rate.manufacturer_name}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-stone-800 block">{rate.delivery_method_display}</span>
                          <span className="text-[10px] text-stone-500 font-mono">{rate.courier_name || 'SwiftZone'}</span>
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className="font-bold text-stone-900">₹{rate.base_rate}</span>
                          <span className="text-[10px] text-stone-400 block">+ ₹{rate.per_package_rate}/add'l box</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-[11px] text-stone-700 block">
                            {rate.included_weight_grams}g incl.
                          </span>
                          <span className="text-[10px] text-stone-500 block">
                            +₹{rate.additional_weight_rate} per {rate.additional_weight_step_grams}g
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleToggleLock(rate.id)}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                              rate.is_locked
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                                : 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200'
                            }`}
                            title="Click to toggle lock"
                          >
                            {rate.is_locked ? <Lock size={10} /> : <Unlock size={10} />}
                            <span>{rate.is_locked ? 'Locked' : 'Unlocked'}</span>
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          {rate.approval_status === 'PENDING' ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleApproveRate(rate.id, 'approve')}
                                className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px] hover:bg-emerald-700"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleApproveRate(rate.id, 'reject', 'Rate does not conform to regional benchmarks')}
                                className="px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[10px] hover:bg-red-700"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rate.approval_status === 'APPROVED' ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                            }`}>
                              {rate.approval_status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditRateModal(rate)}
                              className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100"
                              title="Edit rate"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteRate(rate.id, rate.title)}
                              className="p-1.5 text-red-600 hover:text-red-900 rounded-lg hover:bg-red-50"
                              title="Delete rate"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 2: SWIFTZONE & PARTNER PRESETS (REQUIREMENT 4)
         ============================================================== */}
      {activeSubTab === 'presets' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">
                  SwiftZone Courier Reference Presets
                </h3>
                <p className="text-xs text-stone-500">
                  Pickup origin: <strong>Kohima</strong>. Supplied business reference rates. Admin can activate and review them.
                </p>
              </div>

              <button
                onClick={() => handleApplyPresets(true)}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <CheckCircle2 size={15} />
                <span>Activate All Presets</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Kohima */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-stone-900 font-serif text-sm">Kohima Local</span>
                  <span className="font-serif text-forest-900">₹80 / pkg</span>
                </div>
                <p className="text-stone-600 text-[11px]">Same-day delivery within Kohima city colonies.</p>
                <div className="text-[10px] text-stone-500 font-mono">Weight: 1 kg included · ₹6/100g extra</div>
              </div>

              {/* Dimapur & Chümoukedima */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-stone-900 font-serif text-sm">Dimapur & Chümoukedima</span>
                  <span className="font-serif text-forest-900">₹110 / ₹200</span>
                </div>
                <p className="text-stone-600 text-[11px]">
                  Standard: ₹110 (1–2 days). Same-day pickup & delivery: ₹200 (Cutoff: 12:30 PM).
                </p>
                <div className="text-[10px] text-stone-500 font-mono">Weight: 1 kg included · ₹6/100g extra</div>
              </div>

              {/* Medziphema */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-stone-900 font-serif text-sm">Medziphema</span>
                  <span className="font-serif text-forest-900">₹150 / pkg</span>
                </div>
                <p className="text-stone-600 text-[11px]">1–2 business days delivery time.</p>
                <div className="text-[10px] text-stone-500 font-mono">Weight: 1 kg included · ₹6/100g extra</div>
              </div>

              {/* Zubza, Meriema & Jotsoma */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-stone-900 font-serif text-sm">Zubza, Meriema, Jotsoma</span>
                  <span className="font-serif text-forest-900">₹150 / pkg</span>
                </div>
                <p className="text-stone-600 text-[11px]">
                  Single package: Scheduled Mon/Wed/Fri. Multiple packages: Any day.
                </p>
                <div className="text-[10px] text-stone-500 font-mono">Weight: 1 kg included · ₹6/100g extra</div>
              </div>

              {/* Zakhama */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-stone-900 font-serif text-sm">Zakhama</span>
                  <span className="font-serif text-forest-900">₹170 / pkg</span>
                </div>
                <p className="text-stone-600 text-[11px]">
                  Single package: Scheduled Tue/Thu/Sat. Multiple packages: Any day.
                </p>
                <div className="text-[10px] text-stone-500 font-mono">Weight: 1 kg included · ₹6/100g extra</div>
              </div>

              {/* Bus / Sumo */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-stone-900 font-serif text-sm">Bus / Sumo Counter</span>
                  <span className="font-serif text-forest-900">₹85 base</span>
                </div>
                <p className="text-stone-600 text-[11px]">Direct counter dispatch across district shared taxi counters.</p>
                <div className="text-[10px] text-stone-500 font-mono">Additional Bus/Sumo configured per route</div>
              </div>

              {/* BlueDart North East */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-stone-900 font-serif text-sm">BlueDart (North East)</span>
                  <span className="font-serif text-forest-900">₹115 / ₹200</span>
                </div>
                <p className="text-stone-600 text-[11px]">&lt;500g: ₹115. Up to 1kg: ₹200. Strict weight pricing.</p>
                <div className="text-[10px] text-stone-500 font-mono">Pan-NE Air Cargo Route</div>
              </div>

              {/* BlueDart Rest of India */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-stone-900 font-serif text-sm">BlueDart (Rest of India)</span>
                  <span className="font-serif text-forest-900">₹115 / ₹210</span>
                </div>
                <p className="text-stone-600 text-[11px]">&lt;500g: ₹115. Up to 1kg: ₹210. Strict weight pricing.</p>
                <div className="text-[10px] text-stone-500 font-mono">Pan-India Express Air Network</div>
              </div>

              {/* India Post */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="text-stone-900 font-serif text-sm">India Post Speed Post</span>
                  <span className="font-serif text-forest-900">Free Pickup</span>
                </div>
                <p className="text-stone-600 text-[11px]">Doorstep kitchen pickup included. Standard postal charges.</p>
                <div className="text-[10px] text-stone-500 font-mono">4–7 business days nationwide</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 3: DELIVERY ZONES & PIN CODES
         ============================================================== */}
      {activeSubTab === 'zones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-stone-900">Configured Delivery Zones</h3>
            <button
              onClick={() => {
                setEditingZone(null);
                setZoneForm({
                  name: '',
                  code: '',
                  state: 'Nagaland',
                  description: '',
                  cities_str: '',
                  postal_codes_str: '',
                  is_active: true
                });
                setZoneModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add Zone</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overview?.zones?.map(zone => (
              <div key={zone.id} className="bg-white p-5 rounded-3xl border border-stone-200/90 shadow-2xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-base text-stone-900">{zone.name}</h4>
                    <span className="text-[10px] font-mono text-stone-400 uppercase">{zone.code} · {zone.state}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    zone.is_active ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {zone.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="text-xs space-y-1.5 p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Cities / Settlements:</span>
                    <span className="text-stone-800 font-mono text-[11px]">
                      {zone.cities?.length > 0 ? zone.cities.join(', ') : 'All in state'}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Postal PIN Codes:</span>
                    <span className="text-stone-800 font-mono text-[11px]">
                      {zone.postal_codes?.length > 0 ? zone.postal_codes.join(', ') : 'All regional PINs'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    onClick={() => {
                      setEditingZone(zone);
                      setZoneForm({
                        name: zone.name,
                        code: zone.code,
                        state: zone.state,
                        description: zone.description || '',
                        cities_str: (zone.cities || []).join(', '),
                        postal_codes_str: (zone.postal_codes || []).join(', '),
                        is_active: zone.is_active
                      });
                      setZoneModalOpen(true);
                    }}
                    className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteZone(zone.id, zone.name)}
                    className="p-1.5 text-red-600 hover:text-red-900 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 4: COURIER SERVICES
         ============================================================== */}
      {activeSubTab === 'couriers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-stone-900">Supported Courier Services</h3>
            <button
              onClick={() => {
                setEditingCourier(null);
                setCourierForm({
                  name: '',
                  code: '',
                  description: '',
                  pickup_origin: 'Kohima',
                  pickup_charge: '0.00',
                  tracking_url_template: '',
                  is_active: true
                });
                setCourierModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add Courier</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {overview?.couriers?.map(courier => (
              <div key={courier.id} className="bg-white p-5 rounded-3xl border border-stone-200/90 shadow-2xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-serif font-bold text-base text-stone-900">{courier.name}</h4>
                    <span className="text-[10px] font-mono text-stone-400 uppercase">{courier.code}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    courier.is_active ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-600'
                  }`}>
                    {courier.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <p className="text-xs text-stone-500 min-h-[36px] line-clamp-2">
                  {courier.description || 'Logistics service partner'}
                </p>

                <div className="text-[11px] text-stone-600 font-mono space-y-1">
                  <div>Origin: <strong>{courier.pickup_origin}</strong></div>
                  <div>Pickup: <strong>₹{courier.pickup_charge}</strong></div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
                  <button
                    onClick={() => {
                      setEditingCourier(courier);
                      setCourierForm({
                        name: courier.name,
                        code: courier.code,
                        description: courier.description || '',
                        pickup_origin: courier.pickup_origin,
                        pickup_charge: courier.pickup_charge,
                        tracking_url_template: courier.tracking_url_template || '',
                        is_active: courier.is_active
                      });
                      setCourierModalOpen(true);
                    }}
                    className="p-1.5 text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-100"
                  >
                    <Edit3 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 5: PROMOTIONS
         ============================================================== */}
      {activeSubTab === 'promotions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif font-bold text-base text-stone-900">Promotional Delivery Rules</h3>
            <button
              onClick={() => {
                setEditingPromo(null);
                setPromoForm({
                  name: 'Free Delivery on Orders over ₹999',
                  promo_type: 'FREE_SHIPPING',
                  discount_value: '0.00',
                  min_spend: '999.00',
                  zone: '',
                  is_active: true
                });
                setPromoModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add Promotion</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {overview?.promotions?.length === 0 ? (
              <div className="col-span-3 py-12 text-center text-stone-400 text-xs">
                No active delivery promotions configured.
              </div>
            ) : (
              overview?.promotions?.map(p => (
                <div key={p.id} className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 font-serif text-sm">{p.name}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
                      {p.promo_type}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">
                    Min spend: <strong>₹{p.min_spend}</strong> · Applies to: {p.zone_name || 'All Zones'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: RATE CREATE / EDIT
         ============================================================== */}
      {rateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-serif font-bold text-base text-stone-900">
                {editingRate ? 'Edit Shipping Rate' : 'Create Shipping Rate'}
              </h3>
              <button
                type="button"
                onClick={() => setRateModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Rate Title *</label>
                <input
                  type="text"
                  required
                  value={rateForm.title}
                  onChange={e => setRateForm({ ...rateForm, title: e.target.value })}
                  placeholder="e.g. SwiftZone Kohima Same-Day Priority"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Scope *</label>
                  <select
                    value={rateForm.scope}
                    onChange={e => setRateForm({ ...rateForm, scope: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                  >
                    <option value="ZONE_DEFAULT">Admin Zone Default</option>
                    <option value="ADMIN_DEFAULT">Admin Platform Default</option>
                    <option value="MANUFACTURER_ZONE">Manufacturer Zone Rate</option>
                    <option value="PRODUCT_SPECIFIC">Product Specific Rate</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Destination Zone</label>
                  <select
                    value={rateForm.zone}
                    onChange={e => setRateForm({ ...rateForm, zone: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                  >
                    <option value="">Platform Global Default</option>
                    {overview?.zones?.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Courier Service</label>
                  <select
                    value={rateForm.courier}
                    onChange={e => setRateForm({ ...rateForm, courier: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                  >
                    <option value="">None / Default</option>
                    {overview?.couriers?.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Method *</label>
                  <select
                    value={rateForm.delivery_method}
                    onChange={e => setRateForm({ ...rateForm, delivery_method: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                  >
                    <option value="STANDARD">Standard Delivery</option>
                    <option value="SAME_DAY">Same-Day Priority</option>
                    <option value="EXPRESS">Express Air Cargo</option>
                    <option value="BUS_SUMO">Bus / Sumo Dispatch</option>
                  </select>
                </div>
              </div>

              {/* Pricing & Packaging Box */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <span className="font-bold text-stone-900 block">Package Pricing & Weight Surcharges</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-600 mb-1">Base Charge (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={rateForm.base_rate}
                      onChange={e => setRateForm({ ...rateForm, base_rate: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">Per Additional Box (₹) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={rateForm.per_package_rate}
                      onChange={e => setRateForm({ ...rateForm, per_package_rate: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-600 mb-1">Included Weight (grams)</label>
                    <input
                      type="number"
                      value={rateForm.included_weight_grams}
                      onChange={e => setRateForm({ ...rateForm, included_weight_grams: parseInt(e.target.value) || 1000 })}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">Extra Weight Rate (₹ / 100g)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={rateForm.additional_weight_rate}
                      onChange={e => setRateForm({ ...rateForm, additional_weight_rate: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-600 mb-1">Same-Day Cutoff Time</label>
                    <input
                      type="time"
                      value={rateForm.same_day_cutoff_time}
                      onChange={e => setRateForm({ ...rateForm, same_day_cutoff_time: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">Scheduled Days (Single Box)</label>
                    <input
                      type="text"
                      placeholder="e.g. MON, WED, FRI"
                      value={rateForm.scheduled_days_of_week}
                      onChange={e => setRateForm({ ...rateForm, scheduled_days_of_week: e.target.value })}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Admin Lock Checkbox */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-amber-950">
                  <input
                    type="checkbox"
                    checked={rateForm.is_locked}
                    onChange={e => setRateForm({ ...rateForm, is_locked: e.target.checked })}
                    className="w-4 h-4 text-amber-800 rounded border-amber-300"
                  />
                  <span>Lock this rate (Highest priority, cannot be overridden by manufacturers)</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRateModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRate}
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-bold shadow-md cursor-pointer"
                >
                  {submittingRate ? 'Saving...' : (editingRate ? 'Update Rate' : 'Create Rate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================================
          MODAL: ZONE CREATE / EDIT
         ============================================================== */}
      {zoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <h3 className="font-serif font-bold text-base text-stone-900">
                {editingZone ? 'Edit Delivery Zone' : 'Create Delivery Zone'}
              </h3>
              <button
                type="button"
                onClick={() => setZoneModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Zone Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dimapur & Chümoukedima"
                  value={zoneForm.name}
                  onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Unique Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="DIMAPUR_CHUMOUKEDIMA"
                    value={zoneForm.code}
                    onChange={e => setZoneForm({ ...zoneForm, code: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">State / Region</label>
                  <input
                    type="text"
                    value={zoneForm.state}
                    onChange={e => setZoneForm({ ...zoneForm, state: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Cities / Settlements (Comma-separated)</label>
                <textarea
                  rows={2}
                  placeholder="dimapur, chümoukedima, chumoukedima, chumukedima"
                  value={zoneForm.cities_str}
                  onChange={e => setZoneForm({ ...zoneForm, cities_str: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">Postal PIN Codes / Prefixes (Comma-separated)</label>
                <textarea
                  rows={2}
                  placeholder="797112, 797113, 797115, 797103"
                  value={zoneForm.postal_codes_str}
                  onChange={e => setZoneForm({ ...zoneForm, postal_codes_str: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setZoneModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold shadow-md"
                >
                  Save Zone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
