import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Store, Package, DollarSign, Clock, CheckCircle, AlertCircle,
  Plus, Edit, Eye, Filter, RefreshCw, Truck, ShieldCheck, Sparkles,
  Printer, X, FileText, Phone, MapPin, Camera, Calculator, Download,
  Lock, Mail, KeyRound, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';

export default function ManufacturerPortalPage() {
  const { user, isManufacturer, isAuthorizedToSell, login, loginWithOtp } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'products', 'orders', 'financials'
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedParcelOrder, setSelectedParcelOrder] = useState(null);
  const [showSellerRulesModal, setShowSellerRulesModal] = useState(false);

  // Dedicated Seller Login Space State
  const [sellerLoginMode, setSellerLoginMode] = useState('otp'); // 'otp' or 'password'
  const [sellerEmail, setSellerEmail] = useState('');
  const [sellerOtpCode, setSellerOtpCode] = useState('');
  const [sellerOtpSent, setSellerOtpSent] = useState(false);
  const [sellerOtpLoading, setSellerOtpLoading] = useState(false);
  const [sellerOtpTimer, setSellerOtpTimer] = useState(0);
  const [sellerPasswordIdentifier, setSellerPasswordIdentifier] = useState('');
  const [sellerPassword, setSellerPassword] = useState('');
  const [sellerLoginLoading, setSellerLoginLoading] = useState(false);
  const [sellerLoginError, setSellerLoginError] = useState('');

  useEffect(() => {
    let interval = null;
    if (sellerOtpTimer > 0) {
      interval = setInterval(() => setSellerOtpTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [sellerOtpTimer]);

  // New product form modal state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProd, setNewProd] = useState({
    title: '',
    category_id: '',
    short_description: '',
    description: '',
    base_price: '200',
    price: '270',
    mrp: '320',
    weight_grams: '250',
    spice_level: 'HOT',
    dietary_type: 'NON_VEG',
    contains_non_veg_substance: false,
    ingredients: '',
    allergens: 'May contain traces of mustard or fermented soybeans (Axone)',
    storage_instructions: 'Store in cool dry place. Keep submerged in oil.',
    shelf_life: '9 Months',
    stock_quantity: '20',
    primary_image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    images: [
      'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
      '',
      ''
    ],
  });

  const commissionRate = parseFloat(profile?.commission_rate_override) || 10;
  const deliveryCharge = 50;

  const handleBasePriceChange = (val) => {
    const base = parseFloat(val) || 0;
    const comm = Math.round((base * commissionRate) / 100);
    const actual = Math.max(101, Math.round(base + comm + deliveryCharge));
    setNewProd((prev) => ({
      ...prev,
      base_price: val,
      price: String(actual),
      mrp: prev.mrp && parseFloat(prev.mrp) > actual ? prev.mrp : String(actual + 50)
    }));
  };

  const handleActualPriceChange = (val) => {
    const actual = parseFloat(val) || 0;
    const withoutDelivery = Math.max(0, actual - deliveryCharge);
    const base = Math.max(1, Math.round(withoutDelivery / (1 + commissionRate / 100)));
    setNewProd((prev) => ({
      ...prev,
      price: val,
      base_price: String(base),
      mrp: prev.mrp && parseFloat(prev.mrp) > actual ? prev.mrp : String(actual + 50)
    }));
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [profData, prodsData, catsData, ordsData, finData] = await Promise.all([
        api.getManufacturerProfile(),
        api.getManufacturerProducts(),
        api.getCategories(),
        api.getManufacturerOrders(),
        api.getManufacturerFinancials(),
      ]);
      setProfile(profData);
      setProducts(prodsData || []);
      setCategories(catsData || []);
      setOrders(ordsData || []);
      setFinancials(finData);
      if (catsData?.length && !newProd.category_id) {
        setNewProd((p) => ({ ...p, category_id: catsData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load manufacturer portal data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    loadData();
  }, [user]);

  const handleSendSellerOtp = async (e) => {
    if (e) e.preventDefault();
    const emailToUse = (sellerEmail || '').trim().toLowerCase();
    if (!emailToUse || !emailToUse.includes('@')) {
      setSellerLoginError('Please enter a valid registered seller email.');
      return;
    }
    setSellerOtpLoading(true);
    setSellerLoginError('');
    try {
      await api.sendOtp(emailToUse, 'LOGIN');
      setSellerOtpSent(true);
      setSellerOtpTimer(60);
      toast.success(`Verification code dispatched to ${emailToUse}!`);
    } catch (err) {
      setSellerLoginError(err.message || 'Failed to dispatch verification code.');
    } finally {
      setSellerOtpLoading(false);
    }
  };

  const handleSellerOtpLogin = async (e) => {
    e.preventDefault();
    const cleanCode = (sellerOtpCode || '').trim();
    if (!cleanCode || cleanCode.length !== 6) {
      setSellerLoginError('Enter the 6-digit verification code.');
      return;
    }
    setSellerLoginLoading(true);
    setSellerLoginError('');
    try {
      await loginWithOtp(sellerEmail.trim().toLowerCase(), cleanCode);
      toast.success('Welcome back to your Artisan Seller Workspace!');
    } catch (err) {
      setSellerLoginError(err.message || 'Invalid or expired OTP code.');
    } finally {
      setSellerLoginLoading(false);
    }
  };

  const handleSellerPasswordLogin = async (e) => {
    e.preventDefault();
    if (!sellerPasswordIdentifier.trim() || !sellerPassword) {
      setSellerLoginError('Please enter both your email/username and password.');
      return;
    }
    setSellerLoginLoading(true);
    setSellerLoginError('');
    try {
      await login(sellerPasswordIdentifier.trim(), sellerPassword);
      toast.success('Welcome back to your Artisan Seller Workspace!');
    } catch (err) {
      setSellerLoginError(err.message || 'Invalid username or password.');
    } finally {
      setSellerLoginLoading(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const priceNum = parseFloat(newProd.price);
    if (isNaN(priceNum) || priceNum <= 100) {
      toast.error('Selling price must be above ₹100. All sellers are required to sell products above ₹100 (minimum ₹101).');
      return;
    }
    const cleanImages = (newProd.images || []).map((img) => (img || '').trim()).filter(Boolean);
    if (cleanImages.length === 0 && newProd.primary_image_url) {
      cleanImages.push(newProd.primary_image_url);
    }
    const payload = {
      ...newProd,
      primary_image_url: cleanImages[0] || newProd.primary_image_url,
      images: cleanImages.slice(0, 3),
      image_urls: cleanImages.slice(0, 3)
    };
    try {
      await api.createManufacturerProduct(payload);
      toast.success(
        profile?.status === 'APPROVED'
          ? 'Pickle batch published and is now live for sale on the marketplace!'
          : 'Product submitted for Admin approval'
      );
      setShowAddProductModal(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit product');
    }
  };

  const handleUpdateFulfillment = async (orderItemId, newStatus) => {
    try {
      await api.updateFulfillmentStatus(orderItemId, newStatus);
      toast.success(`Fulfillment status updated to ${newStatus}`);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to update fulfillment status');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-4 text-center">
        <div className="w-8 h-8 border-4 border-forest-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-stone-500 mt-2">Loading manufacturer workspace...</p>
      </div>
    );
  }

  // 1. Dedicated Seller Login Space (when not authenticated)
  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 bg-stone-50/50">
        <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200/90 shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-500 text-stone-950 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <Store size={28} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-900 bg-amber-100 px-3 py-0.5 rounded-full inline-block">
              Wangs Artisan Seller Portal
            </span>
            <h1 className="font-serif text-2xl font-bold text-stone-900">
              Seller Space Sign In
            </h1>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              Sign in to manage your artisanal pickle recipes, customer orders, and brand bundles
            </p>
          </div>

          {/* Login Mode Switcher */}
          <div className="grid grid-cols-2 bg-stone-100 p-1 rounded-2xl text-xs font-semibold text-stone-600">
            <button
              type="button"
              onClick={() => { setSellerLoginMode('otp'); setSellerLoginError(''); }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                sellerLoginMode === 'otp'
                  ? 'bg-white text-forest-950 shadow-sm font-bold'
                  : 'hover:text-stone-900'
              }`}
            >
              Instant OTP Login
            </button>
            <button
              type="button"
              onClick={() => { setSellerLoginMode('password'); setSellerLoginError(''); }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                sellerLoginMode === 'password'
                  ? 'bg-white text-forest-950 shadow-sm font-bold'
                  : 'hover:text-stone-900'
              }`}
            >
              Password Login
            </button>
          </div>

          {sellerLoginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-red-600" />
              <span>{sellerLoginError}</span>
            </div>
          )}

          {/* Mode 1: Instant Email OTP Login (Passwordless - Great for Approved Sellers) */}
          {sellerLoginMode === 'otp' && (
            <form onSubmit={handleSellerOtpLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Registered Seller Email *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail size={16} className="absolute left-3.5 top-3 text-stone-400" />
                    <input
                      type="email"
                      required
                      value={sellerEmail}
                      onChange={(e) => setSellerEmail(e.target.value)}
                      placeholder="e.g. seller@brand.in"
                      className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800 font-medium"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={sellerOtpLoading || sellerOtpTimer > 0 || !sellerEmail.includes('@')}
                    onClick={handleSendSellerOtp}
                    className="px-3.5 py-2.5 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl transition-all disabled:opacity-50 shrink-0 shadow-xs cursor-pointer whitespace-nowrap"
                  >
                    {sellerOtpLoading ? 'Sending...' : sellerOtpTimer > 0 ? `Resend (${sellerOtpTimer}s)` : sellerOtpSent ? 'Resend Code' : 'Send Code'}
                  </button>
                </div>
              </div>

              {sellerOtpSent && (
                <div className="p-3.5 bg-forest-50 border border-forest-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-forest-950 font-bold text-xs">
                      Enter 6-digit Code sent to {sellerEmail}:
                    </label>
                    <span className="text-[10px] text-stone-500 font-mono">10 min expiry</span>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    inputMode="numeric"
                    value={sellerOtpCode}
                    onChange={(e) => setSellerOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-3.5 py-2.5 bg-white border border-forest-600 rounded-xl font-mono text-center text-sm font-bold tracking-widest text-stone-900 focus:outline-none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={sellerLoginLoading || !sellerOtpSent || sellerOtpCode.length !== 6}
                className="w-full py-3 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{sellerLoginLoading ? 'Verifying...' : 'Sign In to Seller Space'}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          {/* Mode 2: Password Login */}
          {sellerLoginMode === 'password' && (
            <form onSubmit={handleSellerPasswordLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Registered Email or Username *
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={sellerPasswordIdentifier}
                    onChange={(e) => setSellerPasswordIdentifier(e.target.value)}
                    placeholder="e.g. seller@brand.in or username"
                    className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-stone-700 font-semibold">
                    Account Password *
                  </label>
                  <Link
                    to="/login?tab=forgot-password"
                    className="text-[11px] text-forest-800 hover:text-forest-950 font-bold hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="password"
                    required
                    value={sellerPassword}
                    onChange={(e) => setSellerPassword(e.target.value)}
                    placeholder="Enter your seller account password"
                    className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={sellerLoginLoading}
                className="w-full py-3 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{sellerLoginLoading ? 'Signing In...' : 'Sign In to Seller Space'}</span>
                <ArrowRight size={15} />
              </button>
            </form>
          )}

          {/* Quick Guidance & Links */}
          <div className="pt-2 border-t border-stone-100 space-y-2.5 text-center text-xs">
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-stone-700 text-[11px] leading-relaxed text-left flex items-start gap-2">
              <Sparkles size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>New Approved Seller?</strong> Use <em>Instant OTP Login</em> with your approved email. Once logged in, your seller dashboard is fully unlocked so you can add recipes and sell your products immediately.
              </span>
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <Link
                to="/manufacturer/register"
                className="text-stone-600 hover:text-forest-900 font-medium"
              >
                Not yet authorized? <strong className="text-forest-900 underline">Apply to Sell on Wangs</strong>
              </Link>
              <a
                href="/documents/wangs_seller_rules.pdf"
                target="_blank"
                rel="noopener noreferrer"
                download="wangs_seller_rules.pdf"
                className="text-stone-500 hover:text-stone-800 text-[11px] inline-flex items-center justify-center gap-1"
              >
                <FileText size={12} /> Download Official Seller Rules (PDF)
              </a>
              <Link
                to="/"
                className="text-stone-400 hover:text-stone-600 text-[11px] pt-1"
              >
                ← Return to Wangs Storefront
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Logged in, but seller profile not found or pending brand setup
  if (!profile) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-700 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <Store size={28} />
        </div>
        {isAuthorizedToSell || user?.can_sell ? (
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
              Authorization Granted
            </span>
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              Welcome, Authorized Seller!
            </h2>
            <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
              Your seller account has been approved by the Wangs Administrator. Click below to complete your brand setup so your products can go live immediately.
            </p>
            <div className="pt-2">
              <Link
                to="/manufacturer/register"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-forest-900 hover:bg-forest-950 text-white rounded-xl text-xs font-bold shadow transition-all"
              >
                <span>Set Up Brand & Start Selling</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800 bg-amber-100 px-3 py-1 rounded-full">
              Authorization Required
            </span>
            <h2 className="font-serif text-2xl font-bold text-stone-900">
              Seller Application Required
            </h2>
            <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
              Wangs operates a curated marketplace. To protect food safety and consumer trust, seller accounts require administrator authorization.
            </p>
            <div className="pt-2">
              <Link
                to="/manufacturer/register"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-forest-900 hover:bg-forest-950 text-white rounded-xl text-xs font-bold shadow transition-all"
              >
                <span>Apply for Seller Authorization</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Bundle order metrics calculation
  const bundleOrdersCount = orders.filter((o) => o.quantity >= 2).length;
  const bundlePercentage = orders.length > 0 ? Math.round((bundleOrdersCount / orders.length) * 100) : 0;
  const totalJarsSold = orders.reduce((sum, o) => sum + (o.quantity || 1), 0);
  const avgBasketSize = orders.length > 0 ? (totalJarsSold / orders.length).toFixed(1) : '1.0';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Banner / Seller Status */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              {profile.business_name}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              profile.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
              profile.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
              'bg-red-100 text-red-800'
            }`}>
              {profile.status === 'APPROVED' ? 'Approved Seller' : `Status: ${profile.status}`}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-stone-600">
            <span>{profile.location_district}</span>
            <span>·</span>
            <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <ShieldCheck size={13} className="text-emerald-600" /> FSSAI Lic. #{profile.fssai_license_number}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-cream-100 p-3 rounded-xl border border-stone-200">
            <span className="text-stone-500 block">Commission Rate</span>
            <span className="font-serif font-bold text-forest-900 text-sm">
              {profile.commission_rate_override || '10.00'}%
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/documents/wangs_seller_rules.pdf"
              target="_blank"
              rel="noopener noreferrer"
              download="wangs_seller_rules.pdf"
              className="px-3.5 py-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
              title="Download Wangs Seller Rules PDF"
            >
              <FileText size={15} className="text-forest-800" />
              <span>Seller Rules (PDF)</span>
            </a>

            {profile.status === 'APPROVED' && (
              <button
                onClick={() => setShowAddProductModal(true)}
                className="px-4 py-3 bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-colors"
              >
                <Plus size={15} /> Add New Pickle Batch
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Official Seller Policy Notice: Brand Bundle Rule */}
      <div className="mb-8 p-5 bg-gradient-to-r from-amber-50 via-cream-100 to-amber-50 border border-amber-300 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="p-2.5 bg-amber-500 text-stone-950 rounded-xl mt-0.5 flex-shrink-0 shadow-xs">
            <Sparkles size={20} />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif font-bold text-stone-950 text-base">
                Seller Policy Notice: Flexible Brand Bundling (2–4 Items · 10% Discount)
              </h3>
              <span className="bg-chilli-700 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                10% Off Rule
              </span>
            </div>
            <p className="text-xs text-stone-700 mt-1 leading-relaxed max-w-3xl">
              Shoppers can now build custom bundles of <strong>2 to 4 items exclusively from your brand</strong> on your product pages. Customers are free to <strong>cut or add recipes</strong> from your brand catalog and receive a <strong>flat 10% bundle discount</strong>. Keep at least 2–4 complementary recipes active in stock to maximize your bundle sales.
            </p>
            <div className="flex items-center gap-2.5 mt-3 flex-wrap">
              <a
                href="/documents/wangs_seller_rules.pdf"
                target="_blank"
                rel="noopener noreferrer"
                download="wangs_seller_rules.pdf"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-forest-900 hover:bg-forest-950 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Download size={13} />
                <span>Download Seller Rules PDF</span>
              </a>
              <button
                type="button"
                onClick={() => setShowSellerRulesModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 border border-amber-300 text-stone-800 text-xs font-bold rounded-xl shadow-2xs transition-colors"
              >
                <Eye size={13} className="text-amber-700" />
                <span>View Full Rules Handbook</span>
              </button>
            </div>
          </div>
        </div>
        <div className="bg-white/90 p-3.5 rounded-xl border border-amber-200 text-center flex-shrink-0 self-start md:self-auto min-w-[190px]">
          <span className="text-[10px] text-stone-500 block uppercase tracking-wider font-semibold">Active Storefront Rule</span>
          <span className="font-bold text-forest-950 text-sm block mt-0.5">2–4 Items · Save 10%</span>
          <span className="text-[9px] text-amber-800 font-medium block">Same Brand Only</span>
          <span className="inline-block mt-2 font-mono text-[9px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
            PDF Ref: WNG-SELLER-V2
          </span>
        </div>
      </div>

      {profile.status === 'PENDING' && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-700 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Application Pending Review</p>
            <p className="mt-0.5 text-stone-600">
              Your business and FSSAI credentials have been submitted to Wangs platform administrators.
              Once verified, your listed pickles will go live on the customer marketplace.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-stone-200 mb-6 flex gap-6 text-xs font-semibold text-stone-600">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-colors ${activeTab === 'overview' ? 'border-forest-800 text-forest-900 font-bold' : 'border-transparent hover:text-stone-900'}`}
        >
          Overview & Sales
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 border-b-2 transition-colors ${activeTab === 'products' ? 'border-forest-800 text-forest-900 font-bold' : 'border-transparent hover:text-stone-900'}`}
        >
          My Products ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 border-b-2 transition-colors ${activeTab === 'orders' ? 'border-forest-800 text-forest-900 font-bold' : 'border-transparent hover:text-stone-900'}`}
        >
          Fulfillment Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('financials')}
          className={`pb-3 border-b-2 transition-colors ${activeTab === 'financials' ? 'border-forest-800 text-forest-900 font-bold' : 'border-transparent hover:text-stone-900'}`}
        >
          Earnings & Settlements
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-500 font-medium">Gross Product Sales</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">₹{financials?.total_sales || '0.00'}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-500 font-medium">Commission Deducted ({profile.commission_rate_override || 10}%)</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">₹{financials?.total_commission_deducted || '0.00'}</p>
            </div>
            <div className="bg-forest-900 text-cream-50 p-5 rounded-xl border border-forest-800 shadow-sm">
              <span className="text-xs text-cream-300 font-medium">Net Producer Earnings</span>
              <p className="text-2xl font-serif font-bold text-white mt-1">₹{financials?.net_earnings || '0.00'}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-500 font-medium">Active Products</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{products.filter((p) => p.status === 'APPROVED').length}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-xl border border-amber-200 shadow-sm">
              <span className="text-xs text-amber-900 font-bold flex items-center gap-1">
                <Sparkles size={12} className="text-amber-600" /> Bundle Orders (2+ Jars)
              </span>
              <p className="text-2xl font-serif font-bold text-amber-950 mt-1">
                {bundleOrdersCount} <span className="text-xs font-sans font-normal text-amber-700">({bundlePercentage}%)</span>
              </p>
              <p className="text-[10px] text-amber-800 mt-0.5">Avg basket: {avgBasketSize} jars/order</p>
            </div>
          </div>

          {/* Active Bundle Program & Monitoring Card */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-forest-50 text-forest-800 rounded-xl">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Artisan Bundle & Volume Program Monitor
                  </h3>
                  <p className="text-xs text-stone-500">
                    Official platform rules: Customers save 10% when curating flexible 2–4 jar bundles from your brand
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href="/documents/wangs_seller_rules.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  download="wangs_seller_rules.pdf"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors shadow-2xs"
                >
                  <Download size={12} /> Rules PDF
                </a>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <CheckCircle size={13} className="text-emerald-700" /> Monitored by Admin
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                <span className="font-bold text-stone-900 block">Single Jar Option (1 Jar)</span>
                <p className="text-stone-500 text-[11px]">Standard batch retail price set by your brand.</p>
                <span className="inline-block mt-1 font-mono text-[10px] text-stone-600 bg-white px-2 py-0.5 rounded border border-stone-200">
                  Tier 1 · Full Margin
                </span>
              </div>

              <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 block">Flexible Brand Bundle (2–4 Jars)</span>
                  <span className="bg-amber-500 text-stone-950 font-black text-[9px] px-1.5 py-0.2 rounded">Save 10%</span>
                </div>
                <p className="text-stone-700 text-[11px] leading-relaxed">
                  Shoppers can mix & match 2 to 4 items from your brand only. Free to cut or add recipes with a flat 10% bundle discount.
                </p>
                <span className="inline-block mt-1 font-mono text-[10px] text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200">
                  Storefront Rule · Same Brand Only
                </span>
              </div>

              <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 block">Protective Bundle Logistics</span>
                  <span className="bg-purple-700 text-white font-black text-[9px] px-1.5 py-0.2 rounded">Air Cargo</span>
                </div>
                <p className="text-stone-700 text-[11px] leading-relaxed">
                  Insulated shock-proof packaging & priority express cargo dispatch for multi-jar bundles.
                </p>
                <span className="inline-block mt-1 font-mono text-[10px] text-purple-800 bg-white px-2 py-0.5 rounded border border-purple-200">
                  Safe Delivery Guarantee
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900">Recent Customer Orders for Your Brand</h3>
            {orders.length === 0 ? (
              <p className="text-xs text-stone-500">No orders placed yet.</p>
            ) : (
              <div className="divide-y divide-stone-100 text-xs">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.order_item_id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-stone-900">#{o.order_number} · {o.product_title}</p>
                        {o.quantity >= 3 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-0.5">
                            <Sparkles size={10} /> Trio Bundle ({o.quantity} jars)
                          </span>
                        ) : o.quantity === 2 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-0.5">
                            <Sparkles size={10} /> Duo Bundle (2 jars)
                          </span>
                        ) : null}
                      </div>
                      <p className="text-stone-500 text-[11px] mt-0.5">
                        <span className="font-medium text-stone-700">{o.customer_name}</span> · Qty: {o.quantity} · Destination: {o.shipping_city}, {o.shipping_state}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="font-bold text-stone-900 block">Net Payout: ₹{parseFloat(o.manufacturer_payout).toFixed(2)}</span>
                        <span className="text-[10px] text-forest-700 bg-forest-50 px-2 py-0.5 rounded font-semibold">
                          Fulfillment: {o.fulfillment_status}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedParcelOrder(o)}
                        className="px-2.5 py-1.5 bg-stone-100 hover:bg-forest-900 hover:text-white text-stone-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                        title="Print Parcel Shipping Label"
                      >
                        <Printer size={13} />
                        <span>Parcel Slip</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Products */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-serif font-bold text-base text-stone-900">Product Listings</h3>
            {profile.status === 'APPROVED' && (
              <button
                onClick={() => setShowAddProductModal(true)}
                className="px-3 py-1.5 bg-forest-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus size={14} /> Add Product
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100 border-b border-stone-200 text-stone-700">
                <tr>
                  <th className="p-3">Product</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Customer Price</th>
                  <th className="p-3">Pricing Equation (Base + Comm + Delivery)</th>
                  <th className="p-3">Weight & Stock</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {products.map((p) => {
                  const actual = parseFloat(p.price) || 0;
                  const withoutDelivery = Math.max(0, actual - deliveryCharge);
                  const base = Math.max(0, Math.round(withoutDelivery / (1 + commissionRate / 100)));
                  const comm = Math.max(0, withoutDelivery - base);

                  return (
                    <tr key={p.id} className="hover:bg-cream-50/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={p.primary_image_url || '/featured-pouches.png'}
                            alt={p.title}
                            className="w-10 h-10 object-cover rounded-lg border border-stone-200"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/featured-pouches.png';
                            }}
                          />
                          <div>
                            <p className="font-semibold text-stone-900">{p.title}</p>
                            <span className="text-[10px] text-stone-500">{p.dietary_type}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{p.category?.name}</td>
                      <td className="p-3">
                        <span className="font-bold text-forest-950 text-sm">₹{actual.toFixed(0)}</span>
                        <span className="block text-[10px] font-medium text-emerald-700">Free Customer Delivery</span>
                      </td>
                      <td className="p-3">
                        <div className="text-[11px] text-stone-700 font-medium whitespace-nowrap">
                          <span className="text-forest-900 font-bold">₹{base}</span> (Base) + <span className="text-amber-800">₹{comm}</span> ({commissionRate}%) + <span className="text-blue-700">₹{deliveryCharge}</span> (Air)
                        </div>
                        <span className="text-[10px] text-stone-500 font-semibold">= ₹{actual.toFixed(0)} Customer Price</span>
                      </td>
                      <td className="p-3">
                        <span className="block font-medium text-stone-700">{p.weight_grams}g</span>
                        <span className={p.stock_quantity > 0 ? 'text-emerald-700 font-semibold' : 'text-red-500 font-bold'}>
                          {p.stock_quantity} left
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          p.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Orders Fulfillment */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-900">Manage Item Packaging & Dispatch</h3>
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100 border-b border-stone-200 text-stone-700">
                <tr>
                  <th className="p-3">Order #</th>
                  <th className="p-3">Customer & Destination</th>
                  <th className="p-3">Item & Weight</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Net Payout</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Parcel Label / Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map((o) => (
                  <tr key={o.order_item_id} className="hover:bg-cream-50/50">
                    <td className="p-3">
                      <span className="font-mono font-bold text-stone-900 block">{o.order_number}</span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(o.order_date).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="font-bold text-stone-900">{o.customer_name}</p>
                      <p className="text-[11px] text-stone-600">
                        {o.shipping_city}, {o.shipping_state} {o.shipping_postal_code ? `- ${o.shipping_postal_code}` : ''}
                      </p>
                      {o.customer_phone && (
                        <p className="text-[10px] font-mono text-stone-500 mt-0.5">
                          📞 {o.customer_phone}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-stone-900">{o.product_title}</p>
                      <span className="text-[10px] text-stone-500 font-mono">{o.weight_grams}g jar</span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-stone-900">{o.quantity}</span>
                        {o.quantity >= 3 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-0.5">
                            <Sparkles size={9} /> Trio Bundle
                          </span>
                        ) : o.quantity === 2 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 inline-flex items-center gap-0.5">
                            <Sparkles size={9} /> Duo Bundle
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400">Single</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-bold text-forest-900 font-mono">₹{parseFloat(o.manufacturer_payout).toFixed(2)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-[10px] font-bold text-stone-800 block w-max">
                        {o.fulfillment_status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSelectedParcelOrder(o)}
                          className="px-2.5 py-1.5 bg-forest-900 hover:bg-forest-950 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
                          title="View and print parcel slip to paste on shipping box"
                        >
                          <Printer size={13} />
                          <span>Print Parcel Slip</span>
                        </button>
                        <select
                          value={o.fulfillment_status}
                          onChange={(e) => handleUpdateFulfillment(o.order_item_id, e.target.value)}
                          className="p-1 border border-stone-200 rounded text-xs focus:ring-1 focus:ring-forest-700 font-medium"
                        >
                          <option value="PENDING">Pending</option>
                          <option value="PACKED">Packed</option>
                          <option value="DISPATCHED">Dispatched</option>
                          <option value="DELIVERED">Delivered</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Financials & Settlement */}
      {activeTab === 'financials' && (
        <div className="space-y-6 text-xs">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900">Producer Financial Snapshot</h3>
            <p className="text-stone-600 leading-relaxed max-w-2xl">
              Platform fees are strictly transparent. When an order is completed, 
              the standard marketplace commission ({financials?.effective_commission_rate}%) is deducted from product revenue, 
              and the remainder is held in compliant marketplace escrow until batch settlement.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">Total Product Sales</span>
                <span className="font-serif font-bold text-xl text-stone-950">₹{financials?.total_sales || '0.00'}</span>
              </div>
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">Platform Commission ({financials?.effective_commission_rate}%)</span>
                <span className="font-serif font-bold text-xl text-stone-950">₹{financials?.total_commission_deducted || '0.00'}</span>
              </div>
              <div className="p-4 bg-forest-50 rounded-xl border border-forest-200 text-forest-900">
                <span className="block text-forest-700 font-medium">Net Payable to Seller</span>
                <span className="font-serif font-bold text-2xl text-forest-900">₹{financials?.net_earnings || '0.00'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <h3 className="font-serif font-bold text-base text-stone-900">Settlement History</h3>
            {financials?.settlement_history?.length === 0 ? (
              <p className="text-stone-500">No settlement disbursements recorded yet. Accruals will be included in the next cycle batch.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {financials?.settlement_history?.map((s) => (
                  <div key={s.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold font-mono text-stone-900">{s.settlement_reference}</span>
                      <span className="text-stone-500 text-[11px] block">{s.period_start} to {s.period_end}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-stone-900">₹{parseFloat(s.net_payable).toFixed(2)}</span>
                      <span className="text-[10px] block font-semibold text-emerald-700">{s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 space-y-4 my-8">
            <h3 className="font-serif font-bold text-lg text-stone-900">Add New Pickle Batch for Approval</h3>
            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-stone-700 font-medium mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={newProd.title}
                    onChange={(e) => setNewProd({ ...newProd, title: e.target.value })}
                    placeholder="e.g. Cured Smoked Pork Pickle"
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Category *</label>
                  <select
                    value={newProd.category_id}
                    onChange={(e) => setNewProd({ ...newProd, category_id: e.target.value })}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Dietary Type *</label>
                  <select
                    value={newProd.dietary_type}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewProd({
                        ...newProd,
                        dietary_type: val,
                        contains_non_veg_substance: val === 'VEG_MIXED'
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg text-xs"
                  >
                    <option value="NON_VEG">Non-Veg</option>
                    <option value="VEG">Veg</option>
                    <option value="VEG_MIXED">Veg mixed with Non-Veg</option>
                  </select>
                </div>

                {(newProd.dietary_type === 'VEG' || newProd.dietary_type === 'VEG_MIXED') && (
                  <div className="col-span-1 sm:col-span-2 p-3 bg-amber-50/90 rounded-xl border border-amber-200 text-xs">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(newProd.contains_non_veg_substance || newProd.dietary_type === 'VEG_MIXED')}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setNewProd({
                            ...newProd,
                            contains_non_veg_substance: checked,
                            dietary_type: checked ? 'VEG_MIXED' : 'VEG'
                          });
                        }}
                        className="mt-0.5 rounded border-stone-300 text-forest-900 focus:ring-forest-800"
                      />
                      <div>
                        <span className="block font-bold text-stone-900">
                          Does this veg item contain any non-veg substance?
                        </span>
                        <span className="block text-[11px] text-stone-600 mt-0.5">
                          (e.g., animal oil, pork lard, meat broth, fish sauce, or processed with meat traces)
                        </span>
                        {(newProd.contains_non_veg_substance || newProd.dietary_type === 'VEG_MIXED') && (
                          <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-md bg-amber-200/90 text-amber-950 font-bold text-[10px]">
                            <span className="w-2 h-2 rounded-full bg-amber-600 ring-1 ring-emerald-600" />
                            Will be displayed as: &quot;Veg mixed with Non-Veg&quot;
                          </span>
                        )}
                      </div>
                    </label>
                  </div>
                )}
                {/* Transparent Pricing Calculator */}
                <div className="col-span-2 p-4 bg-gradient-to-br from-amber-50/80 via-emerald-50/40 to-stone-50 rounded-2xl border border-amber-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Calculator size={15} className="text-forest-800" />
                      <span className="font-bold text-stone-900 text-xs">Transparent Pricing & Payout Equation</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Zero Customer Delivery Fee
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-stone-800 font-bold mb-1">
                        Your Desired Base Payout (₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">₹</span>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={newProd.base_price || ''}
                          onChange={(e) => handleBasePriceChange(e.target.value)}
                          placeholder="e.g. 200"
                          className="w-full pl-7 pr-3 py-2 border border-stone-300 rounded-xl text-sm font-bold bg-white focus:ring-1 focus:ring-forest-800"
                        />
                      </div>
                      <p className="text-[10.5px] text-stone-600 mt-1">Amount you receive into your bank per jar sold.</p>
                    </div>

                    <div>
                      <label className="block text-stone-800 font-bold mb-1">
                        Actual Customer Listed Price (₹) *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold">₹</span>
                        <input
                          type="number"
                          required
                          min="101"
                          step="1"
                          value={newProd.price || ''}
                          onChange={(e) => handleActualPriceChange(e.target.value)}
                          placeholder="Min ₹101"
                          className="w-full pl-7 pr-3 py-2 border border-emerald-300 bg-white rounded-xl text-sm font-black text-forest-950 focus:ring-1 focus:ring-forest-800"
                        />
                      </div>
                      <p className="text-[10.5px] text-amber-700 font-semibold mt-1">Platform policy: Must be strictly above ₹100.</p>
                    </div>
                  </div>

                  {/* Visual Equation Formula Bar */}
                  <div className="p-3 bg-white rounded-xl border border-stone-200 text-stone-800 shadow-2xs">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-center text-xs">
                      <div className="flex-1 min-w-[70px] bg-stone-50 py-1.5 px-2 rounded-lg border border-stone-200">
                        <span className="block text-[10px] text-stone-500 font-medium">Product Base Payout</span>
                        <span className="font-bold text-forest-900 text-sm">₹{parseFloat(newProd.base_price || 0).toFixed(0)}</span>
                      </div>
                      <span className="font-black text-stone-400 text-sm">+</span>
                      <div className="flex-1 min-w-[70px] bg-amber-50/70 py-1.5 px-2 rounded-lg border border-amber-200">
                        <span className="block text-[10px] text-amber-800 font-medium">Platform Fee ({commissionRate}%)</span>
                        <span className="font-bold text-amber-900 text-sm">
                          ₹{Math.max(0, Math.round(((parseFloat(newProd.base_price) || 0) * commissionRate) / 100))}
                        </span>
                      </div>
                      <span className="font-black text-stone-400 text-sm">+</span>
                      <div className="flex-1 min-w-[70px] bg-blue-50 py-1.5 px-2 rounded-lg border border-blue-200">
                        <span className="block text-[10px] text-blue-700 font-medium">Express Courier (Built-in)</span>
                        <span className="font-bold text-blue-900 text-sm">₹{deliveryCharge}</span>
                      </div>
                      <span className="font-black text-stone-400 text-sm">=</span>
                      <div className="flex-1 min-w-[85px] bg-forest-900 text-white py-1.5 px-2 rounded-lg shadow-xs">
                        <span className="block text-[10px] text-amber-300 font-bold">Customer Actual Price</span>
                        <span className="font-black text-sm">₹{parseFloat(newProd.price || 0).toFixed(0)}</span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-start gap-1.5 text-[10.5px] text-stone-600">
                      <ShieldCheck size={13} className="text-emerald-700 mt-0.5 shrink-0" />
                      <span>
                        <strong>Zero Customer Delivery Fee Policy:</strong> Customers are never charged delivery fees on Wangs. Nationwide air courier (₹{deliveryCharge}) and platform commission are calculated into the final selling price so you receive your full ₹{newProd.base_price || 0} payout upon order fulfillment.
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-stone-700 font-medium mb-1">Net Weight (Grams) *</label>
                  <input
                    type="number"
                    required
                    value={newProd.weight_grams}
                    onChange={(e) => setNewProd({ ...newProd, weight_grams: e.target.value })}
                    placeholder="250"
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Heat / Spice Level *</label>
                  <select
                    value={newProd.spice_level}
                    onChange={(e) => setNewProd({ ...newProd, spice_level: e.target.value })}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  >
                    <option value="MILD">Mild</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HOT">Hot</option>
                    <option value="FIERY_KING_CHILLI">Fiery King Chilli (Raja Mircha)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Inventory Quantity in Stock *</label>
                  <input
                    type="number"
                    required
                    value={newProd.stock_quantity}
                    onChange={(e) => setNewProd({ ...newProd, stock_quantity: e.target.value })}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  />
                </div>

                {/* 1-3 Product Photos */}
                <div className="col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-stone-700 font-bold">
                      Product Photos (1 to 3 Images) *
                    </label>
                    <span className="text-[11px] text-stone-500">Provide 1 to 3 clear photos</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[0, 1, 2].map((slotIdx) => {
                      const imgVal = (newProd.images && newProd.images[slotIdx]) || '';
                      return (
                        <div key={slotIdx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-col justify-between space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-stone-800 text-[11px]">
                              {slotIdx === 0 ? 'Image 1 (Primary *)' : `Image ${slotIdx + 1} (Optional)`}
                            </span>
                            {imgVal && (
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...(newProd.images || ['', '', ''])];
                                  updated[slotIdx] = '';
                                  setNewProd({ ...newProd, images: updated, primary_image_url: updated[0] || '' });
                                }}
                                className="text-stone-400 hover:text-red-600"
                                title="Remove photo"
                              >
                                <X size={12} />
                              </button>
                            )}
                          </div>

                          {imgVal ? (
                            <div className="w-full h-24 rounded-lg overflow-hidden border border-stone-200 bg-white relative">
                              <img src={imgVal} alt={`Upload ${slotIdx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-full h-24 rounded-lg border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-400 text-[10px] bg-white">
                              <Camera size={18} className="mb-1 text-stone-300" />
                              <span>No image selected</span>
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="w-full py-1.5 px-2 bg-white hover:bg-stone-100 border border-stone-300 rounded-lg cursor-pointer text-stone-700 text-[10.5px] font-semibold flex items-center justify-center gap-1 transition-colors">
                              <Camera size={12} className="text-forest-800" />
                              <span>Upload Photo</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 5 * 1024 * 1024) {
                                      toast.error('Image size must be under 5MB');
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const updated = [...(newProd.images || ['', '', ''])];
                                      updated[slotIdx] = reader.result;
                                      setNewProd({
                                        ...newProd,
                                        images: updated,
                                        primary_image_url: slotIdx === 0 ? reader.result : (updated[0] || reader.result)
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <input
                              type="url"
                              value={imgVal}
                              onChange={(e) => {
                                const updated = [...(newProd.images || ['', '', ''])];
                                updated[slotIdx] = e.target.value;
                                setNewProd({
                                  ...newProd,
                                  images: updated,
                                  primary_image_url: slotIdx === 0 ? e.target.value : (updated[0] || e.target.value)
                                });
                              }}
                              placeholder="Or paste image URL"
                              className="w-full px-2 py-1 text-[10px] border border-stone-200 rounded-lg bg-white"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-stone-700 font-medium mb-1">Ingredients Breakdown *</label>
                  <textarea
                    rows={2}
                    required
                    value={newProd.ingredients}
                    onChange={(e) => setNewProd({ ...newProd, ingredients: e.target.value })}
                    placeholder="e.g. Smoked Pork, King Chilli, Axone, Mustard Oil, Rock Salt"
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-stone-700 font-medium mb-1">Detailed Description *</label>
                  <textarea
                    rows={3}
                    required
                    value={newProd.description}
                    onChange={(e) => setNewProd({ ...newProd, description: e.target.value, short_description: e.target.value.substring(0, 150) })}
                    placeholder="Describe traditional curing, wood smoke, aroma, serving suggestions..."
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-stone-200">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-forest-800 text-white font-bold rounded-lg"
                >
                  Submit for Admin Approval
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="py-2.5 px-4 border border-stone-200 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          PARCEL SHIPPING SLIP / PACKING LABEL MODAL (READY TO PRINT & AFFIX)
         ===================================================================== */}
      {selectedParcelOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl relative space-y-4 my-8">
            {/* Top Toolbar (Hidden during print) */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 no-print">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-forest-100 text-forest-900 flex items-center justify-center">
                  <Printer size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Artisan Parcel Shipping Slip
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Order #{selectedParcelOrder.order_number} · Print & affix directly onto parcel box
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-forest-900 hover:bg-forest-950 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <Printer size={15} />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedParcelOrder(null)}
                  className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Parcel Label Box */}
            <div
              id="printable-parcel-slip"
              className="bg-white border-2 border-dashed border-stone-900 rounded-2xl p-5 text-stone-900 space-y-4"
            >
              {/* Header: Platform Branding & Order Reference */}
              <div className="flex items-center justify-between border-b-2 border-stone-900 pb-3">
                <div>
                  <h2 className="font-serif font-black text-2xl tracking-wider text-stone-900">
                    WANGS
                  </h2>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-stone-600">
                    Authentic Food Marketplace · www.wangs.in
                  </p>
                </div>
                <div className="text-right">
                  <div className="bg-stone-900 text-white px-3 py-1 rounded-md font-mono font-black text-sm tracking-widest inline-block">
                    #{selectedParcelOrder.order_number}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mt-1">
                    ● PREPAID / PAYMENT CONFIRMED
                  </div>
                  <div className="text-[10px] text-stone-500 font-mono">
                    Date: {new Date(selectedParcelOrder.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Delivery Destination (SHIP TO) & Producer Origin (SHIP FROM) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b-2 border-stone-900 pb-4">
                {/* DELIVER TO: CUSTOMER RECIPIENT */}
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-300">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MapPin size={13} className="text-forest-800" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-forest-900 bg-forest-100 px-2 py-0.5 rounded">
                      DELIVER TO (CUSTOMER):
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-stone-950 leading-tight">
                    {selectedParcelOrder.customer_name}
                  </h4>
                  <div className="text-xs text-stone-800 mt-2 space-y-1 leading-snug">
                    <p className="font-medium text-stone-900">{selectedParcelOrder.shipping_address_line1}</p>
                    {selectedParcelOrder.shipping_address_line2 && (
                      <p className="text-stone-700">{selectedParcelOrder.shipping_address_line2}</p>
                    )}
                    <p className="font-bold text-stone-950 text-xs">
                      {selectedParcelOrder.shipping_city}, {selectedParcelOrder.shipping_state} - {selectedParcelOrder.shipping_postal_code}
                    </p>
                    <div className="pt-1.5 flex items-center gap-2">
                      <span className="font-bold text-xs text-stone-900">📞 Phone:</span>
                      <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-stone-300 text-stone-950">
                        {selectedParcelOrder.customer_phone || 'N/A'}
                      </span>
                    </div>
                    {selectedParcelOrder.customer_email && (
                      <p className="text-[10px] text-stone-500 truncate pt-0.5">
                        ✉ {selectedParcelOrder.customer_email}
                      </p>
                    )}
                  </div>
                </div>

                {/* DISPATCHED FROM: ARTISAN SELLER */}
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-300">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Store size={13} className="text-stone-700" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-800 bg-stone-200 px-2 py-0.5 rounded">
                      FROM (ARTISAN PRODUCER):
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-stone-950 leading-tight">
                    {selectedParcelOrder.seller_business_name || profile?.business_name || 'Artisan Brand'}
                  </h4>
                  <div className="text-xs text-stone-800 mt-2 space-y-1 leading-snug">
                    <p className="text-stone-700">
                      {selectedParcelOrder.seller_address || profile?.business_address || 'Artisan Workshop'}
                    </p>
                    <p className="text-stone-800">
                      {(selectedParcelOrder.seller_district || profile?.location_district || '')}
                      {(selectedParcelOrder.seller_pincode || profile?.pincode) ? ` - ${selectedParcelOrder.seller_pincode || profile?.pincode}` : ''}
                    </p>
                    <p className="text-stone-800 pt-1">
                      📞 {selectedParcelOrder.seller_contact_phone || profile?.contact_phone || 'N/A'}
                    </p>
                    {(selectedParcelOrder.seller_fssai || profile?.fssai_license_number) && (
                      <div className="pt-1">
                        <span className="text-[10px] font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 inline-block font-mono">
                          FSSAI: {selectedParcelOrder.seller_fssai || profile?.fssai_license_number}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Package Contents Table */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-600">
                    Package Contents & Manifest
                  </span>
                  {selectedParcelOrder.courier_partner && (
                    <span className="text-[10px] font-mono text-stone-600">
                      Courier: {selectedParcelOrder.courier_partner} ({selectedParcelOrder.tracking_number || 'Standard'})
                    </span>
                  )}
                </div>
                <table className="w-full text-left text-xs border border-stone-300 rounded-xl overflow-hidden">
                  <thead className="bg-stone-100 text-stone-800 font-bold border-b border-stone-300">
                    <tr>
                      <th className="p-2.5">Item Description</th>
                      <th className="p-2.5 text-center">Net Weight</th>
                      <th className="p-2.5 text-center">Quantity</th>
                      <th className="p-2.5 text-right">Declared Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    <tr>
                      <td className="p-2.5">
                        <p className="font-bold text-stone-900">{selectedParcelOrder.product_title}</p>
                        <p className="text-[10px] text-stone-500">Sealed Food Jar · Artisanal Ferment</p>
                      </td>
                      <td className="p-2.5 text-center font-mono text-stone-700">
                        {selectedParcelOrder.weight_grams}g
                      </td>
                      <td className="p-2.5 text-center font-bold text-stone-950 font-mono text-sm">
                        {selectedParcelOrder.quantity}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-stone-900">
                        ₹{parseFloat(selectedParcelOrder.subtotal || 0).toFixed(2)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Fragile & Natural Ferment Advisory */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-[11px] text-amber-950 flex items-center gap-2.5">
                <span className="text-xl leading-none">⚠️</span>
                <div>
                  <span className="font-black uppercase tracking-wide">FRAGILE / GLASS JARS: </span>
                  <span>Contains traditional cured ferments submerged in edible mustard oil. Keep upright. Handle with care during transit.</span>
                </div>
              </div>

              {/* Dotted Cut & Affix Notice */}
              <div className="pt-2 text-center text-[10px] text-stone-500 border-t border-dashed border-stone-400 font-mono">
                ✂ CUT ALONG OUTER DOTTED LINE AND SECURELY AFFIX TO PARCEL EXTERIOR · WANGS ARTISANAL MARKETPLACE
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Official Seller Rules & Policy Handbook Modal */}
      {showSellerRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-4xl w-full my-8 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            {/* Modal Header & Quick Actions Toolbar */}
            <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 text-white p-5 sm:p-6 flex items-center justify-between gap-4 border-b border-amber-500/40">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-amber-500 text-stone-950 rounded-2xl shadow-xs">
                  <FileText size={22} />
                </span>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif font-bold text-lg sm:text-xl text-cream-50">
                      Wangs Artisan Seller Rules & Policy Handbook
                    </h2>
                    <span className="bg-amber-400 text-stone-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Official PDF
                    </span>
                  </div>
                  <p className="text-xs text-cream-200 mt-0.5">
                    Document Ref: WNG-SELLER-2026-V2 · Standard Operating Procedures & Brand Bundle Guidelines
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/documents/wangs_seller_rules.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  download="wangs_seller_rules.pdf"
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                  title="Download PDF Document"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Download PDF</span>
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-forest-800 hover:bg-forest-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5 transition-colors hidden sm:flex"
                  title="Print Handbook"
                >
                  <Printer size={14} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowSellerRulesModal(false)}
                  className="p-2 text-cream-200 hover:text-white hover:bg-forest-800 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 sm:p-8 space-y-8 overflow-y-auto text-xs text-stone-700 leading-relaxed bg-stone-50/50">
              {/* Executive Summary */}
              <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2">
                <h3 className="font-serif font-bold text-stone-900 text-sm">
                  1. Marketplace Mission & Partnership Principles
                </h3>
                <p>
                  Wangs operates as a curated platform connecting authentic regional pickle brands and producers with discerning culinary enthusiasts across India. All approved sellers operate their digital storefront under strict adherence to product authenticity, food safety, packaging integrity, and customer satisfaction standards.
                </p>
              </div>

              {/* Key Bundle Policy */}
              <div className="p-5 bg-gradient-to-br from-amber-50 via-cream-100 to-amber-50 rounded-2xl border-2 border-amber-300 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="font-serif font-bold text-stone-950 text-sm flex items-center gap-2">
                    <Sparkles size={16} className="text-amber-600" />
                    2. Flexible Brand Bundle Program (2 to 4 Items · Flat 10% Discount Rule)
                  </h3>
                  <span className="bg-chilli-700 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">
                    Mandatory Storefront Rule
                  </span>
                </div>
                <div className="space-y-2 bg-white/80 p-4 rounded-xl border border-amber-200 text-stone-800 text-xs">
                  <p>
                    <strong>• Same Brand Exclusivity:</strong> Brand bundles are formed exclusively from items belonging to your brand catalog. Products from different brands cannot be combined into a brand bundle.
                  </p>
                  <p>
                    <strong>• Flexible 2 to 4 Jars Limit:</strong> Customers have full flexibility to <strong>cut (remove)</strong> or <strong>add recipes</strong> from your brand. The bundle size is strictly bounded between a minimum of <strong>2 jars</strong> and a maximum of <strong>4 jars</strong>.
                  </p>
                  <p>
                    <strong>• Flat 10% Bundle Discount:</strong> When a customer selects between 2 and 4 items from your brand, an automated <strong>10% bundle discount</strong> is applied across the combined subtotal at checkout.
                  </p>
                  <p>
                    <strong>• Catalog Depth Recommendation:</strong> Sellers are required to maintain at least 2 to 4 complementary recipes active in stock so shoppers can customize their bundle and maximize basket size.
                  </p>
                  <p>
                    <strong>• Logistics Subsidy:</strong> All 2 to 4 jar bundles receive subsidized priority air cargo dispatch and insulated shock-proof packaging.
                  </p>
                </div>

                {/* Bundle Matrix Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs bg-white rounded-xl border border-amber-200 overflow-hidden">
                    <thead className="bg-forest-900 text-cream-50 font-bold">
                      <tr>
                        <th className="p-2.5">Bundle Configuration</th>
                        <th className="p-2.5">Eligible Selection</th>
                        <th className="p-2.5">Customer Savings</th>
                        <th className="p-2.5">Seller Benefit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      <tr>
                        <td className="p-2.5 font-bold text-stone-900">Duo Pack (2 Jars)</td>
                        <td className="p-2.5">Any 2 recipes from your brand</td>
                        <td className="p-2.5 font-bold text-chilli-700">Save 10% OFF</td>
                        <td className="p-2.5 text-stone-600">Doubles average order volume</td>
                      </tr>
                      <tr className="bg-stone-50">
                        <td className="p-2.5 font-bold text-stone-900">Tasting Trio (3 Jars)</td>
                        <td className="p-2.5">Any 3 recipes from your brand</td>
                        <td className="p-2.5 font-bold text-chilli-700">Save 10% OFF</td>
                        <td className="p-2.5 text-stone-600">Triples recipe discovery</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-bold text-stone-900">Family Pack (4 Jars - Max)</td>
                        <td className="p-2.5">Any 4 recipes from your brand</td>
                        <td className="p-2.5 font-bold text-chilli-700">Save 10% OFF</td>
                        <td className="p-2.5 text-stone-600">Maximum basket size & retention</td>
                      </tr>
                      <tr className="bg-stone-50">
                        <td className="p-2.5 text-stone-500">Single Jar (1 Jar)</td>
                        <td className="p-2.5 text-stone-500">Standard single purchase</td>
                        <td className="p-2.5 text-stone-500">0% (Full Price)</td>
                        <td className="p-2.5 text-stone-500">Full standard retail margin</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recipe Standards & Hygiene */}
              <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2">
                <h3 className="font-serif font-bold text-stone-900 text-sm">
                  3. Recipe Authenticity & Ingredient Declarations
                </h3>
                <p>
                  Every jar listed on Wangs must celebrate authentic culinary traditions. Pure cold-pressed oils and natural brines must be used. Synthetic chemical preservatives (such as sodium benzoate exceeding permissible limits) or artificial food dyes are prohibited. Listings must state all ingredients, net weights (250g / 500g standard), and allergen advisories clearly.
                </p>
              </div>

              {/* FSSAI Licensing */}
              <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2">
                <h3 className="font-serif font-bold text-stone-900 text-sm flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-forest-800" />
                  4. Mandatory FSSAI Food Licensing & Compliance
                </h3>
                <p>
                  Under Food Safety and Standards Authority of India (FSSAI) regulations, all sellers must hold an active 14-digit FSSAI license or registration. This number must be printed on every product label and registered in your seller profile. Jars must bear clear batch numbers, manufacturing dates, and Best-Before dates (minimum 6 months shelf life).
                </p>
              </div>

              {/* Packaging & Dispatch SLAs */}
              <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2">
                <h3 className="font-serif font-bold text-stone-900 text-sm flex items-center gap-1.5">
                  <Truck size={16} className="text-forest-800" />
                  5. Insulated Glass Packaging & Air Cargo SLAs
                </h3>
                <p>
                  Pickles are shipped nationwide in food-grade glass jars. To eliminate leakage during air cargo pressure changes, jars must feature airtight induction foil seals or shrink-wrapped neck bands. Each jar must be wrapped with at least 3 layers of 10mm bubble wrap or honeycomb cushioning. Multi-jar bundles must include corrugated divider inserts. Orders must be packed and ready for courier pickup within <strong>24 to 48 business hours</strong>.
                </p>
              </div>

              {/* Commercials & Settlements */}
              <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-2">
                <h3 className="font-serif font-bold text-stone-900 text-sm">
                  6. Commercial Terms, 10% Commission & Weekly Settlements
                </h3>
                <p>
                  A standard 10% platform commission is automatically deducted on retail line items at order snapshot. The seller's listed base product price payout is protected. Settlements are disbursed weekly via direct NEFT/RTGS bank transfer to your verified account.
                </p>
              </div>

              {/* Support & Escalation */}
              <div className="p-4 bg-forest-50/70 rounded-2xl border border-forest-200 text-forest-950 space-y-1.5">
                <h3 className="font-serif font-bold text-sm">
                  7. Official Seller Support Desk
                </h3>
                <p className="text-xs text-forest-900">
                  For catalog assistance, packaging inquiries, or payout questions, contact our dedicated seller support desk:
                </p>
                <div className="flex flex-wrap items-center gap-4 pt-1 font-semibold text-xs">
                  <span>✉ Email: <strong>wangssupport@gmail.com</strong></span>
                  <span>🌐 Portal: <strong>https://wangs.in/manufacturer</strong></span>
                  <span>🛡 Admin Space: <strong>/wangadminspace</strong></span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-stone-100 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-200">
              <span className="text-[11px] text-stone-500 font-mono">
                WANGS ARTISAN SELLER POLICY · OCTOBER 2026 EDITION
              </span>
              <div className="flex items-center gap-2">
                <a
                  href="/documents/wangs_seller_rules.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  download="wangs_seller_rules.pdf"
                  className="px-4 py-2 bg-forest-900 hover:bg-forest-950 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download size={14} /> Download PDF (16.5 KB)
                </a>
                <button
                  type="button"
                  onClick={() => setShowSellerRulesModal(false)}
                  className="px-4 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 font-bold text-xs rounded-xl transition-colors"
                >
                  Close Handbook
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
