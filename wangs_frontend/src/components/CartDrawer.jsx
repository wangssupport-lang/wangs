import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ShieldCheck, Info } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartDrawer() {
  const { cart, isDrawerOpen, setIsDrawerOpen, updateQuantity, removeFromCart, itemsCount } = useCart();
  const navigate = useNavigate();

  if (!isDrawerOpen) return null;

  const items = cart?.items || [];
  const summary = cart?.financial_summary || {
    items_subtotal: '0.00',
    customer_platform_fee: '5.00',
    delivery_fee: '50.00',
    total_amount: '0.00',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 bg-cream-50 border-b border-stone-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-forest-900 text-cream-50 flex items-center justify-center font-bold text-xs">
                {itemsCount}
              </div>
              <h2 className="font-serif font-bold text-xl text-stone-900">Your Basket</h2>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1.5 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-stone-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-cream-100 flex items-center justify-center mb-4 text-forest-900">
                  <ShoppingBag size={28} />
                </div>
                <h3 className="font-serif font-bold text-lg text-stone-900">Your basket is empty</h3>
                <p className="text-xs text-stone-500 mt-1 max-w-xs leading-relaxed">
                  Discover authentic Naga smoked pork, fiery King Chilli, and wild bamboo shoot pickles.
                </p>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    navigate('/products');
                  }}
                  className="mt-6 px-6 py-3 bg-forest-900 hover:bg-forest-950 text-cream-50 text-xs font-bold rounded-xl shadow-sm transition-colors"
                >
                  Explore Authentic Batches
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="py-4 flex gap-4">
                  <img
                    src={item.product.primary_image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&q=80'}
                    alt={item.product.title}
                    className="w-18 h-18 object-cover rounded-xl border border-stone-200/80 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${item.product.slug}`}
                      onClick={() => setIsDrawerOpen(false)}
                      className="font-serif font-bold text-sm text-stone-900 hover:text-forest-800 line-clamp-1"
                    >
                      {item.product.title}
                    </Link>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      {item.product.weight_grams}g · {item.product.manufacturer?.business_name}
                    </p>
                    <p className="text-sm font-bold text-stone-900 mt-1">
                      ₹{parseFloat(item.product.price).toFixed(0)}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center border border-stone-200 rounded-lg bg-stone-50 shadow-subtle">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="px-2 py-1 hover:bg-stone-200 text-stone-600 rounded-l"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="px-2.5 text-xs font-bold text-stone-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="px-2 py-1 hover:bg-stone-200 text-stone-600 rounded-r"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
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

          {/* Footer Summary with Section 6 Rules */}
          {items.length > 0 && (
            <div className="p-6 bg-cream-50 border-t border-stone-200/80 flex flex-col gap-3.5">
              <div className="space-y-2 text-xs text-stone-700">
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-stone-900">₹{parseFloat(summary.items_subtotal).toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    Customer Platform Fee
                    <span className="text-[10px] text-stone-400 font-mono">(₹5.00)</span>
                  </span>
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

                <div className="border-t border-stone-200/80 pt-2.5 flex justify-between items-baseline text-sm font-bold text-stone-950">
                  <span>Total Amount Payable</span>
                  <span className="text-xl font-serif text-forest-900">₹{parseFloat(summary.total_amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2.5 mt-1">
                <Link
                  to="/cart"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 py-3 text-center text-xs font-bold text-forest-900 bg-white border border-stone-300 rounded-xl hover:bg-stone-50 transition-colors shadow-subtle"
                >
                  View Full Cart
                </Link>
                <Link
                  to="/checkout"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-[2] py-3 flex items-center justify-center gap-2 text-xs font-bold text-cream-50 bg-forest-900 hover:bg-forest-950 rounded-xl shadow-md transition-colors"
                >
                  <span>Checkout</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              <p className="text-[10px] text-stone-400 text-center flex items-center justify-center gap-1">
                <ShieldCheck size={12} className="text-emerald-600" />
                <span>Reinforced glass packaging & tamper-evident safety seal</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
