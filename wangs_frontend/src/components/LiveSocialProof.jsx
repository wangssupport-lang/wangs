import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, X, Sparkles, Flame } from 'lucide-react';

const RECENT_ACTIVITIES = [
  {
    name: 'Priya S.',
    location: 'Bengaluru, KA',
    product: "Arenla's Signature Smoked Pork & King Chilli Pickle",
    slug: 'arenla-signature-smoked-pork-king-chilli-pickle',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=200&q=80',
    time: '2 mins ago',
    tag: 'Verified Food Connoisseur'
  },
  {
    name: 'Kevisenuo A.',
    location: 'Kohima, Nagaland',
    product: 'Pure Raja Mircha (King Chilli) Pickle',
    slug: 'pure-raja-mircha-king-chilli-pickle',
    image: 'https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=200&q=80',
    time: '5 mins ago',
    tag: '12-Hour Express Runner'
  },
  {
    name: 'Ankit V.',
    location: 'Dimapur, Nagaland',
    product: 'Wild Fermented Bamboo Shoot (Bastenga) Pickle',
    slug: 'wild-fermented-bamboo-shoot-pickle',
    image: '/images/hero/bamboo_shoot_pickle_signature.jpg',
    time: '9 mins ago',
    tag: 'Verified Harvest Order'
  },
  {
    name: 'Sneha R.',
    location: 'South Delhi, DL',
    product: 'Prawn Fusion & King Chilli Homemade Pickle',
    slug: 'prawn-fusion-king-chilli-homemade-pickle',
    image: 'https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&w=200&q=80',
    time: '14 mins ago',
    tag: 'Express Air Cargo'
  },
  {
    name: 'Vikram M.',
    location: 'Pune, Maharashtra',
    product: 'Smoked Pork & Axone (Fermented Soybean) Pickle',
    slug: 'smoked-pork-axone-fermented-soybean-pickle',
    image: 'https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=200&q=80',
    time: '21 mins ago',
    tag: 'Artisan Batch Buyer'
  },
  {
    name: 'Thepfuvilie K.',
    location: 'Kohima, Nagaland',
    product: 'Dzüko Roasted King Chilli & Mountain Sichuan Mash',
    slug: 'dzuko-roasted-king-chilli-mountain-sichuan-mash',
    image: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=200&q=80',
    time: '28 mins ago',
    tag: 'Local Heritage Repeat Order'
  }
];

export default function LiveSocialProof() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;

    // Show initial notification after 3.5 seconds
    const initialTimer = setTimeout(() => {
      setIsVisible(true);
    }, 3500);

    // Rotate notification every 14 seconds: visible for 6.5s, hidden for 7.5s
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % RECENT_ACTIVITIES.length);
        setIsVisible(true);
      }, 7500);
    }, 14000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [dismissed]);

  if (dismissed || !isVisible) return null;

  const current = RECENT_ACTIVITIES[currentIndex];

  return (
    <aside 
      aria-label="Recent buyer activity"
      className="fixed bottom-20 md:bottom-6 left-3 right-3 sm:right-auto sm:left-6 z-40 max-w-[360px] w-auto animate-in fade-in slide-in-from-bottom-5 duration-500 pointer-events-auto"
    >
      <div className="bg-[#1c1815]/95 backdrop-blur-md text-stone-100 p-2.5 sm:p-3 rounded-2xl border border-stone-700/80 shadow-2xl flex items-center gap-3 relative group">
        <Link 
          to={`/product/${current.slug}`}
          className="relative w-14 h-14 min-w-[56px] min-h-[56px] max-w-[56px] max-h-[56px] rounded-xl overflow-hidden bg-stone-800 shrink-0 border border-stone-700 block"
        >
          <img
            src={current.image}
            alt={current.product}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/images/hero/dried_beef_pickle_signature.jpg';
            }}
          />
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#1c1815] rounded-full" />
        </Link>

        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center justify-between gap-1 text-[11px] text-stone-300">
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-white truncate">{current.name}</span>
              <span className="text-stone-400 text-[10.5px] truncate">in {current.location}</span>
            </div>
            <span className="text-stone-400 font-mono text-[10px] shrink-0">{current.time}</span>
          </div>

          <Link
            to={`/product/${current.slug}`}
            className="block text-xs font-serif font-bold text-amber-200 hover:text-amber-100 truncate mt-0.5 leading-snug"
            title={current.product}
          >
            {current.product}
          </Link>

          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium mt-1">
            <ShieldCheck size={12} className="shrink-0 text-emerald-400" />
            <span className="truncate">{current.tag}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-stone-400 hover:text-white p-1 rounded-full hover:bg-stone-800 transition-colors cursor-pointer"
          aria-label="Dismiss live alert"
        >
          <X size={14} />
        </button>
      </div>
    </aside>
  );
}
