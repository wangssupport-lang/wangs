import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Eye, CheckCircle2, XCircle, Clock, Filter,
  ChevronLeft, ChevronRight, ArrowUpDown, ShieldCheck,
  Landmark, AlertTriangle, FileText, X, RefreshCw, User, Building2
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

const STATUS_BADGES = {
  REQUESTED: 'bg-amber-50 text-amber-800 border-amber-200',
  UNDER_REVIEW: 'bg-sky-50 text-sky-800 border-sky-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PROCESSING: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  PAID: 'bg-[#28452e] text-white border-[#28452e]',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  FAILED: 'bg-rose-50 text-rose-800 border-rose-200',
  CANCELLED: 'bg-stone-100 text-stone-600 border-stone-200',
};

const BANK_STATUS_BADGES = {
  VERIFIED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  FAILED: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'PAID', label: 'Paid' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const formatCurrency = (val) => {
  const num = Number(val || 0);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDateTime = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function AdminPaymentRequestsTab() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total_pending_requests: 0,
    total_requested_amount: '0.00',
    approved_amount: '0.00',
    completed_payout_amount: '0.00',
  });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ count: 0, page: 1, page_size: 10, total_pages: 1 });
  const [settlementNotice, setSettlementNotice] = useState('');

  // Filters & sorting
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Detail Drawer & Actions
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [rejectModalRow, setRejectModalRow] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAdminPaymentRequests({
        search,
        status: statusFilter,
        date_from: dateFrom,
        date_to: dateTo,
        sort,
        page,
        page_size: pageSize,
      });
      setSummary(data.summary || {
        total_pending_requests: 0,
        total_requested_amount: '0.00',
        approved_amount: '0.00',
        completed_payout_amount: '0.00',
      });
      setRows(Array.isArray(data.results) ? data.results : []);
      setPagination(data.pagination || { count: 0, page: 1, page_size: pageSize, total_pages: 1 });
      setSettlementNotice(data.settlement_mode?.notice || '');
    } catch (err) {
      toast.error(err.message || 'Failed to load payment requests');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFrom, dateTo, sort, page, pageSize, toast]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetchRequests();
    }, 180);
    return () => clearTimeout(t);
  }, [fetchRequests]);

  const openDetail = async (id) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await api.getAdminPaymentRequestDetail(id);
      setDetail(data);
      setInternalNote(data.admin_internal_note || '');
    } catch (err) {
      toast.error(err.message || 'Failed to load request details');
      setSelectedId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setActionBusy(true);
    try {
      const res = await api.approveAdminPaymentRequest(id, { internal_note: internalNote });
      toast.success(res.message || 'Withdrawal request approved.');
      await fetchRequests();
      if (selectedId === id) {
        await openDetail(id);
      }
    } catch (err) {
      toast.error(err.message || 'Could not approve request');
    } finally {
      setActionBusy(false);
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason.trim()) {
      toast.error('Please enter a mandatory rejection reason.');
      return;
    }
    setActionBusy(true);
    try {
      const res = await api.rejectAdminPaymentRequest(rejectModalRow.id, {
        reason: rejectReason.trim(),
        internal_note: internalNote,
      });
      toast.success(res.message || 'Withdrawal request rejected.');
      const targetId = rejectModalRow.id;
      setRejectModalRow(null);
      setRejectReason('');
      await fetchRequests();
      if (selectedId === targetId) {
        await openDetail(targetId);
      }
    } catch (err) {
      toast.error(err.message || 'Could not reject request');
    } finally {
      setActionBusy(false);
    }
  };

  const handleSaveReviewNote = async (setUnderReview = true) => {
    if (!selectedId) return;
    setActionBusy(true);
    try {
      const res = await api.reviewAdminPaymentRequest(selectedId, {
        internal_note: internalNote,
        set_under_review: setUnderReview,
      });
      toast.success(res.message || 'Review updated.');
      await fetchRequests();
      await openDetail(selectedId);
    } catch (err) {
      toast.error(err.message || 'Failed to update review note');
    } finally {
      setActionBusy(false);
    }
  };

  const canActOnStatus = (st) => st === 'REQUESTED' || st === 'UNDER_REVIEW';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">Payment Requests</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review seller withdrawal requests, verify bank &amp; balance eligibility, and maintain an immutable audit trail.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchRequests}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer self-start"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Compliance Notice */}
      <div className="rounded-2xl border border-emerald-200 bg-[#28452e]/5 px-4 py-3 flex items-start gap-3">
        <ShieldCheck size={18} className="text-[#28452e] shrink-0 mt-0.5" />
        <p className="text-xs text-slate-700 leading-relaxed">
          <strong className="text-[#28452e]">Razorpay Route Settlement Mode:</strong>{' '}
          {settlementNotice || 'Marketplace settlement activation is pending Razorpay Route approval. Live payouts remain disabled; approving a request reserves funds and records an audit entry without marking it Paid.'}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Pending Requests</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{summary.total_pending_requests}</p>
          <p className="text-[11px] text-amber-700 mt-1">Requested &amp; Under Review</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Total Requested Amount</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(summary.total_requested_amount)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Min withdrawal ₹300.00</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Approved Amount</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{formatCurrency(summary.approved_amount)}</p>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting authorised payout</p>
        </div>
        <div className="bg-[#28452e] rounded-2xl border border-[#28452e] p-4 shadow-xs text-white">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200">Completed Payout Amount</p>
          <p className="text-2xl font-bold mt-1">{formatCurrency(summary.completed_payout_amount)}</p>
          <p className="text-[11px] text-emerald-100/80 mt-1">Confirmed Paid settlements</p>
        </div>
      </div>

      {/* Filter & Search Toolbar (Bagisto-inspired) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by request ID, seller name, or shop..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#28452e]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <Filter size={13} className="text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#28452e]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              aria-label="From date"
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-[#28452e]"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              aria-label="To date"
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-[#28452e]"
            />

            <div className="flex items-center gap-1 text-xs">
              <ArrowUpDown size={13} className="text-slate-400" />
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#28452e]"
              >
                <option value="-created_at">Newest First</option>
                <option value="created_at">Oldest First</option>
                <option value="-requested_amount">Amount: High to Low</option>
                <option value="requested_amount">Amount: Low to High</option>
              </select>
            </div>

            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              aria-label="Rows per page"
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-none focus:border-[#28452e]"
            >
              <option value={10}>10 / page</option>
              <option value={25}>25 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </div>

        {/* 10-Column Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1040px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Request Date</th>
                <th className="py-3 px-4">Seller / Shop</th>
                <th className="py-3 px-4">Seller Email</th>
                <th className="py-3 px-4 text-right">Available Balance</th>
                <th className="py-3 px-4 text-right">Requested Amount</th>
                <th className="py-3 px-4">Bank Status</th>
                <th className="py-3 px-4 text-right">Prev. Withdrawals</th>
                <th className="py-3 px-4">Request Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Loading payment requests...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    No withdrawal payment requests match the selected filters.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">
                      {row.request_reference}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                      {formatDateTime(row.created_at)}
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{row.seller_name}</p>
                      <p className="text-[11px] text-slate-500">{row.shop_name}</p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">{row.seller_email}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-800">
                      {formatCurrency(row.available_balance)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#28452e]">
                      {formatCurrency(row.requested_amount)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold ${BANK_STATUS_BADGES[row.bank_verification_status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                        {row.bank_verification_status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      {formatCurrency(row.previous_withdrawals_total)}
                      <span className="block text-[10px] text-slate-400">({row.previous_withdrawals_count} paid)</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${STATUS_BADGES[row.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {row.status_display || row.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openDetail(row.id)}
                          title="View Details"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#28452e] hover:border-[#28452e] transition-colors cursor-pointer"
                        >
                          <Eye size={14} />
                        </button>
                        {canActOnStatus(row.status) && (
                          <>
                            <button
                              type="button"
                              disabled={actionBusy}
                              onClick={() => handleApprove(row.id)}
                              title="Approve Request"
                              className="p-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                            <button
                              type="button"
                              disabled={actionBusy}
                              onClick={() => { setRejectModalRow(row); setRejectReason(''); }}
                              title="Reject Request"
                              className="p-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            Showing {rows.length} of {pagination.count} request{pagination.count === 1 ? '' : 's'} · Page {pagination.page} of {pagination.total_pages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft size={14} /> Prev
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-40 cursor-pointer"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* View Details Drawer */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg font-bold text-slate-900">
                  {detail ? detail.request_reference : 'Payment Request Details'}
                </h3>
                {detail && (
                  <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${STATUS_BADGES[detail.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {detail.status_display}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {detailLoading || !detail ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading request details...</div>
            ) : (
              <div className="p-6 space-y-6 text-xs">
                {/* Seller & Bank Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <User size={15} className="text-[#28452e]" />
                      Seller Information
                    </div>
                    <div className="space-y-1 text-slate-600">
                      <p><span className="text-slate-400">Seller:</span> {detail.seller_info.seller_name}</p>
                      <p><span className="text-slate-400">Shop:</span> {detail.seller_info.shop_name}</p>
                      <p><span className="text-slate-400">Email:</span> {detail.seller_info.email}</p>
                      <p><span className="text-slate-400">Phone:</span> {detail.seller_info.phone || '—'}</p>
                      <p><span className="text-slate-400">Account Status:</span> <strong>{detail.seller_info.account_status}</strong></p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <Landmark size={15} className="text-[#28452e]" />
                      Bank Information (Masked)
                    </div>
                    <div className="space-y-1 text-slate-600">
                      <p><span className="text-slate-400">Holder:</span> {detail.bank_info.account_holder || '—'}</p>
                      <p><span className="text-slate-400">Bank:</span> {detail.bank_info.bank_name}</p>
                      <p><span className="text-slate-400">Account:</span> <span className="font-mono">{detail.bank_info.masked_account_number}</span></p>
                      <p><span className="text-slate-400">IFSC:</span> <span className="font-mono">{detail.bank_info.ifsc_code || '—'}</span></p>
                      <p>
                        <span className="text-slate-400">Verification:</span>{' '}
                        <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-semibold ${BANK_STATUS_BADGES[detail.bank_info.verification_status] || 'bg-slate-100 text-slate-700'}`}>
                          {detail.bank_info.verification_status}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-slate-900">
                    <Building2 size={15} className="text-[#28452e]" />
                    Financial Information
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-[10px] text-slate-400">Available Balance</p>
                      <p className="font-mono font-bold text-slate-900 mt-0.5">{formatCurrency(detail.financial_info.available_balance)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-[10px] text-slate-400">Pending Earnings</p>
                      <p className="font-mono font-bold text-slate-900 mt-0.5">{formatCurrency(detail.financial_info.pending_earnings)}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-2.5">
                      <p className="text-[10px] text-emerald-700">Requested Amount</p>
                      <p className="font-mono font-bold text-[#28452e] mt-0.5">{formatCurrency(detail.financial_info.requested_amount)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-[10px] text-slate-400">Lifetime Earnings</p>
                      <p className="font-mono font-bold text-slate-900 mt-0.5">{formatCurrency(detail.financial_info.total_lifetime_earnings)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5">
                      <p className="text-[10px] text-slate-400">Prev. Withdrawals</p>
                      <p className="font-mono font-bold text-slate-900 mt-0.5">{formatCurrency(detail.financial_info.total_previous_withdrawals)}</p>
                    </div>
                  </div>
                </div>

                {/* Earnings Breakdown */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-slate-900 flex items-center gap-2">
                    <FileText size={14} className="text-[#28452e]" />
                    Recent Seller Earnings Breakdown
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500 bg-white">
                          <th className="py-2 px-3">Order</th>
                          <th className="py-2 px-3">Product</th>
                          <th className="py-2 px-3 text-right">Product Amt</th>
                          <th className="py-2 px-3 text-right">Commission</th>
                          <th className="py-2 px-3 text-right">Net Seller</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[11px]">
                        {detail.earnings_breakdown.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-slate-400">No paid order items recorded yet.</td>
                          </tr>
                        ) : (
                          detail.earnings_breakdown.map((eb, idx) => (
                            <tr key={`${eb.order_number}-${idx}`}>
                              <td className="py-2 px-3 font-mono text-slate-800">{eb.order_number}</td>
                              <td className="py-2 px-3 text-slate-600">{eb.quantity}x {eb.product_title}</td>
                              <td className="py-2 px-3 text-right font-mono">{formatCurrency(eb.product_value)}</td>
                              <td className="py-2 px-3 text-right font-mono text-red-600">-{formatCurrency(eb.commission_amount)}</td>
                              <td className="py-2 px-3 text-right font-mono font-semibold text-[#28452e]">{formatCurrency(eb.net_seller_earnings)}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Admin Note & Actions */}
                <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                  <label className="block font-semibold text-slate-900">Admin Internal Note</label>
                  <textarea
                    rows={2}
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    placeholder="Add internal review or verification notes..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-[#28452e]"
                  />
                  {detail.rejection_reason && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700">
                      <strong>Rejection Reason:</strong> {detail.rejection_reason}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => handleSaveReviewNote(detail.status === 'REQUESTED')}
                      className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer disabled:opacity-50"
                    >
                      {detail.status === 'REQUESTED' ? 'Place Under Review & Save Note' : 'Save Internal Note'}
                    </button>
                    {canActOnStatus(detail.status) && (
                      <>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => handleApprove(detail.id)}
                          className="px-4 py-2 rounded-xl bg-[#28452e] text-white font-semibold hover:bg-[#1f3724] cursor-pointer disabled:opacity-50"
                        >
                          Approve Request
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => { setRejectModalRow(detail); setRejectReason(''); }}
                          className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 cursor-pointer disabled:opacity-50"
                        >
                          Reject Request
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Audit History */}
                {detail.audit_history && detail.audit_history.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
                    <div className="flex items-center gap-2 font-semibold text-slate-900">
                      <Clock size={14} className="text-[#28452e]" />
                      Immutable Audit Trail
                    </div>
                    <div className="space-y-2">
                      {detail.audit_history.map((log) => (
                        <div key={log.id} className="border-l-2 border-[#28452e]/30 pl-3 py-0.5 text-[11px]">
                          <p className="font-semibold text-slate-800">{log.action} · {log.actor}</p>
                          <p className="text-slate-600">{log.reason}</p>
                          <p className="text-[10px] text-slate-400">{formatDateTime(log.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Mandatory Rejection Reason Modal */}
      {rejectModalRow && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <form onSubmit={handleRejectSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif text-lg font-bold text-slate-900">Reject Payment Request</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rejecting <strong>{rejectModalRow.request_reference}</strong> will release reserved funds back into the seller&apos;s available balance.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory Rejection Reason *
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why this withdrawal request is being rejected..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalRow(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionBusy}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
