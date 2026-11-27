import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertCircle, CheckCircle2, XCircle, RefreshCw, Eye, X, MessageSquareWarning
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

const STATUS_BADGE = {
  SUBMITTED: 'bg-amber-50 text-amber-800 border-amber-200',
  UNDER_REVIEW: 'bg-sky-50 text-sky-800 border-sky-200',
  EVIDENCE_REQUESTED: 'bg-purple-50 text-purple-800 border-purple-200',
  REFUND_APPROVED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  REPLACEMENT_APPROVED: 'bg-teal-50 text-teal-800 border-teal-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  RESOLVED: 'bg-[#28452e] text-white border-[#28452e]',
};

export default function AdminComplaintsTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selected, setSelected] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getAdminComplaints(statusFilter);
      setRows(Array.isArray(res) ? res : []);
    } catch (err) {
      toast.error(err.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const handleAction = async (action) => {
    if (!selected) return;
    if (action === 'reject' && !reason.trim()) {
      toast.error('Please enter a mandatory rejection reason.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.actOnAdminComplaint(selected.id, {
        action,
        admin_notes: adminNotes,
        reason,
        refund_amount: refundAmount || selected.order_total,
      });
      toast.success(res.message || 'Complaint updated.');
      setSelected(null);
      await loadComplaints();
    } catch (err) {
      toast.error(err.message || 'Could not update complaint');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-900">Returns, Complaints &amp; Refunds</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review customer complaints individually, request evidence, approve auditable refunds or replacements, or reject with a reason.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="EVIDENCE_REQUESTED">Evidence Requested</option>
            <option value="REFUND_APPROVED">Refund Approved</option>
            <option value="REPLACEMENT_APPROVED">Replacement Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <button
            type="button"
            onClick={loadComplaints}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px] text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Complaint ID</th>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Product &amp; Issue</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">Loading complaints...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">No complaints found.</td></tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">{c.complaint_reference}</td>
                    <td className="py-3 px-4 font-mono">{c.order_number}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{c.customer_name}</p>
                      <p className="text-[11px] text-slate-500">{c.registered_email} · {c.contact_number}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{c.product_name}</p>
                      <p className="text-[11px] text-amber-700">{c.issue_category_display}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${STATUS_BADGE[c.status] || 'bg-slate-100'}`}>
                        {c.status_display}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setSelected(c);
                          setAdminNotes(c.admin_notes || '');
                          setReason(c.rejection_reason || '');
                          setRefundAmount(c.order_total || '');
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:border-[#28452e] hover:text-[#28452e] cursor-pointer"
                      >
                        <Eye size={13} /> Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquareWarning size={18} className="text-[#28452e]" />
                <h3 className="font-serif text-lg font-bold text-slate-900">{selected.complaint_reference}</h3>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="p-1.5 rounded-lg border border-slate-200 cursor-pointer">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-1.5 text-slate-600">
              <p><strong>Order:</strong> #{selected.order_number} (₹{selected.order_total})</p>
              <p><strong>Customer:</strong> {selected.customer_name} ({selected.registered_email} · {selected.contact_number})</p>
              <p><strong>Product:</strong> {selected.product_name} — <span className="text-amber-700 font-semibold">{selected.issue_category_display}</span></p>
              <p className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800">{selected.description}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Refund Amount (₹, if approving refund)</label>
                <input
                  type="number"
                  step="0.01"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason (Mandatory for Rejection)</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason for refund/rejection..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Admin Notes</label>
              <textarea
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button type="button" disabled={busy} onClick={() => handleAction('review')} className="px-3 py-2 rounded-xl border border-slate-200 font-semibold cursor-pointer">Under Review</button>
              <button type="button" disabled={busy} onClick={() => handleAction('request_evidence')} className="px-3 py-2 rounded-xl border border-purple-200 bg-purple-50 text-purple-800 font-semibold cursor-pointer">Request Evidence</button>
              <button type="button" disabled={busy} onClick={() => handleAction('approve_replacement')} className="px-3 py-2 rounded-xl border border-teal-200 bg-teal-50 text-teal-800 font-semibold cursor-pointer">Approve Replacement</button>
              <button type="button" disabled={busy} onClick={() => handleAction('approve_refund')} className="px-3 py-2 rounded-xl bg-[#28452e] text-white font-semibold cursor-pointer">Approve Refund</button>
              <button type="button" disabled={busy} onClick={() => handleAction('reject')} className="px-3 py-2 rounded-xl bg-red-600 text-white font-semibold cursor-pointer">Reject</button>
              <button type="button" disabled={busy} onClick={() => handleAction('resolve')} className="px-3 py-2 rounded-xl bg-slate-800 text-white font-semibold cursor-pointer">Mark Resolved</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
