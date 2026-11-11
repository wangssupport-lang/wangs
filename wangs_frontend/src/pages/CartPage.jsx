import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, Tag, ShieldCheck, Truck, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { useToast } from '../context/ToastContext';
import { resolveProductImage } from '../utils/image';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, clearCart, itemsCount } = useCart();
  const { user, requireAuth } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [quote, setQuote] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState(null);

  const changeQuantity = async (productId, quantity) => {
    setUpdatingProductId(productId);
    try {
      await updateQuantity(productId, quantity);
    } catch (err) {
      toast.error(err.message || 'Could not update basket quantity');
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleRemove = async (productId) => {
    setUpdatingProductId(productId);
    try {
      await removeFromCart(productId);
    } catch (err) {
      toast.error(err.message || 'Could not remove item from basket');
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleClearCart = async () => {
    try {
      await clearCart();
    } catch (err) {
      toast.error(err.message || 'Could not clear basket');
    }
  };

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
    if (cart?.items?.length) {
      fetchQuote(appliedCoupon);
    }
  }, [cart, appliedCoupon]);

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
    delivery_fee: '0.00',
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
        <div className="w-24 h-24 bg-red-50 rounded-3xl flex items-center justify-center mx-auto text-red-500 shadow-inner">
          <ShoppingBag size={40} />
        </div>
        <h2 className="font-serif text-3xl font-bold text-stone-900">Your basket is currently empty</h2>
        <p className="text-xs sm:text-sm text-stone-500 max-w-sm mx-auto leading-relaxed">
          Taste authentic King Chilli, bamboo shoot, and traditional recipes handcrafted by verified heritage producers.
        </p>
        <Link
          to="/products"
          className="mt-4 inline-flex items-center gap-2 px-7 py-3.5 bg-primary hover:bg-primary-container text-on-primary text-xs font-bold rounded-2xl shadow-xs transition-all active:scale-95"
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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-outline-variant/30 pb-6">
        <div>
          <span className="text-xs font-bold tracking-wider uppercase text-primary">Artisan Cart</span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-on-surface mt-1">
            Shopping Basket ({itemsCount} {itemsCount === 1 ? 'jar' : 'jars'})
          </h1>
        </div>

        {/* Free Shipping Pill */}
        <div className="bg-surface-container-low px-4 py-2.5 rounded-2xl border border-outline-variant/30 shadow-xs max-w-md w-full sm:w-auto text-xs">
          <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
            <Truck size={15} className="text-primary shrink-0" />
            <span>100% Free Nationwide Delivery Included on All Orders</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Items List */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/30 shadow-xs divide-y divide-outline-variant/20 overflow-hidden">
            {items.map((item) => (
              <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-5">
                <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                  <img
                    src={resolveProductImage(item.product.primary_image_url || (item.product.images && item.product.images[0] ? item.product.images[0].image_url : ''))}
                    alt={item.product.title}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/featured-pouches.png';
                    }}
                    className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-2xl border border-outline-variant/30 flex-shrink-0 shadow-xs"
                  />
                  <div className="min-w-0 flex-1">
                    <Link to={`/product/${item.product.slug}`} className="font-serif font-bold text-sm sm:text-base text-on-surface hover:text-primary transition-colors line-clamp-1">
                      {item.product.title}
                    </Link>
                    <p className="text-[11px] sm:text-xs text-on-surface-variant mt-0.5 truncate">
                      {item.product.weight_grams}g · {item.product.manufacturer?.business_name}
                    </p>
                    <p className="text-xs sm:text-sm font-bold text-primary mt-1 font-serif">
                      ₹{parseFloat(item.product.price).toFixed(0)} each
                    </p>
                    {(item.product.is_in_stock === false || (item.product.stock_quantity !== undefined && item.product.stock_quantity <= 0)) && (
                      <p className="text-[10px] sm:text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md mt-1 inline-block">
                        All product sold out · Product will be in stock soon
                      </p>
                    )}
                  </div>
                </div>

                {/* Adjuster & Line Total */}
                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-outline-variant/20">
                  <div className="flex items-center border border-outline-variant/30 rounded-xl bg-surface-container-low overflow-hidden">
                    <button
                      onClick={() => changeQuantity(item.product.id, item.quantity - 1)}
                      disabled={updatingProductId === item.product.id}
                      aria-label={`Decrease quantity of ${item.product.title}`}
                      className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all cursor-pointer"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="px-2.5 text-xs font-black text-on-surface font-mono">{item.quantity}</span>
                    <button
                      onClick={() => changeQuantity(item.product.id, item.quantity + 1)}
                      disabled={updatingProductId === item.product.id || item.quantity >= item.product.stock_quantity}
                      aria-label={`Increase quantity of ${item.product.title}`}
                      className="w-8 h-8 flex items-center justify-center text-on-surface-variant hover:bg-surface-container active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus size={13} />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-lg font-serif font-bold text-primary block">
                      ₹{(parseFloat(item.product.price) * item.quantity).toFixed(0)}
                    </span>
                    <button
                      onClick={() => handleRemove(item.product.id)}
                      disabled={updatingProductId === item.product.id}
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
            <Link to="/products" className="text-xs text-red-600 font-bold hover:underline">
              ← Continue Shopping in Pantry
            </Link>
            <button onClick={handleClearCart} className="text-xs text-stone-400 hover:text-red-600 transition-colors">
              Clear All Items
            </button>
          </div>
        </div>

        {/* Financial Summary Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          {/* Promo Code Box */}
          <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-artisan space-y-3">
            <h3 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-2">
              <Tag size={15} className="text-red-600" /> Apply Promo Code
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
                  placeholder="e.g. WANGS10 or WANGS50"
                  className="flex-1 px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs uppercase font-mono font-bold focus:outline-none focus:ring-1 focus:ring-red-600"
                />
                <button
                  type="submit"
                  disabled={calculating}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Apply
                </button>
              </form>
            )}
            {couponError && <p className="text-[11px] text-red-500">{couponError}</p>}
            <p className="text-[11px] text-stone-400">
              Try <strong>WANGS10</strong> (10% off) or <strong>WANGS50</strong> (₹50 off on ₹400+).
            </p>
          </div>

          {/* Pricing Breakdown Card */}
          <div className="bg-red-50/40 p-7 rounded-3xl border border-red-100 shadow-artisan space-y-5">
            <h3 className="font-serif font-bold text-lg text-stone-900 border-b border-red-200/80 pb-3">
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

              <div className="border-t border-outline-variant/30 pt-3 flex justify-between items-baseline text-sm font-bold text-on-surface">
                <span>Total Amount Payable</span>
                <span className="text-2xl font-serif font-black text-primary">₹{parseFloat(summary.total_amount).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={() => {
                if (!user) {
                  requireAuth(() => navigate('/checkout'), 'proceed with your order');
                  return;
                }
                navigate('/checkout');
              }}
              className="w-full py-4 bg-primary hover:bg-primary-container text-on-primary font-bold text-xs rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <span>Proceed to Delivery &amp; Checkout</span>
              <ArrowRight size={15} />
            </button>

            <div className="space-y-2 pt-2 text-[11px] text-on-surface-variant">
              <p className="flex items-center gap-1.5 font-medium">
                <ShieldCheck size={14} className="text-secondary flex-shrink-0" />
                <span>100% Escrow Protection &amp; Tamper-Evident Packaging</span>
              </p>
              <p className="flex items-center gap-1.5 font-medium">
                <Truck size={14} className="text-primary flex-shrink-0" />
                <span>Direct zero-leak express logistics</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
