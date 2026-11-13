import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ShieldCheck, Lock, CreditCard, CheckCircle, AlertCircle,
  ArrowRight, Truck, Smartphone, Building, RefreshCw, ChevronDown, ShoppingBag,
  Sparkles, ExternalLink
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { resolveProductImage } from '../utils/image';

export default function CheckoutPage() {
  const { cart, refreshCart } = useCart();
  const { user, requireAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('CASHFREE');
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState('STANDARD');
  const [shippingQuote, setShippingQuote] = useState(null);
  const [fetchingQuote, setFetchingQuote] = useState(false);
  const [isDeliverable, setIsDeliverable] = useState(true);
  const [deliveryError, setDeliveryError] = useState('');
  const [rewardWallet, setRewardWallet] = useState(null);
  const [creditsToRedeem, setCreditsToRedeem] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showMobileSummary, setShowMobileSummary] = useState(false);

  // Payment processing modal state
  const [paymentStep, setPaymentStep] = useState(null); // 'MODAL', 'VERIFYING', 'SUCCESS', 'FAILED'
  const [pendingOrder, setPendingOrder] = useState(null);
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [cashfreeTab, setCashfreeTab] = useState('upi'); // 'upi', 'card', 'netbanking'

  // Handle return redirect from Cashfree PG
  useEffect(() => {
    const returnOrderNumber = searchParams.get('order_number') || searchParams.get('order_id');
    const returnCfOrderId = searchParams.get('cf_order_id');
    if (returnOrderNumber) {
      setPaymentStep('VERIFYING');
      api.checkCashfreeStatus(returnOrderNumber).then(async (res) => {
        if (res.payment_status === 'PAID') {
          await refreshCart();
          setPaymentStep('SUCCESS');
          setTimeout(() => {
            navigate(`/order-success/${returnOrderNumber}`);
          }, 1200);
        } else {
          try {
            await api.verifyPayment({
              order_number: returnOrderNumber,
              cf_order_id: returnCfOrderId,
            });
            await refreshCart();
            setPaymentStep('SUCCESS');
            setTimeout(() => {
              navigate(`/order-success/${returnOrderNumber}`);
            }, 1200);
          } catch (e) {
            setPaymentStep('FAILED');
            setErrorMessage('Payment pending confirmation. If money was debited, your order will be automatically confirmed within 5 minutes.');
          }
        }
      }).catch((e) => {
        setPaymentStep('FAILED');
        setErrorMessage('Unable to verify transaction: ' + e.message);
      });
    }
  }, [searchParams]);

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

      api.getRewardWallet().then((w) => {
        setRewardWallet(w);
      }).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      requireAuth(() => {}, 'proceed with your order');
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

  const fetchShippingQuote = async (pin, city, state, method) => {
    const postalCode = pin || formData.shipping_postal_code;
    const destCity = city || formData.shipping_city;
    const destState = state || formData.shipping_state;
    const delivMethod = method || selectedDeliveryMethod;

    if (!postalCode || postalCode.length < 3) return;

    setFetchingQuote(true);
    try {
      const quote = await api.getShippingQuote({
        postal_code: postalCode,
        city: destCity,
        state: destState,
        delivery_method: delivMethod
      });
      if (quote.is_deliverable) {
        setShippingQuote(quote);
        setIsDeliverable(true);
        setDeliveryError('');
      } else {
        setShippingQuote(null);
        setIsDeliverable(false);
        setDeliveryError(quote.error_message || 'Delivery not available for this location');
      }
    } catch (err) {
      setIsDeliverable(false);
      setDeliveryError(err.message || 'Delivery not available for this location');
    } finally {
      setFetchingQuote(false);
    }
  };

  useEffect(() => {
    if (formData.shipping_postal_code && formData.shipping_postal_code.length >= 3) {
      fetchShippingQuote(formData.shipping_postal_code, formData.shipping_city, formData.shipping_state, selectedDeliveryMethod);
    }
  }, [formData.shipping_postal_code, formData.shipping_city, formData.shipping_state, selectedDeliveryMethod]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!user) {
      requireAuth(() => {}, 'proceed with your order');
      return;
    }

    if (!cart?.items?.length) {
      setErrorMessage('Your basket is empty.');
      return;
    }

    if (!formData.customer_name || !formData.customer_email || !formData.customer_phone || !formData.shipping_address_line1 || !formData.shipping_city || !formData.shipping_state || !formData.shipping_postal_code) {
      setErrorMessage('Please fill in all required shipping address fields.');
      return;
    }

    if (!isDeliverable) {
      setErrorMessage(deliveryError || 'Delivery not available for this location. Please enter a serviceable destination.');
      return;
    }

    setLoading(true);
    try {
      const orderPayload = {
        ...formData,
        payment_method: selectedPaymentMethod,
        credits_to_redeem: safeCreditsToRedeem,
        shipping_delivery_method: selectedDeliveryMethod,
      };

      const res = await api.createOrder(orderPayload);
      setPendingOrder(res.order);
      setPaymentIntent(res.payment_intent);

      // If Cash on Delivery, order is confirmed immediately
      if (selectedPaymentMethod === 'COD') {
        await refreshCart();
        navigate(`/order-success/${res.order.order_number}`);
        return;
      }

      // If Cashfree with live session configured and SDK loaded
      if (res.payment_intent?.is_configured && res.payment_intent?.payment_session_id && window.Cashfree) {
        try {
          const mode = res.payment_intent.environment === 'PROD' ? 'production' : 'sandbox';
          const cashfree = window.Cashfree({ mode });
          cashfree.checkout({
            paymentSessionId: res.payment_intent.payment_session_id,
            redirectTarget: '_modal',
          }).then(async (result) => {
            if (result.error) {
              setPaymentStep('FAILED');
              setErrorMessage(result.error.message || 'Payment was cancelled or failed.');
            } else if (result.paymentDetails) {
              setPaymentStep('VERIFYING');
              try {
                await api.verifyPayment({
                  order_number: res.order.order_number,
                  cf_order_id: res.payment_intent.cf_order_id,
                });
                await refreshCart();
                setPaymentStep('SUCCESS');
                setTimeout(() => {
                  navigate(`/order-success/${res.order.order_number}`);
                }, 1200);
              } catch (vErr) {
                try {
                  const st = await api.checkCashfreeStatus(res.order.order_number);
                  if (st.payment_status === 'PAID') {
                    await refreshCart();
                    setPaymentStep('SUCCESS');
                    setTimeout(() => {
                      navigate(`/order-success/${res.order.order_number}`);
                    }, 1200);
                    return;
                  }
                } catch (sErr) {}
                setPaymentStep('FAILED');
                setErrorMessage('Payment verification error: ' + vErr.message);
              }
            }
          });
          return;
        } catch (sdkErr) {
          console.warn('Cashfree SDK modal launch error, falling back to modal:', sdkErr);
        }
      }

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
        payment_id: `cf_pay_${Math.random().toString(36).substring(2, 12)}`,
        cf_order_id: paymentIntent?.cf_order_id || `cf_order_${pendingOrder.order_number}`,
        signature: 'sig_cashfree_verified',
      });

      await refreshCart();
      setPaymentStep('SUCCESS');
      setTimeout(() => {
        navigate(`/order-success/${pendingOrder.order_number}`);
      }, 1200);
    } catch (err) {
      setPaymentStep('FAILED');
      setErrorMessage('Payment verification error: ' + err.message);
    }
  };

  const simulatePaymentFailure = () => {
    setPaymentStep('FAILED');
    setErrorMessage('Simulated Cashfree transaction was declined or cancelled. You can retry safely.');
  };

  const items = cart?.items || [];
  const summary = cart?.financial_summary || {
    items_subtotal: '0.00',
    customer_platform_fee: '5.00',
    delivery_fee: '0.00',
    total_amount: '0.00',
  };

  // Customers always enjoy 100% Free Delivery (courier charges are factored into original product prices by makers)
  const effectiveDeliveryFee = 0;
  const itemsSubtotal = parseFloat(summary.items_subtotal) || 0;
  const platformFee = parseFloat(summary.customer_platform_fee) || 0;
  const discountAmount = parseFloat(summary.discount_amount) || 0;
  const rawTotal = Math.max(0, itemsSubtotal - discountAmount + platformFee);
  const availableCredits = rewardWallet?.available_credits ?? rewardWallet?.balance ?? rewardWallet?.wallet?.balance ?? 0;
  const creditRate = rewardWallet?.credit_value_rupees ? parseFloat(rewardWallet.credit_value_rupees) : (rewardWallet?.settings?.credit_value_rupees ? parseFloat(rewardWallet.settings.credit_value_rupees) : 0.10);
  const maxRedeemableCredits = Math.min(availableCredits, Math.floor(rawTotal / (creditRate || 0.10)));
  const safeCreditsToRedeem = Math.min(Math.max(0, parseInt(creditsToRedeem, 10) || 0), maxRedeemableCredits);
  const creditDiscount = Number((safeCreditsToRedeem * creditRate).toFixed(2));
  const finalPayableAmount = Math.max(0, Number((rawTotal - creditDiscount).toFixed(2)));

  if (!items.length && !pendingOrder) {
    return (
      <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
        <h2 className="font-serif text-3xl font-bold text-stone-900">Your basket is empty</h2>
        <p className="text-xs text-stone-500">Add handcrafted pickles to proceed with checkout.</p>
        <Link to="/products" className="inline-block px-6 py-3 bg-red-600 text-white text-xs font-bold rounded-xl shadow-md hover:bg-red-700">
          Explore Pickles
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="mb-8">
        <span className="text-xs font-bold tracking-wider uppercase text-red-600">Safe & Encrypted</span>
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
          {/* Mobile Collapsible Order Summary Banner */}
          <div className="lg:hidden bg-red-50/40 p-4 rounded-2xl border border-red-100 shadow-2xs space-y-3">
            <button
              type="button"
              onClick={() => setShowMobileSummary(!showMobileSummary)}
              className="w-full flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag size={16} className="text-red-600" />
                <span className="font-bold text-xs text-stone-900">
                  Order Summary ({items.length} {items.length === 1 ? 'item' : 'items'})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-black text-sm text-red-600">
                  ₹{finalPayableAmount.toFixed(0)}
                </span>
                <ChevronDown size={14} className={`text-stone-500 transition-transform ${showMobileSummary ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showMobileSummary && (
              <div className="pt-3 border-t border-stone-200/80 space-y-3 text-xs">
                <div className="max-h-48 overflow-y-auto divide-y divide-stone-200/60 pr-1">
                  {items.map((item) => (
                    <div key={item.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img
                          src={resolveProductImage(item.product.primary_image_url || (item.product.images && item.product.images[0] ? item.product.images[0].image_url : ''))}
                          alt={item.product.title}
                          className="w-9 h-9 object-cover rounded-lg border border-stone-200 flex-shrink-0"
                        />
                        <div className="truncate">
                          <p className="font-bold text-stone-900 truncate text-[11px]">{item.product.title}</p>
                          <p className="text-[10px] text-stone-500">{item.product.weight_grams}g · Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <span className="font-bold text-stone-950 text-xs font-serif whitespace-nowrap">
                        ₹{(parseFloat(item.product.price) * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-stone-200 space-y-1 text-[11px] text-stone-600">
                  <div className="flex justify-between">
                    <span>Items Subtotal</span>
                    <span className="font-semibold text-stone-900">₹{parseFloat(summary.items_subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className="font-bold text-emerald-700 uppercase text-[10px]">Free</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fee</span>
                    <span>₹{parseFloat(summary.customer_platform_fee).toFixed(2)}</span>
                  </div>
                  {safeCreditsToRedeem > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span className="flex items-center gap-1">
                        <Sparkles size={11} /> Wangs Credits Discount
                      </span>
                      <span>-₹{creditDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-stone-200 font-bold text-stone-900">
                    <span>Total Amount</span>
                    <span className="text-red-600 font-serif">₹{finalPayableAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleCreateOrder} className="space-y-6">
            {!user && (
              <div className="bg-amber-50 border border-amber-300 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-200/70 text-amber-900 flex items-center justify-center shrink-0">
                    <ShieldCheck size={22} className="text-amber-800" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-sm text-stone-900">Sign In Required to Place Order</h4>
                    <p className="text-xs text-stone-600">Please sign in or create an account to verify your delivery address and proceed with payment.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => requireAuth(() => {}, 'proceed with your order')}
                  className="px-5 py-2.5 bg-[#9b4100] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#803500] shrink-0 active:scale-95 transition-all cursor-pointer"
                >
                  Sign In / Sign Up
                </button>
              </div>
            )}

            {/* 1. Customer Details */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-artisan space-y-4">
              <h2 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold font-mono">1</span>
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
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 font-medium"
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
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 font-medium"
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
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* 2. Shipping Address */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-artisan space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <h2 className="font-serif font-bold text-base text-stone-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold font-mono">2</span>
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
                      className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Truck size={13} className="text-red-600" />
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
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 font-medium"
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
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 font-medium"
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
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 font-medium"
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
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 font-medium"
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
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 font-mono font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Methods & Serviceability */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200/90 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Truck size={18} className="text-forest-900" />
                  <h3 className="font-serif font-bold text-sm text-stone-900">
                    Delivery Method & Logistics
                  </h3>
                </div>
                {fetchingQuote && (
                  <span className="text-[11px] text-stone-500 font-mono flex items-center gap-1.5">
                    <RefreshCw size={12} className="animate-spin text-forest-800" />
                    Calculating rates...
                  </span>
                )}
              </div>

              {!isDeliverable && (
                <div className="p-4 bg-red-50 border-2 border-red-300 rounded-2xl text-xs text-red-900 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sm text-red-700">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>Delivery not available for this location</span>
                  </div>
                  <p className="text-red-800 leading-relaxed">
                    {deliveryError || `We do not currently deliver to ${formData.shipping_city || 'PIN ' + formData.shipping_postal_code}. Please choose a serviceable address or contact Wangs support.`}
                  </p>
                </div>
              )}

              {/* Delivery Method Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  selectedDeliveryMethod === 'STANDARD' ? 'border-forest-900 bg-forest-50/40 ring-1 ring-forest-900' : 'border-stone-200 hover:border-stone-300'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-stone-900 block font-serif">Standard Delivery</span>
                      <span className="text-[11px] text-stone-500 block pt-0.5">
                        {shippingQuote?.estimated_delivery || '1–2 Business Days'}
                      </span>
                    </div>
                    <input
                      type="radio"
                      name="delivery_method_choice"
                      value="STANDARD"
                      checked={selectedDeliveryMethod === 'STANDARD'}
                      onChange={() => setSelectedDeliveryMethod('STANDARD')}
                      className="text-forest-900 mt-1"
                    />
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono pt-2 block">
                    SwiftZone / Partner Network
                  </span>
                </label>

                <label className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                  selectedDeliveryMethod === 'SAME_DAY' ? 'border-forest-900 bg-forest-50/40 ring-1 ring-forest-900' : 'border-stone-200 hover:border-stone-300'
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-stone-900 block font-serif">Same-Day Priority</span>
                      <span className="text-[11px] text-stone-500 block pt-0.5">
                        Today Evening Delivery (Order before 12:30 PM)
                      </span>
                    </div>
                    <input
                      type="radio"
                      name="delivery_method_choice"
                      value="SAME_DAY"
                      checked={selectedDeliveryMethod === 'SAME_DAY'}
                      onChange={() => setSelectedDeliveryMethod('SAME_DAY')}
                      className="text-forest-900 mt-1"
                    />
                  </div>
                  <span className="text-[10px] text-stone-400 font-mono pt-2 block">
                    Kohima & Dimapur corridor
                  </span>
                </label>
              </div>

              {/* Multi-Manufacturer Package Packing Details */}
              {shippingQuote?.fulfillment_breakdown && shippingQuote.fulfillment_breakdown.length > 0 && (
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
                  <div className="flex items-center justify-between text-stone-700 font-bold">
                    <span>Package Breakdown ({shippingQuote.total_packages} Box{shippingQuote.total_packages > 1 ? 'es' : ''})</span>
                    <span className="font-serif font-bold text-forest-900">₹{shippingQuote.total_delivery_fee}</span>
                  </div>
                  <div className="space-y-1.5 divide-y divide-stone-200/60 text-[11px] text-stone-600">
                    {shippingQuote.fulfillment_breakdown.map((fb, idx) => (
                      <div key={idx} className="pt-1.5 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-stone-900">{fb.manufacturer_name}</span>
                          <span className="text-[10px] text-stone-500 block">
                            {fb.packages_count} box ({fb.total_weight_grams}g) · via {fb.courier_name}
                          </span>
                          {fb.schedule_note && (
                            <span className="text-[10px] text-amber-700 block">{fb.schedule_note}</span>
                          )}
                        </div>
                        <span className="font-bold text-stone-800 font-serif">
                          {fb.is_free_delivery ? <span className="text-emerald-700">Free</span> : `₹${fb.group_delivery_fee}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Wangs Rewards Credits Redemption */}
            {user && availableCredits > 0 && (
              <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-red-50/70 p-6 sm:p-7 rounded-3xl border border-amber-200/80 shadow-artisan space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                      <Sparkles size={16} />
                    </span>
                    <div>
                      <h3 className="font-serif font-bold text-sm text-stone-900">
                        Redeem Wangs Rewards Credits
                      </h3>
                      <p className="text-[11px] text-stone-500">
                        Use your earned credits for an instant discount (10 Credits = ₹1).
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-stone-400 block tracking-wider">Available</span>
                    <span className="font-serif font-black text-amber-700 text-sm sm:text-base">
                      {availableCredits} Credits
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min={0}
                        max={maxRedeemableCredits}
                        value={safeCreditsToRedeem || ''}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          if (isNaN(val)) setCreditsToRedeem(0);
                          else setCreditsToRedeem(Math.min(maxRedeemableCredits, Math.max(0, val)));
                        }}
                        placeholder="0"
                        className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-bold">Credits</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCreditsToRedeem(maxRedeemableCredits)}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      Redeem Max ({maxRedeemableCredits})
                    </button>
                    {safeCreditsToRedeem > 0 && (
                      <button
                        type="button"
                        onClick={() => setCreditsToRedeem(0)}
                        className="px-3 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-stone-600 bg-white/70 p-3 rounded-xl border border-amber-100">
                    <span>Maximum redeemable: <strong>{maxRedeemableCredits} Credits (₹{(maxRedeemableCredits * creditRate).toFixed(2)})</strong></span>
                    {safeCreditsToRedeem > 0 && (
                      <span className="font-bold text-emerald-700">
                        Discount Applied: -₹{creditDiscount.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 3. Payment Method */}
            <div className="bg-white p-6 sm:p-7 rounded-3xl border border-stone-200 shadow-artisan space-y-4">
              <h2 className="font-serif font-bold text-base text-stone-900 border-b border-stone-100 pb-3 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs flex items-center justify-center font-bold font-mono">3</span>
                  <span>Payment Gateway</span>
                </span>
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <ShieldCheck size={12} /> 100% Secure Checkout
                </span>
              </h2>

              <div className="space-y-3 text-xs">
                {/* Cashfree Payment Option */}
                <label className={`p-4 border-2 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                  selectedPaymentMethod === 'CASHFREE'
                    ? 'border-red-600 bg-red-50/50 shadow-sm'
                    : 'border-stone-200 bg-stone-50/40 hover:border-stone-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      checked={selectedPaymentMethod === 'CASHFREE'}
                      onChange={() => setSelectedPaymentMethod('CASHFREE')}
                      className="text-red-600 focus:ring-red-600"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 text-sm">Cashfree Payments</span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Recommended</span>
                      </div>
                      <span className="text-stone-500 text-[11px] block mt-0.5">Instant UPI (Google Pay, PhonePe, Paytm), Debit/Credit Cards & Netbanking</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-stone-500">
                    <Smartphone size={20} className="text-red-600" />
                    <CreditCard size={20} className="text-red-600" />
                  </div>
                </label>

                {/* Cash on Delivery Option */}
                <label className={`p-4 border-2 rounded-2xl flex items-center justify-between cursor-pointer transition-all ${
                  selectedPaymentMethod === 'COD'
                    ? 'border-red-600 bg-red-50/50 shadow-sm'
                    : 'border-stone-200 bg-stone-50/40 hover:border-stone-300'
                }`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="payment_method"
                      checked={selectedPaymentMethod === 'COD'}
                      onChange={() => setSelectedPaymentMethod('COD')}
                      className="text-red-600 focus:ring-red-600"
                    />
                    <div>
                      <span className="font-bold text-stone-900 block text-sm">Cash on Delivery (COD)</span>
                      <span className="text-stone-500 text-[11px]">Pay in cash upon doorstep delivery</span>
                    </div>
                  </div>
                  <Truck size={20} className="text-stone-600" />
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isDeliverable}
              className={`w-full py-4 text-white font-bold text-sm rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                !isDeliverable
                  ? 'bg-stone-400 cursor-not-allowed shadow-none'
                  : 'bg-red-600 hover:bg-red-700 shadow-red-600/20 hover:shadow-xl hover:scale-101 active:scale-99 cursor-pointer'
              }`}
            >
              {loading ? (
                <span>Calculating order and locking inventory...</span>
              ) : !isDeliverable ? (
                <span>Delivery Not Available for this Location</span>
              ) : (
                <>
                  <span>Place Order & Pay ₹{finalPayableAmount.toFixed(0)}</span>
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
                      src={resolveProductImage(item.product.primary_image_url || (item.product.images && item.product.images[0] ? item.product.images[0].image_url : ''), 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=100&q=80')}
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
              <div className="flex justify-between items-baseline">
                <div>
                  <span className="block font-medium">Delivery Fee</span>
                  <span className="text-[10px] text-emerald-700 font-semibold block">
                    100% Free Express Delivery (Included in product price)
                  </span>
                </div>
                <span className="font-bold text-emerald-700 uppercase text-[10px] bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  FREE
                </span>
              </div>
              {safeCreditsToRedeem > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50/70 p-2 rounded-lg">
                  <span className="flex items-center gap-1">
                    <Sparkles size={13} className="text-emerald-600" />
                    Wangs Credits Discount ({safeCreditsToRedeem} Credits)
                  </span>
                  <span>-₹{creditDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-stone-200 pt-3 flex justify-between items-baseline text-sm font-bold text-stone-950">
                <span>Total Amount Payable</span>
                <span className="text-2xl font-serif font-black text-red-600">₹{finalPayableAmount.toFixed(2)}</span>
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

            <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 text-[11px] text-stone-700 space-y-1">
              <p className="font-bold text-amber-950 flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-amber-800" /> No Returns · Refunds Dependent on Manufacturer
              </p>
              <p className="text-stone-600 leading-relaxed text-[10.5px]">
                Edible items are non-returnable. Refunds or replacements are fully dependent on whether the respective manufacturer decides to allow it, evaluated strictly for genuine reasons (transit breakage or defect with unboxing proof).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cashfree Payment Modal / Test Simulation */}
      {paymentStep && (
        <div className="fixed inset-0 z-50 bg-stone-950/75 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white p-6 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-black tracking-wider text-amber-200">
                  {paymentIntent?.is_configured ? 'Cashfree Secure Checkout' : 'Cashfree Payment Gateway'}
                </span>
                <h3 className="font-serif font-bold text-lg text-white">Wangs Artisanal Marketplace</h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-red-100 block">Total Due</span>
                <span className="font-serif font-black text-xl text-white">₹{parseFloat(pendingOrder?.total_amount || finalPayableAmount).toFixed(2)}</span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {paymentStep === 'MODAL' && (
                <>
                  {!paymentIntent?.is_configured && (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-950">
                        <Sparkles size={14} className="text-amber-600" /> Cashfree Sandbox Mode Active
                      </div>
                      <p className="text-[11px] leading-relaxed text-amber-800">
                        You can test complete order fulfillment right now using simulated checkout below. Once API credentials are added in Render, live Cashfree checkout activates automatically!
                      </p>
                    </div>
                  )}

                  {/* Tabs for Payment Mode */}
                  <div className="grid grid-cols-3 bg-stone-100 p-1 rounded-xl text-xs font-bold text-stone-600">
                    <button
                      onClick={() => setCashfreeTab('upi')}
                      className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${cashfreeTab === 'upi' ? 'bg-white text-stone-900 shadow-sm' : ''}`}
                    >
                      <Smartphone size={13} /> UPI
                    </button>
                    <button
                      onClick={() => setCashfreeTab('card')}
                      className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${cashfreeTab === 'card' ? 'bg-white text-stone-900 shadow-sm' : ''}`}
                    >
                      <CreditCard size={13} /> Card
                    </button>
                    <button
                      onClick={() => setCashfreeTab('netbanking')}
                      className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${cashfreeTab === 'netbanking' ? 'bg-white text-stone-900 shadow-sm' : ''}`}
                    >
                      <Building size={13} /> Netbanking
                    </button>
                  </div>

                  {/* Mode specific view */}
                  {cashfreeTab === 'upi' && (
                    <div className="p-4 bg-cream-50 rounded-2xl border border-stone-200 text-xs space-y-2">
                      <p className="font-bold text-stone-800">Instant UPI Payment:</p>
                      <div className="grid grid-cols-2 gap-2 text-center font-semibold">
                        <span className="p-2 bg-white rounded-lg border border-stone-200 text-stone-700">Google Pay</span>
                        <span className="p-2 bg-white rounded-lg border border-stone-200 text-stone-700">PhonePe</span>
                        <span className="p-2 bg-white rounded-lg border border-stone-200 text-stone-700">Paytm UPI</span>
                        <span className="p-2 bg-white rounded-lg border border-stone-200 text-stone-700">BHIM UPI</span>
                      </div>
                    </div>
                  )}

                  {cashfreeTab === 'card' && (
                    <div className="p-4 bg-cream-50 rounded-2xl border border-stone-200 text-xs space-y-2">
                      <p className="font-bold text-stone-800">Credit or Debit Card:</p>
                      <p className="text-stone-600 bg-white p-2.5 rounded-xl border border-stone-200">
                        Supports Visa, Mastercard, RuPay & Maestro cards with instant OTP verification.
                      </p>
                    </div>
                  )}

                  {cashfreeTab === 'netbanking' && (
                    <div className="p-4 bg-cream-50 rounded-2xl border border-stone-200 text-xs space-y-2">
                      <p className="font-bold text-stone-800">Net Banking:</p>
                      <p className="text-stone-600 bg-white p-2.5 rounded-xl border border-stone-200">
                        Supports 50+ Indian banks including SBI, HDFC, ICICI, Axis, PNB and Kotak.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 pt-2">
                    <button
                      onClick={simulatePaymentSuccess}
                      className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <CheckCircle size={16} /> Confirm Payment & Place Order
                    </button>

                    <button
                      onClick={simulatePaymentFailure}
                      className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Simulate Payment Failure / Cancel
                    </button>
                  </div>
                </>
              )}

              {paymentStep === 'VERIFYING' && (
                <div className="py-10 text-center space-y-3">
                  <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
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
