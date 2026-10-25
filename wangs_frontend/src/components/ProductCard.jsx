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
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200/85 bg-white shadow-2xs hover:shadow-lg hover:border-forest-700/40 transition-all duration-300">
      <div>
        {/* Product Image Container */}
        <Link
          to={`/product/${product.slug}`}
          className="block relative aspect-square overflow-hidden bg-stone-100/80"
        >
          <img
            src={imageUrl}
            alt={product.title}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />

          {/* Badges on Top */}
          <div className="absolute left-2 top-2 z-10 flex flex-wrap gap-1 items-center">
            {discountPercent > 0 && (
              <span className="rounded-md bg-rose-600 text-white font-extrabold text-[9.5px] sm:text-[10px] px-1.5 py-0.5 shadow-xs tracking-tight">
                {discountPercent}% OFF
              </span>
            )}
            {product.is_bestseller && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-400 text-amber-950 font-bold text-[9.5px] sm:text-[10px] px-1.5 py-0.5 shadow-xs">
                <Sparkles size={9} className="fill-amber-950" /> Bestseller
              </span>
            )}
          </div>

          {/* Weight Badge on Bottom-Right */}
          {weightText && (
            <div className="absolute right-2 bottom-2 z-10 bg-white/90 backdrop-blur-md border border-white/60 text-stone-800 text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
              {weightText}
            </div>
          )}

          {/* Out of Stock Overlay */}
          {!inStock && (
            <div className="absolute inset-0 bg-stone-950/50 backdrop-blur-[2px] flex items-center justify-center p-3 z-20 text-center">
              <span className="px-3 py-1 rounded-full bg-stone-900/90 text-white text-xs font-bold border border-white/20 shadow-md">
                Sold Out
              </span>
            </div>
          )}
        </Link>

        {/* Card Body */}
        <div className="p-3 sm:p-4">
          {/* Brand Name & Rating */}
          <div className="flex items-center justify-between gap-1.5">
            <Link
              to={`/products?brand=${encodeURIComponent(brandName)}`}
              className="text-[10.5px] sm:text-[11px] font-bold uppercase tracking-wider text-forest-800 hover:text-forest-950 truncate transition-colors"
            >
              {brandName}
            </Link>

            {product.average_rating && product.reviews_count > 0 ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-900 shrink-0">
                <Star size={10} className="fill-amber-500 text-amber-500" />
                <span>{parseFloat(product.average_rating).toFixed(1)}</span>
              </span>
            ) : null}
          </div>

          {/* Product Title */}
          <Link to={`/product/${product.slug}`} className="block mt-1">
            <h3 className="font-serif font-bold text-stone-900 text-xs sm:text-[14px] leading-snug line-clamp-2 min-h-[2rem] sm:min-h-[2.4rem] group-hover:text-forest-900 transition-colors">
              {product.title}
            </h3>
          </Link>

          {/* Origin / Provenance Subtitle */}
          {provenance && (
            <p className="text-[10.5px] text-stone-500 truncate mt-0.5">
              📍 {provenance}
            </p>
          )}
        </div>
      </div>

      {/* Pricing & Cart Action Bar */}
      <div className="p-3 sm:p-4 pt-0 sm:pt-0 mt-auto">
        <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
          {/* Price block */}
          <div className="min-w-0">
            <div className="flex items-baseline gap-1">
              <span className="font-serif font-black text-sm sm:text-base text-stone-950">
                ₹{priceNum}
              </span>
              {hasDiscount && (
                <span className="text-[10px] sm:text-[11px] text-stone-400 line-through">
                  ₹{mrpNum}
                </span>
              )}
            </div>

            {isLowStock ? (
              <p className="text-[9.5px] font-bold text-amber-700 flex items-center gap-0.5 truncate">
                <Zap size={9} /> Only {product.stock_quantity} left
              </p>
            ) : !inStock ? (
              <p className="text-[9.5px] font-bold text-stone-400">
                Out of Stock
              </p>
            ) : null}
          </div>

          {/* Action: Add Button or Stepper */}
          {cartItem ? (
            <div className="flex items-center rounded-xl bg-forest-50 border border-forest-900/70 overflow-hidden shadow-2xs h-8 sm:h-9 shrink-0">
              <button
                type="button"
                onClick={handleDecrement}
                aria-label={`Decrease quantity of ${product.title}`}
                className="w-7 h-full flex items-center justify-center text-forest-900 hover:bg-forest-100 active:scale-90 transition-all font-bold"
              >
                <Minus size={12} />
              </button>
              <span className="px-2 text-xs font-black text-forest-950 font-mono select-none">
                {cartItem.quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={cartItem.quantity >= (product.stock_quantity || 99) || !inStock}
                aria-label={`Increase quantity of ${product.title}`}
                className="w-7 h-full flex items-center justify-center text-forest-900 hover:bg-forest-100 active:scale-90 transition-all font-bold disabled:opacity-30"
              >
                <Plus size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock || adding}
              className={`h-8 sm:h-9 px-3 sm:px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shadow-2xs transition-all active:scale-95 shrink-0 ${
                added
                  ? 'bg-emerald-600 text-white'
                  : inStock
                  ? 'bg-forest-900 hover:bg-forest-950 text-white hover:shadow-xs'
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
                <span>Sold Out</span>
              ) : (
                <>
                  <Plus size={13} />
                  <span>ADD</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
