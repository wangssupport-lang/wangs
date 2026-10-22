import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Lock, CreditCard, CheckCircle, AlertCircle, ArrowRight, Truck, Check } from 'lucide-react';
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
    shipping_state: 'Nagaland',
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

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!cart?.items?.length) {
      setErrorMessage('Your cart is empty.');
      return;
    }

    if (!formData.customer_name || !formData.customer_email || !formData.customer_phone || !formData.shipping_address_line1 || !formData.shipping_postal_code) {
      setErrorMessage('Please fill in all required contact and shipping address fields.');
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
      }, 1500);
    } catch (err) {
      setPaymentStep('FAILED');
      setErrorMessage('Payment verification error: ' + err.message);
    }
  };

  const simulatePaymentFailure = () => {
    setPaymentStep('FAILED');
    setErrorMessage('Simulated transaction failed or declined by card issuer. Please try again.');
  };

  const items = cart?.items || [];
  const summary = cart?.financial_summary || {
    items_subtotal: '0.00',
    customer_platform_fee: '5.00',
    delivery_fee: '50.00',
    total_amount: '0.00',
  };

  if (!items.length && !pendingOrder) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center">
        <h2 className="font-serif text-3xl font-bold text-stone-900">Your basket is empty</h2>
        <Link to="/products" className="mt-5 inline-block px-6 py-3 bg-forest-900 text-cream-50 text-xs font-bold rounded-xl shadow">
          Explore Naga Pickles
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
          Delivery & Payment
        </h1>
        <p className="text-xs text-stone-500 mt-1.5">
          Shipped directly from verified Naga artisanal producers in Kohima & Mokokchung.
        </p>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Checkout Form */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleCreateOrder} className="space-y-6">
            {/* Step 1: Contact Details */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200/80 shadow-subtle space-y-4">
              <h2 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-forest-900 text-cream-50 flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Customer Contact Information</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="customer_name"
                    required
                    value={formData.customer_name}
                    onChange={handleChange}
                    placeholder="e.g. Moa Longkumer"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    name="customer_email"
                    required
                    value={formData.customer_email}
                    onChange={handleChange}
                    placeholder="e.g. moa@example.com"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-stone-700 font-semibold mb-1">Mobile Phone (for courier delivery SMS) *</label>
                  <input
                    type="tel"
                    name="customer_phone"
                    required
                    value={formData.customer_phone}
                    onChange={handleChange}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Shipping Destination */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200/80 shadow-subtle space-y-4">
              <h2 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-forest-900 text-cream-50 flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Shipping Destination</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-stone-700 font-semibold mb-1">Street Address, House No. *</label>
                  <input
                    type="text"
                    name="shipping_address_line1"
                    required
                    value={formData.shipping_address_line1}
                    onChange={handleChange}
                    placeholder="e.g. House No. 42, Ministers Hill"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-stone-700 font-semibold mb-1">Apartment, Landmark, Ward (Optional)</label>
                  <input
                    type="text"
                    name="shipping_address_line2"
                    value={formData.shipping_address_line2}
                    onChange={handleChange}
                    placeholder="e.g. Near Kohima War Cemetery"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">City / Town *</label>
                  <input
                    type="text"
                    name="shipping_city"
                    required
                    value={formData.shipping_city}
                    onChange={handleChange}
                    placeholder="e.g. Kohima or Dimapur"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">State *</label>
                  <input
                    type="text"
                    name="shipping_state"
                    required
                    value={formData.shipping_state}
                    onChange={handleChange}
                    placeholder="e.g. Nagaland, Assam, Delhi"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">PIN Code (6 digits) *</label>
                  <input
                    type="text"
                    maxLength={6}
                    name="shipping_postal_code"
                    required
                    value={formData.shipping_postal_code}
                    onChange={handleChange}
                    placeholder="e.g. 797001"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Payment Method */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200/80 shadow-subtle space-y-4">
              <h2 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-forest-900 text-cream-50 flex items-center justify-center text-[10px] font-bold">3</span>
                  <span>Payment Gateway</span>
                </div>
                <span className="text-xs text-forest-700 font-semibold flex items-center gap-1">
                  <Lock size={12} /> Test Sandbox Mode
                </span>
              </h2>

              <div className="space-y-3 text-xs">
                <label className="p-4 border-2 border-forest-900 rounded-2xl bg-forest-50/60 flex items-center justify-between cursor-pointer">
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
                      <span className="text-stone-500 text-[11px]">UPI (Google Pay, PhonePe, Paytm), Netbanking, Debit & Credit Cards</span>
                    </div>
                  </div>
                  <CreditCard size={22} className="text-forest-900" />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-forest-900 hover:bg-forest-950 text-cream-50 font-bold text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Reserving inventory and initializing order...</span>
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
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-cream-100 p-7 rounded-3xl border border-stone-200 shadow-subtle space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-200/80 pb-3">
              Order Summary ({items.length} items)
            </h3>

            <div className="max-h-64 overflow-y-auto divide-y divide-stone-200/60 pr-1">
              {items.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.product.primary_image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=100&q=80'}
                      alt={item.product.title}
                      className="w-12 h-12 object-cover rounded-xl border border-stone-200/80 flex-shrink-0"
                    />
                    <div className="truncate">
                      <p className="font-bold text-stone-900 truncate">{item.product.title}</p>
                      <p className="text-[11px] text-stone-500">Qty: {item.quantity} · {item.product.weight_grams}g</p>
                    </div>
                  </div>
                  <span className="font-serif font-bold text-stone-950 whitespace-nowrap">
                    ₹{(parseFloat(item.product.price) * item.quantity).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Financial Breakdown per Section 6 */}
            <div className="space-y-2.5 pt-3 border-t border-stone-200 text-xs text-stone-700">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold text-stone-900">₹{parseFloat(summary.items_subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer Platform Fee</span>
                <span className="font-bold text-stone-900">₹{parseFloat(summary.customer_platform_fee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Standard Delivery Fee</span>
                <span className="font-bold text-stone-900">
                  {parseFloat(summary.delivery_fee) === 0 ? (
                    <span className="text-emerald-700 uppercase text-[10px] bg-emerald-100 px-2 py-0.5 rounded-full">Free</span>
                  ) : (
                    `₹${parseFloat(summary.delivery_fee).toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="border-t border-stone-200 pt-3 flex justify-between items-baseline text-sm font-bold text-stone-950">
                <span>Total Amount Payable</span>
                <span className="text-2xl font-serif text-forest-950">₹{parseFloat(summary.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="p-3.5 bg-white/80 rounded-2xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
              <p className="flex items-center gap-1.5 font-bold text-stone-900">
                <ShieldCheck size={14} className="text-emerald-700" /> Marketplace Escrow Protection
              </p>
              <p>Platform commissions are calculated on the backend and held in escrow until dispatch verification.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Razorpay Test Modal Simulation */}
      {paymentStep && (
        <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-forest-950 text-cream-50 p-6 flex items-center justify-between border-b border-forest-900">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300">Razorpay Test Gateway</span>
                <h3 className="font-serif font-bold text-xl text-white">Wangs Naga Marketplace</h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-cream-300 block">Amount Payable</span>
                <span className="font-bold text-xl text-white font-serif">₹{parseFloat(pendingOrder?.total_amount || summary.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <div className="p-6 sm:p-7 space-y-4">
              {paymentStep === 'MODAL' && (
                <>
                  <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-950 space-y-1">
                    <p className="font-bold">Development Test Mode Active</p>
                    <p className="text-stone-600">Order #{pendingOrder?.order_number} created with reserved inventory. Click below to simulate customer payment verification.</p>
                  </div>

                  <div className="space-y-2.5">
                    <button
                      onClick={simulatePaymentSuccess}
                      className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle size={15} /> Simulate Successful Payment (UPI / Card)
                    </button>

                    <button
                      onClick={simulatePaymentFailure}
                      className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold text-xs rounded-xl transition-colors"
                    >
                      Simulate Payment Failure / Decline
                    </button>
                  </div>
                </>
              )}

              {paymentStep === 'VERIFYING' && (
                <div className="py-10 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-forest-900 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-bold text-stone-900">Verifying signature with server...</p>
                  <p className="text-xs text-stone-500">Executing atomic order confirmation.</p>
                </div>
              )}

              {paymentStep === 'SUCCESS' && (
                <div className="py-8 text-center space-y-3">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle size={32} />
                  </div>
                  <h4 className="font-serif font-bold text-xl text-stone-900">Payment Confirmed!</h4>
                  <p className="text-xs text-stone-500">Redirecting to order confirmation receipt...</p>
                </div>
              )}

              {paymentStep === 'FAILED' && (
                <div className="py-4 space-y-4">
                  <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs">
                    {errorMessage || 'Payment was declined or cancelled.'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPaymentStep('MODAL')}
                      className="flex-1 py-2.5 bg-forest-900 text-white text-xs font-bold rounded-xl"
                    >
                      Retry Payment
                    </button>
                    <button
                      onClick={() => setPaymentStep(null)}
                      className="py-2.5 px-4 border border-stone-200 text-xs rounded-xl"
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
