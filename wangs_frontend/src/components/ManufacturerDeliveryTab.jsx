import React, { useState, useEffect } from 'react';
import {
  Truck, ShieldCheck, Lock, Unlock, AlertCircle, Plus,
  CheckCircle2, XCircle, Clock, Package, DollarSign,
  Download, Printer, RefreshCw, Calculator, HelpCircle,
  ChevronRight, ExternalLink, ArrowRight, Eye, Trash2, Edit3
} from 'lucide-react';
import { api } from '../api';

export default function ManufacturerDeliveryTab({ profile, toast }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    own_rates: [],
    admin_baseline_rates: [],
    zones: [],
    couriers: [],
    products: []
  });

  const [shippingHistory, setShippingHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('rates'); // 'rates', 'sticker', 'calculator', 'history'

  // Modal State for Rate Create / Edit
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState(null);
  const [submittingRate, setSubmittingRate] = useState(false);
  const [rateForm, setRateForm] = useState({
    title: '',
    product: '',
    zone: '',
    delivery_method: 'STANDARD',
    courier: '',
    base_rate: '80.00',
    per_package_rate: '80.00',
    max_items_per_package: 4,
    max_weight_per_package_grams: 1500,
    included_weight_grams: 1000,
    additional_weight_rate: '6.00',
    additional_weight_step_grams: 100,
    is_free_delivery: false,
    min_order_amount_for_free_delivery: '',
    estimated_delivery_note: '1–2 Business Days',
  });

  // Test Calculator State
  const [calcForm, setCalcForm] = useState({
    product_id: '',
    quantity: 1,
    postal_code: '797001',
    city: 'Kohima',
    delivery_method: 'STANDARD'
  });
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcResult, setCalcResult] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await api.getManufacturerDeliveryRates();
      setData(res);
      if (res.products && res.products.length > 0 && !calcForm.product_id) {
        setCalcForm(prev => ({ ...prev, product_id: res.products[0].id }));
      }
    } catch (err) {
      console.error('Failed to load delivery rates:', err);
      toast?.error(err.message || 'Failed to load delivery rates');
    } finally {
      setLoading(false);
    }
  };

  const loadShippingHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.getManufacturerShippingHistory();
      setShippingHistory(res);
    } catch (err) {
      console.error('Failed to load shipping history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadData();
    loadShippingHistory();
  }, []);

  const openNewRateModal = () => {
    setEditingRate(null);
    setRateForm({
      title: '',
      product: '',
      zone: data.zones.length > 0 ? data.zones[0].id : '',
      delivery_method: 'STANDARD',
      courier: data.couriers.length > 0 ? data.couriers[0].id : '',
      base_rate: '80.00',
      per_package_rate: '80.00',
      max_items_per_package: 4,
      max_weight_per_package_grams: 1500,
      included_weight_grams: 1000,
      additional_weight_rate: '6.00',
      additional_weight_step_grams: 100,
      is_free_delivery: false,
      min_order_amount_for_free_delivery: '',
      estimated_delivery_note: '1–2 Business Days',
    });
    setRateModalOpen(true);
  };

  const openEditRateModal = (rate) => {
    if (rate.is_locked) {
      toast?.error('This rate is locked by Platform Admin and cannot be edited.');
      return;
    }
    setEditingRate(rate);
    setRateForm({
      title: rate.title || '',
      product: rate.product || '',
      zone: rate.zone || '',
      delivery_method: rate.delivery_method || 'STANDARD',
      courier: rate.courier || '',
      base_rate: rate.base_rate || '0.00',
      per_package_rate: rate.per_package_rate || '0.00',
      max_items_per_package: rate.max_items_per_package || 4,
      max_weight_per_package_grams: rate.max_weight_per_package_grams || 1500,
      included_weight_grams: rate.included_weight_grams || 1000,
      additional_weight_rate: rate.additional_weight_rate || '6.00',
      additional_weight_step_grams: rate.additional_weight_step_grams || 100,
      is_free_delivery: Boolean(rate.is_free_delivery),
      min_order_amount_for_free_delivery: rate.min_order_amount_for_free_delivery || '',
      estimated_delivery_note: rate.estimated_delivery_note || '',
    });
    setRateModalOpen(true);
  };

  const handleSaveRate = async (e) => {
    e.preventDefault();
    try {
      setSubmittingRate(true);
      const payload = {
        ...rateForm,
        product: rateForm.product ? Number(rateForm.product) : null,
        zone: rateForm.zone ? Number(rateForm.zone) : null,
        courier: rateForm.courier ? Number(rateForm.courier) : null,
        min_order_amount_for_free_delivery: rateForm.min_order_amount_for_free_delivery ? rateForm.min_order_amount_for_free_delivery : null,
      };

      if (!payload.title.trim()) {
        const prod = data.products.find(p => p.id === payload.product);
        const z = data.zones.find(zn => zn.id === payload.zone);
        payload.title = prod ? `${prod.title} Delivery Rate` : (z ? `${z.name} Rate` : 'Custom Delivery Rate');
      }

      if (editingRate) {
        await api.updateManufacturerDeliveryRate(editingRate.id, payload);
        toast?.success('Delivery rate updated successfully!');
      } else {
        await api.createManufacturerDeliveryRate(payload);
        toast?.success('New delivery rate submitted successfully!');
      }
      setRateModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save delivery rate:', err);
      toast?.error(err.message || 'Failed to save delivery rate.');
    } finally {
      setSubmittingRate(false);
    }
  };

  const handleDeleteRate = async (rateId, isLocked) => {
    if (isLocked) {
      toast?.error('Cannot delete an admin-locked rate.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this delivery rate?')) return;
    try {
      await api.deleteManufacturerDeliveryRate(rateId);
      toast?.success('Delivery rate removed.');
      await loadData();
    } catch (err) {
      toast?.error(err.message || 'Failed to delete delivery rate.');
    }
  };

  const handleRunTestCalc = async (e) => {
    e?.preventDefault();
    if (!calcForm.product_id) {
      toast?.error('Please select a product for the test calculation.');
      return;
    }
    try {
      setCalcLoading(true);
      const res = await api.previewManufacturerDeliveryQuote(calcForm);
      setCalcResult(res);
    } catch (err) {
      toast?.error(err.message || 'Error running delivery calculation preview.');
    } finally {
      setCalcLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <RefreshCw size={32} className="animate-spin text-forest-800 mx-auto mb-3" />
        <p className="text-xs text-stone-500 font-mono">Loading delivery configurations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Sub-Navigation */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-forest-100 text-forest-900">
              <Truck size={18} />
            </span>
            <h2 className="text-xl font-bold font-serif text-stone-900">
              Delivery Charges & Packaging Management
            </h2>
          </div>
          <p className="text-xs text-stone-500 max-w-2xl">
            Configure shipping rates for your authentic artisan products, choose supported delivery methods, download official Wangs tamper-evident packaging stickers, and preview live calculations.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveSubTab('sticker')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'sticker'
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <Download size={14} />
            <span>Packing Sticker Kit</span>
          </button>

          <button
            onClick={openNewRateModal}
            className="px-4 py-2 bg-forest-900 hover:bg-forest-950 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus size={14} />
            <span>Add Delivery Rate</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('rates')}
          className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'rates'
              ? 'border-forest-900 text-forest-900'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          My Delivery Rates ({data.own_rates.length})
        </button>
        <button
          onClick={() => setActiveSubTab('sticker')}
          className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'sticker'
              ? 'border-forest-900 text-forest-900'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Packaging Sticker & Branding Kit
        </button>
        <button
          onClick={() => setActiveSubTab('calculator')}
          className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'calculator'
              ? 'border-forest-900 text-forest-900'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Charge Preview Calculator
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`pb-2 px-3 border-b-2 transition-colors cursor-pointer ${
            activeSubTab === 'history'
              ? 'border-forest-900 text-forest-900'
              : 'border-transparent text-stone-500 hover:text-stone-900'
          }`}
        >
          Shipping History ({shippingHistory.length})
        </button>
      </div>

      {/* ==============================================================
          TAB 1: RATES LISTING
         ============================================================== */}
      {activeSubTab === 'rates' && (
        <div className="space-y-6">
          {/* Notice about 5-tier Priority */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <HelpCircle size={18} className="text-amber-700 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <span className="font-bold">How Wangs Delivery Priority Works</span>
              <p className="text-stone-600 leading-relaxed">
                Calculations follow strict priority: <strong>1.</strong> Admin-locked product rates &rarr; <strong>2.</strong> Your product-specific rates &rarr; <strong>3.</strong> Admin-locked destination rates &rarr; <strong>4.</strong> Your destination rates &rarr; <strong>5.</strong> Platform default rate. If you do not configure a rate, the platform standard default applies automatically.
              </p>
            </div>
          </div>

          {/* Rates Cards */}
          {data.own_rates.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-stone-200/90 shadow-2xs space-y-3">
              <div className="w-12 h-12 bg-forest-50 text-forest-900 rounded-2xl flex items-center justify-center mx-auto">
                <Truck size={24} />
              </div>
              <h3 className="font-serif font-bold text-stone-900">No Custom Delivery Rates Yet</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Your products currently use the platform admin defaults. Add specific rates for your products or supported delivery zones (Kohima, Dimapur, Zubza, Zakhama, etc.) to customize packaging fees.
              </p>
              <button
                onClick={openNewRateModal}
                className="px-4 py-2 bg-forest-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus size={14} />
                <span>Configure My First Rate</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.own_rates.map((rate) => (
                <div
                  key={rate.id}
                  className={`bg-white rounded-3xl p-5 border shadow-2xs flex flex-col justify-between transition-all ${
                    rate.is_locked ? 'border-amber-300 bg-amber-50/20' : 'border-stone-200/90 hover:border-forest-800'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500 block">
                          {rate.scope_display}
                        </span>
                        <h4 className="font-serif font-bold text-base text-stone-900 leading-tight">
                          {rate.title}
                        </h4>
                      </div>

                      {rate.is_locked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                          <Lock size={10} />
                          Admin Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shrink-0">
                          <Unlock size={10} />
                          Artisan Set
                        </span>
                      )}
                    </div>

                    {/* Scope details */}
                    <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs space-y-1.5">
                      {rate.product_title && (
                        <div className="flex items-center justify-between text-stone-700">
                          <span className="text-stone-500">Product:</span>
                          <span className="font-bold truncate max-w-[180px]">{rate.product_title}</span>
                        </div>
                      )}
                      {rate.zone_name && (
                        <div className="flex items-center justify-between text-stone-700">
                          <span className="text-stone-500">Destination:</span>
                          <span className="font-bold">{rate.zone_name}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-stone-700">
                        <span className="text-stone-500">Method:</span>
                        <span className="font-bold text-forest-900">{rate.delivery_method_display}</span>
                      </div>
                      <div className="flex items-center justify-between text-stone-700">
                        <span className="text-stone-500">Courier:</span>
                        <span className="font-mono text-[11px]">{rate.courier_name || 'SwiftZone Express'}</span>
                      </div>
                    </div>

                    {/* Pricing Grid */}
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2.5 bg-forest-50/60 rounded-xl border border-forest-100">
                        <span className="text-[10px] text-stone-500 block">Base Charge</span>
                        <span className="text-base font-bold text-forest-950 font-serif">₹{rate.base_rate}</span>
                        <span className="text-[9px] text-stone-500 block">per package</span>
                      </div>
                      <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200">
                        <span className="text-[10px] text-stone-500 block">Extra Weight</span>
                        <span className="text-base font-bold text-stone-900 font-serif">₹{rate.additional_weight_rate}</span>
                        <span className="text-[9px] text-stone-500 block">per {rate.additional_weight_step_grams}g over {rate.included_weight_grams}g</span>
                      </div>
                    </div>

                    {/* Capacity & Free Shipping */}
                    <div className="text-[11px] text-stone-500 space-y-1">
                      <p>
                        📦 Max <strong className="text-stone-800">{rate.max_items_per_package} items</strong> ({rate.max_weight_per_package_grams}g) per box
                      </p>
                      {rate.is_free_delivery ? (
                        <span className="text-emerald-700 font-bold block">✨ Unconditional Free Delivery Active</span>
                      ) : rate.min_order_amount_for_free_delivery ? (
                        <span className="text-emerald-700 font-bold block">
                          ✨ Free shipping on orders &ge; ₹{rate.min_order_amount_for_free_delivery}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="pt-4 border-t border-stone-200/80 flex items-center justify-between mt-3">
                    <span className="text-[10px] font-mono text-stone-400">
                      v{rate.version} · {rate.approval_status}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditRateModal(rate)}
                        disabled={rate.is_locked}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                          rate.is_locked
                            ? 'text-stone-300 cursor-not-allowed'
                            : 'text-stone-700 hover:bg-stone-100 cursor-pointer'
                        }`}
                        title={rate.is_locked ? 'Locked by admin' : 'Edit rate'}
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteRate(rate.id, rate.is_locked)}
                        disabled={rate.is_locked}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                          rate.is_locked
                            ? 'text-stone-300 cursor-not-allowed'
                            : 'text-red-600 hover:bg-red-50 cursor-pointer'
                        }`}
                        title={rate.is_locked ? 'Locked by admin' : 'Delete rate'}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Admin Baseline Reference Section */}
          <div className="bg-stone-50 rounded-3xl p-6 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif font-bold text-sm text-stone-900">
                  Platform Default & Regional Presets (Reference)
                </h3>
                <p className="text-[11px] text-stone-500">
                  These rates apply automatically for destinations or products you have not customized.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {data.admin_baseline_rates.slice(0, 8).map(br => (
                <div key={br.id} className="p-3 bg-white rounded-2xl border border-stone-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 truncate">{br.zone_name || 'Marketplace Default'}</span>
                    <span className="font-serif font-bold text-forest-900">₹{br.base_rate}</span>
                  </div>
                  <span className="text-[10px] text-stone-500 block truncate">{br.delivery_method_display}</span>
                  <span className="text-[9px] text-stone-400 block">{br.estimated_delivery_note || 'Standard Express'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 2: PACKAGING STICKER & BRANDING KIT (DIRECT USER REQUEST)
         ============================================================== */}
      {activeSubTab === 'sticker' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-emerald-900 to-forest-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            <div className="max-w-xl space-y-4 relative z-10">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest uppercase">
                Official Marketplace Packaging Standard
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white">
                Wangs Official Tamper-Evident Packing Sticker
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed">
                Download the official scalloped green packing sticker badge. Affix onto your artisanal packaging boxes, kraft pouches, and container caps before dispatching to SwiftZone couriers or bus station drop-offs.
              </p>

              <div className="flex items-center gap-3 pt-2 flex-wrap">
                <a
                  href="/wangs-packaging-sticker.png"
                  download="Wangs-Official-Packaging-Sticker.png"
                  className="px-5 py-2.5 bg-white text-emerald-950 hover:bg-emerald-50 rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
                >
                  <Download size={16} />
                  <span>Download High-Res Sticker PNG</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(`
                      <html>
                        <head>
                          <title>Print Wangs Packaging Stickers</title>
                          <style>
                            @page { size: A4; margin: 10mm; }
                            body { font-family: sans-serif; text-align: center; }
                            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15mm; padding: 10mm; }
                            .sticker { width: 55mm; height: 55mm; object-fit: contain; }
                          </style>
                        </head>
                        <body>
                          <h2>Wangs Artisan Packaging Stickers Sheet (A4)</h2>
                          <div class="grid">
                            ${Array(9).fill('<img class="sticker" src="/wangs-packaging-sticker.png" />').join('')}
                          </div>
                          <script>window.onload = function() { window.print(); }</script>
                        </body>
                      </html>
                    `);
                    printWindow.document.close();
                  }}
                  className="px-4 py-2.5 bg-emerald-800/80 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 border border-emerald-600 transition-colors cursor-pointer"
                >
                  <Printer size={16} />
                  <span>Print A4 Sticker Sheet (9-up)</span>
                </button>
              </div>
            </div>

            {/* Sticker Image Preview floating */}
            <div className="mt-6 md:mt-0 md:absolute md:right-8 md:top-1/2 md:-translate-y-1/2 flex justify-center">
              <div className="w-48 h-48 sm:w-56 sm:h-56 p-2 rounded-full bg-white/10 backdrop-blur-md border border-white/30 shadow-2xl flex items-center justify-center">
                <img
                  src="/wangs-packaging-sticker.png"
                  alt="Wangs Packaging Sticker"
                  className="w-full h-full object-contain filter drop-shadow-lg"
                />
              </div>
            </div>
          </div>

          {/* Packing Guidelines Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-white p-5 rounded-3xl border border-stone-200/90 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">1</div>
              <h4 className="font-serif font-bold text-stone-900 text-sm">Glass Container Cushioning</h4>
              <p className="text-stone-500 leading-relaxed">
                Ensure bubble wrap or honeycomb paper surrounds all sides of glass pickle containers before placing in the outer corrugated box.
              </p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-stone-200/90 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">2</div>
              <h4 className="font-serif font-bold text-stone-900 text-sm">Seal with Wangs Sticker</h4>
              <p className="text-stone-500 leading-relaxed">
                Place the scalloped green sticker across the top box seam or container lid. Customers inspect this seal upon delivery confirmation.
              </p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-stone-200/90 shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">3</div>
              <h4 className="font-serif font-bold text-stone-900 text-sm">Attach Shipping Slip</h4>
              <p className="text-stone-500 leading-relaxed">
                Print the shipping label slip containing the courier QR code and official logo. Tape it securely on the top face of the parcel.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 3: CHARGE PREVIEW CALCULATOR
         ============================================================== */}
      {activeSubTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
              <Calculator size={18} className="text-forest-900" />
              <h3 className="font-serif font-bold text-base text-stone-900">
                Live Delivery Charge Tester
              </h3>
            </div>
            <p className="text-xs text-stone-500">
              Test how customer delivery fees are computed based on your rates, destination zones, weights, and packaging bundling.
            </p>

            <form onSubmit={handleRunTestCalc} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Select Product *</label>
                <select
                  value={calcForm.product_id}
                  onChange={e => setCalcForm({ ...calcForm, product_id: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-forest-800"
                >
                  {data.products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.weight_grams}g) · ₹{p.price}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Quantity (Units)</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={calcForm.quantity}
                    onChange={e => setCalcForm({ ...calcForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-forest-800"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Method</label>
                  <select
                    value={calcForm.delivery_method}
                    onChange={e => setCalcForm({ ...calcForm, delivery_method: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-forest-800"
                  >
                    <option value="STANDARD">Standard Delivery</option>
                    <option value="SAME_DAY">Same-Day Priority</option>
                    <option value="EXPRESS">Express Air Cargo</option>
                    <option value="BUS_SUMO">Bus / Sumo Dispatch</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Destination City *</label>
                  <input
                    type="text"
                    value={calcForm.city}
                    onChange={e => setCalcForm({ ...calcForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-forest-800"
                    placeholder="e.g. Dimapur or Kohima"
                  />
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Postal PIN Code *</label>
                  <input
                    type="text"
                    value={calcForm.postal_code}
                    onChange={e => setCalcForm({ ...calcForm, postal_code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-forest-800"
                    placeholder="e.g. 797112"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={calcLoading}
                className="w-full py-2.5 bg-forest-900 hover:bg-forest-950 text-white rounded-xl font-bold transition-all shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer"
              >
                {calcLoading ? <RefreshCw size={14} className="animate-spin" /> : <Calculator size={14} />}
                <span>Calculate Shipping Quote</span>
              </button>
            </form>
          </div>

          {/* Result Breakdown Card */}
          <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <h4 className="font-serif font-bold text-base text-stone-900">
                  Calculated Breakdown
                </h4>
                {calcResult && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    calcResult.is_deliverable ? 'bg-emerald-100 text-emerald-900' : 'bg-red-100 text-red-900'
                  }`}>
                    {calcResult.is_deliverable ? 'Deliverable' : 'Unavailable'}
                  </span>
                )}
              </div>

              {!calcResult ? (
                <div className="py-12 text-center text-stone-400 text-xs">
                  Run a calculation to see package bundling, weight fees, and applied rate priority.
                </div>
              ) : !calcResult.is_deliverable ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <XCircle size={16} className="text-red-600" />
                    <span>{calcResult.error_message || 'Delivery not available for this location'}</span>
                  </div>
                  <p className="text-stone-600">
                    No active delivery rate matched destination PIN ({calcForm.postal_code}) or city ({calcForm.city}).
                  </p>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="p-4 bg-forest-50/70 rounded-2xl border border-forest-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase font-bold block">Total Delivery Fee</span>
                      <span className="text-2xl font-black font-serif text-forest-950">₹{calcResult.total_delivery_fee}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-500 block">Fulfillment Packages</span>
                      <span className="text-lg font-bold text-stone-800">{calcResult.total_packages} Box{calcResult.total_packages > 1 ? 'es' : ''}</span>
                    </div>
                  </div>

                  {calcResult.fulfillment_breakdown?.map((fb, idx) => (
                    <div key={idx} className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                      <div className="flex items-center justify-between font-bold text-stone-900">
                        <span>{fb.rate_title}</span>
                        <span>₹{fb.group_delivery_fee}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600">
                        <div>Courier: <strong className="text-stone-800">{fb.courier_name}</strong></div>
                        <div>Total Weight: <strong className="text-stone-800">{fb.total_weight_grams}g</strong></div>
                        <div>Base Charge: <strong>₹{fb.base_rate}</strong></div>
                        <div>Weight Surcharge: <strong>₹{fb.weight_surcharge}</strong></div>
                        {fb.is_admin_locked && (
                          <div className="col-span-2 text-amber-800 font-bold flex items-center gap-1">
                            <Lock size={11} /> Admin Locked Priority Applied
                          </div>
                        )}
                        {fb.schedule_note && (
                          <div className="col-span-2 text-stone-700 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                            {fb.schedule_note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[11px] text-stone-400 mt-4">
              All quotes are strictly re-verified by Django on backend checkout submission.
            </p>
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB 4: SHIPPING HISTORY
         ============================================================== */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-stone-900">
                Fulfillment & Delivery History
              </h3>
              <p className="text-xs text-stone-500">
                Log of shipping quotes applied to your confirmed customer orders.
              </p>
            </div>
            <button
              onClick={loadShippingHistory}
              disabled={loadingHistory}
              className="p-2 text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-100"
            >
              <RefreshCw size={15} className={loadingHistory ? 'animate-spin' : ''} />
            </button>
          </div>

          {shippingHistory.length === 0 ? (
            <div className="py-12 text-center text-stone-400 text-xs">
              No orders shipped yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-mono text-[10px] uppercase">
                    <th className="py-2.5">Order</th>
                    <th className="py-2.5">Product</th>
                    <th className="py-2.5">Destination</th>
                    <th className="py-2.5">Boxes</th>
                    <th className="py-2.5">Method & Courier</th>
                    <th className="py-2.5">Delivery Fee</th>
                    <th className="py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {shippingHistory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="py-3 font-mono font-bold text-stone-900">#{item.order_number}</td>
                      <td className="py-3 text-stone-800">{item.product_title} &times; {item.quantity}</td>
                      <td className="py-3 text-stone-600">{item.destination_city} ({item.destination_postal_code})</td>
                      <td className="py-3 font-bold text-stone-800">{item.shipping_package_count} box</td>
                      <td className="py-3 text-stone-600">
                        <span className="font-bold text-stone-800 block">{item.shipping_delivery_method || 'Standard'}</span>
                        <span className="text-[10px] text-stone-400">{item.courier_partner}</span>
                      </td>
                      <td className="py-3 font-bold text-forest-900 font-serif">₹{item.order_delivery_fee}</td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-800">
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ==============================================================
          MODAL: CONFIGURE DELIVERY RATE
         ============================================================== */}
      {rateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl relative space-y-4 my-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-forest-900" />
                <h3 className="font-serif font-bold text-base text-stone-900">
                  {editingRate ? 'Edit Delivery Rate' : 'Create Delivery Rate'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRateModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRate} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">Rate Name / Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smoked Pork Pickle Local Kohima Rate"
                  value={rateForm.title}
                  onChange={e => setRateForm({ ...rateForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Product Scope</label>
                  <select
                    value={rateForm.product}
                    onChange={e => setRateForm({ ...rateForm, product: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-forest-800"
                  >
                    <option value="">All My Products (Destination Rate)</option>
                    {data.products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.weight_grams}g)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Destination Zone *</label>
                  <select
                    value={rateForm.zone}
                    onChange={e => setRateForm({ ...rateForm, zone: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-forest-800"
                  >
                    <option value="">Platform General</option>
                    {data.zones.map(z => (
                      <option key={z.id} value={z.id}>
                        {z.name} ({z.state})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Delivery Method *</label>
                  <select
                    value={rateForm.delivery_method}
                    onChange={e => setRateForm({ ...rateForm, delivery_method: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-forest-800"
                  >
                    <option value="STANDARD">Standard Delivery (1-2 days)</option>
                    <option value="SAME_DAY">Same-Day Priority</option>
                    <option value="EXPRESS">Express Air Cargo</option>
                    <option value="BUS_SUMO">Bus / Sumo Counter Dispatch</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Courier Service</label>
                  <select
                    value={rateForm.courier}
                    onChange={e => setRateForm({ ...rateForm, courier: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl focus:ring-2 focus:ring-forest-800"
                  >
                    <option value="">Default (SwiftZone)</option>
                    {data.couriers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing & Packages */}
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <span className="font-bold text-stone-900 block">Pricing & Package Capacity</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-600 mb-1">Base Rate (₹) *</label>
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
                    <label className="block text-stone-600 mb-1">Extra Weight Fee (₹ / 100g)</label>
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
                    <label className="block text-stone-600 mb-1">Max Items / Package</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={rateForm.max_items_per_package}
                      onChange={e => setRateForm({ ...rateForm, max_items_per_package: parseInt(e.target.value) || 4 })}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-600 mb-1">Max Weight / Box (g)</label>
                    <input
                      type="number"
                      value={rateForm.max_weight_per_package_grams}
                      onChange={e => setRateForm({ ...rateForm, max_weight_per_package_grams: parseInt(e.target.value) || 1500 })}
                      className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRateModalOpen(false)}
                  className="px-4 py-2 border border-stone-300 text-stone-700 rounded-xl font-bold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRate}
                  className="px-5 py-2 bg-forest-900 hover:bg-forest-950 text-white rounded-xl font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {submittingRate ? <RefreshCw size={14} className="animate-spin" /> : null}
                  <span>{editingRate ? 'Update Rate' : 'Save & Submit Rate'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
