import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck, Lock, CreditCard, CheckCircle, AlertCircle,
  ArrowRight, Truck, Smartphone, Building, RefreshCw
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function CheckoutPage() {
  const { cart, refreshCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    customer_name: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
    customer_email: user?.email || '',
    customer_phone: user?.phone_number || '',
    shipping_address_line1: '',
    shipping_address_line2: '',
    shipping_city: '',
    shipping_state: '',
    shipping_postal_code: '',
    coupon_code: '',
  });

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('RAZORPAY_TEST');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Payment processing modal state
  const [paymentStep, setPaymentStep] = useState(null); // 'MODAL', 'VERIFYING', 'SUCCESS', 'FAILED'
  const [pendingOrder, setPendingOrder] = useState(null);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [razorpayTab, setRazorpayTab] = useState('upi'); // 'upi', 'card', 'netbanking'

  useEffect(() => {
    if (user) {
      api.getAddresses().then((addrs) => {
        setSavedAddresses(addrs || []);
        const def = addrs?.find((a) => a.is_default) || addrs?.[0];
        if (def) {
          setFormData((prev) => ({
            ...prev,
            customer_name: def.full_name || prev.customer_name,
            customer_phone: def.phone || prev.customer_phone,
            shipping_address_line1: def.address_line1,
            shipping_address_line2: def.address_line2,
            shipping_city: def.city,
            shipping_state: def.state,
            shipping_postal_code: def.postal_code,
          }));
        }
      }).catch(console.error);
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectSavedAddress = (addr) => {
    setFormData((prev) => ({
      ...prev,
      customer_name: addr.full_name,
      customer_phone: addr.phone,
      shipping_address_line1: addr.address_line1,
      shipping_address_line2: addr.address_line2,
      shipping_city: addr.city,
      shipping_state: addr.state,
      shipping_postal_code: addr.postal_code,
    }));
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!cart?.items?.length) {
      setErrorMessage('Your basket is empty.');
      return;
    }

    if (!formData.customer_name || !formData.customer_email || !formData.customer_phone || !formData.shipping_address_line1 || !formData.shipping_city || !formData.shipping_state || !formData.shipping_postal_code) {
      setErrorMessage('Please fill in all required shipping address fields.');
      return;
    }

    setLoading(true);
    try {
      const orderPayload = {
        ...formData,
        payment_method: selectedPaymentMethod,
      };

      const res = await api.createOrder(orderPayload);
      setPendingOrder(res.order);
      setPaymentIntent(res.payment_intent);
      setPaymentStep('MODAL');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to initialize order.');
    } finally {
      setLoading(false);
    }
  };

  const simulatePaymentSuccess = async () => {
    setPaymentStep('VERIFYING');
    try {
      const verifyRes = await api.verifyPayment({
        order_number: pendingOrder.order_number,
        payment_id: `pay_${Math.random().toString(36).substring(2, 12)}`,
        razorpay_order_id: paymentIntent?.payment_order_id || 'order_mock',
        signature: 'sig_mock_verified',
      });

      await refreshCart();
      setPaymentStep('SUCCESS');
      setTimeout(() => {
        navigate(`/order-success/${pendingOrder.order_number}`);
      }, 1400);
    } catch (err) {
      setPaymentStep('FAILED');
      setErrorMessage('Payment verification error: ' + err.message);
    }
  };

  const simulatePaymentFailure = () => {
    setPaymentStep('FAILED');
    setErrorMessage('Simulated transaction failed or declined by card issuer. You can retry safely.');
  };

  const items = cart?.items || [];
  const summary = cart?.financial_summary || {
    items_subtotal: '0.00',
    customer_platform_fee: '5.00',
    delivery_fee: '0.00',
    total_amount: '0.00',
  };

  if (!items.length && !pendingOrder) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <h2 className="font-serif text-3xl font-bold text-stone-900">Your basket is empty</h2>
        <p className="text-xs text-stone-500">Add handcrafted pickles to proceed with checkout.</p>
        <Link to="/products" className="inline-block px-6 py-3 bg-forest-900 text-white text-xs font-bold rounded-xl shadow-md">
          Explore Pickles
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="mb-8">
        <span className="text-xs font-bold tracking-wider uppercase text-forest-700">Safe & Encrypted</span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-950 mt-1">Checkout & Delivery</h1>
        <p className="text-xs text-stone-500 mt-1">
          Direct dispatch from verified artisan producers in Kohima and Mokokchung.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2.5 shadow-sm">
          <AlertCircle size={17} className="flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Checkout Steps Form */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleCreateOrder} className="space-y-6">
            {/* 1. Customer Details */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-artisan space-y-4">
              <h2 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-forest-900 text-white text-xs flex items-center justify-center font-bold font-mono">1</span>
                <span>Contact Details</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-stone-700 font-bold mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    name="customer_name"
                    required
                    value={formData.customer_name}
                    onChange={handleChange}
                    placeholder="e.g. Moa Longkumer"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    name="customer_email"
                    required
                    value={formData.customer_email}
                    onChange={handleChange}
                    placeholder="e.g. moa@example.com"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800 font-medium"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-stone-700 font-bold mb-1.5">Mobile Phone Number (for delivery SMS) *</label>
                  <input
                    type="tel"
                    name="customer_phone"
                    required
                    minLength={10}
                    maxLength={15}
                    pattern="\+?[0-9\s()-]{10,15}"
                    value={formData.customer_phone}
                    onChange={handleChange}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 2. Shipping Address */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-artisan space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h2 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-forest-900 text-white text-xs flex items-center justify-center font-bold font-mono">2</span>
                  <span>Delivery Address</span>
                </h2>
                {savedAddresses.length > 0 && (
                  <span className="text-[11px] text-stone-500 font-medium">Quick select saved address below</span>
                )}
              </div>

              {/* Saved Address Pills */}
              {savedAddresses.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 pb-2">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => handleSelectSavedAddress(addr)}
                      className="px-3 py-1.5 bg-cream-100 hover:bg-forest-100 border border-stone-200 rounded-xl text-xs text-stone-800 font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Truck size={13} className="text-forest-700" />
                      <span>{addr.city} ({addr.postal_code})</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-stone-700 font-bold mb-1.5">Street Address, House No. *</label>
                  <input
                    type="text"
                    name="shipping_address_line1"
                    required
                    value={formData.shipping_address_line1}
                    onChange={handleChange}
                    placeholder="e.g. House No. 42, Ministers Hill"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800 font-medium"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-stone-700 font-bold mb-1.5">Apartment, Landmark, Ward (Optional)</label>
                  <input
                    type="text"
                    name="shipping_address_line2"
                    value={formData.shipping_address_line2}
                    onChange={handleChange}
                    placeholder="e.g. Near Kohima War Cemetery"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1.5">City / Town *</label>
                  <input
                    type="text"
                    name="shipping_city"
                    required
                    value={formData.shipping_city}
                    onChange={handleChange}
                    placeholder="e.g. Kohima or Dimapur"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1.5">State *</label>
                  <input
                    type="text"
                    name="shipping_state"
                    required
                    value={formData.shipping_state}
                    onChange={handleChange}
                    placeholder="e.g. Assam, Delhi, Karnataka"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-bold mb-1.5">PIN Code (6 digits) *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    pattern="[0-9]{6}"
                    name="shipping_postal_code"
                    required
                    value={formData.shipping_postal_code}
                    onChange={(e) => setFormData((prev) => ({
                      ...prev,
                      shipping_postal_code: e.target.value.replace(/\D/g, '').slice(0, 6),
                    }))}
                    placeholder="e.g. 797001"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800 font-mono font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 3. Payment Method */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-artisan space-y-4">
              <h2 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-forest-900 text-white text-xs flex items-center justify-center font-bold font-mono">3</span>
                  <span>Payment Gateway</span>
                </span>
                <span className="text-xs text-forest-800 font-bold flex items-center gap-1 bg-forest-50 px-2 py-0.5 rounded-full">
                  <Lock size={12} /> Test Sandbox Mode
                </span>
              </h2>

              <div className="space-y-3 text-xs">
                <label className="p-4 border-2 border-forest-800 rounded-2xl bg-forest-50/60 flex items-center justify-between cursor-pointer shadow-sm">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      checked={selectedPaymentMethod === 'RAZORPAY_TEST'}
                      onChange={() => setSelectedPaymentMethod('RAZORPAY_TEST')}
                      className="text-forest-900 focus:ring-forest-900"
                    />
                    <div>
                      <span className="font-bold text-stone-900 block text-sm">Razorpay Payment Gateway (Test Mode)</span>
                      <span className="text-stone-500 text-[11px]">Instant UPI (Google Pay, PhonePe, Paytm), Cards, Netbanking</span>
                    </div>
                  </div>
                  <CreditCard size={22} className="text-forest-800" />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-forest-900 hover:bg-forest-950 text-white font-bold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 hover:scale-101 active:scale-99"
            >
              {loading ? (
                <span>Calculating order and locking inventory...</span>
              ) : (
                <>
                  <span>Place Order & Pay ₹{parseFloat(summary.total_amount).toFixed(0)}</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-cream-100 p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-artisan space-y-5">
            <h3 className="font-serif font-bold text-lg text-stone-900 border-b border-stone-200/80 pb-3">
              Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
            </h3>

            <div className="max-h-72 overflow-y-auto divide-y divide-stone-200/60 pr-1">
              {items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.product.primary_image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=100&q=80'}
                      alt={item.product.title}
                      className="w-12 h-12 object-cover rounded-xl border border-stone-200 flex-shrink-0"
                    />
                    <div className="truncate">
                      <p className="font-bold text-stone-900 truncate">{item.product.title}</p>
                      <p className="text-[11px] text-stone-500">{item.product.weight_grams}g · Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-bold text-stone-950 whitespace-nowrap font-serif text-sm">
                    ₹{(parseFloat(item.product.price) * item.quantity).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Rule Breakdown per Section 6 */}
            <div className="space-y-2.5 pt-3 border-t border-stone-200 text-xs text-stone-700">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold text-stone-900">₹{parseFloat(summary.items_subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  Customer Platform Fee
                  <span className="text-[10px] text-stone-400 font-normal">(Escrow protection)</span>
                </span>
                <span className="font-bold text-stone-900">₹{parseFloat(summary.customer_platform_fee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span className="font-bold text-stone-900">
                  {parseFloat(summary.delivery_fee) === 0 ? (
                    <span className="text-emerald-700 font-black uppercase text-[10px]">Free</span>
                  ) : (
                    `₹${parseFloat(summary.delivery_fee).toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="border-t border-stone-200 pt-3 flex justify-between items-baseline text-sm font-bold text-stone-950">
                <span>Total Amount Payable</span>
                <span className="text-2xl font-serif font-black text-forest-950">₹{parseFloat(summary.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="p-4 bg-white/80 rounded-2xl border border-stone-200 text-[11px] text-stone-500 space-y-1.5 shadow-sm">
              <p className="flex items-center gap-1.5 font-bold text-stone-800">
                <ShieldCheck size={14} className="text-emerald-600" /> Compliant Marketplace Escrow
              </p>
              <p className="leading-relaxed">
                Manufacturer commission is securely accounted on the backend. Funds are held in escrow until courier dispatch verification.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Razorpay Test Modal Simulation */}
      {paymentStep && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-forest-950 via-forest-900 to-forest-950 text-cream-50 p-6 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-300">Razorpay Test Gateway</span>
                <h3 className="font-serif font-bold text-lg text-white">Wangs Artisanal Marketplace</h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-cream-300 block">Total Due</span>
                <span className="font-serif font-black text-xl text-white">₹{parseFloat(pendingOrder?.total_amount || summary.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {paymentStep === 'MODAL' && (
                <>
                  {/* Tabs for Payment Mode */}
                  <div className="grid grid-cols-3 bg-stone-100 p-1 rounded-xl text-xs font-bold text-stone-600">
                    <button
                      onClick={() => setRazorpayTab('upi')}
                      className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${razorpayTab === 'upi' ? 'bg-white text-stone-900 shadow-sm' : ''}`}
                    >
                      <Smartphone size={13} /> UPI
                    </button>
                    <button
                      onClick={() => setRazorpayTab('card')}
                      className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${razorpayTab === 'card' ? 'bg-white text-stone-900 shadow-sm' : ''}`}
                    >
                      <CreditCard size={13} /> Card
                    </button>
                    <button
                      onClick={() => setRazorpayTab('netbanking')}
                      className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 ${razorpayTab === 'netbanking' ? 'bg-white text-stone-900 shadow-sm' : ''}`}
                    >
                      <Building size={13} /> Netbanking
                    </button>
                  </div>

                  {/* Mode specific view */}
                  {razorpayTab === 'upi' && (
                    <div className="p-4 bg-cream-50 rounded-2xl border border-stone-200 text-xs space-y-2">
                      <p className="font-bold text-stone-800">Simulate UPI Payment:</p>
                      <div className="grid grid-cols-2 gap-2 text-center font-semibold">
                        <span className="p-2 bg-white rounded-lg border border-stone-200">Google Pay</span>
                        <span className="p-2 bg-white rounded-lg border border-stone-200">PhonePe</span>
                        <span className="p-2 bg-white rounded-lg border border-stone-200">Paytm UPI</span>
                        <span className="p-2 bg-white rounded-lg border border-stone-200">BHIM UPI</span>
                      </div>
                    </div>
                  )}

                  {razorpayTab === 'card' && (
                    <div className="p-4 bg-cream-50 rounded-2xl border border-stone-200 text-xs space-y-2">
                      <p className="font-bold text-stone-800">Simulate Credit/Debit Card:</p>
                      <p className="font-mono text-stone-600 bg-white p-2 rounded border border-stone-200">
                        Test Card: 4000 0000 0000 0002 · CVV: 123
                      </p>
                    </div>
                  )}

                  {razorpayTab === 'netbanking' && (
                    <div className="p-4 bg-cream-50 rounded-2xl border border-stone-200 text-xs space-y-2">
                      <p className="font-bold text-stone-800">Simulate Netbanking:</p>
                      <p className="text-stone-600">State Bank of India (SBI Kohima Main)</p>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={simulatePaymentSuccess}
                      className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle size={16} /> Simulate Successful Payment
                    </button>

                    <button
                      onClick={simulatePaymentFailure}
                      className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold text-xs rounded-xl transition-colors"
                    >
                      Simulate Payment Failure / Cancel
                    </button>
                  </div>
                </>
              )}

              {paymentStep === 'VERIFYING' && (
                <div className="py-10 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-forest-900 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-bold text-stone-900">Verifying signature with marketplace server...</p>
                  <p className="text-xs text-stone-500">Creating immutable financial transaction records.</p>
                </div>
              )}

              {paymentStep === 'SUCCESS' && (
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle size={32} />
                  </div>
                  <h4 className="font-serif font-bold text-xl text-stone-900">Payment Confirmed!</h4>
                  <p className="text-xs text-stone-500">Generating immutable receipt and order number...</p>
                </div>
              )}

              {paymentStep === 'FAILED' && (
                <div className="py-4 space-y-4">
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                    {errorMessage || 'Payment was declined or cancelled.'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentStep('MODAL')}
                      className="flex-1 py-2.5 bg-stone-900 text-white text-xs font-bold rounded-xl"
                    >
                      Retry Payment
                    </button>
                    <button
                      onClick={() => setPaymentStep(null)}
                      className="py-2.5 px-4 border border-stone-200 text-xs font-semibold rounded-xl"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
