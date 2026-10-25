import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck, ShieldCheck, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function CartDrawer() {
  const { cart, isDrawerOpen, setIsDrawerOpen, updateQuantity, removeFromCart, itemsCount } = useCart();
  const toast = useToast();
  const navigate = useNavigate();
  const [updatingProductId, setUpdatingProductId] = React.useState(null);

  if (!isDrawerOpen) return null;

  const items = cart?.items || [];
  const summary = cart?.financial_summary || {
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

  const updateItem = async (productId, quantity) => {
    setUpdatingProductId(productId);
    try {
      await updateQuantity(productId, quantity);
    } catch (err) {
      toast.error(err.message || 'Could not update basket quantity');
    } finally {
      setUpdatingProductId(null);
    }
  };

  const removeItem = async (productId) => {
    setUpdatingProductId(productId);
    try {
      await removeFromCart(productId);
    } catch (err) {
      toast.error(err.message || 'Could not remove item from basket');
    } finally {
      setUpdatingProductId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={() => setIsDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-8">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-l border-stone-200">
          {/* Drawer Header */}
          <div className="px-6 py-5 bg-gradient-to-b from-cream-100 to-white border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-forest-900 text-cream-100 flex items-center justify-center shadow-sm">
                <ShoppingBag size={18} />
              </div>
              <div>
                <h2 className="font-serif font-bold text-lg text-stone-950 leading-none">
                  Your Artisan Basket
                </h2>
                <span className="text-[11px] text-stone-500 font-medium">
                  {itemsCount} {itemsCount === 1 ? 'jar' : 'jars'} selected
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Free Shipping Badge */}
          {items.length > 0 && (
            <div className="px-6 py-2.5 bg-emerald-50/80 border-b border-emerald-100 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-[11px]">
                <Truck size={14} className="text-emerald-700 shrink-0" />
                <span>100% Free Nationwide Delivery Unlocked on All Orders!</span>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-stone-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
                <div className="w-20 h-20 rounded-full bg-cream-100 flex items-center justify-center text-forest-800/40">
                  <ShoppingBag size={36} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-xl text-stone-900">Your basket is empty</h3>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                    Explore firewood-smoked pork, fiery King Chilli, and wild bamboo shoot pickles cured in Kohima.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    navigate('/products');
                  }}
                  className="px-6 py-3 bg-forest-900 hover:bg-forest-950 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  Explore Authentic Pickles
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="py-4 flex gap-4 items-center">
                  <img
                    src={item.product.primary_image_url || '/featured-pouches.png'}
                    alt={item.product.title}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/featured-pouches.png';
                    }}
                    className="w-16 h-16 sm:w-18 sm:h-18 object-cover rounded-xl border border-stone-200 flex-shrink-0 shadow-sm"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${item.product.slug}`}
                      onClick={() => setIsDrawerOpen(false)}
                      className="font-serif font-bold text-sm text-stone-900 hover:text-forest-800 line-clamp-1 leading-snug"
                    >
                      {item.product.title}
                    </Link>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {item.product.weight_grams}g · {item.product.manufacturer?.business_name}
                    </p>
                    <p className="text-sm font-bold text-stone-950 mt-1 font-serif">
                      ₹{parseFloat(item.product.price).toFixed(0)}
                    </p>
                    {(item.product.is_in_stock === false || (item.product.stock_quantity !== undefined && item.product.stock_quantity <= 0)) && (
                      <p className="text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded mt-1 inline-block">
                        All product sold out · In stock soon
                      </p>
                    )}

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50 overflow-hidden shadow-inner">
                        <button
                          onClick={() => updateItem(item.product.id, item.quantity - 1)}
                          disabled={updatingProductId === item.product.id}
                          aria-label={`Decrease quantity of ${item.product.title}`}
                          className="px-2 py-1 hover:bg-stone-200 text-stone-600 transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-stone-900 font-mono">{item.quantity}</span>
                        <button
                          onClick={() => updateItem(item.product.id, item.quantity + 1)}
                          disabled={updatingProductId === item.product.id || item.quantity >= item.product.stock_quantity}
                          aria-label={`Increase quantity of ${item.product.title}`}
                          className="px-2 py-1 hover:bg-stone-200 text-stone-600 transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.product.id)}
                        disabled={updatingProductId === item.product.id}
                        aria-label={`Remove ${item.product.title} from basket`}
                        className="text-stone-400 hover:text-chilli-700 p-1 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Drawer Footer with Financial Rule Breakdown */}
          {items.length > 0 && (
            <div className="p-6 bg-cream-50 border-t border-stone-200 space-y-3">
              <div className="space-y-2 text-xs text-stone-700">
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-stone-900">₹{parseFloat(summary.items_subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer Platform Fee</span>
                  <span className="font-semibold text-stone-900">₹{parseFloat(summary.customer_platform_fee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-semibold text-stone-900">
                    {parseFloat(summary.delivery_fee) === 0 ? (
                      <span className="text-emerald-700 font-bold uppercase text-[10px]">Free</span>
                    ) : (
                      `₹${parseFloat(summary.delivery_fee).toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="border-t border-stone-200 pt-2.5 flex justify-between items-baseline text-sm font-bold text-stone-950">
                  <span>Total Payable</span>
                  <span className="text-xl font-serif text-forest-950">₹{parseFloat(summary.total_amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <Link
                  to="/cart"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 py-3 text-center text-xs font-bold text-forest-900 bg-white border border-forest-900/30 rounded-xl hover:bg-forest-50 transition-colors shadow-sm"
                >
                  View Full Cart
                </Link>
                <Link
                  to="/checkout"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-[2] py-3 flex items-center justify-center gap-1.5 text-xs font-bold text-white bg-forest-900 hover:bg-forest-950 rounded-xl shadow-md hover:shadow-lg transition-all"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={15} />
                </Link>
              </div>

              <p className="text-[10px] text-stone-400 text-center flex items-center justify-center gap-1">
                <ShieldCheck size={13} className="text-emerald-600" />
                <span>256-bit Encrypted Escrow · Verified Artisanal Producers</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
