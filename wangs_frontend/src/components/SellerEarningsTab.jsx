import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet, Clock, ArrowUpRight, CheckCircle2, Landmark,
  AlertCircle, ShieldCheck, RefreshCw, FileText, History
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

const WD_BADGES = {
  REQUESTED: 'bg-amber-50 text-amber-800 border-amber-200',
  UNDER_REVIEW: 'bg-sky-50 text-sky-800 border-sky-200',
  APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  PROCESSING: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  PAID: 'bg-[#28452e] text-white border-[#28452e]',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  FAILED: 'bg-rose-50 text-rose-800 border-rose-200',
  CANCELLED: 'bg-stone-100 text-stone-600 border-stone-200',
};

const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function SellerEarningsTab({ onGoToBankSettings }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadEarnings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getSellerEarnings();
      setData(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load earnings & withdrawals');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadEarnings();
  }, [loadEarnings]);

  const handleRequestWithdrawal = async (e) => {
    e.preventDefault();
    const num = Number(amount);
    const minWd = Number(data?.minimum_withdrawal_amount || 300);
    const avail = Number(data?.balances?.available_balance || 0);
    if (!num || num < minWd) {
      toast.error(`Minimum withdrawal amount is ₹${minWd.toFixed(2)}.`);
      return;
    }
    if (num > avail) {
      toast.error(`Requested amount exceeds available balance (${fmt(avail)}).`);
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.submitSellerWithdrawal({ amount: num.toFixed(2), seller_notes: notes });
      toast.success(res.message || 'Withdrawal request submitted!');
      setAmount('');
      setNotes('');
      await loadEarnings();
    } catch (err) {
      toast.error(err.message || 'Could not submit withdrawal request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center text-xs text-stone-500">
        Loading My Earnings &amp; Withdrawals...
      </div>
    );
  }

  const balances = data?.balances || {};
  const bankInfo = data?.bank_info || {};
  const minWd = Number(data?.minimum_withdrawal_amount || 300);
  const availableNum = Number(balances.available_balance || 0);
  const canWithdraw = availableNum >= minWd && bankInfo.is_bank_verified;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">My Earnings &amp; Withdrawals</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Track order earnings, return-period eligibility ({data?.return_period_days || 7} days), and request bank payouts (min ₹{minWd}).
          </p>
        </div>
        <button
          type="button"
          onClick={loadEarnings}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-200 bg-white text-stone-700 text-xs font-semibold hover:bg-stone-50 cursor-pointer self-start"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Sandbox Compliance Notice */}
      {data?.settlement_mode?.notice && (
        <div className="rounded-2xl border border-emerald-200 bg-[#28452e]/5 px-4 py-3 flex items-start gap-3">
          <ShieldCheck size={18} className="text-[#28452e] shrink-0 mt-0.5" />
          <p className="text-xs text-stone-700 leading-relaxed">{data.settlement_mode.notice}</p>
        </div>
      )}

      {/* 4 Main Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-[#28452e] text-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-emerald-200 text-[11px] font-semibold uppercase tracking-wider">
            <span>Available Balance</span>
            <Wallet size={16} />
          </div>
          <p className="text-2xl font-serif font-bold mt-2">{fmt(balances.available_balance)}</p>
          <p className="text-[11px] text-emerald-100/80 mt-1">Eligible for withdrawal (Min ₹{minWd})</p>
        </div>

        <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Pending Earnings</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-2">{fmt(balances.pending_earnings)}</p>
          <p className="text-[11px] text-stone-500 mt-1">In delivery / {data?.return_period_days || 7}-day return window</p>
        </div>

        <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Withdrawal Processing</span>
            <ArrowUpRight size={16} className="text-sky-600" />
          </div>
          <p className="text-2xl font-serif font-bold text-stone-900 mt-2">{fmt(balances.withdrawal_processing)}</p>
          <p className="text-[11px] text-stone-500 mt-1">Reserved for active requests</p>
        </div>

        <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-stone-400 text-[11px] font-semibold uppercase tracking-wider">
            <span>Total Withdrawn</span>
            <CheckCircle2 size={16} className="text-emerald-700" />
          </div>
          <p className="text-2xl font-serif font-bold text-emerald-800 mt-2">{fmt(balances.total_withdrawn)}</p>
          <p className="text-[11px] text-stone-500 mt-1">Lifetime: {fmt(balances.total_lifetime_earnings)}</p>
        </div>
      </div>

      {/* Request Withdrawal + Bank Details Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleRequestWithdrawal} className="lg:col-span-7 bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-stone-900">Request Withdrawal</h3>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700">
              Min ₹{minWd.toFixed(0)}
            </span>
          </div>

          {!bankInfo.is_bank_verified && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Bank &amp; KYC verification is required before requesting a withdrawal. Current status: <strong>{bankInfo.verification_status || 'PENDING'}</strong>.
                </span>
              </div>
              {onGoToBankSettings && (
                <button
                  type="button"
                  onClick={onGoToBankSettings}
                  className="shrink-0 underline font-semibold text-amber-900 cursor-pointer"
                >
                  Update Bank Details
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">Withdrawal Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                min={minWd}
                max={availableNum > 0 ? availableNum : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min ₹${minWd}`}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm font-mono focus:outline-none focus:border-[#28452e]"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                disabled={availableNum < minWd}
                onClick={() => setAmount(availableNum.toFixed(2))}
                className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-40 cursor-pointer"
              >
                Use Full Available ({fmt(availableNum)})
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">Notes for Admin (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional reference or payout note..."
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs focus:outline-none focus:border-[#28452e]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !canWithdraw}
            className="px-5 py-2.5 rounded-xl bg-[#28452e] text-white text-xs font-semibold hover:bg-[#1f3724] transition-colors disabled:opacity-40 cursor-pointer"
          >
            {submitting ? 'Submitting Request...' : 'Submit Withdrawal Request'}
          </button>
        </form>

        {/* Bank & Payment Account Summary */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-stone-200 p-6 space-y-3 shadow-xs text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-serif text-base font-bold text-stone-900">
              <Landmark size={16} className="text-[#28452e]" />
              Payment &amp; Bank Details
            </div>
            {onGoToBankSettings && (
              <button
                type="button"
                onClick={onGoToBankSettings}
                className="text-[11px] font-semibold text-[#28452e] hover:underline cursor-pointer"
              >
                Edit
              </button>
            )}
          </div>
          <div className="space-y-1.5 text-stone-600 pt-1">
            <p><span className="text-stone-400">Account Holder:</span> {bankInfo.account_holder || 'Not Set'}</p>
            <p><span className="text-stone-400">Bank Name:</span> {bankInfo.bank_name || 'Not Specified'}</p>
            <p><span className="text-stone-400">Account Number:</span> <span className="font-mono">{bankInfo.masked_account_number || 'Not Provided'}</span></p>
            <p><span className="text-stone-400">IFSC Code:</span> <span className="font-mono">{bankInfo.ifsc_code || '—'}</span></p>
            <p><span className="text-stone-400">Bank Verification:</span> <strong>{bankInfo.verification_status || 'PENDING'}</strong></p>
            <p><span className="text-stone-400">Razorpay Route Status:</span> <strong>{bankInfo.route_status || 'INCOMPLETE'}</strong></p>
          </div>
        </div>
      </div>

      {/* Withdrawal Request History */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center gap-2 font-serif text-base font-bold text-stone-900">
          <History size={16} className="text-[#28452e]" />
          Withdrawal Request History
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[700px]">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-[10px] uppercase tracking-wider text-stone-500">
                <th className="py-2.5 px-4">Request ID</th>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Payout Ref / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {(!data?.withdrawals || data.withdrawals.length === 0) ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400">No withdrawal requests submitted yet.</td>
                </tr>
              ) : (
                data.withdrawals.map((w) => (
                  <tr key={w.id}>
                    <td className="py-3 px-4 font-mono font-semibold text-stone-900">{w.request_reference}</td>
                    <td className="py-3 px-4 text-stone-500">{fmtDate(w.created_at)}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#28452e]">{fmt(w.requested_amount)}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${WD_BADGES[w.status] || 'bg-stone-100 text-stone-700'}`}>
                        {w.status_display || w.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-600">
                      {w.rejection_reason ? (
                        <span className="text-red-600">Rejected: {w.rejection_reason}</span>
                      ) : (
                        w.provider_payout_reference || w.seller_notes || '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order-Wise Earnings Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-stone-100 flex items-center gap-2 font-serif text-base font-bold text-stone-900">
          <FileText size={16} className="text-[#28452e]" />
          Order-Wise Earnings Breakdown
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[820px]">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-[10px] uppercase tracking-wider text-stone-500">
                <th className="py-2.5 px-4">Order #</th>
                <th className="py-2.5 px-4">Order Date</th>
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-4 text-right">Product Value</th>
                <th className="py-2.5 px-4 text-right">Wangs Commission</th>
                <th className="py-2.5 px-4 text-right">Delivery Alloc.</th>
                <th className="py-2.5 px-4 text-right">Net Earnings</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Eligible Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {(!data?.orders_breakdown || data.orders_breakdown.length === 0) ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-stone-400">No paid orders recorded yet.</td>
                </tr>
              ) : (
                data.orders_breakdown.map((o, idx) => (
                  <tr key={`${o.order_number}-${idx}`}>
                    <td className="py-2.5 px-4 font-mono font-semibold text-stone-900">{o.order_number}</td>
                    <td className="py-2.5 px-4 text-stone-500">{fmtDate(o.order_date)}</td>
                    <td className="py-2.5 px-4 text-stone-700">{o.quantity}x {o.product_title}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{fmt(o.product_value)}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-red-600">-{fmt(o.commission_amount)}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{fmt(o.delivery_allocation)}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[#28452e]">{fmt(o.net_seller_earnings)}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 text-[10px] font-semibold">
                        {o.earnings_status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-stone-500">{fmtDate(o.expected_eligibility_date)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
