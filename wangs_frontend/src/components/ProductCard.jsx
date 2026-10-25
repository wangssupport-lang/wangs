import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, CheckCircle, ShieldCheck, Plus, Minus, Sparkles, Star, Zap } from 'lucide-react';
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
  const savings = hasDiscount ? mrpNum - priceNum : 0;
  const discountPercent = hasDiscount
    ? Math.round(((mrpNum - priceNum) / mrpNum) * 100)
    : 0;

  const imageUrl = (!imageError && product.primary_image_url)
    ? product.primary_image_url
    : '/featured-pouches.png';

  const brandName = product.manufacturer?.business_name || 'Artisan Brand';
  const provenance = product.origin_district || product.manufacturer?.location_district || 'Artisan Cured';

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-forest-700/40 hover:shadow-xl sm:rounded-3xl">
      {/* Product Image Stage */}
      <Link
        to={`/product/${product.slug}`}
        className="block relative aspect-square overflow-hidden bg-gradient-to-b from-stone-100 to-cream-100"
      >
        <img
          src={imageUrl}
          alt={product.title}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover object-center group-hover:scale-106 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Subtle vignette gradient for readable overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/40 via-transparent to-stone-950/20 pointer-events-none" />

        {/* Top Badges: Discount & Bestseller */}
        <div className="absolute left-2.5 top-2.5 z-10 flex flex-col items-start gap-1">
          {product.is_bestseller && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 backdrop-blur-md px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-950 shadow-sm sm:text-[10px]">
              <Sparkles size={10} className="fill-amber-950" /> Bestseller
            </span>
          )}
          {discountPercent > 0 && (
            <span className="rounded-lg bg-chilli-600/95 backdrop-blur-md px-2 py-0.5 text-[9px] font-black tracking-tight text-white shadow-sm sm:text-[10px]">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Weight & Provenance Pill (Bottom Left) */}
        <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 rounded-full border border-forest-900/60 bg-forest-950/90 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-semibold text-cream-100 backdrop-blur-md shadow-sm">
          <span>{product.weight_grams ? `${product.weight_grams}g` : 'Small Batch'}</span>
          <span className="opacity-40">·</span>
          <span className="text-amber-300 font-medium truncate max-w-[90px]">{provenance}</span>
        </div>

        {/* Sold Out Overlay */}
        {!inStock && (
          <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-[1px] flex flex-col items-center justify-center p-3 z-20 text-center">
            <span className="px-3 py-1.5 rounded-xl bg-stone-900/95 text-white text-[11px] font-bold border border-white/20 shadow-xl leading-tight">
              All Product Sold Out
            </span>
            <span className="text-[10px] text-cream-200 mt-1 font-medium max-w-[140px] leading-tight drop-shadow">
              Please wait for some time, product will be in stock soon
            </span>
          </div>
        )}
      </Link>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-3 sm:p-5">
        {/* Brand Attribution & Heat / Rating Row */}
        <div className="mb-1.5 flex items-center justify-between gap-1.5">
          <Link
            to={`/products?search=${encodeURIComponent(brandName)}`}
            className="flex min-w-0 items-center gap-1 truncate text-[10px] sm:text-[11px] font-bold text-forest-800 hover:text-forest-950 transition-colors"
          >
            <ShieldCheck size={13} className="flex-shrink-0 text-emerald-600" />
            <span className="truncate">{brandName}</span>
          </Link>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {product.average_rating && product.reviews_count > 0 ? (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md"
                title={`${product.reviews_count} verified customer reviews`}
              >
                <Star size={10} className="fill-amber-500 text-amber-500" />
                <span>{parseFloat(product.average_rating).toFixed(1)}</span>
                <span className="text-[9px] font-semibold text-amber-700/85">
                  ({product.reviews_count}+)
                </span>
              </span>
            ) : null}
          </div>
        </div>

        {/* Product Title */}
        <Link to={`/product/${product.slug}`} className="group-hover:text-forest-800 transition-colors">
          <h3 className="line-clamp-2 min-h-[2.4rem] font-serif text-[13px] font-semibold leading-[1.25] text-stone-900 sm:min-h-[2.8rem] sm:text-base sm:leading-snug">
            {product.title}
          </h3>
        </Link>

        {/* Ingredients Highlights */}
        {product.ingredients && (
          <p className="mt-1 hidden line-clamp-1 text-[11px] text-stone-500 sm:block">
            {product.ingredients.split(',').slice(0, 3).join(', ')}
          </p>
        )}

        {/* Pricing and Action Bar */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-stone-100 pt-3 sm:pt-4">
          <div>
            <div className="flex flex-wrap items-baseline gap-x-1.5">
              <span className="font-serif text-base font-bold text-stone-950 sm:text-xl">
                ₹{priceNum}
              </span>
              {hasDiscount && (
                <span className="text-[10px] text-stone-400 line-through sm:text-xs">
                  ₹{mrpNum}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              {isLowStock ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] sm:text-[10px] font-bold text-amber-700">
                  <Zap size={10} /> Only {product.stock_quantity} left
                </span>
              ) : inStock ? (
                <span className="text-[9px] sm:text-[10px] font-medium text-emerald-700">
                  In Stock
                </span>
              ) : (
                <span className="text-[9px] sm:text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded truncate max-w-[105px] sm:max-w-none">
                  Sold Out · Soon
                </span>
              )}
              {hasDiscount && (
                <span className="hidden sm:inline-block text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded">
                  Save ₹{savings}
                </span>
              )}
            </div>
          </div>

          {/* Cart Stepper or Quick Add */}
          {cartItem ? (
            <div className="flex items-center overflow-hidden rounded-xl border border-forest-900/80 bg-forest-50/90 shadow-2xs">
              <button
                type="button"
                onClick={handleDecrement}
                aria-label={`Decrease quantity of ${product.title}`}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-forest-900 hover:bg-forest-200/70 active:scale-95 transition-all font-bold"
                title="Decrease quantity"
              >
                <Minus size={13} />
              </button>
              <span className="px-2 text-xs font-black text-forest-950 font-mono select-none">
                {cartItem.quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={cartItem.quantity >= (product.stock_quantity || 99) || !inStock}
                aria-label={`Increase quantity of ${product.title}`}
                className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center text-forest-900 hover:bg-forest-200/70 active:scale-95 transition-all font-bold disabled:opacity-30 disabled:pointer-events-none"
                title="Increase quantity"
              >
                <Plus size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock || adding}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 shadow-xs sm:px-4 sm:py-2.5 ${
                added
                  ? 'bg-emerald-600 text-white scale-102'
                  : inStock
                  ? 'bg-forest-900 hover:bg-forest-950 text-white hover:shadow-md active:scale-96'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
              }`}
            >
              {added ? (
                <>
                  <CheckCircle size={14} className="text-white" />
                  <span>Added</span>
                </>
              ) : adding ? (
                <span className="animate-pulse">Adding...</span>
              ) : !inStock ? (
                <span>Sold Out</span>
              ) : (
                <>
                  <ShoppingBag size={13} className="text-cream-100" />
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
