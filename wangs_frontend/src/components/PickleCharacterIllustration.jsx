import React from 'react';

export function PickleCharacterIllustration({ className = "w-64 h-56 sm:w-80 sm:h-72" }) {
  return (
    <div className="animate-character-3d inline-block">
      <svg
        viewBox="0 0 320 275"
        className={`${className} mx-auto select-none pointer-events-none overflow-visible`}
        role="img"
        aria-label="3D animated male character happily eating handcrafted Nagaland pickle"
      >
        <defs>
          {/* 3D Soft Drop Shadow */}
          <filter id="soft3DShadow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#7c5d41" floodOpacity="0.14" />
          </filter>

          {/* 3D Skin & Face Shading */}
          <radialGradient id="skin3D" cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#ffe1cc" />
            <stop offset="65%" stopColor="#f7c4a0" />
            <stop offset="100%" stopColor="#e39f77" />
          </radialGradient>

          <radialGradient id="hand3D" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffdec7" />
            <stop offset="100%" stopColor="#e5a27b" />
          </radialGradient>

          {/* 3D Hair Shading */}
          <linearGradient id="hair3D" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4c3121" />
            <stop offset="55%" stopColor="#2e1b10" />
            <stop offset="100%" stopColor="#1b0f08" />
          </linearGradient>

          {/* 3D Glass Jar */}
          <linearGradient id="jarGlass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.82" />
            <stop offset="50%" stopColor="#f5ede2" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#e5d7c5" stopOpacity="0.55" />
          </linearGradient>

          {/* 3D Terracotta Kurta */}
          <linearGradient id="tunicGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#cf472c" />
            <stop offset="60%" stopColor="#ab331c" />
            <stop offset="100%" stopColor="#7f210f" />
          </linearGradient>

          {/* 3D Forest Green Vest */}
          <linearGradient id="vest3D" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#355a3c" />
            <stop offset="100%" stopColor="#1d3522" />
          </linearGradient>

          {/* 3D Ceramic Bowl */}
          <linearGradient id="bowl3D" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#f5ecdf" />
            <stop offset="100%" stopColor="#dfd1be" />
          </linearGradient>
        </defs>

        {/* Soft ground shadows (no card, directly on #fbf8f3 background) */}
        <ellipse cx="175" cy="248" rx="76" ry="11" fill="#e2d7c8" opacity="0.75" />
        <ellipse cx="78" cy="244" rx="34" ry="7.5" fill="#e2d7c8" opacity="0.7" />

        {/* Open 3D Pickle Jar on the Left */}
        <g filter="url(#soft3DShadow)">
          {/* Jar Lid leaning beside jar */}
          <ellipse
            cx="39"
            cy="228"
            rx="9"
            ry="19"
            transform="rotate(-16 39 228)"
            fill="#d9b382"
            stroke="#b88c56"
            strokeWidth="2"
          />
          {/* Jar Body */}
          <rect
            x="52"
            y="174"
            width="52"
            height="68"
            rx="13"
            fill="url(#jarGlass)"
            stroke="#d6cab8"
            strokeWidth="2.5"
          />
          {/* Fiery Red Pickle Inside Jar */}
          <rect x="56" y="189" width="44" height="49" rx="9" fill="#ab331c" />
          <ellipse cx="78" cy="190" rx="22" ry="5.5" fill="#d14226" />
          {/* Chili & spice flecks inside jar */}
          <circle cx="67" cy="206" r="2.5" fill="#f6df9d" opacity="0.9" />
          <circle cx="88" cy="216" r="2" fill="#f6df9d" opacity="0.9" />
          <path d="M72 213 Q80 206 86 215" stroke="#7d1e0d" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          {/* Jar Rim */}
          <rect x="57" y="166" width="42" height="9" rx="4.5" fill="#fffaf3" stroke="#d6cab8" strokeWidth="2" />
          {/* 3D Specular Glass Highlight */}
          <path d="M62 183 L62 230" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" opacity="0.65" />

          {/* Rising aroma wisps from open jar */}
          <path
            d="M72 158 Q67 148 73 139"
            stroke="#c9725b"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            className="animate-steam-1"
          />
          <path
            d="M84 156 Q90 146 84 136"
            stroke="#c9725b"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            className="animate-steam-2"
          />
        </g>

        {/* Male Character Trousers & Shoes */}
        <g filter="url(#soft3DShadow)">
          <rect x="145" y="198" width="22" height="42" rx="8" fill="#292524" />
          <rect x="179" y="198" width="22" height="42" rx="8" fill="#292524" />
          {/* Shoes with subtle top highlight */}
          <ellipse cx="155" cy="242" rx="14" ry="6.5" fill="#3f3a36" />
          <ellipse cx="191" cy="242" rx="14" ry="6.5" fill="#3f3a36" />
          <ellipse cx="153" cy="240" rx="7" ry="2.5" fill="#57534e" opacity="0.5" />
          <ellipse cx="189" cy="240" rx="7" ry="2.5" fill="#57534e" opacity="0.5" />
        </g>

        {/* Male Character 3D Torso */}
        <g className="animate-body-breathe" filter="url(#soft3DShadow)">
          {/* Terracotta Shirt / Kurta */}
          <path
            d="M134 140 C134 128 212 128 212 140 L215 204 C215 208 211 210 207 210 L139 210 C135 210 131 208 131 204 Z"
            fill="url(#tunicGrad)"
          />
          {/* Forest Green Waistcoat / Vest */}
          <path d="M138 134 L164 134 L164 208 L136 208 Z" fill="url(#vest3D)" />
          <path d="M182 134 L208 134 L210 208 L182 208 Z" fill="url(#vest3D)" />
          {/* Shirt Collar V-neck */}
          <path d="M164 134 L173 150 L182 134" fill="#fffaf3" opacity="0.25" />
          {/* Golden Woven Trim on Vest */}
          <path d="M138 201 L162 201 M184 201 L208 201" stroke="#f6df9d" strokeWidth="2.5" strokeDasharray="4 3" />
        </g>

        {/* Left Arm Holding 3D Rice Plate with Pickle (Tilts slightly to meet spoon) */}
        <g className="animate-bowl-tilt" filter="url(#soft3DShadow)">
          {/* Left Sleeve */}
          <path
            d="M138 144 C120 152 116 172 128 180 L144 174"
            fill="url(#tunicGrad)"
            stroke="#8a2614"
            strokeWidth="1.5"
          />
          {/* Wide Ceramic Rice Plate */}
          <ellipse cx="152" cy="178" rx="30" ry="10.5" fill="url(#bowl3D)" stroke="#d6c7b2" strokeWidth="2" />
          <ellipse cx="152" cy="176" rx="24" ry="7.5" fill="#fdfaf5" stroke="#ebe0d0" strokeWidth="1" />

          {/* Steamed White Rice Mound on Plate */}
          <path
            d="M133 176 C134 162 164 160 170 175 C164 181 139 181 133 176 Z"
            fill="#ffffff"
            stroke="#ede4d5"
            strokeWidth="1.2"
          />
          {/* Subtle Rice Grain Texture */}
          <ellipse cx="143" cy="170" rx="2" ry="1" transform="rotate(-15 143 170)" fill="#e8dfd1" />
          <ellipse cx="150" cy="167" rx="2" ry="1" transform="rotate(20 150 167)" fill="#e8dfd1" />
          <ellipse cx="146" cy="174" rx="2" ry="1" transform="rotate(10 146 174)" fill="#e8dfd1" />
          <ellipse cx="156" cy="171" rx="2" ry="1" transform="rotate(-25 156 171)" fill="#e8dfd1" />

          {/* Generous Serving of Fiery Red Pickle on the Rice */}
          <path
            d="M153 175 C154 166 168 165 171 174 C168 179 157 179 153 175 Z"
            fill="#ab331c"
          />
          <ellipse cx="162" cy="171" rx="6" ry="3.2" fill="#d9482b" />
          {/* Chili seed & oil sheen on pickle */}
          <circle cx="160" cy="172" r="1.1" fill="#f6df9d" />
          <circle cx="165" cy="174" r="1" fill="#f6df9d" />
          <ellipse cx="169" cy="176" rx="3" ry="1.2" fill="#c94025" opacity="0.6" />

          {/* Left Hand gripping edge of plate */}
          <circle cx="128" cy="179" r="7.5" fill="url(#hand3D)" />

          {/* Aroma wisp from warm rice & pickle */}
          <path
            d="M151 160 Q146 150 152 142"
            stroke="#c9725b"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            className="animate-steam-3"
          />
        </g>

        {/* Male Character 3D Head with Layered Quiff Hairstyle */}
        <g className="animate-head-enjoy" filter="url(#soft3DShadow)">
          {/* Ears with inner depth */}
          <circle cx="129" cy="96" r="8.5" fill="url(#hand3D)" />
          <circle cx="217" cy="96" r="8.5" fill="url(#hand3D)" />
          <circle cx="129" cy="96" r="4" fill="#d9926b" opacity="0.5" />
          <circle cx="217" cy="96" r="4" fill="#d9926b" opacity="0.5" />

          {/* 3D Shaded Face */}
          <circle cx="173" cy="88" r="44" fill="url(#skin3D)" />

          {/* Stylish Layered Male Hairstyle (Swept Quiff + Textured Fringe + Sideburns) */}
          <path
            d="M127 92 C123 64 134 38 162 28 C184 20 212 28 220 58 C224 72 222 86 218 93 C216 78 210 66 198 58 C186 52 164 52 146 62 C136 68 131 78 127 92 Z"
            fill="url(#hair3D)"
          />
          {/* Textured Swept-Up Front Quiff / Volume */}
          <path
            d="M142 54 C150 32 182 22 204 38 C196 48 180 54 164 53 C155 52 148 56 142 54 Z"
            fill="#3e2618"
          />
          {/* Playful Layered Bangs / Strands */}
          <path
            d="M154 50 Q162 66 174 58 Q184 68 194 56"
            fill="url(#hair3D)"
          />
          {/* Subtle 3D Hair Specular Highlight */}
          <path
            d="M156 38 Q174 29 194 37"
            stroke="#6e4b35"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
            opacity="0.65"
          />

          {/* Expressive Eyebrows */}
          <path d="M144 73 Q153 68 161 73" stroke="#2d1b10" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <path d="M185 73 Q193 68 202 73" stroke="#2d1b10" strokeWidth="2.8" strokeLinecap="round" fill="none" />

          {/* Soft 3D Rosy Cheeks */}
          <ellipse cx="145" cy="99" rx="8.5" ry="4.5" fill="#e87a68" opacity="0.45" />
          <ellipse cx="201" cy="99" rx="8.5" ry="4.5" fill="#e87a68" opacity="0.45" />

          {/* Happy Closed Smiling Eyes */}
          <path d="M144 86 Q153 77 161 86" stroke="#2d1b10" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          <path d="M185 86 Q193 77 202 86" stroke="#2d1b10" strokeWidth="3.2" strokeLinecap="round" fill="none" />

          {/* 3D Cute Nose with Highlight */}
          <path d="M172 91 Q177 95 172 99" stroke="#d48664" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          <circle cx="171" cy="94" r="1.5" fill="#fff3ea" opacity="0.65" />

          {/* Mouth Synchronized with Spoon Arrival */}
          <path d="M162 106 Q173 116 184 106" stroke="#2d1b10" strokeWidth="2.8" strokeLinecap="round" fill="none" />
          <ellipse
            cx="173"
            cy="110"
            rx="6.5"
            ry="6"
            fill="#8c2313"
            className="animate-mouth-taste"
          />
        </g>

        {/* Right Arm + Hand + Wooden Spoon (Anatomically Pivoted at Shoulder to Reach Mouth!) */}
        <g className="animate-spoon-eat" filter="url(#soft3DShadow)">
          {/* Right Sleeve */}
          <path
            d="M206 146 C222 154 222 174 204 182"
            fill="none"
            stroke="url(#tunicGrad)"
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
          {/* Bite of White Rice + Fiery Pickle on Spoon */}
          <ellipse cx="158" cy="152.5" rx="7" ry="4.2" transform="rotate(24 158 152.5)" fill="#ffffff" />
          <ellipse cx="157" cy="151" rx="4.2" ry="2.6" transform="rotate(24 157 151)" fill="#ab331c" />
          <ellipse cx="156.5" cy="150.2" rx="2" ry="1.1" transform="rotate(24 156.5 150.2)" fill="#e05336" />
          {/* 3D Right Hand gripping spoon */}
          <circle cx="201" cy="176" r="8" fill="url(#hand3D)" />
        </g>

        {/* Little Joy Heart popping up when tasting */}
        <g className="animate-heart-pop">
          <path
            d="M228 66 C228 62 233 59 236 63 C239 59 244 62 244 66 C244 71 236 76 236 76 C236 76 228 71 228 66 Z"
            fill="#ab331c"
          />
        </g>
      </svg>
    </div>
  );
}

export function PickleLoadingScreen({ message = 'Serving up something fiery...', minHeight = 'min-h-[55vh]' }) {
  return (
    <div className={`w-full ${minHeight} flex flex-col items-center justify-center px-4 py-10 text-center`}>
      <PickleCharacterIllustration className="w-48 h-44 sm:w-60 sm:h-52" />
      <p className="mt-3 text-xs sm:text-sm font-medium text-stone-600 tracking-wide animate-pulse">
        {message}
      </p>
    </div>
  );
}

export default PickleCharacterIllustration;
