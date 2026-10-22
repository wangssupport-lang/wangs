import React from 'react';
import { Flame } from 'lucide-react';

export default function SpiceMeter({ level, showLabel = true, size = 'sm' }) {
  const configs = {
    MILD: { count: 1, label: 'Mild Heat', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
    MEDIUM: { count: 2, label: 'Medium Spice', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
    HOT: { count: 3, label: 'Hot Naga Spice', color: 'text-chilli-600', bg: 'bg-red-50 border-red-200' },
    FIERY_KING_CHILLI: { count: 4, label: 'Fiery King Chilli 🌶️', color: 'text-chilli-700 font-bold', bg: 'bg-red-100 border-red-300 text-red-900 animate-pulse' },
  };

  const current = configs[level] || configs.HOT;
  const iconSize = size === 'sm' ? 14 : 18;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs ${current.bg}`}>
      <div className="flex items-center">
        {Array.from({ length: 4 }).map((_, i) => (
          <Flame
            key={i}
            size={iconSize}
            className={`${i < current.count ? current.color + ' fill-current' : 'text-stone-300'} transition-colors`}
          />
        ))}
      </div>
      {showLabel && <span className={`text-[11px] font-medium ${current.color}`}>{current.label}</span>}
    </div>
  );
}
