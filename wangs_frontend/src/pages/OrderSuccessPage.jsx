import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Truck, ShieldCheck, Mail, Lock } from 'lucide-react';
import { api } from '../api';

export default function OrderSuccessPage() {
  const { orderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const initialVerify = (searchParams.get('verify') || '').trim() || (() => {
    try {
      return (
        sessionStorage.getItem(`order_verify_${orderNumber}`) ||
        sessionStorage.getItem('wangs_last_order_verify') ||
        ''
      );
    } catch (e) {
      return '';
    }
  })();

  const fetchOrder = async (verifyValue) => {
    setLoading(true);
    setVerifyError('');
    try {
      const data = await api.lookupOrder(orderNumber, verifyValue);
      setOrder(data);
      setNeedsVerification(false);
      if (verifyValue) {
        try {
          sessionStorage.setItem(`order_verify_${orderNumber}`, verifyValue);
        } catch (e) {}
      }
    } catch (err) {
      if (err.status === 403 || (err.message && err.message.toLowerCase().includes('verification required'))) {
        setNeedsVerification(true);
      } else {
        console.error('Failed to lookup order', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder(initialVerify);
  }, [orderNumber]);

  const handleManualVerify = async (e) => {
    e.preventDefault();
    const clean = verifyInput.trim();
    if (!clean) {
      setVerifyError('Please enter your email or phone number used at checkout.');
      return;
    }
    setVerifying(true);
    setVerifyError('');
    try {
      const data = await api.lookupOrder(orderNumber, clean);
      setOrder(data);
      setNeedsVerification(false);
      try {
        sessionStorage.setItem(`order_verify_${orderNumber}`, clean);
      } catch (e) {}
    } catch (err) {
      setVerifyError('Verification failed. Please check that the email or phone number matches your order.');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-stone-500 mt-2">Loading your order confirmation...</p>
      </div>
    );
  }

  if (needsVerification && !order) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 bg-amber-50 text-amber-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Lock size={26} />
          </div>
          <h2 className="font-serif text-2xl font-bold text-stone-900">Order Verification</h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            To protect your privacy, please enter the customer email address or phone number associated with order <span className="font-mono font-bold text-stone-800">{orderNumber}</span>.
          </p>

          <form onSubmit={handleManualVerify} className="space-y-3 pt-2 text-left">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 uppercase tracking-wider mb-1">
                Email or Phone
              </label>
              <input
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder="e.g. name@example.com or +91 94360..."
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-600 focus:bg-white transition-all"
                autoFocus
              />
            </div>

            {verifyError && (
              <p className="text-[11px] text-red-600 font-medium">{verifyError}</p>
            )}

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-stone-300 text-white text-xs font-bold rounded-xl shadow transition-colors cursor-pointer"
            >
              {verifying ? 'Verifying...' : 'Access Order Details'}
            </button>
          </form>

          <div className="pt-2">
            <Link to="/products" className="text-xs text-stone-500 hover:text-stone-800 underline">
              Return to Catalog
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <h2 className="font-serif text-2xl font-bold text-stone-900">Order not found</h2>
        <Link to="/products" className="mt-4 inline-block px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors">
          Return to Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      {/* Success Banner */}
      <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle size={36} />
        </div>

        <span className="inline-block px-3 py-1 bg-red-50 border border-red-200 text-red-600 rounded-full text-xs font-semibold">
          Order Confirmed & Paid
        </span>

        <h1 className="font-serif text-3xl font-bold text-stone-900">
          Thank you for your order!
        </h1>

        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
          Your order has been assigned to our verified artisanal producers.
          A confirmation receipt has been sent to <strong>{order.customer_email}</strong>.
        </p>

        <div className="p-4 bg-stone-50 rounded-xl max-w-xs mx-auto border border-stone-200">
          <span className="text-[11px] text-stone-500 uppercase tracking-wider block font-semibold">Order Number</span>
          <span className="font-mono font-bold text-lg text-red-600">{order.order_number}</span>
        </div>
      </div>

      {/* Order Details & Summary Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <h2 className="font-serif font-bold text-lg text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
          <Package size={18} className="text-red-600" />
          <span>Items Ordered ({order.items?.length || 0})</span>
        </h2>

        <div className="divide-y divide-stone-100">
          {order.items?.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-stone-900">{item.product_title}</p>
                <p className="text-stone-500 text-[11px]">{item.weight_grams}g · Qty: {item.quantity}</p>
              </div>
              <span className="font-bold text-stone-900">₹{parseFloat(item.subtotal).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Financial Breakdown */}
        <div className="pt-4 border-t border-stone-200 space-y-2 text-xs text-stone-600">
          <div className="flex justify-between">
            <span>Items Subtotal</span>
            <span className="font-medium text-stone-900">₹{parseFloat(order.items_subtotal).toFixed(2)}</span>
          </div>

          {parseFloat(order.discount_amount) > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Discount</span>
              <span>-₹{parseFloat(order.discount_amount).toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Customer Platform Fee</span>
            <span className="font-medium text-stone-900">₹{parseFloat(order.customer_platform_fee).toFixed(2)}</span>
          </div>

          <div className="flex justify-between">
            <span>Delivery Fee</span>
            <span className="font-medium text-stone-900">₹{parseFloat(order.delivery_fee).toFixed(2)}</span>
          </div>

          <div className="border-t border-stone-200 pt-3 flex justify-between items-baseline text-sm font-bold text-stone-900">
            <span>Total Paid (INR)</span>
            <span className="text-xl font-serif text-red-600 font-bold">₹{parseFloat(order.total_amount).toFixed(2)}</span>
          </div>
        </div>

        {/* Shipping Destination */}
        <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
          <span className="font-semibold text-stone-900 flex items-center gap-1.5">
            <Truck size={14} className="text-red-600" /> Delivery Address:
          </span>
          <p className="font-medium">{order.customer_name} ({order.customer_phone})</p>
          <p>{order.shipping_address_line1} {order.shipping_address_line2}</p>
          <p>{order.shipping_city}, {order.shipping_state} - {order.shipping_postal_code}</p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <Link
            to="/products"
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md text-center transition-colors"
          >
            Continue Browsing Pickles
          </Link>
          <Link
            to="/account"
            className="py-3 px-5 border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs rounded-xl text-center transition-colors"
          >
            View in My Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
