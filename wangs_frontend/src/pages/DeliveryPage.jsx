import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import {
  Package, MapPin, Navigation, QrCode, Phone, ExternalLink,
  CheckCircle2, Clock, AlertTriangle, Search, ArrowLeft, Camera,
  Check, Truck, Copy, MessageSquare, Compass, ShieldCheck, RefreshCw, X
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

export default function DeliveryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { orderNumber: paramOrderNumber } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const activeOrderParam = searchParams.get('order') || searchParams.get('track') || paramOrderNumber || '';

  const [orderIdInput, setOrderIdInput] = useState(activeOrderParam);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentParcels, setRecentParcels] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Scanner Modal & Camera State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('Initializing camera...');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Mark as Delivered State
  const [isMarkingDelivered, setIsMarkingDelivered] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [showDeliveredModal, setShowDeliveredModal] = useState(false);

  // Load Order by Identifier
  const loadOrder = async (identifier) => {
    if (!identifier || !identifier.trim()) return;
    const cleanId = cleanOrderIdentifier(identifier);
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDeliveryOrder(cleanId);
      setOrder(data);
      setOrderIdInput(data.order_number);
      // Update URL query without page reload
      setSearchParams({ order: data.order_number });
    } catch (err) {
      console.error('Failed to load delivery order:', err);
      setError(err.message || 'Parcel not found. Check order number or scan barcode again.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  // Load active dispatches queue
  const loadRecentParcels = async () => {
    setLoadingRecent(true);
    try {
      const data = await api.getActiveDeliveryOrders();
      setRecentParcels(data || []);
    } catch (err) {
      console.warn('Could not load recent parcels:', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    if (activeOrderParam) {
      loadOrder(activeOrderParam);
    } else {
      loadRecentParcels();
    }
  }, [activeOrderParam]);

  // Clean raw QR code strings (extract order number from URL or raw text)
  const cleanOrderIdentifier = (raw) => {
    if (!raw) return '';
    let str = raw.trim();
    if (str.includes('order=')) {
      str = str.split('order=')[1].split('&')[0];
    } else if (str.includes('track=')) {
      str = str.split('track=')[1].split('&')[0];
    } else if (str.startsWith('DELIVERY:')) {
      const parts = str.split('|');
      str = parts[0].replace('DELIVERY:', '').trim();
    }
    return str;
  };

  // Handle Manual Form Search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (orderIdInput.trim()) {
      loadOrder(orderIdInput.trim());
    }
  };

  // Handle Mark as Delivered
  const handleConfirmDelivery = async () => {
    if (!order) return;
    setIsMarkingDelivered(true);
    try {
      const res = await api.markDeliveryOrderDelivered(order.order_number, deliveryNotes);
      toast.success(`Order ${order.order_number} marked as Delivered!`);
      setShowDeliveredModal(false);
      setDeliveryNotes('');
      // Refresh current order data
      await loadOrder(order.order_number);
    } catch (err) {
      toast.error(err.message || 'Failed to update delivery status.');
    } finally {
      setIsMarkingDelivered(false);
    }
  };

  // Start Camera QR Scanner
  const startScanner = async () => {
    setIsScannerOpen(true);
    setScannerStatus('Requesting camera access...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setScannerStatus('Align QR code on parcel within frame');
        beginBarcodeDetection();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setScannerStatus('Camera access denied or unavailable. You can enter the order number manually.');
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setIsScannerOpen(false);
  };

  // Run barcode / QR detection loop
  const beginBarcodeDetection = () => {
    if (!('BarcodeDetector' in window)) {
      setScannerStatus('Point camera at QR code or upload image/enter manually');
      return;
    }

    try {
      const barcodeDetector = new window.BarcodeDetector({
        formats: ['qr_code', 'code_128', 'code_39', 'ean_13']
      });

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const codes = await barcodeDetector.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const rawVal = codes[0].rawValue;
            if (rawVal) {
              stopScanner();
              toast.success('Parcel QR Code scanned successfully!');
              loadOrder(rawVal);
            }
          }
        } catch (scanErr) {
          // ignore detection frame skips
        }
      }, 350);
    } catch (e) {
      console.warn('BarcodeDetector error:', e);
    }
  };

  // Clean phone number for WhatsApp link
  const getCleanPhone = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  return (
    <div className="min-h-screen bg-stone-100/90 text-stone-900 pb-16">
      {/* Top Header Bar for Delivery Fleet */}
      <div className="bg-forest-950 text-cream-50 sticky top-0 z-30 shadow-md border-b border-forest-900">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-forest-800 text-amber-400 flex items-center justify-center font-bold shadow-inner">
              <Truck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm tracking-wide text-white uppercase">Wangs Express</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                  COURIER
                </span>
              </div>
              <p className="text-[10px] text-cream-200/80">Direct Delivery & Customer Route Navigator</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startScanner}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-forest-950 font-bold text-xs shadow transition-all active:scale-95 cursor-pointer"
            >
              <QrCode size={16} />
              <span className="hidden sm:inline">Scan Pack QR</span>
            </button>

            {order && (
              <button
                type="button"
                onClick={() => {
                  setOrder(null);
                  setSearchParams({});
                  loadRecentParcels();
                }}
                className="p-2 rounded-xl bg-forest-900 hover:bg-forest-800 text-cream-100 text-xs transition-colors"
                title="View All Parcels"
              >
                <ArrowLeft size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4 sm:pt-6 space-y-4">
        {/* Quick Search & Barcode Input Card */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/90 shadow-xs">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                placeholder="Scan QR or enter Order # (e.g. WNG-20261026-0060E5) or AWB..."
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-forest-800"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-forest-900 hover:bg-forest-950 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Find Parcel'}
              </button>
              <button
                type="button"
                onClick={startScanner}
                className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl transition-colors shrink-0"
                title="Scan QR Code via Camera"
              >
                <Camera size={18} />
              </button>
            </div>
          </form>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs sm:text-sm flex items-start gap-3">
            <AlertTriangle size={18} className="shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Parcel Not Found</p>
              <p className="text-red-700 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-stone-400 hover:text-stone-600"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Active Order Details View */}
        {order ? (
          <div className="space-y-4">
            {/* Order Status & Key Highlights Banner */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-base text-stone-950">{order.order_number}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                      order.status === 'DELIVERED'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : order.status === 'DISPATCHED'
                        ? 'bg-purple-100 text-purple-900 border border-purple-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {order.status}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                      order.payment_status === 'PAID'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {order.payment_status === 'PAID' ? '✓ PREPAID' : `COD: ₹${order.total_amount}`}
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 flex items-center gap-2 flex-wrap">
                  <span>AWB: <strong className="font-mono text-stone-700">{order.tracking_number || 'WNG-AIR-PRIORITY'}</strong></span>
                  <span>·</span>
                  <span>Courier: <strong className="text-stone-700">{order.courier_partner}</strong></span>
                </div>
              </div>

              {/* Action: Mark as Delivered */}
              {order.status !== 'DELIVERED' ? (
                <button
                  type="button"
                  onClick={() => setShowDeliveredModal(true)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Mark as Delivered</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Delivered to Customer</span>
                </div>
              )}
            </div>

            {/* Split Grid: Customer Address & Live Location Map */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Customer Destination & Contact Details */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
                  <MapPin size={18} className="text-forest-800 shrink-0" />
                  <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">Delivery Destination</h3>
                </div>

                {/* Customer Contact */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2">
                  <div>
                    <span className="text-[10px] font-mono text-stone-500 uppercase block">Recipient</span>
                    <span className="text-sm font-bold text-stone-950">{order.customer_name}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200/60">
                    <div>
                      <span className="text-[10px] font-mono text-stone-500 uppercase block">Phone</span>
                      <span className="text-xs font-mono font-bold text-stone-900">{order.customer_phone}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${order.customer_phone}`}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <Phone size={13} />
                        <span>Call</span>
                      </a>
                      {order.customer_phone && (
                        <a
                          href={`https://wa.me/${getCleanPhone(order.customer_phone)}?text=Hello%20${encodeURIComponent(order.customer_name)},%20your%20Wangs%20artisan%20pickle%20parcel%20is%20arriving%20now!`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-forest-900 hover:bg-forest-950 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <MessageSquare size={13} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Street Address */}
                <div className="space-y-1 text-xs text-stone-800 leading-relaxed">
                  <span className="text-[10px] font-mono text-stone-500 uppercase block">Delivery Address</span>
                  <p className="font-medium text-stone-900">{order.shipping_address_line1}</p>
                  {order.shipping_address_line2 && (
                    <p className="text-stone-700">{order.shipping_address_line2}</p>
                  )}
                  <p className="font-bold text-stone-900 pt-1">
                    {order.shipping_city}, {order.shipping_state} - <span className="bg-amber-100 text-amber-950 px-1.5 py-0.5 rounded font-mono">{order.shipping_postal_code}</span>
                  </p>
                </div>

                {/* Dispatch Notes / Delivery Landmark */}
                {order.dispatch_notes && (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900">
                    <span className="font-bold block uppercase text-[9px] text-amber-800 mb-0.5">Delivery Instructions:</span>
                    <p className="whitespace-pre-line">{order.dispatch_notes}</p>
                  </div>
                )}

                {/* External GPS Navigation Buttons */}
                <div className="pt-2 space-y-2">
                  <a
                    href={order.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.formatted_address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 bg-forest-900 hover:bg-forest-950 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Navigation size={15} />
                    <span>Navigate in Google Maps (GPS)</span>
                    <ExternalLink size={13} />
                  </a>

                  <a
                    href={`https://maps.apple.com/?q=${encodeURIComponent(order.formatted_address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Compass size={14} />
                    <span>Open in Apple Maps</span>
                  </a>
                </div>
              </div>

              {/* Customer Location in Map */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <Navigation size={18} className="text-forest-800 shrink-0" />
                    <div>
                      <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">Live Customer Map Location</h3>
                      <p className="text-[10px] text-stone-500">Destination coordinates: {order.coordinates?.lat.toFixed(4)}, {order.coordinates?.lng.toFixed(4)}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-stone-100 text-stone-700 text-[10px] font-mono rounded font-bold">
                    {order.shipping_city}
                  </span>
                </div>

                {/* Embedded Interactive Map */}
                <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                  <iframe
                    title="Customer Delivery Destination Map"
                    className="w-full h-full border-0"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${(order.coordinates?.lng || 94.1086) - 0.035}%2C${(order.coordinates?.lat || 25.6751) - 0.025}%2C${(order.coordinates?.lng || 94.1086) + 0.035}%2C${(order.coordinates?.lat || 25.6751) + 0.025}&layer=mapnik&marker=${order.coordinates?.lat || 25.6751}%2C${order.coordinates?.lng || 94.1086}`}
                  />
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold text-forest-950 shadow-sm border border-stone-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Customer Destination Marker</span>
                  </div>
                </div>

                {/* Quick Map Location Footer Strip */}
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-stone-700">
                    <Compass size={14} className="text-forest-800" />
                    <span className="text-[11px] font-medium truncate max-w-xs">{order.formatted_address}</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.formatted_address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-forest-800 hover:text-forest-950 font-bold text-[11px] inline-flex items-center gap-1 underline"
                  >
                    <span>Get Turn-by-Turn Route</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>

            {/* Customer Products in Parcel */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-forest-800" />
                  <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">
                    Customer Products in Parcel ({order.total_items_count || order.items?.length || 0} Units)
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-forest-950">
                  Total Value: ₹{order.total_amount}
                </span>
              </div>

              {/* Products List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-start gap-3 relative"
                  >
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_title}
                        className="w-14 h-14 rounded-lg object-cover border border-stone-200 shrink-0 bg-white"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-stone-200 flex items-center justify-center shrink-0 text-stone-400">
                        <Package size={22} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-0.5 text-xs">
                      <h4 className="font-bold text-stone-900 leading-snug truncate" title={item.product_title}>
                        {item.product_title}
                      </h4>
                      {item.brand_name && (
                        <p className="text-[10px] text-stone-500 truncate">{item.brand_name}</p>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-stone-600 pt-0.5">
                        <span className="font-semibold text-stone-900">Qty: {item.quantity}</span>
                        <span>·</span>
                        <span>{item.weight_grams}g Jar</span>
                      </div>
                      <div className="flex items-center justify-between gap-1 pt-1 font-mono">
                        <span className="text-[10px] text-stone-500">₹{item.unit_price} each</span>
                        <span className="font-bold text-forest-900">₹{item.subtotal}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Fragile & Packaging Advisory */}
              <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-950 flex items-center gap-2.5">
                <span className="text-lg leading-none">⚠️</span>
                <div>
                  <span className="font-bold uppercase tracking-wider">Fragile Glass Jars: </span>
                  <span>Hand-crafted artisanal pickle batch submerged in edible mustard oil. Keep upright and verify seal intact upon customer handoff.</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty or Fleet Overview: Recent Active Dispatches */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/90 shadow-xs text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-forest-950 text-amber-400 flex items-center justify-center mx-auto shadow-sm">
                <QrCode size={34} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h2 className="text-lg sm:text-xl font-serif font-bold text-stone-900">
                  Scan Parcel QR Code
                </h2>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Scan the delivery QR code on any item's packing label to view customer products, address, and live map navigation.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={startScanner}
                  className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-forest-950 font-bold text-xs sm:text-sm rounded-xl shadow transition-all active:scale-95 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Camera size={18} />
                  <span>Open Camera Scanner</span>
                </button>
              </div>
            </div>

            {/* Recent / Active Out-for-Delivery Parcels */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Truck size={17} className="text-forest-800" />
                  <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">
                    Recent Dispatches & Delivery Queue
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={loadRecentParcels}
                  className="p-1 text-stone-400 hover:text-stone-700 transition-colors"
                  title="Refresh Queue"
                >
                  <RefreshCw size={14} className={loadingRecent ? 'animate-spin' : ''} />
                </button>
              </div>

              {recentParcels.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {recentParcels.map((p) => (
                    <div
                      key={p.order_number}
                      onClick={() => loadOrder(p.order_number)}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-stone-50/80 px-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-stone-900">{p.order_number}</span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                              p.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600">
                          <strong>{p.customer_name}</strong> · {p.shipping_city} ({p.shipping_postal_code})
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-forest-950 block">₹{p.total_amount}</span>
                        <span className="text-[10px] text-stone-400">{p.items_count} items</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 text-center py-4">
                  {loadingRecent ? 'Loading dispatch queue...' : 'No orders in queue. Scan parcel QR code to inspect.'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Camera QR Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-stone-900 text-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-700 flex flex-col">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Scan Pack QR Code</h3>
              </div>
              <button
                type="button"
                onClick={stopScanner}
                className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Video Viewfinder */}
            <div className="relative bg-black w-full aspect-square flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Reticle */}
              <div className="absolute inset-8 border-2 border-dashed border-amber-400 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-16 h-16 border-2 border-amber-400/60 rounded-lg animate-pulse" />
              </div>

              <div className="absolute bottom-3 left-3 right-3 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-center text-xs text-cream-100">
                {scannerStatus}
              </div>
            </div>

            {/* Fallback Manual / File Upload in Modal */}
            <div className="p-4 bg-stone-950 space-y-3 text-xs">
              <p className="text-stone-400 text-center text-[11px]">
                Align parcel QR code in the box, or enter order number below:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. WNG-20261026-0060E5"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      stopScanner();
                      loadOrder(e.target.value.trim());
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl font-mono text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={stopScanner}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark Delivered Modal */}
      {showDeliveredModal && order && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 size={26} />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-900">Confirm Parcel Delivery</h3>
              <p className="text-xs text-stone-500">
                You are marking order <strong>{order.order_number}</strong> as delivered to <strong>{order.customer_name}</strong>.
              </p>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1 text-stone-700">
              <p>📍 <strong>Destination:</strong> {order.formatted_address}</p>
              <p>📦 <strong>Products:</strong> {order.total_items_count} items</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Delivery Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Handed over to recipient, security gate, or signature collected..."
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeliveredModal(false)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isMarkingDelivered}
                onClick={handleConfirmDelivery}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isMarkingDelivered ? (
                  <span>Updating...</span>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Confirm Delivered</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
