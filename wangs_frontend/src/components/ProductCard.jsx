import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Plus, Minus, Check, ShoppingBag, ShoppingCart, Flame, Star, CheckCircle2, Sun } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useWishlist } from '../context/WishlistContext';
import { resolveProductImage } from '../utils/image';

function ProductCard({ product }) {
  const { cart, addToCart, updateQuantity } = useCart();
  const { user, requireAuth } = useAuth();
  const { isWishlisted: checkWishlisted, toggleWishlist: toggleWishlistItem } = useWishlist();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const isWishlisted = checkWishlisted(product?.id);

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
          toast.success(`Added ${product.title} to Bag`);
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
      toast.success(`Added ${product.title} to Bag`);
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
    const addedNow = toggleWishlistItem(product);
    toast.success(addedNow ? 'Saved to your wishlist' : 'Removed from wishlist');
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
  const weightText = product.weight_grams ? `${product.weight_grams}g` : '350g Pack';

  // Heat meter & theme tag representation
  const t = ((product.title || '') + ' ' + (product.category?.name || '') + ' ' + (product.dietary_type || '')).toLowerCase();
  let pastelBg = 'bg-[#f5efe6]';
  let badgeLabel = 'Small batch';
  if (t.includes('chilli') || t.includes('chili') || t.includes('ghost') || t.includes('king') || t.includes('hot') || t.includes('mirch')) {
    pastelBg = 'bg-[#fde8e8]';
    badgeLabel = 'Hot';
  } else if (t.includes('bamboo') || t.includes('garlic') || t.includes('veg') || t.includes('herb') || t.includes('green') || t.includes('mango')) {
    pastelBg = 'bg-[#e2ede2]';
    badgeLabel = 'Fermented';
  } else if (t.includes('pork') || t.includes('smoked') || t.includes('meat') || t.includes('beef') || t.includes('chicken')) {
    pastelBg = 'bg-[#f7ebd2]';
    badgeLabel = 'Smoked';
  } else if (t.includes('axone') || t.includes('ferment') || t.includes('soy') || t.includes('sesame')) {
    pastelBg = 'bg-[#ede6dc]';
    badgeLabel = 'Small batch';
  }

  const makerVillage = product.origin_district || product.manufacturer?.location_district || 'Kohima';

  return (
    <article className="group bg-white rounded-2xl p-4 border border-stone-200/70 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between">
      <div>
        {/* Top Image Showcase in Theme Pastel Rounded Box */}
        <div className={`relative aspect-square w-full rounded-xl overflow-hidden flex items-center justify-center p-4 mb-3 ${pastelBg} transition-colors`}>
          <Link to={`/product/${product.slug}`} className="w-full h-full flex items-center justify-center">
            <img
              src={imageUrl}
              alt={product.title}
              onError={() => setImageError(true)}
              className="max-h-full max-w-full object-contain drop-shadow-sm group-hover:scale-105 transition-transform duration-300 select-none"
              loading="lazy"
            />
          </Link>

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={toggleWishlist}
            aria-label="Save to Wishlist"
            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 hover:bg-white flex items-center justify-center text-stone-600 hover:text-[#ab331c] transition-all shadow-xs cursor-pointer"
          >
            <Heart
              size={14}
              className={isWishlisted ? 'fill-[#ab331c] text-[#ab331c]' : 'text-stone-500'}
            />
          </button>

          {/* Sold out overlay */}
          {!inStock && (
            <div className="absolute inset-0 bg-stone-900/60 flex items-center justify-center p-3 z-20 text-center">
              <span className="px-3 py-1 rounded-full bg-stone-900 text-white text-[11px] font-bold">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Tag Badge */}
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="bg-[#f6df9d] text-stone-900 text-[10px] sm:text-[11px] font-medium px-2.5 py-0.5 rounded-full inline-block">
            {badgeLabel}
          </span>
        </div>

        {/* Title */}
        <Link to={`/product/${product.slug}`} className="block">
          <h3 className="font-serif font-bold text-sm sm:text-base text-stone-900 group-hover:text-[#ab331c] transition-colors line-clamp-1 leading-snug">
            {product.title}
          </h3>
        </Link>

        {/* Size & Maker / Village */}
        <p className="text-[11px] text-stone-500 font-medium uppercase tracking-wider mt-0.5 truncate">
          {weightText} · {brandName} / {makerVillage}
        </p>

        {/* Pricing */}
        <div className="flex items-baseline gap-2 mt-1.5">
          <span className="font-bold text-base sm:text-lg text-stone-900">
            ₹{priceNum}
          </span>
          {hasDiscount && (
            <span className="text-xs text-stone-400 line-through">
              ₹{mrpNum}
            </span>
          )}
        </div>
      </div>

      {/* Cart Action Button - Exact Match: Forest Green Rounded Button */}
      <div className="pt-3">
        {cartItem ? (
          <div className="w-full flex items-center justify-between bg-stone-100 rounded-xl px-2.5 py-1.5 border border-stone-200">
            <button
              type="button"
              onClick={handleDecrement}
              className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-stone-800 shadow-2xs hover:bg-stone-50 active:scale-95 cursor-pointer"
              aria-label="Decrease quantity"
            >
              <Minus size={13} />
            </button>
            <span className="font-bold text-xs text-stone-900">
              {cartItem.quantity} in Bag
            </span>
            <button
              type="button"
              onClick={handleIncrement}
              disabled={cartItem.quantity >= (product.stock_quantity || 99)}
              className="w-7 h-7 rounded-lg bg-white flex items-center justify-center text-stone-800 shadow-2xs hover:bg-stone-50 active:scale-95 disabled:opacity-40 cursor-pointer"
              aria-label="Increase quantity"
            >
              <Plus size={13} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock || adding}
            className="w-full bg-[#28452e] hover:bg-[#1f3724] text-white py-2.5 px-4 rounded-xl font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {adding ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : added ? (
              <>
                <Check size={14} className="text-emerald-300" />
                <span>Added to cart</span>
              </>
            ) : (
              <span>Add to cart</span>
            )}
          </button>
        )}
      </div>
    </article>
  );
}

export default React.memo(ProductCard);
