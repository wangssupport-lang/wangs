import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Truck, ShieldCheck, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { resolveProductImage } from '../utils/image';

export default function CartDrawer() {
  const { cart, isDrawerOpen, setIsDrawerOpen, updateQuantity, removeFromCart, itemsCount } = useCart();
  const { user, requireAuth } = useAuth();
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
    <div className="fixed inset-0 z-[70] overflow-hidden">
      {/* Backdrop - Solid opacity, no glass blur */}
      <div
        className="absolute inset-0 bg-stone-950/70 transition-opacity duration-300"
        onClick={() => setIsDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-8">
        <div className="w-screen max-w-full sm:max-w-md bg-surface-container-lowest shadow-2xl flex flex-col border-l border-outline-variant/30">
          {/* Drawer Header */}
          <div className="px-5 sm:px-6 py-4 sm:py-5 bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-xs">
                <ShoppingBag size={18} />
              </div>
              <div>
                <h2 className="font-serif font-bold text-lg text-on-surface leading-none">
                  Your Jar Bag
                </h2>
                <span className="text-[11px] text-on-surface-variant font-medium">
                  {itemsCount} {itemsCount === 1 ? 'jar' : 'jars'} selected
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 rounded-full text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Milestone Progress Bar: Goal Gradient Effect */}
          {items.length > 0 && (
            <div className="px-5 py-3 bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-emerald-50/90 border-b border-amber-200/60 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                {subtotal >= 699 ? (
                  <span className="font-bold text-emerald-800 flex items-center gap-1">
                    <Sparkles size={13} className="text-emerald-600 shrink-0" />
                    <span>Free Shipping + Free Handcrafted Tasting Spoon Unlocked!</span>
                  </span>
                ) : (
                  <span className="font-semibold text-stone-800 flex items-center gap-1">
                    <span>Add <strong className="text-primary font-bold">₹{Math.round(699 - subtotal)}</strong> more for a <strong className="text-amber-800">Free Tasting Spoon!</strong></span>
                  </span>
                )}
                <span className="text-[10px] font-mono font-bold text-stone-500">
                  {Math.min(100, Math.round((subtotal / 699) * 100))}%
                </span>
              </div>

              {/* Visual Progress Bar */}
              <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(12, Math.round((subtotal / 699) * 100)))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[9.5px] text-stone-500">
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <Truck size={11} /> 100% Free Shipping Included
                </span>
                <span>Tier ₹699: Free Wooden Spoon</span>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-stone-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
                <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center text-red-500">
                  <ShoppingBag size={36} />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif font-bold text-xl text-stone-900">Your basket is empty</h3>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                    Explore authentic King Chilli, fermented bamboo shoot, and traditional heritage pickles.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    navigate('/products');
                  }}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all"
                >
                  Explore Authentic Pickles
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="py-4 flex gap-4 items-center">
                  <img
                    src={resolveProductImage(item.product.primary_image_url || (item.product.images && item.product.images[0] ? item.product.images[0].image_url : ''))}
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
                      className="font-serif font-bold text-sm text-stone-900 hover:text-red-600 line-clamp-1 leading-snug"
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
                          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-stone-200 text-stone-600 active:scale-95 transition-all cursor-pointer"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-stone-900 font-mono">{item.quantity}</span>
                        <button
                          onClick={() => updateItem(item.product.id, item.quantity + 1)}
                          disabled={updatingProductId === item.product.id || item.quantity >= item.product.stock_quantity}
                          aria-label={`Increase quantity of ${item.product.title}`}
                          className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-stone-200 text-stone-600 active:scale-95 transition-all cursor-pointer"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.product.id)}
                        disabled={updatingProductId === item.product.id}
                        aria-label={`Remove ${item.product.title} from basket`}
                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-stone-400 hover:text-red-600 active:scale-90 transition-all cursor-pointer"
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
                <div className="border-t border-outline-variant/30 pt-2.5 flex justify-between items-baseline text-sm font-bold text-on-surface">
                  <span>Total Payable</span>
                  <span className="text-xl font-serif text-primary">₹{parseFloat(summary.total_amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <Link
                  to="/cart"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 py-3 text-center text-xs font-bold text-primary bg-surface-container-lowest border border-primary/40 rounded-xl hover:bg-primary-fixed transition-colors shadow-xs active:scale-95"
                >
                  View Cart
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      requireAuth(() => {
                        setIsDrawerOpen(false);
                        navigate('/checkout');
                      }, 'proceed with your order');
                      return;
                    }
                    setIsDrawerOpen(false);
                    navigate('/checkout');
                  }}
                  className="flex-[2] py-3 flex items-center justify-center gap-1.5 text-xs font-bold text-on-primary bg-primary hover:bg-primary-container rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={15} />
                </button>
              </div>

              <p className="text-[10px] text-stone-400 text-center flex items-center justify-center gap-1 pb-[calc(env(safe-area-inset-bottom,0px)+4px)]">
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
