import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Store, Package, DollarSign, Clock, CheckCircle, AlertCircle,
  Plus, Edit, Eye, EyeOff, Filter, RefreshCw, Truck, ShieldCheck, Sparkles,
  Printer, X, FileText, Phone, MapPin, Camera, Calculator, Download,
  Lock, Mail, KeyRound, ArrowRight, Trash2, Edit3, Boxes, AlertTriangle, Landmark,
  UploadCloud, User, Image as ImageIcon, ChevronRight, ExternalLink, HelpCircle,
  SlidersHorizontal, Check, Info, BadgeCheck, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';
import QRCodeSVG from '../components/QRCodeSVG';
import BrandCard from '../components/BrandCard';
import { compressImageFile, resolveProductImage } from '../utils/image';

function getBrandInitials(name = '') {
  return name
    .split(/\s+/)
    .filter((word) => /[a-zA-Z0-9]/.test(word))
    .slice(0, 2)
    .map((word) => word[0] || '')
    .join('')
    .toUpperCase() || 'W';
}

export default function ManufacturerPortalPage() {
  const { user, isManufacturer, isAuthorizedToSell, login, loginWithOtp, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Navigation tab states
  const initialTab = searchParams.get('tab') || 'overview';
  const initialSub = searchParams.get('sub') || 'brand';
  const [activeTab, setActiveTab] = useState(initialTab === 'profile' ? 'settings' : initialTab);
  const [settingsSubTab, setSettingsSubTab] = useState(initialSub);
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL'); // 'ALL', 'PENDING', 'DISPATCHED', 'DELIVERED'

  // Data states
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals & Overlays
  const [selectedParcelOrder, setSelectedParcelOrder] = useState(null);
  const [showSellerRulesModal, setShowSellerRulesModal] = useState(false);
  const [quickStockModal, setQuickStockModal] = useState(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Profile & Logo Management state
  const [logoUploading, setLogoUploading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    tagline: '',
    brand_story: '',
    location_district: '',
    contact_email: '',
    contact_phone: '',
    business_address: '',
    postal_code: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Bank account management state
  const [editingBank, setEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank_account_holder: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_name: '',
  });
  const [savingBank, setSavingBank] = useState(false);

  // Dedicated Seller Login Space State
  const [sellerPasswordIdentifier, setSellerPasswordIdentifier] = useState('');
  const [sellerPassword, setSellerPassword] = useState('');
  const [showSellerPassword, setShowSellerPassword] = useState(false);
  const [sellerLoginLoading, setSellerLoginLoading] = useState(false);
  const [sellerLoginError, setSellerLoginError] = useState('');

  // Product management & stock monitoring states
  const [editingProductId, setEditingProductId] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [updatingStockId, setUpdatingStockId] = useState(null);
  const [productStockFilter, setProductStockFilter] = useState('ALL');

  // New product form modal state
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [newProd, setNewProd] = useState({
    title: '',
    category_id: '',
    short_description: '',
    description: '',
    base_price: '',
    price: '',
    mrp: '',
    weight_grams: '250',
    spice_level: 'HOT',
    dietary_type: 'NON_VEG',
    contains_non_veg_substance: false,
    ingredients: '',
    allergens: 'May contain traces of mustard or fermented soybeans (Axone)',
    storage_instructions: 'Store in cool dry place. Keep submerged in oil.',
    shelf_life: '9 Months',
    stock_quantity: '',
    primary_image_url: '',
    images: ['', '', ''],
  });

  const commissionRate = parseFloat(profile?.commission_rate_override) || 10;
  const deliveryCharge = 50;

  // Handle URL tab changes
  const handleTabChange = (tab, sub = null) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    if (sub) {
      setSettingsSubTab(sub);
      params.set('sub', sub);
    } else if (tab !== 'settings') {
      params.delete('sub');
    }
    setSearchParams(params, { replace: true });
  };

  const handleSettingsSubChange = (sub) => {
    setSettingsSubTab(sub);
    const params = new URLSearchParams(searchParams);
    params.set('tab', 'settings');
    params.set('sub', sub);
    setSearchParams(params, { replace: true });
  };

  const handleBasePriceChange = (val) => {
    if (val === '') {
      setNewProd((prev) => ({ ...prev, base_price: '', price: '', mrp: '' }));
      return;
    }
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
    if (val === '') {
      setNewProd((prev) => ({ ...prev, price: '', base_price: '', mrp: '' }));
      return;
    }
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
      const rawProducts = Array.isArray(prodsData) ? prodsData : (prodsData?.results || []);
      const rawCategories = Array.isArray(catsData) ? catsData : (catsData?.results || []);
      const rawOrders = Array.isArray(ordsData) ? ordsData : (ordsData?.results || []);

      setProfile(profData);
      setProducts(rawProducts);
      setCategories(rawCategories);
      setOrders(rawOrders);
      setFinancials(finData);
      if (rawCategories?.length && !newProd.category_id) {
        setNewProd((p) => ({ ...p, category_id: rawCategories[0].id }));
      }
    } catch (err) {
      console.error('Failed to load manufacturer portal data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    loadData();
  }, [user, authLoading]);

  useEffect(() => {
    if (profile) {
      setBankForm({
        bank_account_holder: profile.bank_account_holder || '',
        bank_account_number: profile.bank_account_number || '',
        bank_ifsc_code: profile.bank_ifsc_code || '',
        bank_name: profile.bank_name || '',
      });
      setProfileForm({
        tagline: profile.tagline || '',
        brand_story: profile.brand_story || '',
        location_district: profile.location_district || '',
        contact_email: profile.contact_email || '',
        contact_phone: profile.contact_phone || '',
        business_address: profile.business_address || '',
        postal_code: profile.postal_code || '',
      });
    }
  }, [profile]);

  const handleLogoUpload = async (file) => {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      toast.error('Logo file size must be under 12MB');
      return;
    }
    setLogoUploading(true);
    try {
      const compressedDataUrl = await compressImageFile(file);
      const updated = await api.updateManufacturerProfile({
        logo_image: compressedDataUrl,
      });
      setProfile((prev) => ({ ...prev, ...updated }));
      toast.success('Brand logo updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to upload brand logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!window.confirm('Are you sure you want to remove your custom logo? Your brand will display your initials monogram fallback.')) {
      return;
    }
    setLogoUploading(true);
    try {
      const updated = await api.updateManufacturerProfile({
        logo_image: '',
      });
      setProfile((prev) => ({ ...prev, ...updated, logo_image: '' }));
      toast.success('Brand logo removed. Initial monogram badge restored.');
    } catch (err) {
      toast.error(err.message || 'Failed to remove logo');
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await api.updateManufacturerProfile({
        tagline: (profileForm.tagline || '').trim(),
        brand_story: (profileForm.brand_story || '').trim(),
        location_district: (profileForm.location_district || '').trim(),
        contact_email: (profileForm.contact_email || '').trim(),
        contact_phone: (profileForm.contact_phone || '').trim(),
        business_address: (profileForm.business_address || '').trim(),
        postal_code: (profileForm.postal_code || '').trim(),
      });
      setProfile((prev) => ({ ...prev, ...updated }));
      toast.success('Store details saved successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile details.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveBankDetails = async (e) => {
    e.preventDefault();
    const acct = (bankForm.bank_account_number || '').trim();
    const ifsc = (bankForm.bank_ifsc_code || '').trim().toUpperCase();

    if (!acct || acct.length < 6) {
      toast.error('Please enter a valid bank account number (minimum 6 digits).');
      return;
    }
    if (!ifsc || ifsc.length !== 11) {
      toast.error('A valid 11-character IFSC code is required (e.g. SBIN0000214).');
      return;
    }

    setSavingBank(true);
    try {
      const updated = await api.updateManufacturerProfile({
        bank_account_holder: (bankForm.bank_account_holder || '').trim(),
        bank_account_number: acct,
        bank_ifsc_code: ifsc,
        bank_name: (bankForm.bank_name || '').trim(),
      });
      setProfile((prev) => ({ ...prev, ...updated }));
      setEditingBank(false);
      toast.success('Payout settlement bank details saved successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update bank details.');
    } finally {
      setSavingBank(false);
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
      try {
        localStorage.setItem('wangs_is_registered_seller', 'true');
        window.dispatchEvent(new Event('wangs_seller_status_changed'));
      } catch {}
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
      if (editingProductId) {
        await api.updateManufacturerProduct(editingProductId, payload);
        toast.success(`"${newProd.title}" updated successfully!`);
      } else {
        await api.createManufacturerProduct(payload);
        toast.success('Pickle batch published and is now live for sale on the marketplace!');
      }
      setShowAddProductModal(false);
      setEditingProductId(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to save product');
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!product) return;
    const confirmMsg = `Are you sure you want to delete "${product.title}"?\n\nThis will permanently remove the product listing from your catalog and the live storefront.`;
    if (!window.confirm(confirmMsg)) return;

    setDeletingProductId(product.id);
    try {
      await api.deleteManufacturerProduct(product.id);
      toast.success(`"${product.title}" has been deleted.`);
      setProducts((prev) => (Array.isArray(prev) ? prev.filter((p) => p.id !== product.id) : prev));
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete product');
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleQuickUpdateStock = async (productId, nextQuantity) => {
    const qty = parseInt(nextQuantity, 10);
    if (isNaN(qty) || qty < 0) {
      toast.error('Stock quantity must be a non-negative number (0 or more).');
      return;
    }
    setUpdatingStockId(productId);
    try {
      await api.updateManufacturerProduct(productId, { stock_quantity: qty });
      setProducts((prev) =>
        Array.isArray(prev)
          ? prev.map((p) => (p.id === productId ? { ...p, stock_quantity: qty } : p))
          : prev
      );
      toast.success(`Inventory stock updated to ${qty} jars`);
      if (quickStockModal?.id === productId) {
        setQuickStockModal(null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update stock quantity');
    } finally {
      setUpdatingStockId(null);
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

  if (authLoading || (loading && user)) {
    return (
      <div className="max-w-7xl mx-auto py-24 px-4 text-center">
        <div className="w-10 h-10 border-4 border-forest-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-medium text-stone-600 mt-4">Loading artisan seller workspace...</p>
      </div>
    );
  }

  // 1. Dedicated Seller Login Space (when not authenticated)
  if (!user) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 bg-stone-50/50">
        <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200/90 shadow-2xl p-6 sm:p-8 space-y-6 animate-fade-in">
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

          {sellerLoginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-red-600" />
              <span>{sellerLoginError}</span>
            </div>
          )}

          <form onSubmit={handleSellerPasswordLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Username or Registered Email *
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="text"
                  required
                  value={sellerPasswordIdentifier}
                  onChange={(e) => setSellerPasswordIdentifier(e.target.value)}
                  placeholder="e.g. seller@brand.in or username"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-red-600"
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
                  className="text-[11px] text-red-600 hover:text-red-700 font-bold hover:underline"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-stone-400" />
                <input
                  type={showSellerPassword ? 'text' : 'password'}
                  required
                  value={sellerPassword}
                  onChange={(e) => setSellerPassword(e.target.value)}
                  placeholder="Enter your seller account password"
                  className="w-full pl-10 pr-11 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-red-600"
                />
                <button
                  type="button"
                  onClick={() => setShowSellerPassword(!showSellerPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer transition-colors"
                  title={showSellerPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showSellerPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={sellerLoginLoading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{sellerLoginLoading ? 'Signing In...' : 'Sign In to Seller Space'}</span>
              <ArrowRight size={15} />
            </button>
          </form>

          <div className="pt-2 border-t border-stone-100 space-y-2.5 text-center text-xs">
            <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-stone-700 text-[11px] leading-relaxed text-left flex items-start gap-2">
              <Sparkles size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Approved Seller?</strong> Sign in with your registered username or email and password to access your recipes, manage orders, and dispatch parcels.
              </span>
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <Link
                to="/manufacturer/register"
                className="text-stone-600 hover:text-red-600 font-medium"
              >
                Not yet authorized? <strong className="text-red-600 underline">Apply to Sell on Wangs</strong>
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

  // Safe array references
  const safeProducts = Array.isArray(products) ? products : (products?.results || []);
  const safeOrders = Array.isArray(orders) ? orders : (orders?.results || []);
  const safeCategories = Array.isArray(categories) ? categories : (categories?.results || []);

  const openAddProductModal = () => {
    setEditingProductId(null);
    const defaultCat = safeCategories.find((c) => c.slug === 'non-veg' || c.name.toLowerCase().includes('non')) || safeCategories[0];
    setNewProd({
      title: '',
      category_id: defaultCat?.id || safeCategories[0]?.id || '',
      short_description: '',
      description: '',
      base_price: '',
      price: '',
      mrp: '',
      weight_grams: '250',
      spice_level: 'HOT',
      dietary_type: defaultCat?.slug === 'veg' ? 'VEG' : 'NON_VEG',
      contains_non_veg_substance: false,
      ingredients: '',
      allergens: 'May contain traces of mustard or fermented soybeans (Axone)',
      storage_instructions: 'Store in cool dry place. Keep submerged in oil.',
      shelf_life: '9 Months',
      stock_quantity: '',
      primary_image_url: '',
      images: ['', '', ''],
    });
    setShowAddProductModal(true);
  };

  const openEditProductModal = (p) => {
    setEditingProductId(p.id);
    const existingImgs = (p.images || []).map((img) => (typeof img === 'string' ? img : (img?.image_url || '')));
    if (!existingImgs.length && p.primary_image_url) {
      existingImgs.push(p.primary_image_url);
    }
    while (existingImgs.length < 3) existingImgs.push('');

    const baseVal = p.base_price !== undefined && p.base_price !== null ? String(p.base_price) : '';
    setNewProd({
      title: p.title || '',
      category_id: p.category?.id || p.category_id || safeCategories[0]?.id || '',
      short_description: p.short_description || '',
      description: p.description || '',
      base_price: baseVal,
      price: p.price ? String(p.price) : '',
      mrp: p.mrp ? String(p.mrp) : '',
      weight_grams: p.weight_grams ? String(p.weight_grams) : '250',
      spice_level: p.spice_level || 'HOT',
      dietary_type: p.dietary_type || 'NON_VEG',
      contains_non_veg_substance: Boolean(p.contains_non_veg_substance),
      ingredients: p.ingredients || '',
      allergens: p.allergens || 'May contain traces of mustard or fermented soybeans (Axone)',
      storage_instructions: p.storage_instructions || 'Store in cool dry place. Keep submerged in oil.',
      shelf_life: p.shelf_life || '9 Months',
      stock_quantity: p.stock_quantity !== undefined && p.stock_quantity !== null ? String(p.stock_quantity) : '0',
      primary_image_url: p.primary_image_url || '',
      images: existingImgs.slice(0, 3),
    });
    setShowAddProductModal(true);
  };

  // Stock & Inventory Monitoring Calculations
  const totalStockJars = safeProducts.reduce((sum, p) => sum + (parseInt(p.stock_quantity, 10) || 0), 0);
  const lowStockCount = safeProducts.filter((p) => (p.stock_quantity > 0 && p.stock_quantity <= 5)).length;
  const outOfStockCount = safeProducts.filter((p) => (!p.stock_quantity || p.stock_quantity <= 0)).length;
  const healthyStockCount = safeProducts.filter((p) => p.stock_quantity > 5).length;

  const filteredProducts = safeProducts.filter((p) => {
    const qty = parseInt(p.stock_quantity, 10) || 0;
    if (productStockFilter === 'LOW') return qty > 0 && qty <= 5;
    if (productStockFilter === 'OUT') return qty === 0;
    if (productStockFilter === 'HEALTHY') return qty > 5;
    return true;
  });

  // Order filtration & statistics
  const pendingOrders = safeOrders.filter((o) => o.fulfillment_status === 'PENDING' || o.fulfillment_status === 'PACKED');
  const dispatchedOrders = safeOrders.filter((o) => o.fulfillment_status === 'DISPATCHED');
  const deliveredOrders = safeOrders.filter((o) => o.fulfillment_status === 'DELIVERED');

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'PENDING') return pendingOrders;
    if (orderStatusFilter === 'DISPATCHED') return dispatchedOrders;
    if (orderStatusFilter === 'DELIVERED') return deliveredOrders;
    return safeOrders;
  }, [safeOrders, orderStatusFilter, pendingOrders, dispatchedOrders, deliveredOrders]);

  // Bundle order metrics calculation
  const bundleOrdersCount = safeOrders.filter((o) => o.quantity >= 2).length;
  const bundlePercentage = safeOrders.length > 0 ? Math.round((bundleOrdersCount / safeOrders.length) * 100) : 0;
  const totalJarsSold = safeOrders.reduce((sum, o) => sum + (o.quantity || 1), 0);
  const avgBasketSize = safeOrders.length > 0 ? (totalJarsSold / safeOrders.length).toFixed(1) : '1.0';

  return (
    <div className="min-h-screen bg-stone-50/60 pb-16">
      {/* Top Professional Header Bar */}
      <header className="bg-white border-b border-stone-200/90 shadow-2xs sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Brand Identity & Status */}
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="relative group shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-50 border-2 border-stone-200/80 shadow-xs overflow-hidden flex items-center justify-center font-serif font-bold text-xl sm:text-2xl text-stone-800">
                  {profile.logo_image ? (
                    <img
                      src={resolveProductImage(profile.logo_image)}
                      alt={profile.business_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{getBrandInitials(profile.business_name)}</span>
                  )}
                </div>
                <label
                  className="absolute inset-0 bg-stone-950/70 text-white rounded-2xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[9px] font-bold p-1 text-center"
                  title="Click to update brand logo"
                >
                  <Camera size={15} className="mb-0.5" />
                  <span>{logoUploading ? 'Uploading...' : 'Change'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={logoUploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-serif text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                    {profile.business_name}
                  </h1>
                  {profile.status === 'APPROVED' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Approved Seller
                    </span>
                  ) : profile.status === 'PENDING' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <Clock size={11} /> Application Pending
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-50 text-red-800 border border-red-200">
                      Status: {profile.status}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-stone-500">
                  <span className="flex items-center gap-1 font-medium text-stone-700">
                    <MapPin size={12} className="text-stone-400" />
                    {profile.location_district || 'Nagaland, India'}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-800 bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-200/80">
                    <ShieldCheck size={12} className="text-emerald-600" />
                    FSSAI #{profile.fssai_license_number || 'Registered'}
                  </span>
                  <span>·</span>
                  <span className="text-[11px] text-stone-600 font-medium">
                    Commission: <strong className="text-forest-900 font-bold">{commissionRate}%</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
              <Link
                to={`/products?brand=${encodeURIComponent(profile.slug || profile.business_name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                title="View customer storefront"
              >
                <Eye size={14} className="text-forest-900" />
                <span>Public Store</span>
                <ExternalLink size={11} className="text-stone-400" />
              </Link>

              <button
                type="button"
                onClick={() => setShowSellerRulesModal(true)}
                className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow-2xs"
                title="Open Seller Rules & Packaging Handbook"
              >
                <FileText size={14} className="text-forest-800" />
                <span>Handbook</span>
              </button>

              {profile.status === 'APPROVED' && (
                <button
                  type="button"
                  onClick={openAddProductModal}
                  className="px-4 py-2 bg-forest-900 hover:bg-forest-950 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={15} />
                  <span>Add Product</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Primary Page Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-stone-100">
          <nav className="flex gap-2 sm:gap-6 text-xs font-semibold overflow-x-auto no-scrollbar whitespace-nowrap pt-2.5 pb-0.5">
            <button
              onClick={() => handleTabChange('overview')}
              className={`pb-2.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-forest-900 text-forest-950 font-bold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <Store size={15} className={activeTab === 'overview' ? 'text-forest-900' : 'text-stone-400'} />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => handleTabChange('products')}
              className={`pb-2.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'products'
                  ? 'border-forest-900 text-forest-950 font-bold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <Package size={15} className={activeTab === 'products' ? 'text-forest-900' : 'text-stone-400'} />
              <span>Products Catalog</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                activeTab === 'products' ? 'bg-forest-100 text-forest-900' : 'bg-stone-100 text-stone-600'
              }`}>
                {safeProducts.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange('orders')}
              className={`pb-2.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'border-forest-900 text-forest-950 font-bold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <Truck size={15} className={activeTab === 'orders' ? 'text-forest-900' : 'text-stone-400'} />
              <span>Orders & Shipping</span>
              {pendingOrders.length > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  {pendingOrders.length} pending
                </span>
              ) : (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === 'orders' ? 'bg-forest-100 text-forest-900' : 'bg-stone-100 text-stone-600'
                }`}>
                  {safeOrders.length}
                </span>
              )}
            </button>

            <button
              onClick={() => handleTabChange('financials')}
              className={`pb-2.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'financials'
                  ? 'border-forest-900 text-forest-950 font-bold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <DollarSign size={15} className={activeTab === 'financials' ? 'text-forest-900' : 'text-stone-400'} />
              <span>Earnings & Payouts</span>
            </button>

            <button
              onClick={() => handleTabChange('settings', 'brand')}
              className={`pb-2.5 border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'border-forest-900 text-forest-950 font-bold'
                  : 'border-transparent text-stone-600 hover:text-stone-900'
              }`}
            >
              <SlidersHorizontal size={15} className={activeTab === 'settings' ? 'text-forest-900' : 'text-stone-400'} />
              <span>Store Settings</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Pending Review Notice (only if not approved) */}
        {profile.status === 'PENDING' && (
          <div className="mb-6 p-4 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-xs text-amber-900 flex items-start gap-3 shadow-2xs">
            <AlertCircle size={18} className="text-amber-700 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">Application Under Review</p>
              <p className="mt-0.5 text-stone-600 leading-relaxed">
                Your workshop profile and FSSAI credentials have been submitted for platform authorization. Once confirmed by our verification team, your recipes will automatically appear on the live storefront.
              </p>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 1: DASHBOARD & OVERVIEW
           =================================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Quick Action Alert Bar if Pending Orders exist */}
            {pendingOrders.length > 0 && (
              <div className="p-4 bg-gradient-to-r from-amber-50 via-amber-100/70 to-cream-100 border border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center font-bold shrink-0">
                    <Truck size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 text-xs sm:text-sm">
                      {pendingOrders.length} Order{pendingOrders.length > 1 ? 's' : ''} Awaiting Packing & Dispatch
                    </h3>
                    <p className="text-[11px] text-stone-600">
                      Air courier packaging SLA is 24-48 business hours. Generate and print shipping labels directly.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { handleTabChange('orders'); setOrderStatusFilter('PENDING'); }}
                  className="px-4 py-2 bg-forest-900 hover:bg-forest-950 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 self-start sm:self-auto flex items-center gap-1.5 cursor-pointer"
                >
                  <span>View Pending Orders</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Gross Sales</span>
                <p className="text-2xl font-serif font-black text-stone-950">₹{financials?.total_sales || '0.00'}</p>
                <span className="text-[10px] text-stone-500 block">Total jar order volume</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Commission ({commissionRate}%)</span>
                <p className="text-2xl font-serif font-black text-stone-950">₹{financials?.total_commission_deducted || '0.00'}</p>
                <span className="text-[10px] text-amber-700 block">Platform service fee</span>
              </div>

              <div className="bg-forest-900 text-white p-5 rounded-2xl border border-forest-800 shadow-xs space-y-1">
                <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">Net Producer Earnings</span>
                <p className="text-2xl font-serif font-black text-white">₹{financials?.net_earnings || '0.00'}</p>
                <span className="text-[10px] text-cream-200 block">Direct bank payout total</span>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Active Products</span>
                <p className="text-2xl font-serif font-black text-stone-950">
                  {safeProducts.filter((p) => p.status === 'APPROVED').length}
                </p>
                <span className="text-[10px] text-emerald-700 block">Live on storefront</span>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50/70 p-5 rounded-2xl border border-amber-200 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-600" /> Bundle Orders
                </span>
                <p className="text-2xl font-serif font-black text-amber-950">
                  {bundleOrdersCount} <span className="text-xs font-sans font-normal text-amber-700">({bundlePercentage}%)</span>
                </p>
                <span className="text-[10px] text-amber-800 block">Avg basket: {avgBasketSize} jars</span>
              </div>
            </div>

            {/* Middle Grid: Catalog Health & Bundle Program */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Catalog Health Snapshot */}
              <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                    <Boxes size={17} className="text-forest-900" />
                    <span>Inventory Status</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleTabChange('products')}
                    className="text-xs font-bold text-forest-800 hover:text-forest-950 underline cursor-pointer"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-stone-500 font-medium block">Total Jars in Stock</span>
                      <span className="font-bold text-stone-900 text-base">{totalStockJars} jars</span>
                    </div>
                    <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">
                      {safeProducts.length} listings
                    </span>
                  </div>

                  <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-amber-800 font-medium block">Low Stock Alert (≤ 5 jars)</span>
                      <span className="font-bold text-amber-950 text-base">{lowStockCount} recipes</span>
                    </div>
                    {lowStockCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => { handleTabChange('products'); setProductStockFilter('LOW'); }}
                        className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Restock
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-700">Healthy</span>
                    )}
                  </div>

                  <div className="p-3 bg-red-50/60 rounded-xl border border-red-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-red-700 font-medium block">Out of Stock (0 jars)</span>
                      <span className="font-bold text-red-950 text-base">{outOfStockCount} recipes</span>
                    </div>
                    {outOfStockCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => { handleTabChange('products'); setProductStockFilter('OUT'); }}
                        className="px-2.5 py-1 bg-red-200 hover:bg-red-300 text-red-900 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        Review
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold text-stone-400">None</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Artisan Bundle Program Monitor */}
              <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-amber-100 text-amber-900 rounded-xl shrink-0">
                      <Sparkles size={17} />
                    </span>
                    <div>
                      <h3 className="font-serif font-bold text-base text-stone-900">
                        Brand Bundle & Volume System
                      </h3>
                      <p className="text-xs text-stone-500">
                        Shoppers curating 2–4 jars from your brand automatically save 10%
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSellerRulesModal(true)}
                    className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    <span>Read Policy Handbook</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <span className="font-bold text-stone-900 block">1 Jar (Single Order)</span>
                    <p className="text-stone-500 text-[11px] leading-relaxed">
                      Standard batch price. Full margin payout directly credited.
                    </p>
                    <span className="inline-block mt-1 font-mono text-[10px] text-stone-600 bg-white px-2 py-0.5 rounded border border-stone-200">
                      Standard Margin
                    </span>
                  </div>

                  <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 block">2–4 Jars Bundle</span>
                      <span className="bg-amber-600 text-white font-black text-[9px] px-1.5 py-0.2 rounded">10% OFF</span>
                    </div>
                    <p className="text-stone-700 text-[11px] leading-relaxed">
                      Shoppers mix recipes from your catalog with a flat 10% bundle discount.
                    </p>
                    <span className="inline-block mt-1 font-mono text-[10px] text-amber-800 bg-white px-2 py-0.5 rounded border border-amber-200">
                      Same Brand Only
                    </span>
                  </div>

                  <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-stone-900 block">Air Cargo Packaging</span>
                      <span className="bg-purple-700 text-white font-black text-[9px] px-1.5 py-0.2 rounded">Express</span>
                    </div>
                    <p className="text-stone-700 text-[11px] leading-relaxed">
                      Cushioned packaging & courier dispatch labels built-in for multi-jar boxes.
                    </p>
                    <span className="inline-block mt-1 font-mono text-[10px] text-purple-800 bg-white px-2 py-0.5 rounded border border-purple-200">
                      Shock-Proof Shipping
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                  <Truck size={17} className="text-forest-900" />
                  <span>Recent Customer Orders</span>
                </h3>
                <button
                  type="button"
                  onClick={() => handleTabChange('orders')}
                  className="text-xs font-bold text-forest-800 hover:text-forest-950 underline cursor-pointer"
                >
                  View All Orders ({safeOrders.length})
                </button>
              </div>

              {safeOrders.length === 0 ? (
                <div className="py-8 text-center text-stone-400 text-xs">
                  <Store size={28} className="mx-auto text-stone-300 mb-2" />
                  <p>No customer orders placed yet. As soon as a customer orders your recipes, they will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-stone-100 text-xs">
                  {safeOrders.slice(0, 5).map((o) => (
                    <div key={o.order_item_id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-stone-50/50 rounded-xl px-2 transition-colors">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-stone-900">#{o.order_number}</span>
                          <span className="font-semibold text-stone-800">· {o.product_title}</span>
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
                          <strong className="text-stone-700">{o.customer_name}</strong> · Qty: {o.quantity} · Destination: {o.shipping_city}, {o.shipping_state}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <div className="text-right">
                          <span className="font-bold text-stone-900 block font-mono text-xs">
                            ₹{parseFloat(o.manufacturer_payout).toFixed(2)}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded font-semibold inline-block ${
                            o.fulfillment_status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : o.fulfillment_status === 'DISPATCHED'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {o.fulfillment_status}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedParcelOrder(o)}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-forest-900 hover:text-white text-stone-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                          title="Print Parcel Shipping Label"
                        >
                          <Printer size={13} />
                          <span>Slip</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: PRODUCTS CATALOG
           =================================================================== */}
        {activeTab === 'products' && (
          <div className="space-y-5 animate-fade-in">
            {/* Inventory KPI Status Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-0.5">
                <span className="text-stone-500 text-[11px] block font-medium">Total Listed Recipes</span>
                <span className="text-xl font-serif font-black text-stone-900 block">{safeProducts.length}</span>
                <span className="text-[10px] text-stone-400">Active catalog items</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-0.5">
                <span className="text-stone-500 text-[11px] block font-medium">Total Jars in Stock</span>
                <span className="text-xl font-serif font-black text-forest-950 block">{totalStockJars}</span>
                <span className="text-[10px] text-emerald-700 font-semibold">Available for order</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-0.5">
                <span className="text-stone-500 text-[11px] block font-medium">Low Stock Watch (≤ 5)</span>
                <span className={`text-xl font-serif font-black block ${lowStockCount > 0 ? 'text-amber-600' : 'text-stone-900'}`}>
                  {lowStockCount}
                </span>
                <span className="text-[10px] text-amber-700">Restock advised</span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-0.5">
                <span className="text-stone-500 text-[11px] block font-medium">Out of Stock (0 jars)</span>
                <span className={`text-xl font-serif font-black block ${outOfStockCount > 0 ? 'text-red-600' : 'text-stone-900'}`}>
                  {outOfStockCount}
                </span>
                <span className="text-[10px] text-stone-400">Hidden from checkout</span>
              </div>
            </div>

            {/* Filter Bar & Add Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'ALL', label: `All Products (${safeProducts.length})` },
                  { id: 'HEALTHY', label: `Healthy Stock (${healthyStockCount})` },
                  { id: 'LOW', label: `Low Stock (${lowStockCount})`, alert: lowStockCount > 0 },
                  { id: 'OUT', label: `Out of Stock (${outOfStockCount})`, alert: outOfStockCount > 0 },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setProductStockFilter(pill.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      productStockFilter === pill.id
                        ? 'bg-forest-900 text-white shadow-2xs'
                        : pill.alert
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                        : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {profile.status === 'APPROVED' && (
                <button
                  type="button"
                  onClick={openAddProductModal}
                  className="px-4 py-2 bg-forest-900 hover:bg-forest-950 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs self-start sm:self-auto shrink-0"
                >
                  <Plus size={15} />
                  <span>Add New Recipe Batch</span>
                </button>
              )}
            </div>

            {/* Products Table Card */}
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                    <tr>
                      <th className="p-3.5">Product Recipe</th>
                      <th className="p-3.5">Category</th>
                      <th className="p-3.5">Customer Price</th>
                      <th className="p-3.5">Pricing Formula (Base + Comm + Courier)</th>
                      <th className="p-3.5">Inventory Stock</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-stone-800">
                    {filteredProducts.map((p) => {
                      const actual = parseFloat(p.price) || 0;
                      const withoutDelivery = Math.max(0, actual - deliveryCharge);
                      const base = Math.max(0, Math.round(withoutDelivery / (1 + commissionRate / 100)));
                      const comm = Math.max(0, withoutDelivery - base);
                      const qty = parseInt(p.stock_quantity, 10) || 0;

                      return (
                        <tr key={p.id} className="hover:bg-stone-50/60 transition-colors">
                          <td className="p-3.5">
                            <div className="flex items-center gap-3">
                              <img
                                src={resolveProductImage(p.primary_image_url || (p.images && p.images[0] ? (typeof p.images[0] === 'string' ? p.images[0] : p.images[0].image_url) : ''))}
                                alt={p.title}
                                className="w-11 h-11 object-cover rounded-xl border border-stone-200 shrink-0 shadow-2xs"
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = '/featured-pouches.png';
                                }}
                              />
                              <div>
                                <p className="font-bold text-stone-900 leading-tight text-xs">{p.title}</p>
                                <span className="text-[10px] text-stone-500 font-mono mt-0.5 block">{p.weight_grams}g · {p.dietary_type}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className="font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded-lg border border-stone-200/80 text-[11px]">
                              {p.category?.name || 'Pickle'}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <span className="font-black text-forest-950 text-sm font-mono">₹{actual.toFixed(0)}</span>
                            <span className="block text-[10px] font-semibold text-emerald-700">Free Customer Delivery</span>
                          </td>

                          <td className="p-3.5">
                            <div className="text-[11px] text-stone-700 font-medium whitespace-nowrap">
                              <span className="text-forest-900 font-bold">₹{base}</span> (Base) + <span className="text-amber-800">₹{comm}</span> ({commissionRate}%) + <span className="text-blue-700">₹{deliveryCharge}</span> (Air)
                            </div>
                            <span className="text-[10px] text-stone-400 font-semibold block mt-0.5">
                              Net Seller Payout: ₹{base}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                qty === 0
                                  ? 'bg-red-100 text-red-800 border border-red-200'
                                  : qty <= 5
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}>
                                {qty === 0 ? 'Out of Stock' : `${qty} jars in stock`}
                              </span>
                            </div>

                            {/* Quantity Quick Step Controls */}
                            <div className="flex items-center gap-1 mt-1.5">
                              <button
                                type="button"
                                disabled={qty <= 0 || updatingStockId === p.id}
                                onClick={() => handleQuickUpdateStock(p.id, Math.max(0, qty - 1))}
                                className="w-5 h-5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer disabled:opacity-40"
                                title="Subtract 1 jar"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                disabled={updatingStockId === p.id}
                                onClick={() => setQuickStockModal({ id: p.id, title: p.title, currentStock: qty, nextStock: qty })}
                                className="px-2 py-0.5 font-mono text-[11px] font-bold text-forest-950 hover:bg-amber-100 bg-stone-100 rounded border border-stone-200 cursor-pointer"
                                title="Click to edit stock quantity"
                              >
                                {updatingStockId === p.id ? '...' : `${qty}`}
                              </button>
                              <button
                                type="button"
                                disabled={updatingStockId === p.id}
                                onClick={() => handleQuickUpdateStock(p.id, qty + 1)}
                                className="w-5 h-5 rounded-md bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center font-bold text-xs cursor-pointer disabled:opacity-40"
                                title="Add 1 jar"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                              p.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {p.status}
                            </span>
                          </td>

                          <td className="p-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setQuickStockModal({ id: p.id, title: p.title, currentStock: qty, nextStock: qty })}
                                className="px-2.5 py-1 bg-stone-100 hover:bg-forest-900 hover:text-white text-stone-700 rounded-lg text-[11px] font-semibold border border-stone-200 transition-colors flex items-center gap-1 cursor-pointer"
                                title="Manage stock"
                              >
                                <Boxes size={12} />
                                <span>Stock</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditProductModal(p)}
                                className="p-1.5 text-stone-600 hover:text-forest-950 hover:bg-stone-100 rounded-lg border border-stone-200 transition-colors cursor-pointer"
                                title="Edit recipe & pricing"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                disabled={deletingProductId === p.id}
                                onClick={() => handleDeleteProduct(p)}
                                className="p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 transition-all cursor-pointer disabled:opacity-50"
                                title="Delete product"
                              >
                                <Trash2 size={13} className={deletingProductId === p.id ? 'animate-spin' : ''} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filteredProducts.length === 0 && (
                <div className="p-12 text-center text-stone-500">
                  <Boxes size={32} className="mx-auto text-stone-300 mb-2" />
                  <p className="font-semibold text-stone-700">No products found matching this filter.</p>
                  <p className="text-xs text-stone-400 mt-1">Change the filter tab or click "Add New Recipe Batch" to publish a new product.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 3: ORDERS & SHIPPING
           =================================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-5 animate-fade-in">
            {/* Filter Tabs for Orders */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'ALL', label: `All Orders (${safeOrders.length})` },
                  { id: 'PENDING', label: `Needs Packaging (${pendingOrders.length})`, alert: pendingOrders.length > 0 },
                  { id: 'DISPATCHED', label: `Dispatched (${dispatchedOrders.length})` },
                  { id: 'DELIVERED', label: `Delivered (${deliveredOrders.length})` },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => setOrderStatusFilter(pill.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      orderStatusFilter === pill.id
                        ? 'bg-forest-900 text-white shadow-2xs'
                        : pill.alert
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-black'
                        : 'bg-white hover:bg-stone-100 text-stone-700 border border-stone-200'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              <div className="text-xs text-stone-500 font-medium self-start sm:self-auto flex items-center gap-1.5">
                <Truck size={14} className="text-forest-900" />
                <span>Air Cargo Packaging: Plastic pouch or jar with shock-proof cushion</span>
              </div>
            </div>

            {/* Orders Table Card */}
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold">
                    <tr>
                      <th className="p-3.5">Order Reference</th>
                      <th className="p-3.5">Recipient Destination</th>
                      <th className="p-3.5">Recipe Item</th>
                      <th className="p-3.5">Quantity / Bundle</th>
                      <th className="p-3.5">Net Payout</th>
                      <th className="p-3.5">Fulfillment Status</th>
                      <th className="p-3.5 text-right">Shipping Label / Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredOrders.map((o) => (
                      <tr key={o.order_item_id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="p-3.5">
                          <span className="font-mono font-black text-stone-900 block text-xs">#{o.order_number}</span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {new Date(o.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <p className="font-bold text-stone-900 text-xs">{o.customer_name}</p>
                          <p className="text-[11px] text-stone-600">
                            {o.shipping_city}, {o.shipping_state} {o.shipping_postal_code ? `- ${o.shipping_postal_code}` : ''}
                          </p>
                          {o.customer_phone && (
                            <p className="text-[10px] font-mono text-stone-500 mt-0.5 flex items-center gap-1">
                              <Phone size={10} className="text-stone-400" />
                              <span>{o.customer_phone}</span>
                            </p>
                          )}
                        </td>

                        <td className="p-3.5">
                          <p className="font-medium text-stone-900">{o.product_title}</p>
                          <span className="text-[10px] text-stone-500 font-mono">{o.weight_grams}g jar</span>
                        </td>

                        <td className="p-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-stone-900 font-mono text-sm">{o.quantity}</span>
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

                        <td className="p-3.5 font-black text-forest-900 font-mono text-sm">
                          ₹{parseFloat(o.manufacturer_payout).toFixed(2)}
                        </td>

                        <td className="p-3.5">
                          <div className="space-y-1">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold block w-max ${
                              o.fulfillment_status === 'DISPATCHED'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : o.fulfillment_status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : o.fulfillment_status === 'PACKED'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}>
                              {o.fulfillment_status}
                            </span>
                            {o.tracking_number && (
                              <span className="font-mono text-[9px] text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 block w-max" title={o.courier_partner}>
                                AWB: {o.tracking_number}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => setSelectedParcelOrder(o)}
                              className="px-3 py-1.5 bg-forest-900 hover:bg-forest-950 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                              title="Print Parcel Shipping Slip"
                            >
                              <Printer size={13} />
                              <span>Print Parcel Slip</span>
                            </button>

                            <select
                              value={o.fulfillment_status}
                              onChange={(e) => handleUpdateFulfillment(o.order_item_id, e.target.value)}
                              className="p-1.5 border border-stone-200 rounded-xl text-xs focus:ring-1 focus:ring-forest-800 font-medium bg-white cursor-pointer"
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

              {filteredOrders.length === 0 && (
                <div className="p-12 text-center text-stone-500">
                  <Truck size={32} className="mx-auto text-stone-300 mb-2" />
                  <p className="font-semibold text-stone-700">No orders found in this view.</p>
                  <p className="text-xs text-stone-400 mt-1">Try switching the order filter tab above to view other order statuses.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: FINANCIALS & SETTLEMENTS
           =================================================================== */}
        {activeTab === 'financials' && (
          <div className="space-y-6 text-xs animate-fade-in">
            {/* Financial Overview Card */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <DollarSign size={18} className="text-forest-900" />
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Producer Financial Performance Snapshot
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Automated Escrow Accounting
                </span>
              </div>

              <p className="text-stone-600 leading-relaxed max-w-3xl">
                Wangs operates transparent accounting. When customer orders complete, the agreed {financials?.effective_commission_rate || commissionRate}% marketplace commission is deducted from gross line sales. Producer net payout is deposited directly into your verified bank account via weekly NEFT/RTGS settlement.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/90 space-y-1">
                  <span className="text-stone-500 text-[11px] font-medium block">Total Gross Line Sales</span>
                  <span className="font-serif font-black text-2xl text-stone-950 block">₹{financials?.total_sales || '0.00'}</span>
                  <span className="text-[10px] text-stone-400">Total customer orders</span>
                </div>

                <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-1">
                  <span className="text-amber-900 text-[11px] font-medium block">Platform Commission ({financials?.effective_commission_rate || commissionRate}%)</span>
                  <span className="font-serif font-black text-2xl text-amber-950 block">₹{financials?.total_commission_deducted || '0.00'}</span>
                  <span className="text-[10px] text-amber-700">Calculated per line item</span>
                </div>

                <div className="p-4 bg-forest-900 text-white rounded-2xl border border-forest-800 space-y-1 shadow-xs">
                  <span className="text-amber-300 text-[11px] font-bold block uppercase tracking-wider">Net Payable to Seller</span>
                  <span className="font-serif font-black text-2xl text-white block">₹{financials?.net_earnings || '0.00'}</span>
                  <span className="text-[10px] text-cream-200">Disbursed to your bank account</span>
                </div>
              </div>
            </div>

            {/* Quick Bank Account Display Card */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Landmark size={18} className="text-forest-900" />
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Disbursement Payout Bank Account
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => handleTabChange('settings', 'payout')}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-forest-900 hover:text-white text-stone-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Edit3 size={13} />
                  <span>Update Bank in Settings</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-stone-50/70 p-4 rounded-xl border border-stone-200/80">
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Account Holder</span>
                  <span className="font-semibold text-stone-900 block mt-0.5">
                    {profile?.bank_account_holder || <span className="text-stone-400 italic">Not provided</span>}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Bank Name</span>
                  <span className="font-semibold text-stone-900 block mt-0.5">
                    {profile?.bank_name || <span className="text-stone-400 italic">Not provided</span>}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Account Number</span>
                  <span className="font-mono font-bold text-stone-900 block mt-0.5">
                    {profile?.bank_account_number ? `••••${profile.bank_account_number.slice(-4)}` : <span className="text-stone-400 italic">Not provided</span>}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">IFSC Code</span>
                  <span className="font-mono font-bold text-forest-950 block mt-0.5">
                    {profile?.bank_ifsc_code || <span className="text-stone-400 italic">Not provided</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Settlement History Card */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
              <h3 className="font-serif font-bold text-base text-stone-900">Settlement Transfer History</h3>
              {financials?.settlement_history?.length === 0 ? (
                <p className="text-stone-500 py-3">No settlement disbursements recorded yet. Accruals will be included in the upcoming weekly cycle.</p>
              ) : (
                <div className="divide-y divide-stone-100">
                  {financials?.settlement_history?.map((s) => (
                    <div key={s.id} className="py-3 flex justify-between items-center">
                      <div>
                        <span className="font-bold font-mono text-stone-900">{s.settlement_reference}</span>
                        <span className="text-stone-500 text-[11px] block">{s.period_start} to {s.period_end}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-stone-900 font-mono text-sm">₹{parseFloat(s.net_payable).toFixed(2)}</span>
                        <span className="text-[10px] block font-semibold text-emerald-700">{s.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 5: STORE SETTINGS (DE-CROWDED INTO CLEAN SUB-PAGES)
           =================================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-6 animate-fade-in">
            {/* Settings Sub-Navigation Header */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-serif font-bold text-lg sm:text-xl text-stone-900 flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-forest-900" />
                  <span>Artisan Store Settings & Configuration</span>
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Manage your brand identity, workshop location, bank payouts, and regulatory food safety licenses
                </p>
              </div>

              {/* Sub-Page Navigation Buttons */}
              <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl self-start sm:self-auto overflow-x-auto no-scrollbar">
                {[
                  { id: 'brand', label: 'Brand Identity', icon: Store },
                  { id: 'contact', label: 'Kitchen & Contact', icon: MapPin },
                  { id: 'payout', label: 'Bank Payouts', icon: Landmark },
                  { id: 'compliance', label: 'Compliance & Rules', icon: ShieldCheck },
                ].map((sub) => {
                  const Icon = sub.icon;
                  const isActive = settingsSubTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSettingsSubChange(sub.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                        isActive
                          ? 'bg-white text-forest-950 shadow-2xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      <Icon size={13} className={isActive ? 'text-forest-900' : 'text-stone-400'} />
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* -------------------------------------------------------------
                SUB-PAGE 1: BRAND IDENTITY & STOREFRONT
               ------------------------------------------------------------- */}
            {settingsSubTab === 'brand' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
                {/* Brand Logo & Upload Card */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-5">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <h3 className="font-serif font-bold text-stone-900 text-sm flex items-center gap-2">
                        <Camera size={16} className="text-forest-900" />
                        <span>Brand Logo</span>
                      </h3>
                      {profile.logo_image ? (
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle size={10} /> Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles size={10} /> Monogram
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <div className="relative group">
                        <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-stone-200 shadow-sm bg-amber-50 text-stone-800 flex items-center justify-center font-serif font-bold text-2xl">
                          {profile.logo_image ? (
                            <img
                              src={resolveProductImage(profile.logo_image)}
                              alt={profile.business_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{getBrandInitials(profile.business_name)}</span>
                          )}
                        </div>

                        <label
                          className="absolute inset-0 rounded-2xl bg-stone-950/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
                          title="Upload new brand logo"
                        >
                          <Camera size={18} className="mb-1" />
                          <span>{logoUploading ? 'Uploading...' : 'Change Logo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={logoUploading}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleLogoUpload(file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                      </div>

                      <p className="font-serif font-bold text-stone-900 text-base mt-3">
                        {profile.business_name}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {profile.location_district || 'Nagaland, India'}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-stone-100">
                      <label className={`w-full py-2.5 px-3 bg-forest-900 hover:bg-forest-950 text-white font-bold text-xs rounded-xl shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition-colors ${logoUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <UploadCloud size={15} />
                        <span>{logoUploading ? 'Uploading & Optimizing...' : profile.logo_image ? 'Upload New Brand Logo' : 'Upload Brand Logo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={logoUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleLogoUpload(file);
                            e.target.value = '';
                          }}
                        />
                      </label>

                      {profile.logo_image && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          disabled={logoUploading}
                          className="w-full py-2 px-3 bg-white hover:bg-red-50 border border-red-200 text-red-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 size={13} />
                          <span>Remove Custom Logo</span>
                        </button>
                      )}
                    </div>

                    <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                      <p className="font-bold text-stone-800">Guidelines:</p>
                      <p>• 1:1 Square (e.g. 500×500 px)</p>
                      <p>• Formats: JPG, PNG, WebP (up to 12MB)</p>
                      <p>• Appears on brand storefront and shipping slips</p>
                    </div>
                  </div>

                  {/* Customer Storefront Card Live Preview */}
                  <div className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-2xs space-y-3">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                      Live Storefront Card Preview
                    </span>
                    <BrandCard brand={profile} />
                    <p className="text-[10px] text-stone-400 text-center italic">
                      How shoppers see your brand in store carousels
                    </p>
                  </div>
                </div>

                {/* Brand Story & Tagline Form */}
                <div className="lg:col-span-2">
                  <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-2xl border border-stone-200/90 shadow-2xs space-y-5">
                    <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                      <h3 className="font-serif font-bold text-stone-900 text-base">
                        Brand Tagline & Culinary Story
                      </h3>
                      <Link
                        to={`/products?brand=${encodeURIComponent(profile.slug || profile.business_name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-forest-800 hover:text-forest-950 font-bold flex items-center gap-1"
                      >
                        <Eye size={13} />
                        <span>View Live Storefront</span>
                      </Link>
                    </div>

                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">
                          Registered Brand Name
                        </label>
                        <input
                          type="text"
                          disabled
                          value={profile.business_name}
                          className="w-full px-3.5 py-2.5 bg-stone-100 border border-stone-200 rounded-xl text-stone-700 font-semibold cursor-not-allowed"
                        />
                        <span className="text-[10px] text-stone-400 mt-1 block">Brand name cannot be changed without administrator approval.</span>
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">
                          Brand Tagline / Punchline
                        </label>
                        <input
                          type="text"
                          value={profileForm.tagline}
                          onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                          placeholder="e.g. Kohima's Heritage Wood-Smoked Kitchen"
                          maxLength={180}
                          className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                        />
                        <span className="text-[10px] text-stone-400 mt-1 block">Appears directly beneath your brand title on the storefront.</span>
                      </div>

                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">
                          Artisan Heritage Story & Kitchen Recipe Origins
                        </label>
                        <textarea
                          rows={6}
                          value={profileForm.brand_story}
                          onChange={(e) => setProfileForm({ ...profileForm, brand_story: e.target.value })}
                          placeholder="Share your family pickle recipe tradition, wood-smoking technique, or indigenous ingredients used in your kitchen..."
                          className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800 resize-y leading-relaxed"
                        />
                        <span className="text-[10px] text-stone-400 mt-1 block">Displayed on your brand dedicated storefront page.</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-3 border-t border-stone-100">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-5 py-2.5 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl text-xs shadow-2xs disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-colors"
                      >
                        <CheckCircle size={14} />
                        <span>{savingProfile ? 'Saving Changes...' : 'Save Brand Story'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                SUB-PAGE 2: WORKSHOP KITCHEN & CONTACT DETAILS
               ------------------------------------------------------------- */}
            {settingsSubTab === 'contact' && (
              <div className="max-w-3xl mx-auto animate-fade-in">
                <form onSubmit={handleSaveProfile} className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/90 shadow-2xs space-y-5 text-xs">
                  <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                    <div>
                      <h3 className="font-serif font-bold text-stone-900 text-base flex items-center gap-2">
                        <MapPin size={17} className="text-forest-900" />
                        <span>Workshop Location & Courier Dispatch Address</span>
                      </h3>
                      <p className="text-stone-500 text-[11px] mt-0.5">
                        Used as the pickup origin address on courier shipping slips and customer manifests.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">
                        Workshop District / City *
                      </label>
                      <input
                        type="text"
                        required
                        value={profileForm.location_district}
                        onChange={(e) => setProfileForm({ ...profileForm, location_district: e.target.value })}
                        placeholder="e.g. Kohima, Nagaland"
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                      />
                    </div>

                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">
                        Workshop PIN Code
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        value={profileForm.postal_code}
                        onChange={(e) => setProfileForm({ ...profileForm, postal_code: e.target.value.replace(/\D/g, '') })}
                        placeholder="e.g. 797001"
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Full Commercial Kitchen / Workshop Street Address
                    </label>
                    <textarea
                      rows={3}
                      value={profileForm.business_address}
                      onChange={(e) => setProfileForm({ ...profileForm, business_address: e.target.value })}
                      placeholder="Detailed address with landmark for courier pickup..."
                      className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                    />
                    <span className="text-[10px] text-stone-400 mt-1 block">Printed on shipping labels under 'SHIP FROM'.</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">
                        Dispatch Phone Contact *
                      </label>
                      <input
                        type="tel"
                        required
                        value={profileForm.contact_phone}
                        onChange={(e) => setProfileForm({ ...profileForm, contact_phone: e.target.value })}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800 font-mono"
                      />
                      <span className="text-[10px] text-stone-400 mt-1 block">Called by logistics partner during pickup.</span>
                    </div>

                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">
                        Order Notification Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={profileForm.contact_email}
                        onChange={(e) => setProfileForm({ ...profileForm, contact_email: e.target.value })}
                        placeholder="e.g. workshop@brand.com"
                        className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                      />
                      <span className="text-[10px] text-stone-400 mt-1 block">Instant email notifications for new orders are sent here.</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-3 border-t border-stone-100">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="px-6 py-2.5 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl text-xs shadow-2xs disabled:opacity-50 flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <CheckCircle size={14} />
                      <span>{savingProfile ? 'Saving Address...' : 'Save Workshop & Contact Details'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* -------------------------------------------------------------
                SUB-PAGE 3: BANK PAYOUT & SETTLEMENT ACCOUNT
               ------------------------------------------------------------- */}
            {settingsSubTab === 'payout' && (
              <div className="max-w-3xl mx-auto animate-fade-in space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/90 shadow-2xs space-y-5 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                        <Landmark size={18} className="text-amber-800" />
                      </div>
                      <div>
                        <h3 className="font-serif font-bold text-base text-stone-900">
                          Direct Payout Settlement Bank Account
                        </h3>
                        <p className="text-[11px] text-stone-500">
                          Weekly sales disbursements are transferred directly to this account via NEFT/RTGS
                        </p>
                      </div>
                    </div>

                    {!editingBank ? (
                      <button
                        type="button"
                        onClick={() => setEditingBank(true)}
                        className="px-3.5 py-2 bg-stone-100 hover:bg-forest-900 hover:text-white text-stone-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
                      >
                        <Edit3 size={13} />
                        <span>Update Bank Account</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setEditingBank(false)}
                        className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
                      >
                        <X size={13} />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>

                  {!editingBank ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50/70 p-5 rounded-2xl border border-stone-200/80">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Account Holder Name</span>
                          <span className="font-bold text-stone-900 block mt-1 text-sm">
                            {profile?.bank_account_holder || <span className="text-stone-400 italic font-normal">Not provided</span>}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Bank Name</span>
                          <span className="font-bold text-stone-900 block mt-1 text-sm">
                            {profile?.bank_name || <span className="text-stone-400 italic font-normal">Not provided</span>}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Account Number</span>
                          <span className="font-mono font-bold text-stone-900 block mt-1 text-sm">
                            {profile?.bank_account_number ? `•••• •••• •••• ${profile.bank_account_number.slice(-4)}` : <span className="text-stone-400 italic font-normal">Not provided</span>}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">IFSC Code</span>
                          <span className="font-mono font-bold text-forest-950 block mt-1 text-sm">
                            {profile?.bank_ifsc_code || <span className="text-stone-400 italic font-normal">Not provided</span>}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-stone-700 text-[11px] leading-relaxed">
                        <ShieldCheck size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-emerald-950 block">Encrypted Payout Channel:</strong>
                          Your bank information is encrypted and strictly used for automated weekly sales transfers. No payment processing fees are deducted from your base payout.
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveBankDetails} className="space-y-4 bg-stone-50/80 p-5 rounded-2xl border border-stone-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-stone-700 font-semibold mb-1 text-[11px]">Account Holder Name *</label>
                          <input
                            type="text"
                            required
                            value={bankForm.bank_account_holder}
                            onChange={(e) => setBankForm({ ...bankForm, bank_account_holder: e.target.value })}
                            placeholder="As printed on bank passbook"
                            className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                          />
                        </div>
                        <div>
                          <label className="block text-stone-700 font-semibold mb-1 text-[11px]">Bank Name *</label>
                          <input
                            type="text"
                            required
                            value={bankForm.bank_name}
                            onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                            placeholder="e.g. State Bank of India, HDFC"
                            className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-stone-700 font-semibold mb-1 text-[11px]">Bank Account Number *</label>
                          <input
                            type="text"
                            required
                            value={bankForm.bank_account_number}
                            onChange={(e) => setBankForm({ ...bankForm, bank_account_number: e.target.value.replace(/\s+/g, '') })}
                            placeholder="Full bank account number"
                            className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                          />
                        </div>
                        <div>
                          <label className="block text-stone-700 font-semibold mb-1 text-[11px]">IFSC Code (11 Characters) *</label>
                          <input
                            type="text"
                            required
                            maxLength={11}
                            value={bankForm.bank_ifsc_code}
                            onChange={(e) => setBankForm({ ...bankForm, bank_ifsc_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })}
                            placeholder="e.g. SBIN0000214"
                            className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl font-mono uppercase text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                        <button
                          type="button"
                          onClick={() => setEditingBank(false)}
                          className="px-4 py-2 bg-white border border-stone-300 text-stone-700 font-bold rounded-xl text-xs hover:bg-stone-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingBank}
                          className="px-5 py-2 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl text-xs shadow-2xs disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                        >
                          <CheckCircle size={13} />
                          <span>{savingBank ? 'Saving...' : 'Save Bank Account'}</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------
                SUB-PAGE 4: COMPLIANCE, LICENSES & SELLER RULES
               ------------------------------------------------------------- */}
            {settingsSubTab === 'compliance' && (
              <div className="max-w-3xl mx-auto animate-fade-in space-y-6 text-xs">
                {/* FSSAI & GSTIN Card */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/90 shadow-2xs space-y-5">
                  <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
                    <h3 className="font-serif font-bold text-stone-900 text-base flex items-center gap-2">
                      <ShieldCheck size={18} className="text-emerald-700" />
                      <span>Food Safety & Regulatory Licensing</span>
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Verified
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                        FSSAI Food License / Registration
                      </span>
                      <span className="font-mono font-black text-stone-900 text-base block">
                        #{profile.fssai_license_number || '14-digit registered'}
                      </span>
                      <span className="text-[10px] text-emerald-700 block">
                        ✓ Mandatory license verified for commercial pickle distribution
                      </span>
                    </div>

                    <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-1">
                      <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
                        GSTIN (Goods & Services Tax)
                      </span>
                      <span className="font-mono font-bold text-stone-800 text-base block">
                        {profile.gst_number || 'Exempt / Composition Scheme'}
                      </span>
                      <span className="text-[10px] text-stone-500 block">
                        Recorded on settlement tax statements
                      </span>
                    </div>
                  </div>
                </div>

                {/* Seller Rules Handbook Card */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/90 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                    <div>
                      <h3 className="font-serif font-bold text-stone-900 text-base flex items-center gap-2">
                        <FileText size={17} className="text-forest-900" />
                        <span>Official Wangs Artisan Seller Policy</span>
                      </h3>
                      <p className="text-stone-500 text-[11px] mt-0.5">
                        Covers batch pricing above ₹100, the 10% bundle discount system, and air courier dispatch SLAs.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <a
                        href="/documents/wangs_seller_rules.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        download="wangs_seller_rules.pdf"
                        className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <Download size={13} />
                        <span>Download PDF</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setShowSellerRulesModal(true)}
                        className="px-3.5 py-2 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                      >
                        <Eye size={13} />
                        <span>View Handbook</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-stone-600 leading-relaxed text-[11px]">
                    <p>• <strong>Strict Pricing Rule:</strong> All product listings must be priced above ₹100 (minimum ₹101).</p>
                    <p>• <strong>Flexible Brand Bundles:</strong> Customers who select 2 to 4 recipes exclusively from your brand catalog receive a 10% discount.</p>
                    <p>• <strong>Leak-Proof Packaging:</strong> Jars and pouches must feature airtight seals with bubble wrap/cushioning for safe cargo delivery.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* =====================================================================
          QUICK STOCK MANAGEMENT MODAL
         ===================================================================== */}
      {quickStockModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/75 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Boxes size={18} className="text-forest-900" />
                <h3 className="font-serif font-bold text-base text-stone-900">Manage Stock Quantity</h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickStockModal(null)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-1">
              <p className="font-bold text-stone-900 text-xs">{quickStockModal.title}</p>
              <p className="text-[11px] text-stone-500">
                Currently listed stock: <strong className="font-mono text-stone-900">{quickStockModal.currentStock} jars</strong>
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1">
                Available Jars in Inventory:
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuickStockModal((prev) => ({ ...prev, nextStock: Math.max(0, (parseInt(prev.nextStock, 10) || 0) - 1) }))}
                  className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-base flex items-center justify-center cursor-pointer select-none"
                  title="Subtract 1 jar"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  value={quickStockModal.nextStock}
                  onChange={(e) => setQuickStockModal((prev) => ({ ...prev, nextStock: e.target.value }))}
                  className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-center font-mono font-bold text-stone-900 text-base focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
                <button
                  type="button"
                  onClick={() => setQuickStockModal((prev) => ({ ...prev, nextStock: (parseInt(prev.nextStock, 10) || 0) + 1 }))}
                  className="w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-base flex items-center justify-center cursor-pointer select-none"
                  title="Add 1 jar"
                >
                  +
                </button>
              </div>
            </div>

            {/* Quick Add Presets */}
            <div className="space-y-1">
              <span className="text-[10px] text-stone-500 uppercase font-bold tracking-wider block">Quick Add Batch:</span>
              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                {[5, 10, 25, 50].map((batch) => (
                  <button
                    key={batch}
                    type="button"
                    onClick={() => setQuickStockModal((prev) => ({
                      ...prev,
                      nextStock: (parseInt(prev.nextStock, 10) || 0) + batch
                    }))}
                    className="py-1.5 rounded-lg bg-stone-100 hover:bg-amber-100 border border-stone-200 text-stone-800 text-[11px] cursor-pointer transition-colors"
                  >
                    +{batch}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setQuickStockModal(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 hover:bg-stone-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingStockId === quickStockModal.id}
                onClick={() => handleQuickUpdateStock(quickStockModal.id, quickStockModal.nextStock)}
                className="px-4 py-2 bg-forest-900 hover:bg-forest-950 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>{updatingStockId === quickStockModal.id ? 'Updating...' : 'Save Stock'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          ADD / EDIT PRODUCT MODAL
         ===================================================================== */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/75 flex items-start sm:items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full my-auto shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 text-white flex items-center justify-between border-b border-amber-500/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shadow-xs shrink-0 font-bold">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-cream-50 leading-tight">
                    {editingProductId ? 'Edit Recipe & Stock Details' : 'Add New Pickle Batch'}
                  </h3>
                  <p className="text-[11px] text-cream-200 mt-0.5">
                    {editingProductId ? 'Updates are saved directly to your storefront listing' : 'Publishes directly to the marketplace; administrator is automatically notified'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="flex flex-col flex-1 overflow-hidden text-xs">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="col-span-2">
                    <label className="block text-stone-700 font-semibold mb-1">Product Title *</label>
                    <input
                      type="text"
                      required
                      value={newProd.title}
                      onChange={(e) => setNewProd({ ...newProd, title: e.target.value })}
                      placeholder="e.g. Cured Smoked Pork Pickle"
                      className="w-full px-3.5 py-2 border border-stone-300 rounded-xl focus:ring-1 focus:ring-forest-800"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Category *</label>
                    <select
                      value={newProd.category_id}
                      onChange={(e) => {
                        const catId = e.target.value;
                        const selectedCat = safeCategories.find((c) => String(c.id) === String(catId));
                        setNewProd({
                          ...newProd,
                          category_id: catId,
                          dietary_type: selectedCat?.slug === 'veg' ? 'VEG' : 'NON_VEG'
                        });
                      }}
                      className="w-full px-3.5 py-2 border border-stone-300 rounded-xl focus:ring-1 focus:ring-forest-800 bg-white"
                    >
                      {safeCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Dietary Type</label>
                    <select
                      value={newProd.dietary_type}
                      onChange={(e) => setNewProd({ ...newProd, dietary_type: e.target.value })}
                      className="w-full px-3.5 py-2 border border-stone-300 rounded-xl focus:ring-1 focus:ring-forest-800 bg-white"
                    >
                      <option value="NON_VEG">Non-Veg</option>
                      <option value="VEG">Veg</option>
                    </select>
                  </div>

                  {/* Pricing Equation Section */}
                  <div className="col-span-2 p-4 bg-gradient-to-br from-amber-50/80 via-emerald-50/40 to-stone-50 rounded-2xl border border-amber-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Calculator size={15} className="text-forest-800" />
                        <span className="font-bold text-stone-900 text-xs">Transparent Pricing Equation</span>
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

                    <div className="p-3 bg-white rounded-xl border border-stone-200 text-stone-800 shadow-2xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-center text-xs">
                        <div className="flex-1 min-w-[70px] bg-stone-50 py-1.5 px-2 rounded-lg border border-stone-200">
                          <span className="block text-[10px] text-stone-500 font-medium">Base Payout</span>
                          <span className="font-bold text-forest-900 text-sm">₹{parseFloat(newProd.base_price || 0).toFixed(0)}</span>
                        </div>
                        <span className="font-black text-stone-400 text-sm">+</span>
                        <div className="flex-1 min-w-[70px] bg-amber-50/70 py-1.5 px-2 rounded-lg border border-amber-200">
                          <span className="block text-[10px] text-amber-800 font-medium">Fee ({commissionRate}%)</span>
                          <span className="font-bold text-amber-900 text-sm">
                            ₹{Math.max(0, Math.round(((parseFloat(newProd.base_price) || 0) * commissionRate) / 100))}
                          </span>
                        </div>
                        <span className="font-black text-stone-400 text-sm">+</span>
                        <div className="flex-1 min-w-[70px] bg-blue-50 py-1.5 px-2 rounded-lg border border-blue-200">
                          <span className="block text-[10px] text-blue-700 font-medium">Air Courier</span>
                          <span className="font-bold text-blue-900 text-sm">₹{deliveryCharge}</span>
                        </div>
                        <span className="font-black text-stone-400 text-sm">=</span>
                        <div className="flex-1 min-w-[85px] bg-forest-900 text-white py-1.5 px-2 rounded-lg shadow-xs">
                          <span className="block text-[10px] text-amber-300 font-bold">Store Price</span>
                          <span className="font-black text-sm">₹{parseFloat(newProd.price || 0).toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Net Weight (Grams) *</label>
                    <input
                      type="number"
                      required
                      value={newProd.weight_grams}
                      onChange={(e) => setNewProd({ ...newProd, weight_grams: e.target.value })}
                      placeholder="250"
                      className="w-full px-3.5 py-2 border border-stone-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Spice Level</label>
                    <select
                      value={newProd.spice_level}
                      onChange={(e) => setNewProd({ ...newProd, spice_level: e.target.value })}
                      className="w-full px-3.5 py-2 border border-stone-300 rounded-xl bg-white"
                    >
                      <option value="MILD">Mild</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HOT">Hot</option>
                      <option value="FIERY_KING_CHILLI">Fiery King Chilli (Raja Mircha)</option>
                    </select>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-stone-700 font-semibold mb-1">Inventory Quantity in Stock *</label>
                    <input
                      type="number"
                      required
                      value={newProd.stock_quantity}
                      onChange={(e) => setNewProd({ ...newProd, stock_quantity: e.target.value })}
                      placeholder="e.g. 50"
                      className="w-full px-3.5 py-2 border border-stone-300 rounded-xl font-mono font-bold"
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
                        const isUploading = uploadingSlot === slotIdx;
                        return (
                          <div key={slotIdx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 flex flex-col justify-between space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-stone-800 text-[11px]">
                                {slotIdx === 0 ? 'Image 1 (Primary *)' : `Image ${slotIdx + 1} (Optional)`}
                              </span>
                              {imgVal && !isUploading && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...(newProd.images || ['', '', ''])];
                                    updated[slotIdx] = '';
                                    setNewProd({ ...newProd, images: updated, primary_image_url: updated.find(Boolean) || '' });
                                  }}
                                  className="text-stone-400 hover:text-red-600 p-0.5"
                                  title="Remove image"
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </div>

                            <div className="h-24 bg-white rounded-lg border border-dashed border-stone-300 flex items-center justify-center overflow-hidden relative">
                              {isUploading ? (
                                <div className="text-center">
                                  <div className="w-5 h-5 border-2 border-forest-900 border-t-transparent rounded-full animate-spin mx-auto" />
                                  <span className="text-[10px] text-stone-500 block mt-1">Compressing...</span>
                                </div>
                              ) : imgVal ? (
                                <img
                                  src={resolveProductImage(imgVal)}
                                  alt={`Product slot ${slotIdx + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = '/featured-pouches.png';
                                  }}
                                />
                              ) : (
                                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-stone-400 hover:text-forest-900 transition-colors p-2 text-center">
                                  <Camera size={18} className="mb-1" />
                                  <span className="text-[10px] font-medium">Click to Upload</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={async (e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setUploadingSlot(slotIdx);
                                      try {
                                        const compressed = await compressImageFile(file);
                                        const updated = [...(newProd.images || ['', '', ''])];
                                        updated[slotIdx] = compressed;
                                        setNewProd({
                                          ...newProd,
                                          images: updated,
                                          primary_image_url: updated.find(Boolean) || compressed
                                        });
                                      } catch (err) {
                                        toast.error('Failed to process image');
                                      } finally {
                                        setUploadingSlot(null);
                                        e.target.value = '';
                                      }
                                    }}
                                  />
                                </label>
                              )}
                            </div>

                            <div>
                              <input
                                type="url"
                                value={imgVal}
                                onChange={(e) => {
                                  const updated = [...(newProd.images || ['', '', ''])];
                                  updated[slotIdx] = e.target.value;
                                  setNewProd({
                                    ...newProd,
                                    images: updated,
                                    primary_image_url: updated.find(Boolean) || e.target.value
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
                    <label className="block text-stone-700 font-semibold mb-1">Ingredients Breakdown *</label>
                    <textarea
                      rows={2}
                      required
                      value={newProd.ingredients}
                      onChange={(e) => setNewProd({ ...newProd, ingredients: e.target.value })}
                      placeholder="e.g. Smoked Pork, King Chilli, Axone, Mustard Oil, Rock Salt"
                      className="w-full px-3.5 py-2 border border-stone-300 rounded-xl"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-stone-700 font-semibold mb-1">Detailed Description *</label>
                    <textarea
                      rows={3}
                      required
                      value={newProd.description}
                      onChange={(e) => setNewProd({ ...newProd, description: e.target.value, short_description: e.target.value.substring(0, 150) })}
                      placeholder="Describe curing, wood smoke aroma, texture, serving suggestions..."
                      className="w-full px-3.5 py-2 border border-stone-300 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons Sticky Footer */}
              <div className="flex items-center justify-end gap-3 p-4 px-6 bg-stone-50 border-t border-stone-200 shrink-0">
                <button
                  type="button"
                  onClick={() => { setShowAddProductModal(false); setEditingProductId(null); }}
                  className="px-4 py-2.5 border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 text-xs"
                >
                  {editingProductId ? <CheckCircle size={15} /> : <Plus size={15} />}
                  <span>{editingProductId ? 'Save Recipe Changes' : 'Publish Pickle Batch (Live)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          PARCEL SHIPPING SLIP / PACKING LABEL MODAL
         ===================================================================== */}
      {selectedParcelOrder && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-start sm:items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl relative space-y-4 my-auto max-h-[90vh] overflow-y-auto">
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
              {/* Header: Platform Branding, High-Res Courier Dispatch QR & Order Reference */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-stone-900 pb-3 gap-3">
                <div className="space-y-1">
                  <h2 className="font-serif font-black text-2xl tracking-wider text-stone-900">
                    WANGS
                  </h2>
                  <p className="text-[10px] uppercase font-bold tracking-widest text-stone-600">
                    Authentic Food Marketplace · www.wangs.in
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-stone-500 uppercase">Air Cargo Priority Label</span>
                    <span className="text-[9px] text-stone-400">·</span>
                    <span className="text-[9px] font-mono font-bold text-stone-700">Origin Hub: Dimapur (797112)</span>
                  </div>
                  <div className="pt-0.5 flex items-center gap-2 flex-wrap">
                    <div className="bg-stone-900 text-white px-2.5 py-0.5 rounded font-mono font-black text-xs tracking-wider">
                      #{selectedParcelOrder.order_number}
                    </div>
                    <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded uppercase tracking-wider">
                      ● PREPAID / CONFIRMED
                    </span>
                    <span className="text-[10px] text-stone-500 font-mono">
                      {new Date(selectedParcelOrder.order_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Primary Courier & Logistics QR Code */}
                <div className="flex items-center gap-3 bg-white border-2 border-stone-900 rounded-xl p-2 shrink-0 self-start sm:self-center shadow-xs">
                  <div className="text-center shrink-0">
                    <QRCodeSVG
                      value={`${typeof window !== 'undefined' ? window.location.origin : 'https://wangs.in'}/delivery?order=${selectedParcelOrder.order_number}`}
                      size={92}
                      level="M"
                      margin={1}
                      className="mx-auto"
                    />
                  </div>
                  <div className="text-left space-y-0.5 max-w-[130px]">
                    <span className="text-[9px] font-mono font-black text-white bg-stone-900 px-2 py-0.5 rounded uppercase block tracking-wider text-center">
                      COURIER QR
                    </span>
                    <span className="text-[10.5px] font-bold text-stone-950 block leading-tight pt-0.5">
                      Scan for Doorstep Delivery
                    </span>
                    <span className="text-[8px] text-stone-500 block leading-tight">
                      Route map, customer phone &amp; delivery confirmation
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Destination (SHIP TO) & Producer Origin (SHIP FROM) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b-2 border-stone-900 pb-4">
                {/* DELIVER TO: CUSTOMER RECIPIENT */}
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-300 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <MapPin size={13} className="text-forest-800" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-forest-900 bg-forest-100 px-2 py-0.5 rounded">
                        DELIVER TO (CUSTOMER):
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-stone-950 leading-tight">
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
                        <span className="font-bold text-xs text-stone-900 flex items-center gap-1">
                          <Phone size={11} /> Phone:
                        </span>
                        <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-stone-300 text-stone-950">
                          {selectedParcelOrder.customer_phone || 'N/A'}
                        </span>
                      </div>
                      {selectedParcelOrder.customer_email && (
                        <p className="text-[10px] text-stone-500 truncate pt-0.5 flex items-center gap-1">
                          <Mail size={10} /> {selectedParcelOrder.customer_email}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono text-stone-500 uppercase block font-semibold">Delivery Destination Hub</span>
                      <span className="text-xs font-mono font-black text-stone-900 block">{selectedParcelOrder.shipping_city}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-mono text-stone-500 uppercase block font-semibold">Postal Code</span>
                      <span className="text-sm font-mono font-black text-forest-900 bg-forest-100 px-2 py-0.5 rounded border border-forest-300 block">
                        {selectedParcelOrder.shipping_postal_code}
                      </span>
                    </div>
                  </div>
                </div>

                {/* DISPATCHED FROM: ARTISAN SELLER */}
                <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-300 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <Store size={13} className="text-forest-800" />
                      <span className="text-[10px] font-black uppercase tracking-wider text-forest-900 bg-forest-100 px-2 py-0.5 rounded">
                        DISPATCHED FROM (ARTISAN SELLER):
                      </span>
                    </div>
                    <h4 className="font-bold text-base text-stone-950 leading-tight">
                      {profile.business_name}
                    </h4>
                    <div className="text-xs text-stone-800 mt-2 space-y-1 leading-snug">
                      <p className="text-stone-700">{profile.business_address || 'Artisan Workshop Kitchen'}</p>
                      <p className="font-bold text-stone-950">
                        {profile.location_district || 'Dimapur'}, Nagaland {profile.postal_code ? `- ${profile.postal_code}` : ''}
                      </p>
                      <div className="pt-1.5 flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900 flex items-center gap-1">
                          <Phone size={11} /> Support:
                        </span>
                        <span className="font-mono text-xs bg-white px-2 py-0.5 rounded border border-stone-300 text-stone-950">
                          {profile.contact_phone || 'N/A'}
                        </span>
                      </div>
                      <p className="text-[10.5px] font-mono text-emerald-800 pt-0.5 font-bold flex items-center gap-1">
                        <ShieldCheck size={12} className="text-emerald-700" />
                        FSSAI Reg. #{profile.fssai_license_number || 'Registered'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-mono text-stone-500 uppercase block font-semibold">Origin Hub</span>
                      <span className="text-xs font-mono font-black text-stone-900 block">{profile.location_district || 'Dimapur'} Hub</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] font-mono text-stone-500 uppercase block font-semibold">Origin PIN</span>
                      <span className="text-xs font-mono font-black text-stone-900 block">{profile.postal_code || '797112'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Package Contents Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-stone-900">
                    PARCEL CONTENTS &amp; MANIFEST:
                  </span>
                  <span className="text-[10px] font-mono font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-300">
                    Total Qty: {selectedParcelOrder.quantity} {selectedParcelOrder.quantity > 1 ? 'Units' : 'Unit'}
                  </span>
                </div>

                <div className="border border-stone-300 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-stone-100 text-stone-800 font-bold border-b border-stone-300">
                      <tr>
                        <th className="p-2.5">Item Description</th>
                        <th className="p-2.5">Net Wt.</th>
                        <th className="p-2.5 text-center">Qty</th>
                        <th className="p-2.5 text-right">Payment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      <tr>
                        <td className="p-2.5 font-bold text-stone-950">
                          {selectedParcelOrder.product_title}
                          <span className="block text-[10px] text-stone-500 font-normal">
                            Brand: {profile.business_name} · Airtight packaging
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-stone-800">{selectedParcelOrder.weight_grams}g</td>
                        <td className="p-2.5 text-center font-black font-mono text-sm">{selectedParcelOrder.quantity}</td>
                        <td className="p-2.5 text-right font-black font-mono text-stone-950">PREPAID</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Customer Unboxing QR (Bottom) */}
              <div className="bg-gradient-to-r from-amber-50 to-cream-100 border-2 border-stone-900 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-stone-900">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-1.5 rounded-lg border-2 border-stone-900 shrink-0">
                    <QRCodeSVG
                      value={`${typeof window !== 'undefined' ? window.location.origin : 'https://wangs.in'}/rewards?order=${selectedParcelOrder.order_number}`}
                      size={96}
                      level="M"
                      margin={1}
                      className="mx-auto"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono font-black text-amber-950 bg-amber-200 border border-amber-400 px-2 py-0.5 rounded uppercase inline-block">
                      CUSTOMER UNBOXING QR
                    </span>
                    <h4 className="font-serif font-black text-stone-950 text-sm leading-tight pt-0.5">
                      Scan Upon Delivery to Claim Reward
                    </h4>
                    <p className="text-[10px] text-stone-700 leading-tight">
                      Customer receives instant Wangs cash points into their wallet upon unboxing scan.
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[9px] font-mono text-stone-500 block">Standard Delivery SLA</span>
                  <span className="font-bold text-xs text-stone-900">2-4 Business Days</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex items-center justify-between no-print text-xs">
              <span className="text-stone-500">
                Print via any standard laser or thermal sticker printer.
              </span>
              <button
                type="button"
                onClick={() => setSelectedParcelOrder(null)}
                className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-xl font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SELLER RULES & POLICY HANDBOOK MODAL
         ===================================================================== */}
      {showSellerRulesModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/75 flex items-start sm:items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full my-auto shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] animate-fade-in text-xs">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 text-white flex items-center justify-between border-b border-amber-500/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center shadow-xs shrink-0 font-bold">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-cream-50 leading-tight">
                    Wangs Artisan Seller Rules &amp; Operations Handbook
                  </h3>
                  <p className="text-[11px] text-cream-200 mt-0.5">
                    Official Seller Policy · Commercial Terms · Packaging Standards · Quality SLAs
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSellerRulesModal(false)}
                className="p-2 text-stone-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-stone-700 leading-relaxed">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2">
                <h3 className="font-serif font-bold text-stone-950 text-sm flex items-center gap-1.5">
                  <AlertTriangle size={16} className="text-amber-800" />
                  1. Mandatory Pricing Floor Policy (Above ₹100 per Product)
                </h3>
                <p>
                  To preserve artisanal quality and protect producer profitability, <strong>every product listed on Wangs must be priced strictly above ₹100</strong> (minimum retail selling price of ₹101). Listings priced at or below ₹100 are rejected automatically by platform validation.
                </p>
              </div>

              <div className="p-4 bg-cream-100/70 border border-amber-300/80 rounded-2xl space-y-2">
                <h3 className="font-serif font-bold text-stone-950 text-sm flex items-center gap-1.5">
                  <Sparkles size={16} className="text-amber-800" />
                  2. Flexible Brand Bundle Program (2–4 Items · Save 10%)
                </h3>
                <p>
                  Shoppers may curate bundles of 2 to 4 recipes from your brand catalog with a flat 10% discount. Customers have complete freedom to mix and match flavors from your kitchen.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-2">
                <h3 className="font-serif font-bold text-stone-900 text-sm flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-forest-800" />
                  3. Food Safety, Ingredients &amp; FSSAI Licensing
                </h3>
                <p>
                  All sellers must hold an active 14-digit FSSAI license. Pickles must use traditional fermentation, curing, and cold-pressed mustard oil. Chemical preservatives and artificial dyes are prohibited.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-2">
                <h3 className="font-serif font-bold text-stone-900 text-sm flex items-center gap-1.5">
                  <Truck size={16} className="text-forest-800" />
                  4. Air Cargo Packaging &amp; Dispatch SLAs
                </h3>
                <p>
                  Packages must feature leak-proof seals with shock-absorbing bubble wrap. Orders must be packed and ready for courier pickup within <strong>24 to 48 business hours</strong> of notification.
                </p>
              </div>

              <div className="p-4 bg-white rounded-2xl border border-stone-200 space-y-2">
                <h3 className="font-serif font-bold text-stone-900 text-sm">
                  5. Commercial Terms &amp; Weekly Payout Disbursements
                </h3>
                <p>
                  Platform commission ({commissionRate}%) is deducted upon completed order fulfillment. Weekly net settlements are transferred automatically to your verified bank account via NEFT/RTGS.
                </p>
              </div>
            </div>

            <div className="bg-stone-50 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-200 shrink-0">
              <span className="text-[11px] text-stone-500 font-mono">
                WANGS ARTISAN SELLER POLICY · 2026 EDITION
              </span>
              <div className="flex items-center gap-2">
                <a
                  href="/documents/wangs_seller_rules.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  download="wangs_seller_rules.pdf"
                  className="px-4 py-2 bg-forest-900 hover:bg-forest-950 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Download size={14} /> Download PDF
                </a>
                <button
                  type="button"
                  onClick={() => setShowSellerRulesModal(false)}
                  className="px-4 py-2 bg-white hover:bg-stone-100 border border-stone-300 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
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
