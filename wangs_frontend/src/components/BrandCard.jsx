import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck, MapPin } from 'lucide-react';

function getInitials(name = '') {
  return name
    .split(/\s+/)
    .filter((word) => /[a-zA-Z0-9]/.test(word))
    .slice(0, 3)
    .map((word) => word.match(/[a-zA-Z0-9]/)?.[0] || '')
    .join('')
    .toUpperCase();
}

export default function BrandCard({ brand, compact = false }) {
  const [logoFailed, setLogoFailed] = useState(false);

  const brandName = brand.business_name || brand.name || 'Artisan Brand';
  const brandSlug = brand.slug || brand.business_name || brand.name;
  const targetUrl = `/products?brand=${encodeURIComponent(brandSlug)}`;
  const location = brand.location_district || brand.location || 'Artisan Workshop';
  const tagline = brand.tagline || brand.brand_story || 'Small-batch authentic artisanal brand';

  // Minimal mode for Homepage Showcase (Logo and brand name in same row)
  if (compact) {
    return (
      <Link
        to={targetUrl}
        className="w-[200px] xs:w-[220px] sm:w-auto shrink-0 snap-start group flex items-center gap-3 bg-white rounded-2xl border border-stone-200/90 hover:border-red-500 p-3 hover:shadow-md transition-all select-none text-left"
        title={`Visit ${brandName}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center font-serif font-black text-sm border border-red-500/30 shadow-2xs group-hover:scale-105 transition-transform overflow-hidden shrink-0">
          {brand.logo_image && !logoFailed ? (
            <img
              src={brand.logo_image}
              alt={brandName}
              onError={() => setLogoFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{getInitials(brandName)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-serif font-bold text-stone-900 text-xs sm:text-sm group-hover:text-red-600 transition-colors leading-tight truncate">
            {brandName}
          </h3>
          {location && (
            <p className="text-[11px] text-stone-500 truncate mt-0.5">
              {location}
            </p>
          )}
        </div>
      </Link>
    );
  }

  // Standard Clean Brand Card for /brands directory
  return (
    <Link
      to={targetUrl}
      className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-stone-200/90 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-red-500 hover:shadow-xl"
    >
      <div>
        <div className="flex items-center justify-between gap-4">
          {/* Logo / Crest */}
          <div className="w-14 h-14 rounded-2xl bg-red-600 text-white flex items-center justify-center font-serif font-bold text-lg border border-red-500/30 shadow-sm overflow-hidden flex-shrink-0">
            {brand.logo_image && !logoFailed ? (
              <img
                src={brand.logo_image}
                alt={brandName}
                onError={() => setLogoFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{getInitials(brandName)}</span>
            )}
          </div>

          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 border border-red-100 text-red-600 text-xs font-bold group-hover:bg-red-600 group-hover:text-white transition-colors">
            <span>View Items</span>
            <ArrowUpRight size={13} />
          </span>
        </div>

        {/* Brand Name & Location */}
        <div className="mt-4">
          <div className="flex items-center gap-1.5">
            <h3 className="font-serif text-xl font-bold text-stone-900 group-hover:text-red-600 transition-colors">
              {brandName}
            </h3>
            <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
          </div>

          <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
            <MapPin size={13} className="text-red-600 flex-shrink-0" />
            <span>{location}</span>
          </p>

          <p className="mt-2.5 text-xs text-stone-600 line-clamp-2 leading-relaxed">
            {tagline}
          </p>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-red-600 group-hover:text-red-700">
        <span>Open Brand Store</span>
        <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </Link>
  );
}
