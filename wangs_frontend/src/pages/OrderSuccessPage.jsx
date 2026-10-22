import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Truck, ShieldCheck, Mail } from 'lucide-react';
import { api } from '../api';

export default function OrderSuccessPage() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      try {
        const data = await api.lookupOrder(orderNumber);
        setOrder(data);
      } catch (err) {
        console.error('Failed to lookup order', err);
      } finally {
        setLoading(false);
      }
    }
    loadOrder();
  }, [orderNumber]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <div className="w-8 h-8 border-4 border-forest-800 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-stone-500 mt-2">Loading your order confirmation...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-4 text-center">
        <h2 className="font-serif text-2xl font-bold text-stone-900">Order not found</h2>
        <Link to="/products" className="mt-4 inline-block px-5 py-2.5 bg-forest-800 text-white text-xs font-semibold rounded-lg">
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

        <span className="inline-block px-3 py-1 bg-forest-50 border border-forest-200 text-forest-800 rounded-full text-xs font-semibold">
          Order Confirmed & Paid
        </span>

        <h1 className="font-serif text-3xl font-bold text-stone-900">
          Thank you for your order!
        </h1>

        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto leading-relaxed">
          Your order has been assigned to our artisan kitchens in Nagaland.
          A confirmation receipt has been sent to <strong>{order.customer_email}</strong>.
        </p>

        <div className="p-4 bg-cream-100 rounded-xl max-w-xs mx-auto border border-stone-200">
          <span className="text-[11px] text-stone-500 uppercase tracking-wider block font-semibold">Order Number</span>
          <span className="font-mono font-bold text-lg text-forest-900">{order.order_number}</span>
        </div>
      </div>

      {/* Order Details & Summary Card */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <h2 className="font-serif font-bold text-lg text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
          <Package size={18} className="text-forest-800" />
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
            <span className="text-xl font-serif text-forest-900">₹{parseFloat(order.total_amount).toFixed(2)}</span>
          </div>
        </div>

        {/* Shipping Destination */}
        <div className="p-4 bg-cream-50 rounded-xl border border-stone-200 text-xs text-stone-700 space-y-1">
          <span className="font-semibold text-stone-900 flex items-center gap-1.5">
            <Truck size={14} className="text-forest-700" /> Delivery Address:
          </span>
          <p className="font-medium">{order.customer_name} ({order.customer_phone})</p>
          <p>{order.shipping_address_line1} {order.shipping_address_line2}</p>
          <p>{order.shipping_city}, {order.shipping_state} - {order.shipping_postal_code}</p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3">
          <Link
            to="/products"
            className="flex-1 py-3 bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs rounded-xl shadow text-center transition-colors"
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
