import React from 'react';
import { Flame } from 'lucide-react';

export default function SpiceMeter({ level, showLabel = true, showShu = false, size = 'sm' }) {
  const configs = {
    MILD: {
      count: 1,
      label: 'Mild Heat',
      shu: '~5,000 SHU',
      pillClass: 'bg-stone-100 text-stone-700 border-stone-200',
      activeColor: 'text-amber-600',
    },
    MEDIUM: {
      count: 2,
      label: 'Medium Heat',
      shu: '~35,000 SHU',
      pillClass: 'bg-orange-50 text-orange-800 border-orange-200',
      activeColor: 'text-orange-600',
    },
    HOT: {
      count: 3,
      label: 'Hot Naga Spice',
      shu: '~150,000 SHU',
      pillClass: 'bg-red-50 text-chilli-700 border-red-200',
      activeColor: 'text-chilli-600',
    },
    FIERY_KING_CHILLI: {
      count: 4,
      label: 'Fiery King Chilli',
      shu: '1,041,427 SHU',
      pillClass: 'bg-chilli-100 text-chilli-800 border-chilli-300 font-semibold',
      activeColor: 'text-chilli-700',
    },
  };

  const current = configs[level] || configs.HOT;
  const iconSize = size === 'sm' ? 12 : 15;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] ${current.pillClass}`}>
      <div className="flex items-center -space-x-0.5">
        {[1, 2, 3, 4].map((i) => (
          <Flame
            key={i}
            size={iconSize}
            className={`${i <= current.count ? `${current.activeColor} fill-current` : 'text-stone-300'} transition-colors`}
          />
        ))}
      </div>
      {showLabel && <span className="font-medium tracking-tight">{current.label}</span>}
      {showShu && <span className="opacity-70 font-mono text-[10px]">({current.shu})</span>}
    </div>
  );
}
