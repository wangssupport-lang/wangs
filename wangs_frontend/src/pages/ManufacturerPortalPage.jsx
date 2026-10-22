import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Store, Package, DollarSign, Clock, CheckCircle, AlertCircle,
  Plus, Edit, Eye, Filter, RefreshCw, Truck, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function ManufacturerPortalPage() {
  const { user, isManufacturer } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'products', 'orders', 'financials'
  const [profile, setProfile] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);

  // New product form modal state
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProd, setNewProd] = useState({
    title: '',
    category_id: '',
    short_description: '',
    description: '',
    price: '',
    mrp: '',
    weight_grams: '250',
    spice_level: 'HOT',
    dietary_type: 'NON_VEG',
    ingredients: '',
    allergens: 'May contain traces of mustard or fermented soybeans (Axone)',
    storage_instructions: 'Store in cool dry place. Keep submerged in oil.',
    shelf_life: '9 Months',
    stock_quantity: '20',
    primary_image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
  });

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
      setProfile(profData);
      setProducts(prodsData || []);
      setCategories(catsData || []);
      setOrders(ordsData || []);
      setFinancials(finData);
      if (catsData?.length && !newProd.category_id) {
        setNewProd((p) => ({ ...p, category_id: catsData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load manufacturer portal data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    loadData();
  }, [user]);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      await api.createManufacturerProduct(newProd);
      alert('Product created and submitted for Admin approval!');
      setShowAddProductModal(false);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to submit product');
    }
  };

  const handleUpdateFulfillment = async (orderItemId, newStatus) => {
    try {
      await api.updateFulfillmentStatus(orderItemId, newStatus);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to update fulfillment status');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-4 text-center">
        <div className="w-8 h-8 border-4 border-forest-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-stone-500 mt-2">Loading manufacturer workspace...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <h2 className="font-serif text-2xl font-bold text-stone-900">No Manufacturer Profile Found</h2>
        <p className="text-xs text-stone-500 mt-2">You need an approved seller application to access this dashboard.</p>
        <Link to="/manufacturer/register" className="mt-4 inline-block px-4 py-2 bg-forest-800 text-white rounded-lg text-xs font-semibold">
          Apply as Manufacturer
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Top Banner / Seller Status */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              {profile.business_name}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              profile.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
              profile.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
              'bg-red-100 text-red-800'
            }`}>
              {profile.status === 'APPROVED' ? '✓ Approved Seller' : `Status: ${profile.status}`}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            {profile.location_district} · FSSAI: {profile.fssai_license_number || 'Under Review'}
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="bg-cream-100 p-3 rounded-xl border border-stone-200">
            <span className="text-stone-500 block">Commission Rate</span>
            <span className="font-serif font-bold text-forest-900 text-sm">
              {profile.commission_rate_override || '10.00'}%
            </span>
          </div>

          {profile.status === 'APPROVED' && (
            <button
              onClick={() => setShowAddProductModal(true)}
              className="px-4 py-3 bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs rounded-xl shadow flex items-center gap-1.5 transition-colors"
            >
              <Plus size={15} /> Add New Pickle Batch
            </button>
          )}
        </div>
      </div>

      {profile.status === 'PENDING' && (
        <div className="mb-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-700 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Application Pending Review</p>
            <p className="mt-0.5 text-stone-600">
              Your business and FSSAI credentials have been submitted to Wangs platform administrators.
              Once verified, your listed pickles will go live on the customer marketplace.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-stone-200 mb-6 flex gap-6 text-xs font-semibold text-stone-600">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 border-b-2 transition-colors ${activeTab === 'overview' ? 'border-forest-800 text-forest-900 font-bold' : 'border-transparent hover:text-stone-900'}`}
        >
          Overview & Sales
        </button>
        <button
          onClick={() => setActiveTab('products')}
          className={`pb-3 border-b-2 transition-colors ${activeTab === 'products' ? 'border-forest-800 text-forest-900 font-bold' : 'border-transparent hover:text-stone-900'}`}
        >
          My Products ({products.length})
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 border-b-2 transition-colors ${activeTab === 'orders' ? 'border-forest-800 text-forest-900 font-bold' : 'border-transparent hover:text-stone-900'}`}
        >
          Fulfillment Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('financials')}
          className={`pb-3 border-b-2 transition-colors ${activeTab === 'financials' ? 'border-forest-800 text-forest-900 font-bold' : 'border-transparent hover:text-stone-900'}`}
        >
          Earnings & Settlements
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-500 font-medium">Gross Product Sales</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">₹{financials?.total_sales || '0.00'}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-500 font-medium">Commission Deducted ({profile.commission_rate_override || 10}%)</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">₹{financials?.total_commission_deducted || '0.00'}</p>
            </div>
            <div className="bg-forest-900 text-cream-50 p-5 rounded-xl border border-forest-800 shadow-sm">
              <span className="text-xs text-cream-300 font-medium">Net Producer Earnings</span>
              <p className="text-2xl font-serif font-bold text-white mt-1">₹{financials?.net_earnings || '0.00'}</p>
            </div>
            <div className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm">
              <span className="text-xs text-stone-500 font-medium">Active Products</span>
              <p className="text-2xl font-serif font-bold text-stone-900 mt-1">{products.filter((p) => p.status === 'APPROVED').length}</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900">Recent Customer Orders for Your Kitchen</h3>
            {orders.length === 0 ? (
              <p className="text-xs text-stone-500">No orders placed yet.</p>
            ) : (
              <div className="divide-y divide-stone-100 text-xs">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.order_item_id} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-stone-900">#{o.order_number} · {o.product_title}</p>
                      <p className="text-stone-500 text-[11px]">Qty: {o.quantity} · Destination: {o.shipping_city}, {o.shipping_state}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-stone-900 block">Net Payout: ₹{parseFloat(o.manufacturer_payout).toFixed(2)}</span>
                      <span className="text-[10px] text-forest-700 bg-forest-50 px-2 py-0.5 rounded font-semibold">
                        Fulfillment: {o.fulfillment_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Products */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-serif font-bold text-base text-stone-900">Product Listings</h3>
            {profile.status === 'APPROVED' && (
              <button
                onClick={() => setShowAddProductModal(true)}
                className="px-3 py-1.5 bg-forest-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Plus size={14} /> Add Product
              </button>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100 border-b border-stone-200 text-stone-700">
                <tr>
                  <th className="p-3">Product Title</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Weight</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Review Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-800">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-cream-50/50">
                    <td className="p-3 font-semibold text-stone-900">{p.title}</td>
                    <td className="p-3">{p.category?.name}</td>
                    <td className="p-3 font-bold">₹{parseFloat(p.price).toFixed(0)}</td>
                    <td className="p-3">{p.weight_grams}g</td>
                    <td className="p-3">
                      <span className={p.stock_quantity > 0 ? 'text-emerald-700 font-semibold' : 'text-red-500 font-bold'}>
                        {p.stock_quantity}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        p.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Orders Fulfillment */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <h3 className="font-serif font-bold text-base text-stone-900">Manage Item Packaging & Dispatch</h3>
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-cream-100 border-b border-stone-200 text-stone-700">
                <tr>
                  <th className="p-3">Order #</th>
                  <th className="p-3">Item</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Gross Subtotal</th>
                  <th className="p-3">Net Payout</th>
                  <th className="p-3">Fulfillment Status</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {orders.map((o) => (
                  <tr key={o.order_item_id} className="hover:bg-cream-50/50">
                    <td className="p-3 font-mono font-bold text-stone-900">{o.order_number}</td>
                    <td className="p-3 font-medium text-stone-900">{o.product_title}</td>
                    <td className="p-3">{o.quantity}</td>
                    <td className="p-3">₹{parseFloat(o.subtotal).toFixed(2)}</td>
                    <td className="p-3 font-bold text-forest-900">₹{parseFloat(o.manufacturer_payout).toFixed(2)}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-stone-100 text-[10px] font-bold text-stone-800">
                        {o.fulfillment_status}
                      </span>
                    </td>
                    <td className="p-3">
                      <select
                        value={o.fulfillment_status}
                        onChange={(e) => handleUpdateFulfillment(o.order_item_id, e.target.value)}
                        className="p-1 border border-stone-200 rounded text-xs focus:ring-1 focus:ring-forest-700 font-medium"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="PACKED">Packed</option>
                        <option value="DISPATCHED">Dispatched</option>
                        <option value="DELIVERED">Delivered</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Financials & Settlement */}
      {activeTab === 'financials' && (
        <div className="space-y-6 text-xs">
          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900">Producer Financial Snapshot</h3>
            <p className="text-stone-600 leading-relaxed max-w-2xl">
              Platform fees are strictly transparent. When an order is completed, 
              the standard marketplace commission ({financials?.effective_commission_rate}%) is deducted from product revenue, 
              and the remainder is held in compliant marketplace escrow until batch settlement.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">Total Product Sales</span>
                <span className="font-serif font-bold text-xl text-stone-950">₹{financials?.total_sales || '0.00'}</span>
              </div>
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200">
                <span className="text-stone-500 block">Platform Commission ({financials?.effective_commission_rate}%)</span>
                <span className="font-serif font-bold text-xl text-stone-950">₹{financials?.total_commission_deducted || '0.00'}</span>
              </div>
              <div className="p-4 bg-forest-50 rounded-xl border border-forest-200 text-forest-900">
                <span className="block text-forest-700 font-medium">Net Payable to Seller</span>
                <span className="font-serif font-bold text-2xl text-forest-900">₹{financials?.net_earnings || '0.00'}</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <h3 className="font-serif font-bold text-base text-stone-900">Settlement History</h3>
            {financials?.settlement_history?.length === 0 ? (
              <p className="text-stone-500">No settlement disbursements recorded yet. Accruals will be included in the next cycle batch.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {financials?.settlement_history?.map((s) => (
                  <div key={s.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-bold font-mono text-stone-900">{s.settlement_reference}</span>
                      <span className="text-stone-500 text-[11px] block">{s.period_start} to {s.period_end}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-stone-900">₹{parseFloat(s.net_payable).toFixed(2)}</span>
                      <span className="text-[10px] block font-semibold text-emerald-700">{s.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 space-y-4 my-8">
            <h3 className="font-serif font-bold text-lg text-stone-900">Add New Pickle Batch for Approval</h3>
            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-stone-700 font-medium mb-1">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={newProd.title}
                    onChange={(e) => setNewProd({ ...newProd, title: e.target.value })}
                    placeholder="e.g. Cured Smoked Pork Pickle"
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Category *</label>
                  <select
                    value={newProd.category_id}
                    onChange={(e) => setNewProd({ ...newProd, category_id: e.target.value })}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Dietary Type *</label>
                  <select
                    value={newProd.dietary_type}
                    onChange={(e) => setNewProd({ ...newProd, dietary_type: e.target.value })}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  >
                    <option value="NON_VEG">Non-Vegetarian (Meat)</option>
                    <option value="VEG">Vegetarian</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Selling Price (INR) *</label>
                  <input
                    type="number"
                    required
                    value={newProd.price}
                    onChange={(e) => setNewProd({ ...newProd, price: e.target.value })}
                    placeholder="e.g. 350"
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Net Weight (Grams) *</label>
                  <input
                    type="number"
                    required
                    value={newProd.weight_grams}
                    onChange={(e) => setNewProd({ ...newProd, weight_grams: e.target.value })}
                    placeholder="250"
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Heat / Spice Level *</label>
                  <select
                    value={newProd.spice_level}
                    onChange={(e) => setNewProd({ ...newProd, spice_level: e.target.value })}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  >
                    <option value="MILD">Mild</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HOT">Hot</option>
                    <option value="FIERY_KING_CHILLI">Fiery King Chilli (Raja Mircha)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Inventory Quantity in Stock *</label>
                  <input
                    type="number"
                    required
                    value={newProd.stock_quantity}
                    onChange={(e) => setNewProd({ ...newProd, stock_quantity: e.target.value })}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-stone-700 font-medium mb-1">Primary Image URL</label>
                  <input
                    type="url"
                    value={newProd.primary_image_url}
                    onChange={(e) => setNewProd({ ...newProd, primary_image_url: e.target.value })}
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-stone-700 font-medium mb-1">Ingredients Breakdown *</label>
                  <textarea
                    rows={2}
                    required
                    value={newProd.ingredients}
                    onChange={(e) => setNewProd({ ...newProd, ingredients: e.target.value })}
                    placeholder="e.g. Naga Pork, King Chilli, Axone, Mustard Oil, Rock Salt"
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-stone-700 font-medium mb-1">Detailed Description *</label>
                  <textarea
                    rows={3}
                    required
                    value={newProd.description}
                    onChange={(e) => setNewProd({ ...newProd, description: e.target.value, short_description: e.target.value.substring(0, 150) })}
                    placeholder="Describe traditional curing, wood smoke, aroma, serving suggestions..."
                    className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-stone-200">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-forest-800 text-white font-bold rounded-lg"
                >
                  Submit for Admin Approval
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="py-2.5 px-4 border border-stone-200 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
