import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Plus, Minus, Check, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function ProductCard({ product }) {
  const { cart, addToCart, updateQuantity } = useCart();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Check if item is already in basket
  const cartItem = cart?.items?.find((i) => i.product?.id === product?.id);

  const inStock = product?.is_in_stock !== false && (product?.stock_quantity === undefined || product?.stock_quantity > 0);
  const isLowStock = inStock && product?.stock_quantity > 0 && product?.stock_quantity <= 5;

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock || adding) return;

    setAdding(true);
    try {
      await addToCart(product.id, 1);
      setAdded(true);
      toast.success(`Added ${product.title} to Jar Bag`);
      setTimeout(() => setAdded(false), 1500);
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
        toast.error(err.message || 'Could not update quantity');
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
        toast.error(err.message || 'Could not update quantity');
      }
    }
  };

  const toggleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? 'Removed from saved batches' : 'Saved to your spice cellar');
  };

  const priceNum = Math.round(Number(product.price) || 0);
  const mrpNum = product.mrp ? Math.round(Number(product.mrp) || 0) : null;
  const hasDiscount = mrpNum && mrpNum > priceNum;
  const discountPercent = hasDiscount
    ? Math.round(((mrpNum - priceNum) / mrpNum) * 100)
    : 0;

  const imageUrl = (!imageError && product.primary_image_url)
    ? product.primary_image_url
    : '/images/stitch/stitch_3_d0bc312725.jpg';

  const brandName = product.manufacturer?.business_name || product.brand?.name || 'Heritage Kitchen';
  const provenance = product.origin_district || product.origin_state || product.manufacturer?.location_district || 'Sun-Cured Terroir';
  const weightText = product.weight_grams ? `${product.weight_grams}g` : '350g Jar';

  // Heat meter representation
  const spiceRating = product.heat_level || (product.spice_level ? String(product.spice_level) : 'MEDIUM');
  let spiceIndicator = '🌶️🌶️ Medium';
  if (spiceRating === 'EXTRA_HOT' || spiceRating === '4' || spiceRating === '5') {
    spiceIndicator = '🌶️🌶️🌶️🌶️ Extreme Ghost Heat';
  } else if (spiceRating === 'HOT' || spiceRating === '3') {
    spiceIndicator = '🌶️🌶️🌶️ Fiery Hot';
  } else if (spiceRating === 'MILD' || spiceRating === '1') {
    spiceIndicator = '🌶️ Mild & Sweet';
  }

  return (
    <article className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-outline-variant/30 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Top Image Showcase */}
        <div className="relative h-56 sm:h-64 bg-surface-container-high overflow-hidden">
          <Link to={`/product/${product.slug}`} className="block w-full h-full">
            <img
              src={imageUrl}
              alt={product.title}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          </Link>

          {/* Terroir / Location Pill - Solid Clean Surface */}
          <span className="absolute top-2.5 left-2.5 bg-surface px-2.5 py-1 rounded-full font-label-sm text-[11px] text-primary font-bold shadow-xs border border-outline-variant/30">
            {provenance}
          </span>

          {/* Wishlist Button - Solid Clean Surface */}
          <button
            type="button"
            onClick={toggleWishlist}
            aria-label="Save to Wishlist"
            className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-surface flex items-center justify-center text-on-surface-variant hover:text-primary active:scale-90 transition-all shadow-xs border border-outline-variant/30"
          >
            <Heart
              size={17}
              className={isWishlisted ? 'fill-primary text-primary' : 'text-on-surface-variant'}
            />
          </button>

          {/* Heat Meter Badge - Solid Clean Badge */}
          <div className="absolute bottom-2.5 left-2.5 bg-inverse-surface text-inverse-on-surface px-2 py-0.5 rounded-lg font-label-sm text-[10px] sm:text-[11px] flex items-center gap-1">
            <span>{spiceIndicator}</span>
          </div>

          {/* Sold out badge */}
          {!inStock && (
            <div className="absolute inset-0 bg-stone-950/75 flex items-center justify-center p-3 z-20 text-center">
              <span className="px-3 py-1 rounded-full bg-stone-900 text-white text-xs font-bold border border-white/20 shadow-md">
                Batch Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-4 flex flex-col gap-1.5">
          {/* Artisan Maker with Verified Check */}
          <div className="flex items-center gap-1 text-[12px] text-on-surface-variant font-medium truncate">
            <span className="material-symbols-outlined text-[15px] text-secondary">verified</span>
            <span className="truncate">{brandName}</span>
          </div>

          {/* Title */}
          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="font-title-md text-[14px] sm:text-[16px] text-on-surface group-hover:text-primary transition-colors font-bold line-clamp-2 leading-snug">
              {product.title}
            </h3>
          </Link>

          {/* Rating & Reviews */}
          <div className="flex items-center gap-2 pt-0.5">
            <div className="flex items-center bg-tertiary-fixed text-on-tertiary-fixed px-1.5 py-0.5 rounded font-label-sm text-[11px] font-bold">
              <span>{product.rating || '4.8'}</span>
              <span className="material-symbols-outlined text-[13px] ml-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            </div>
            <span className="font-body-sm text-[11px] text-outline">
              ({product.review_count || 320}+ reviews)
            </span>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-2 pt-1">
            <span className="font-title-lg text-[18px] sm:text-[20px] text-primary font-bold">
              ₹{priceNum}
            </span>
            {hasDiscount && (
              <span className="font-body-sm text-xs text-outline line-through">
                ₹{mrpNum}
              </span>
            )}
            {discountPercent > 0 && (
              <span className="font-label-sm text-[11px] text-secondary font-bold">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Micro Psychology: Scarcity & Small Batch Social Proof */}
          <div className="flex items-center justify-between text-[10.5px] pt-1.5 border-t border-outline-variant/20 text-on-surface-variant">
            <span className="flex items-center gap-1 text-primary font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>Small Batch Cure</span>
            </span>
            <span className="font-semibold text-outline">
              {product.weight_grams ? `${product.weight_grams}g Glass Jar` : 'Glass Jar'}
            </span>
          </div>

          {/* Heritage Micro-Badge */}
          <div className="bg-surface-container-low px-2 py-1 rounded-lg mt-1">
            <p className="font-body-sm text-[11px] text-on-surface-variant flex items-center gap-1 truncate">
              <span className="material-symbols-outlined text-primary text-[14px]">wb_sunny</span>
              <span>Wood Churned Oil • {weightText}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Cart Action Footer */}
      <div className="p-3.5 sm:p-4 pt-0">
        {cartItem ? (
          <div className="w-full flex items-center justify-between bg-primary-fixed text-on-primary-fixed rounded-xl px-2 py-1.5 shadow-sm border border-primary/20">
            <button
              type="button"
              onClick={handleDecrement}
              aria-label={`Decrease ${product.title}`}
              className="w-8 h-8 rounded-lg bg-surface/80 flex items-center justify-center text-primary font-bold hover:bg-surface active:scale-90 transition-all"
            >
              <Minus size={15} />
            </button>
            <span className="font-bold text-sm text-primary">
              {cartItem.quantity} in Bag
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={cartItem.quantity >= (product.stock_quantity || 99) || !inStock}
              aria-label={`Increase ${product.title}`}
              className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center font-bold hover:bg-primary-container active:scale-90 transition-all disabled:opacity-40"
            >
              <Plus size={15} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock || adding}
            aria-label={`Add ${product.title} to Cart`}
            className={`w-full py-2.5 rounded-xl font-title-md text-[13px] sm:text-[14px] font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
              added
                ? 'bg-tertiary text-on-tertiary'
                : inStock
                ? 'bg-primary text-on-primary hover:bg-primary-container'
                : 'bg-surface-variant text-outline cursor-not-allowed'
            }`}
          >
            {added ? (
              <>
                <Check size={17} />
                <span>Added to Jar Bag</span>
              </>
            ) : adding ? (
              <span className="animate-pulse">Adding...</span>
            ) : !inStock ? (
              <span>Out of Stock</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                <span>Add to Cart</span>
              </>
            )}
          </button>
        )}
      </div>
    </article>
  );
}
