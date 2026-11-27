import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Eye, RefreshCw, X, Landmark, FileText, History, Users
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

const fmt = (val) => `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AdminSellerEarningsTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({});
  const [sellers, setSellers] = useState([]);
  const [search, setSearch] = useState('');

  const [selectedSellerId, setSelectedSellerId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminSellerEarnings({ search });
      setSummary(res.summary || {});
      setSellers(Array.isArray(res.results) ? res.results : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load seller earnings');
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    const t = setTimeout(loadData, 180);
    return () => clearTimeout(t);
  }, [loadData]);

  const openSellerDetail = async (sellerId) => {
    setSelectedSellerId(sellerId);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await api.getAdminSellerEarningsDetail(sellerId);
      setDetail(res);
    } catch (err) {
      toast.error(err.message || 'Failed to load seller ledger');
      setSelectedSellerId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">Seller Earnings &amp; Payouts</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track how much each seller is earning, commission earned by Wangs, pending vs available balances, and total paid.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer self-start"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Total Sales</p>
          <p className="text-lg font-bold text-slate-900 mt-1 font-mono">{fmt(summary.total_sales)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Wangs Commission</p>
          <p className="text-lg font-bold text-amber-700 mt-1 font-mono">{fmt(summary.total_commission)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Pending Earnings</p>
          <p className="text-lg font-bold text-slate-900 mt-1 font-mono">{fmt(summary.total_pending)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Available Balances</p>
          <p className="text-lg font-bold text-emerald-700 mt-1 font-mono">{fmt(summary.total_available)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Processing</p>
          <p className="text-lg font-bold text-sky-700 mt-1 font-mono">{fmt(summary.total_processing)}</p>
        </div>
        <div className="bg-[#28452e] rounded-2xl border border-[#28452e] p-4 shadow-xs text-white">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200">Total Paid Out</p>
          <p className="text-lg font-bold mt-1 font-mono">{fmt(summary.total_paid)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search seller or shop name..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-[#28452e]"
            />
          </div>
          <span className="text-xs text-slate-500">{sellers.length} sellers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[980px] text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Seller / Shop</th>
                <th className="py-3 px-4 text-right">Orders</th>
                <th className="py-3 px-4 text-right">Total Sales</th>
                <th className="py-3 px-4 text-right">Wangs Comm.</th>
                <th className="py-3 px-4 text-right">Pending</th>
                <th className="py-3 px-4 text-right">Available</th>
                <th className="py-3 px-4 text-right">Processing</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">Loading seller earnings...</td>
                </tr>
              ) : sellers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">No sellers found.</td>
                </tr>
              ) : (
                sellers.map((s) => (
                  <tr key={s.seller_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900">{s.shop_name}</p>
                      <p className="text-[11px] text-slate-500">{s.seller_name} · {s.email}</p>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono">{s.orders_count}</td>
                    <td className="py-3.5 px-4 text-right font-mono">{fmt(s.total_sales)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-amber-700">{fmt(s.wangs_commission)}</td>
                    <td className="py-3.5 px-4 text-right font-mono">{fmt(s.pending_earnings)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700">{fmt(s.available_balance)}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-sky-700">{fmt(s.withdrawal_processing)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#28452e]">{fmt(s.total_withdrawn)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openSellerDetail(s.seller_id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:border-[#28452e] hover:text-[#28452e] cursor-pointer"
                      >
                        <Eye size={13} /> Ledger
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seller Ledger Drawer */}
      {selectedSellerId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white h-full overflow-y-auto shadow-2xl flex flex-col">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#28452e]" />
                <h3 className="font-serif text-lg font-bold text-slate-900">
                  {detail?.seller_info?.shop_name || 'Seller Financial Ledger'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSellerId(null)}
                className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {detailLoading || !detail ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading seller financial details...</div>
            ) : (
              <div className="p-6 space-y-6 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400">Lifetime Earned</p>
                    <p className="font-mono font-bold text-slate-900 mt-0.5">{fmt(detail.balances.total_lifetime_earnings)}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400">Pending</p>
                    <p className="font-mono font-bold text-slate-900 mt-0.5">{fmt(detail.balances.pending_earnings)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-[10px] text-emerald-700">Available</p>
                    <p className="font-mono font-bold text-emerald-800 mt-0.5">{fmt(detail.balances.available_balance)}</p>
                  </div>
                  <div className="bg-sky-50 rounded-xl p-3">
                    <p className="text-[10px] text-sky-700">Processing</p>
                    <p className="font-mono font-bold text-sky-800 mt-0.5">{fmt(detail.balances.withdrawal_processing)}</p>
                  </div>
                  <div className="bg-[#28452e] text-white rounded-xl p-3">
                    <p className="text-[10px] text-emerald-200">Total Paid</p>
                    <p className="font-mono font-bold mt-0.5">{fmt(detail.balances.total_withdrawn)}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 space-y-1.5">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1">
                    <Landmark size={14} className="text-[#28452e]" />
                    Bank Verification ({detail.bank_info.verification_status})
                  </div>
                  <p className="text-slate-600">{detail.bank_info.account_holder || '—'} · {detail.bank_info.bank_name} · <span className="font-mono">{detail.bank_info.masked_account_number}</span> ({detail.bank_info.ifsc_code || '—'})</p>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-semibold text-slate-900 flex items-center gap-2">
                    <FileText size={14} className="text-[#28452e]" />
                    Order Earnings
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-500">
                          <th className="py-2 px-3">Order</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3 text-right">Sales</th>
                          <th className="py-2 px-3 text-right">Comm.</th>
                          <th className="py-2 px-3 text-right">Net</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detail.orders_breakdown.length === 0 ? (
                          <tr><td colSpan={5} className="py-6 text-center text-slate-400">No paid orders yet.</td></tr>
                        ) : detail.orders_breakdown.map((o, idx) => (
                          <tr key={`${o.order_number}-${idx}`}>
                            <td className="py-2 px-3 font-mono">{o.order_number}</td>
                            <td className="py-2 px-3 text-slate-500">{fmtDate(o.order_date)}</td>
                            <td className="py-2 px-3 text-right font-mono">{fmt(o.product_value)}</td>
                            <td className="py-2 px-3 text-right font-mono text-red-600">-{fmt(o.commission_amount)}</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-[#28452e]">{fmt(o.net_seller_earnings)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 font-semibold text-slate-900 flex items-center gap-2">
                    <History size={14} className="text-[#28452e]" />
                    Immutable Financial Ledger
                  </div>
                  <div className="divide-y divide-slate-100">
                    {detail.ledger_entries.length === 0 ? (
                      <p className="py-6 text-center text-slate-400 text-[11px]">No ledger entries yet.</p>
                    ) : detail.ledger_entries.map((le) => (
                      <div key={le.id} className="px-4 py-2.5 flex items-center justify-between gap-2 text-[11px]">
                        <div>
                          <p className="font-semibold text-slate-800">{le.transaction_type_display}</p>
                          <p className="text-slate-500">{le.description} · {fmtDate(le.created_at)}</p>
                        </div>
                        <span className={`font-mono font-bold ${Number(le.signed_amount) < 0 ? 'text-red-600' : 'text-[#28452e]'}`}>
                          {Number(le.signed_amount) >= 0 ? '+' : ''}{fmt(le.signed_amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
