import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
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
        className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm transition-opacity"
        onClick={() => setIsDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 bg-cream-100 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="text-forest-800" size={20} />
              <h2 className="font-serif font-bold text-lg text-stone-900">Your Basket</h2>
              <span className="bg-forest-800 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {itemsCount}
              </span>
            </div>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
            >
              <X size={20} />
            </button>
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto px-6 py-4 divide-y divide-stone-100">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-full bg-cream-200 flex items-center justify-center mb-4">
                  <ShoppingBag size={28} className="text-stone-400" />
                </div>
                <h3 className="font-serif font-semibold text-lg text-stone-800">Your basket is empty</h3>
                <p className="text-sm text-stone-500 mt-1 max-w-xs">
                  Discover authentic Naga smoked pork, fiery King Chilli, and wild bamboo shoot pickles.
                </p>
                <button
                  onClick={() => {
                    setIsDrawerOpen(false);
                    navigate('/products');
                  }}
                  className="mt-6 px-5 py-2.5 bg-forest-800 hover:bg-forest-900 text-white text-sm font-medium rounded-lg shadow-sm"
                >
                  Explore Authentic Pickles
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="py-4 flex gap-4">
                  <img
                    src={item.product.primary_image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&q=80'}
                    alt={item.product.title}
                    className="w-18 h-18 object-cover rounded-lg border border-stone-200 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/product/${item.product.slug}`}
                      onClick={() => setIsDrawerOpen(false)}
                      className="font-serif font-bold text-sm text-stone-900 hover:text-forest-700 line-clamp-1"
                    >
                      {item.product.title}
                    </Link>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {item.product.weight_grams}g · {item.product.manufacturer?.business_name}
                    </p>
                    <p className="text-sm font-semibold text-stone-900 mt-1">
                      ₹{parseFloat(item.product.price).toFixed(0)}
                    </p>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-stone-200 rounded-md bg-stone-50">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 hover:bg-stone-200 text-stone-600 rounded-l"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="px-2 text-xs font-semibold text-stone-800">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 hover:bg-stone-200 text-stone-600 rounded-r"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-stone-400 hover:text-chilli-700 p-1"
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
            <div className="p-6 bg-cream-50 border-t border-stone-200 flex flex-col gap-3">
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Items Subtotal</span>
                  <span className="font-medium text-stone-900">₹{parseFloat(summary.items_subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer Platform Fee</span>
                  <span className="font-medium text-stone-900">₹{parseFloat(summary.customer_platform_fee).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee</span>
                  <span className="font-medium text-stone-900">
                    {parseFloat(summary.delivery_fee) === 0 ? (
                      <span className="text-emerald-700 font-bold uppercase text-[10px]">Free</span>
                    ) : (
                      `₹${parseFloat(summary.delivery_fee).toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="border-t border-stone-200 pt-2 flex justify-between text-sm font-bold text-stone-900">
                  <span>Total Payable</span>
                  <span className="text-base text-forest-900">₹{parseFloat(summary.total_amount).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <Link
                  to="/cart"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-1 py-2.5 text-center text-xs font-semibold text-forest-800 bg-white border border-forest-800/30 rounded-lg hover:bg-forest-50 transition-colors"
                >
                  View Full Cart
                </Link>
                <Link
                  to="/checkout"
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex-[2] py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-forest-800 hover:bg-forest-900 rounded-lg shadow-sm transition-colors"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              <p className="text-[10px] text-stone-400 text-center">
                Secure 256-bit payment encrypted · Authentic Naga artisanal origin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
