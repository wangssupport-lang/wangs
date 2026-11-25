import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ShieldCheck, MapPin } from 'lucide-react';
import { resolveProductImage } from '../utils/image';

function getInitials(name = '') {
  return name
    .split(/\s+/)
    .filter((word) => /[a-zA-Z0-9]/.test(word))
    .slice(0, 2)
    .map((word) => word[0] || '')
    .join('')
    .toUpperCase() || 'W';
}

export default function BrandCard({ brand, compact = false }) {
  const [logoFailed, setLogoFailed] = useState(false);

  const brandName = brand.business_name || brand.name || 'Artisan Brand';
  const brandSlug = brand.slug || brand.business_name || brand.name;
  const targetUrl = `/products?brand=${encodeURIComponent(brandSlug)}`;
  const location = brand.location_district || brand.location || 'Artisan Workshop';
  const tagline = brand.tagline || brand.brand_story || 'Small-batch authentic artisanal brand';
  const rawImage = brand.logo_image || brand.cover_image || '';
  const brandImage = rawImage ? resolveProductImage(rawImage) : '';

  // Minimal mode for Homepage Showcase (Logo and brand name in same row)
  if (compact) {
    return (
      <Link
        to={targetUrl}
        className="w-[200px] xs:w-[220px] sm:w-auto shrink-0 snap-start group flex items-center gap-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 hover:border-primary p-3 hover:shadow-md transition-all select-none text-left"
        title={`Visit ${brandName}`}
      >
        <div className="w-12 h-12 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-serif font-black text-sm border border-outline-variant/30 shadow-2xs group-hover:scale-105 transition-transform overflow-hidden shrink-0">
          {brandImage && !logoFailed ? (
            <img
              src={brandImage}
              alt={brandName}
              onError={() => setLogoFailed(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <span>{getInitials(brandName)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-serif font-bold text-on-surface text-xs sm:text-sm group-hover:text-primary transition-colors leading-tight truncate">
            {brandName}
          </h3>
          {location && (
            <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
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
      className="group flex flex-col justify-between overflow-hidden rounded-2xl sm:rounded-3xl border border-outline-variant/30 bg-surface-container-lowest p-3.5 sm:p-6 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:shadow-lg"
    >
      <div>
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo / Crest */}
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center font-serif font-bold text-sm sm:text-lg border border-outline-variant/30 shadow-xs overflow-hidden flex-shrink-0">
            {brandImage && !logoFailed ? (
              <img
                src={brandImage}
                alt={brandName}
                onError={() => setLogoFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{getInitials(brandName)}</span>
            )}
          </div>

          <span className="inline-flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-[10px] sm:text-xs font-bold group-hover:bg-primary group-hover:text-on-primary transition-colors">
            <span className="hidden sm:inline">View Items</span>
            <span className="sm:hidden">View</span>
            <ArrowUpRight size={12} />
          </span>
        </div>

        {/* Brand Name & Location */}
        <div className="mt-3 sm:mt-4">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <h3 className="font-serif text-sm sm:text-xl font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
              {brandName}
            </h3>
            <ShieldCheck size={14} className="text-secondary flex-shrink-0 sm:w-4 sm:h-4" />
          </div>

          <p className="mt-1 flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs text-on-surface-variant">
            <MapPin size={12} className="text-primary flex-shrink-0" />
            <span className="truncate">{location}</span>
          </p>

          <p className="mt-2 sm:mt-2.5 text-[11px] sm:text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
            {tagline}
          </p>
        </div>
      </div>

      <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-outline-variant/20 flex items-center justify-between text-[11px] sm:text-xs font-bold text-primary group-hover:text-primary-container">
        <span>Open Store</span>
        <ArrowUpRight size={13} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
      </div>
    </Link>
  );
}
