import React from 'react';
import { Flame } from 'lucide-react';

export default function SpiceMeter({ level, showLabel = true, size = 'sm', showShu = false }) {
  const configs = {
    MILD: {
      count: 1,
      label: 'Mild Heat',
      shu: '~5,000 SHU',
      desc: 'Gentle warmth with jaggery or mountain herbs',
      color: 'text-amber-700',
      fillColor: 'text-amber-500 fill-amber-500',
      bg: 'bg-amber-50/80 border-amber-200/80 text-amber-900',
      dotBg: 'bg-amber-500',
    },
    MEDIUM: {
      count: 2,
      label: 'Medium Spice',
      shu: '~30,000 SHU',
      desc: 'Tangy bamboo shoot with roasted red chillies',
      color: 'text-orange-700',
      fillColor: 'text-orange-500 fill-orange-500',
      bg: 'bg-orange-50/80 border-orange-200/80 text-orange-900',
      dotBg: 'bg-orange-500',
    },
    HOT: {
      count: 3,
      label: 'Hot Naga Spice',
      shu: '~350,000 SHU',
      desc: 'Pungent firewood cure with crushed dry chillies',
      color: 'text-chilli-700',
      fillColor: 'text-chilli-600 fill-chilli-600',
      bg: 'bg-red-50/80 border-red-200/80 text-red-900',
      dotBg: 'bg-chilli-600',
    },
    FIERY_KING_CHILLI: {
      count: 4,
      label: 'Fiery Raja Mircha',
      shu: '1,000,000+ SHU',
      desc: 'GI-Tagged King Chilli / Ghost Pepper. Intense!',
      color: 'text-chilli-800 font-bold',
      fillColor: 'text-chilli-700 fill-chilli-700 animate-pulse',
      bg: 'bg-red-100 border-red-300 text-red-950 shadow-sm',
      dotBg: 'bg-chilli-700',
    },
  };

  const current = configs[level] || configs.HOT;
  const iconSize = size === 'sm' ? 13 : size === 'lg' ? 18 : 15;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium tracking-tight ${current.bg} transition-all`}>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Flame
            key={i}
            size={iconSize}
            className={`${i < current.count ? current.fillColor : 'text-stone-300'} transition-colors`}
          />
        ))}
      </div>
      {showLabel && (
        <span className={`text-[11px] font-semibold ${current.color} flex items-center gap-1`}>
          <span>{current.label}</span>
          {showShu && <span className="opacity-75 font-mono text-[10px]">({current.shu})</span>}
        </span>
      )}
    </div>
  );
}
