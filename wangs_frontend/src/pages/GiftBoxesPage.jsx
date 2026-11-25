import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PickleCharacterIllustration from '../components/PickleCharacterIllustration';
import SeoHead from '../components/SeoHead';

export default function GiftBoxesPage() {
  return (
    <div className="w-full bg-[#fbf8f3] min-h-[calc(100vh-140px)] flex items-center justify-center px-4 sm:px-6 lg:px-12 py-10 sm:py-16 overflow-hidden">
      <SeoHead
        title="Gift Boxes | Wangs"
        description="Curated regional pickle and food gift boxes from Wangs, bringing together traditional flavours from independent makers."
        canonicalPath="/gift-boxes"
      />
      <div className="max-w-2xl w-full mx-auto text-center animate-fade-in-up">
        {/* Borderless Animated Pickle-Tasting Character */}
        <div className="mb-3">
          <PickleCharacterIllustration />
        </div>

        {/* Animated Coming Soon Pill */}
        <div className="flex justify-center mb-5">
          <span className="relative overflow-hidden inline-flex items-center gap-2 bg-[#f6df9d] text-stone-900 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-[#e5c465] shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ab331c] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ab331c]" />
            </span>
            <span>Coming Soon</span>
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/65 to-transparent animate-shimmer-sweep"
            />
          </span>
        </div>

        {/* Editorial Headline */}
        <h1 className="hero-headline font-hero text-4xl sm:text-5xl lg:text-[54px] text-stone-950 leading-[1.08] tracking-tight mb-4">
          Curated Nagaland <br className="hidden sm:inline" />
          Gift Boxes.
        </h1>

        <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-lg mx-auto mb-9">
          Hand-assembled pickle trios and keepsake boxes crafted with our local makers are arriving soon.
        </p>

        {/* Simple Action Links */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/products"
            className="bg-[#ab331c] hover:bg-[#962c17] text-white px-7 py-3 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-xs inline-flex items-center gap-2 group"
          >
            <span>Explore Pickles</span>
            <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            to="/brands"
            className="border border-stone-900 hover:bg-stone-900 hover:text-white text-stone-900 px-7 py-3 rounded-full text-xs sm:text-sm font-semibold transition-colors"
          >
            Browse Brands
          </Link>
        </div>
      </div>
    </div>
  );
}
