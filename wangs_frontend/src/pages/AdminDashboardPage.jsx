import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield, Users, Package, DollarSign, Settings,
  CheckCircle, XCircle, AlertCircle, TrendingUp, Search,
  FileText, ArrowRight, RefreshCw, Star, Sparkles, Store, Eye, EyeOff, Wrench,
  Mail, Phone, MapPin, Award, Clock, Trash2, ShieldAlert, CheckCircle2, X, Ban, ShieldCheck,
  Home, LogOut, Download, Copy, Check, Landmark,
  Image as ImageIcon, Plus, UploadCloud, Edit3, Flame, ExternalLink, Type, Tags,
  Megaphone, Bell
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';
import AdminRewardsTab from '../components/AdminRewardsTab';

const extractList = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
};

const ADMIN_CACHE_KEY = 'wangs_admin_cache_v2';

const readAdminCache = () => {
  try {
    const raw = sessionStorage.getItem(ADMIN_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
};

const saveAdminCache = (data) => {
  try {
    sessionStorage.setItem(ADMIN_CACHE_KEY, JSON.stringify(data));
  } catch {}
};

export default function AdminDashboardPage() {
  const { user, isAdmin, loading: authLoading, login, logout, allowSellerRegistration, isMaintenanceMode, maintenanceMessage, refreshPlatformSettings } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const cachedData = readAdminCache();

  const [adminLoginForm, setAdminLoginForm] = useState({ username: 'admin', password: '' });
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [sessionError, setSessionError] = useState(null);
  const [loggingIn, setLoggingIn] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [togglingSellerReg, setTogglingSellerReg] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);
  const [customMaintenanceMsg, setCustomMaintenanceMsg] = useState('');

  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics', 'users', 'manufacturers', 'products', 'orders', 'commission', 'settlements', 'logs'
  const [metrics, setMetrics] = useState(() => cachedData?.metrics || null);
  const [manufacturers, setManufacturers] = useState(() => cachedData?.manufacturers || []);
  const [products, setProducts] = useState(() => cachedData?.products || []);
  const [orders, setOrders] = useState(() => cachedData?.orders || []);
  const [commissionData, setCommissionData] = useState(() => cachedData?.commissionData || null);
  const [settlementData, setSettlementData] = useState(() => cachedData?.settlementData || null);
  const [auditLogs, setAuditLogs] = useState(() => cachedData?.auditLogs || []);
  const [usersList, setUsersList] = useState(() => cachedData?.usersList || []);
  const [sellerRequests, setSellerRequests] = useState(() => cachedData?.sellerRequests || []);
  const [subscribers, setSubscribers] = useState(() => cachedData?.subscribers || []);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [banModalUser, setBanModalUser] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sellerSearch, setSellerSearch] = useState('');
  const [sellerStatusFilter, setSellerStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(() => !cachedData?.metrics);

  // Dedicated "Yet to be Approved" Space State
  const [pendingTabFilter, setPendingTabFilter] = useState('PENDING'); // 'PENDING', 'ALL', 'AUTHORIZED', 'PROFILES'
  const [downloadingResearch, setDownloadingResearch] = useState(null); // 'pdf', 'all', 'customers', 'sellers', 'products'
  const [pendingSearch, setPendingSearch] = useState('');
  const [approvingEmail, setApprovingEmail] = useState('');
  const [inspectingRequest, setInspectingRequest] = useState(null);
  const [batchApproving, setBatchApproving] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  // Seller Product Upload Notifications State
  const [dismissedProductNotifs, setDismissedProductNotifs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('wangs_dismissed_prod_notifs') || '[]');
    } catch {
      return [];
    }
  });

  const handleDismissProductNotif = (id) => {
    const next = [...dismissedProductNotifs, id];
    setDismissedProductNotifs(next);
    try {
      localStorage.setItem('wangs_dismissed_prod_notifs', JSON.stringify(next));
    } catch {}
  };

  // Commission Edit Form State
  const [commForm, setCommForm] = useState({
    default_commission_rate: '10.00',
    customer_platform_fee: '5.00',
    default_delivery_fee: '50.00',
    free_delivery_threshold: '999.00',
    reason: '',
  });

  // Hero Promo Banners Management State
  const [heroBanners, setHeroBanners] = useState(() => cachedData?.heroBanners || []);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [bannerForm, setBannerForm] = useState({
    title: 'The Great Achar Season',
    subtitle: 'Authentic Andhra Avakaya & Gongura small-batches straight from Guntur clay jars.',
    badge_text: 'FRESH BATCH LIVE',
    coupon_code: 'ACHAR15',
    cta_text: 'Shop Now',
    cta_link: '/products?category=andhra-gongura',
    bg_color: '#9b4100',
    image_url: '',
    is_image_only: false,
    is_active: true,
    display_order: 0,
  });
  const [bannerImageFile, setBannerImageFile] = useState(null);
  const [bannerImagePreview, setBannerImagePreview] = useState('');

  // Product Categories Management State (Storefront Navbar Pills & Catalog Filters)
  const [categoriesList, setCategoriesList] = useState(() => cachedData?.categoriesList || []);
  const [categorySaving, setCategorySaving] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    slug: '',
    description: '',
    display_order: 0,
    is_active: true,
  });

  // Storefront Notice Ribbon & Announcements State (Top Notification Ribbon Synchronizer)
  const [storefrontNotices, setStorefrontNotices] = useState(() => cachedData?.storefrontNotices || []);
  const [noticeSaving, setNoticeSaving] = useState(false);
  const [editingNoticeId, setEditingNoticeId] = useState(null);
  const [noticeForm, setNoticeForm] = useState({
    text: '',
    highlight: '',
    badge_color: 'bg-emerald-600 text-white',
    link: '/products',
    is_active: true,
    display_order: 0,
  });

  const checkIsAuthError = (err) => {
    const msg = (err?.message || '').toLowerCase();
    return msg.includes('permission') || msg.includes('403') || msg.includes('401') || msg.includes('forbidden') || msg.includes('unauthorized') || msg.includes('not authenticated');
  };

  const loadAdminData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else if (!metrics && !cachedData?.metrics) {
      setLoading(true);
    }
    setSessionError(null);

    try {
      // PHASE 1: Fast Core Operational Data (Metrics, Manufacturers, Seller Inflow)
      // Unblocks the entire dashboard UI in ~150ms!
      const [met, mfgs, reqs] = await Promise.all([
        api.getAdminMetrics().catch((err) => {
          if (checkIsAuthError(err)) throw err;
          console.warn('Metrics failed', err);
          return null;
        }),
        api.getAdminManufacturers().catch((err) => {
          if (checkIsAuthError(err)) throw err;
          console.warn('Manufacturers failed', err);
          return [];
        }),
        api.getAdminSellerRequests().catch(() => []),
      ]);

      const parsedMfgs = extractList(mfgs);
      const parsedReqs = extractList(reqs);

      setMetrics(met || null);
      setManufacturers(parsedMfgs);
      setSellerRequests(parsedReqs);

      // Unblock the UI immediately!
      setLoading(false);

      // PHASE 2: Secondary Tab Data loaded smoothly in background with Promise.allSettled
      setSecondaryLoading(true);
      const [prodsRes, ordsRes, commRes, stlRes, logsRes, usrsRes, subsRes, bannersRes, catsRes, noticesRes] = await Promise.allSettled([
        api.getAdminProducts(),
        api.getAdminOrders(),
        api.getCommissionSettings(),
        api.getSettlements(),
        api.getAuditLogs(),
        api.getAdminUsers(),
        api.getMaintenanceSubscribers(),
        api.getAdminHeroBanners(),
        api.getAdminCategories(),
        api.getAdminStorefrontNotices(),
      ]);

      const parsedProds = prodsRes.status === 'fulfilled' ? extractList(prodsRes.value) : (cachedData?.products || []);
      const parsedOrds = ordsRes.status === 'fulfilled' ? extractList(ordsRes.value) : (cachedData?.orders || []);
      const parsedComm = commRes.status === 'fulfilled' ? commRes.value : (cachedData?.commissionData || null);
      const parsedStl = stlRes.status === 'fulfilled' ? stlRes.value : (cachedData?.settlementData || null);
      const parsedLogs = logsRes.status === 'fulfilled' ? extractList(logsRes.value) : (cachedData?.auditLogs || []);
      const parsedUsrs = usrsRes.status === 'fulfilled' ? extractList(usrsRes.value) : (cachedData?.usersList || []);
      const parsedSubs = subsRes.status === 'fulfilled' ? extractList(subsRes.value) : (cachedData?.subscribers || []);
      const parsedBanners = bannersRes.status === 'fulfilled' ? extractList(bannersRes.value) : (cachedData?.heroBanners || []);
      const parsedCats = catsRes.status === 'fulfilled' ? extractList(catsRes.value) : (cachedData?.categoriesList || []);
      const parsedNotices = noticesRes.status === 'fulfilled' ? extractList(noticesRes.value) : (cachedData?.storefrontNotices || []);

      setProducts(parsedProds);
      setOrders(parsedOrds);
      setCommissionData(parsedComm);
      setSettlementData(parsedStl);
      setAuditLogs(parsedLogs);
      setUsersList(parsedUsrs);
      setSubscribers(parsedSubs);
      setHeroBanners(parsedBanners);
      setCategoriesList(parsedCats);
      setStorefrontNotices(parsedNotices);

      if (parsedComm?.current) {
        setCommForm({
          default_commission_rate: parsedComm.current.default_commission_rate,
          customer_platform_fee: parsedComm.current.customer_platform_fee,
          default_delivery_fee: parsedComm.current.default_delivery_fee,
          free_delivery_threshold: parsedComm.current.free_delivery_threshold,
          reason: '',
        });
      }

      // Save complete snapshot to cache
      saveAdminCache({
        metrics: met || null,
        manufacturers: parsedMfgs,
        sellerRequests: parsedReqs,
        products: parsedProds,
        orders: parsedOrds,
        commissionData: parsedComm,
        settlementData: parsedStl,
        auditLogs: parsedLogs,
        usersList: parsedUsrs,
        subscribers: parsedSubs,
        heroBanners: parsedBanners,
        categoriesList: parsedCats,
        storefrontNotices: parsedNotices,
      });

    } catch (err) {
      console.error('Failed to load admin dashboard', err);
      if (checkIsAuthError(err)) {
        setSessionError('Administrator session unauthorized or expired. Please sign in with administrator credentials.');
      } else {
        toast.error(err.message || 'Error loading administration data');
      }
    } finally {
      setLoading(false);
      setSecondaryLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  const handleAdminLogin = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setLoggingIn(true);
    try {
      const u = await login(adminLoginForm.username, adminLoginForm.password);
      if (u.role === 'ADMIN' || u.is_staff || u.is_superuser) {
        setSessionError(null);
        toast.success(`Welcome to Wangs Admin Space, ${u.username}`);
        await loadAdminData();
      } else {
        toast.error('This account does not have Superadmin privileges.');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid administrator credentials');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleQuickAdminLogin = async () => {
    setLoggingIn(true);
    try {
      setAdminLoginForm({ username: 'admin', password: 'admin12345' });
      const u = await login('admin', 'admin12345');
      if (u.role === 'ADMIN' || u.is_staff || u.is_superuser) {
        setSessionError(null);
        toast.success(`Welcome to Wangs Admin Space, ${u.username}`);
        await loadAdminData();
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
      toast.success(status === 'APPROVED' ? 'Manufacturer approved! Onboarding email sent with Seller Portal link.' : `Manufacturer ${status.toLowerCase()} successfully`);
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

  const handleToggleDealOfTheDay = async (id) => {
    try {
      const res = await api.toggleProductDealOfTheDay(id);
      toast.success(res?.is_deal_of_the_day ? 'Product marked as Deal of the Day!' : 'Removed from Deal of the Day');
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

  const handleDeleteUser = async (targetUser) => {
    if (!targetUser) return;
    const displayName = targetUser.first_name || targetUser.last_name
      ? `${targetUser.first_name} ${targetUser.last_name} (${targetUser.email || targetUser.username})`
      : `${targetUser.username} (${targetUser.email})`;

    if (!window.confirm(`Are you sure you want to permanently delete user account "${displayName}"?\n\nThis will remove their profile and access immediately. This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await api.deleteAdminUser(targetUser.id);
      toast.success(res?.message || `User ${targetUser.username} deleted successfully.`);
      setUsersList((prev) => prev.filter((u) => u.id !== targetUser.id));
      loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete user account');
    }
  };

  const handleApproveSellerRequest = async (email) => {
    setApprovingEmail(email);
    try {
      const res = await api.approveAdminSellerRequest(email);
      toast.success(res?.message || `Seller authorization approved! Onboarding email sent to ${email}`);
      await loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Approval failed');
    } finally {
      setApprovingEmail('');
    }
  };

  const handleDeleteSellerRequest = async (id, businessName = 'this application', email = '') => {
    if (!window.confirm(`Are you sure you want to dismiss/remove the seller request for "${businessName}" from queue?`)) return;
    try {
      await api.deleteAdminSellerRequest({ id, email });
      toast.success(`Seller request for "${businessName}" removed from queue.`);
      setSellerRequests((prev) => prev.filter((r) => r.id !== id && (!email || (r.email || '').toLowerCase() !== email.toLowerCase())));
      await loadAdminData();
    } catch (err) {
      toast.error(err.message || 'Failed to remove seller request');
    }
  };

  const handleApproveAllPending = async () => {
    const pending = sellerRequestsList.filter((r) => !r.is_authorized);
    if (!pending.length) {
      toast.info('No pending seller applications to authorize.');
      return;
    }
    if (!window.confirm(`Authorize and dispatch official onboarding invitations to all ${pending.length} pending seller applicants?`)) return;
    setBatchApproving(true);
    let successCount = 0;
    for (const req of pending) {
      try {
        await api.approveAdminSellerRequest(req.email);
        successCount++;
      } catch (err) {
        console.error('Failed to approve seller applicant:', req.email, err);
      }
    }
    setBatchApproving(false);
    toast.success(`Successfully authorized and invited ${successCount} seller partner(s)!`);
    await loadAdminData();
  };

  const handleCopyText = (text, label = 'Copied') => {
    if (!text) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedText(text);
    setTimeout(() => setCopiedText(''), 2000);
    toast.success(`${label} copied to clipboard!`);
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

  const handleDownloadResearch = async (format = 'csv', type = 'all') => {
    const key = format === 'pdf' ? 'pdf' : type;
    setDownloadingResearch(key);
    try {
      await api.downloadResearchFile(format, type);
      toast.success(
        format === 'pdf'
          ? 'Platform Research Dossier (PDF) generated and downloaded successfully!'
          : `Wangs ${type.toUpperCase()} research dataset (CSV) downloaded successfully!`
      );
    } catch (err) {
      toast.error(err.message || 'Failed to download research file');
    } finally {
      setDownloadingResearch(null);
    }
  };

  const handleBannerFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file (PNG, JPG, WebP)');
      return;
    }
    setBannerImageFile(file);
    setBannerImagePreview(URL.createObjectURL(file));
  };

  const handleResetBannerForm = () => {
    setEditingBannerId(null);
    setBannerImageFile(null);
    setBannerImagePreview('');
    setBannerForm({
      title: 'The Great Achar Season',
      subtitle: 'Authentic Andhra Avakaya & Gongura small-batches straight from Guntur clay jars.',
      badge_text: 'FRESH BATCH LIVE',
      coupon_code: 'ACHAR15',
      cta_text: 'Shop Now',
      cta_link: '/products?category=andhra-gongura',
      bg_color: '#9b4100',
      image_url: '',
      is_image_only: false,
      is_active: true,
      display_order: 0,
    });
  };

  const handleEditBanner = (b) => {
    setEditingBannerId(b.id);
    setBannerForm({
      title: b.title || '',
      subtitle: b.subtitle || '',
      badge_text: b.badge_text || '',
      coupon_code: b.coupon_code || '',
      cta_text: b.cta_text || 'Shop Now',
      cta_link: b.cta_link || '/products',
      bg_color: b.bg_color || '#9b4100',
      image_url: b.image_url || '',
      is_image_only: !!b.is_image_only,
      is_active: b.is_active ?? true,
      display_order: b.display_order ?? 0,
    });
    setBannerImageFile(null);
    setBannerImagePreview(b.effective_image_url || b.image_url || b.image || '');
  };

  const handleSaveBanner = async (e) => {
    e.preventDefault();
    if (!bannerForm.is_image_only && !bannerForm.title.trim()) {
      toast.error('Campaign Title / Headline is required for text overlay banners');
      return;
    }
    if (bannerForm.is_image_only && !bannerImageFile && !bannerForm.image_url.trim() && !bannerImagePreview) {
      toast.error('Please upload an image or provide an image URL for Image-Only banner');
      return;
    }

    setBannerUploading(true);
    try {
      const bannerTitle = bannerForm.title.trim() || (bannerForm.is_image_only ? 'Graphic Promo Banner' : 'Campaign Banner');
      let payload;
      if (bannerImageFile) {
        payload = new FormData();
        payload.append('title', bannerTitle);
        payload.append('subtitle', bannerForm.is_image_only ? '' : (bannerForm.subtitle || ''));
        payload.append('badge_text', bannerForm.is_image_only ? '' : (bannerForm.badge_text || ''));
        payload.append('coupon_code', bannerForm.is_image_only ? '' : (bannerForm.coupon_code || ''));
        payload.append('cta_text', bannerForm.is_image_only ? '' : (bannerForm.cta_text || 'Shop Now'));
        payload.append('cta_link', bannerForm.cta_link || '/products');
        payload.append('bg_color', bannerForm.bg_color || '#9b4100');
        payload.append('is_image_only', String(bannerForm.is_image_only));
        payload.append('is_active', String(bannerForm.is_active));
        payload.append('display_order', String(bannerForm.display_order));
        payload.append('image', bannerImageFile);
      } else {
        payload = {
          title: bannerTitle,
          subtitle: bannerForm.is_image_only ? '' : (bannerForm.subtitle || ''),
          badge_text: bannerForm.is_image_only ? '' : (bannerForm.badge_text || ''),
          coupon_code: bannerForm.is_image_only ? '' : (bannerForm.coupon_code || ''),
          cta_text: bannerForm.is_image_only ? '' : (bannerForm.cta_text || 'Shop Now'),
          cta_link: bannerForm.cta_link || '/products',
          bg_color: bannerForm.bg_color || '#9b4100',
          image_url: bannerForm.image_url || '',
          is_image_only: bannerForm.is_image_only,
          is_active: bannerForm.is_active,
          display_order: bannerForm.display_order,
        };
      }

      if (editingBannerId) {
        await api.updateAdminHeroBanner(editingBannerId, payload);
        toast.success(`Banner #${editingBannerId} updated successfully`);
      } else {
        await api.createAdminHeroBanner(payload);
        toast.success('Hero promo banner published successfully');
      }

      const updatedBanners = await api.getAdminHeroBanners();
      setHeroBanners(extractList(updatedBanners));
      handleResetBannerForm();
    } catch (err) {
      console.error('Failed to save banner', err);
      toast.error(err.message || 'Failed to save hero banner');
    } finally {
      setBannerUploading(false);
    }
  };

  const handleToggleBannerActive = async (bannerId) => {
    try {
      const res = await api.toggleAdminHeroBanner(bannerId);
      setHeroBanners((prev) =>
        prev.map((b) => (b.id === bannerId ? { ...b, is_active: res.is_active ?? !b.is_active } : b))
      );
      toast.success(`Banner #${bannerId} status updated`);
    } catch (err) {
      toast.error('Failed to toggle banner status');
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    if (!window.confirm(`Are you sure you want to delete banner #${bannerId}?`)) return;
    try {
      await api.deleteAdminHeroBanner(bannerId);
      setHeroBanners((prev) => prev.filter((b) => b.id !== bannerId));
      if (editingBannerId === bannerId) {
        handleResetBannerForm();
      }
      toast.success(`Banner #${bannerId} deleted`);
    } catch (err) {
      toast.error('Failed to delete banner');
    }
  };

  const handleResetCategoryForm = () => {
    setEditingCategoryId(null);
    setCategoryForm({
      name: '',
      slug: '',
      description: '',
      display_order: 0,
      is_active: true,
    });
  };

  const handleEditCategory = (cat) => {
    setEditingCategoryId(cat.id);
    setCategoryForm({
      name: cat.name || '',
      slug: cat.slug || '',
      description: cat.description || '',
      display_order: cat.display_order ?? 0,
      is_active: cat.is_active ?? true,
    });
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) {
      toast.error('Category Name is required');
      return;
    }

    setCategorySaving(true);
    try {
      const payload = {
        name: categoryForm.name.trim(),
        slug: categoryForm.slug.trim() || undefined,
        description: categoryForm.description.trim(),
        display_order: parseInt(categoryForm.display_order, 10) || 0,
        is_active: categoryForm.is_active,
      };

      if (editingCategoryId) {
        await api.updateAdminCategory(editingCategoryId, payload);
        toast.success(`Category "${payload.name}" updated successfully`);
      } else {
        await api.createAdminCategory(payload);
        toast.success(`Category "${payload.name}" created and added to navbar!`);
      }

      const updatedCats = await api.getAdminCategories();
      setCategoriesList(extractList(updatedCats));
      handleResetCategoryForm();
      window.dispatchEvent(new Event('wangs_categories_changed'));
    } catch (err) {
      console.error('Failed to save category', err);
      toast.error(err.message || 'Failed to save category');
    } finally {
      setCategorySaving(false);
    }
  };

  const handleToggleCategoryActive = async (catId) => {
    try {
      const res = await api.toggleAdminCategory(catId);
      setCategoriesList((prev) =>
        prev.map((c) => (c.id === catId ? { ...c, is_active: res.is_active ?? !c.is_active } : c))
      );
      toast.success('Category visibility toggled');
      window.dispatchEvent(new Event('wangs_categories_changed'));
    } catch (err) {
      toast.error('Failed to toggle category');
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    if (!window.confirm(`Are you sure you want to delete category "${catName}"?`)) return;
    try {
      await api.deleteAdminCategory(catId);
      setCategoriesList((prev) => prev.filter((c) => c.id !== catId));
      if (editingCategoryId === catId) {
        handleResetCategoryForm();
      }
      toast.success(`Category "${catName}" deleted`);
      window.dispatchEvent(new Event('wangs_categories_changed'));
    } catch (err) {
      toast.error('Failed to delete category');
    }
  };

  const handleSaveNotice = async (e) => {
    e.preventDefault();
    if (!noticeForm.text.trim()) {
      toast.error('Notice announcement text is required');
      return;
    }

    setNoticeSaving(true);
    try {
      const payload = {
        text: noticeForm.text.trim(),
        highlight: noticeForm.highlight.trim(),
        badge_color: noticeForm.badge_color || 'bg-emerald-600 text-white',
        link: noticeForm.link.trim() || '/products',
        is_active: Boolean(noticeForm.is_active),
        display_order: parseInt(noticeForm.display_order, 10) || 0,
      };

      if (editingNoticeId) {
        await api.updateAdminStorefrontNotice(editingNoticeId, payload);
        toast.success('Storefront notice updated successfully');
      } else {
        await api.createAdminStorefrontNotice(payload);
        toast.success('New notice published to storefront ribbon');
      }

      handleResetNoticeForm();
      const updated = await api.getAdminStorefrontNotices();
      setStorefrontNotices(extractList(updated));
      window.dispatchEvent(new CustomEvent('wangs_notices_changed'));
    } catch (err) {
      toast.error(err.message || 'Failed to save storefront notice');
    } finally {
      setNoticeSaving(false);
    }
  };

  const handleToggleNotice = async (noticeId) => {
    try {
      const res = await api.toggleAdminStorefrontNotice(noticeId);
      setStorefrontNotices((prev) =>
        prev.map((n) => (n.id === noticeId ? { ...n, is_active: res.is_active } : n))
      );
      toast.success(res.is_active ? 'Notice activated on storefront' : 'Notice hidden from storefront');
      window.dispatchEvent(new CustomEvent('wangs_notices_changed'));
    } catch (err) {
      toast.error(err.message || 'Failed to toggle notice');
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    if (!window.confirm('Delete this notice from the storefront ribbon?')) return;
    try {
      await api.deleteAdminStorefrontNotice(noticeId);
      setStorefrontNotices((prev) => prev.filter((n) => n.id !== noticeId));
      if (editingNoticeId === noticeId) {
        handleResetNoticeForm();
      }
      toast.success('Notice removed from storefront');
      window.dispatchEvent(new CustomEvent('wangs_notices_changed'));
    } catch (err) {
      toast.error(err.message || 'Failed to delete notice');
    }
  };

  const handleStartEditNotice = (n) => {
    setEditingNoticeId(n.id);
    setNoticeForm({
      text: n.text || '',
      highlight: n.highlight || '',
      badge_color: n.badge_color || 'bg-emerald-600 text-white',
      link: n.link || '/products',
      is_active: n.is_active ?? true,
      display_order: n.display_order ?? 0,
    });
  };

  const handleResetNoticeForm = () => {
    setEditingNoticeId(null);
    setNoticeForm({
      text: '',
      highlight: '',
      badge_color: 'bg-emerald-600 text-white',
      link: '/products',
      is_active: true,
      display_order: 0,
    });
  };

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto py-24 px-4 text-center">
        <div className="w-10 h-10 border-4 border-forest-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-stone-500 mt-3 font-semibold">Verifying admin session...</p>
      </div>
    );
  }

  if (!isAdmin || sessionError) {
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
              /wangsadminspace · Secure Gateway
            </p>
            <p className="text-xs text-stone-500 mt-1">
              Elevated access required for platform moderation, courier dispatch, and commission governance.
            </p>
          </div>

          {sessionError && (
            <div className="p-3.5 bg-red-50 rounded-2xl border border-red-200 text-xs text-red-900 flex items-start gap-2.5">
              <AlertCircle size={16} className="text-red-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{sessionError}</p>
            </div>
          )}

          {user && (user.role !== 'ADMIN' && !user.is_staff && !user.is_superuser) && (
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center gap-1.5">
                  <AlertCircle size={14} className="text-amber-700" />
                  Currently signed in as:
                </span>
                <span className="font-mono font-bold bg-amber-200/70 text-amber-950 px-2 py-0.5 rounded text-[11px]">
                  {user.username} ({user.role === 'MANUFACTURER' ? 'Artisan Seller' : user.role})
                </span>
              </div>
              <p className="text-[11px] text-stone-600 leading-normal">
                This account lacks Superadmin privileges. Please authenticate below with administrator credentials (or click <strong>1-Click Sign In</strong>) to enter /wangsadminspace.
              </p>
            </div>
          )}

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
              <div className="relative">
                <input
                  type={showAdminPassword ? 'text' : 'password'}
                  required
                  value={adminLoginForm.password}
                  onChange={(e) => setAdminLoginForm({ ...adminLoginForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full pl-4 pr-11 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
                <button
                  type="button"
                  onClick={() => setShowAdminPassword(!showAdminPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer transition-colors"
                  title={showAdminPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                <div>
                  <span className="font-bold block">Local Development Access:</span>
                  <span className="font-mono text-stone-600">admin / admin12345</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setAdminLoginForm({ username: 'admin', password: 'admin12345' })}
                    className="px-2.5 py-1 bg-amber-200 hover:bg-amber-300 text-stone-950 font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                  <button
                    type="button"
                    disabled={loggingIn}
                    onClick={handleQuickAdminLogin}
                    className="px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-stone-950 font-black rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    1-Click Sign In
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3.5 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-xs active:scale-98 cursor-pointer"
            >
              <Shield size={15} />
              <span>{loggingIn ? 'Authenticating...' : 'Authenticate & Enter /wangsadminspace'}</span>
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

  if (loading && !metrics) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-4 text-center">
        <div className="w-8 h-8 border-4 border-chilli-700 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-stone-600 font-medium mt-3">Loading admin operational controls...</p>
        <p className="text-[11px] text-stone-400 mt-1">Connecting to marketplace administration backend...</p>
        <button
          onClick={() => setLoading(false)}
          className="mt-4 px-3.5 py-1.5 text-xs text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer border border-stone-200"
        >
          Skip Waiting & Enter Dashboard
        </button>
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
  const sellerRequestsList = extractList(sellerRequests);
  const pendingSellerRequests = sellerRequestsList.filter((r) => !r.is_authorized);
  const authorizedSellerRequests = sellerRequestsList.filter((r) => r.is_authorized);
  const pendingMfgProfiles = manufacturersList.filter((m) => m.status === 'PENDING');
  const totalYetToApprove = pendingSellerRequests.length + pendingMfgProfiles.length;

  // New Seller Product Upload Notifications
  const recentSellerProductLogs = auditLogsList.filter((log) => log.action === 'SELLER_PRODUCT_PUBLISHED');
  const activeProductNotifications = recentSellerProductLogs.filter((log) => !dismissedProductNotifs.includes(log.id));

  const filteredPendingRequests = sellerRequestsList.filter((req) => {
    const q = pendingSearch.trim().toLowerCase();
    const matchesSearch = !q || (
      (req.business_name || '').toLowerCase().includes(q) ||
      (req.email || '').toLowerCase().includes(q) ||
      (req.phone || '').includes(q) ||
      (req.location_district || '').toLowerCase().includes(q) ||
      (req.fssai_number || '').includes(q)
    );
    if (!matchesSearch) return false;
    if (pendingTabFilter === 'PENDING') return !req.is_authorized;
    if (pendingTabFilter === 'AUTHORIZED') return req.is_authorized;
    return true; // 'ALL'
  });

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
      <div className="bg-forest-950 text-cream-50 p-6 sm:p-8 rounded-2xl shadow-md border border-forest-900 mb-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="text-chilli-500" size={24} />
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                <span>Wangs Administration Space</span>
                <span className="text-[10px] font-mono font-bold bg-amber-400 text-stone-950 px-2 py-0.5 rounded-full">
                  /wangsadminspace
                </span>
              </h1>
            </div>
            <p className="text-xs text-cream-200 mt-1">
              Superuser Marketplace & Financial Controls · Server-enforced permissions & audit logging
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
            <Link
              to="/"
              className="px-3.5 py-2 bg-forest-900 hover:bg-forest-800 text-cream-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-forest-800 shadow-2xs"
            >
              <Home size={14} />
              <span>Storefront</span>
            </Link>
            <button
              onClick={() => loadAdminData(true)}
              disabled={isRefreshing}
              className="px-3.5 py-2 bg-forest-800 hover:bg-forest-700 text-cream-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-forest-700 shadow-2xs disabled:opacity-75"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
            </button>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="px-3 py-2 bg-stone-900 hover:bg-red-950 text-stone-300 hover:text-red-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-stone-800 shadow-2xs"
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
          </div>
        </div>

        {/* Global Summary Ribbon */}
        <div className="pt-3 border-t border-forest-900/80 flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-forest-900/90 border border-forest-800 text-cream-100 shadow-2xs">
            <Users size={14} className="text-amber-400" />
            <span className="text-stone-300">Total Registered Users:</span>
            <span className="font-bold text-white text-sm">
              {metrics?.total_users ?? usersList.length}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-forest-900/90 border border-forest-800 text-cream-100 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span className="text-stone-300">Shoppers:</span>
            <span className="font-bold text-emerald-300">
              {metrics?.total_customers ?? usersList.filter((u) => u.role === 'CUSTOMER').length}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-forest-900/90 border border-forest-800 text-cream-100 shadow-2xs">
            <Store size={13} className="text-amber-300" />
            <span className="text-stone-300">Active Brand Sellers:</span>
            <span className="font-bold text-amber-300">
              {metrics?.active_manufacturers ?? manufacturersList.length}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-forest-900/90 border border-forest-800 text-cream-100 shadow-2xs">
            <Package size={13} className="text-stone-300" />
            <span className="text-stone-300">Total Orders:</span>
            <span className="font-bold text-white">
              {metrics?.total_orders ?? ordersList.length}
            </span>
          </div>

          {secondaryLoading && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 shadow-2xs text-[11px] font-semibold">
              <RefreshCw size={11} className="animate-spin text-amber-400" />
              <span>Syncing secondary tabs in background...</span>
            </div>
          )}
        </div>
      </div>

      {/* High-Visibility Attention Alert Banner for Inbound Seller Requests */}
      {totalYetToApprove > 0 && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-amber-100/70 to-emerald-50 border-2 border-amber-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <span className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs shrink-0 animate-pulse">
              <Store size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-sm sm:text-base text-stone-900">
                  {totalYetToApprove} Inbound Seller Request(s) Awaiting Review & Approval
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider">
                  Action Required
                </span>
              </div>
              <p className="text-xs text-stone-600 mt-0.5">
                Producers (including Akamla Pickle) submitted "Sell with Us on Wangs" onboarding applications. Review them in the dedicated "Yet to be Approved" space.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('yet_to_approve')}
            className="px-4 py-2.5 bg-forest-900 hover:bg-forest-950 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer hover:scale-105 active:scale-95"
          >
            <span>Review & Authorize ({totalYetToApprove})</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Seller Product Upload Notifications (Self-Published Live without Admin Approval) */}
      {activeProductNotifications.length > 0 && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-100/70 border-2 border-emerald-400 shadow-xs flex flex-col gap-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs">
                <Package size={18} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-sm sm:text-base text-forest-950">
                    New Seller Product Upload Notification ({activeProductNotifications.length})
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider">
                    Live on Storefront
                  </span>
                </div>
                <p className="text-[11px] text-stone-600 mt-0.5">
                  Authorized sellers publish recipes directly without admin delay. You can review and inspect live batches here.
                </p>
              </div>
            </div>
            {activeProductNotifications.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  const allIds = activeProductNotifications.map((l) => l.id);
                  const next = [...new Set([...dismissedProductNotifs, ...allIds])];
                  setDismissedProductNotifs(next);
                  try {
                    localStorage.setItem('wangs_dismissed_prod_notifs', JSON.stringify(next));
                  } catch {}
                }}
                className="text-[11px] text-stone-500 hover:text-stone-800 underline font-semibold cursor-pointer"
              >
                Dismiss All
              </button>
            )}
          </div>

          <div className="divide-y divide-emerald-200/60 text-xs">
            {activeProductNotifications.slice(0, 4).map((notif) => {
              const d = notif.details || {};
              return (
                <div key={notif.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="font-bold text-stone-900 text-xs sm:text-sm">
                      <strong className="text-forest-900">{d.business_name || notif.username}</strong> uploaded recipe: <span className="text-emerald-950 font-black">"{d.product_title}"</span>
                    </p>
                    <p className="text-[11px] text-stone-600">
                      Customer Price: <span className="font-bold text-forest-900">₹{d.price}</span> (Base Payout: ₹{d.base_price}) · Stock: <span className="font-bold text-stone-800">{d.stock_quantity}</span> jars · Category: {d.category} · Time: {new Date(notif.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('products')}
                      className="px-3 py-1.5 bg-forest-900 hover:bg-forest-950 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer"
                    >
                      View in Catalog
                    </button>
                    {d.slug && (
                      <a
                        href={`/product/${d.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-forest-900 border border-emerald-300 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                      >
                        Inspect Storefront ↗
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDismissProductNotif(notif.id)}
                      className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
                      title="Dismiss notification"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin Nav Tabs */}
      <div className="border-b border-stone-200 mb-8 flex flex-wrap gap-3 sm:gap-4 text-xs font-bold text-stone-600">
        {[
          { id: 'metrics', label: 'Marketplace Metrics' },
          { id: 'notices', label: `Notice Ribbon (${storefrontNotices.length})` },
          { id: 'banners', label: `Hero Promo Banners (${heroBanners.length})` },
          { id: 'categories', label: `Categories (${categoriesList.length})` },
          {
            id: 'yet_to_approve',
            label: `Yet to be Approved (${totalYetToApprove})`,
            badge: totalYetToApprove,
            isAlert: totalYetToApprove > 0,
          },
          { id: 'manufacturers', label: `Manufacturers (${manufacturersList.length})` },
          { id: 'users', label: `Users & Customers (${metrics?.total_users ?? usersList.length})` },
          {
            id: 'products',
            label: `Catalog Moderation (${productsList.length})`,
            badge: activeProductNotifications.length,
            isNotice: activeProductNotifications.length > 0,
          },
          { id: 'orders', label: `Orders (${ordersList.length})` },
          { id: 'rewards', label: 'Wangs Rewards' },
          { id: 'commission', label: 'Commission & Fees' },
          { id: 'settlements', label: 'Payout Settlements' },
          { id: 'research', label: 'Research & Study Records (PDF/CSV)' },
          { id: 'logs', label: `Audit Trail (${auditLogsList.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id
                ? 'border-forest-900 text-forest-950 font-bold'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            <span>{tab.label}</span>
            {tab.badge > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                tab.isAlert
                  ? 'bg-amber-500 text-white shadow-2xs animate-pulse'
                  : tab.isNotice
                  ? 'bg-emerald-700 text-white shadow-2xs'
                  : 'bg-stone-200 text-stone-700'
              }`}>
                {tab.badge}
              </span>
            )}
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
            <div className="space-y-1.5 pt-1 border-t border-stone-800">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-stone-300 block">
                  Maintenance Lock Screen Message (Displayed to visitors ONLY when Maintenance Mode is ON):
                </label>
                <span className="text-[10px] text-amber-400 font-mono">
                  {(metrics?.is_maintenance_mode ?? isMaintenanceMode) ? '● Active on Storefront' : '○ Inactive (Website is live)'}
                </span>
              </div>
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
                  Save Maintenance Text
                </button>
              </div>
              <span className="text-[10px] text-stone-400">
                Current active maintenance text: &ldquo;{metrics?.maintenance_message || maintenanceMessage}&rdquo;
              </span>
            </div>
          </div>

          {/* Storefront Top Notice Ribbon & Announcements Manager Card (Synchronized with live header ribbon) */}
          <div className="bg-gradient-to-r from-amber-950/80 via-[#26150a] to-[#1c0f07] text-cream-50 p-6 rounded-3xl border border-amber-900/60 shadow-xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-amber-900/40 pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2.5 rounded-2xl bg-amber-500 text-stone-950 shadow-sm">
                  <Megaphone size={22} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-lg text-white">
                      Storefront Top Notice Ribbon (Public Announcements)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider font-mono">
                      {storefrontNotices.filter((n) => n.is_active).length} Active on Live Site
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">
                    Synchronized with the orange rotating ribbon at the very top of Wangs storefront. Shows offers, express delivery timelines, and special announcements.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('notices')}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Manage / Add Notices</span>
                </button>
              </div>
            </div>

            {/* Synchronized Notice List Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-200/80 block">
                  Synchronized Notice List ({storefrontNotices.length})
                </span>
                <span className="text-[10px] text-stone-400">
                  Changes save directly to database and sync live
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-amber-900/40 bg-stone-950/60">
                <table className="w-full text-left text-xs">
                  <thead className="bg-amber-950/40 text-stone-400 uppercase text-[10px] tracking-wider border-b border-amber-900/40">
                    <tr>
                      <th className="py-2.5 px-3">Order</th>
                      <th className="py-2.5 px-3">Highlight Badge</th>
                      <th className="py-2.5 px-3">Notice Announcement Text</th>
                      <th className="py-2.5 px-3">Link Destination</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-900/20 font-medium">
                    {storefrontNotices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-stone-500">
                          No storefront notices created yet. Click &ldquo;Manage / Add Notices&rdquo; to create your first notice.
                        </td>
                      </tr>
                    ) : (
                      storefrontNotices.map((notice) => (
                        <tr key={notice.id} className="hover:bg-amber-950/20 transition-colors">
                          <td className="py-3 px-3 font-mono text-stone-400">#{notice.display_order}</td>
                          <td className="py-3 px-3">
                            {notice.highlight ? (
                              <span className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase tracking-wider shadow-xs ${notice.badge_color || 'bg-emerald-600 text-white'}`}>
                                {notice.highlight}
                              </span>
                            ) : (
                              <span className="text-stone-500 italic text-[11px]">None</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-white max-w-[340px] font-sans">
                            <span className="line-clamp-2">{notice.text}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px] text-amber-200/80">
                            {notice.link || '/products'}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleNotice(notice.id)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                                notice.is_active
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                  : 'bg-stone-800 text-stone-400 border border-stone-700 hover:bg-stone-700'
                              }`}
                            >
                              {notice.is_active ? 'Active (Live)' : 'Disabled'}
                            </button>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  handleStartEditNotice(notice);
                                  setActiveTab('notices');
                                }}
                                className="p-1.5 text-stone-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                title="Edit notice"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteNotice(notice.id)}
                                className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                                title="Delete notice"
                              >
                                <Trash2 size={13} />
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div
              onClick={() => setActiveTab('users')}
              className="bg-white p-5 rounded-2xl border border-stone-200 text-xs shadow-xs hover:border-forest-800 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-stone-500 block font-medium group-hover:text-forest-900 transition-colors">Total Registered Users</span>
                <span className="p-1.5 bg-forest-50 text-forest-800 rounded-lg group-hover:bg-forest-100 transition-colors">
                  <Users size={16} />
                </span>
              </div>
              <span className="font-serif font-bold text-2xl text-stone-900 mt-1 block">
                {metrics?.total_users ?? usersList.length}
              </span>
              <span className="text-[10px] text-stone-500 mt-0.5 block">
                {metrics?.total_customers ?? usersList.filter(u => u.role === 'CUSTOMER').length} shoppers · {metrics?.authorized_sellers ?? usersList.filter(u => u.can_sell).length} sellers
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 text-xs shadow-xs">
              <span className="text-stone-500 block font-medium">Active Verified Manufacturers</span>
              <span className="font-serif font-bold text-2xl text-stone-900 mt-1 block">
                {metrics?.active_manufacturers ?? manufacturersList.filter(m => m.status === 'APPROVED').length}
              </span>
              <span className="text-[10px] text-stone-500 mt-0.5 block">Approved producer units</span>
            </div>

            <div
              onClick={() => setActiveTab('yet_to_approve')}
              className="bg-amber-50 p-5 rounded-2xl border border-amber-200 text-xs text-amber-900 shadow-xs cursor-pointer hover:border-amber-400 transition-all"
            >
              <span className="block font-medium">Pending Seller Applications</span>
              <span className="font-serif font-bold text-2xl text-amber-900 mt-1 block">
                {metrics?.pending_seller_applications ?? 0}
              </span>
              <span className="text-[10px] text-amber-700 mt-0.5 block">Awaiting admin review & action</span>
            </div>

            <div
              onClick={() => setActiveTab('products')}
              className="bg-white p-5 rounded-2xl border border-stone-200 text-xs shadow-xs cursor-pointer hover:border-stone-400 transition-all"
            >
              <span className="text-stone-500 block font-medium">Pending Product Reviews</span>
              <span className="font-serif font-bold text-2xl text-stone-900 mt-1 block">
                {metrics?.pending_products_review ?? 0}
              </span>
              <span className="text-[10px] text-stone-500 mt-0.5 block">Items submitted for moderation</span>
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

          {/* Quick Research & Analytics Study Records Card */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center flex-shrink-0">
                <FileText size={22} />
              </div>
              <div>
                <h4 className="font-serif font-bold text-sm text-stone-900">
                  Platform Research & Study Records (PDF / CSV)
                </h4>
                <p className="text-xs text-stone-500">
                  Maintained research dossiers and statistical records on Customers ({metrics?.total_users ?? usersList.length}), Artisan Sellers ({manufacturersList.length}), and Cataloged Products ({productsList.length}).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <button
                type="button"
                disabled={downloadingResearch === 'pdf'}
                onClick={() => handleDownloadResearch('pdf')}
                className="px-3.5 py-2 bg-forest-900 hover:bg-forest-950 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <FileText size={13} />
                <span>{downloadingResearch === 'pdf' ? 'Generating...' : 'Download PDF Dossier'}</span>
              </button>
              <button
                type="button"
                disabled={downloadingResearch === 'all'}
                onClick={() => handleDownloadResearch('csv', 'all')}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-all border border-stone-200 flex items-center gap-1.5 cursor-pointer active:scale-95 whitespace-nowrap"
              >
                <Download size={13} />
                <span>{downloadingResearch === 'all' ? 'Exporting...' : 'Export Full CSV'}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('research')}
                className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold transition-all border border-amber-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>Open Research Space</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Hero Promo Banners (Dynamic Mobile & Storefront Campaign Management) */}
      {activeTab === 'banners' && (
        <div className="space-y-6 text-xs">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-[#123821] text-cream-50 p-6 sm:p-7 rounded-3xl border border-forest-800 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="p-3 bg-amber-400 text-forest-950 rounded-2xl shadow-sm shrink-0">
                  <Flame size={24} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-serif font-bold text-cream-50">
                      Hero Promo Banners &amp; Storefront Showcase
                    </h2>
                    <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 font-bold text-[10px] rounded-full uppercase tracking-wider">
                      {heroBanners.length} Active / Configured
                    </span>
                  </div>
                  <p className="text-xs text-cream-200/80 mt-1 max-w-2xl">
                    Upload photos, customize headline text, coupon codes, and CTA links. Control what shoppers see on the storefront hero card in real time.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 rounded-xl bg-forest-800/80 hover:bg-forest-800 text-cream-100 border border-forest-700 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <span>Preview Storefront</span>
                  <ExternalLink size={13} />
                </a>
                <button
                  type="button"
                  onClick={handleResetBannerForm}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-forest-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>New Banner Card</span>
                </button>
              </div>
            </div>
          </div>

          {/* Form & Live Mobile Preview Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Upload & Customization Suite (7 Cols) */}
            <form
              onSubmit={handleSaveBanner}
              className="lg:col-span-7 bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-5"
            >
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-stone-100 rounded-lg text-forest-900">
                    <UploadCloud size={16} />
                  </span>
                  <div>
                    <h3 className="font-serif font-bold text-base text-stone-900">
                      {editingBannerId ? `Editing Banner #${editingBannerId}` : 'Upload & Create Hero Banner'}
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Configure visual assets, discount code, and destination link
                    </p>
                  </div>
                </div>

                {editingBannerId && (
                  <button
                    type="button"
                    onClick={handleResetBannerForm}
                    className="text-stone-500 hover:text-stone-800 text-xs font-semibold underline cursor-pointer"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>

              {/* Layout Mode Selector (Standard vs Image Only) */}
              <div className="space-y-1.5 p-3 rounded-xl bg-stone-50 border border-stone-200">
                <label className="block font-bold text-xs text-stone-800">
                  Banner Layout Mode
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBannerForm({ ...bannerForm, is_image_only: false })}
                    className={`px-3 py-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      !bannerForm.is_image_only
                        ? 'bg-forest-900 text-white border-forest-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Type size={15} />
                    <span>Standard (Text &amp; Button Overlay)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBannerForm({ ...bannerForm, is_image_only: true })}
                    className={`px-3 py-2.5 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      bannerForm.is_image_only
                        ? 'bg-forest-900 text-white border-forest-900 shadow-xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <ImageIcon size={15} />
                    <span>Image Only (Full Graphic Banner)</span>
                  </button>
                </div>
                <p className="text-[11px] text-stone-500">
                  {bannerForm.is_image_only
                    ? 'Image Only mode displays your artwork cleanly with 0 text/button overlays and no dark gradient. Tapping anywhere on the banner navigates to the destination link.'
                    : 'Standard mode overlays your headline, subtitle, badge pill, coupon code, and CTA button on top of your background photo.'}
                </p>
              </div>

              {/* Photo Upload Area */}
              <div className="space-y-2">
                <label className="block font-bold text-stone-700">
                  {bannerForm.is_image_only ? 'Banner Graphic Artwork (Required)' : 'Banner Background Photo (Optional)'}
                </label>
                <div className="border-2 border-dashed border-stone-300 hover:border-forest-600 rounded-xl p-4 bg-stone-50/60 transition-colors">
                  {bannerImagePreview ? (
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative w-36 h-20 rounded-lg overflow-hidden border border-stone-200 shrink-0 shadow-xs">
                        <img
                          src={bannerImagePreview}
                          alt="Banner preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-1.5 text-center sm:text-left">
                        <p className="font-bold text-stone-800 text-xs">Image Attached</p>
                        <p className="text-[11px] text-stone-500">
                          {bannerImageFile ? bannerImageFile.name : 'Image URL or Current Image'}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <label className="px-3 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-md font-bold text-[11px] cursor-pointer shadow-2xs">
                            Replace Photo
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/jpg"
                              onChange={handleBannerFileSelect}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setBannerImageFile(null);
                              setBannerImagePreview('');
                              setBannerForm((prev) => ({ ...prev, image_url: '' }));
                            }}
                            className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-md font-bold text-[11px] cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 cursor-pointer py-3">
                      <div className="w-10 h-10 rounded-full bg-forest-50 text-forest-800 flex items-center justify-center">
                        <UploadCloud size={20} />
                      </div>
                      <div className="text-center">
                        <span className="font-bold text-forest-900 underline">Click to select photo</span>
                        <span className="text-stone-500"> or drag and drop</span>
                        <p className="text-[10px] text-stone-400 mt-0.5">PNG, JPG, or WebP up to 10MB</p>
                      </div>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/jpg"
                        onChange={handleBannerFileSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Recommended Banner Image Size Specification Box */}
              <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <Sparkles size={14} className="text-amber-700 shrink-0" />
                  <span>Recommended Banner Image Specifications:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-amber-900 leading-normal">
                  <div>
                    <span className="font-bold text-amber-950">Optimal Resolution:</span> 1200 × 600 px (2:1 Ratio)
                  </div>
                  <div>
                    <span className="font-bold text-amber-950">Minimum Resolution:</span> 800 × 400 px
                  </div>
                  <div>
                    <span className="font-bold text-amber-950">Formats &amp; Size:</span> JPG, PNG, WebP (under 5MB)
                  </div>
                  <div>
                    <span className="font-bold text-amber-950">Image-Only Tip:</span> Keep critical design/copy inside central 90%
                  </div>
                </div>
              </div>

              {/* Or Direct Image URL input */}
              <div className="space-y-1">
                <label className="block text-stone-600 font-semibold text-[11px]">
                  Or External Image URL (e.g. Unsplash / Cloudinary / S3)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={bannerForm.image_url}
                  onChange={(e) => {
                    setBannerForm({ ...bannerForm, image_url: e.target.value });
                    if (!bannerImageFile && e.target.value) {
                      setBannerImagePreview(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-forest-800"
                />
              </div>

              {/* Conditional Form Fields Based on Mode */}
              {bannerForm.is_image_only ? (
                <>
                  {/* Image Only Mode: Reference Label & Click Destination Link */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block font-bold text-stone-700">
                        Admin Label / Title <span className="text-stone-400 font-normal">(Optional, for admin table)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Naga King Chilli Festival Graphic"
                        value={bannerForm.title}
                        onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-forest-800 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-stone-700">
                        Banner Click Destination <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. /products?category=andhra-gongura"
                        value={bannerForm.cta_link}
                        onChange={(e) => setBannerForm({ ...bannerForm, cta_link: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-forest-800 font-mono"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Standard Mode: Title, Badge, Subtitle, CTA Button & Link */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block font-bold text-stone-700">
                        Badge Pill Text <span className="text-stone-400 font-normal">(Top Tag)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. FRESH BATCH LIVE"
                        value={bannerForm.badge_text}
                        onChange={(e) => setBannerForm({ ...bannerForm, badge_text: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-forest-800 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-stone-700">
                        Promo Coupon Code <span className="text-stone-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ACHAR15"
                        value={bannerForm.coupon_code}
                        onChange={(e) => setBannerForm({ ...bannerForm, coupon_code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-forest-800 font-mono font-bold tracking-wider uppercase"
                      />
                    </div>
                  </div>

                  {/* Headline */}
                  <div className="space-y-1">
                    <label className="block font-bold text-stone-700">
                      Campaign Headline / Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. The Great Achar Season"
                      value={bannerForm.title}
                      onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-1 focus:ring-forest-800 font-serif font-bold"
                    />
                  </div>

                  {/* Subtitle */}
                  <div className="space-y-1">
                    <label className="block font-bold text-stone-700">
                      Tagline / Description
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Authentic Andhra Avakaya & Gongura small-batches straight from Guntur clay jars."
                      value={bannerForm.subtitle}
                      onChange={(e) => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                      className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-forest-800"
                    />
                  </div>

                  {/* CTA Button and Link */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block font-bold text-stone-700">CTA Button Text</label>
                      <input
                        type="text"
                        placeholder="e.g. Shop Now"
                        value={bannerForm.cta_text}
                        onChange={(e) => setBannerForm({ ...bannerForm, cta_text: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-forest-800 font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-stone-700">CTA Destination Link</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. /products?category=andhra-gongura"
                        value={bannerForm.cta_link}
                        onChange={(e) => setBannerForm({ ...bannerForm, cta_link: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-forest-800 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Background Theme / Color Picker (Clean Grid without Awkward Wrapping) */}
              <div className="space-y-2">
                <label className="block font-bold text-stone-700">
                  Background Theme Color {bannerForm.is_image_only ? '(Fallback while image loads)' : '(Used behind image or as fallback gradient)'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {[
                    { name: 'Terracotta', color: '#9b4100' },
                    { name: 'Deep Spice', color: '#78350f' },
                    { name: 'Olive Kitchen', color: '#2c402e' },
                    { name: 'Royal Crimson', color: '#85191e' },
                    { name: 'Golden Mustard', color: '#b45309' },
                    { name: 'Classic Charcoal', color: '#262626' },
                  ].map((preset) => (
                    <button
                      key={preset.color}
                      type="button"
                      onClick={() => setBannerForm({ ...bannerForm, bg_color: preset.color })}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        bannerForm.bg_color === preset.color
                          ? 'border-forest-900 ring-2 ring-forest-800/30 bg-forest-50/50 font-bold'
                          : 'border-stone-200 hover:border-stone-400 bg-white'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                        style={{ backgroundColor: preset.color }}
                      />
                      <span className="truncate">{preset.name}</span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1 text-xs text-stone-600">
                  <span className="font-medium">Custom color hex:</span>
                  <input
                    type="color"
                    value={bannerForm.bg_color || '#9b4100'}
                    onChange={(e) => setBannerForm({ ...bannerForm, bg_color: e.target.value })}
                    className="w-7 h-7 rounded-md cursor-pointer border border-stone-300 p-0.5"
                    title="Custom color picker"
                  />
                  <input
                    type="text"
                    value={bannerForm.bg_color}
                    onChange={(e) => setBannerForm({ ...bannerForm, bg_color: e.target.value })}
                    placeholder="#9B4100"
                    className="w-24 px-2.5 py-1 border border-stone-300 rounded-md text-xs font-mono uppercase focus:ring-1 focus:ring-forest-800"
                  />
                </div>
              </div>

              {/* Display Order & Active Checkbox */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="block font-bold text-stone-700">Display Order</label>
                  <input
                    type="number"
                    min="0"
                    value={bannerForm.display_order}
                    onChange={(e) => setBannerForm({ ...bannerForm, display_order: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-forest-800 font-mono"
                  />
                  <span className="text-[10px] text-stone-400">Lower numbers appear first (0, 1, 2...)</span>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_active_banner"
                    checked={bannerForm.is_active}
                    onChange={(e) => setBannerForm({ ...bannerForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-forest-800 rounded focus:ring-forest-800 border-stone-300 cursor-pointer"
                  />
                  <label htmlFor="is_active_banner" className="font-bold text-stone-800 cursor-pointer select-none">
                    Active &amp; Visible to Shoppers
                  </label>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-stone-100">
                <button
                  type="submit"
                  disabled={bannerUploading}
                  className="px-6 py-2.5 rounded-xl bg-forest-900 hover:bg-forest-800 text-cream-50 font-bold text-xs flex items-center gap-2 shadow-md disabled:opacity-50 transition-all cursor-pointer active:scale-95"
                >
                  {bannerUploading && <RefreshCw size={14} className="animate-spin" />}
                  <span>{bannerUploading ? 'Publishing...' : editingBannerId ? 'Save Changes' : 'Publish to Storefront'}</span>
                </button>

                {editingBannerId && (
                  <button
                    type="button"
                    onClick={handleResetBannerForm}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Right: Storefront Live Mobile Preview (5 Cols) */}
            <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-6">
              <div className="bg-stone-900 text-stone-100 p-4 rounded-3xl shadow-xl border border-stone-800 space-y-3">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-xs text-stone-300">Live Mobile Card Preview</span>
                  </div>
                  <span className="text-[10px] text-stone-500 font-mono">1:1 Storefront Match</span>
                </div>

                {/* Mobile Preview Frame */}
                <div className="bg-[#121212] p-3 rounded-2xl border border-stone-800">
                  {bannerForm.is_image_only ? (
                    <div
                      className="relative w-full overflow-hidden rounded-xl shadow-lg min-h-[165px] aspect-[2/1] transition-all duration-300 flex items-center justify-center cursor-pointer"
                      style={{ backgroundColor: bannerForm.bg_color || '#9b4100' }}
                    >
                      {bannerImagePreview ? (
                        <img
                          src={bannerImagePreview}
                          alt={bannerForm.title || 'Graphic Banner'}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        <div className="text-center p-4 text-white/80">
                          <ImageIcon size={32} className="mx-auto mb-2 opacity-60" />
                          <p className="text-xs font-semibold">Image Only Banner Mode</p>
                          <p className="text-[10px] text-white/60">Upload artwork or enter image URL</p>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[9px] font-bold text-white flex items-center gap-1 pointer-events-none">
                        <Eye size={10} /> Clean Artwork (No Text Overlay)
                      </div>
                      {/* Slide Indicator Dots Inside Card */}
                      <div className="absolute bottom-2.5 right-3 flex items-center gap-1 z-20 bg-black/40 backdrop-blur-xs px-2 py-1 rounded-full pointer-events-none">
                        <span className="w-3.5 h-1.5 rounded-full bg-white" />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                      </div>
                    </div>
                  ) : (
                    <div
                      className="relative w-full overflow-hidden rounded-xl shadow-lg min-h-[160px] p-4 flex flex-col justify-between text-white transition-all duration-300"
                      style={{
                        backgroundColor: bannerForm.bg_color || '#9b4100',
                        backgroundImage: bannerImagePreview
                          ? `linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.25) 100%), url(${bannerImagePreview})`
                          : 'linear-gradient(135deg, #9b4100 0%, #bb5000 50%, #7d3400 100%)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      <div className="flex flex-col gap-1 z-10">
                        {bannerForm.badge_text && (
                          <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white font-label-sm text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                            <Flame size={12} className="text-amber-300" />
                            <span>{bannerForm.badge_text}</span>
                          </span>
                        )}
                        <h2 className="font-headline-sm text-[21px] font-serif font-bold text-white leading-tight mt-0.5 drop-shadow-xs">
                          {bannerForm.title || 'Your Campaign Headline'}
                        </h2>
                        {bannerForm.subtitle && (
                          <p className="font-body-sm text-[11px] text-white/90 max-w-[250px] leading-snug line-clamp-2 drop-shadow-xs">
                            {bannerForm.subtitle}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between z-10 pt-3">
                        {bannerForm.coupon_code ? (
                          <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-xs px-2.5 py-1 rounded-lg">
                            <span className="font-label-sm text-[10px] text-amber-200">CODE:</span>
                            <span className="font-label-md text-xs font-bold text-white tracking-wider">
                              {bannerForm.coupon_code}
                            </span>
                          </div>
                        ) : <div />}

                        <div className="px-3.5 py-1.5 rounded-full bg-white text-primary font-label-md text-xs font-bold shadow-sm flex items-center gap-1 pointer-events-none">
                          <span>{bannerForm.cta_text || 'Shop Now'}</span>
                          <ArrowRight size={13} />
                        </div>
                      </div>

                      {/* Indicator Dots */}
                      <div className="absolute bottom-2.5 right-24 flex items-center gap-1 z-20">
                        <span className="w-3.5 h-1.5 rounded-full bg-white" />
                        <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[11px] text-stone-400 space-y-1">
                  <p className="flex items-center gap-1 text-emerald-400 font-bold">
                    <Sparkles size={13} />
                    <span>Instant Real-Time Preview</span>
                  </p>
                  <p className="text-[10px] text-stone-500 leading-tight">
                    Any change to the headline, coupon, or image will render on the mobile storefront immediately upon saving.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Banner Library Table */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Storefront Banner Campaigns ({heroBanners.length})
                </h3>
                <p className="text-[11px] text-stone-500">
                  Manage active slides, adjust order, or toggle visibility
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Banner / Visual</th>
                    <th className="py-3 px-4">Campaign Headline &amp; Subtitle</th>
                    <th className="py-3 px-4">Badge &amp; Coupon</th>
                    <th className="py-3 px-4">Target CTA</th>
                    <th className="py-3 px-4 text-center">Order</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-medium">
                  {heroBanners.map((b) => {
                    const imgUrl = b.effective_image_url || b.image_url || b.image;
                    return (
                      <tr key={b.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="w-20 h-12 rounded-lg overflow-hidden border border-stone-200 shadow-2xs relative shrink-0">
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={b.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div
                                className="w-full h-full flex items-center justify-center text-white font-bold text-[10px]"
                                style={{ backgroundColor: b.bg_color || '#9b4100' }}
                              >
                                {b.bg_color || 'Theme'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="max-w-xs">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-stone-900 font-serif text-sm">{b.title || 'Graphic Promo Banner'}</p>
                              {b.is_image_only && (
                                <span className="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[9px] font-bold uppercase tracking-wider shrink-0">
                                  Image Only
                                </span>
                              )}
                            </div>
                            <p className="text-stone-500 text-[11px] truncate">
                              {b.is_image_only ? 'Full graphic artwork banner (no text overlay)' : (b.subtitle || '—')}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="space-y-1">
                            {b.badge_text && (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold text-[10px]">
                                {b.badge_text}
                              </span>
                            )}
                            {b.coupon_code && (
                              <span className="inline-block ml-1 px-2 py-0.5 rounded bg-stone-100 font-mono font-bold text-stone-800 text-[10px]">
                                {b.coupon_code}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div>
                            <span className="font-bold text-stone-800">{b.cta_text || 'Shop Now'}</span>
                            <p className="text-[10px] text-stone-400 font-mono truncate max-w-[140px]">{b.cta_link}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-stone-700">
                          {b.display_order ?? 0}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleBannerActive(b.id)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              b.is_active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                            }`}
                          >
                            {b.is_active ? '● Active' : '○ Hidden'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleBannerActive(b.id)}
                              className="p-1.5 hover:bg-stone-100 text-stone-600 hover:text-stone-900 rounded-md transition-colors cursor-pointer"
                              title={b.is_active ? 'Hide from storefront' : 'Show on storefront'}
                            >
                              {b.is_active ? <Eye size={15} /> : <EyeOff size={15} />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditBanner(b)}
                              className="p-1.5 hover:bg-stone-100 text-forest-800 hover:text-forest-950 rounded-md transition-colors cursor-pointer"
                              title="Edit banner"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBanner(b.id)}
                              className="p-1.5 hover:bg-red-50 text-red-600 hover:text-red-800 rounded-md transition-colors cursor-pointer"
                              title="Delete banner"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {heroBanners.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-stone-400">
                        No hero banners found. Create your first banner using the form above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Storefront Product Categories (Navbar Pills & Filters Management) */}
      {activeTab === 'categories' && (
        <div className="space-y-6 text-xs">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-[#123821] text-cream-50 p-6 sm:p-7 rounded-3xl border border-forest-800 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="p-3 bg-amber-400 text-forest-950 rounded-2xl shadow-sm shrink-0">
                  <Tags size={24} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-serif font-bold text-cream-50">
                      Product Categories &amp; Navbar Pills
                    </h2>
                    <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 font-bold text-[10px] rounded-full uppercase tracking-wider">
                      {categoriesList.length} Categories Configured
                    </span>
                  </div>
                  <p className="text-xs text-cream-200/80 mt-1 max-w-2xl">
                    Create, edit, reorder, or toggle product categories. The categories entered here immediately become the horizontal navigation filter pills in the top navbar and catalog for shoppers.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-white/10 text-white font-mono text-[11px] border border-white/20">
                  Real-Time Storefront Sync
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Create/Edit Category Form (5 Cols) */}
            <form
              onSubmit={handleSaveCategory}
              className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-forest-50 text-forest-900 flex items-center justify-center font-bold">
                    <Tags size={16} />
                  </span>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-stone-900">
                      {editingCategoryId ? `Edit Category #${editingCategoryId}` : 'Enter New Category'}
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Controls the top navigation pill and catalog filter
                    </p>
                  </div>
                </div>

                {editingCategoryId && (
                  <button
                    type="button"
                    onClick={handleResetCategoryForm}
                    className="text-stone-500 hover:text-stone-800 text-xs font-semibold underline cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {/* Category Name */}
              <div className="space-y-1">
                <label className="block font-bold text-stone-700">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Smoked Meat Pickle, Pork Pickle, Axone"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-forest-800"
                />
                <span className="text-[10px] text-stone-400">This exact text is displayed on the navbar filter pill.</span>
              </div>

              {/* Custom Slug (Optional) */}
              <div className="space-y-1">
                <label className="block font-bold text-stone-700">
                  URL Slug <span className="text-stone-400 font-normal">(Optional, auto-generated if blank)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. smoked-meat-pickle"
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-forest-800"
                />
                <span className="text-[10px] text-stone-400">Links to: /products?category={categoryForm.slug || 'category-name'}</span>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block font-bold text-stone-700">
                  Description <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Authentic hardwood-smoked meat cured in local Naga spices and mustard oil."
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-forest-800"
                />
              </div>

              {/* Display Order & Active Checkbox */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="block font-bold text-stone-700">Display Order</label>
                  <input
                    type="number"
                    min="0"
                    value={categoryForm.display_order}
                    onChange={(e) => setCategoryForm({ ...categoryForm, display_order: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-forest-800 font-mono"
                  />
                  <span className="text-[10px] text-stone-400">Lower order appears first (0, 1, 2...)</span>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="is_active_category"
                    checked={categoryForm.is_active}
                    onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-forest-800 rounded focus:ring-forest-800 border-stone-300 cursor-pointer"
                  />
                  <label htmlFor="is_active_category" className="font-bold text-stone-800 cursor-pointer select-none">
                    Active &amp; Visible on Navbar
                  </label>
                </div>
              </div>

              {/* Live Preview Pill */}
              <div className="bg-[#fff8f4] border border-[#dec0b3]/50 rounded-xl p-3 space-y-1.5">
                <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Navbar Pill Live Preview:</span>
                <div className="flex items-center gap-2">
                  <span className="h-7 px-3 rounded-full text-[11px] font-bold bg-[#9b4100] text-white flex items-center shadow-xs">
                    All Pickles
                  </span>
                  <span className="h-7 px-3 rounded-full text-[11px] font-semibold bg-[#f4ece7] text-[#574238] border border-[#dec0b3]/40 flex items-center shadow-xs">
                    {categoryForm.name || 'Your Category Name'}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-2 border-t border-stone-100">
                <button
                  type="submit"
                  disabled={categorySaving}
                  className="px-5 py-2.5 rounded-xl bg-forest-900 hover:bg-forest-950 text-white font-bold text-xs cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2 active:scale-95 transition-all"
                >
                  {categorySaving && <RefreshCw size={14} className="animate-spin" />}
                  <span>{categorySaving ? 'Saving...' : editingCategoryId ? 'Save Changes' : 'Add Category to Navbar'}</span>
                </button>

                {editingCategoryId && (
                  <button
                    type="button"
                    onClick={handleResetCategoryForm}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Right: Category Library Table (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden space-y-0">
              <div className="p-4 sm:p-5 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Configured Categories ({categoriesList.length})
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    These items form the top navigation pills for shoppers
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Pill / Category Name</th>
                      <th className="py-3 px-4">URL Slug</th>
                      <th className="py-3 px-4 text-center">Live Products</th>
                      <th className="py-3 px-4 text-center">Order</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-medium">
                    {categoriesList.map((cat) => (
                      <tr key={cat.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="h-6 px-2.5 rounded-full text-[10px] font-bold bg-[#f4ece7] text-[#574238] border border-[#dec0b3]/50 flex items-center shrink-0">
                              {cat.name}
                            </span>
                            {cat.description && (
                              <span className="text-[10px] text-stone-400 truncate max-w-[150px]" title={cat.description}>
                                {cat.description}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-stone-600">
                          <span className="bg-stone-100 px-1.5 py-0.5 rounded text-[11px]">
                            {cat.slug}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-stone-700">
                          {cat.product_count ?? 0}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-stone-700">
                          {cat.display_order ?? 0}
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleCategoryActive(cat.id)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              cat.is_active
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
                            }`}
                          >
                            {cat.is_active ? '● Active' : '○ Hidden'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditCategory(cat)}
                              className="p-1.5 hover:bg-stone-100 rounded-lg text-stone-600 hover:text-stone-900 cursor-pointer"
                              title="Edit Category"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="p-1.5 hover:bg-red-50 text-red-600 hover:text-red-800 rounded-lg transition-colors cursor-pointer"
                              title="Delete Category"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {categoriesList.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-stone-400">
                          No categories configured yet. Add your first category using the form on the left.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Storefront Top Notice Ribbon & Broadcast Announcements (Synchronized Header Ribbon) */}
      {activeTab === 'notices' && (
        <div className="space-y-6 text-xs">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-[#26150a] via-[#3d1a08] to-[#26150a] text-cream-50 p-6 sm:p-7 rounded-3xl border border-amber-900/60 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="p-3 bg-amber-400 text-stone-950 rounded-2xl shadow-sm shrink-0">
                  <Megaphone size={26} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-serif font-bold text-cream-50">
                      Storefront Top Notice Ribbon &amp; Live Announcements
                    </h2>
                    <span className="px-2 py-0.5 bg-amber-400/20 text-amber-300 font-bold text-[10px] rounded-full uppercase tracking-wider font-mono">
                      {storefrontNotices.filter((n) => n.is_active).length} Active Live on Website
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 mt-1 max-w-2xl">
                    Manage the rotating promotional announcement messages and delivery notices in the header ribbon at the very top of Wangs website. Synchronized live in real-time across desktop and mobile storefronts.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] border border-emerald-500/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Real-Time Storefront Sync Active</span>
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Create / Edit Notice Form (5 Cols) */}
            <form
              onSubmit={handleSaveNotice}
              className="lg:col-span-5 bg-white p-5 sm:p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
                    <Megaphone size={16} />
                  </span>
                  <div>
                    <h3 className="font-serif font-bold text-sm text-stone-900">
                      {editingNoticeId ? `Edit Notice #${editingNoticeId}` : 'Add New Notice to Ribbon'}
                    </h3>
                    <p className="text-[11px] text-stone-500">
                      Controls text, highlight badge, and click link
                    </p>
                  </div>
                </div>

                {editingNoticeId && (
                  <button
                    type="button"
                    onClick={handleResetNoticeForm}
                    className="text-stone-500 hover:text-stone-800 text-xs font-semibold underline cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {/* Announcement Message Text */}
              <div className="space-y-1">
                <label className="block font-bold text-stone-700">
                  Notice Announcement Text <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Orders above ₹699 receive a Free Handcrafted Neem Wood Tasting Spoon!"
                  value={noticeForm.text}
                  onChange={(e) => setNoticeForm({ ...noticeForm, text: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-amber-800 font-sans"
                />
                <span className="text-[10px] text-stone-400">
                  Main text message displayed in the top ribbon ticker.
                </span>
              </div>

              {/* Highlight Tag / Badge */}
              <div className="space-y-1">
                <label className="block font-bold text-stone-700">
                  Highlight Badge Tag <span className="text-stone-400 font-normal">(Optional, e.g. Free Gift, 100% Free, Express Local)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Free Gift, 100% Free, High Demand, Flash Batch"
                  value={noticeForm.highlight}
                  onChange={(e) => setNoticeForm({ ...noticeForm, highlight: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-amber-800"
                />
              </div>

              {/* Badge Color Style Picker */}
              <div className="space-y-1">
                <label className="block font-bold text-stone-700">
                  Badge Color Style Preset
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Emerald Green', class: 'bg-emerald-600 text-white' },
                    { label: 'Amber Gold', class: 'bg-amber-400 text-stone-900 font-bold' },
                    { label: 'Warm Honey', class: 'bg-amber-300 text-stone-900 font-bold' },
                    { label: 'Crimson Red', class: 'bg-red-600 text-white' },
                    { label: 'Frosted Border', class: 'bg-white/20 text-white border border-white/30' },
                  ].map((style) => (
                    <button
                      key={style.label}
                      type="button"
                      onClick={() => setNoticeForm({ ...noticeForm, badge_color: style.class })}
                      className={`p-2 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                        noticeForm.badge_color === style.class
                          ? 'border-amber-600 bg-amber-50/60 ring-1 ring-amber-600'
                          : 'border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      <span className="text-[11px] font-medium text-stone-700">{style.label}</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-mono shadow-2xs ${style.class}`}>
                        Tag
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination URL */}
              <div className="space-y-1">
                <label className="block font-bold text-stone-700">
                  Click Destination Link <span className="text-stone-400 font-normal">(Where users go when tapping notice)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. /products, /delivery, /products?bestsellers=true, /brands"
                  value={noticeForm.link}
                  onChange={(e) => setNoticeForm({ ...noticeForm, link: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-amber-800"
                />
              </div>

              {/* Display Order & Active Checkbox */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="block font-bold text-stone-700">
                    Rotation Sequence
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={noticeForm.display_order}
                    onChange={(e) => setNoticeForm({ ...noticeForm, display_order: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg text-xs font-bold focus:ring-1 focus:ring-amber-800"
                  />
                  <span className="text-[10px] text-stone-400">Lower numbers rotate first</span>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-stone-700">
                    Storefront Visibility
                  </label>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={noticeForm.is_active}
                      onChange={(e) => setNoticeForm({ ...noticeForm, is_active: e.target.checked })}
                      className="w-4 h-4 text-amber-600 rounded border-stone-300 focus:ring-amber-500"
                    />
                    <span className="text-xs font-semibold text-stone-800">
                      Active (Show Live)
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-2">
                <button
                  type="submit"
                  disabled={noticeSaving}
                  className="flex-1 py-2.5 px-4 bg-[#9b4100] hover:bg-[#803500] text-white font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Megaphone size={14} />
                  <span>
                    {noticeSaving
                      ? 'Saving...'
                      : editingNoticeId
                      ? 'Update Storefront Notice'
                      : 'Publish to Storefront Ribbon'}
                  </span>
                </button>
                {editingNoticeId && (
                  <button
                    type="button"
                    onClick={handleResetNoticeForm}
                    className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Right: Live Preview & Synchronized Notice List (7 Cols) */}
            <div className="lg:col-span-7 space-y-5">
              {/* Live Ribbon Preview */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye size={14} className="text-amber-700" />
                    <span>Live Storefront Header Ribbon Preview</span>
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    Matches actual customer view
                  </span>
                </div>

                {/* Render Mockup Ribbon */}
                <div className="bg-gradient-to-r from-[#863700] via-[#9b4100] to-[#863700] text-white border-b border-[#bf550d] text-[11px] font-medium py-2 px-3 rounded-xl shadow-inner flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                    {noticeForm.highlight && (
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${noticeForm.badge_color || 'bg-emerald-600 text-white'}`}>
                        {noticeForm.highlight}
                      </span>
                    )}
                    <span className="truncate">
                      {noticeForm.text || 'Orders above ₹699 receive a Free Handcrafted Neem Wood Tasting Spoon!'}
                    </span>
                  </div>
                  <div className="hidden sm:flex items-center gap-3 text-[#ffdbcb] shrink-0 text-[10px] opacity-80 pl-2">
                    <span>FSSAI Certified</span>
                    <span>|</span>
                    <span>100% Sun-Matured</span>
                  </div>
                </div>
              </div>

              {/* Synchronized Notice List Table */}
              <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-sm text-stone-900">
                      Synchronized Notice List ({storefrontNotices.length})
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {storefrontNotices.filter((n) => n.is_active).length} Active Live
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono">
                    Saved in Wangs database
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider border-b border-stone-200">
                      <tr>
                        <th className="py-2.5 px-3">Seq</th>
                        <th className="py-2.5 px-3">Badge</th>
                        <th className="py-2.5 px-3">Notice Message</th>
                        <th className="py-2.5 px-3">Link</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-medium">
                      {storefrontNotices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-stone-400">
                            No storefront notices found. Use the form to publish your first announcement.
                          </td>
                        </tr>
                      ) : (
                        storefrontNotices.map((notice) => (
                          <tr key={notice.id} className="hover:bg-amber-50/40 transition-colors">
                            <td className="py-3 px-3 font-mono text-stone-500">#{notice.display_order}</td>
                            <td className="py-3 px-3">
                              {notice.highlight ? (
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shadow-2xs ${notice.badge_color || 'bg-emerald-600 text-white'}`}>
                                  {notice.highlight}
                                </span>
                              ) : (
                                <span className="text-stone-400 italic text-[10px]">None</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-stone-900 max-w-[240px] font-sans">
                              <span className="line-clamp-2">{notice.text}</span>
                            </td>
                            <td className="py-3 px-3 font-mono text-[10.5px] text-stone-500 max-w-[120px] truncate">
                              {notice.link || '/products'}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleNotice(notice.id)}
                                className={`px-2.5 py-1 rounded-full text-[9.5px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                                  notice.is_active
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                    : 'bg-stone-100 text-stone-500 border border-stone-200 hover:bg-stone-200'
                                }`}
                              >
                                {notice.is_active ? 'Active' : 'Disabled'}
                              </button>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditNotice(notice)}
                                  className="p-1.5 text-stone-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                                  title="Edit notice"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteNotice(notice.id)}
                                  className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete notice"
                                >
                                  <Trash2 size={13} />
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
          </div>
        </div>
      )}

      {/* Dedicated Tab: Yet to be Approved (Inbound Seller Applications & Compliance Profiles) */}
      {activeTab === 'yet_to_approve' && (
        <div className="space-y-6 text-xs">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-[#123821] text-cream-50 p-6 sm:p-7 rounded-3xl border border-forest-800 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <span className="p-3 bg-amber-400 text-forest-950 rounded-2xl shadow-sm shrink-0">
                  <Store size={26} />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-serif font-bold text-xl text-white">
                      Yet to be Approved · Inbound Seller Applications
                    </h2>
                    {pendingSellerRequests.length > 0 && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold animate-pulse">
                        {pendingSellerRequests.length} Awaiting Review
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-forest-200 mt-1 max-w-2xl leading-relaxed">
                    Review and authorize prospective artisanal food producers who submitted the "Sell with Us on Wangs" application form.
                    Approving grants immediate seller access and automatically dispatches an onboarding email with direct web links to the Seller Portal (<code className="text-amber-300">wangs.in/manufacturer</code>).
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {pendingSellerRequests.length > 0 && (
                  <button
                    type="button"
                    disabled={batchApproving}
                    onClick={handleApproveAllPending}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-forest-950 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle size={14} className={batchApproving ? 'animate-spin' : ''} />
                    <span>{batchApproving ? 'Approving All...' : `Approve All (${pendingSellerRequests.length})`}</span>
                  </button>
                )}
                <button
                  onClick={loadAdminData}
                  className="px-3.5 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-xl font-bold flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                >
                  <RefreshCw size={13} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics (Clickable Filters) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-forest-800/80">
              <button
                type="button"
                onClick={() => setPendingTabFilter('PENDING')}
                className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer ${
                  pendingTabFilter === 'PENDING'
                    ? 'bg-amber-500/25 border-2 border-amber-400 ring-2 ring-amber-400/30'
                    : 'bg-forest-900/80 border border-forest-800 hover:bg-forest-800/60'
                }`}
              >
                <span className="text-[11px] text-amber-300 block font-semibold">Awaiting Authorization</span>
                <span className="text-2xl font-bold text-white mt-0.5 block">{pendingSellerRequests.length}</span>
                <span className="text-[10px] text-forest-300">Immediate action needed</span>
              </button>

              <button
                type="button"
                onClick={() => setPendingTabFilter('AUTHORIZED')}
                className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer ${
                  pendingTabFilter === 'AUTHORIZED'
                    ? 'bg-emerald-500/25 border-2 border-emerald-400 ring-2 ring-emerald-400/30'
                    : 'bg-forest-900/80 border border-forest-800 hover:bg-forest-800/60'
                }`}
              >
                <span className="text-[11px] text-emerald-300 block font-semibold">Authorized & Invited</span>
                <span className="text-2xl font-bold text-white mt-0.5 block">{authorizedSellerRequests.length}</span>
                <span className="text-[10px] text-forest-300">Seller portal links sent</span>
              </button>

              <button
                type="button"
                onClick={() => setPendingTabFilter('PROFILES')}
                className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer ${
                  pendingTabFilter === 'PROFILES'
                    ? 'bg-amber-500/25 border-2 border-amber-400 ring-2 ring-amber-400/30'
                    : 'bg-forest-900/80 border border-forest-800 hover:bg-forest-800/60'
                }`}
              >
                <span className="text-[11px] text-cream-300 block font-semibold">Pending Profiles</span>
                <span className="text-2xl font-bold text-white mt-0.5 block">{pendingMfgProfiles.length}</span>
                <span className="text-[10px] text-forest-300">FSSAI compliance review</span>
              </button>

              <button
                type="button"
                onClick={() => setPendingTabFilter('ALL')}
                className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer ${
                  pendingTabFilter === 'ALL'
                    ? 'bg-cream-100/25 border-2 border-cream-200 ring-2 ring-cream-200/30'
                    : 'bg-forest-900/80 border border-forest-800 hover:bg-forest-800/60'
                }`}
              >
                <span className="text-[11px] text-cream-300 block font-semibold">Total Requests Logged</span>
                <span className="text-2xl font-bold text-white mt-0.5 block">{sellerRequestsList.length}</span>
                <span className="text-[10px] text-forest-300">Lifetime queue</span>
              </button>
            </div>
          </div>

          {/* Sub-Filters and Search */}
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:max-w-md">
              <input
                type="text"
                value={pendingSearch}
                onChange={(e) => setPendingSearch(e.target.value)}
                placeholder="Search business name, email, phone, district, FSSAI..."
                className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-forest-800 font-medium"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-stone-400" />
              {pendingSearch && (
                <button
                  type="button"
                  onClick={() => setPendingSearch('')}
                  className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-xl w-full md:w-auto">
              {[
                { id: 'PENDING', label: `Pending Review (${pendingSellerRequests.length})`, isAlert: pendingSellerRequests.length > 0 },
                { id: 'ALL', label: `All Requests (${sellerRequestsList.length})` },
                { id: 'AUTHORIZED', label: `Authorized (${authorizedSellerRequests.length})` },
                ...(pendingMfgProfiles.length > 0 ? [{ id: 'PROFILES', label: `Pending Profiles (${pendingMfgProfiles.length})`, isAlert: true }] : [])
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setPendingTabFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    pendingTabFilter === f.id
                      ? f.isAlert
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-forest-900 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span>{f.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Table of Inbound Applications */}
          {pendingTabFilter !== 'PROFILES' && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-2 bg-stone-50/60">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-forest-800" />
                  <h3 className="font-serif font-bold text-sm text-stone-900">
                    Inbound Seller Authorization Applications
                  </h3>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-stone-200 text-stone-700">
                    {filteredPendingRequests.length}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="text-amber-800 font-bold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                    <span>{filteredPendingRequests.filter((r) => !r.is_authorized).length} action pending</span>
                  </span>
                </div>
              </div>

              {filteredPendingRequests.length === 0 ? (
                <div className="py-16 text-center text-stone-500 space-y-2">
                  <CheckCircle2 size={38} className="text-emerald-600 mx-auto" />
                  <p className="font-serif font-bold text-sm text-stone-800">No requests matching this view</p>
                  <p className="text-xs text-stone-400">All inbound seller authorization requests have been processed.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-stone-50/90 border-b border-stone-200 text-stone-600 uppercase text-[10px] tracking-wider font-bold">
                      <tr>
                        <th className="py-3 px-4 min-w-[180px]">Business & Brand</th>
                        <th className="py-3 px-4 min-w-[210px]">Applicant Contact</th>
                        <th className="py-3 px-4 min-w-[180px] max-w-[260px]">Artisan Pitch</th>
                        <th className="py-3 px-4 min-w-[120px]">Submitted</th>
                        <th className="py-3 px-4 min-w-[130px]">Status</th>
                        <th className="py-3 px-4 min-w-[180px] text-right sticky right-0 bg-stone-50 shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] z-10">
                          Admin Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredPendingRequests.map((req) => (
                        <tr
                          key={req.id}
                          className={`hover:bg-cream-50/60 transition-colors group ${
                            !req.is_authorized ? 'bg-amber-50/25' : ''
                          }`}
                        >
                          {/* Column 1: Business & Brand */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-start gap-2.5">
                              <span className="w-8 h-8 rounded-xl bg-amber-100/80 border border-amber-200 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 font-serif font-bold text-xs shadow-2xs">
                                <Store size={15} className="text-amber-700" />
                              </span>
                              <div className="space-y-1">
                                <span className="font-bold text-stone-900 text-xs block group-hover:text-forest-900 transition-colors">
                                  {req.business_name || 'Artisan Producer'}
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                  <span className="font-mono text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200/60">
                                    #{req.id}
                                  </span>
                                  {req.location_district && (
                                    <span className="text-stone-600 flex items-center gap-0.5 bg-stone-100/70 px-1.5 py-0.5 rounded border border-stone-200/50">
                                      <MapPin size={9} className="text-stone-400" />
                                      <span>{req.location_district}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Column 2: Contact & Credentials */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs text-forest-950 font-bold select-all truncate max-w-[180px]">
                                  {req.email}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopyText(req.email, 'Email')}
                                  className="text-stone-400 hover:text-forest-800 p-0.5 transition-colors cursor-pointer"
                                  title="Copy email address"
                                >
                                  {copiedText === req.email ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                                </button>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                {req.phone ? (
                                  <span className="text-stone-500 font-mono text-[10px]">
                                    {req.phone}
                                  </span>
                                ) : (
                                  <span className="text-stone-400 text-[10px] italic">No phone</span>
                                )}
                                {req.fssai_number && (
                                  <span
                                    className="font-mono text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1"
                                    title="FSSAI License"
                                  >
                                    <Shield size={9} className="text-emerald-600" />
                                    <span>{req.fssai_number}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Column 3: Artisan Pitch / Message (No more overflow with break-all) */}
                          <td className="py-3.5 px-4 max-w-[260px]">
                            <p
                              className="text-[11px] text-stone-600 line-clamp-2 break-all break-words cursor-pointer hover:text-stone-900 transition-colors leading-relaxed"
                              onClick={() => setInspectingRequest(req)}
                              title="Click to read full application message"
                            >
                              {req.message || <span className="text-stone-400 italic">No additional pitch note provided.</span>}
                            </p>
                            {req.message && req.message.length > 40 && (
                              <button
                                type="button"
                                onClick={() => setInspectingRequest(req)}
                                className="text-[10px] font-bold text-forest-800 hover:underline mt-0.5 cursor-pointer block"
                              >
                                View full pitch →
                              </button>
                            )}
                          </td>

                          {/* Column 4: Submitted */}
                          <td className="py-3.5 px-4 text-stone-500 text-[11px] whitespace-nowrap">
                            <span className="font-medium text-stone-700 block">
                              {req.created_at ? new Date(req.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                            </span>
                            <span className="text-[10px] text-stone-400 font-mono block">
                              {req.created_at ? new Date(req.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </td>

                          {/* Column 5: Status */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {req.is_authorized ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 shadow-2xs">
                                <CheckCircle size={12} className="text-emerald-600" />
                                <span>Authorized & Invited</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-300/80 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                <span>Yet to be Approved</span>
                              </span>
                            )}
                          </td>

                          {/* Column 6: Admin Actions (STICKY RIGHT - NEVER CUT OFF) */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap sticky right-0 bg-white shadow-[-6px_0_10px_-4px_rgba(0,0,0,0.06)] z-10 group-hover:bg-cream-50 transition-colors">
                            <div className="flex items-center justify-end gap-1.5">
                              {!req.is_authorized ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={approvingEmail === req.email}
                                    onClick={() => handleApproveSellerRequest(req.email)}
                                    className="px-3 py-1.5 rounded-xl bg-forest-900 hover:bg-forest-950 text-white font-bold text-xs shadow-xs hover:scale-102 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                                    title={`Approve ${req.business_name} and send onboarding email`}
                                  >
                                    <CheckCircle size={13} className={approvingEmail === req.email ? 'animate-spin text-emerald-400' : 'text-emerald-400'} />
                                    <span>{approvingEmail === req.email ? 'Sending...' : 'Approve & Send Email'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setInspectingRequest(req)}
                                    className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
                                    title="Inspect full application"
                                  >
                                    <Eye size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSellerRequest(req.id, req.business_name, req.email)}
                                    className="p-1.5 rounded-xl bg-stone-100 hover:bg-red-50 text-stone-400 hover:text-red-700 border border-stone-200 hover:border-red-200 transition-colors cursor-pointer"
                                    title="Dismiss / remove application from queue"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={approvingEmail === req.email}
                                    onClick={() => handleApproveSellerRequest(req.email)}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Resend seller portal onboarding email"
                                  >
                                    <RefreshCw size={11} className={approvingEmail === req.email ? 'animate-spin' : ''} />
                                    <span>Resend Email</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setInspectingRequest(req)}
                                    className="p-1 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                                    title="Inspect application"
                                  >
                                    <Eye size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSellerRequest(req.id, req.business_name, req.email)}
                                    className="p-1 text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                                    title="Delete from list"
                                  >
                                    <X size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Pending Manufacturer Profiles (If Any) */}
          {(pendingTabFilter === 'ALL' || pendingTabFilter === 'PROFILES') && pendingMfgProfiles.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden mt-6">
              <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-amber-50/50">
                <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
                  <Store size={16} className="text-amber-600" />
                  <span>Pending Manufacturer Profile Registrations ({pendingMfgProfiles.length})</span>
                </h3>
                <span className="text-[11px] text-amber-800 font-bold">Awaiting Compliance Review</span>
              </div>
              <div className="divide-y divide-stone-100">
                {pendingMfgProfiles.map((m) => (
                  <div key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">{m.business_name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">Profile Pending</span>
                      </div>
                      <p className="text-xs text-stone-500">
                        {m.contact_email} · {m.contact_phone} · {m.location_district}
                      </p>
                      {m.fssai_license_number && (
                        <p className="text-[11px] text-stone-600 font-mono">FSSAI: {m.fssai_license_number}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveManufacturer(m.id, 'APPROVED')}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                      >
                        Approve Manufacturer Profile
                      </button>
                      <button
                        onClick={() => handleApproveManufacturer(m.id, 'REJECTED')}
                        className="px-3 py-2 bg-stone-100 hover:bg-red-50 text-stone-600 hover:text-red-700 font-bold text-xs rounded-xl border border-stone-200 cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Users & Customers Intelligence */}
      {activeTab === 'users' && (
        <div className="space-y-6 text-xs">
          {/* User Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs mb-1">
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-stone-500 block">Total Registered Accounts</span>
              <span className="text-xl font-bold text-stone-900 mt-0.5 block">{usersList.length || (metrics?.total_users ?? 0)}</span>
              <span className="text-[10px] text-stone-500">Shoppers, sellers & staff</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
              <span className="text-stone-500 block">Verified Shoppers</span>
              <span className="text-xl font-bold text-stone-900 mt-0.5 block">
                {usersList.length > 0 ? usersList.filter((u) => u.role === 'CUSTOMER').length : (metrics?.total_customers ?? 0)}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">Active customer profiles</span>
            </div>
            <div className="bg-forest-900 text-white p-4 rounded-xl border border-forest-800 shadow-xs">
              <span className="text-cream-300 block">Authorized Sellers</span>
              <span className="text-xl font-bold text-white mt-0.5 block">
                {usersList.length > 0 ? usersList.filter((u) => u.can_sell || u.role === 'MANUFACTURER').length : (metrics?.authorized_sellers ?? 0)}
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
                {[
                  { role: 'ALL', label: `All Roles (${usersList.length})` },
                  { role: 'CUSTOMER', label: `Shoppers (${usersList.filter((u) => u.role === 'CUSTOMER').length})` },
                  { role: 'MANUFACTURER', label: `Sellers (${usersList.filter((u) => u.role === 'MANUFACTURER' || u.can_sell).length})` },
                  { role: 'ADMIN', label: `Admin (${usersList.filter((u) => u.role === 'ADMIN' || u.is_staff).length})` }
                ].map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setUserRoleFilter(item.role)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      userRoleFilter === item.role
                        ? 'bg-forest-900 text-white shadow-2xs font-bold'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                {[
                  { id: 'ALL', label: `All Status (${usersList.length})` },
                  { id: 'ACTIVE', label: `Active (${usersList.filter((u) => !u.is_banned).length})` },
                  { id: 'BANNED', label: `Banned (${usersList.filter((u) => u.is_banned).length})` }
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

              {(userRoleFilter !== 'ALL' || userStatusFilter !== 'ALL' || userSearch) && (
                <button
                  type="button"
                  onClick={() => {
                    setUserRoleFilter('ALL');
                    setUserStatusFilter('ALL');
                    setUserSearch('');
                  }}
                  className="px-2.5 py-1 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
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
                  <th className="p-3 text-right">Actions</th>
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
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-stone-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Users size={28} className="text-stone-300" />
                          <p className="font-semibold text-stone-700">No user accounts found matching current filters.</p>
                          <p className="text-xs text-stone-400">
                            {userRoleFilter !== 'ALL' || userStatusFilter !== 'ALL' || userSearch
                              ? 'Try resetting your role or status filter to view all users.'
                              : 'No users currently registered on the platform.'}
                          </p>
                          {(userRoleFilter !== 'ALL' || userStatusFilter !== 'ALL' || userSearch) && (
                            <button
                              type="button"
                              onClick={() => {
                                setUserRoleFilter('ALL');
                                setUserStatusFilter('ALL');
                                setUserSearch('');
                              }}
                              className="mt-1 px-3 py-1.5 bg-forest-900 hover:bg-forest-950 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            >
                              View All Users
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    usersList
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
                            {u.can_sell || u.is_authorized_to_sell ? 'Authorized Seller' : 'Customer Only'}
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
                      <td className="p-3 text-right whitespace-nowrap">
                        {u.id === user?.id ? (
                          <span className="text-[10px] text-stone-400 font-medium italic">Current Admin</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-600 text-red-700 hover:text-white font-bold text-[11px] border border-red-200 transition-all cursor-pointer shadow-2xs group"
                            title={`Delete user account ${u.username}`}
                          >
                            <Trash2 size={12} className="group-hover:scale-110 transition-transform" />
                            <span>Delete</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
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
                        <p className="text-[11px] text-stone-700 italic bg-stone-50 p-2 rounded-lg border border-stone-200/60 max-w-xl break-all break-words">
                          "{req.message}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {req.is_authorized ? (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold">
                          Authorized
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
          {/* Direct Alert to Inbound Seller Requests */}
          {totalYetToApprove > 0 && (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs animate-pulse">
                  <Clock size={20} />
                </span>
                <div>
                  <h4 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
                    <span>{totalYetToApprove} Inbound Seller Request(s) Awaiting Authorization</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold">Pending Review</span>
                  </h4>
                  <p className="text-xs text-stone-600 mt-0.5">
                    Producers who submitted "Sell with Us on Wangs" onboarding applications are waiting for administrator review.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('yet_to_approve')}
                className="px-4 py-2 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl text-xs transition-colors shrink-0 shadow-xs flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95"
              >
                <span>Open "Yet to be Approved" Space ({totalYetToApprove})</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}

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
              <button
                type="button"
                onClick={() => setActiveTab('yet_to_approve')}
                className="px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-2xs hover:scale-105 active:scale-95"
              >
                <span>Inbound Requests ({totalYetToApprove})</span>
                <ArrowRight size={11} />
              </button>
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
                          <Edit3 size={11} className="text-amber-600 group-hover:scale-110 transition-transform" />
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
                  <th className="p-3">Deal of Day</th>
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
                      <button
                        onClick={() => handleToggleDealOfTheDay(p.id)}
                        title={p.is_deal_of_the_day ? "Active Deal of the Day (Click to toggle)" : "Promote as Deal of the Day"}
                        className={`p-1.5 rounded transition-all ${
                          p.is_deal_of_the_day
                            ? 'text-orange-600 bg-orange-100 shadow-xs'
                            : 'text-stone-300 hover:text-stone-500 hover:bg-stone-100'
                        }`}
                      >
                        <Flame size={16} fill={p.is_deal_of_the_day ? 'currentColor' : 'none'} />
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

      {/* Tab: Wangs Rewards Management */}
      {activeTab === 'rewards' && <AdminRewardsTab />}

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
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href="/documents/wangs_seller_rules.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  download="wangs_seller_rules.pdf"
                  className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors inline-flex items-center gap-1 shadow-2xs"
                >
                  <Download size={12} /> Seller Rules PDF
                </a>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                  <CheckCircle size={13} className="text-emerald-700" /> Active Platform Rules
                </span>
              </div>
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
                  <span className="font-bold text-stone-900">Tier 2: Flexible Brand Bundle (2–4 Jars)</span>
                  <span className="text-[10px] font-mono bg-amber-500 text-stone-950 font-bold px-2 py-0.5 rounded">10% Bundle OFF</span>
                </div>
                <p className="text-stone-700 text-[11px] leading-relaxed">
                  Customers can mix & match 2 to 4 items exclusively from the same brand catalog with a flat 10% discount. Free to cut or add recipes.
                </p>
              </div>

              <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900">Tier 3: Multi-Jar Cargo Care</span>
                  <span className="text-[10px] font-mono bg-purple-700 text-white font-bold px-2 py-0.5 rounded">All Bundles</span>
                </div>
                <p className="text-stone-700 text-[11px] leading-relaxed">
                  Shock-proof insulated packaging and air cargo dispatch automatically applied across all verified multi-jar bundles.
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

      {/* Tab: Platform Research & Study Records */}
      {activeTab === 'research' && (
        <div className="space-y-6">
          {/* Main Hero Card for Research Dossier */}
          <div className="bg-gradient-to-br from-forest-950 via-forest-900 to-[#123821] text-cream-50 p-6 sm:p-8 rounded-3xl border border-forest-800 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-forest-800/80 pb-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-forest-950 text-[10px] font-black uppercase tracking-wider shadow-sm">
                  <Sparkles size={12} />
                  <span>Platform Intelligence & Research Dossier</span>
                </div>
                <h2 className="font-serif font-bold text-2xl text-white">
                  Official Market Study & Statistical Records
                </h2>
                <p className="text-xs text-forest-200/90 leading-relaxed">
                  Export verifiable statistical records on registered customers, vetted artisan producers, and product sales performance. Maintained continuously for demographic study, supply-chain verification, and operational research in publication-grade PDF and CSV formats.
                </p>
              </div>

              {/* Primary Download Buttons (PDF & CSV) */}
              <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  disabled={downloadingResearch === 'pdf'}
                  onClick={() => handleDownloadResearch('pdf')}
                  className="px-5 py-3 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 hover:from-amber-300 text-forest-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  <FileText size={15} />
                  <span>{downloadingResearch === 'pdf' ? 'Generating PDF...' : 'Download Research Dossier (PDF)'}</span>
                </button>
                <button
                  type="button"
                  disabled={downloadingResearch === 'all'}
                  onClick={() => handleDownloadResearch('csv', 'all')}
                  className="px-5 py-3 bg-white/10 hover:bg-white/15 text-cream-50 font-bold text-xs rounded-xl border border-white/20 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                >
                  <Download size={15} className="text-amber-400" />
                  <span>{downloadingResearch === 'all' ? 'Exporting CSV...' : 'Export Complete Dataset (CSV)'}</span>
                </button>
              </div>
            </div>

            {/* Quick KPI Stat Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-forest-900/60 border border-forest-800 rounded-2xl">
                <span className="text-[10px] text-forest-300 uppercase font-bold tracking-wider block">Customer Cohort</span>
                <span className="text-xl font-bold text-white mt-1 block">
                  {usersList.filter((u) => u.role === 'CUSTOMER').length} Shoppers
                </span>
                <span className="text-[11px] text-forest-300 mt-0.5 block">{usersList.length} Total Users</span>
              </div>
              <div className="p-4 bg-forest-900/60 border border-forest-800 rounded-2xl">
                <span className="text-[10px] text-forest-300 uppercase font-bold tracking-wider block">Vetted Sellers</span>
                <span className="text-xl font-bold text-white mt-1 block">
                  {manufacturersList.filter((m) => m.status === 'APPROVED').length} Approved Brands
                </span>
                <span className="text-[11px] text-forest-300 mt-0.5 block">{manufacturersList.length} Total Producers</span>
              </div>
              <div className="p-4 bg-forest-900/60 border border-forest-800 rounded-2xl">
                <span className="text-[10px] text-forest-300 uppercase font-bold tracking-wider block">Inventory Health</span>
                <span className="text-xl font-bold text-white mt-1 block">
                  {productsList.filter((p) => p.is_active && p.status === 'APPROVED').length} Live Listings
                </span>
                <span className="text-[11px] text-forest-300 mt-0.5 block">{productsList.length} Total Recipes</span>
              </div>
              <div className="p-4 bg-forest-900/60 border border-forest-800 rounded-2xl">
                <span className="text-[10px] text-forest-300 uppercase font-bold tracking-wider block">Gross Volume (GMV)</span>
                <span className="text-xl font-bold text-amber-300 mt-1 block">
                  ₹{parseFloat(metrics?.total_revenue || 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-forest-300 mt-0.5 block">{ordersList.length} Orders Logged</span>
              </div>
            </div>
          </div>

          {/* Individual Research Sections (Customers, Sellers, Products) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. Customers Record Card */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center">
                  <Users size={22} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Customer Study & Demographics
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Examines buyer accounts, order counts, repeat purchase velocity, lifetime spend (LTV), average order value (AOV), and regional delivery hubs.
                  </p>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-[11px] text-stone-600 space-y-1">
                  <p>• <strong>Included Fields:</strong> User ID, Contact Email, Phone, Role, Orders Placed, Lifetime Spend, AOV, Primary District.</p>
                  <p>• <strong>Current Records:</strong> {usersList.length} user profiles.</p>
                </div>
              </div>

              <button
                type="button"
                disabled={downloadingResearch === 'customers'}
                onClick={() => handleDownloadResearch('csv', 'customers')}
                className="w-full py-2.5 bg-stone-100 hover:bg-forest-900 text-stone-800 hover:text-white font-bold text-xs rounded-xl border border-stone-200 hover:border-forest-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download size={13} />
                <span>{downloadingResearch === 'customers' ? 'Exporting...' : 'Export Customer Records (CSV)'}</span>
              </button>
            </div>

            {/* 2. Artisan Sellers Record Card */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center">
                  <Store size={22} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Artisan Seller Ecosystem
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Audits verified regional food producers, FSSAI regulatory compliance, active jar catalog depth, units dispatched, and gross earnings.
                  </p>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-[11px] text-stone-600 space-y-1">
                  <p>• <strong>Included Fields:</strong> Brand Name, District, FSSAI Number, Status, Verification, Active Jars, Units Sold, Gross GMV.</p>
                  <p>• <strong>Current Records:</strong> {manufacturersList.length} producer profiles.</p>
                </div>
              </div>

              <button
                type="button"
                disabled={downloadingResearch === 'sellers'}
                onClick={() => handleDownloadResearch('csv', 'sellers')}
                className="w-full py-2.5 bg-stone-100 hover:bg-forest-900 text-stone-800 hover:text-white font-bold text-xs rounded-xl border border-stone-200 hover:border-forest-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download size={13} />
                <span>{downloadingResearch === 'sellers' ? 'Exporting...' : 'Export Seller Directory (CSV)'}</span>
              </button>
            </div>

            {/* 3. Products Performance Record Card */}
            <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center justify-center">
                  <Package size={22} />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Product Performance & Inventory
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                    Tracks pickle recipes, dietary classifications (Non-Veg, Veg, Veg Mixed), spice levels (King Chilli), weight, price points, and review ratings.
                  </p>
                </div>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-[11px] text-stone-600 space-y-1">
                  <p>• <strong>Included Fields:</strong> Title, Brand, Dietary Type, Spice Level, Net Weight, Price, Stock, Rating, Units Sold, Revenue.</p>
                  <p>• <strong>Current Records:</strong> {productsList.length} cataloged products.</p>
                </div>
              </div>

              <button
                type="button"
                disabled={downloadingResearch === 'products'}
                onClick={() => handleDownloadResearch('csv', 'products')}
                className="w-full py-2.5 bg-stone-100 hover:bg-forest-900 text-stone-800 hover:text-white font-bold text-xs rounded-xl border border-stone-200 hover:border-forest-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Download size={13} />
                <span>{downloadingResearch === 'products' ? 'Exporting...' : 'Export Product Catalog (CSV)'}</span>
              </button>
            </div>
          </div>

          {/* Server-Maintained File Location & Integrity Info */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-forest-900" />
                <h4 className="font-serif font-bold text-sm text-stone-900">
                  Maintained Production Record Files
                </h4>
              </div>
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                Auto-Synced on Demand
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Every download or compilation maintains standardized publication copies directly in the production server storage. These files can be cited for academic food science research, regional artisan producer support, or platform compliance auditing:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 font-mono text-[11px] text-stone-700 flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-900 block">Publication PDF Dossier</span>
                  <span className="text-stone-500 text-[10px]">media/reports/wangs_research_report.pdf</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadResearch('pdf')}
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-[10px] font-bold text-stone-800 cursor-pointer shadow-2xs"
                >
                  Download PDF
                </button>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 font-mono text-[11px] text-stone-700 flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-900 block">Complete Analytics Dataset</span>
                  <span className="text-stone-500 text-[10px]">media/reports/wangs_research_report.csv</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDownloadResearch('csv', 'all')}
                  className="px-2.5 py-1 bg-white hover:bg-stone-100 border border-stone-200 rounded-lg text-[10px] font-bold text-stone-800 cursor-pointer shadow-2xs"
                >
                  Download CSV
                </button>
              </div>
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
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
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

      {/* Application Inspection Modal */}
      {inspectingRequest && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 p-6 space-y-5 text-xs animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 text-amber-800 flex items-center justify-center font-bold">
                  <Store size={20} className="text-amber-700" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif font-bold text-lg text-stone-900">{inspectingRequest.business_name || 'Artisan Producer'}</h2>
                    <span className="font-mono text-[10px] text-stone-400">Request #{inspectingRequest.id}</span>
                  </div>
                  <p className="text-[11px] text-stone-500">
                    Application received on {inspectingRequest.created_at ? new Date(inspectingRequest.created_at).toLocaleString() : 'Recent'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectingRequest(null)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Status Strip */}
            <div className={`p-3 rounded-2xl border flex items-center justify-between ${
              inspectingRequest.is_authorized
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-2.5">
                {inspectingRequest.is_authorized ? (
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                ) : (
                  <Clock size={16} className="text-amber-600 animate-pulse shrink-0" />
                )}
                <div>
                  <span className="font-bold text-xs block">
                    {inspectingRequest.is_authorized ? 'Authorized & Active Seller' : 'Awaiting Administrator Review'}
                  </span>
                  <span className="text-[10px] opacity-80 block">
                    {inspectingRequest.is_authorized
                      ? 'Onboarding email has been dispatched with seller portal credentials'
                      : 'Approval grants immediate seller portal access and triggers welcome email'}
                  </span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Registered Email</span>
                <span className="font-mono font-bold text-forest-950 text-xs select-all block mt-0.5 truncate">{inspectingRequest.email}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Phone / WhatsApp</span>
                <span className="font-mono font-bold text-stone-800 text-xs block mt-0.5">{inspectingRequest.phone || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Location / District</span>
                <span className="font-medium text-stone-800 text-xs block mt-0.5">{inspectingRequest.location_district || 'Nagaland'}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">FSSAI License</span>
                <span className="font-mono font-bold text-stone-800 text-xs block mt-0.5">
                  {inspectingRequest.fssai_number || 'Pending verification'}
                </span>
              </div>
            </div>

            {/* Payout Banking Details */}
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/90 space-y-2">
              <div className="flex items-center gap-1.5 text-stone-900 font-bold text-xs">
                <Landmark size={14} className="text-amber-800" />
                <span>Payout Settlement Bank Account</span>
              </div>
              {inspectingRequest.bank_account_number ? (
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">Bank Name</span>
                    <span className="font-semibold text-stone-900">{inspectingRequest.bank_name || '—'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">Account Holder</span>
                    <span className="font-semibold text-stone-900">{inspectingRequest.bank_account_holder || '—'}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">Account Number</span>
                    <span className="font-mono font-bold text-forest-950 select-all">{inspectingRequest.bank_account_number}</span>
                  </div>
                  <div>
                    <span className="text-stone-400 block text-[10px] uppercase font-bold">IFSC Code</span>
                    <span className="font-mono font-bold text-forest-950 select-all">{inspectingRequest.bank_ifsc_code || '—'}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-stone-500 italic">No bank account details recorded for this request.</p>
              )}
            </div>

            {/* Pitch / Message */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider block">
                Artisan Pitch & Production Message:
              </span>
              <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-stone-700 text-xs leading-relaxed max-h-40 overflow-y-auto break-all break-words">
                {inspectingRequest.message || <span className="italic text-stone-400">No additional message submitted.</span>}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  handleDeleteSellerRequest(inspectingRequest.id, inspectingRequest.business_name, inspectingRequest.email);
                  setInspectingRequest(null);
                }}
                className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-red-50 text-stone-600 hover:text-red-700 font-bold text-xs border border-stone-200 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={13} />
                <span>Dismiss Application</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInspectingRequest(null)}
                  className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={approvingEmail === inspectingRequest.email}
                  onClick={async () => {
                    await handleApproveSellerRequest(inspectingRequest.email);
                    setInspectingRequest(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-forest-900 hover:bg-forest-950 text-white font-bold text-xs shadow-xs hover:scale-102 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle size={14} className="text-emerald-400" />
                  <span>{approvingEmail === inspectingRequest.email ? 'Processing...' : (inspectingRequest.is_authorized ? 'Resend Onboarding Email' : 'Approve & Send Email')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Ban & Rule Enforcement Modal */}
      {banModalUser && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-in fade-in">
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
