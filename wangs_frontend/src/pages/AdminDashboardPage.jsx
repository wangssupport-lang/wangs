import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield, Users, Package, DollarSign, Settings,
  CheckCircle, XCircle, AlertCircle, TrendingUp, Search,
  FileText, ArrowRight, RefreshCw, Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';

export default function AdminDashboardPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics', 'manufacturers', 'products', 'orders', 'commission', 'settlements', 'logs'
  const [metrics, setMetrics] = useState(null);
  const [manufacturers, setManufacturers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [commissionData, setCommissionData] = useState(null);
  const [settlementData, setSettlementData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
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
      const [met, mfgs, prods, ords, comm, stl, logs] = await Promise.all([
        api.getAdminMetrics(),
        api.getAdminManufacturers(),
        api.getAdminProducts(),
        api.getAdminOrders(),
        api.getCommissionSettings(),
        api.getSettlements(),
        api.getAuditLogs(),
      ]);
      setMetrics(met);
      setManufacturers(mfgs || []);
      setProducts(prods || []);
      setOrders(ords || []);
      setCommissionData(comm);
      setSettlementData(stl);
      setAuditLogs(logs || []);

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
    if (!isAdmin) {
      navigate('/login');
      return;
    }
    loadAdminData();
  }, [isAdmin]);

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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-4 text-center">
        <div className="w-8 h-8 border-4 border-chilli-700 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-stone-500 mt-2">Loading admin operational controls...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Banner */}
      <div className="bg-forest-950 text-cream-50 p-6 sm:p-8 rounded-2xl shadow-md border border-forest-900 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="text-chilli-500" size={24} />
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white">
              Wangs Administration Console
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
          { id: 'manufacturers', label: `Manufacturers (${manufacturers.length})` },
          { id: 'products', label: `Catalog Moderation (${products.length})` },
          { id: 'orders', label: `Orders (${orders.length})` },
          { id: 'commission', label: 'Commission & Fees' },
          { id: 'settlements', label: 'Payout Settlements' },
          { id: 'logs', label: `Audit Trail (${auditLogs.length})` },
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-500 font-medium">Gross Merchandise Value (GMV)</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">₹{metrics?.gmv || '0.00'}</p>
              <span className="text-[10px] text-emerald-700 font-semibold">Total Customer Paid Orders</span>
            </div>

            <div className="bg-forest-900 text-white p-5 rounded-2xl border border-forest-800 shadow-sm">
              <span className="text-xs text-cream-300 font-medium">Platform Commission Revenue</span>
              <p className="text-2xl font-serif font-bold text-white mt-1">₹{metrics?.platform_commission_revenue || '0.00'}</p>
              <span className="text-[10px] text-cream-300">Deducted from seller gross</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-500 font-medium">Customer Platform Fees</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">₹{metrics?.customer_platform_fee_revenue || '0.00'}</p>
              <span className="text-[10px] text-stone-500">₹5.00 per order collection</span>
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
        </div>
      )}

      {/* Tab 2: Manufacturers */}
      {activeTab === 'manufacturers' && (
        <div className="space-y-4 text-xs">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-cream-100 border-b border-stone-200 text-stone-700">
                <tr>
                  <th className="p-3">Manufacturer Business</th>
                  <th className="p-3">Location & Contact</th>
                  <th className="p-3">FSSAI / GST</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Commission Rate</th>
                  <th className="p-3">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {manufacturers.map((m) => (
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
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        m.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {m.status}
                      </span>
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
                      <div className="flex gap-1.5">
                        {m.status !== 'APPROVED' && (
                          <button
                            onClick={() => handleApproveManufacturer(m.id, 'APPROVED')}
                            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded"
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
                {products.map((p) => (
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
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-cream-50/50">
                    <td className="p-3 font-mono font-bold text-stone-900">{ord.order_number}</td>
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
            {auditLogs.map((log) => (
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
    </div>
  );
}
