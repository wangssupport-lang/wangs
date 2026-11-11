import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Plus, Minus, Check, ShoppingBag, Flame, Star, CheckCircle2, Sun } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { resolveProductImage } from '../utils/image';

function ProductCard({ product }) {
  const { cart, addToCart, updateQuantity } = useCart();
  const { user, requireAuth } = useAuth();
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

    if (!user) {
      requireAuth(async () => {
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
      }, 'keep items in your cart');
      return;
    }

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
    if (!user) {
      requireAuth(null, 'keep items in your cart');
      return;
    }
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
    if (!user) {
      requireAuth(() => {
        setIsWishlisted(true);
        toast.success('Saved to your spice cellar');
      }, 'save items to your wishlist');
      return;
    }
    setIsWishlisted(!isWishlisted);
    toast.success(isWishlisted ? 'Removed from saved batches' : 'Saved to your spice cellar');
  };

  const priceNum = Math.round(Number(product.price) || 0);
  const mrpNum = product.mrp ? Math.round(Number(product.mrp) || 0) : null;
  const hasDiscount = mrpNum && mrpNum > priceNum;
  const discountPercent = hasDiscount
    ? Math.round(((mrpNum - priceNum) / mrpNum) * 100)
    : 0;

  const rawImage = product.primary_image_url || (product.images && product.images[0] ? (typeof product.images[0] === 'string' ? product.images[0] : product.images[0].image_url) : '');
  const imageUrl = (!imageError && rawImage)
    ? resolveProductImage(rawImage)
    : '/images/stitch/stitch_3_d0bc312725.jpg';

  const brandName = product.manufacturer?.business_name || product.brand?.name || 'Heritage Kitchen';
  const provenance = product.origin_district || product.origin_state || product.manufacturer?.location_district || 'Sun-Cured Terroir';
  const weightText = product.weight_grams ? `${product.weight_grams}g` : '350g Jar';

  // Heat meter representation
  const spiceRating = product.heat_level || (product.spice_level ? String(product.spice_level) : 'MEDIUM');
  let spiceIndicator = 'Medium Heat';
  if (spiceRating === 'EXTRA_HOT' || spiceRating === '4' || spiceRating === '5') {
    spiceIndicator = 'Extreme Ghost Heat';
  } else if (spiceRating === 'HOT' || spiceRating === '3') {
    spiceIndicator = 'Fiery Hot';
  } else if (spiceRating === 'MILD' || spiceRating === '1') {
    spiceIndicator = 'Mild & Sweet';
  }

  return (
    <article className="group bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-outline-variant/30 transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Top Image Showcase */}
        <div className="relative aspect-square sm:aspect-auto sm:h-64 bg-surface-container-high overflow-hidden">
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
          <span className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 bg-surface/95 backdrop-blur-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-label-sm text-[10px] sm:text-[11px] text-primary font-bold shadow-xs border border-outline-variant/30">
            {provenance}
          </span>

          {/* Wishlist Button - Solid Clean Surface */}
          <button
            type="button"
            onClick={toggleWishlist}
            aria-label="Save to Wishlist"
            className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-surface/95 backdrop-blur-xs flex items-center justify-center text-on-surface-variant hover:text-primary active:scale-90 transition-all shadow-xs border border-outline-variant/30 cursor-pointer"
          >
            <Heart
              size={15}
              className={isWishlisted ? 'fill-primary text-primary' : 'text-on-surface-variant'}
            />
          </button>

          {/* Heat Meter Badge - Solid Clean Badge */}
          <div className="absolute bottom-2 left-2 sm:bottom-2.5 sm:left-2.5 bg-inverse-surface/90 backdrop-blur-xs text-inverse-on-surface px-1.5 sm:px-2 py-0.5 rounded-lg font-label-sm text-[9.5px] sm:text-[11px] flex items-center gap-1">
            <Flame size={11} className="text-amber-400 shrink-0" />
            <span className="truncate">{spiceIndicator}</span>
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
        <div className="p-3 sm:p-4 flex flex-col gap-1 sm:gap-1.5">
          {/* Artisan Maker with Verified Check */}
          <div className="flex items-center gap-1 text-[11px] sm:text-[12px] text-on-surface-variant font-medium truncate">
            <CheckCircle2 size={13} className="text-secondary shrink-0" />
            <span className="truncate">{brandName}</span>
          </div>

          {/* Title */}
          <Link to={`/product/${product.slug}`} className="block">
            <h3 className="font-title-md text-[13px] sm:text-[15px] text-on-surface group-hover:text-primary transition-colors font-bold line-clamp-2 leading-snug">
              {product.title}
            </h3>
          </Link>

          {/* Rating & Reviews */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="flex items-center bg-tertiary-fixed text-on-tertiary-fixed px-1.5 py-0.5 rounded font-label-sm text-[10px] sm:text-[11px] font-bold">
              <span>{product.rating || '4.8'}</span>
              <Star size={11} className="fill-current text-current ml-0.5 shrink-0" />
            </div>
            <span className="font-body-sm text-[10.5px] sm:text-[11px] text-outline">
              ({product.review_count || 320}+ reviews)
            </span>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-1.5 sm:gap-2 pt-0.5">
            <span className="font-title-lg text-[16px] sm:text-[19px] text-primary font-bold">
              ₹{priceNum}
            </span>
            {hasDiscount && (
              <span className="font-body-sm text-[11px] sm:text-xs text-outline line-through">
                ₹{mrpNum}
              </span>
            )}
            {discountPercent > 0 && (
              <span className="font-label-sm text-[10px] sm:text-[11px] text-secondary font-bold">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Micro Psychology: Scarcity & Small Batch Social Proof */}
          <div className="flex items-center justify-between text-[10px] sm:text-[10.5px] pt-1.5 border-t border-outline-variant/20 text-on-surface-variant">
            <span className="flex items-center gap-1 text-primary font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>Small Batch Cure</span>
            </span>
            <span className="font-semibold text-outline truncate">
              {product.weight_grams ? `${product.weight_grams}g Jar` : 'Glass Jar'}
            </span>
          </div>

          {/* Heritage Micro-Badge */}
          <div className="bg-surface-container-low px-2 py-1 rounded-lg mt-0.5 sm:mt-1">
            <p className="font-body-sm text-[10px] sm:text-[11px] text-on-surface-variant flex items-center gap-1 truncate">
              <Sun size={12} className="text-primary shrink-0" />
              <span className="truncate">Wood Churned Oil • {weightText}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Cart Action Footer */}
      <div className="p-3 sm:p-4 pt-0">
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

export default React.memo(ProductCard);
