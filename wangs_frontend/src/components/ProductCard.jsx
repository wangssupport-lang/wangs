import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, CheckCircle, ShieldCheck, Plus, Minus, Flame, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import SpiceMeter from './SpiceMeter';

export default function ProductCard({ product }) {
  const { cart, addToCart, updateQuantity } = useCart();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Check if item is already in cart
  const cartItem = cart?.items?.find((i) => i.product.id === product.id);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.is_in_stock || adding) return;

    setAdding(true);
    try {
      await addToCart(product.id, 1);
      setAdded(true);
      toast.success(`Added ${product.title} to basket`);
      setTimeout(() => setAdded(false), 1200);
    } catch (err) {
      toast.error(err.message || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  };

  const handleIncrement = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartItem && cartItem.quantity < product.stock_quantity) {
      await updateQuantity(product.id, cartItem.quantity + 1);
    }
  };

  const handleDecrement = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartItem) {
      await updateQuantity(product.id, cartItem.quantity - 1);
    }
  };

  const discountPercent = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <div className="group relative bg-white rounded-2xl border border-stone-200/90 shadow-artisan hover:shadow-artisan-hover transition-all duration-300 flex flex-col overflow-hidden hover:border-forest-700/40">
      {/* Product Image Link */}
      <Link to={`/product/${product.slug}`} className="block relative aspect-square overflow-hidden bg-cream-100">
        <img
          src={product.primary_image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'}
          alt={product.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          loading="lazy"
        />

        {/* Top Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.is_bestseller && (
            <span className="bg-gradient-to-r from-amber-600 to-amber-700 text-white text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
              <Sparkles size={10} /> Bestseller
            </span>
          )}
          {discountPercent > 0 && (
            <span className="bg-chilli-700 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Veg / Non-Veg Indicator */}
        <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm p-1.5 rounded-lg shadow-sm border border-stone-200">
          <div className={`w-3.5 h-3.5 border flex items-center justify-center ${product.dietary_type === 'VEG' ? 'border-emerald-600' : 'border-amber-900'}`}>
            <div className={`w-2 h-2 rounded-full ${product.dietary_type === 'VEG' ? 'bg-emerald-600' : 'bg-amber-900'}`}></div>
          </div>
        </div>

        {/* Weight & Origin Pill */}
        <div className="absolute bottom-2.5 left-2.5 z-10 bg-forest-950/80 backdrop-blur-md text-cream-100 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 border border-forest-800">
          <span>{product.weight_grams}g</span>
          <span className="opacity-40">·</span>
          <span className="text-[10px] text-amber-300 font-medium">Kohima</span>
        </div>
      </Link>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        {/* Producer & Heat */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1 text-[11px] text-forest-800 font-bold tracking-tight truncate">
            <ShieldCheck size={13} className="text-forest-700 flex-shrink-0" />
            <span className="truncate">{product.manufacturer?.business_name}</span>
          </div>
          <SpiceMeter level={product.spice_level} showLabel={false} size="sm" />
        </div>

        {/* Title */}
        <Link to={`/product/${product.slug}`} className="group-hover:text-forest-800 transition-colors">
          <h3 className="font-serif font-bold text-stone-900 text-base leading-snug line-clamp-2 min-h-[2.8rem]">
            {product.title}
          </h3>
        </Link>

        {/* Ingredients highlights */}
        <p className="text-xs text-stone-500 line-clamp-1 mt-1">
          {product.ingredients?.split(',').slice(0, 3).join(', ')}
        </p>

        {/* Pricing and Action Bar */}
        <div className="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold font-serif text-stone-950">₹{parseFloat(product.price).toFixed(0)}</span>
              {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
                <span className="text-xs text-stone-400 line-through">₹{parseFloat(product.mrp).toFixed(0)}</span>
              )}
            </div>
            <p className="text-[10px] text-stone-500 font-medium">
              {product.stock_quantity > 0 ? (
                product.stock_quantity <= 5 ? (
                  <span className="text-amber-700 font-bold">Only {product.stock_quantity} left</span>
                ) : (
                  <span className="text-emerald-700">In Stock</span>
                )
              ) : (
                <span className="text-red-500 font-bold">Sold Out</span>
              )}
            </p>
          </div>

          {/* If already in cart, show quick stepper; otherwise show Add button */}
          {cartItem ? (
            <div className="flex items-center border border-forest-800 rounded-xl bg-forest-50 overflow-hidden shadow-sm">
              <button
                onClick={handleDecrement}
                className="px-2 py-1.5 text-forest-900 hover:bg-forest-100 text-xs font-bold transition-colors"
                title="Decrease quantity"
              >
                <Minus size={13} />
              </button>
              <span className="px-2.5 text-xs font-black text-forest-950 font-mono">
                {cartItem.quantity}
              </span>
              <button
                onClick={handleIncrement}
                disabled={cartItem.quantity >= product.stock_quantity}
                className="px-2 py-1.5 text-forest-900 hover:bg-forest-100 text-xs font-bold transition-colors disabled:opacity-30"
                title="Increase quantity"
              >
                <Plus size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={!product.is_in_stock || adding}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all duration-200 shadow-sm ${
                added
                  ? 'bg-emerald-600 text-white'
                  : product.is_in_stock
                  ? 'bg-forest-900 hover:bg-forest-950 text-white hover:scale-102 active:scale-98'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              {added ? (
                <>
                  <CheckCircle size={14} /> Added
                </>
              ) : adding ? (
                <span>Adding...</span>
              ) : (
                <>
                  <ShoppingBag size={14} /> Add
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
