import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield, Users, Package, DollarSign, Settings,
  CheckCircle, XCircle, AlertCircle, TrendingUp, Search,
  FileText, ArrowRight, RefreshCw, Star, Sparkles, Store, Eye, EyeOff, Wrench,
  Mail, Phone, MapPin, Award, Clock, Trash2, ShieldAlert, CheckCircle2, X, Ban
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';

const extractList = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
};

export default function AdminDashboardPage() {
  const { user, isAdmin, loading: authLoading, login, allowSellerRegistration, isMaintenanceMode, maintenanceMessage, refreshPlatformSettings } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [adminLoginForm, setAdminLoginForm] = useState({ username: 'admin', password: '' });
  const [loggingIn, setLoggingIn] = useState(false);
  const [togglingSellerReg, setTogglingSellerReg] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const [customMaintenanceMsg, setCustomMaintenanceMsg] = useState('');

  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics', 'users', 'manufacturers', 'products', 'orders', 'commission', 'settlements', 'logs'
  const [metrics, setMetrics] = useState(null);
  const [manufacturers, setManufacturers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [commissionData, setCommissionData] = useState(null);
  const [settlementData, setSettlementData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [sellerRequests, setSellerRequests] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [banModalUser, setBanModalUser] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerStatusFilter, setSellerStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Commission Edit Form State
  const [commForm, setCommForm] = useState({
    default_commission_rate: '10.00',
    customer_platform_fee: '5.00',
    default_delivery_fee: '50.00',
    free_delivery_threshold: '999.00',
    reason: '',
  });

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [met, mfgs, prods, ords, comm, stl, logs, usrs, reqs, subs] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminManufacturers(),
        api.getAdminProducts(),
        api.getAdminOrders(),
        api.getCommissionSettings(),
        api.getSettlements(),
        api.getAuditLogs(),
        api.getAdminUsers().catch(() => []),
        api.getAdminSellerRequests().catch(() => []),
        api.getMaintenanceSubscribers().catch(() => []),
      ]);
      setMetrics(met || null);
      setManufacturers(extractList(mfgs));
      setProducts(extractList(prods));
      setOrders(extractList(ords));
      setCommissionData(comm || null);
      setSettlementData(stl || null);
      setAuditLogs(extractList(logs));
      setUsersList(extractList(usrs));
      setSellerRequests(extractList(reqs));
      setSubscribers(extractList(subs));

      if (comm?.current) {
        setCommForm({
          default_commission_rate: comm.current.default_commission_rate,
          customer_platform_fee: comm.current.customer_platform_fee,
          default_delivery_fee: comm.current.default_delivery_fee,
          free_delivery_threshold: comm.current.free_delivery_threshold,
          reason: '',
        });
      }
    } catch (err) {
      console.error('Failed to load admin dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const u = await login(adminLoginForm.username, adminLoginForm.password);
      if (u.role === 'ADMIN' || u.is_staff) {
        toast.success(`Welcome to Wangs Admin Space, ${u.username}`);
      } else {
        toast.error('This account does not have Superadmin privileges.');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid administrator credentials');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleToggleSellerRegistration = async () => {
    setTogglingSellerReg(true);
    try {
      const res = await api.toggleAdminSellerRegistration();
      if (refreshPlatformSettings) await refreshPlatformSettings();
      toast.success(res.message || 'Updated "Sell with Us" visibility');
      loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to toggle visibility');
    } finally {
      setTogglingSellerReg(false);
    }
  };

  const handleToggleMaintenanceMode = async () => {
    const isCurrentlyOn = metrics?.is_maintenance_mode ?? isMaintenanceMode;
    const confirmMsg = isCurrentlyOn
      ? 'Deactivate Maintenance Mode and restore public storefront access for all visitors?'
      : 'Activate Maintenance Mode? Regular visitors will see the maintenance screen while you can still browse with Admin bypass.';
    if (!window.confirm(confirmMsg)) return;

    setTogglingMaintenance(true);
    try {
      const res = await api.toggleAdminMaintenanceMode({
        toggle: true,
        maintenance_message: customMaintenanceMsg.trim() || undefined
      });
      if (refreshPlatformSettings) await refreshPlatformSettings();
      toast.success(res.message || 'Storefront maintenance mode updated');
      loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to toggle maintenance mode');
    } finally {
      setTogglingMaintenance(false);
    }
  };

  const handleSaveMaintenanceMessage = async () => {
    if (!customMaintenanceMsg.trim()) {
      toast.error('Please enter a notice message to display on the maintenance screen');
      return;
    }
    try {
      const res = await api.toggleAdminMaintenanceMode({
        toggle: false,
        maintenance_message: customMaintenanceMsg.trim()
      });
      if (refreshPlatformSettings) await refreshPlatformSettings();
      toast.success('Maintenance notice message saved');
      loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to save notice message');
    }
  };

  // Actions
  const handleApproveManufacturer = async (id, status) => {
    try {
      await api.updateManufacturerStatus(id, status, `Reviewed and ${status.toLowerCase()} by admin`);
      toast.success(`Manufacturer ${status.toLowerCase()} successfully`);
      loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleSetCommissionOverride = async (id) => {
    const rate = prompt('Enter custom commission rate (%) for this seller (Leave empty to revert to default 10%):');
    if (rate === null) return;
    try {
      await api.setCommissionOverride(id, rate);
      toast.success('Commission rate override saved');
      loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to update commission override');
    }
  };

  const handleSetPriority = async (id, currentPriority = 0) => {
    const raw = prompt('Enter brand display priority (Higher number appears first, e.g. 100, 50, 10, 0):', currentPriority ?? 0);
    if (raw === null) return;
    const parsed = parseInt(raw, 10);
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Priority must be a non-negative whole number (e.g. 0, 1, 10, 100)');
      return;
    }
    try {
      await api.setManufacturerPriority(id, parsed);
      toast.success(`Display priority set to #${parsed}`);
      loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to update priority');
    }
  };

  const handleToggleBrandFeatured = async (id) => {
    try {
      await api.toggleManufacturerFeatured(id);
      toast.success('Brand spotlight status updated');
      loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to update brand spotlight status');
    }
  };

  const handleUpdateProductStatus = async (id, status) => {
    try {
      await api.updateProductStatus(id, status);
      toast.success(`Product status set to ${status}`);
      loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleToggleFeatured = async (id) => {
    try {
      await api.toggleFeaturedProduct(id);
      toast.success('Product featured status updated');
      loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleUpdateOrderStatus = async (id, newStatus) => {
    try {
      await api.updateOrderStatus(id, newStatus, 'Status updated via admin console');
      toast.success(`Order status updated to ${newStatus}`);
      loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleUpdateCommission = async (e) => {
    e.preventDefault();
    if (!commForm.reason.trim()) {
      toast.error('A reason is strictly required to log changes to commission settings.');
      return;
    }
    try {
      await api.updateCommissionSettings(commForm);
      toast.success('Commission settings updated and logged in audit history');
      loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Update failed');
    }
  };

  const handleGenerateSettlement = async (mfgId) => {
    try {
      await api.generateSettlement(mfgId, 'Admin batch settlement calculation.');
      toast.success('Settlement batch generated');
      loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Settlement generation failed');
    }
  };

  const handleToggleUserCanSell = async (userId) => {
    try {
      const res = await api.toggleAdminUserSeller(userId);
      toast.success(res.message || 'Seller permission updated');
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, can_sell: res.can_sell, is_authorized_to_sell: res.can_sell } : u))
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update seller permission');
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      const res = await api.updateAdminUserRole(userId, newRole);
      toast.success(res.message || 'User role updated');
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err) {
      toast.error(err.message || 'Failed to update user role');
    }
  };

  const handleToggleUserBan = async (targetUser, reason = '') => {
    try {
      const isCurrentlyBanned = targetUser.is_banned;
      if (!isCurrentlyBanned && !reason) {
        setBanModalUser(targetUser);
        setBanReason('');
        return;
      }
      const res = await api.toggleAdminUserBan(targetUser.id, {
        is_banned: !isCurrentlyBanned,
        reason: reason || 'Platform rule violation'
      });
      toast.success(res.message || 'Account status updated');
      setUsersList((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_banned: res.is_banned, is_active: res.is_active, ban_reason: res.ban_reason } : u))
      );
      setBanModalUser(null);
      setBanReason('');
      loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to update account ban status');
    }
  };

  const handleApproveSellerRequest = async (email) => {
    try {
      await api.approveAdminSellerRequest(email);
      toast.success(`Seller authorization approved for ${email}`);
      loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Approval failed');
    }
  };

  const handleDeleteSubscriber = async (id) => {
    try {
      await api.deleteMaintenanceSubscriber(id);
      setSubscribers((prev) => prev.filter((s) => s.id !== id));
      toast.success('Subscriber removed');
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto py-24 px-4 text-center">
        <div className="w-10 h-10 border-4 border-forest-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-stone-500 mt-3 font-semibold">Verifying /wangadminspace session...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-cream-50">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-stone-200/90 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 bg-forest-900 text-amber-400 rounded-2xl shadow-md mb-1">
              <Shield size={32} />
            </div>
            <h1 className="font-serif text-2xl font-bold text-stone-900">
              Wangs Administration Space
            </h1>
            <p className="text-xs font-mono text-emerald-800 bg-emerald-50 py-1 px-3 rounded-full inline-block border border-emerald-200">
              /wangadminspace · Secure Gateway
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Elevated access required for platform moderation, courier dispatch, and commission governance.
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-stone-700 font-bold mb-1">Administrator Username</label>
              <input
                type="text"
                required
                value={adminLoginForm.username}
                onChange={(e) => setAdminLoginForm({ ...adminLoginForm, username: e.target.value })}
                placeholder="admin"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-forest-800"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-bold mb-1">Administrator Password</label>
              <input
                type="password"
                required
                value={adminLoginForm.password}
                onChange={(e) => setAdminLoginForm({ ...adminLoginForm, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest-800"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
              <div>
                <span className="font-bold block">Developer / Admin Access:</span>
                <span className="font-mono text-stone-600">admin / admin12345</span>
              </div>
              <button
                type="button"
                onClick={() => setAdminLoginForm({ username: 'admin', password: 'admin12345' })}
                className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold rounded-lg shadow-xs transition-colors"
              >
                Auto-Fill
              </button>
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs active:scale-98"
            >
              <Shield size={15} />
              <span>{loggingIn ? 'Authenticating...' : 'Authenticate & Enter /wangadminspace'}</span>
            </button>
          </form>

          <div className="pt-2 text-center border-t border-stone-100">
            <Link to="/" className="text-xs text-stone-500 hover:text-stone-800 font-medium">
              ← Return to Wangs Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-4 text-center">
        <div className="w-8 h-8 border-4 border-chilli-700 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-stone-500 mt-2">Loading admin operational controls...</p>
      </div>
    );
  }

  // Safe Lists Extraction
  const ordersList = extractList(orders);
  const productsList = extractList(products);
  const manufacturersList = extractList(manufacturers).slice().sort((a, b) => {
    const pA = a.display_priority ?? 0;
    const pB = b.display_priority ?? 0;
    if (pB !== pA) return pB - pA;
    if (b.is_featured !== a.is_featured) return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
    return (a.business_name || '').localeCompare(b.business_name || '');
  });
  const auditLogsList = extractList(auditLogs);

  // Platform Bundle Analytics & Monitoring
  const adminBundleOrders = ordersList.filter((o) => {
    const items = o.items || [];
    const totalQty = items.reduce((s, i) => s + (i.quantity || 1), 0);
    return totalQty >= 2 || items.some((i) => (i.quantity || 1) >= 2);
  });
  const adminBundlePercentage = ordersList.length > 0 ? Math.round((adminBundleOrders.length / ordersList.length) * 100) : 0;
  const adminTotalJars = ordersList.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + (i.quantity || 1), 0), 0);
  const adminAvgBasketSize = ordersList.length > 0 && adminTotalJars > 0 ? (adminTotalJars / ordersList.length).toFixed(1) : '2.2';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Banner */}
      <div className="bg-forest-950 text-cream-50 p-6 sm:p-8 rounded-2xl shadow-md border border-forest-900 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="text-chilli-500" size={24} />
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <span>Wangs Administration Space</span>
              <span className="text-[10px] font-mono font-bold bg-amber-400 text-stone-950 px-2 py-0.5 rounded-full">
                /wangadminspace
              </span>
            </h1>
          </div>
          <p className="text-xs text-cream-200 mt-1">
            Superuser Marketplace & Financial Controls · Server-enforced permissions & audit logging
          </p>
        </div>

        <button
          onClick={loadAdminData}
          className="px-3.5 py-2 bg-forest-800 hover:bg-forest-700 text-cream-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {/* Admin Nav Tabs */}
      <div className="border-b border-stone-200 mb-8 flex flex-wrap gap-4 text-xs font-bold text-stone-600">
        {[
          { id: 'metrics', label: 'Marketplace Metrics' },
          { id: 'users', label: `Users & Customers (${usersList.length})` },
          { id: 'manufacturers', label: `Manufacturers (${manufacturersList.length})` },
          { id: 'products', label: `Catalog Moderation (${productsList.length})` },
          { id: 'orders', label: `Orders (${ordersList.length})` },
          { id: 'commission', label: 'Commission & Fees' },
          { id: 'settlements', label: 'Payout Settlements' },
          { id: 'logs', label: `Audit Trail (${auditLogsList.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-forest-900 text-forest-950 font-bold' : 'border-transparent hover:text-stone-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Marketplace Metrics */}
      {activeTab === 'metrics' && (
        <div className="space-y-6">
          {/* Producer Inflow & "Sell with Us" Public Visibility Monitor Card */}
          <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-[#123821] text-cream-50 p-6 rounded-3xl border border-forest-800 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-forest-800/80 pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-amber-400 text-forest-950 rounded-2xl shadow-sm">
                  <Store size={22} />
                </span>
                <div>
                  <h3 className="font-serif font-bold text-lg text-white">
                    "Sell with Us" Public Visibility & Producer Inflow Monitor
                  </h3>
                  <p className="text-xs text-forest-300">
                    Administrator control: Dictates whether the "Sell with Us" registration banner appears publicly on the storefront footer and onboarding portal.
                  </p>
                </div>
              </div>

              {/* Status Badge & Live Toggle Button */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  (metrics?.allow_seller_registration ?? allowSellerRegistration)
                    ? 'bg-emerald-900/80 text-emerald-300 border border-emerald-500/50'
                    : 'bg-stone-800 text-stone-400 border border-stone-700'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    (metrics?.allow_seller_registration ?? allowSellerRegistration)
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-stone-500'
                  }`} />
                  <span>
                    {(metrics?.allow_seller_registration ?? allowSellerRegistration)
                      ? 'LIVE ON STOREFRONT (Accepting Sellers)'
                      : 'PAUSED / HIDDEN (Button Hidden from Public)'}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={handleToggleSellerRegistration}
                  disabled={togglingSellerReg}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                    (metrics?.allow_seller_registration ?? allowSellerRegistration)
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-amber-400 hover:bg-amber-300 text-forest-950'
                  }`}
                >
                  {(metrics?.allow_seller_registration ?? allowSellerRegistration) ? (
                    <>
                      <EyeOff size={14} />
                      <span>{togglingSellerReg ? 'Updating...' : 'Hide "Sell with Us" Button'}</span>
                    </>
                  ) : (
                    <>
                      <Eye size={14} />
                      <span>{togglingSellerReg ? 'Updating...' : 'Make "Sell with Us" Visible'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Inflow Monitor Quick Indicators */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-forest-900/80 p-3.5 rounded-2xl border border-forest-800/80">
                <span className="text-forest-300 text-[11px] block">Pending Applications</span>
                <span className="text-xl font-bold text-amber-300 mt-0.5 block">{metrics?.pending_seller_applications || 0}</span>
                <span className="text-[10px] text-stone-400">Waiting for Admin review</span>
              </div>
              <div className="bg-forest-900/80 p-3.5 rounded-2xl border border-forest-800/80">
                <span className="text-forest-300 text-[11px] block">Active Brand Sellers</span>
                <span className="text-xl font-bold text-white mt-0.5 block">{metrics?.active_manufacturers || manufacturersList.length}</span>
                <span className="text-[10px] text-emerald-400">Verified producer units</span>
              </div>
              <div className="bg-forest-900/80 p-3.5 rounded-2xl border border-forest-800/80">
                <span className="text-forest-300 text-[11px] block">Total Products (All Sellers)</span>
                <span className="text-xl font-bold text-white mt-0.5 block">{metrics?.total_products_all_sellers || productsList.length}</span>
                <span className="text-[10px] text-stone-400">{metrics?.active_products || productsList.filter(p => p.status === 'APPROVED').length} currently active</span>
              </div>
              <div className="bg-forest-900/80 p-3.5 rounded-2xl border border-forest-800/80">
                <span className="text-forest-300 text-[11px] block">Total Items Sold (All Sellers)</span>
                <span className="text-xl font-bold text-amber-300 mt-0.5 block">{metrics?.total_items_sold_all_sellers || 0}</span>
                <span className="text-[10px] text-stone-400">Jars sold across marketplace</span>
              </div>
            </div>
          </div>

          {/* Storefront Maintenance Mode Control Card */}
          <div className="bg-gradient-to-r from-stone-900 via-[#1c1917] to-stone-900 text-cream-50 p-6 rounded-3xl border border-stone-800 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-4">
              <div className="flex items-center gap-3">
                <span className={`p-2.5 rounded-2xl shadow-sm ${
                  (metrics?.is_maintenance_mode ?? isMaintenanceMode)
                    ? 'bg-amber-400 text-stone-950'
                    : 'bg-emerald-600 text-white'
                }`}>
                  <Wrench size={22} />
                </span>
                <div>
                  <h3 className="font-serif font-bold text-lg text-white">
                    Storefront Maintenance Mode Control
                  </h3>
                  <p className="text-xs text-stone-400">
                    Administrator control: Put the website under maintenance for updates or pantry restocks. Regular visitors will see the maintenance screen, while administrators can browse normally.
                  </p>
                </div>
              </div>

              {/* Status Badge & Toggle Button */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  (metrics?.is_maintenance_mode ?? isMaintenanceMode)
                    ? 'bg-amber-900/80 text-amber-300 border border-amber-500/50'
                    : 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/50'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${
                    (metrics?.is_maintenance_mode ?? isMaintenanceMode)
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-emerald-400'
                  }`} />
                  <span>
                    {(metrics?.is_maintenance_mode ?? isMaintenanceMode)
                      ? 'MAINTENANCE MODE ACTIVE (Public Locked)'
                      : 'NORMAL OPERATIONS (Storefront Publicly Live)'}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={handleToggleMaintenanceMode}
                  disabled={togglingMaintenance}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
                    (metrics?.is_maintenance_mode ?? isMaintenanceMode)
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-amber-400 hover:bg-amber-300 text-stone-950'
                  }`}
                >
                  <Wrench size={14} />
                  <span>
                    {togglingMaintenance
                      ? 'Updating...'
                      : (metrics?.is_maintenance_mode ?? isMaintenanceMode)
                        ? 'Deactivate Maintenance (Go Live)'
                        : 'Put Website in Maintenance'}
                  </span>
                </button>
              </div>
            </div>

            {/* Custom Maintenance Notice Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-stone-400 block">
                Public Notice Message shown to visitors during maintenance:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={customMaintenanceMsg}
                  placeholder={metrics?.maintenance_message || maintenanceMessage || "We're currently fine-tuning our inventory & performing scheduled maintenance. Back shortly!"}
                  onChange={(e) => setCustomMaintenanceMsg(e.target.value)}
                  className="flex-1 px-3.5 py-2 bg-stone-800/80 border border-stone-700 rounded-xl text-xs text-white placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400/40"
                />
                <button
                  type="button"
                  onClick={handleSaveMaintenanceMessage}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-cream-100 rounded-xl text-xs font-semibold border border-stone-700 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Save Notice Text
                </button>
              </div>
              <span className="text-[10px] text-stone-400">
                Current active message: &ldquo;{metrics?.maintenance_message || maintenanceMessage}&rdquo;
              </span>
            </div>
          </div>

          {/* Platform Performance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-500 font-medium">Gross Merchandise Value (GMV)</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">₹{metrics?.gmv || '0.00'}</p>
              <span className="text-[10px] text-emerald-700 font-semibold">{metrics?.total_orders || 0} orders processed</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-500 font-medium">Total Products from Sellers</span>
              <p className="text-2xl font-serif font-bold text-forest-950 mt-1">{metrics?.total_products_all_sellers || productsList.length}</p>
              <span className="text-[10px] text-stone-500">From all registered brand stores</span>
            </div>

            <div className="bg-forest-900 text-white p-5 rounded-2xl border border-forest-800 shadow-sm">
              <span className="text-xs text-cream-300 font-medium">Total Items Sold (All Sellers)</span>
              <p className="text-2xl font-serif font-bold text-white mt-1">{metrics?.total_items_sold_all_sellers || 0} jars</p>
              <span className="text-[10px] text-amber-300 font-medium">Across all artisan categories</span>
            </div>

            <div className="bg-cream-100 p-5 rounded-2xl border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-700 font-medium">Total Platform Earnings</span>
              <p className="text-2xl font-serif font-bold text-forest-950 mt-1">₹{metrics?.total_platform_revenue || '0.00'}</p>
              <span className="text-[10px] text-stone-500">Commission + Platform Fee</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-500 block">Active Verified Manufacturers</span>
              <span className="font-bold text-xl text-stone-900">{metrics?.active_manufacturers}</span>
            </div>
            <div className="bg-amber-50 p-5 rounded-xl border border-amber-200 text-xs text-amber-900">
              <span className="block font-medium">Pending Seller Applications</span>
              <span className="font-bold text-xl">{metrics?.pending_seller_applications}</span>
            </div>
            <div className="bg-white p-5 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-500 block">Pending Product Reviews</span>
              <span className="font-bold text-xl text-stone-900">{metrics?.pending_products_review}</span>
            </div>
          </div>

          {/* Bundle Offers & Volume Promotion Monitoring (Admin Overview) */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-purple-50 text-purple-800 rounded-xl">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Artisan Bundle Offers & Basket Volume Supervision
                  </h3>
                  <p className="text-xs text-stone-500">
                    Live platform bundle adoption across all verified brand stores
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
                <Sparkles size={12} /> Live Platform Rules
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200/80 space-y-1">
                <span className="text-purple-900 font-bold block">Bundle Orders (2+ Jars)</span>
                <p className="text-2xl font-serif font-black text-purple-950 mt-1">
                  {adminBundleOrders.length} <span className="text-xs font-sans font-normal text-purple-700">({adminBundlePercentage}%)</span>
                </p>
                <p className="text-[11px] text-purple-800">Orders containing multiple jars or curated bundles</p>
              </div>

              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1">
                <span className="text-amber-900 font-bold block">Average Basket Size</span>
                <p className="text-2xl font-serif font-black text-amber-950 mt-1">
                  {adminAvgBasketSize} <span className="text-xs font-sans font-normal text-amber-700">jars/order</span>
                </p>
                <p className="text-[11px] text-amber-800">+42% volume uplift vs single-jar baseline</p>
              </div>

              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200/80 space-y-1">
                <span className="text-emerald-900 font-bold block">Active Offer Tiers</span>
                <p className="text-sm font-bold text-emerald-950 mt-1">
                  Duo (8% OFF) · Trio (15% OFF)
                </p>
                <p className="text-[11px] text-emerald-800">Automated volume incentives active on product pages</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Users & Customers Intelligence */}
      {activeTab === 'users' && (
        <div className="space-y-6 text-xs">
          {/* User Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs mb-1">
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-stone-500 block">Total Registered Accounts</span>
              <span className="text-xl font-bold text-stone-900 mt-0.5 block">{usersList.length}</span>
              <span className="text-[10px] text-stone-500">Shoppers, sellers & staff</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-stone-500 block">Verified Shoppers</span>
              <span className="text-xl font-bold text-stone-900 mt-0.5 block">
                {usersList.filter((u) => u.role === 'CUSTOMER').length}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">Active customer profiles</span>
            </div>
            <div className="bg-forest-900 text-white p-4 rounded-xl border border-forest-800 shadow-xs">
              <span className="text-cream-300 block">Authorized Sellers</span>
              <span className="text-xl font-bold text-white mt-0.5 block">
                {usersList.filter((u) => u.can_sell || u.role === 'MANUFACTURER').length}
              </span>
              <span className="text-[10px] text-amber-300 font-medium">Permitted to publish products</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-stone-500 block">Pending Seller Requests</span>
              <span className="text-xl font-bold text-amber-600 mt-0.5 block">
                {sellerRequests.filter((r) => !r.is_authorized).length}
              </span>
              <span className="text-[10px] text-amber-700 font-semibold">Awaiting review</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-red-200 shadow-xs">
              <span className="text-stone-500 block">Banned / Suspended</span>
              <span className="text-xl font-bold text-red-600 mt-0.5 block">
                {usersList.filter((u) => u.is_banned).length}
              </span>
              <span className="text-[10px] text-red-700 font-semibold">Policy violation locks</span>
            </div>
          </div>

          {/* User Filter & Search Controls */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, email, phone, or username..."
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-forest-800 font-medium"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
            </div>

            <div className="flex flex-wrap items-center gap-2 overflow-x-auto w-full sm:w-auto">
              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                {['ALL', 'CUSTOMER', 'MANUFACTURER', 'ADMIN'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setUserRoleFilter(role)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      userRoleFilter === role
                        ? 'bg-forest-900 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {role === 'ALL' ? 'All Roles' : role}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                {[
                  { id: 'ALL', label: 'All Status' },
                  { id: 'ACTIVE', label: 'Active' },
                  { id: 'BANNED', label: 'Banned' }
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setUserStatusFilter(st.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      userStatusFilter === st.id
                        ? st.id === 'BANNED'
                          ? 'bg-red-600 text-white shadow-2xs font-bold'
                          : 'bg-white text-forest-950 shadow-2xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
                <Users size={16} className="text-forest-800" />
                <span>Platform User Directory & Role Governance</span>
              </h3>
              <span className="text-[11px] text-stone-400">
                Showing {usersList.filter((u) => {
                  const matchesSearch = !userSearch || (
                    (u.username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                    (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                    (u.phone_number || '').includes(userSearch) ||
                    (`${u.first_name || ''} ${u.last_name || ''}`).toLowerCase().includes(userSearch.toLowerCase())
                  );
                  const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
                  const matchesStatus = userStatusFilter === 'ALL' || (userStatusFilter === 'BANNED' ? u.is_banned : !u.is_banned);
                  return matchesSearch && matchesRole && matchesStatus;
                }).length} user accounts
              </span>
            </div>

            <table className="w-full text-left">
              <thead className="bg-cream-100 border-b border-stone-200 text-stone-700">
                <tr>
                  <th className="p-3">User & Contact</th>
                  <th className="p-3">Account Role</th>
                  <th className="p-3">Seller Authorization</th>
                  <th className="p-3">Status & Action</th>
                  <th className="p-3">Lifetime Orders</th>
                  <th className="p-3">Total Spend (LTV)</th>
                  <th className="p-3">Brand Association</th>
                  <th className="p-3">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {usersList
                  .filter((u) => {
                    const matchesSearch = !userSearch || (
                      (u.username || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                      (u.email || '').toLowerCase().includes(userSearch.toLowerCase()) ||
                      (u.phone_number || '').includes(userSearch) ||
                      (`${u.first_name || ''} ${u.last_name || ''}`).toLowerCase().includes(userSearch.toLowerCase())
                    );
                    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
                    const matchesStatus = userStatusFilter === 'ALL' || (userStatusFilter === 'BANNED' ? u.is_banned : !u.is_banned);
                    return matchesSearch && matchesRole && matchesStatus;
                  })
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-cream-50/50">
                      <td className="p-3">
                        <p className="font-bold text-stone-900 text-xs">
                          {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                        </p>
                        <p className="text-[11px] text-stone-500 font-mono">{u.email}</p>
                        <p className="text-[10px] text-stone-400">{u.phone_number || 'No phone recorded'}</p>
                      </td>
                      <td className="p-3">
                        <select
                          value={u.role}
                          onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                          className="px-2 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-800 focus:outline-none focus:border-forest-800 cursor-pointer"
                        >
                          <option value="CUSTOMER">Customer (Shopper)</option>
                          <option value="MANUFACTURER">Manufacturer (Seller)</option>
                          <option value="ADMIN">Superadmin</option>
                        </select>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleUserCanSell(u.id)}
                            className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer shadow-2xs ${
                              u.can_sell || u.is_authorized_to_sell
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                : 'bg-stone-100 text-stone-600 border border-stone-300 hover:bg-stone-200'
                            }`}
                          >
                            {u.can_sell || u.is_authorized_to_sell ? '✓ Authorized Seller' : '✕ Customer Only'}
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        {u.is_banned ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold border border-red-300">
                              <ShieldAlert size={11} className="text-red-600" />
                              <span>Banned Account</span>
                            </span>
                            {u.ban_reason && (
                              <p className="text-[10px] text-red-600 font-medium max-w-[170px] truncate" title={u.ban_reason}>
                                {u.ban_reason}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => handleToggleUserBan(u, '')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[10px] shadow-2xs transition-all cursor-pointer"
                            >
                              <CheckCircle2 size={10} />
                              <span>Reinstate</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>Active</span>
                            </span>
                            {!u.is_staff && u.role !== 'ADMIN' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setBanModalUser(u);
                                  setBanReason('');
                                }}
                                className="px-2 py-0.5 rounded-md bg-red-50 hover:bg-red-600 text-red-700 hover:text-white font-bold text-[10px] border border-red-200 transition-all cursor-pointer"
                                title="Ban account for platform rule violations"
                              >
                                Ban
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-stone-900">
                        {u.orders_count || 0} orders
                      </td>
                      <td className="p-3 font-serif font-bold text-forest-950">
                        ₹{parseFloat(u.total_spent || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3">
                        {u.manufacturer_business_name ? (
                          <span className="font-semibold text-stone-900 flex items-center gap-1">
                            <Store size={12} className="text-amber-600" />
                            <span>{u.manufacturer_business_name}</span>
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-stone-500 text-[11px]">
                        {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* Sub-Card 1: Seller Access Requests Queue */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
                  <Store size={16} className="text-amber-600" />
                  <span>Seller Authorization Inbound Requests ({sellerRequests.length})</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Prospective producers requesting permission to list jars on Wangs
                </p>
              </div>
            </div>

            {sellerRequests.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">No pending seller authorization requests in queue.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {sellerRequests.map((req) => (
                  <div key={req.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{req.business_name}</span>
                        <span className="text-stone-400">·</span>
                        <span className="text-stone-600 font-mono text-[11px]">{req.email}</span>
                        {req.phone && <span className="text-stone-500 text-[11px]">({req.phone})</span>}
                      </div>
                      <p className="text-[11px] text-stone-500">
                        District: <strong>{req.location_district || 'Not specified'}</strong> · FSSAI: <strong>{req.fssai_number || 'Pending'}</strong>
                      </p>
                      {req.message && (
                        <p className="text-[11px] text-stone-700 italic bg-stone-50 p-2 rounded-lg border border-stone-200/60 max-w-xl">
                          "{req.message}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {req.is_authorized ? (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                          ✓ Authorized
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApproveSellerRequest(req.email)}
                          className="px-4 py-1.5 bg-forest-900 hover:bg-forest-950 text-white rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer"
                        >
                          Approve & Grant Seller Access
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sub-Card 2: Maintenance Mode Restock Waitlist */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
                  <Mail size={16} className="text-emerald-700" />
                  <span>Maintenance Waitlist Subscribers ({subscribers.length})</span>
                </h3>
                <p className="text-xs text-stone-500">
                  Shoppers who signed up for reopening alerts while the website was in maintenance mode
                </p>
              </div>
            </div>

            {subscribers.length === 0 ? (
              <p className="text-xs text-stone-400 py-4 text-center">No shoppers currently on the maintenance waitlist.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {subscribers.map((s) => (
                  <div key={s.id} className="p-3 rounded-xl bg-stone-50 border border-stone-200/80 flex items-center justify-between gap-2">
                    <div className="truncate">
                      <p className="font-mono text-xs font-bold text-stone-800 truncate">{s.email}</p>
                      <p className="text-[10px] text-stone-400">{new Date(s.created_at).toLocaleString()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubscriber(s.id)}
                      className="text-stone-400 hover:text-red-600 transition-colors p-1"
                      title="Remove subscriber"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Manufacturers */}
      {activeTab === 'manufacturers' && (
        <div className="space-y-4 text-xs">
          {/* Seller Volume & Product Aggregate Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-1">
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-stone-500 block">Total Brand Stores</span>
              <span className="text-xl font-bold text-stone-900 mt-0.5 block">{manufacturersList.length}</span>
              <span className="text-[10px] text-emerald-700 font-semibold">{manufacturersList.filter(m => m.status === 'APPROVED').length} verified active</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-stone-500 block">Products from All Sellers</span>
              <span className="text-xl font-bold text-stone-900 mt-0.5 block">{metrics?.total_products_all_sellers || productsList.length}</span>
              <span className="text-[10px] text-stone-500">Listed across platform</span>
            </div>
            <div className="bg-forest-900 text-white p-4 rounded-xl border border-forest-800 shadow-xs">
              <span className="text-cream-300 block">Total Items Sold (All Sellers)</span>
              <span className="text-xl font-bold text-white mt-0.5 block">{metrics?.total_items_sold_all_sellers || 0} jars</span>
              <span className="text-[10px] text-amber-300 font-medium">Total volume sold</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-stone-500 block">Total Sales Generated</span>
              <span className="text-xl font-serif font-bold text-stone-900 mt-0.5 block">₹{parseFloat(metrics?.total_items_sales_revenue || 0).toLocaleString('en-IN')}</span>
              <span className="text-[10px] text-stone-500">Gross seller merchandise</span>
            </div>
          </div>

          {/* Seller Filter & Search Controls */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                value={sellerSearch}
                onChange={(e) => setSellerSearch(e.target.value)}
                placeholder="Search brand, district, FSSAI, or contact..."
                className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-forest-800 font-medium"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {['ALL', 'APPROVED', 'PENDING', 'REJECTED', 'SUSPENDED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setSellerStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    sellerStatusFilter === st
                      ? 'bg-forest-900 text-white shadow-2xs'
                      : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                  }`}
                >
                  {st === 'ALL' ? 'All Statuses' : st}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-cream-100 border-b border-stone-200 text-stone-700">
                <tr>
                  <th className="p-3">Manufacturer Business</th>
                  <th className="p-3">Location & Contact</th>
                  <th className="p-3">FSSAI / GST</th>
                  <th className="p-3">Products Listed</th>
                  <th className="p-3">Items Sold</th>
                  <th className="p-3">Seller Sales</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Display Priority</th>
                  <th className="p-3">Commission Rate</th>
                  <th className="p-3">Actions & Portfolio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {manufacturersList
                  .filter((m) => {
                    const matchesSearch = !sellerSearch || (
                      (m.business_name || '').toLowerCase().includes(sellerSearch.toLowerCase()) ||
                      (m.location_district || '').toLowerCase().includes(sellerSearch.toLowerCase()) ||
                      (m.fssai_license_number || '').includes(sellerSearch) ||
                      (m.contact_email || '').toLowerCase().includes(sellerSearch.toLowerCase()) ||
                      (m.contact_phone || '').includes(sellerSearch)
                    );
                    const matchesStatus = sellerStatusFilter === 'ALL' || m.status === sellerStatusFilter;
                    return matchesSearch && matchesStatus;
                  })
                  .map((m) => (
                  <tr key={m.id} className="hover:bg-cream-50/50">
                    <td className="p-3">
                      <p className="font-bold text-stone-900 text-sm">{m.business_name}</p>
                      <p className="text-[11px] text-stone-500">{m.brand_story?.substring(0, 80)}...</p>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-stone-800">{m.location_district}</p>
                      <p className="text-stone-500 text-[11px]">{m.contact_email} · {m.contact_phone}</p>
                    </td>
                    <td className="p-3">
                      <p className="font-mono">{m.fssai_license_number || 'None'}</p>
                      <p className="text-stone-400 text-[10px]">{m.gst_number || 'No GST'}</p>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-stone-900 block">{m.products_count || 0} products</span>
                      <span className="text-[10px] text-emerald-700 font-semibold">{m.active_products_count || 0} active in catalog</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-forest-950 block">{m.total_items_sold || 0} jars</span>
                      <span className="text-[10px] text-stone-500">items sold</span>
                    </td>
                    <td className="p-3">
                      <span className="font-serif font-bold text-stone-900 block">₹{parseFloat(m.total_sales_revenue || 0).toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-stone-500">seller volume</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        m.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleSetPriority(m.id, m.display_priority ?? 0)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 font-bold text-amber-900 transition-colors shadow-2xs group cursor-pointer"
                          title="Click to change brand display priority (higher numbers appear first on homepage and store)"
                        >
                          <span className="text-[10px] uppercase font-semibold text-amber-700">Rank:</span>
                          <span className="font-mono text-xs font-bold text-stone-900">#{m.display_priority ?? 0}</span>
                          <span className="text-[11px] text-amber-600 group-hover:scale-110 transition-transform">✎</span>
                        </button>
                        <button
                          onClick={() => handleToggleBrandFeatured(m.id)}
                          className={`p-1 rounded-md transition-colors ${m.is_featured ? 'text-amber-500 hover:text-amber-600 bg-amber-50' : 'text-stone-300 hover:text-stone-400'}`}
                          title={m.is_featured ? 'Featured Brand Spotlight (Click to remove)' : 'Promote to Featured Brand Spotlight'}
                        >
                          <Star size={15} fill={m.is_featured ? 'currentColor' : 'none'} />
                        </button>
                      </div>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleSetCommissionOverride(m.id)}
                        className="font-bold text-forest-800 hover:underline flex items-center gap-1"
                        title="Click to edit seller commission override"
                      >
                        {m.commission_rate_override ? `${m.commission_rate_override}% (Custom)` : '10.00% (Default)'}
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setSelectedSeller(m)}
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-forest-900 hover:text-white text-stone-700 font-semibold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                          title="Inspect comprehensive seller portfolio & products"
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                        {m.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleApproveManufacturer(m.id, 'APPROVED')}
                            className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded"
                          >
                            Approve
                          </button>
                        )}
                        {m.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleApproveManufacturer(m.id, 'REJECTED')}
                            className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded"
                          >
                            Reject
                          </button>
                        )}
                        {m.status === 'APPROVED' && (
                          <button
                            onClick={() => handleApproveManufacturer(m.id, 'SUSPENDED')}
                            className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Catalog Moderation */}
      {activeTab === 'products' && (
        <div className="space-y-4 text-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-cream-100 border-b border-stone-200 text-stone-700">
                <tr>
                  <th className="p-3">Product Title</th>
                  <th className="p-3">Producer</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Review Status</th>
                  <th className="p-3">Featured</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {productsList.map((p) => (
                  <tr key={p.id} className="hover:bg-cream-50/50">
                    <td className="p-3 font-bold text-stone-900">{p.title}</td>
                    <td className="p-3">{p.manufacturer?.business_name}</td>
                    <td className="p-3 font-semibold">₹{parseFloat(p.price).toFixed(0)}</td>
                    <td className="p-3">{p.stock_quantity}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        p.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleFeatured(p.id)}
                        className={`p-1 rounded ${p.is_featured ? 'text-amber-500' : 'text-stone-300'}`}
                      >
                        <Star size={16} fill={p.is_featured ? 'currentColor' : 'none'} />
                      </button>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1.5">
                        {p.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleUpdateProductStatus(p.id, 'APPROVED')}
                            className="px-2 py-0.5 bg-emerald-700 text-white rounded font-semibold text-[11px]"
                          >
                            Approve
                          </button>
                        )}
                        {p.status !== 'REJECTED' && (
                          <button
                            onClick={() => handleUpdateProductStatus(p.id, 'REJECTED')}
                            className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[11px]"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4 text-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-cream-100 border-b border-stone-200 text-stone-700">
                <tr>
                  <th className="p-3">Order Number</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Total (INR)</th>
                  <th className="p-3">Platform Rev</th>
                  <th className="p-3">Payment</th>
                  <th className="p-3">Order Status</th>
                  <th className="p-3">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ordersList.map((ord) => (
                  <tr key={ord.id} className="hover:bg-cream-50/50">
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-stone-900">{ord.order_number}</span>
                        {(() => {
                          const ordItems = ord.items || [];
                          const totalJars = ordItems.reduce((s, i) => s + (i.quantity || 1), 0);
                          const isBundle = totalJars >= 2 || ordItems.some((i) => (i.quantity || 1) >= 2);
                          return isBundle ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 inline-flex items-center gap-0.5">
                              <Sparkles size={9} /> Bundle ({totalJars} jars)
                            </span>
                          ) : null;
                        })()}
                      </div>
                      {(ord.items || []).length > 0 && (
                        <p className="text-[10px] text-stone-500 truncate max-w-xs mt-0.5">
                          {(ord.items || []).map((i) => `${i.quantity}x ${i.product_title}`).join(', ')}
                        </p>
                      )}
                    </td>
                    <td className="p-3">
                      <p className="font-semibold text-stone-900">{ord.customer_name}</p>
                      <p className="text-stone-500 text-[11px]">{ord.customer_email}</p>
                    </td>
                    <td className="p-3 font-bold">₹{parseFloat(ord.total_amount).toFixed(2)}</td>
                    <td className="p-3 text-forest-800 font-semibold">
                      ₹{(parseFloat(ord.platform_commission_total) + parseFloat(ord.customer_platform_fee)).toFixed(2)}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ord.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {ord.payment_status}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-forest-100 text-forest-800 rounded text-[10px] font-bold">
                        {ord.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <select
                        value={ord.status}
                        onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                        className="p-1 border border-stone-200 rounded text-xs focus:ring-1 focus:ring-forest-700"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="CONFIRMED">Confirmed</option>
                        <option value="PROCESSING">Processing</option>
                        <option value="DISPATCHED">Dispatched</option>
                        <option value="DELIVERED">Delivered</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Commission & Fee Management */}
      {activeTab === 'commission' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-xs">
          {/* Settings Form */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-2">
              Update Platform Commission & Fees
            </h3>
            <p className="text-stone-500 leading-relaxed">
              Modifying these settings strictly applies to future orders.
              Historical orders maintain immutable fee snapshots.
            </p>

            <form onSubmit={handleUpdateCommission} className="space-y-3">
              <div>
                <label className="block text-stone-700 font-medium mb-1">Default Manufacturer Commission (%)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={commForm.default_commission_rate}
                  onChange={(e) => setCommForm({ ...commForm, default_commission_rate: e.target.value })}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">Customer Platform Fee (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={commForm.customer_platform_fee}
                  onChange={(e) => setCommForm({ ...commForm, customer_platform_fee: e.target.value })}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">Default Delivery Fee (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={commForm.default_delivery_fee}
                  onChange={(e) => setCommForm({ ...commForm, default_delivery_fee: e.target.value })}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">Free Delivery Threshold (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={commForm.free_delivery_threshold}
                  onChange={(e) => setCommForm({ ...commForm, free_delivery_threshold: e.target.value })}
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">Audit Log Reason for Modification *</label>
                <textarea
                  rows={2}
                  required
                  value={commForm.reason}
                  onChange={(e) => setCommForm({ ...commForm, reason: e.target.value })}
                  placeholder="e.g. Annual seller rate adjustment per marketplace board review"
                  className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-forest-800 text-white font-bold rounded-lg hover:bg-forest-900"
              >
                Save & Commit Settings
              </button>
            </form>
          </div>

          {/* Historical Log */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-2">
              Commission Change History & Audit Log
            </h3>
            <div className="divide-y divide-stone-100">
              {commissionData?.history?.map((h) => (
                <div key={h.id} className="py-2.5 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-stone-900">
                      Rate: {h.previous_rate}% → {h.new_rate}%
                    </span>
                    <span className="text-stone-400 text-[10px]">{new Date(h.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-stone-600 italic">"{h.reason}"</p>
                  <p className="text-stone-400 text-[10px]">Changed by: {h.changed_by}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Bundle & Volume Offer Monitoring Panel */}
          <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="p-2 bg-forest-50 text-forest-800 rounded-xl">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Artisan Bundle Promotion Offers & Monitoring Matrix
                  </h3>
                  <p className="text-xs text-stone-500">
                    Active automated volume discount rules applied at storefront bundle selection & cart checkout
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                <CheckCircle size={13} className="text-emerald-700" /> Active Platform Rules
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">Tier 1: Single Jar</span>
                  <span className="text-[10px] font-mono bg-white px-2 py-0.5 rounded border border-stone-200">0% Discount</span>
                </div>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  Standard baseline retail price set by verified artisan brand. Full margin to producer.
                </p>
              </div>

              <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">Tier 2: Duo Pack (2 Jars)</span>
                  <span className="text-[10px] font-mono bg-amber-500 text-stone-950 font-bold px-2 py-0.5 rounded">8% Bundle OFF</span>
                </div>
                <p className="text-stone-700 text-[11px] leading-relaxed">
                  Recommended tier highlighted on product pages. Drives repeat volume and multi-jar orders.
                </p>
              </div>

              <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">Tier 3: Tasting Trio (3 Jars)</span>
                  <span className="text-[10px] font-mono bg-purple-700 text-white font-bold px-2 py-0.5 rounded">15% Bundle OFF</span>
                </div>
                <p className="text-stone-700 text-[11px] leading-relaxed">
                  Best value tier + qualifies for Free Express Delivery threshold. Maximum customer retention.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Settlements */}
      {activeTab === 'settlements' && (
        <div className="space-y-6 text-xs">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900">Accrued Manufacturer Balances</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {settlementData?.manufacturer_balances?.map((b) => (
                <div key={b.manufacturer_id} className="p-4 bg-cream-50 rounded-xl border border-stone-200 space-y-2">
                  <h4 className="font-serif font-bold text-stone-900 text-sm">{b.business_name}</h4>
                  <div className="space-y-1 text-stone-600">
                    <div className="flex justify-between">
                      <span>Total Sales:</span>
                      <span className="font-semibold text-stone-900">₹{b.total_sales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Platform Commission:</span>
                      <span className="font-semibold text-stone-900">₹{b.total_commission}</span>
                    </div>
                    <div className="flex justify-between text-forest-900 font-bold border-t border-stone-200 pt-1">
                      <span>Net Payable:</span>
                      <span>₹{b.net_payable}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleGenerateSettlement(b.manufacturer_id)}
                    className="w-full mt-2 py-1.5 bg-forest-800 text-white rounded font-semibold text-[11px]"
                  >
                    Generate Settlement Batch
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <h3 className="font-serif font-bold text-base text-stone-900">Settlement Batch Records</h3>
            <div className="divide-y divide-stone-100">
              {settlementData?.settlement_records?.map((rec) => (
                <div key={rec.id} className="py-2.5 flex justify-between items-center">
                  <div>
                    <span className="font-mono font-bold text-stone-900">{rec.settlement_reference}</span>
                    <span className="text-stone-500 block text-[11px]">{rec.manufacturer_name} · {rec.period_start} to {rec.period_end}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-stone-950">₹{parseFloat(rec.net_payable).toFixed(2)}</span>
                    <span className="text-[10px] block font-semibold text-emerald-700">{rec.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 7: Audit Logs */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 text-xs space-y-3">
          <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-2">
            System & Security Audit Trail
          </h3>
          <div className="divide-y divide-stone-100">
            {auditLogsList.map((log) => (
              <div key={log.id} className="py-2.5 flex justify-between items-start gap-4">
                <div>
                  <span className="font-bold text-stone-900">{log.action}</span>
                  <span className="text-stone-500 block text-[11px]">
                    Target: {log.target_model} (ID: {log.target_id}) by User: <strong>{log.username}</strong>
                  </span>
                  <p className="text-stone-400 font-mono text-[10px] mt-0.5">{JSON.stringify(log.details)}</p>
                </div>
                <span className="text-stone-400 text-[10px] whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Seller Inspection Portfolio Modal */}
      {selectedSeller && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-stone-200 p-6 space-y-5 text-xs animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-serif font-bold text-xl text-stone-900">{selectedSeller.business_name}</h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    selectedSeller.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                    selectedSeller.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedSeller.status}
                  </span>
                  {selectedSeller.is_featured && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-forest-950 flex items-center gap-1">
                      <Star size={10} fill="currentColor" /> Featured
                    </span>
                  )}
                </div>
                <p className="text-stone-500 text-xs">
                  {selectedSeller.location_district} · Display Priority Rank #{selectedSeller.display_priority ?? 0}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSeller(null)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Seller Contact & Verification Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1.5">
                <span className="font-bold text-stone-700 uppercase tracking-wider text-[10px] block">Contact & Location</span>
                <p className="text-stone-900 font-semibold">{selectedSeller.business_address || 'No physical address'}</p>
                <p className="text-stone-600">PIN: {selectedSeller.postal_code || '—'}</p>
                <p className="text-stone-600 font-mono text-[11px]">{selectedSeller.contact_email}</p>
                <p className="text-stone-600">{selectedSeller.contact_phone}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-1.5">
                <span className="font-bold text-stone-700 uppercase tracking-wider text-[10px] block">Compliance & Commission</span>
                <p className="text-stone-900">
                  FSSAI License: <strong className="font-mono text-emerald-900">{selectedSeller.fssai_license_number || 'None'}</strong>
                </p>
                <p className="text-stone-600">
                  GSTIN: <span className="font-mono">{selectedSeller.gst_number || 'Unregistered'}</span>
                </p>
                <p className="text-stone-600">
                  Commission: <strong>{selectedSeller.commission_rate_override ? `${selectedSeller.commission_rate_override}% (Custom)` : '10.00% (Default)'}</strong>
                </p>
                <p className="text-stone-600">
                  Slug: <span className="font-mono text-[11px]">/brands/{selectedSeller.slug}</span>
                </p>
              </div>
            </div>

            {/* Brand Story */}
            {selectedSeller.brand_story && (
              <div className="p-3.5 rounded-xl bg-cream-50/70 border border-stone-200/70 space-y-1">
                <span className="font-bold text-stone-700 uppercase tracking-wider text-[10px] block">Artisan Brand Story</span>
                <p className="text-stone-700 leading-relaxed italic">
                  "{selectedSeller.brand_story}"
                </p>
              </div>
            )}

            {/* Seller Catalog & Performance Highlights */}
            <div className="space-y-2">
              <span className="font-bold text-stone-900 text-xs block">
                Products Listed by {selectedSeller.business_name} ({productsList.filter(p => p.manufacturer?.id === selectedSeller.id || p.manufacturer_id === selectedSeller.id).length})
              </span>
              <div className="max-h-48 overflow-y-auto divide-y divide-stone-100 border border-stone-200 rounded-xl">
                {productsList
                  .filter(p => p.manufacturer?.id === selectedSeller.id || p.manufacturer_id === selectedSeller.id)
                  .map(p => (
                    <div key={p.id} className="p-2.5 flex items-center justify-between hover:bg-stone-50">
                      <div>
                        <span className="font-bold text-stone-900">{p.title}</span>
                        <span className="text-stone-400 block text-[10px]">Stock: {p.stock_quantity} units · ₹{parseFloat(p.price).toFixed(0)}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                {productsList.filter(p => p.manufacturer?.id === selectedSeller.id || p.manufacturer_id === selectedSeller.id).length === 0 && (
                  <p className="p-4 text-center text-stone-400 text-xs">No products listed by this seller yet.</p>
                )}
              </div>
            </div>

            {/* Quick Actions in Modal */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-stone-100">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleSetPriority(selectedSeller.id, selectedSeller.display_priority ?? 0);
                    setSelectedSeller(null);
                  }}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold"
                >
                  Edit Rank (#{selectedSeller.display_priority ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSetCommissionOverride(selectedSeller.id);
                    setSelectedSeller(null);
                  }}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg font-bold"
                >
                  Set Commission
                </button>
              </div>

              <div className="flex items-center gap-2">
                {selectedSeller.status !== 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleApproveManufacturer(selectedSeller.id, 'APPROVED');
                      setSelectedSeller(null);
                    }}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold"
                  >
                    Approve Brand
                  </button>
                )}
                {selectedSeller.status !== 'REJECTED' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleApproveManufacturer(selectedSeller.id, 'REJECTED');
                      setSelectedSeller(null);
                    }}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-bold"
                  >
                    Reject
                  </button>
                )}
                {selectedSeller.status !== 'SUSPENDED' && (
                  <button
                    type="button"
                    onClick={() => {
                      const reason = window.prompt("Enter policy/quality violation reason to suspend & ban this seller:", selectedSeller.compliance_notes || "FSSAI compliance or quality violation");
                      if (reason !== null) {
                        handleApproveManufacturer(selectedSeller.id, 'SUSPENDED', reason);
                        setSelectedSeller(null);
                      }
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold flex items-center gap-1 shadow-sm"
                  >
                    <ShieldAlert size={12} />
                    <span>Ban Seller</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Ban & Rule Enforcement Modal */}
      {banModalUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full border border-stone-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2 text-red-700 font-bold text-sm">
                <ShieldAlert size={18} />
                <span>Ban & Suspend User Account</span>
              </div>
              <button
                type="button"
                onClick={() => { setBanModalUser(null); setBanReason(''); }}
                className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-red-900 text-xs space-y-1">
              <p className="font-bold">Target Account: {banModalUser.first_name || banModalUser.username} ({banModalUser.email})</p>
              <p className="text-[11px] text-red-700">
                Account Role: <strong>{banModalUser.role}</strong>. Banning will immediately block login access, invalidate active sessions, and automatically hide any listed jars if this user is a seller.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-stone-700 font-bold text-xs">
                Select Violation Type / Reason:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'FSSAI or hygiene non-compliance',
                  'Counterfeit or mislabeled ingredients',
                  'Order cancellation & dispatch failure',
                  'Review manipulation or fake ratings',
                  'Fraudulent payment or chargebacks',
                  'Spam & platform abuse'
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBanReason(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                      banReason === preset
                        ? 'bg-red-600 text-white border-red-600'
                        : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <textarea
                rows={3}
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter specific policy violation details..."
                className="w-full px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-none focus:border-red-500 font-medium"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => { setBanModalUser(null); setBanReason(''); }}
                className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleToggleUserBan(banModalUser, banReason)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 cursor-pointer"
              >
                Confirm Account Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
