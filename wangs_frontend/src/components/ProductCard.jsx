import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, CheckCircle, Plus, Minus, Sparkles, Star, Zap } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function ProductCard({ product }) {
  const { cart, addToCart, updateQuantity } = useCart();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Check if item is already in basket
  const cartItem = cart?.items?.find((i) => i.product.id === product.id);

  const inStock = product.is_in_stock !== false && (product.stock_quantity === undefined || product.stock_quantity > 0);
  const isLowStock = inStock && product.stock_quantity > 0 && product.stock_quantity <= 5;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock || adding) return;

    setAdding(true);
    try {
      await addToCart(product.id, 1);
      setAdded(true);
      toast.success(`Added ${product.title} to basket`);
      setTimeout(() => setAdded(false), 1400);
    } catch (err) {
      toast.error(err.message || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  };

  const handleIncrement = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartItem && cartItem.quantity < (product.stock_quantity || 99)) {
      try {
        await updateQuantity(product.id, cartItem.quantity + 1);
      } catch (err) {
        toast.error(err.message || 'Could not update basket quantity');
      }
    }
  };

  const handleDecrement = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartItem) {
      try {
        await updateQuantity(product.id, cartItem.quantity - 1);
      } catch (err) {
        toast.error(err.message || 'Could not update basket quantity');
      }
    }
  };

  const priceNum = Math.round(Number(product.price) || 0);
  const mrpNum = product.mrp ? Math.round(Number(product.mrp) || 0) : null;
  const hasDiscount = mrpNum && mrpNum > priceNum;
  const discountPercent = hasDiscount
    ? Math.round(((mrpNum - priceNum) / mrpNum) * 100)
    : 0;

  const imageUrl = (!imageError && product.primary_image_url)
    ? product.primary_image_url
    : '/featured-pouches.png';

  const brandName = product.manufacturer?.business_name || 'Artisan Brand';
  const provenance = product.origin_district || product.manufacturer?.location_district || '';
  const weightText = product.weight_grams ? `${product.weight_grams}g` : '';

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E7E5E4] bg-white shadow-xs hover:shadow-md hover:border-[#0B2417]/30 transition-all duration-300">
      <div>
        {/* Product Image Container */}
        <Link
          to={`/product/${product.slug}`}
          className="block relative aspect-square overflow-hidden bg-[#efeeeb]"
        >
          <img
            src={imageUrl}
            alt={product.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />

          {/* Floating Dietary Badge Top-Left */}
          <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1 items-center">
            {product.dietary_type === 'NON_VEG' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/95 backdrop-blur-xs px-2 py-0.5 text-[9.5px] font-bold text-red-600 shadow-xs uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                NON-VEG
              </span>
            ) : product.dietary_type === 'VEG' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5]/95 backdrop-blur-xs px-2 py-0.5 text-[9.5px] font-bold text-[#059669] shadow-xs uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                VEG
              </span>
            ) : product.dietary_type === 'VEG_MIXED' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50/95 backdrop-blur-xs px-2 py-0.5 text-[9.5px] font-bold text-amber-700 shadow-xs uppercase tracking-wider">
                VEG MIX
              </span>
            ) : null}

            {discountPercent > 0 && (
              <span className="rounded-full bg-[#F59E0B] text-[#1C1917] font-bold text-[9px] px-2 py-0.5 shadow-xs">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Provenance or Batch Code Bottom-Left */}
          <span className="absolute bottom-2 left-2 bg-[#1C1917]/75 backdrop-blur-xs text-white text-[9px] font-mono px-1.5 py-0.5 rounded">
            {provenance || `#${(product.sku || product.id || 'W').toString().slice(-4).toUpperCase()}`}
          </span>

          {/* Heat Meter Bottom-Right */}
          <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-white/90 backdrop-blur-xs px-1.5 py-0.5 rounded-full shadow-2xs">
            <span className="text-[11px] text-[#F59E0B]">🔥</span>
            {product.spice_level === 'EXTRA_HOT' ? (
              <>
                <span className="text-[11px] text-[#F59E0B]">🔥</span>
                <span className="text-[11px] text-[#F59E0B]">🔥</span>
              </>
            ) : product.spice_level === 'HOT' ? (
              <>
                <span className="text-[11px] text-[#F59E0B]">🔥</span>
                <span className="text-[11px] text-stone-300">🔥</span>
              </>
            ) : (
              <>
                <span className="text-[11px] text-stone-300">🔥</span>
                <span className="text-[11px] text-stone-300">🔥</span>
              </>
            )}
          </div>

          {/* Out of Stock Overlay */}
          {!inStock && (
            <div className="absolute inset-0 bg-[#1C1917]/60 backdrop-blur-[2px] flex items-center justify-center p-3 z-20 text-center">
              <span className="px-3 py-1 rounded-full bg-black/90 text-white text-xs font-bold border border-white/20 shadow-md">
                Sold Out
              </span>
            </div>
          )}
        </Link>

        {/* Card Body */}
        <div className="p-3 sm:p-3.5 space-y-1">
          {/* Brand Eyebrow */}
          <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-500 font-semibold truncate">
            {brandName}
          </p>

          {/* Product Title */}
          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="font-serif font-bold text-[#1C1917] text-xs sm:text-[14px] leading-snug line-clamp-2 min-h-[2rem] sm:min-h-[2.3rem] group-hover:text-[#0B2417] transition-colors">
              {product.title}
            </h3>
          </Link>

          {/* Packaging Spec */}
          <p className="text-[11px] text-stone-500">
            {weightText || '250g Jar'}
          </p>
        </div>
      </div>

      {/* Pricing & Cart Action Bar */}
      <div className="p-3 sm:p-3.5 pt-0 sm:pt-0 mt-auto">
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-stone-100">
          {/* Price block */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className="font-serif font-bold text-sm sm:text-base text-[#1C1917]">
                ₹{priceNum}
              </span>
              {hasDiscount && (
                <span className="text-[11px] text-stone-400 line-through">
                  ₹{mrpNum}
                </span>
              )}
            </div>

            {isLowStock ? (
              <p className="text-[9.5px] font-bold text-amber-700 flex items-center gap-0.5 truncate">
                <Zap size={9} /> Only {product.stock_quantity} left
              </p>
            ) : inStock ? (
              <span className="text-[10px] text-[#059669] font-semibold">
                In Stock
              </span>
            ) : null}
          </div>

          {/* Action: Add Button (+) or Stepper */}
          {cartItem ? (
            <div className="flex items-center rounded-full bg-[#efeeeb] border border-stone-300 overflow-hidden shadow-2xs h-8 shrink-0">
              <button
                type="button"
                onClick={handleDecrement}
                aria-label={`Decrease quantity of ${product.title}`}
                className="w-7 h-full flex items-center justify-center text-[#1C1917] hover:bg-stone-200 active:scale-90 transition-all font-bold"
              >
                <Minus size={12} />
              </button>
              <span className="px-2 text-xs font-bold text-[#1C1917] select-none">
                {cartItem.quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={cartItem.quantity >= (product.stock_quantity || 99) || !inStock}
                aria-label={`Increase quantity of ${product.title}`}
                className="w-7 h-full flex items-center justify-center text-[#1C1917] hover:bg-stone-200 active:scale-90 transition-all font-bold disabled:opacity-30"
              >
                <Plus size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock || adding}
              aria-label={`Add ${product.title} to cart`}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-xs transition-all active:scale-90 shrink-0 ${
                added
                  ? 'bg-[#059669] text-white'
                  : inStock
                  ? 'bg-[#1C1917] hover:bg-[#0B2417] text-white'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
              }`}
            >
              {added ? (
                <>
                  <CheckCircle size={13} className="text-white" />
                  <span>Added</span>
                </>
              ) : adding ? (
                <span className="animate-pulse">...</span>
              ) : !inStock ? (
                <span>Sold</span>
              ) : (
                <>
                  <Plus size={13} strokeWidth={2.5} />
                  <span>Add</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
