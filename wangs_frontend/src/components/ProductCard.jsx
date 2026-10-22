import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Check, ShieldCheck, MapPin } from 'lucide-react';
import { useCart } from '../context/CartContext';
import SpiceMeter from './SpiceMeter';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.is_in_stock || adding) return;

    setAdding(true);
    try {
      await addToCart(product.id, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 1600);
    } catch (err) {
      alert(err.message || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  };

  const discountPercent = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <div className="group relative bg-white rounded-2xl border border-stone-200/70 hover:border-forest-700/30 shadow-subtle hover:shadow-card-hover transition-all duration-300 flex flex-col overflow-hidden">
      {/* Product Image Link */}
      <Link to={`/product/${product.slug}`} className="block relative aspect-[4/3] sm:aspect-square overflow-hidden bg-cream-100">
        <img
          src={product.primary_image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'}
          alt={product.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
          loading="lazy"
        />

        {/* Gradient vignette on bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          {product.is_bestseller && (
            <span className="bg-forest-900 text-cream-50 text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full shadow-sm">
              Heritage Batch
            </span>
          )}
          {discountPercent > 0 && (
            <span className="bg-chilli-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Veg / Non-Veg Indicator */}
        <div className="absolute top-3 right-3 z-10 bg-white/95 backdrop-blur-sm p-1 rounded-md shadow-sm border border-stone-200/80">
          <div className={`w-3.5 h-3.5 border flex items-center justify-center ${product.dietary_type === 'VEG' ? 'border-emerald-600' : 'border-amber-900'}`}>
            <div className={`w-2 h-2 rounded-full ${product.dietary_type === 'VEG' ? 'bg-emerald-600' : 'bg-amber-900'}`} />
          </div>
        </div>

        {/* Net Weight Pill */}
        <div className="absolute bottom-3 left-3 z-10 bg-forest-950/80 backdrop-blur-md text-cream-100 text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-forest-800/50">
          {product.weight_grams}g
        </div>
      </Link>

      {/* Card Content */}
      <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between gap-3">
        <div>
          {/* Producer & Heat */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-[11px] text-forest-700 font-medium flex items-center gap-1 truncate">
              <ShieldCheck size={13} className="text-forest-600 flex-shrink-0" />
              <span className="truncate">{product.manufacturer?.business_name}</span>
            </span>
            <SpiceMeter level={product.spice_level} showLabel={false} size="sm" />
          </div>

          {/* Title */}
          <Link to={`/product/${product.slug}`} className="block group-hover:text-forest-800 transition-colors">
            <h3 className="font-serif font-bold text-stone-900 text-base leading-snug line-clamp-2 min-h-[2.6rem]">
              {product.title}
            </h3>
          </Link>

          {/* District & Region */}
          <p className="text-[11px] text-stone-500 mt-1 flex items-center gap-1">
            <MapPin size={11} className="text-stone-400" />
            <span>{product.manufacturer?.location_district || 'Nagaland, India'}</span>
          </p>
        </div>

        {/* Pricing and Quick Add */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-stone-950 font-serif">
                ₹{parseFloat(product.price).toFixed(0)}
              </span>
              {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
                <span className="text-xs text-stone-400 line-through">
                  ₹{parseFloat(product.mrp).toFixed(0)}
                </span>
              )}
            </div>
            <p className="text-[10px] text-stone-500">
              {product.stock_quantity > 0 ? (
                product.stock_quantity <= 5 ? (
                  <span className="text-amber-700 font-semibold">Only {product.stock_quantity} left</span>
                ) : (
                  <span className="text-emerald-700 font-medium">In Stock</span>
                )
              ) : (
                <span className="text-chilli-600 font-semibold">Sold Out</span>
              )}
            </p>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!product.is_in_stock || adding}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
              added
                ? 'bg-emerald-700 text-white shadow-sm'
                : product.is_in_stock
                ? 'bg-forest-900 hover:bg-forest-950 text-cream-50 hover:shadow-md active:scale-95'
                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
            }`}
          >
            {added ? (
              <>
                <Check size={14} className="stroke-[3]" /> Added
              </>
            ) : adding ? (
              <span className="text-[11px]">Adding...</span>
            ) : (
              <>
                <Plus size={14} className="stroke-[2.5]" /> Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
