import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, CheckCircle, ShieldCheck } from 'lucide-react';
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
      setTimeout(() => setAdded(false), 1500);
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
    <div className="group relative bg-white rounded-xl border border-stone-200/80 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden">
      {/* Product Image Link */}
      <Link to={`/product/${product.slug}`} className="block relative aspect-square overflow-hidden bg-stone-100">
        <img
          src={product.primary_image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80'}
          alt={product.title}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Badges Overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          {product.is_bestseller && (
            <span className="bg-amber-600 text-white text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded shadow-sm">
              Bestseller
            </span>
          )}
          {discountPercent > 0 && (
            <span className="bg-chilli-700 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-sm">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Veg / Non-Veg Indicator */}
        <div className="absolute top-2.5 right-2.5 z-10 bg-white/95 backdrop-blur-sm p-1 rounded-md shadow-sm border border-stone-200">
          <div className={`w-3.5 h-3.5 border flex items-center justify-center ${product.dietary_type === 'VEG' ? 'border-emerald-600' : 'border-amber-800'}`}>
            <div className={`w-2 h-2 rounded-full ${product.dietary_type === 'VEG' ? 'bg-emerald-600' : 'bg-amber-800'}`}></div>
          </div>
        </div>

        {/* Weight Pill */}
        <div className="absolute bottom-2 left-2 z-10 bg-stone-900/75 backdrop-blur-sm text-stone-100 text-[11px] font-medium px-2 py-0.5 rounded-full">
          {product.weight_grams}g
        </div>
      </Link>

      {/* Card Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Producer & Spice */}
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <div className="flex items-center gap-1 text-[11px] text-forest-700 font-medium truncate">
            <ShieldCheck size={13} className="text-forest-600 flex-shrink-0" />
            <span className="truncate">{product.manufacturer?.business_name}</span>
          </div>
          <SpiceMeter level={product.spice_level} showLabel={false} size="sm" />
        </div>

        {/* Title */}
        <Link to={`/product/${product.slug}`} className="group-hover:text-forest-700 transition-colors">
          <h3 className="font-serif font-bold text-stone-900 text-base leading-snug line-clamp-2 min-h-[2.6rem]">
            {product.title}
          </h3>
        </Link>

        {/* Location & Origin */}
        <p className="text-xs text-stone-500 mt-1">
          {product.manufacturer?.location_district || 'Nagaland, India'}
        </p>

        {/* Pricing and Action */}
        <div className="mt-auto pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold text-stone-900">₹{parseFloat(product.price).toFixed(0)}</span>
              {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
                <span className="text-xs text-stone-400 line-through">₹{parseFloat(product.mrp).toFixed(0)}</span>
              )}
            </div>
            <p className="text-[10px] text-stone-500">
              {product.stock_quantity > 0 ? (
                product.stock_quantity <= 5 ? (
                  <span className="text-amber-600 font-semibold">Only {product.stock_quantity} left</span>
                ) : (
                  <span className="text-emerald-700">In Stock</span>
                )
              ) : (
                <span className="text-red-500 font-medium">Sold Out</span>
              )}
            </p>
          </div>

          <button
            onClick={handleAddToCart}
            disabled={!product.is_in_stock || adding}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 ${
              added
                ? 'bg-emerald-600 text-white'
                : product.is_in_stock
                ? 'bg-forest-800 hover:bg-forest-900 text-white shadow-sm hover:shadow'
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
        </div>
      </div>
    </div>
  );
}
