import React, { useState, useEffect } from 'react';
import {
  Truck, ShieldCheck, AlertCircle, CheckCircle2, XCircle, Clock,
  Search, Filter, RefreshCw, UserCheck, Ban, RotateCcw, Eye,
  FileText, Phone, Mail, MapPin, ChevronRight, X, ExternalLink,
  Award, Activity, Calendar, ShieldAlert
} from 'lucide-react';
import { api } from '../api';
import { useToast } from '../context/ToastContext';

export default function AdminCouriersTab() {
  const toast = useToast();

  const [stats, setStats] = useState(null);
  const [couriers, setCouriers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected courier for profile/audit modal
  const [selectedCourier, setSelectedCourier] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Action Modals State
  const [actionModal, setActionModal] = useState(null); // { type: 'approve' | 'reject' | 'suspend' | 'assign', courier }
  const [actionNote, setActionNote] = useState('');
  const [assignOrderNumber, setAssignOrderNumber] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, couriersRes] = await Promise.all([
        api.getAdminCourierStats().catch(() => null),
        api.getAdminCouriers({
          status: statusFilter,
          search: searchQuery
        }).catch(() => [])
      ]);

      if (statsRes) setStats(statsRes);
      setCouriers(Array.isArray(couriersRes) ? couriersRes : (couriersRes?.results || []));
    } catch (err) {
      console.error('Failed to load courier management data:', err);
      toast.error('Failed to load couriers fleet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleOpenDetails = async (courier) => {
    setSelectedCourier(courier);
    setSelectedDetails(null);
    setLoadingDetails(true);
    try {
      const full = await api.getAdminCourierDetail(courier.id);
      setSelectedDetails(full);
    } catch (err) {
      console.warn('Could not load courier detail logs:', err);
      setSelectedDetails(courier);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleExecuteAction = async () => {
    if (!actionModal?.courier) return;
    const { type, courier } = actionModal;
    setSubmittingAction(true);
    try {
      if (type === 'approve') {
        await api.approveAdminCourier(courier.id, { admin_notes: actionNote });
        toast.success(`Courier ${courier.full_name} has been approved and notified!`);
      } else if (type === 'reject') {
        if (!actionNote.trim()) {
          toast.error('Please enter a rejection reason.');
          setSubmittingAction(false);
          return;
        }
        await api.rejectAdminCourier(courier.id, { reason: actionNote });
        toast.info(`Courier ${courier.full_name} has been rejected.`);
      } else if (type === 'suspend') {
        if (!actionNote.trim()) {
          toast.error('Please enter a reason for suspension.');
          setSubmittingAction(false);
          return;
        }
        await api.suspendAdminCourier(courier.id, { reason: actionNote });
        toast.warning(`Courier ${courier.full_name} has been suspended.`);
      } else if (type === 'reactivate') {
        await api.reactivateAdminCourier(courier.id);
        toast.success(`Courier ${courier.full_name} has been reactivated!`);
      } else if (type === 'assign') {
        if (!assignOrderNumber.trim()) {
          toast.error('Please enter an order number or AWB to assign.');
          setSubmittingAction(false);
          return;
        }
        await api.assignOrderToCourier(courier.id, { order_number: assignOrderNumber.trim() });
        toast.success(`Order ${assignOrderNumber.trim()} assigned to ${courier.full_name}!`);
      }

      setActionModal(null);
      setActionNote('');
      setAssignOrderNumber('');
      if (selectedCourier && selectedCourier.id === courier.id) {
        handleOpenDetails(courier);
      }
      loadData();
    } catch (err) {
      toast.error(err.message || 'Action failed. Please try again.');
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={12} /> Approved & Active
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <Clock size={12} /> Pending Approval
          </span>
        );
      case 'SUSPENDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
            <Ban size={12} /> Suspended
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-200 text-stone-700 border border-stone-300">
            <XCircle size={12} /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Couriers</span>
            <Truck size={16} className="text-purple-600" />
          </div>
          <p className="text-2xl font-black text-stone-900">{stats?.total_couriers ?? couriers.length}</p>
          <span className="text-[10px] text-stone-400">All registered agents</span>
        </div>

        <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Review</span>
            <Clock size={16} className="text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-900">{stats?.pending_couriers ?? 0}</p>
          <span className="text-[10px] text-amber-700 font-medium">Requires admin review</span>
        </div>

        <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Fleet</span>
            <ShieldCheck size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-900">{stats?.approved_couriers ?? 0}</p>
          <span className="text-[10px] text-emerald-700 font-medium">Approved delivery agents</span>
        </div>

        <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rejected</span>
            <XCircle size={16} className="text-stone-400" />
          </div>
          <p className="text-2xl font-black text-stone-800">{stats?.rejected_couriers ?? 0}</p>
          <span className="text-[10px] text-stone-400">Declined applications</span>
        </div>

        <div className="bg-red-50/70 rounded-2xl p-4 border border-red-200 shadow-xs">
          <div className="flex items-center justify-between text-red-700 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Suspended</span>
            <Ban size={16} className="text-red-500" />
          </div>
          <p className="text-2xl font-black text-red-900">{stats?.suspended_couriers ?? 0}</p>
          <span className="text-[10px] text-red-600">Access revoked</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Deliveries Done</span>
            <Award size={16} className="text-amber-500" />
          </div>
          <p className="text-2xl font-black text-stone-900">{stats?.total_deliveries_completed ?? 0}</p>
          <span className="text-[10px] text-stone-400">Total parcels delivered</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by agent name, mobile number, email, vehicle reg #..."
              className="w-full pl-9 pr-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-purple-900 hover:bg-purple-950 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-bold text-stone-500 shrink-0">Status:</span>
          {['', 'PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                statusFilter === st
                  ? 'bg-purple-900 text-white shadow-xs'
                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
              }`}
            >
              {st === '' ? 'All' : st}
            </button>
          ))}
          <button
            type="button"
            onClick={loadData}
            className="p-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Couriers List / Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-stone-500">
            <RefreshCw size={24} className="animate-spin mx-auto text-purple-600 mb-2" />
            <p className="text-xs font-medium">Loading courier fleet applications...</p>
          </div>
        ) : couriers.length === 0 ? (
          <div className="p-12 text-center text-stone-400 space-y-2">
            <Truck size={36} className="mx-auto text-stone-300" />
            <p className="text-sm font-bold text-stone-600">No Couriers Found</p>
            <p className="text-xs">No courier profiles match the selected status filter or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200 text-stone-500 uppercase tracking-wider font-mono text-[10px]">
                  <th className="py-3 px-4">Courier Agent</th>
                  <th className="py-3 px-4">Contact & Hub</th>
                  <th className="py-3 px-4">Vehicle</th>
                  <th className="py-3 px-4">Deliveries</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-sans">
                {couriers.map((courier) => (
                  <tr key={courier.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center font-bold font-serif text-sm border border-stone-200 shrink-0">
                          {courier.profile_photo ? (
                            <img src={courier.profile_photo} alt="" className="w-full h-full object-cover rounded-xl" />
                          ) : (
                            courier.full_name?.charAt(0) || 'C'
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-stone-900 text-sm">{courier.full_name}</p>
                          <p className="text-stone-500 text-[11px] font-mono">
                            {courier.courier_company || 'Independent Contractor'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 text-[11px] text-stone-600">
                        <div className="flex items-center gap-1 font-mono">
                          <Phone size={11} className="text-stone-400" />
                          <span>{courier.phone_number}</span>
                        </div>
                        <div className="flex items-center gap-1 text-stone-500">
                          <Mail size={11} className="text-stone-400" />
                          <span className="truncate max-w-[150px]">{courier.email}</span>
                        </div>
                        {courier.service_area_city && (
                          <div className="flex items-center gap-1 text-purple-700 font-medium">
                            <MapPin size={11} />
                            <span>{courier.service_area_city}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="inline-block px-2 py-0.5 bg-stone-100 rounded text-[10px] font-mono font-bold text-stone-800 uppercase">
                          {courier.vehicle_type || 'BIKE'}
                        </span>
                        <p className="text-[11px] font-mono font-bold text-stone-700">
                          {courier.vehicle_number || '—'}
                        </p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="font-bold text-stone-900">{courier.total_deliveries_completed || 0}</span>
                        <span className="text-[10px] text-stone-400 block">completed</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {getStatusBadge(courier.status)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetails(courier)}
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          View Details
                        </button>

                        {courier.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setActionModal({ type: 'approve', courier })}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => setActionModal({ type: 'reject', courier })}
                              className="px-2.5 py-1.5 rounded-lg bg-stone-200 hover:bg-red-100 text-stone-700 hover:text-red-700 font-bold text-[11px] transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {courier.status === 'APPROVED' && (
                          <>
                            <button
                              type="button"
                              onClick={() => setActionModal({ type: 'assign', courier })}
                              className="px-2 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] transition-colors cursor-pointer"
                              title="Assign an order to this courier"
                            >
                              Assign Order
                            </button>
                            <button
                              type="button"
                              onClick={() => setActionModal({ type: 'suspend', courier })}
                              className="px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] transition-colors cursor-pointer"
                              title="Suspend Courier"
                            >
                              Suspend
                            </button>
                          </>
                        )}

                        {courier.status === 'SUSPENDED' && (
                          <button
                            type="button"
                            onClick={() => setActionModal({ type: 'reactivate', courier })}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            Reactivate
                          </button>
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

      {/* Courier Details & Audit Modal */}
      {selectedCourier && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-stone-200 space-y-5 my-8">
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-900 flex items-center justify-center font-bold text-lg font-serif">
                  {selectedCourier.profile_photo ? (
                    <img src={selectedCourier.profile_photo} alt="" className="w-full h-full object-cover rounded-2xl" />
                  ) : (
                    selectedCourier.full_name?.charAt(0) || 'C'
                  )}
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-900">{selectedCourier.full_name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {getStatusBadge(selectedCourier.status)}
                    <span className="text-xs text-stone-500 font-mono">ID #{selectedCourier.id}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCourier(null)}
                className="p-1 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Profile Meta Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <div>
                <span className="text-stone-500 uppercase tracking-wider text-[10px] font-bold block mb-0.5">Phone Number</span>
                <span className="font-mono font-bold text-stone-900 text-sm">{selectedCourier.phone_number}</span>
              </div>
              <div>
                <span className="text-stone-500 uppercase tracking-wider text-[10px] font-bold block mb-0.5">Email Address</span>
                <span className="font-bold text-stone-900">{selectedCourier.email}</span>
              </div>
              <div>
                <span className="text-stone-500 uppercase tracking-wider text-[10px] font-bold block mb-0.5">Courier Organization</span>
                <span className="font-bold text-stone-800">{selectedCourier.courier_company || 'Independent Delivery Partner'}</span>
              </div>
              <div>
                <span className="text-stone-500 uppercase tracking-wider text-[10px] font-bold block mb-0.5">Vehicle Type & Plate</span>
                <span className="font-mono font-bold text-purple-900">
                  {selectedCourier.vehicle_type} — {selectedCourier.vehicle_number || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-stone-500 uppercase tracking-wider text-[10px] font-bold block mb-0.5">Service Hub City</span>
                <span className="font-bold text-stone-800">{selectedCourier.service_area_city || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-stone-500 uppercase tracking-wider text-[10px] font-bold block mb-0.5">Deliveries Completed</span>
                <span className="font-mono font-bold text-emerald-800">{selectedCourier.total_deliveries_completed || 0} parcels</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-stone-500 uppercase tracking-wider text-[10px] font-bold block mb-0.5">Address</span>
                <p className="text-stone-800">{selectedCourier.address || 'No physical address provided'}</p>
              </div>
            </div>

            {/* Identity Document / Proof */}
            {selectedCourier.identity_document && (
              <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-purple-700" />
                  <div>
                    <p className="text-xs font-bold text-purple-950">Identity Proof / Driver License Uploaded</p>
                    <p className="text-[10px] text-purple-700">Official document submitted during registration</p>
                  </div>
                </div>
                <a
                  href={selectedCourier.identity_document}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white text-purple-900 rounded-xl text-xs font-bold shadow-xs hover:bg-purple-100 flex items-center gap-1"
                >
                  <span>View Document</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}

            {/* Admin Notes / Rejection / Suspension Reason */}
            {selectedCourier.admin_notes && (
              <div className="p-3 bg-stone-100 rounded-xl text-xs text-stone-700">
                <span className="font-bold text-stone-900 block mb-0.5">Admin Notes:</span>
                {selectedCourier.admin_notes}
              </div>
            )}

            {selectedCourier.suspension_reason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                <span className="font-bold block mb-0.5">Suspension Reason:</span>
                {selectedCourier.suspension_reason}
              </div>
            )}

            {selectedCourier.rejection_reason && (
              <div className="p-3 bg-stone-100 border border-stone-200 rounded-xl text-xs text-stone-800">
                <span className="font-bold block mb-0.5">Rejection Reason:</span>
                {selectedCourier.rejection_reason}
              </div>
            )}

            {/* Recent Delivery & Scan Activity Logs */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Recent Delivery Scan Audit Logs
              </h4>
              {loadingDetails ? (
                <div className="p-4 text-center text-xs text-stone-400">Loading scan history...</div>
              ) : selectedDetails?.recent_scan_logs?.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-stone-200 divide-y divide-stone-100 text-xs">
                  {selectedDetails.recent_scan_logs.map((log) => (
                    <div key={log.id} className="p-2.5 flex items-center justify-between hover:bg-stone-50">
                      <div>
                        <span className="font-mono font-bold text-stone-900">{log.order_number || `Order #${log.order}`}</span>
                        <span className="text-[10px] text-stone-500 block">
                          Method: {log.confirmation_method || 'SCAN'} {log.notes ? `• ${log.notes}` : ''}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {log.action}
                        </span>
                        <span className="text-[10px] text-stone-400 block font-mono">
                          {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 italic">No delivery scan logs recorded yet for this courier agent.</p>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-2 flex items-center justify-between border-t border-stone-100">
              <button
                type="button"
                onClick={() => setSelectedCourier(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedCourier.status === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActionModal({ type: 'reject', courier: selectedCourier })}
                      className="px-4 py-2 bg-stone-200 hover:bg-red-100 text-stone-700 hover:text-red-700 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Reject Application
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionModal({ type: 'approve', courier: selectedCourier })}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      Approve & Activate
                    </button>
                  </>
                )}

                {selectedCourier.status === 'APPROVED' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActionModal({ type: 'assign', courier: selectedCourier })}
                      className="px-3.5 py-2 bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Assign Order
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionModal({ type: 'suspend', courier: selectedCourier })}
                      className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      Suspend Account
                    </button>
                  </>
                )}

                {selectedCourier.status === 'SUSPENDED' && (
                  <button
                    type="button"
                    onClick={() => setActionModal({ type: 'reactivate', courier: selectedCourier })}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    Reactivate Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Dialog Modal (Approve, Reject, Suspend, Assign) */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-serif text-lg font-bold text-stone-900 capitalize">
                {actionModal.type === 'approve' && 'Approve Courier Application'}
                {actionModal.type === 'reject' && 'Reject Courier Application'}
                {actionModal.type === 'suspend' && 'Suspend Courier Agent'}
                {actionModal.type === 'reactivate' && 'Reactivate Courier Agent'}
                {actionModal.type === 'assign' && 'Assign Parcel to Courier'}
              </h3>
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="text-stone-400 hover:text-stone-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Agent: <strong>{actionModal.courier?.full_name}</strong> ({actionModal.courier?.phone_number})
            </p>

            {actionModal.type === 'assign' ? (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  Order Number or AWB Identifier:
                </label>
                <input
                  type="text"
                  value={assignOrderNumber}
                  onChange={(e) => setAssignOrderNumber(e.target.value)}
                  placeholder="e.g. WNG-20261026-0060E5"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
                <p className="text-[10px] text-stone-500">
                  Assigning an order restricts delivery confirmation for this parcel specifically to this courier.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  {actionModal.type === 'approve' && 'On-boarding Notes (Optional):'}
                  {actionModal.type === 'reject' && 'Reason for Rejection (Required):'}
                  {actionModal.type === 'suspend' && 'Reason for Suspension (Required):'}
                  {actionModal.type === 'reactivate' && 'Reactivation Notes (Optional):'}
                </label>
                <textarea
                  rows={3}
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  placeholder={
                    actionModal.type === 'approve'
                      ? 'e.g. Identity verified, assigned to Kohima hub dispatch.'
                      : actionModal.type === 'reject'
                      ? 'e.g. Invalid vehicle documents or missing contact number.'
                      : 'e.g. Multiple failed delivery confirmations or policy violation.'
                  }
                  className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActionModal(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingAction}
                onClick={handleExecuteAction}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer ${
                  actionModal.type === 'reject' || actionModal.type === 'suspend'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {submittingAction ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
