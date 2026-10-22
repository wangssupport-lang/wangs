import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Tag, ShieldCheck, Truck, Info, Check } from 'lucide-react';
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
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 bg-cream-100 rounded-3xl flex items-center justify-center mx-auto mb-4 text-forest-900 shadow-subtle">
          <ShoppingBag size={32} />
        </div>
        <h2 className="font-serif text-3xl font-bold text-stone-900">Your basket is currently empty</h2>
        <p className="text-sm text-stone-500 mt-2 max-w-sm mx-auto leading-relaxed">
          Explore authentic Naga smoked meats, King Chilli, and wild forest condiments directly from Kohima.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3.5 bg-forest-900 hover:bg-forest-950 text-cream-50 text-xs font-bold rounded-xl shadow-sm transition-colors"
        >
          <span>Browse Authentic Batches</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-8 pb-4 border-b border-stone-200/80 gap-2">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
          Your Shopping Basket
        </h1>
        <span className="text-xs text-stone-500">
          {itemsCount} {itemsCount === 1 ? 'batch item' : 'batch items'} in cart
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-subtle divide-y divide-stone-100 overflow-hidden">
            {items.map((item) => (
              <div key={item.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 hover:bg-cream-50/30 transition-colors">
                <div className="flex items-center gap-4">
                  <img
                    src={item.product.primary_image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80'}
                    alt={item.product.title}
                    className="w-20 h-20 object-cover rounded-2xl border border-stone-200/80 flex-shrink-0"
                  />
                  <div>
                    <Link to={`/product/${item.product.slug}`} className="font-serif font-bold text-base text-stone-900 hover:text-forest-900 leading-snug">
                      {item.product.title}
                    </Link>
                    <p className="text-xs text-stone-500 mt-1">
                      {item.product.weight_grams}g jar · Crafted by <strong>{item.product.manufacturer?.business_name}</strong>
                    </p>
                    <p className="text-sm font-serif font-bold text-stone-900 mt-1.5">
                      ₹{parseFloat(item.product.price).toFixed(0)} <span className="text-xs font-sans text-stone-400 font-normal">per unit</span>
                    </p>
                  </div>
                </div>

                {/* Adjuster & Line Total */}
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  <div className="flex items-center border border-stone-200 rounded-xl bg-stone-50 shadow-subtle">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="px-3 py-1.5 text-stone-600 hover:bg-stone-200 rounded-l-xl transition-colors"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="px-3 text-xs font-bold text-stone-950">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="px-3 py-1.5 text-stone-600 hover:bg-stone-200 rounded-r-xl transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-serif font-bold text-stone-950 block">
                      ₹{(parseFloat(item.product.price) * item.quantity).toFixed(0)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-xs text-stone-400 hover:text-chilli-700 mt-1 flex items-center gap-1 transition-colors ml-auto"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <Link to="/products" className="text-xs text-forest-900 font-bold hover:underline">
              ← Continue Shopping Pickles
            </Link>
            <button onClick={clearCart} className="text-xs text-stone-400 hover:text-chilli-700">
              Clear All Items
            </button>
          </div>
        </div>

        {/* Order Summary & Fee Breakdown Column */}
        <div className="lg:col-span-4 space-y-5">
          {/* Promo Code Box */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-subtle space-y-3.5">
            <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
              <Tag size={15} className="text-forest-700" /> Apply Promotional Voucher
            </h3>
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
                <span className="font-bold flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-700" /> Code: {appliedCoupon} applied
                </span>
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
                  className="flex-1 px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs uppercase font-medium focus:outline-none focus:ring-1 focus:ring-forest-800"
                />
                <button
                  type="submit"
                  disabled={calculating}
                  className="px-4 py-2 bg-forest-900 hover:bg-forest-950 text-cream-50 text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Apply
                </button>
              </form>
            )}
            {couponError && <p className="text-[11px] text-chilli-600">{couponError}</p>}
            <p className="text-[11px] text-stone-400">
              Use <strong>WANGS10</strong> for 10% off or <strong>NAGA50</strong> for ₹50 off orders over ₹400.
            </p>
          </div>

          {/* Pricing Invoice Summary (Section 6 compliant) */}
          <div className="bg-cream-100 p-7 rounded-3xl border border-stone-200 shadow-subtle space-y-4">
            <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-200/80 pb-3">
              Order Breakdown
            </h3>

            <div className="space-y-2.5 text-xs text-stone-700">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold text-stone-900">₹{parseFloat(summary.items_subtotal).toFixed(2)}</span>
              </div>

              {parseFloat(summary.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Coupon Discount Applied</span>
                  <span>-₹{parseFloat(summary.discount_amount).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5" title="Supports quality inspection, air transit packaging & fair-trade escrow">
                  Customer Platform Fee
                  <Info size={12} className="text-stone-400" />
                </span>
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

              {parseFloat(summary.items_subtotal) < 999 && (
                <div className="p-2.5 bg-white/70 rounded-xl border border-stone-200 text-[11px] text-forest-900">
                  Add ₹{(999 - parseFloat(summary.items_subtotal)).toFixed(0)} more of authentic pickles for <strong>Free Delivery</strong>!
                </div>
              )}

              <div className="border-t border-stone-200 pt-3 flex justify-between items-baseline text-sm font-bold text-stone-950">
                <span>Total Amount Payable</span>
                <span className="text-2xl font-serif text-forest-950">₹{parseFloat(summary.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-4 bg-forest-900 hover:bg-forest-950 text-cream-50 font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all hover:shadow-lg active:scale-98"
            >
              <span>Proceed to Delivery & Checkout</span>
              <ArrowRight size={15} />
            </button>

            <div className="space-y-1.5 pt-2 text-[11px] text-stone-500">
              <p className="flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-700 flex-shrink-0" />
                <span>100% Secure Checkout & Escrow Protection</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Truck size={14} className="text-forest-700 flex-shrink-0" />
                <span>Hand-packed in Kohima · Air courier delivery</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
