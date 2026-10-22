import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Tag, ShieldCheck, Truck, Sparkles } from 'lucide-react';
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
      setCouponError(err.message || 'Invalid coupon code');
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

  const subtotal = parseFloat(summary.items_subtotal) || 0;
  const freeThreshold = 999;
  const progressPercent = Math.min(100, Math.round((subtotal / freeThreshold) * 100));
  const remainingForFree = Math.max(0, freeThreshold - subtotal);

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-24 h-24 bg-cream-100 rounded-3xl flex items-center justify-center mx-auto text-forest-800/40 shadow-inner">
          <ShoppingBag size={40} />
        </div>
        <h2 className="font-serif text-3xl font-bold text-stone-900">Your basket is currently empty</h2>
        <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto leading-relaxed">
          Taste authentic Naga smoked pork, King Chilli, and wild forest condiments cured in Kohima.
        </p>
        <Link
          to="/products"
          className="mt-4 inline-flex items-center gap-2 px-7 py-3.5 bg-forest-900 hover:bg-forest-950 text-white text-xs font-bold rounded-2xl shadow-md transition-all hover:scale-102"
        >
          <span>Browse Authentic Pickles</span>
          <ArrowRight size={15} />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
      {/* Title & Free Delivery Progress */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200/80 pb-6">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-forest-700">Artisan Cart</span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-950 mt-1">
            Shopping Basket ({itemsCount} {itemsCount === 1 ? 'jar' : 'jars'})
          </h1>
        </div>

        {/* Free Shipping Pill */}
        <div className="bg-white p-3.5 rounded-2xl border border-stone-200 shadow-sm max-w-md w-full sm:w-auto text-xs space-y-1.5">
          <div className="flex justify-between items-center text-[11px] font-bold text-forest-900">
            <span className="flex items-center gap-1.5">
              <Truck size={14} className="text-forest-700" />
              {remainingForFree === 0 ? (
                <span className="text-emerald-700">Unlocked Free Pan-India Air Delivery!</span>
              ) : (
                <span>Add ₹{remainingForFree.toFixed(0)} more for Free Delivery</span>
              )}
            </span>
            <span className="font-mono text-stone-500">{progressPercent}%</span>
          </div>
          <div className="w-full sm:w-64 bg-stone-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-forest-600 to-emerald-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-artisan divide-y divide-stone-100 overflow-hidden">
            {items.map((item) => (
              <div key={item.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <img
                    src={item.product.primary_image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=300&q=80'}
                    alt={item.product.title}
                    className="w-20 h-20 object-cover rounded-2xl border border-stone-200 flex-shrink-0 shadow-sm"
                  />
                  <div>
                    <Link to={`/product/${item.product.slug}`} className="font-serif font-bold text-base text-stone-900 hover:text-forest-800 transition-colors line-clamp-1">
                      {item.product.title}
                    </Link>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {item.product.weight_grams}g · {item.product.manufacturer?.business_name}
                    </p>
                    <p className="text-sm font-bold text-stone-950 mt-1 font-serif">
                      ₹{parseFloat(item.product.price).toFixed(0)} each
                    </p>
                  </div>
                </div>

                {/* Adjuster & Line Total */}
                <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                  <div className="flex items-center border border-stone-300 rounded-xl bg-stone-50 overflow-hidden shadow-inner">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="px-3 py-1.5 text-stone-600 hover:bg-stone-200 transition-colors"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="px-3 text-xs font-black text-stone-900 font-mono">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="px-3 py-1.5 text-stone-600 hover:bg-stone-200 transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-serif font-bold text-stone-950 block">
                      ₹{(parseFloat(item.product.price) * item.quantity).toFixed(0)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-xs text-stone-400 hover:text-chilli-700 mt-1 flex items-center gap-1 transition-colors font-medium ml-auto"
                    >
                      <Trash2 size={13} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <Link to="/products" className="text-xs text-forest-800 font-bold hover:underline">
              ← Continue Shopping in Pantry
            </Link>
            <button onClick={clearCart} className="text-xs text-stone-400 hover:text-chilli-700 transition-colors">
              Clear All Items
            </button>
          </div>
        </div>

        {/* Financial Summary Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          {/* Promo Code Box */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-artisan space-y-3">
            <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
              <Tag size={15} className="text-forest-700" /> Apply Promo Code
            </h3>
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold">
                <span>Code {appliedCoupon} applied!</span>
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
                  className="flex-1 px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs uppercase font-mono font-bold focus:outline-none focus:ring-1 focus:ring-forest-800"
                />
                <button
                  type="submit"
                  disabled={calculating}
                  className="px-4 py-2 bg-forest-900 hover:bg-forest-950 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Apply
                </button>
              </form>
            )}
            {couponError && <p className="text-[11px] text-red-500">{couponError}</p>}
            <p className="text-[11px] text-stone-400">
              Try <strong>WANGS10</strong> (10% off) or <strong>NAGA50</strong> (₹50 off on ₹400+).
            </p>
          </div>

          {/* Pricing Breakdown Card */}
          <div className="bg-cream-100 p-7 rounded-3xl border border-stone-200 shadow-artisan space-y-5">
            <h3 className="font-serif font-bold text-lg text-stone-900 border-b border-stone-200/80 pb-3">
              Order Breakdown
            </h3>

            <div className="space-y-2.5 text-xs text-stone-700">
              <div className="flex justify-between">
                <span>Items Subtotal</span>
                <span className="font-bold text-stone-900">₹{parseFloat(summary.items_subtotal).toFixed(2)}</span>
              </div>

              {parseFloat(summary.discount_amount) > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Discount Applied</span>
                  <span>-₹{parseFloat(summary.discount_amount).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="flex items-center gap-1">
                  Customer Platform Fee
                  <span className="text-[10px] text-stone-400 font-normal">(Fixed ₹5)</span>
                </span>
                <span className="font-bold text-stone-900">₹{parseFloat(summary.customer_platform_fee).toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Standard Delivery Fee</span>
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

            <button
              onClick={() => navigate('/checkout')}
              className="w-full py-4 bg-forest-900 hover:bg-forest-950 text-white font-bold text-xs rounded-2xl shadow-lg hover:shadow-xl flex items-center justify-center gap-2 transition-all hover:scale-101 active:scale-99"
            >
              <span>Proceed to Delivery & Checkout</span>
              <ArrowRight size={15} />
            </button>

            <div className="space-y-2 pt-2 text-[11px] text-stone-500">
              <p className="flex items-center gap-1.5 font-medium">
                <ShieldCheck size={14} className="text-emerald-600 flex-shrink-0" />
                <span>100% Escrow Protection & Tamper-Evident Packaging</span>
              </p>
              <p className="flex items-center gap-1.5 font-medium">
                <Truck size={14} className="text-forest-600 flex-shrink-0" />
                <span>Direct express air dispatch from Kohima, Nagaland</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
