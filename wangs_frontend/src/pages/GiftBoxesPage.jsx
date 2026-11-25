import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

function PickleCharacterIllustration() {
  return (
    <svg
      viewBox="0 0 320 270"
      className="w-64 h-56 sm:w-80 sm:h-68 mx-auto select-none pointer-events-none overflow-visible"
      role="img"
      aria-label="Animated male character happily eating handcrafted Nagaland pickle"
    >
      <defs>
        <linearGradient id="jarGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#f3e9dc" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="tunicGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bc3b22" />
          <stop offset="100%" stopColor="#962c17" />
        </linearGradient>
      </defs>

      {/* Soft ground shadow (no card, directly on page background) */}
      <ellipse cx="174" cy="246" rx="76" ry="10" fill="#e8dfd3" opacity="0.7" />
      <ellipse cx="78" cy="242" rx="34" ry="7" fill="#e8dfd3" opacity="0.65" />

      {/* Open Pickle Jar on the Left */}
      <g>
        {/* Jar Lid leaning beside jar */}
        <ellipse
          cx="40"
          cy="226"
          rx="9"
          ry="19"
          transform="rotate(-16 40 226)"
          fill="#d9b382"
          stroke="#b88c56"
          strokeWidth="2"
        />
        {/* Jar Body */}
        <rect
          x="52"
          y="174"
          width="52"
          height="66"
          rx="12"
          fill="url(#jarGlass)"
          stroke="#d6cab8"
          strokeWidth="2.5"
        />
        {/* Fiery Red Pickle Inside Jar */}
        <rect x="56" y="188" width="44" height="48" rx="9" fill="#ab331c" />
        <ellipse cx="78" cy="189" rx="22" ry="5" fill="#c94025" />
        {/* Chili & spice flecks inside jar */}
        <circle cx="67" cy="205" r="2.5" fill="#f6df9d" opacity="0.85" />
        <circle cx="88" cy="215" r="2" fill="#f6df9d" opacity="0.85" />
        <path d="M72 212 Q80 205 86 214" stroke="#7d1e0d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        {/* Jar Rim */}
        <rect x="57" y="166" width="42" height="9" rx="4" fill="#fffaf3" stroke="#d6cab8" strokeWidth="2" />
        {/* Glass Highlight */}
        <path d="M62 184 L62 228" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity="0.55" />

        {/* Rising aroma wisps from open jar */}
        <path
          d="M72 158 Q67 148 73 139"
          stroke="#c9725b"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          className="animate-steam-1"
        />
        <path
          d="M84 156 Q90 146 84 136"
          stroke="#c9725b"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          className="animate-steam-2"
        />
      </g>

      {/* Male Character Trousers & Shoes */}
      <g>
        <rect x="145" y="198" width="22" height="40" rx="8" fill="#292524" />
        <rect x="179" y="198" width="22" height="40" rx="8" fill="#292524" />
        {/* Shoes / Sandals */}
        <ellipse cx="155" cy="240" rx="14" ry="6.5" fill="#44403c" />
        <ellipse cx="191" cy="240" rx="14" ry="6.5" fill="#44403c" />
      </g>

      {/* Male Character Torso (Breathing gently) */}
      <g className="animate-body-breathe">
        {/* Terracotta Shirt / Kurta */}
        <path
          d="M134 140 C134 128 212 128 212 140 L215 202 C215 206 211 208 207 208 L139 208 C135 208 131 206 131 202 Z"
          fill="url(#tunicGrad)"
        />
        {/* Forest Green Waistcoat / Vest */}
        <path
          d="M138 134 L164 134 L164 206 L136 206 Z"
          fill="#28452e"
        />
        <path
          d="M182 134 L208 134 L210 206 L182 206 Z"
          fill="#28452e"
        />
        {/* Shirt Collar V-neck */}
        <path d="M164 134 L173 150 L182 134" fill="#fffaf3" opacity="0.2" />
        {/* Golden Woven Trim on Vest */}
        <path d="M138 200 L162 200 M184 200 L208 200" stroke="#f6df9d" strokeWidth="2.5" strokeDasharray="4 3" />
      </g>

      {/* Left Arm Holding Bowl (Tilts slightly to meet spoon) */}
      <g className="animate-bowl-tilt">
        {/* Left Sleeve */}
        <path
          d="M138 144 C122 152 118 172 132 180 L146 174"
          fill="#bc3b22"
          stroke="#962c17"
          strokeWidth="1.5"
        />
        {/* Bowl of Spicy Pickle */}
        <path d="M133 172 C133 191 171 191 171 172 Z" fill="#fffaf3" stroke="#d9cbb8" strokeWidth="2" />
        <ellipse cx="152" cy="172" rx="19" ry="5.5" fill="#ab331c" />
        <ellipse cx="152" cy="171" rx="14" ry="3.2" fill="#d14226" />
        {/* Left Hand */}
        <circle cx="136" cy="178" r="7.5" fill="#f4c29f" />

        {/* Aroma wisp from bowl */}
        <path
          d="M150 162 Q145 152 151 144"
          stroke="#c9725b"
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          className="animate-steam-3"
        />
      </g>

      {/* Male Character Head (Animated happy nod & tasting expression) */}
      <g className="animate-head-enjoy">
        {/* Ears */}
        <circle cx="129" cy="96" r="8" fill="#f0b792" />
        <circle cx="217" cy="96" r="8" fill="#f0b792" />
        {/* Face */}
        <circle cx="173" cy="88" r="44" fill="#f7c9aa" />
        {/* Short Tousled Male Hair */}
        <path
          d="M126 88 C124 54 146 34 174 34 C202 34 222 54 219 88 C214 72 204 62 192 58 C186 64 176 66 168 58 C156 64 142 66 126 88 Z"
          fill="#2d1b10"
        />
        {/* Little hair tuft on top */}
        <path
          d="M164 36 Q173 25 184 35"
          stroke="#2d1b10"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        {/* Expressive Eyebrows */}
        <path d="M144 74 Q153 70 161 74" stroke="#2d1b10" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M185 74 Q193 70 202 74" stroke="#2d1b10" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        {/* Rosy Cheeks */}
        <ellipse cx="145" cy="99" rx="8" ry="4.5" fill="#e87a68" opacity="0.4" />
        <ellipse cx="201" cy="99" rx="8" ry="4.5" fill="#e87a68" opacity="0.4" />
        {/* Happy Closed Smiling Eyes */}
        <path d="M144 86 Q153 78 161 86" stroke="#2d1b10" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        <path d="M185 86 Q193 78 202 86" stroke="#2d1b10" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        {/* Cute Nose */}
        <path d="M172 92 Q176 95 172 98" stroke="#d88e6d" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        {/* Mouth (Opens excitedly when tasting spoon!) */}
        <path d="M163 106 Q173 115 183 106" stroke="#2d1b10" strokeWidth="2.8" strokeLinecap="round" fill="none" />
        <ellipse
          cx="173"
          cy="110"
          rx="6"
          ry="5.5"
          fill="#8c2313"
          className="animate-mouth-taste"
        />
      </g>

      {/* Right Arm + Hand + Wooden Spoon (Scooping & Lifting Motion) */}
      <g className="animate-spoon-eat">
        {/* Right Sleeve */}
        <path
          d="M206 146 C222 154 222 174 204 182"
          fill="none"
          stroke="#bc3b22"
          strokeWidth="15"
          strokeLinecap="round"
        />
        {/* Wooden Spoon */}
        <path
          d="M162 156 L205 176"
          stroke="#c28e54"
          strokeWidth="5.5"
          strokeLinecap="round"
        />
        <ellipse cx="159" cy="154" rx="9" ry="5.5" transform="rotate(24 159 154)" fill="#b37b40" />
        {/* Fiery Pickle on Spoon */}
        <ellipse cx="158" cy="152" rx="6.5" ry="4" transform="rotate(24 158 152)" fill="#ab331c" />
        {/* Right Hand gripping spoon */}
        <circle cx="201" cy="176" r="8" fill="#f4c29f" />
      </g>

      {/* Little Joy Heart popping up when tasting */}
      <g className="animate-heart-pop">
        <path
          d="M228 66 C228 62 233 59 236 63 C239 59 244 62 244 66 C244 71 236 76 236 76 C236 76 228 71 228 66 Z"
          fill="#ab331c"
        />
      </g>
    </svg>
  );
}

export default function GiftBoxesPage() {
  return (
    <div className="w-full bg-[#fbf8f3] min-h-[calc(100vh-140px)] flex items-center justify-center px-4 sm:px-6 lg:px-12 py-10 sm:py-16 overflow-hidden">
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
