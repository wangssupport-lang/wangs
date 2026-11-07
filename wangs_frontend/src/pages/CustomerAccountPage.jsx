import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Package, MapPin, Clock, CheckCircle, CheckCircle2, Plus, AlertCircle,
  LogOut, Trash2, Truck, Shield, ShieldCheck, ArrowRight, Copy, Check, ExternalLink,
  Boxes, Plane, X, ChevronRight, Sparkles, Navigation, Store
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';
import QRCodeSVG from '../components/QRCodeSVG';
import ScanAndEarnModal from '../components/ScanAndEarnModal';

const TRACKING_STEPS = [
  {
    key: 'CONFIRMED',
    title: 'Order Confirmed',
    subtitle: 'Payment verified & order booked',
    icon: CheckCircle2,
  },
  {
    key: 'PROCESSING',
    title: 'Prepared & Packed',
    subtitle: 'Sealed airtight in protective wrap',
    icon: Boxes,
  },
  {
    key: 'DISPATCHED',
    title: 'Air Cargo Dispatched',
    subtitle: 'In flight via Express Air Cargo',
    icon: Plane,
  },
  {
    key: 'DELIVERED',
    title: 'Delivered',
    subtitle: 'Handed over at doorstep',
    icon: Package,
  },
];

const getStepProgressIndex = (orderStatus) => {
  switch (orderStatus) {
    case 'DELIVERED':
      return 3;
    case 'DISPATCHED':
      return 2;
    case 'PROCESSING':
      return 1;
    case 'CONFIRMED':
    case 'PENDING':
    default:
      return 0;
  }
};

