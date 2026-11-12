import React, { useState, useEffect } from 'react';
import {
  Sparkles, QrCode, Search, Filter, ShieldAlert, Settings,
  CheckCircle2, AlertCircle, Clock, Download, Printer, Ban,
  Check, X, RefreshCw, ArrowRight, UserCheck, KeyRound, ExternalLink
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

export default function AdminRewardsTab() {
  const toast = useToast();

  const [activeSubtab, setActiveSubtab] = useState('registry'); // 'registry' | 'settings' | 'adjustment' | 'suspicious'
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Overview Data
  const [overview, setOverview] = useState(null);

  // QR Codes Table State
  const [qrList, setQrList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  // Settings State
  const [settingsForm, setSettingsForm] = useState({
    is_active: true,
    monetary_value_per_credit_inr: '0.10',
    max_redemption_percentage: 100,
    min_order_value_to_redeem: '0.00',
    award_credits_on_credit_portion: false,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Manual Adjustment State
  const [adjustForm, setAdjustForm] = useState({
    user_id_or_email: '',
    delta_credits: 1,
    audit_reason: '',
  });
  const [adjusting, setAdjusting] = useState(false);

  // Suspicious Logs
  const [suspiciousLogs, setSuspiciousLogs] = useState([]);

  // Print Labels Modal State
  const [printModalOrder, setPrintModalOrder] = useState(null);
  const [labelsData, setLabelsData] = useState(null);
  const [loadingLabels, setLoadingLabels] = useState(false);

  // Revoke QR Modal
  const [revokingQr, setRevokingQr] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    loadOverviewAndCurrentTab();
  }, [activeSubtab]);

  const loadOverviewAndCurrentTab = async () => {
    setLoading(true);
    try {
      const ov = await api.getAdminRewardOverview();
      setOverview(ov);
      if (ov?.settings) {
        setSettingsForm({
          is_active: ov.settings.is_active ?? ov.settings.is_enabled ?? true,
          monetary_value_per_credit_inr: ov.settings.monetary_value_per_credit_inr ?? ov.settings.credit_value_rupees ?? '0.10',
          max_redemption_percentage: ov.settings.max_redemption_percentage,
          min_order_value_to_redeem: ov.settings.min_order_value_to_redeem,
          award_credits_on_credit_portion: ov.settings.award_credits_on_credit_portion,
        });
      }

      if (activeSubtab === 'registry') {
        await loadQRs();
      } else if (activeSubtab === 'suspicious') {
        const logs = await api.getAdminRewardSuspiciousLogs();
        setSuspiciousLogs(logs || []);
      }
    } catch (err) {
      console.error('Error loading rewards data:', err);
      toast.error(err.message || 'Failed to load rewards data.');
    } finally {
      setLoading(false);
    }
  };

  const loadQRs = async () => {
    const params = {};
    if (searchQuery.trim()) params.search = searchQuery.trim();
    if (statusFilter) params.status = statusFilter;
    if (sourceFilter) params.source = sourceFilter;
    try {
      const data = await api.getAdminRewardQRs(params);
      setQrList(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadQRs();
  };

  const handleExportTransactions = async () => {
    setExporting(true);
    try {
      await api.exportAdminRewardTransactions();
      toast.success('Reward transactions CSV exported successfully!');
    } catch (err) {
      toast.error(err.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const updated = await api.updateAdminRewardSettings(settingsForm);
      toast.success('Reward settings updated successfully!');
      if (overview) {
        setOverview({ ...overview, settings: updated });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    if (!adjustForm.audit_reason.trim()) {
      toast.error('An audit reason is strictly required.');
      return;
    }
    setAdjusting(true);
    try {
      const res = await api.adjustAdminRewardBalance(adjustForm);
      toast.success(`Success! User rewards balance is now ${res.balance_after} credits.`);
      setAdjustForm({ user_id_or_email: '', delta_credits: 1, audit_reason: '' });
      await loadOverviewAndCurrentTab();
    } catch (err) {
      toast.error(err.message || 'Balance adjustment failed.');
    } finally {
      setAdjusting(false);
    }
  };

  const handleOpenPrintLabels = async (orderNumber) => {
    setPrintModalOrder(orderNumber);
    setLoadingLabels(true);
    try {
      const data = await api.getAdminRewardPrintLabels(orderNumber);
      setLabelsData(data);
    } catch (err) {
      toast.error(err.message || 'Could not fetch labels for order.');
      setPrintModalOrder(null);
    } finally {
      setLoadingLabels(false);
    }
  };

  const handleRevokeQR = async () => {
    if (!revokingQr) return;
    if (!revokeReason.trim()) {
      toast.error('Please specify a reason for revoking this QR code.');
      return;
    }
    setIsRevoking(true);
    try {
      await api.revokeAdminRewardQR(revokingQr.id, revokeReason);
      toast.success('QR code revoked successfully.');
      setRevokingQr(null);
      setRevokeReason('');
      await loadQRs();
    } catch (err) {
      toast.error(err.message || 'Failed to revoke QR.');
    } finally {
      setIsRevoking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-850 to-amber-950 text-white p-6 sm:p-7 rounded-3xl border border-stone-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-5">
          <div className="flex items-center gap-3.5">
            <span className="w-12 h-12 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-md">
              <Sparkles size={24} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-xl text-white">
                  Wangs Rewards &amp; QR Delivery Confirmation
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  overview?.settings?.is_active ? 'bg-emerald-500 text-stone-950' : 'bg-red-500 text-white'
                }`}>
                  {overview?.settings?.is_active ? 'Active Program' : 'Program Paused'}
                </span>
              </div>
              <p className="text-xs text-stone-400 mt-0.5">
                Cryptographically secure QR codes per product unit · Dual-method delivery verification · 10 Credits = ₹1.00 checkout discount
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              disabled={exporting}
              onClick={handleExportTransactions}
              className="px-4 py-2.5 bg-stone-800 hover:bg-stone-700 active:scale-95 text-white text-xs font-bold rounded-xl border border-stone-700 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download size={14} className={exporting ? 'animate-spin' : 'text-amber-400'} />
              <span>{exporting ? 'Exporting...' : 'Export Transactions (CSV)'}</span>
            </button>
          </div>
        </div>

        {/* 5 High-Impact Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/60 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Total Credits Issued</span>
            <span className="font-serif font-black text-2xl text-emerald-400 block">
              {overview?.stats?.total_credits_earned || overview?.metrics?.total_credits_earned || 0}
            </span>
            <span className="text-[10px] text-stone-400 block">
              Worth ₹{(((overview?.stats?.total_credits_earned || overview?.metrics?.total_credits_earned || 0) * (parseFloat(settingsForm.monetary_value_per_credit_inr) || 0.10))).toFixed(2)}
            </span>
          </div>

          <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/60 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Total Redeemed</span>
            <span className="font-serif font-black text-2xl text-amber-300 block">
              {overview?.stats?.total_credits_redeemed || 0}
            </span>
            <span className="text-[10px] text-stone-400 block">Discounted at checkout</span>
          </div>

          <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/60 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">QR Codes Issued</span>
            <span className="font-serif font-black text-2xl text-white block">
              {overview?.stats?.total_qr_codes || 0}
            </span>
            <span className="text-[10px] text-stone-400 block">Unit-level tokens</span>
          </div>

          <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/60 space-y-1">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Delivered Units</span>
            <span className="font-serif font-black text-2xl text-blue-300 block">
              {overview?.stats?.delivered_units || 0}
            </span>
            <span className="text-[10px] text-stone-400 block">Confirmed deliveries</span>
          </div>

          <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/60 space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">Suspicious Logs</span>
            <span className="font-serif font-black text-2xl text-red-400 block">
              {overview?.stats?.suspicious_scans || 0}
            </span>
            <span className="text-[10px] text-stone-400 block">Fraud protection active</span>
          </div>
        </div>
      </div>

      {/* Subtab Navigation Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3 text-xs font-bold text-stone-600">
        <button
          type="button"
          onClick={() => setActiveSubtab('registry')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubtab === 'registry'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <QrCode size={14} />
          <span>Issued QR Codes &amp; Packaging Labels</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubtab('settings')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubtab === 'settings'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <Settings size={14} />
          <span>Loyalty Program Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubtab('adjustment')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubtab === 'adjustment'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <UserCheck size={14} />
          <span>Manual Balance Adjustment</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubtab('suspicious')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeSubtab === 'suspicious'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
          }`}
        >
          <ShieldAlert size={14} className={overview?.stats?.suspicious_scans > 0 ? 'text-red-500' : ''} />
          <span>Suspicious Scan Log ({overview?.stats?.suspicious_scans || 0})</span>
        </button>
      </div>

      {/* Subtab 1: QR Codes Registry */}
      {activeSubtab === 'registry' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-5">
          {/* Filter Bar */}
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-3 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order #, customer email/name, product, or token..."
                className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setTimeout(loadQRs, 50);
              }}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none"
            >
              <option value="">All Delivery Statuses</option>
              <option value="DELIVERED">Delivered</option>
              <option value="PENDING">Pending Delivery</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setTimeout(loadQRs, 50);
              }}
              className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-700 focus:outline-none"
            >
              <option value="">All Confirmation Sources</option>
              <option value="CUSTOMER_QR">Customer QR Scan</option>
              <option value="COURIER">Courier Confirmation</option>
              <option value="BOTH">Both Confirmed</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[11px] font-bold">
                  <th className="pb-3">Order &amp; Unit</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Product</th>
                  <th className="pb-3">QR Token</th>
                  <th className="pb-3">Delivery Status &amp; Source</th>
                  <th className="pb-3">Reward</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {qrList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-stone-400">
                      No issued QR codes match your filters.
                    </td>
                  </tr>
                ) : (
                  qrList.map((q) => {
                    const u = q.unit || {};
                    const source = u.confirmation_source;
                    const sourceDisplay = u.confirmation_source_display || (source === 'CUSTOMER_QR' ? 'Customer QR Scan' : source === 'COURIER' ? 'Courier Confirmation' : source === 'BOTH' ? 'Both Confirmed' : 'Pending');

                    return (
                      <tr key={q.id} className="hover:bg-stone-50/80 transition-colors">
                        <td className="py-3 font-mono font-bold text-stone-900">
                          <div>#{u.order_number}</div>
                          <span className="text-[10px] text-stone-400 font-normal">Unit #{u.unit_index}</span>
                        </td>
                        <td className="py-3">
                          <span className="font-semibold block">{u.customer_name || 'Customer'}</span>
                          <span className="text-stone-400 text-[10px]">{u.customer_email}</span>
                        </td>
                        <td className="py-3 font-medium max-w-xs truncate" title={u.product_title}>
                          {u.product_title}
                        </td>
                        <td className="py-3 font-mono text-[11px]">
                          <span className={`px-2 py-0.5 rounded ${q.is_revoked ? 'bg-red-100 text-red-800 line-through' : 'bg-stone-100 text-stone-700'}`}>
                            {q.token}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            source === 'BOTH'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : source === 'CUSTOMER_QR'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : source === 'COURIER'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-stone-100 text-stone-600'
                          }`}>
                            {u.is_delivered && <CheckCircle2 size={11} />}
                            <span>{sourceDisplay}</span>
                          </span>
                        </td>
                        <td className="py-3">
                          {u.reward_awarded ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              +1 Awarded
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[10px]">Unclaimed</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenPrintLabels(u.order_number)}
                              title="Print Packaging Labels"
                              className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-700 transition-colors cursor-pointer"
                            >
                              <Printer size={14} />
                            </button>
                            {!q.is_revoked && !u.reward_awarded && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRevokingQr(q);
                                  setRevokeReason('');
                                }}
                                title="Revoke QR Code"
                                className="p-1.5 hover:bg-red-100 rounded-lg text-red-600 transition-colors cursor-pointer"
                              >
                                <Ban size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Loyalty Program Settings */}
      {activeSubtab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 shadow-sm space-y-6 text-xs max-w-3xl">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-serif font-bold text-base text-stone-900">
              Loyalty Program Configuration
            </h3>
            <p className="text-stone-500 text-[11px] mt-0.5">
              Control the monetary conversion rate, limits, and redemption rules.
            </p>
          </div>

          <div className="space-y-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200">
              <div>
                <span className="font-bold text-stone-900 text-sm block">Enable Wangs Rewards Loyalty Program</span>
                <span className="text-stone-500 text-xs">When disabled, customers cannot earn or redeem credits.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settingsForm.is_active}
                  onChange={(e) => setSettingsForm({ ...settingsForm, is_active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
              </label>
            </div>

            {/* Monetary Value per Credit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-700 font-bold mb-1">
                  Monetary Value of 1 Wangs Credit (₹ INR)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  required
                  value={settingsForm.monetary_value_per_credit_inr}
                  onChange={(e) => setSettingsForm({ ...settingsForm, monetary_value_per_credit_inr: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">Default: ₹0.10 per credit (10 Credits = ₹1.00)</span>
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">
                  Max Redemption Percentage per Order (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={settingsForm.max_redemption_percentage}
                  onChange={(e) => setSettingsForm({ ...settingsForm, max_redemption_percentage: parseInt(e.target.value, 10) || 100 })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
                <span className="text-[10px] text-stone-400 mt-1 block">Limit discount to percentage of cart total (100% = full order)</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-700 font-bold mb-1">
                  Minimum Order Value to Redeem Credits (₹ INR)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={settingsForm.min_order_value_to_redeem}
                  onChange={(e) => setSettingsForm({ ...settingsForm, min_order_value_to_redeem: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              <div className="flex items-center justify-between p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                <div>
                  <span className="font-bold text-stone-900 block">Award on Credit Portion</span>
                  <span className="text-[10px] text-stone-500">Prevent circular loops</span>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.award_credits_on_credit_portion}
                  onChange={(e) => setSettingsForm({ ...settingsForm, award_credits_on_credit_portion: e.target.checked })}
                  className="w-4 h-4 text-stone-900 rounded focus:ring-0"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 flex justify-end">
            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              {savingSettings && <RefreshCw size={13} className="animate-spin" />}
              <span>Save Reward Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* Subtab 3: Manual Balance Adjustment */}
      {activeSubtab === 'adjustment' && (
        <form onSubmit={handleAdjustBalance} className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-7 shadow-sm space-y-6 text-xs max-w-2xl">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-serif font-bold text-base text-stone-900">
              Manual Customer Rewards Adjustment
            </h3>
            <p className="text-stone-500 text-[11px] mt-0.5">
              Add or deduct credits for customers. An audit reason is strictly enforced and logged in the immutable audit ledger.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-stone-700 font-bold mb-1">
                Customer Email or User ID *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. customer@example.com or user ID"
                value={adjustForm.user_id_or_email}
                onChange={(e) => setAdjustForm({ ...adjustForm, user_id_or_email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>

            <div>
              <label className="block text-stone-700 font-bold mb-1">
                Credit Adjustment Delta (Positive to Add, Negative to Deduct) *
              </label>
              <input
                type="number"
                step="1"
                required
                value={adjustForm.delta_credits}
                onChange={(e) => setAdjustForm({ ...adjustForm, delta_credits: parseInt(e.target.value, 10) || 0 })}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold font-mono focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                e.g. +5 adds 5 credits; -2 deducts 2 credits
              </span>
            </div>

            <div>
              <label className="block text-stone-700 font-bold mb-1">
                Mandatory Audit Reason *
              </label>
              <textarea
                rows={3}
                required
                placeholder="Describe why this correction was made (e.g. Customer support goodwill for damaged item transit delay)..."
                value={adjustForm.audit_reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, audit_reason: e.target.value })}
                className="w-full p-3 bg-stone-50 border border-stone-200 rounded-xl font-medium focus:outline-none focus:ring-1 focus:ring-stone-900"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100 flex justify-end">
            <button
              type="submit"
              disabled={adjusting}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
            >
              {adjusting && <RefreshCw size={13} className="animate-spin" />}
              <span>Apply Adjustment &amp; Record Audit Log</span>
            </button>
          </div>
        </form>
      )}

      {/* Subtab 4: Suspicious Scan Log */}
      {activeSubtab === 'suspicious' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 shadow-sm space-y-4 text-xs">
          <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                <ShieldAlert size={16} className="text-red-600" />
                <span>Security &amp; Suspicious Scan Incident Log</span>
              </h3>
              <p className="text-stone-500 text-[11px] mt-0.5">
                Tracks invalid tokens, unauthorized claims of other users' orders, revoked token attempts, and rate limiting.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-bold text-[10px]">
              {suspiciousLogs.length} Incident(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 uppercase tracking-wider text-[11px] font-bold">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Token Attempted</th>
                  <th className="pb-3">User</th>
                  <th className="pb-3">IP Address</th>
                  <th className="pb-3">Incident Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {suspiciousLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-stone-400">
                      No suspicious scan incidents logged. System is clean!
                    </td>
                  </tr>
                ) : (
                  suspiciousLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/80">
                      <td className="py-2.5 text-stone-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-IN')}
                      </td>
                      <td className="py-2.5 font-mono text-[11px] max-w-xs truncate font-bold text-red-700">
                        {log.token_attempted}
                      </td>
                      <td className="py-2.5">
                        {log.user_email || <span className="text-stone-400 italic">Anonymous</span>}
                      </td>
                      <td className="py-2.5 font-mono text-stone-500">
                        {log.ip_address || '—'}
                      </td>
                      <td className="py-2.5 text-stone-700">
                        {log.reason}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print Packaging Labels Modal */}
      {printModalOrder && (
        <div className="fixed inset-0 z-50 bg-stone-950/75 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <div className="flex items-center gap-3">
                <Printer size={22} className="text-stone-700" />
                <div>
                  <h3 className="font-serif font-bold text-lg text-stone-900">
                    Printable Packaging QR Labels
                  </h3>
                  <p className="text-xs text-stone-500">
                    Order #{printModalOrder} · {labelsData?.total_units || 0} Unit Labels
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPrintModalOrder(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {loadingLabels ? (
              <div className="py-12 text-center text-xs text-stone-500">
                <RefreshCw size={24} className="animate-spin mx-auto text-red-600 mb-2" />
                Generating high-resolution printable QR packaging labels...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto p-1" id="printable-labels-area">
                  {labelsData?.labels?.map((lbl) => (
                    <div
                      key={lbl.unit_uid}
                      className="border-2 border-dashed border-stone-300 p-4 rounded-2xl bg-stone-50 text-center space-y-2.5 relative"
                    >
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-stone-500 border-b border-stone-200 pb-1.5">
                        <span>Wangs Rewards Label</span>
                        <span>Unit #{lbl.unit_index}</span>
                      </div>

                      <div className="font-serif font-bold text-stone-900 text-sm truncate" title={lbl.product_title}>
                        {lbl.product_title}
                      </div>

                      {/* Base64 PNG QR Code image */}
                      <div className="w-36 h-36 mx-auto bg-white p-2 rounded-xl border border-stone-200 shadow-2xs flex items-center justify-center">
                        {lbl.qr_data_url ? (
                          <img src={lbl.qr_data_url} alt={lbl.token} className="w-full h-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-stone-400">QR Loading</span>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <span className="font-mono text-xs font-bold text-stone-900 tracking-wider block">
                          {lbl.token}
                        </span>
                        <span className="text-[10px] text-stone-500 block leading-tight">
                          Scan to confirm delivery &amp; claim 1 Wangs Credit!
                        </span>
                        <span className="text-[9px] font-mono text-stone-400 block pt-1">
                          #{printModalOrder} · {lbl.unit_uid}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-stone-200 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPrintModalOrder(null)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer size={14} />
                    <span>Print Labels (Thermal / Sheet)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Revoke QR Confirmation Modal */}
      {revokingQr && (
        <div className="fixed inset-0 z-50 bg-stone-950/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-2.5 text-red-600 font-bold text-sm">
              <Ban size={20} />
              <span>Revoke QR Code Token</span>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              You are invalidating token <strong className="font-mono text-stone-900">{revokingQr.token}</strong> for product: <strong>{revokingQr.unit?.product_title}</strong>. Once revoked, scanning this QR code will be rejected.
            </p>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Reason for Revocation *
              </label>
              <textarea
                rows={2}
                required
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="e.g. Damaged packaging in transit, order cancelled, packaging re-print..."
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRevokingQr(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRevoking || !revokeReason.trim()}
                onClick={handleRevokeQR}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isRevoking && <RefreshCw size={13} className="animate-spin" />}
                <span>Confirm Revocation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
