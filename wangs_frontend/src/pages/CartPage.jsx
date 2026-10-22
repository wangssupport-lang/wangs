import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Tag, ShieldCheck, Truck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { api } from '../api';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, clearCart, itemsCount } = useCart();
  const navigate = useNavigate();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [quote, setQuote] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [calculating, setCalculating] = useState(false);

  const fetchQuote = async (codeToUse = '') => {
    if (!cart?.items?.length) return;
    setCalculating(true);
    setCouponError('');
    try {
      const q = await api.getCheckoutQuote(codeToUse);
      setQuote(q);
      if (q.coupon_applied) {
        setAppliedCoupon(q.coupon_applied);
      }
    } catch (err) {
      setCouponError(err.message || 'Invalid coupon');
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    fetchQuote(appliedCoupon);
  }, [cart]);

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    await fetchQuote(couponCode.trim());
  };

  const removeCoupon = async () => {
    setCouponCode('');
    setAppliedCoupon('');
    await fetchQuote('');
  };

  const items = cart?.items || [];
  const summary = quote || cart?.financial_summary || {
    items_subtotal: '0.00',
    customer_platform_fee: '5.00',
    delivery_fee: '50.00',
    discount_amount: '0.00',
    total_amount: '0.00',
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-cream-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag size={32} className="text-stone-400" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">Your basket is currently empty</h2>
        <p className="text-sm text-stone-500 mt-2 max-w-sm mx-auto">
          Explore authentic Naga smoked meats, King Chilli, and wild forest condiments directly from Kohima.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-forest-800 hover:bg-forest-900 text-white text-xs font-bold rounded-xl shadow transition-colors"
        >
          <span>Browse Authentic Pickles</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-serif text-3xl font-bold text-stone-900 mb-8">
        Your Shopping Basket ({itemsCount} {itemsCount === 1 ? 'item' : 'items'})
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-sm divide-y divide-stone-100 overflow-hidden">
            {items.map((item) => (
              <div key={item.id} className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img
                    src={item.product.primary_image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80'}
                    alt={item.product.title}
                    className="w-20 h-20 object-cover rounded-xl border border-stone-200 flex-shrink-0"
                  />
                  <div>
                    <Link to={`/product/${item.product.slug}`} className="font-serif font-bold text-base text-stone-900 hover:text-forest-800">
                      {item.product.title}
                    </Link>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {item.product.weight_grams}g · Produced by <strong>{item.product.manufacturer?.business_name}</strong>
                    </p>
                    <p className="text-sm font-semibold text-stone-900 mt-1">
                      ₹{parseFloat(item.product.price).toFixed(0)} each
                    </p>
                  </div>
                </div>

                {/* Adjuster & Line Total */}
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  <div className="flex items-center border border-stone-300 rounded-lg bg-stone-50">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="px-2.5 py-1 text-stone-600 hover:bg-stone-200 rounded-l"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="px-3 text-xs font-bold text-stone-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="px-2.5 py-1 text-stone-600 hover:bg-stone-200 rounded-r"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-bold text-stone-950 block">
                      ₹{(parseFloat(item.product.price) * item.quantity).toFixed(0)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-xs text-stone-400 hover:text-chilli-700 mt-0.5 flex items-center gap-1"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <Link to="/products" className="text-xs text-forest-800 font-semibold hover:underline">
              ← Continue Shopping
            </Link>
            <button onClick={clearCart} className="text-xs text-stone-400 hover:text-chilli-700">
              Clear All Items
            </button>
          </div>
        </div>

        {/* Order Summary & Fee Breakdown Column */}
        <div className="lg:col-span-4 space-y-4">
          {/* Coupon Box */}
          <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm space-y-3">
            <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
              <Tag size={15} className="text-forest-700" /> Apply Promo Code
            </h3>
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800">
                <span className="font-semibold">Code: {appliedCoupon} applied!</span>
                <button onClick={removeCoupon} className="text-xs text-stone-500 hover:text-red-600 underline">
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="e.g. WANGS10 or NAGA50"
                  className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs uppercase focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
                <button
                  type="submit"
                  disabled={calculating}
                  className="px-4 py-1.5 bg-forest-800 hover:bg-forest-900 text-white text-xs font-semibold rounded-lg"
                >
                  Apply
                </button>
              </form>
            )}
            {couponError && <p className="text-[11px] text-red-500">{couponError}</p>}
            <p className="text-[11px] text-stone-400">
              Try <strong>WANGS10</strong> for 10% off or <strong>NAGA50</strong> for ₹50 off orders over ₹400.
            </p>
          </div>

          {/* Pricing Summary */}
          <div className="bg-cream-100 p-6 rounded-2xl border border-stone-200 shadow-sm space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-200/80 pb-3">
              Order Breakdown
            </h3>

            <div className="space-y-2 text-xs text-stone-700">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-semibold text-stone-900">₹{parseFloat(summary.items_subtotal).toFixed(2)}</span>
              </div>

              {parseFloat(summary.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount Applied</span>
                  <span>-₹{parseFloat(summary.discount_amount).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  Customer Platform Fee
                  <span className="text-[10px] text-stone-400" title="Supports regional marketplace quality control & secure packaging">(₹5 fixed)</span>
                </span>
                <span className="font-semibold text-stone-900">₹{parseFloat(summary.customer_platform_fee).toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Standard Delivery Fee</span>
                <span className="font-semibold text-stone-900">
                  {parseFloat(summary.delivery_fee) === 0 ? (
                    <span className="text-emerald-700 font-bold uppercase text-[10px]">Free</span>
                  ) : (
                    `₹${parseFloat(summary.delivery_fee).toFixed(2)}`
                  )}
                </span>
              </div>

              {parseFloat(summary.items_subtotal) < 999 && (
                <p className="text-[11px] text-forest-800 bg-forest-50 p-2 rounded border border-forest-200">
                  Add ₹{(999 - parseFloat(summary.items_subtotal)).toFixed(0)} more of authentic Naga pickles for <strong>Free Delivery</strong>!
                </p>
              )}

              <div className="border-t border-stone-200 pt-3 flex justify-between items-baseline text-sm font-bold text-stone-950">
                <span>Total Amount Payable</span>
                <span className="text-xl font-serif text-forest-900">₹{parseFloat(summary.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-3.5 bg-forest-800 hover:bg-forest-900 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all hover:shadow-lg"
            >
              <span>Proceed to Delivery & Checkout</span>
              <ArrowRight size={15} />
            </button>

            <div className="space-y-1.5 pt-2 text-[11px] text-stone-500">
              <p className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" />
                <span>100% Secure Checkout & Escrow Protection</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Truck size={14} className="text-forest-600 flex-shrink-0" />
                <span>Hand-packed in Kohima · Air-courier delivery</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
