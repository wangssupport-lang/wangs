import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Package, MapPin, Clock, CheckCircle, Plus, AlertCircle, LogOut, Trash2, Truck, Shield, ShieldCheck, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';

export default function CustomerAccountPage() {
  const { user, isAdmin, isManufacturer, isAuthorizedToSell, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'addresses', 'profile'
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Address form state
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddr, setNewAddr] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    is_default: false,
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    async function loadData() {
      try {
        const [ordData, addrData] = await Promise.all([
          api.getMyOrders(),
          api.getAddresses(),
        ]);
        // Handle both paginated and direct list responses
        setOrders(Array.isArray(ordData) ? ordData : (ordData?.results || []));
        setAddresses(Array.isArray(addrData) ? addrData : (addrData?.results || []));
      } catch (err) {
        console.error('Failed to load customer account data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const created = await api.createAddress(newAddr);
      setAddresses([...addresses, created]);
      setShowAddressModal(false);
      toast.success('Address saved successfully');
      setNewAddr({
        full_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        state: '',
        postal_code: '',
        is_default: false,
      });
    } catch (err) {
      toast.error(err.message || 'Failed to add address');
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Remove this delivery address?')) return;
    try {
      await api.deleteAddress(id);
      setAddresses(addresses.filter((a) => a.id !== id));
      toast.success('Address removed');
    } catch (err) {
      toast.error(err.message || 'Failed to remove address');
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-stone-200 pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold text-stone-900">
            Welcome, {user.first_name || user.username}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">{user.email} · Account Role: {user.role}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Track Orders Button */}
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-stone-900 text-white shadow-sm'
                : 'bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 hover:text-stone-900'
            }`}
          >
            <Package size={14} className={activeTab === 'orders' ? 'text-amber-400' : 'text-stone-400'} />
            <span>Track Orders</span>
          </button>

          {/* Seller Studio Button - ONLY visible if user is registered as a seller */}
          {isManufacturer && (
            <>
              <span className="hidden sm:inline-block h-4 w-px bg-stone-300" />
              <Link
                to="/manufacturer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-forest-950 text-amber-300 hover:bg-forest-900 font-bold text-xs shadow-xs transition-all active:scale-98"
              >
                <ShieldCheck size={14} className="text-amber-400" />
                <span>Seller Studio</span>
              </Link>
            </>
          )}

          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-stone-300 rounded-xl text-xs font-semibold text-stone-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors ml-1"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Navigation Tabs (Horizontal Scroll on Mobile, Sidebar on Desktop) */}
        <aside className="lg:col-span-3 flex lg:flex-col overflow-x-auto no-scrollbar gap-1.5 lg:space-y-1 text-xs pb-2 lg:pb-0">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'orders' ? 'bg-forest-900 text-white shadow-xs' : 'text-stone-700 bg-stone-100 lg:bg-transparent hover:bg-stone-200 lg:hover:bg-stone-100'
            }`}
          >
            <Package size={15} /> Track Orders ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'addresses' ? 'bg-forest-900 text-white shadow-xs' : 'text-stone-700 bg-stone-100 lg:bg-transparent hover:bg-stone-200 lg:hover:bg-stone-100'
            }`}
          >
            <MapPin size={15} /> Addresses ({addresses.length})
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-semibold transition-colors whitespace-nowrap shrink-0 ${
              activeTab === 'profile' ? 'bg-forest-900 text-white shadow-xs' : 'text-stone-700 bg-stone-100 lg:bg-transparent hover:bg-stone-200 lg:hover:bg-stone-100'
            }`}
          >
            <User size={15} /> Profile
          </button>

          {/* Seller Studio Sidebar Link - ONLY visible if user is registered as a seller */}
          {isManufacturer && (
            <div className="shrink-0 lg:pt-2">
              <Link
                to="/manufacturer"
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold bg-forest-950 text-amber-300 hover:bg-forest-900 transition-colors shadow-xs whitespace-nowrap"
              >
                <ShieldCheck size={15} className="text-amber-400" />
                <span>Seller Studio</span>
              </Link>
            </div>
          )}
        </aside>

        {/* Tab Content */}
        <div className="lg:col-span-9">
          {loading ? (
            <div className="py-12 text-center text-xs text-stone-500">Loading your account history...</div>
          ) : activeTab === 'orders' ? (
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center">
                  <Package size={32} className="text-stone-400 mx-auto mb-3" />
                  <h3 className="font-serif font-bold text-base text-stone-900">No orders placed yet</h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                    Taste authentic King Chilli, fermented bamboo shoot, and wild forest pickles.
                  </p>
                  <Link
                    to="/products"
                    className="mt-4 inline-block px-4 py-2 bg-forest-800 text-white text-xs font-semibold rounded-lg"
                  >
                    Browse Pickles
                  </Link>
                </div>
              ) : (
                orders.map((ord) => (
                  <div key={ord.id} className="bg-white rounded-2xl border border-stone-200 shadow-sm p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3 text-xs">
                      <div>
                        <span className="font-semibold text-stone-900 font-mono text-sm block">#{ord.order_number}</span>
                        <span className="text-stone-400">Placed on {new Date(ord.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          ord.payment_status === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          Payment: {ord.payment_status}
                        </span>
                        <span className="px-2.5 py-0.5 bg-forest-100 text-forest-800 rounded-full text-[11px] font-bold">
                          Status: {ord.status}
                        </span>
                      </div>
                    </div>

                    {/* Courier Tracking Status if Dispatched */}
                    {ord.tracking_number && (
                      <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Truck size={16} className="text-purple-700 flex-shrink-0" />
                          <div>
                            <span className="font-bold text-purple-950">
                              Shipped via {ord.courier_partner || 'Air Express'}
                            </span>
                            <span className="block font-mono text-stone-600 text-[11px]">
                              AWB Tracking Number: <strong>{ord.tracking_number}</strong>
                            </span>
                          </div>
                        </div>
                        {ord.dispatch_notes && (
                          <span className="text-[11px] text-purple-900 italic sm:text-right">
                            "{ord.dispatch_notes}"
                          </span>
                        )}
                      </div>
                    )}

                    {/* Order items snapshot */}
                    <div className="divide-y divide-stone-100 text-xs">
                      {ord.items?.map((item) => (
                        <div key={item.id} className="py-2.5 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-stone-900">{item.product_title}</p>
                            <p className="text-stone-500 text-[11px]">{item.weight_grams}g · Quantity: {item.quantity}</p>
                          </div>
                          <span className="font-semibold text-stone-900">₹{parseFloat(item.subtotal).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    {/* Fee Summary */}
                    <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div className="text-stone-500">
                        <span>Delivering to: <strong>{ord.shipping_city}, {ord.shipping_state} ({ord.shipping_postal_code})</strong></span>
                      </div>
                      <div className="text-right">
                        <span className="text-stone-500">Total Paid: </span>
                        <strong className="text-sm font-serif text-stone-950">₹{parseFloat(ord.total_amount).toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'addresses' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-serif font-bold text-base text-stone-900">Saved Shipping Addresses</h3>
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="px-3 py-1.5 bg-forest-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus size={14} /> Add New Address
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div key={addr.id} className="bg-white p-5 rounded-xl border border-stone-200 shadow-sm relative text-xs space-y-1">
                    {addr.is_default && (
                      <span className="absolute top-3 right-3 px-2 py-0.5 bg-forest-100 text-forest-800 font-bold rounded text-[10px]">
                        Default
                      </span>
                    )}
                    <h4 className="font-bold text-sm text-stone-900">{addr.full_name}</h4>
                    <p className="text-stone-500">Phone: {addr.phone}</p>
                    <p className="text-stone-700">{addr.address_line1}</p>
                    {addr.address_line2 && <p className="text-stone-700">{addr.address_line2}</p>}
                    <p className="text-stone-900 font-medium">{addr.city}, {addr.state} - {addr.postal_code}</p>
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="absolute bottom-3 right-3 p-1.5 text-stone-300 hover:text-chilli-700 transition-colors rounded-lg hover:bg-red-50"
                      title="Remove address"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Address Modal */}
              {showAddressModal && (
                <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
                    <h3 className="font-serif font-bold text-lg text-stone-900">Add New Shipping Address</h3>
                    <form onSubmit={handleAddAddress} className="space-y-3 text-xs">
                      <div>
                        <label className="block text-stone-700 font-medium mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={newAddr.full_name}
                          onChange={(e) => setNewAddr({ ...newAddr, full_name: e.target.value })}
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-700 font-medium mb-1">Phone Number</label>
                        <input
                          type="tel"
                          required
                          value={newAddr.phone}
                          onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-700 font-medium mb-1">Address Line 1</label>
                        <input
                          type="text"
                          required
                          value={newAddr.address_line1}
                          onChange={(e) => setNewAddr({ ...newAddr, address_line1: e.target.value })}
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-stone-700 font-medium mb-1">City</label>
                          <input
                            type="text"
                            required
                            value={newAddr.city}
                            onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                            className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block text-stone-700 font-medium mb-1">State</label>
                          <input
                            type="text"
                            required
                            value={newAddr.state}
                            onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value })}
                            className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-stone-700 font-medium mb-1">PIN Code (6 digits)</label>
                        <input
                          type="text"
                          maxLength={6}
                          required
                          value={newAddr.postal_code}
                          onChange={(e) => setNewAddr({ ...newAddr, postal_code: e.target.value })}
                          className="w-full px-3 py-1.5 border border-stone-200 rounded-lg"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          type="submit"
                          className="flex-1 py-2 bg-forest-800 text-white rounded-lg font-semibold"
                        >
                          Save Address
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAddressModal(false)}
                          className="py-2 px-3 border border-stone-200 rounded-lg"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4 text-xs">
              <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-2">
                Personal Profile Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <span className="text-stone-500 block">Username</span>
                  <span className="font-semibold text-stone-900">{user.username}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Email Address</span>
                  <span className="font-semibold text-stone-900">{user.email}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Contact Phone</span>
                  <span className="font-semibold text-stone-900">{user.phone_number || 'Not added'}</span>
                </div>
                <div>
                  <span className="text-stone-500 block">Account Role</span>
                  <span className="font-semibold text-forest-800">{user.role}</span>
                </div>
              </div>

              {isManufacturer && (
                <div className="mt-4 p-4 rounded-xl bg-forest-950 text-cream-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                      <ShieldCheck size={14} className="text-amber-400" />
                      <span>Seller Studio Hub</span>
                    </div>
                    <p className="text-[11px] text-stone-300">
                      Access your artisanal catalog, orders, and sales metrics.
                    </p>
                  </div>
                  <Link
                    to="/manufacturer"
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-forest-950 font-bold text-xs shadow transition-all whitespace-nowrap active:scale-95 self-start sm:self-center"
                  >
                    <span>Open Studio</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
