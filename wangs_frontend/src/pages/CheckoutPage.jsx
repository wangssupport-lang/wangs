import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck, Check, AlertCircle, ShoppingBag, Trash2, Plus, Minus
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { resolveProductImage } from '../utils/image';

export default function CheckoutPage() {
  const { cart, refreshCart, removeFromCart, updateQuantity } = useCart();
  const { user, requireAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({
    customer_name: user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
    customer_email: user?.email || '',
    customer_phone: user?.phone_number || '',
    shipping_address_line1: '',
    shipping_city: 'Kohima',
    shipping_state: 'Nagaland',
    shipping_postal_code: '',
  });

  // Payment radio options: 'UPI', 'CARD', 'COD'
  const [paymentOption, setPaymentOption] = useState('UPI');
  const [deliveryMethod, setDeliveryMethod] = useState('STANDARD');
  const [sameDayQuote, setSameDayQuote] = useState({ checking: false, eligible: false, reason: '' });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [pendingOrder, setPendingOrder] = useState(null);

  const goToOrderSuccess = (orderNum, orderObj = null) => {
    const email = (
      orderObj?.customer_email ||
      pendingOrder?.customer_email ||
      formData.customer_email ||
      user?.email ||
      ''
    ).trim();
    if (email) {
      try {
        sessionStorage.setItem('wangs_last_order_verify', email);
        sessionStorage.setItem(`order_verify_${orderNum}`, email);
      } catch (e) {}
    }
    navigate(`/order-success/${orderNum}${email ? `?verify=${encodeURIComponent(email)}` : ''}`);
  };

  // Handle return redirect from Cashfree PG
  useEffect(() => {
    const returnOrderNumber = searchParams.get('order_number') || searchParams.get('order_id');
    const returnCfOrderId = searchParams.get('cf_order_id');
    if (returnOrderNumber) {
      api.checkCashfreeStatus(returnOrderNumber).then(async (res) => {
        if (res.payment_status === 'PAID') {
          await refreshCart();
          setTimeout(() => {
            goToOrderSuccess(returnOrderNumber);
          }, 800);
        } else {
          try {
            await api.verifyPayment({
              order_number: returnOrderNumber,
              cf_order_id: returnCfOrderId,
            });
            await refreshCart();
            setTimeout(() => {
              goToOrderSuccess(returnOrderNumber);
            }, 800);
          } catch (e) {
            setErrorMessage('Payment pending confirmation. If debited, your order will confirm automatically.');
          }
        }
      }).catch((e) => {
        setErrorMessage('Unable to verify transaction: ' + e.message);
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      api.getAddresses().then((addrs) => {
        const def = addrs?.find((a) => a.is_default) || addrs?.[0];
        if (def) {
          setFormData((prev) => ({
            ...prev,
            customer_name: def.full_name || prev.customer_name,
            customer_phone: def.phone || prev.customer_phone,
            shipping_address_line1: def.address_line1,
            shipping_city: def.city || 'Kohima',
            shipping_state: def.state || 'Nagaland',
            shipping_postal_code: def.postal_code,
          }));
        }
      }).catch(console.error);
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const items = cart?.items || [];
  const summary = cart?.financial_summary || {
    items_subtotal: '0.00',
    delivery_fee: '0.00',
    total_amount: '0.00',
  };

  useEffect(() => {
    const pin = (formData.shipping_postal_code || '').trim();
    const city = (formData.shipping_city || '').trim();
    if (!items.length || (pin.length < 6 && !city)) {
      setSameDayQuote({ checking: false, eligible: false, reason: '' });
      return;
    }
    let cancelled = false;
    setSameDayQuote((prev) => ({ ...prev, checking: true }));
    api.getShippingQuote({
      postal_code: pin,
      city,
      state: formData.shipping_state || '',
      delivery_method: 'SAME_DAY',
    })
      .then((q) => {
        if (cancelled) return;
        setSameDayQuote({
          checking: false,
          eligible: Boolean(q?.same_day_eligible),
          reason: q?.same_day_reason || '',
        });
      })
      .catch(() => {
        if (!cancelled) {
          setSameDayQuote({ checking: false, eligible: false, reason: '' });
        }
      });
    return () => { cancelled = true; };
  }, [items.length, formData.shipping_postal_code, formData.shipping_city, formData.shipping_state]);

  const itemsSubtotal = parseFloat(summary.items_subtotal) || 0;
  const deliveryFee = parseFloat(summary.delivery_fee) || 0;
  const totalAmount = Math.max(0, itemsSubtotal + deliveryFee);

  const getPastelColor = (title = '', cat = '') => {
    const text = (title + ' ' + cat).toLowerCase();
    if (text.includes('chilli') || text.includes('hot') || text.includes('bhoot')) {
      return { bg: 'bg-[#fde8e8]', jar: '#b93822' };
    }
    if (text.includes('bamboo') || text.includes('veg') || text.includes('green')) {
      return { bg: 'bg-[#e2ede2]', jar: '#496e4c' };
    }
    if (text.includes('pork') || text.includes('meat') || text.includes('smoked') || text.includes('beef')) {
      return { bg: 'bg-[#f7ebd2]', jar: '#c87820' };
    }
    return { bg: 'bg-[#ede6dc]', jar: '#7a4e32' };
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!user) {
      requireAuth(() => {}, 'proceed with your order');
      return;
    }

    if (!items.length) {
      setErrorMessage('Your cart is empty.');
      return;
    }

    if (!formData.customer_name || !formData.customer_phone || !formData.shipping_address_line1 || !formData.shipping_postal_code) {
      setErrorMessage('Please fill in your Name, Phone, Address, and PIN code.');
      return;
    }

    setLoading(true);
    try {
      const paymentMethodBackend = paymentOption === 'COD' ? 'COD' : 'RAZORPAY';
      const orderPayload = {
        ...formData,
        customer_email: formData.customer_email || user.email || 'customer@wangs.in',
        payment_method: paymentMethodBackend,
        shipping_city: formData.shipping_city || 'Kohima',
        shipping_state: formData.shipping_state || 'Nagaland',
        shipping_delivery_method: deliveryMethod,
      };

      if (deliveryMethod === 'SAME_DAY' && !sameDayQuote.eligible) {
        setErrorMessage(sameDayQuote.reason || 'Same-day delivery is not eligible for this address or cart.');
        setLoading(false);
        return;
      }

      const res = await api.createOrder(orderPayload);
      setPendingOrder(res.order);

      if (paymentOption === 'COD') {
        await refreshCart();
        goToOrderSuccess(res.order.order_number, res.order);
        return;
      }

      // Razorpay Standard Checkout (Live / Test keys)
      const rawIntent = res.payment_intent || {};
      const intent = { ...rawIntent, ...(rawIntent.checkout_data || {}) };
      const rzpOrderId = intent.razorpay_order_id || intent.payment_order_id;
      if (rzpOrderId && !intent.is_simulated) {
        if (!window.Razorpay) {
          setErrorMessage('Razorpay Checkout SDK could not load. Please refresh and try again.');
          return;
        }
        const rzp = new window.Razorpay({
          key: intent.key_id,
          amount: intent.amount_paise,
          currency: intent.currency || 'INR',
          name: intent.name || 'Wangs Marketplace',
          description: intent.description || `Order #${res.order.order_number}`,
          order_id: rzpOrderId,
          prefill: intent.prefill || {
            name: customerName,
            email: customerEmail,
            contact: customerPhone,
          },
          config: {
            display: {
              hide: [{ method: 'emi' }],
            },
          },
          theme: { color: '#28452e' },
          handler: async (rpResponse) => {
            try {
              await api.verifyPayment({
                order_number: res.order.order_number,
                payment_id: rpResponse.razorpay_payment_id,
                razorpay_payment_id: rpResponse.razorpay_payment_id,
                razorpay_order_id: rpResponse.razorpay_order_id,
                signature: rpResponse.razorpay_signature,
                razorpay_signature: rpResponse.razorpay_signature,
              });
              await refreshCart();
              goToOrderSuccess(res.order.order_number, res.order);
            } catch (err) {
              setErrorMessage('Payment verification failed: ' + (err.message || 'Please contact support.'));
            }
          },
          modal: {
            ondismiss: () => {
              setErrorMessage('Payment was cancelled before completion. Your order is saved as pending.');
            },
          },
        });
        rzp.on('payment.failed', (failResp) => {
          setErrorMessage(failResp?.error?.description || 'Payment failed. Please try again.');
        });
        rzp.open();
      } else if (intent.is_simulated && rzpOrderId) {
        // Local placeholder-key sandbox confirmation
        await api.verifyPayment({
          order_number: res.order.order_number,
          razorpay_order_id: rzpOrderId,
          payment_id: `pay_test_${Date.now()}`,
          signature: 'sig_simulated',
        });
        await refreshCart();
        goToOrderSuccess(res.order.order_number, res.order);
      } else {
        setErrorMessage('Payment gateway could not initialize. Please try again.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Could not place order. Please verify details.');
    } finally {
      setLoading(false);
    }
  };

  if (!items.length && !pendingOrder) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-3xl font-bold text-stone-900">Your cart is empty</h2>
        <p className="text-stone-600 text-sm">Add handcrafted pickles to your cart to proceed.</p>
        <Link
          to="/"
          className="inline-block px-7 py-3 bg-[#ab331c] hover:bg-[#962c17] text-white rounded-full text-xs font-semibold transition-colors"
        >
          Explore Pickles
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-stone-500">
        <Link to="/" className="hover:text-stone-900 transition-colors">Home</Link>
        <span className="text-stone-400">/</span>
        <span className="text-stone-900 font-semibold">Cart &amp; checkout</span>
      </nav>

      {/* Main Title */}
      <div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
          Your cart
        </h1>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2.5 shadow-xs">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2-Column Cart & Checkout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Cart Items + Delivery Details */}
        <div className="lg:col-span-7 space-y-6">
          {/* Cart Items List */}
          <div className="space-y-3">
            {items.map((item) => {
              const pastel = getPastelColor(item.product?.title, item.product?.category?.name);
              const makerName = item.product?.manufacturer?.business_name || 'Apeno Kikon';
              const weightStr = item.product?.weight_grams ? `${item.product.weight_grams} g` : '250 g';

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs flex items-center justify-between gap-3 sm:gap-4 transition-all hover:border-stone-300"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    {/* Pastel Jar Thumbnail */}
                    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl ${pastel.bg} shrink-0 flex items-center justify-center p-2 overflow-hidden`}>
                      {item.product?.primary_image_url ? (
                        <img
                          src={resolveProductImage(item.product.primary_image_url)}
                          alt={item.product.title}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-6 h-9 rounded-md shadow-2xs" style={{ backgroundColor: pastel.jar }} />
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <Link
                        to={`/product/${item.product?.slug}`}
                        className="font-bold text-xs sm:text-sm text-stone-900 hover:text-[#ab331c] transition-colors truncate block"
                      >
                        {item.product?.title}
                      </Link>
                      <p className="text-[11px] sm:text-xs text-stone-500 truncate mt-0.5">
                        {weightStr} · {makerName} · Qty {item.quantity}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-[11px] sm:text-xs text-[#ab331c] hover:underline font-medium mt-1 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    <span className="font-serif font-bold text-base text-stone-900">
                      ₹{(parseFloat(item.product?.price || 0) * item.quantity).toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Delivery Details Card */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-xs space-y-4">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
              Delivery details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Full name
                </label>
                <input
                  type="text"
                  name="customer_name"
                  required
                  value={formData.customer_name}
                  onChange={handleChange}
                  placeholder="e.g. Sentila or Rahul"
                  className="w-full px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#ab331c]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  required
                  value={formData.customer_phone}
                  onChange={handleChange}
                  placeholder="10-digit mobile number"
                  className="w-full px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#ab331c]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  name="shipping_address_line1"
                  required
                  value={formData.shipping_address_line1}
                  onChange={handleChange}
                  placeholder="House / Flat, Street, Area"
                  className="w-full px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#ab331c]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  PIN code
                </label>
                <input
                  type="text"
                  name="shipping_postal_code"
                  required
                  maxLength={6}
                  value={formData.shipping_postal_code}
                  onChange={handleChange}
                  placeholder="6-digit Indian PIN"
                  className="w-full px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#ab331c]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Town / City
                  </label>
                  <input
                    type="text"
                    name="shipping_city"
                    required
                    value={formData.shipping_city}
                    onChange={handleChange}
                    placeholder="e.g. Kohima"
                    className="w-full px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#ab331c]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    name="shipping_state"
                    required
                    value={formData.shipping_state}
                    onChange={handleChange}
                    placeholder="e.g. Nagaland"
                    className="w-full px-4 py-2.5 bg-white border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#ab331c]"
                  />
                </div>
              </div>

              {/* Delivery Speed Selector */}
              <div className="pt-2 space-y-2">
                <label className="block text-xs font-medium text-stone-600">
                  Delivery Speed
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('STANDARD')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      deliveryMethod === 'STANDARD'
                        ? 'border-[#28452e] bg-emerald-50/60 font-bold text-stone-900'
                        : 'border-stone-200 bg-white text-stone-700'
                    }`}
                  >
                    <p className="font-bold">Standard Delivery</p>
                    <p className="text-[11px] font-normal text-stone-500 mt-0.5">Regular courier dispatch</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('SAME_DAY')}
                    className={`p-3 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      deliveryMethod === 'SAME_DAY'
                        ? 'border-[#ab331c] bg-[#fbf2ec] font-bold text-stone-900'
                        : 'border-stone-200 bg-white text-stone-700'
                    }`}
                  >
                    <p className="font-bold text-[#ab331c]">Get It Today (Same-Day)</p>
                    <p className="text-[11px] font-normal text-stone-500 mt-0.5">
                      {sameDayQuote.checking
                        ? 'Checking eligibility...'
                        : sameDayQuote.eligible
                          ? 'Eligible for your location'
                          : 'Checks local seller & cutoff'}
                    </p>
                  </button>
                </div>
                {deliveryMethod === 'SAME_DAY' && !sameDayQuote.checking && !sameDayQuote.eligible && sameDayQuote.reason && (
                  <p className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {sameDayQuote.reason}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary & Payment */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl p-6 border border-stone-200/80 shadow-xs space-y-5 sticky top-28">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
              Order summary
            </h2>

            <div className="space-y-3 text-xs text-stone-700">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-stone-900 font-serif text-sm">
                  ₹{itemsSubtotal.toFixed(0)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="font-bold text-stone-900 font-serif text-sm">
                  {deliveryFee === 0 ? 'Free' : `₹${deliveryFee.toFixed(0)}`}
                </span>
              </div>

              <div className="border-t border-stone-100 pt-3 flex justify-between items-baseline">
                <span className="font-bold text-sm text-stone-900">Total</span>
                <span className="font-serif font-bold text-xl text-stone-950">
                  ₹{totalAmount.toFixed(0)}
                </span>
              </div>
            </div>

            {/* Payment Radio Options */}
            <div className="space-y-3 pt-2 border-t border-stone-100">
              <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider">
                Payment
              </label>

              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_option"
                    value="UPI"
                    checked={paymentOption === 'UPI'}
                    onChange={() => setPaymentOption('UPI')}
                    className="accent-[#ab331c] w-4 h-4 cursor-pointer"
                  />
                  <span className="font-medium text-stone-900">UPI</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_option"
                    value="CARD"
                    checked={paymentOption === 'CARD'}
                    onChange={() => setPaymentOption('CARD')}
                    className="accent-[#ab331c] w-4 h-4 cursor-pointer"
                  />
                  <span className="font-medium text-stone-900">Card / Netbanking</span>
                </label>
              </div>
            </div>

            {/* Place Order CTA Button */}
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={loading || !items.length}
              className="w-full py-3.5 bg-[#ab331c] hover:bg-[#962c17] active:scale-98 text-white rounded-full font-semibold text-sm transition-all shadow-sm cursor-pointer disabled:bg-stone-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing order...' : 'Place order'}
            </button>

            {/* Trust Subtext */}
            <p className="text-center text-xs text-stone-500 font-medium">
              Secure payment · Easy returns
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