const getShipmentMilestones = (order) => {
  const isDispatched = ['DISPATCHED', 'DELIVERED'].includes(order.status);
  const isDelivered = order.status === 'DELIVERED';
  const orderDate = new Date(order.created_at);
  const orderDateStr = orderDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const dispatchDate = new Date(orderDate.getTime() + 18 * 3600 * 1000);
  const transitDate = new Date(orderDate.getTime() + 36 * 3600 * 1000);
  const destinationDate = new Date(orderDate.getTime() + 60 * 3600 * 1000);

  const pin = (order.shipping_postal_code || '').replace(/\D/g, '');
  const isKohima = pin.startsWith('7970');
  const isNagaland = pin.startsWith('797') || pin.startsWith('798');
  let estDeliveryText = 'Estimated in 4–10 days';
  if (isKohima) {
    estDeliveryText = 'Estimated within 12 hours (best case 30 mins – 1 hour)';
  } else if (isNagaland) {
    estDeliveryText = 'Estimated in 1–2 days';
  }

  return [
    {
      stage: 'Order Confirmed & Payment Verified',
      location: 'Wangs Central Order Registry',
      time: `${orderDateStr}, ${orderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      status: 'completed',
      detail: 'Online order paid and artisan seller notified for batch preparation.'
    },
    {
      stage: 'Artisan Batch Preparation & Jar Sealing',
      location: 'Artisan Workshop & Packing Hub, Regional Heritage Facility',
      time: `${orderDateStr}, Afternoon`,
      status: 'completed',
      detail: 'Traditional slow-pickled batch sealed in food-grade airtight containers.'
    },
    {
      stage: 'Consignment Handed Over to Air Freight Partner',
      location: isKohima ? 'Kohima Local Dispatch Hub (797001)' : 'Dimapur Air Cargo Terminal (797112)',
      time: isDispatched ? dispatchDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', 06:45 PM' : 'Scheduled upon packing',
      status: isDispatched ? 'completed' : 'upcoming',
      detail: `Parcel barcode scanned and Airway Bill (AWB ${order.tracking_number || 'WNG-AWB-PENDING'}) generated via ${order.courier_partner || (isKohima ? 'Local Express Courier' : 'Air Cargo Express')}.`
    },
    {
      stage: isKohima ? 'Out for Local Delivery' : 'In-Flight Air Mail Transit',
      location: isKohima ? 'Kohima City Route Hub' : 'Guwahati / Kolkata Air Mail Sorting Gateway',
      time: isDispatched ? transitDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', 10:15 AM' : 'Pending dispatch',
      status: isDispatched ? (isDelivered ? 'completed' : 'current') : 'upcoming',
      detail: isKohima ? `Assigned to express runner for direct doorstep drop in Kohima.` : `Express domestic air cargo transit connecting to ${order.shipping_state || 'destination state'}.`
    },
    {
      stage: 'Delivered',
      location: `${order.shipping_address_line1 || ''}${order.shipping_city ? `, ${order.shipping_city}` : ''}${order.shipping_state ? `, ${order.shipping_state}` : ''}${order.shipping_postal_code ? ` (${order.shipping_postal_code})` : ''}`.replace(/^,\s*/, '') || 'Destination Address',
      time: isDelivered ? destinationDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ', 02:40 PM' : estDeliveryText,
      status: isDelivered ? 'completed' : 'upcoming',
      detail: isDelivered ? `Parcel successfully delivered to ${order.customer_name || 'recipient'}.` : 'Final doorstep delivery with recipient confirmation.'
    }
  ];
};

export default function CustomerAccountPage() {
  const { user, isAdmin, isManufacturer, isAuthorizedToSell, logout, allowSellerRegistration } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'addresses', 'profile'
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [rewardWallet, setRewardWallet] = useState(null);
  const [showScanModal, setShowScanModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copiedAwb, setCopiedAwb] = useState(null);
  const [trackingModalOrder, setTrackingModalOrder] = useState(null);

  // New Address form state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddr, setNewAddr] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    is_default: false,
  });

  const handleCopyAwb = (awb) => {
    if (!awb) return;
    navigator.clipboard.writeText(awb);
    setCopiedAwb(awb);
    toast.success('AWB Tracking Number copied to clipboard!');
    setTimeout(() => setCopiedAwb(null), 2500);
  };

  const loadData = async () => {
    try {
      const [ordData, addrData, walletData] = await Promise.all([
        api.getMyOrders(),
        api.getAddresses(),
        api.getRewardWallet().catch(() => null),
      ]);
      setOrders(Array.isArray(ordData) ? ordData : (ordData?.results || []));
      setAddresses(Array.isArray(addrData) ? addrData : (addrData?.results || []));
      if (walletData) {
        setRewardWallet(walletData);
      }
    } catch (err) {
      console.error('Failed to load customer account data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadData();
  }, [user]);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const created = await api.createAddress(newAddr);
      setAddresses([...addresses, created]);
      setShowAddressModal(false);
      toast.success('Address saved successfully');
      setNewAddr({
        full_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        is_default: false,
      });
    } catch (err) {
      toast.error(err.message || 'Failed to add address');
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Remove this delivery address?')) return;
    try {
      await api.deleteAddress(id);
      setAddresses(addresses.filter((a) => a.id !== id));
      toast.success('Address removed');
    } catch (err) {
      toast.error(err.message || 'Failed to remove address');
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-stone-200 pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            Welcome, {user.first_name || user.username}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">{user.email} · Account Role: {user.role}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Scan & Earn Button */}
          <button
            type="button"
            onClick={() => setShowScanModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Sparkles size={14} className="text-amber-300" />
            <span>Scan &amp; Earn</span>
          </button>

          {/* Track Orders Button */}
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 hover:text-stone-900'
            }`}
          >
            <Package size={14} className={activeTab === 'orders' ? 'text-amber-400' : 'text-stone-400'} />
            <span>Track Orders</span>
          </button>

          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-stone-300 rounded-xl text-xs font-semibold text-stone-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors ml-1"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Tabs (Horizontal Scroll on Mobile, Sidebar on Desktop) */}
        <aside className="lg:col-span-3 flex lg:flex-col overflow-x-auto no-scrollbar gap-1.5 lg:space-y-1 text-xs pb-2 lg:pb-0">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'orders' ? 'bg-red-600 text-white shadow-xs' : 'text-stone-700 bg-stone-100 lg:bg-transparent hover:bg-stone-200 lg:hover:bg-stone-100'
            }`}
          >
            <Package size={15} /> Track Orders ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('rewards')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'rewards' ? 'bg-red-600 text-white shadow-xs' : 'text-stone-700 bg-stone-100 lg:bg-transparent hover:bg-stone-200 lg:hover:bg-stone-100'
            }`}
          >
            <Sparkles size={15} className="text-amber-500" /> Wangs Rewards {rewardWallet ? `(${rewardWallet.available_credits})` : ''}
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'addresses' ? 'bg-red-600 text-white shadow-xs' : 'text-stone-700 bg-stone-100 lg:bg-transparent hover:bg-stone-200 lg:hover:bg-stone-100'
            }`}
          >
            <MapPin size={15} /> Addresses ({addresses.length})
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'profile' ? 'bg-red-600 text-white shadow-xs' : 'text-stone-700 bg-stone-100 lg:bg-transparent hover:bg-stone-200 lg:hover:bg-stone-100'
            }`}
          >
            <User size={15} /> Profile &amp; Account
          </button>
        </aside>

        {/* Tab Content */}
        <div className="lg:col-span-9">
          {loading ? (
            <div className="py-12 text-center text-xs text-stone-500">Loading your account history...</div>
          ) : activeTab === 'orders' ? (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center">
                  <Package size={32} className="text-stone-400 mx-auto mb-3" />
                  <h3 className="font-serif font-bold text-base text-stone-900">No orders placed yet</h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                    Taste authentic King Chilli, fermented bamboo shoot, and wild forest pickles.
                  </p>
                  <Link
                    to="/products"
                    className="mt-4 inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
                  >
                    Browse Pickles
                  </Link>
                </div>
              ) : (
                orders.map((ord) => {
                  const currentStepIdx = getStepProgressIndex(ord.status);
                  const isDispatchedOrDelivered = ['DISPATCHED', 'DELIVERED'].includes(ord.status) || Boolean(ord.tracking_number);

                  return (
                    <div key={ord.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-6">
                      {/* Order Header */}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-950 font-mono text-sm tracking-tight">#{ord.order_number}</span>
                            <button
                              type="button"
                              onClick={() => handleCopyAwb(ord.order_number)}
                              className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded transition-colors"
                              title="Copy Order Number"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                          <span className="text-stone-400 text-[11px] block">
                            Placed on {new Date(ord.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            ord.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            Payment: {ord.payment_status}
                          </span>

                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 shadow-2xs ${
                            ord.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : ord.status === 'DISPATCHED'
                              ? 'bg-purple-100 text-purple-900 border border-purple-300'
                              : ord.status === 'PROCESSING'
                              ? 'bg-blue-100 text-blue-900 border border-blue-300'
                              : ord.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-900 border border-red-300'
                              : 'bg-red-100 text-red-900 border border-red-300'
                          }`}>
                            {ord.status === 'DISPATCHED' && <Plane size={12} className="animate-bounce" />}
                            {ord.status === 'DELIVERED' && <CheckCircle size={12} />}
                            {ord.status === 'PROCESSING' && <Boxes size={12} />}
                            <span>Order Status: {ord.status}</span>
                          </span>
                        </div>
                      </div>

                      {/* Visual Parcel Journey Stepper */}
                      <div className="bg-stone-50/70 rounded-2xl p-4 sm:p-6 border border-stone-200/80">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Truck size={16} className="text-red-600" />
                            <h4 className="font-serif font-bold text-sm text-stone-900">Live Parcel Journey</h4>
                          </div>
                          <span className="text-[11px] text-stone-500 font-medium">
                            {ord.status === 'DELIVERED'
                              ? 'Delivered'
                              : ord.status === 'DISPATCHED'
                              ? 'En route via Air Cargo'
                              : ord.status === 'PROCESSING'
                              ? 'Preparing in Artisan Workshop'
                              : 'Order Confirmed'}
                          </span>
                        </div>

                        {/* Stepper Progress Bar */}
                        <div className="relative mt-2">
                          {/* Desktop/Tablet Horizontal Stepper */}
                          <div className="hidden sm:block">
                            <div className="relative flex items-center justify-between">
                              {/* Background Connector Line */}
                              <div className="absolute left-6 right-6 top-4 h-1 bg-stone-200 z-0" />
                              
                              {/* Active Progress Connector Line */}
                              <div
                                className="absolute left-6 top-4 h-1 bg-red-600 transition-all duration-500 z-0"
                                style={{
                                  width: `${(currentStepIdx / (TRACKING_STEPS.length - 1)) * 100}%`,
                                  maxWidth: 'calc(100% - 3rem)'
                                }}
                              />

                              {TRACKING_STEPS.map((step, idx) => {
                                const IconComponent = step.icon;
                                const isCompleted = idx < currentStepIdx;
                                const isCurrent = idx === currentStepIdx;
                                const isUpcoming = idx > currentStepIdx;

                                return (
                                  <div key={step.key} className="relative z-10 flex flex-col items-center text-center flex-1">
                                    <div
                                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                        isCompleted
                                          ? 'bg-red-600 text-white shadow-xs'
                                          : isCurrent
                                          ? 'bg-red-600 text-white ring-4 ring-red-100 shadow-md scale-105'
                                          : 'bg-white border-2 border-stone-200 text-stone-400'
                                      }`}
                                    >
                                      {isCompleted ? <Check size={16} /> : <IconComponent size={15} />}
                                    </div>

                                    <div className="mt-2.5 space-y-0.5">
                                      <span className={`text-xs block leading-tight ${
                                        isCurrent ? 'font-bold text-red-700' : isCompleted ? 'font-semibold text-stone-800' : 'text-stone-400 font-medium'
                                      }`}>
                                        {step.title}
                                      </span>
                                      <span className="text-[10px] text-stone-400 block max-w-[130px] mx-auto leading-tight">
                                        {step.subtitle}
                                      </span>
                                      {isCurrent && (
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[9px] font-bold uppercase tracking-wider">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Mobile Vertical Stepper */}
                          <div className="sm:hidden space-y-4">
                            {TRACKING_STEPS.map((step, idx) => {
                              const IconComponent = step.icon;
                              const isCompleted = idx < currentStepIdx;
                              const isCurrent = idx === currentStepIdx;

                              return (
                                <div key={step.key} className="flex items-start gap-3 relative">
                                  {idx < TRACKING_STEPS.length - 1 && (
                                    <div
                                      className={`absolute left-4 top-8 bottom-0 w-0.5 -ml-[1px] ${
                                        idx < currentStepIdx ? 'bg-red-600' : 'bg-stone-200'
                                      }`}
                                    />
                                  )}
                                  <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                                      isCompleted
                                        ? 'bg-red-600 text-white'
                                        : isCurrent
                                        ? 'bg-red-600 text-white ring-3 ring-red-100'
                                        : 'bg-white border-2 border-stone-200 text-stone-400'
                                    }`}
                                  >
                                    {isCompleted ? <Check size={14} /> : <IconComponent size={14} />}
                                  </div>
                                  <div className="space-y-0.5 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs ${isCurrent ? 'font-bold text-red-700' : isCompleted ? 'font-semibold text-stone-800' : 'text-stone-400'}`}>
                                        {step.title}
                                      </span>
                                      {isCurrent && (
                                        <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold">
                                          Active
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-stone-500">{step.subtitle}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Prominent Courier & AWB Tracking Card */}
                      {isDispatchedOrDelivered && (
                        <div className="bg-linear-to-r from-purple-50/90 via-stone-50/60 to-purple-50/40 border border-purple-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 shadow-2xs">
                                <Plane size={20} />
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-purple-950 text-xs sm:text-sm">
                                    {ord.courier_partner || 'Air Cargo Express (India Post Speed Post)'}
                                  </span>
                                  <span className="px-2 py-0.5 bg-purple-200/70 text-purple-900 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    Air Freight Priority
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                  <span className="text-[11px] text-stone-600 font-medium">AWB Tracking No:</span>
                                  <span className="font-mono font-bold text-purple-950 text-xs bg-white px-2 py-0.5 rounded border border-purple-200/80">
                                    {ord.tracking_number || `WNG-AWB-${ord.order_number.slice(-6)}-1IN`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyAwb(ord.tracking_number || `WNG-AWB-${ord.order_number.slice(-6)}-1IN`)}
                                    className="inline-flex items-center gap-1 text-[11px] text-purple-800 hover:text-purple-950 font-semibold px-2 py-0.5 rounded hover:bg-purple-100 transition-colors"
                                  >
                                    {copiedAwb === (ord.tracking_number || `WNG-AWB-${ord.order_number.slice(-6)}-1IN`) ? (
                                      <>
                                        <Check size={12} className="text-emerald-600" />
                                        <span className="text-emerald-700">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={12} />
                                        <span>Copy AWB</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 self-start sm:self-center">
                              {/* Mobile Scan & Share QR */}
                              <div className="hidden lg:flex items-center gap-2 bg-white/95 p-1.5 rounded-xl border border-purple-200 shadow-2xs">
                                <QRCodeSVG
                                  value={`https://wangs.in/account?track=${ord.order_number}`}
                                  size={44}
                                  margin={1}
                                />
                                <div className="text-[9px] text-stone-500 leading-tight">
                                  <span className="font-bold text-stone-800 block">Mobile Scan:</span>
                                  <span>Live journey tracking</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setTrackingModalOrder(ord)}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all active:scale-95"
                              >
                                <Navigation size={13} />
                                <span>Track Milestones</span>
                              </button>

                              <a
                                href="https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-900 border border-purple-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-all"
                                title="Open India Post Consignment Tracking"
                              >
                                <span>Carrier Portal</span>
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-purple-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px] text-stone-600">
                            <div>
                              <span>Transit Route: <strong>Dimapur Air Cargo Terminal</strong> → <strong>{ord.shipping_city}, {ord.shipping_state} ({ord.shipping_postal_code})</strong></span>
                            </div>
                            <div className="text-purple-900 font-medium">
                              Estimated Arrival: <strong>2-4 Business Days via Air Express</strong>
                            </div>
                          </div>

                          {ord.dispatch_notes && (
                            <div className="text-[11px] bg-white/80 p-2.5 rounded-xl border border-purple-100 text-stone-700 italic">
                              "{ord.dispatch_notes}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* Order items snapshot */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-stone-900 uppercase tracking-wider block">Ordered Items ({ord.items?.length || 0})</span>
                        <div className="divide-y divide-stone-100 rounded-xl border border-stone-100 bg-stone-50/40 p-3 text-xs">
                          {ord.items?.map((item) => (
                            <div key={item.id} className="py-2.5 flex items-center justify-between first:pt-0 last:pb-0 gap-3">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-stone-900">{item.product_title}</p>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.fulfillment_status === 'DISPATCHED'
                                      ? 'bg-purple-100 text-purple-800'
                                      : item.fulfillment_status === 'DELIVERED'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : item.fulfillment_status === 'PACKED'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {item.fulfillment_status}
                                  </span>
                                </div>
                                <p className="text-stone-500 text-[11px]">{item.weight_grams}g jar · Quantity: {item.quantity}</p>
                              </div>
                              <span className="font-bold text-stone-900 font-mono">₹{parseFloat(item.subtotal).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery Address & Fee Summary */}
                      <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4 text-xs">
                        <div className="text-stone-600 max-w-sm space-y-0.5">
                          <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-400">Shipping Destination</span>
                          <span className="font-medium text-stone-900 block">
                            {ord.customer_name} ({ord.customer_phone})
                          </span>
                          <span className="text-stone-600 block text-[11px]">
                            {ord.shipping_address_line1}{ord.shipping_address_line2 ? `, ${ord.shipping_address_line2}` : ''}, {ord.shipping_city}, {ord.shipping_state} - {ord.shipping_postal_code}
                          </span>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="text-[11px] text-stone-500">
                            <span>Delivery: <strong className="text-emerald-700 font-semibold">FREE Air Express</strong> · Fee: ₹{parseFloat(ord.customer_platform_fee || 5).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-stone-500 text-xs">Total Paid: </span>
                            <strong className="text-base font-serif text-stone-950 font-bold ml-1">₹{parseFloat(ord.total_amount).toFixed(2)}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Live Consignment Milestones Modal - Solid Overlay */}
              {trackingModalOrder && (
                <div className="fixed inset-0 z-50 bg-stone-900/75 flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in duration-200">
                    {/* Modal Header */}
                    <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center shrink-0">
                          <Plane size={20} />
                        </div>
                        <div>
                          <h3 className="font-serif font-bold text-base text-stone-950">Air Cargo Consignment Milestones</h3>
                          <p className="text-xs text-stone-500 font-mono">Order #{trackingModalOrder.order_number}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setTrackingModalOrder(null)}
                        className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Courier & AWB Details Bar with Scannable QR */}
                    <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-2 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-purple-950">
                            {trackingModalOrder.courier_partner || 'Air Cargo Express (India Post Speed Post)'}
                          </span>
                          <span className="px-2 py-0.5 bg-purple-200 text-purple-900 font-bold rounded-full text-[10px] uppercase">
                            {trackingModalOrder.status === 'DELIVERED' ? 'Delivered' : 'Air Freight In Transit'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap text-[11px]">
                          <span className="text-stone-500">Airway Bill (AWB):</span>
                          <span className="font-mono font-bold text-purple-950 bg-white px-2 py-0.5 rounded border border-purple-200">
                            {trackingModalOrder.tracking_number || `WNG-AWB-${trackingModalOrder.order_number.slice(-6)}-1IN`}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyAwb(trackingModalOrder.tracking_number || `WNG-AWB-${trackingModalOrder.order_number.slice(-6)}-1IN`)}
                            className="text-purple-800 hover:text-purple-950 font-semibold inline-flex items-center gap-1 hover:underline"
                          >
                            {copiedAwb === (trackingModalOrder.tracking_number || `WNG-AWB-${trackingModalOrder.order_number.slice(-6)}-1IN`) ? (
                              <>
                                <Check size={12} className="text-emerald-600" />
                                <span className="text-emerald-700">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="pt-1 text-[11px] text-stone-600">
                          <span>Destination: <strong>{trackingModalOrder.customer_name}</strong> · {trackingModalOrder.shipping_city}, {trackingModalOrder.shipping_state} ({trackingModalOrder.shipping_postal_code})</span>
                        </div>
                      </div>

                      {/* Scannable Milestones QR */}
                      <div className="hidden sm:flex flex-col items-center bg-white p-2 rounded-xl border border-purple-200 shrink-0 shadow-2xs">
                        <QRCodeSVG
                          value={`https://wangs.in/account?track=${trackingModalOrder.order_number}`}
                          size={54}
                          margin={1}
                        />
                        <span className="text-[7.5px] font-mono font-bold text-purple-900 mt-1 uppercase">AWB QR</span>
                      </div>
                    </div>

                    {/* Vertical Transit Milestones Timeline */}
                    <div className="space-y-4 pt-1">
                      <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">Flight Transit Checkpoints</h4>
                      
                      <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                        {getShipmentMilestones(trackingModalOrder).map((milestone, idx) => {
                          const isDone = milestone.status === 'completed';
                          const isCurrent = milestone.status === 'current';

                          return (
                            <div key={idx} className="relative text-xs space-y-1">
                              {/* Bullet icon */}
                              <div
                                className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                                  isDone
                                    ? 'bg-red-600 text-white'
                                    : isCurrent
                                    ? 'bg-purple-700 text-white ring-4 ring-purple-100 animate-pulse'
                                    : 'bg-white border-2 border-stone-300 text-stone-400'
                                }`}
                              >
                                {isDone ? <Check size={11} /> : isCurrent ? <Plane size={10} /> : (idx + 1)}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-1">
                                <span className={`font-semibold ${isCurrent ? 'text-purple-950 font-bold' : isDone ? 'text-stone-900' : 'text-stone-400'}`}>
                                  {milestone.stage}
                                </span>
                                <span className="text-[10px] text-stone-400 font-mono">{milestone.time}</span>
                              </div>

                              <p className="text-[11px] text-red-700 font-medium">{milestone.location}</p>
                              <p className="text-[11px] text-stone-500 leading-relaxed">{milestone.detail}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                      <a
                        href="https://www.indiapost.gov.in/_layouts/15/dpt.cept.tracking/trackconsignment.aspx"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-semibold inline-flex items-center gap-1.5 transition-colors"
                      >
                        <span>Track on India Post Official Portal</span>
                        <ExternalLink size={13} />
                      </a>

                      <button
                        type="button"
                        onClick={() => setTrackingModalOrder(null)}
                        className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-xs"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'addresses' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-serif font-bold text-base text-stone-900">Saved Shipping Addresses</h3>
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Plus size={14} /> Add New Address
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div key={addr.id} className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm relative text-xs space-y-1">
                    {addr.is_default && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 bg-red-100 text-red-700 font-bold rounded text-[10px]">
                        Default
                      </span>
                    )}
                    <h4 className="font-bold text-sm text-stone-900">{addr.full_name}</h4>
                    <p className="text-stone-500">Phone: {addr.phone}</p>
                    <p className="text-stone-700">{addr.address_line1}</p>
                    {addr.address_line2 && <p className="text-stone-700">{addr.address_line2}</p>}
                    <p className="text-stone-900 font-medium">{addr.city}, {addr.state} - {addr.postal_code}</p>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="absolute bottom-3 right-3 p-1.5 text-stone-300 hover:text-chilli-700 transition-colors rounded-lg hover:bg-red-50"
                      title="Remove address"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Address Modal - Solid Overlay */}
              {showAddressModal && (
                <div className="fixed inset-0 z-50 bg-stone-900/75 flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
                    <h3 className="font-serif font-bold text-lg text-stone-900">Add New Shipping Address</h3>
                    <form onSubmit={handleAddAddress} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-stone-700 font-medium mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={newAddr.full_name}
                          onChange={(e) => setNewAddr({ ...newAddr, full_name: e.target.value })}
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-700 font-medium mb-1">Phone Number</label>
                        <input
                          type="tel"
                          required
                          value={newAddr.phone}
                          onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-700 font-medium mb-1">Address Line 1</label>
                        <input
                          type="text"
                          required
                          value={newAddr.address_line1}
                          onChange={(e) => setNewAddr({ ...newAddr, address_line1: e.target.value })}
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-stone-700 font-medium mb-1">City</label>
                          <input
                            type="text"
                            required
                            value={newAddr.city}
                            onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                            className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-stone-700 font-medium mb-1">State</label>
                          <input
                            type="text"
                            required
                            value={newAddr.state}
                            onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                            className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-stone-700 font-medium mb-1">PIN Code (6 digits)</label>
                        <input
                          type="text"
                          maxLength={6}
                          required
                          value={newAddr.postal_code}
                          onChange={(e) => setNewAddr({ ...newAddr, postal_code: e.target.value })}
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors shadow-xs"
                        >
                          Save Address
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddressModal(false)}
                          className="py-2 px-3 border border-stone-200 rounded-lg hover:bg-stone-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'rewards' ? (
            <div className="space-y-6">
              {/* Rewards Wallet Balance & Metric Cards */}
              <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-amber-950 text-white p-6 sm:p-8 rounded-3xl border border-stone-700 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider">
                      <Sparkles size={13} className="text-amber-400" />
                      <span>Wangs Loyalty Rewards</span>
                    </div>
                    <div className="pt-2">
                      <span className="text-xs uppercase tracking-wider text-stone-300 font-bold block">Available Balance</span>
                      <div className="flex items-baseline gap-3">
                        <span className="font-serif font-black text-4xl sm:text-5xl text-white">
                          {rewardWallet?.available_credits ?? 0}
                        </span>
                        <span className="text-lg font-bold text-amber-400">Credits</span>
                      </div>
                      <span className="text-xs text-stone-400 mt-1 block">
                        Worth ₹{rewardWallet?.available_credits ?? 0}.00 instant discount on checkout (1 Credit = ₹1)
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowScanModal(true)}
                    className="px-6 py-3.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2.5 shrink-0 cursor-pointer self-start sm:self-center"
                  >
                    <Sparkles size={16} className="text-amber-300" />
                    <span>Scan Product QR &amp; Earn</span>
                  </button>
                </div>

                {/* Sub-Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-3 pt-6 mt-6 border-t border-stone-700/80 text-xs">
                  <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/50">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Total Earned</span>
                    <span className="font-bold text-emerald-400 text-base mt-0.5 block">
                      +{rewardWallet?.total_credits_earned ?? 0}
                    </span>
                  </div>
                  <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/50">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Total Redeemed</span>
                    <span className="font-bold text-amber-300 text-base mt-0.5 block">
                      -{rewardWallet?.total_credits_redeemed ?? 0}
                    </span>
                  </div>
                  <div className="bg-stone-800/60 p-3 rounded-xl border border-stone-700/50">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Pending Delivery</span>
                    <span className="font-bold text-stone-200 text-base mt-0.5 block">
                      {rewardWallet?.pending_confirmations_count ?? 0} units
                    </span>
                  </div>
                </div>
              </div>

              {/* Product Units & Delivery Confirmation Method Status */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div>
                    <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                      <Package size={16} className="text-red-600" />
                      <span>Purchased Product Units &amp; Delivery Confirmation</span>
                    </h3>
                    <p className="text-stone-500 text-[11px] mt-0.5">
                      Every individual jar unit receives a unique QR code. Confirmation by customer QR scan or courier awards 1 credit.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-full">
                    {rewardWallet?.purchased_units?.length || 0} Total Units
                  </span>
                </div>

                {!rewardWallet?.purchased_units?.length ? (
                  <div className="py-8 text-center text-stone-400 text-xs">
                    No purchased product units recorded yet. Order delicious artisanal pickles to earn rewards!
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {rewardWallet.purchased_units.map((unit) => {
                      const isDelivered = unit.is_delivered;
                      const sourceDisplay = unit.confirmation_source_display || (unit.confirmation_source === 'CUSTOMER_QR' ? 'Customer QR Scan' : unit.confirmation_source === 'COURIER' ? 'Courier Confirmation' : unit.confirmation_source === 'BOTH' ? 'Both Confirmed' : 'Pending');

                      return (
                        <div key={unit.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-stone-900 text-xs sm:text-sm">
                                {unit.product_title}
                              </span>
                              <span className="font-mono text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                                Unit #{unit.unit_index} · {unit.unit_uid}
                              </span>
                            </div>
                            <div className="text-[11px] text-stone-500 flex items-center gap-2">
                              <span>Order #{unit.order_number}</span>
                              {unit.delivered_at && (
                                <span>· Delivered {new Date(unit.delivered_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
                            {/* Confirmation Source Badge */}
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                              unit.confirmation_source === 'BOTH'
                                ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                : unit.confirmation_source === 'CUSTOMER_QR'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                                : unit.confirmation_source === 'COURIER'
                                ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                : 'bg-stone-100 text-stone-600 border border-stone-200'
                            }`}>
                              {isDelivered && <CheckCircle size={11} />}
                              <span>{sourceDisplay}</span>
                            </span>

                            {unit.reward_awarded ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 inline-flex items-center gap-1">
                                <Sparkles size={11} className="text-amber-600" />
                                <span>+1 Credit Earned</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setShowScanModal(true)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                              >
                                Scan QR to Claim
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Rewards Transaction History */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4 text-xs">
                <div className="border-b border-stone-100 pb-3">
                  <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                    <Clock size={16} className="text-stone-700" />
                    <span>Reward Transaction History</span>
                  </h3>
                  <p className="text-stone-500 text-[11px] mt-0.5">
                    Immutable ledger of credits earned upon delivery and redeemed during checkout.
                  </p>
                </div>

                {!rewardWallet?.transactions?.length ? (
                  <div className="py-8 text-center text-stone-400 text-xs">
                    No reward transactions recorded yet.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-stone-200 text-[11px] text-stone-500 font-bold uppercase tracking-wider">
                          <th className="pb-2.5">Date &amp; Time</th>
                          <th className="pb-2.5">Type</th>
                          <th className="pb-2.5">Description</th>
                          <th className="pb-2.5 text-right">Credits</th>
                          <th className="pb-2.5 text-right">Balance After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 text-stone-800">
                        {rewardWallet.transactions.map((tx) => (
                          <tr key={tx.id} className="py-2.5">
                            <td className="py-3 text-stone-500 whitespace-nowrap">
                              {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} at {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                tx.transaction_type === 'EARN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : tx.transaction_type === 'REDEEM'
                                  ? 'bg-amber-100 text-amber-800'
                                  : tx.transaction_type === 'REVERSAL'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {tx.transaction_type}
                              </span>
                            </td>
                            <td className="py-3 max-w-xs truncate text-stone-700">
                              {tx.description}
                            </td>
                            <td className={`py-3 text-right font-black ${
                              tx.credits > 0 ? 'text-emerald-700' : 'text-amber-700'
                            }`}>
                              {tx.credits > 0 ? `+${tx.credits}` : tx.credits}
                            </td>
                            <td className="py-3 text-right font-mono font-bold text-stone-900">
                              {tx.balance_after}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Account Section in Profile */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-6 text-xs">
                {/* Account Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-5">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-[#9b4100] text-white flex items-center justify-center font-serif font-bold text-lg shadow-sm">
                      {(user.first_name || user.username || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif font-bold text-lg text-stone-900 leading-tight">
                          {`${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username}
                        </h3>
                        <span className="font-mono text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full border border-stone-200">
                          #{user.id ? `WNG-${String(user.id).padStart(4, '0')}` : 'MEMBER'}
                        </span>
                      </div>
                      <p className="text-stone-500 text-[11px] mt-0.5">
                        @{user.username} · {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>Active Account</span>
                    </span>
                  </div>
                </div>

                {/* Account Information Grid */}
                <div>
                  <h4 className="font-serif font-bold text-sm text-stone-900 mb-3 flex items-center gap-2">
                    <User size={15} className="text-[#9b4100]" />
                    <span>Account Credentials &amp; Profile Details</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-stone-50/70 p-4 rounded-xl border border-stone-200/70">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Username</span>
                      <span className="font-semibold text-stone-900 block mt-0.5">@{user.username}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Registered Email</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-stone-900 truncate">{user.email}</span>
                        <CheckCircle size={12} className="text-emerald-600 shrink-0" title="Verified" />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Phone / WhatsApp</span>
                      <span className="font-semibold text-stone-900 block mt-0.5">{user.phone_number || <span className="text-stone-400 italic font-normal">Not provided</span>}</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Account Role</span>
                      <span className={`font-bold block mt-0.5 ${user.role === 'ADMIN' ? 'text-purple-700' : isManufacturer ? 'text-emerald-700' : 'text-stone-700'}`}>
                        {user.role === 'ADMIN' ? 'Administrator' : isManufacturer ? 'Artisan Producer / Seller' : 'Verified Shopper'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Member Since</span>
                      <span className="font-semibold text-stone-900 block mt-0.5">
                        {user.date_joined ? new Date(user.date_joined).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Verified Wangs Member'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Security &amp; Password</span>
                      <Link
                        to="/login?tab=forgot-password"
                        className="text-[#9b4100] hover:text-[#783000] font-bold block mt-0.5 hover:underline"
                      >
                        Update / Reset Password →
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Account Activity Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div
                    onClick={() => setActiveTab('orders')}
                    className="p-3.5 bg-white border border-stone-200 rounded-xl hover:border-amber-400 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
                        <Package size={16} />
                      </div>
                      <div>
                        <span className="font-bold text-stone-900 text-xs block">Order History</span>
                        <span className="text-[11px] text-stone-500">{orders.length} orders recorded</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-stone-400" />
                  </div>

                  <div
                    onClick={() => setActiveTab('addresses')}
                    className="p-3.5 bg-white border border-stone-200 rounded-xl hover:border-amber-400 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center">
                        <MapPin size={16} />
                      </div>
                      <div>
                        <span className="font-bold text-stone-900 text-xs block">Delivery Addresses</span>
                        <span className="text-[11px] text-stone-500">{addresses.length} addresses saved</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-stone-400" />
                  </div>
                </div>
              </div>

              {/* Artisan Partnership Section - Dynamic Seller Hub / Onboarding */}
              <div className="bg-gradient-to-br from-[#faf2ed] via-white to-[#fff8f4] p-5 sm:p-6 rounded-2xl border border-[#dec0b3]/60 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 shadow-sm ${
                    isManufacturer
                      ? "bg-emerald-700 text-white"
                      : (user?.has_pending_seller_request || user?.seller_request_status === 'PENDING')
                      ? "bg-amber-600 text-white"
                      : "bg-[#9b4100] text-white"
                  }`}>
                    <Store size={20} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-serif font-bold text-base text-[#1e1b18]">
                        {isManufacturer
                          ? "Artisan Producer Workspace"
                          : (user?.has_pending_seller_request || user?.seller_request_status === 'PENDING')
                          ? "Seller Application Under Review"
                          : allowSellerRegistration
                          ? "Sell on Wangs Marketplace"
                          : "Artisan Producer Collective"}
                      </h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isManufacturer
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : (user?.has_pending_seller_request || user?.seller_request_status === 'PENDING')
                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                          : allowSellerRegistration
                          ? "bg-[#dec0b3]/30 text-[#9b4100]"
                          : "bg-stone-200 text-stone-600 border border-stone-300"
                      }`}>
                        {isManufacturer
                          ? "Approved Seller"
                          : (user?.has_pending_seller_request || user?.seller_request_status === 'PENDING')
                          ? "Application Under Review"
                          : allowSellerRegistration
                          ? "Artisan Partners"
                          : "Onboarding Paused"}
                      </span>
                    </div>
                    <p className="text-xs text-[#574238] max-w-lg leading-relaxed">
                      {isManufacturer
                        ? "Access your artisanal pickle catalog, manage inventory stock, monitor customer orders, and review weekly NEFT/RTGS bank payouts."
                        : (user?.has_pending_seller_request || user?.seller_request_status === 'PENDING')
                        ? `Your application to sell on Wangs${user?.seller_request_details?.business_name ? ` for "${user.seller_request_details.business_name}"` : ''} has been received and is currently under review by our curation team. You will be notified via email once authorized.`
                        : allowSellerRegistration
                        ? "Showcase your family heritage recipes, pure Raja Mircha, and fermented bamboo shoot pickles to customers nationwide with 0% listing fee."
                        : "New artisan producer applications are temporarily paused while our culinary curation team processes active batch reviews."}
                    </p>
                  </div>
                </div>

                {isManufacturer ? (
                  <Link
                    to="/manufacturer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-md transition-all active:scale-95 whitespace-nowrap self-start sm:self-center cursor-pointer"
                  >
                    <Store size={15} />
                    <span>Open Seller Portal</span>
                    <ArrowRight size={14} />
                  </Link>
                ) : (user?.has_pending_seller_request || user?.seller_request_status === 'PENDING') ? (
                  <Link
                    to="/manufacturer/register"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all active:scale-95 whitespace-nowrap self-start sm:self-center cursor-pointer"
                  >
                    <Clock size={15} />
                    <span>Check Application Status</span>
                    <ArrowRight size={14} />
                  </Link>
                ) : allowSellerRegistration ? (
                  <Link
                    to="/manufacturer/register"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-[#9b4100] hover:bg-[#803300] text-white font-bold text-xs shadow-md transition-all active:scale-95 whitespace-nowrap self-start sm:self-center cursor-pointer"
                  >
                    <Store size={15} />
                    <span>Sell with Us</span>
                    <ArrowRight size={14} />
                  </Link>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-stone-100 text-stone-500 font-bold text-xs border border-stone-200 self-start sm:self-center cursor-default">
                    <span>Onboarding Paused</span>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ScanAndEarnModal
        isOpen={showScanModal}
        onClose={() => setShowScanModal(false)}
        onSuccess={loadData}
      />
    </div>
  );
}
