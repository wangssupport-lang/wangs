import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

function PickleCharacterIllustration() {
  return (
    <svg
      viewBox="0 0 320 270"
      className="w-64 h-56 sm:w-80 sm:h-68 mx-auto select-none pointer-events-none overflow-visible"
      role="img"
      aria-label="Animated character happily eating handcrafted Nagaland pickle"
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
      <ellipse cx="172" cy="244" rx="88" ry="11" fill="#e8dfd3" opacity="0.7" />
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

      {/* Character Legs & Sandals */}
      <g>
        <rect x="147" y="214" width="16" height="24" rx="7" fill="#f2b896" />
        <rect x="181" y="214" width="16" height="24" rx="7" fill="#f2b896" />
        {/* Sandals */}
        <ellipse cx="154" cy="239" rx="13" ry="6" fill="#28452e" />
        <ellipse cx="190" cy="239" rx="13" ry="6" fill="#28452e" />
      </g>

      {/* Character Body & Traditional Attire */}
      <g>
        {/* Main Terracotta Tunic */}
        <path
          d="M134 142 C134 128 210 128 210 142 L216 214 C216 218 212 220 208 220 L136 220 C132 220 128 218 128 214 Z"
          fill="url(#tunicGrad)"
        />
        {/* Forest Green Sash / Shawl */}
        <path
          d="M168 133 L194 133 L188 220 L170 220 Z"
          fill="#28452e"
        />
        {/* Golden Woven Trim */}
        <path d="M130 212 L214 212" stroke="#f6df9d" strokeWidth="3" strokeDasharray="4 3" />
      </g>

      {/* Left Arm Holding Bowl (foreground left of character's body) */}
      <g>
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

      {/* Character Head (Animated happy tilt while enjoying pickle) */}
      <g className="animate-head-enjoy">
        {/* Hair Bun */}
        <circle cx="216" cy="108" r="14" fill="#3b2314" />
        {/* Ears */}
        <circle cx="129" cy="96" r="8" fill="#f0b792" />
        <circle cx="215" cy="96" r="8" fill="#f0b792" />
        {/* Face */}
        <circle cx="172" cy="88" r="44" fill="#f7c9aa" />
        {/* Hair */}
        <path
          d="M126 88 C126 52 150 38 172 38 C196 38 218 54 218 88 C210 74 192 64 172 60 C156 68 136 74 126 88 Z"
          fill="#3b2314"
        />
        {/* Rosy Cheeks */}
        <ellipse cx="145" cy="99" rx="8" ry="5" fill="#e87a68" opacity="0.45" />
        <ellipse cx="199" cy="99" rx="8" ry="5" fill="#e87a68" opacity="0.45" />
        {/* Happy Closed Smiling Eyes */}
        <path d="M144 86 Q152 78 160 86" stroke="#3b2314" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        <path d="M184 86 Q192 78 200 86" stroke="#3b2314" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        {/* Cute Nose */}
        <path d="M171 92 Q175 95 171 98" stroke="#d88e6d" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        {/* Happy Smile */}
        <path d="M161 105 Q172 116 183 105" stroke="#3b2314" strokeWidth="3" strokeLinecap="round" fill="none" />
      </g>

      {/* Right Arm + Hand + Wooden Spoon (Animated Eating Motion!) */}
      <g className="animate-spoon-eat">
        {/* Right Sleeve */}
        <path
          d="M204 146 C220 154 220 174 202 182"
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
