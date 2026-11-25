import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Gift, Sparkles, ArrowRight, Bell } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function GiftBoxesPage() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [notified, setNotified] = useState(false);

  const handleNotify = (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setNotified(true);
    toast.success("You're on the list! We'll notify you as soon as Wangs Gift Boxes launch.");
    setEmail('');
  };

  return (
    <div className="w-full bg-[#fbf8f3] min-h-[calc(100vh-140px)] flex items-center justify-center px-4 sm:px-6 lg:px-12 py-12 sm:py-20">
      <div className="max-w-3xl w-full mx-auto text-center animate-fade-in-up">
        {/* Animated Gift Box Visual */}
        <div className="relative inline-flex items-center justify-center mb-8">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-[#f6df9d] border border-[#e7c76d] shadow-md flex items-center justify-center animate-float-slow relative">
            <Gift size={52} className="text-[#ab331c]" strokeWidth={1.75} />
            <span className="absolute -top-2.5 -right-2.5 w-8 h-8 rounded-full bg-[#28452e] text-white flex items-center justify-center shadow-sm animate-bounce">
              <Sparkles size={15} />
            </span>
          </div>
          {/* Soft ambient pulse ring */}
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-3xl bg-[#f6df9d]/40 -z-10 animate-ping"
            style={{ animationDuration: '3s' }}
          />
        </div>

        {/* Animated Coming Soon Badge */}
        <div className="flex justify-center mb-4">
          <span className="relative overflow-hidden inline-flex items-center gap-2 bg-[#f6df9d] text-stone-900 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-[#e5c465] shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ab331c] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ab331c]" />
            </span>
            <span>Coming Soon</span>
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer-sweep"
            />
          </span>
        </div>

        {/* Editorial Headline */}
        <h1 className="hero-headline font-hero text-4xl sm:text-5xl lg:text-[54px] text-stone-950 leading-[1.08] tracking-tight mb-4">
          Curated Nagaland <br className="hidden sm:inline" />
          Gift Boxes, packed to share.
        </h1>

        <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-xl mx-auto mb-8">
          We're hand-assembling festive pickle trios, smoked meat samplers, and woven keepsake boxes made in collaboration with our village makers.
        </p>

        {/* Notify Me Form */}
        {!notified ? (
          <form
            onSubmit={handleNotify}
            className="flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-md mx-auto mb-8"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email for early access"
              className="w-full sm:flex-1 bg-white rounded-full px-5 py-3 text-xs sm:text-sm text-stone-900 placeholder:text-stone-400 border border-stone-300 focus:outline-none focus:border-[#ab331c]"
            />
            <button
              type="submit"
              className="w-full sm:w-auto bg-[#ab331c] hover:bg-[#962c17] text-white px-6 py-3 rounded-full text-xs sm:text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-xs"
            >
              <Bell size={14} />
              <span>Notify me</span>
            </button>
          </form>
        ) : (
          <div className="inline-flex items-center gap-2 bg-[#28452e] text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium mb-8 shadow-xs">
            <Sparkles size={15} className="text-[#f6df9d]" />
            <span>You're on the early access list!</span>
          </div>
        )}

        {/* Navigation CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3.5">
          <Link
            to="/products"
            className="border border-stone-900 hover:bg-stone-900 hover:text-white text-stone-900 px-6 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-colors inline-flex items-center gap-2"
          >
            <span>Explore Pickles</span>
            <ArrowRight size={14} />
          </Link>
          <Link
            to="/brands"
            className="text-[#ab331c] hover:underline px-4 py-2.5 text-xs sm:text-sm font-semibold inline-flex items-center gap-1"
          >
            <span>Browse Brands</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
