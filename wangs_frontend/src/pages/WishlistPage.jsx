import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ArrowRight, Trash2 } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/ProductCard';

export default function WishlistPage() {
  const { items, clearWishlist } = useWishlist();

  return (
    <div className="w-full bg-[#fbf8f3] min-h-[75vh] px-4 sm:px-6 lg:px-12 py-8 sm:py-12">
      <div className="max-w-[1440px] mx-auto">
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <span className="text-[#ab331c] font-bold text-[11px] uppercase tracking-wider">
              SAVED BATCHES
            </span>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-stone-900 mt-0.5">
              Your Wishlist
            </h1>
          </div>

          {items.length > 0 && (
            <button
              type="button"
              onClick={clearWishlist}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-[#ab331c] transition-colors cursor-pointer px-3 py-1.5 rounded-full border border-stone-200 bg-white"
            >
              <Trash2 size={13} />
              <span>Clear all</span>
            </button>
          )}
        </div>

        {items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-stone-200/80 p-8 sm:p-14 text-center max-w-lg mx-auto my-8 shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-[#fbf2ec] text-[#ab331c] mx-auto flex items-center justify-center mb-4">
              <Heart size={26} />
            </div>
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-stone-900">
              Your wishlist is empty
            </h2>
            <p className="text-stone-600 text-xs sm:text-sm mt-2 leading-relaxed">
              Tap the heart icon on any pickle jar to save your favourites here for later.
            </p>
            <Link
              to="/products"
              className="mt-6 inline-flex items-center gap-2 bg-[#ab331c] hover:bg-[#962c17] text-white px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-colors"
            >
              <span>Explore Pickles</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
