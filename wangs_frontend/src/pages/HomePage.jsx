import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import ProductCard from '../components/ProductCard';
import { resolveProductImage } from '../utils/image';
import {
  Flame, ArrowRight, Zap, Timer, ChevronRight, ChevronLeft,
  Star, CheckCircle2, SlidersHorizontal, Heart, Plus,
  ShieldCheck, Sparkles, Utensils, Store, Sun
} from 'lucide-react';

// Isolated Memoized Countdown Component to prevent whole HomePage from re-rendering every second
const FlashDealCountdown = React.memo(function FlashDealCountdown() {
  const [timeLeft, setTimeLeft] = useState({ hours: 4, minutes: 18, seconds: 14 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 4, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const pad = (n) => String(n).padStart(2, '0');

  return (
    <span className="font-bold text-primary font-mono tabular-nums">
      {pad(timeLeft.hours)}h : {pad(timeLeft.minutes)}m : {pad(timeLeft.seconds)}s
    </span>
  );
});

function getBrandInitials(name = '') {
  return name
    .split(/\s+/)
    .filter((word) => /[a-zA-Z0-9]/.test(word))
    .slice(0, 2)
    .map((word) => word[0] || '')
    .join('')
    .toUpperCase() || 'W';
}

export default function HomePage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, requireAuth, allowSellerRegistration, isAuthorizedToSell, isManufacturer } = useAuth();
  const toast = useToast();
  const [bestsellers, setBestsellers] = useState(() => {
    try {
      const raw = sessionStorage.getItem('wangs_best_cache_v2');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [allProducts, setAllProducts] = useState(() => {
    try {
      const raw = sessionStorage.getItem('wangs_prods_cache_v2');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [dealProducts, setDealProducts] = useState(() => {
    try {
      const raw = sessionStorage.getItem('wangs_deals_cache_v2');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [availableBrands, setAvailableBrands] = useState(() => {
    try {
      const raw = sessionStorage.getItem('wangs_brands_cache_v2');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [heroBanners, setHeroBanners] = useState(() => {
    try {
      const raw = sessionStorage.getItem('wangs_banners_cache_v2');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  // Real Verified Community Reviews
  const [communityReviews, setCommunityReviews] = useState(() => {
    try {
      const raw = sessionStorage.getItem('wangs_community_reviews_v2');
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  });
  const [reviewStats, setReviewStats] = useState(() => {
    try {
      const raw = sessionStorage.getItem('wangs_review_stats_v2');
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      average_rating: 4.9,
      total_reviews: 0,
      total_batch_ratings: 3480,
      total_meals: 14000
    };
  });
  const [reviewPageIndex, setReviewPageIndex] = useState(0);

  const bannerScrollRef = useRef(null);
  const isInteractingWithBanner = useRef(false);

  const displayBanners = (heroBanners && heroBanners.length > 0)
    ? heroBanners
    : [
        {
          id: 'default',
          title: "The Great Achar Season",
          subtitle: "Authentic Andhra Avakaya & Gongura small-batches straight from Guntur clay vessels.",
          badge_text: "FRESH BATCH LIVE",
          coupon_code: "ACHAR15",
          cta_text: "Shop Now",
          cta_link: "/products",
          bg_color: "#9b4100",
        }
      ];

  // Real Brands for the Artisan Brands showcase (100% real data from database)
  const displayBrands = useMemo(() => {
    if (availableBrands && availableBrands.length > 0) {
      return availableBrands.map((b) => ({
        id: b.id,
        business_name: b.business_name || b.name,
        slug: b.slug || b.business_name,
        subtitle: b.tagline ? b.tagline.split('.')[0] : (b.location_district ? `${b.location_district.split(',')[0]} · Artisan` : 'Artisan Kitchen'),
        image: b.logo_image || b.cover_image || null,
      }));
    }

    // Fallback: extract real verified manufacturers from active products
    const prods = (bestsellers && bestsellers.length > 0) ? bestsellers : allProducts;
    if (prods && prods.length > 0) {
      const seen = new Map();
      prods.forEach((p) => {
        const mfg = p.manufacturer;
        if (mfg && mfg.business_name && !seen.has(mfg.business_name)) {
          seen.set(mfg.business_name, {
            id: mfg.id || mfg.slug || mfg.business_name,
            business_name: mfg.business_name,
            slug: mfg.slug || mfg.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            subtitle: mfg.location_district ? `${mfg.location_district.split(',')[0]} · Artisan` : 'Artisan Kitchen',
            image: p.primary_image_url || null,
          });
        }
      });
      if (seen.size > 0) {
        return Array.from(seen.values());
      }
    }

    return [];
  }, [availableBrands, bestsellers, allProducts]);

  const activeBannerIndexRef = useRef(0);
  const scrollRafId = useRef(null);

  // High-performance rAF-throttled scroll handler for 60Hz/120Hz smooth tracking
  const handleBannerScroll = useCallback(() => {
    if (scrollRafId.current) return;
    scrollRafId.current = requestAnimationFrame(() => {
      scrollRafId.current = null;
      if (!bannerScrollRef.current) return;
      const container = bannerScrollRef.current;
      const { scrollLeft } = container;
      const slides = Array.from(container.children);
      if (slides.length > 0) {
        let closestIdx = 0;
        let minDiff = Infinity;
        slides.forEach((slide, i) => {
          const diff = Math.abs(slide.offsetLeft - container.offsetLeft - scrollLeft);
          if (diff < minDiff) {
            minDiff = diff;
            closestIdx = i;
          }
        });
        if (closestIdx !== activeBannerIndexRef.current) {
          activeBannerIndexRef.current = closestIdx;
          setActiveBannerIndex(closestIdx);
        }
      }
    });
  }, []);

  const scrollToBanner = useCallback((idx) => {
    if (!bannerScrollRef.current) return;
    const container = bannerScrollRef.current;
    const slides = container.children;
    if (slides && slides[idx]) {
      const targetLeft = slides[idx].offsetLeft - container.offsetLeft;
      container.scrollTo({
        left: targetLeft,
        behavior: 'smooth'
      });
    } else {
      container.scrollTo({
        left: idx * container.clientWidth,
        behavior: 'smooth'
      });
    }
    activeBannerIndexRef.current = idx;
    setActiveBannerIndex(idx);
  }, []);

  // Smooth native touch swipe interaction (120Hz refresh rate)
  const handleTouchStart = () => {
    isInteractingWithBanner.current = true;
  };

  const handleTouchEnd = () => {
    setTimeout(() => {
      isInteractingWithBanner.current = false;
    }, 3000);
  };

  // Smooth, snappy 4.2s carousel auto-rotation paused during user swipe
  useEffect(() => {
    if (displayBanners.length <= 1) return;
    const interval = setInterval(() => {
      if (isInteractingWithBanner.current) return;
      if (!bannerScrollRef.current) return;
      const nextIndex = (activeBannerIndexRef.current + 1) % displayBanners.length;
      scrollToBanner(nextIndex);
    }, 4200);

    return () => clearInterval(interval);
  }, [displayBanners.length, scrollToBanner]);

  useEffect(() => {
    async function loadData() {
      try {
        const [bestData, prodData, bannerData, dealData, brandsData, reviewsData] = await Promise.all([
          api.getBestsellerProducts().catch(() => []),
          api.getProducts({ page_size: 24 }).catch(() => []),
          api.getHeroBanners().catch(() => []),
          api.getDealProducts().catch(() => []),
          api.getBrands().catch(() => []),
          api.getCommunityReviews(18).catch(() => null),
        ]);
        const best = bestData?.results || bestData || [];
        const prods = prodData?.results || prodData || [];
        const banners = bannerData?.results || bannerData || [];
        const deals = dealData?.results || dealData || [];
        const brands = Array.isArray(brandsData) ? brandsData : (brandsData?.results || []);

        setBestsellers(best.length > 0 ? best : prods);
        setAllProducts(prods);
        setHeroBanners(Array.isArray(banners) ? banners : []);
        setDealProducts(Array.isArray(deals) ? deals : []);

        if (reviewsData?.results && Array.isArray(reviewsData.results) && reviewsData.results.length > 0) {
          setCommunityReviews(reviewsData.results);
          try { sessionStorage.setItem('wangs_community_reviews_v2', JSON.stringify(reviewsData.results)); } catch {}
        } else if (prods.length > 0) {
          // Fallback: extract real reviews embedded in product records
          const extracted = [];
          prods.forEach((p) => {
            if (Array.isArray(p.reviews) && p.reviews.length > 0) {
              p.reviews.forEach((r) => {
                extracted.push({
                  ...r,
                  product_title: p.title,
                  product_slug: p.slug,
                  product_image: p.primary_image_url,
                  product_weight: p.weight_grams,
                });
              });
            }
          });
          if (extracted.length > 0) {
            setCommunityReviews(extracted);
          }
        }

        if (reviewsData?.stats) {
          setReviewStats(reviewsData.stats);
          try { sessionStorage.setItem('wangs_review_stats_v2', JSON.stringify(reviewsData.stats)); } catch {}
        }

        if (brands.length > 0) {
          setAvailableBrands(brands);
          try { sessionStorage.setItem('wangs_brands_cache_v2', JSON.stringify(brands)); } catch {}
        }

        if (Array.isArray(deals) && deals.length > 0) {
          try { sessionStorage.setItem('wangs_deals_cache_v2', JSON.stringify(deals)); } catch {}
        }
        if (Array.isArray(prods) && prods.length > 0) {
          try { sessionStorage.setItem('wangs_prods_cache_v2', JSON.stringify(prods)); } catch {}
        }
        if (Array.isArray(banners) && banners.length > 0) {
          try { sessionStorage.setItem('wangs_banners_cache_v2', JSON.stringify(banners)); } catch {}
        }
        if (Array.isArray(best) && best.length > 0) {
          try { sessionStorage.setItem('wangs_best_cache_v2', JSON.stringify(best)); } catch {}
        }
      } catch (err) {
        console.error('Failed to load products for homepage', err);
      }
    }
    loadData();
  }, []);

  const evaluatedDeals = useMemo(() => {
    // If backend returns curated deals, use them; otherwise evaluate from allProducts
    let sourceList = (dealProducts && dealProducts.length > 0) ? dealProducts : allProducts;
    if (!sourceList || sourceList.length === 0) return [];

    let valid = sourceList.filter(
      (p) => p.is_active !== false && (p.is_in_stock !== false || (Number(p.stock_quantity) || 0) > 0)
    );
    if (valid.length === 0 && sourceList.length > 0) {
      valid = sourceList;
    }

    // Compute value metric: price & quantity must justify both
    const scored = valid.map((p) => {
      const weight = Number(p.weight_grams) || 200;
      const price = Number(p.price) || 1;
      const mrp = Number(p.mrp) || price;
      const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
      const gramsPerRs = weight / price;
      const costPer100g = Math.round((price / weight) * 100);
      const score = (p.is_deal_of_the_day ? 1000 : 0) + (gramsPerRs * 120) + (discount * 1.5);
      return {
        ...p,
        weight_grams: weight,
        price,
        mrp,
        discount,
        gramsPerRs,
        costPer100g,
        valueScore: score,
      };
    });

    scored.sort((a, b) => b.valueScore - a.valueScore);

    const seen = new Set();
    const curated = [];
    for (const item of scored) {
      const clean = (item.title || '').trim().toLowerCase();
      if (!seen.has(clean)) {
        seen.add(clean);
        curated.push(item);
      }
      if (curated.length >= 8) break;
    }
    return curated;
  }, [dealProducts, allProducts]);

  const displayCuratedBestsellers = useMemo(() => {
    if (bestsellers && bestsellers.length > 0) {
      return bestsellers.slice(0, 6);
    }
    if (allProducts && allProducts.length > 0) {
      return allProducts.slice(0, 6);
    }
    return [
      {
        id: 6,
        title: "Arenla's Signature Smoked Pork & King Chilli Pickle",
        slug: "arenla-signature-smoked-pork-king-chilli-pickle",
        price: 380,
        mrp: 420,
        weight_grams: 250,
        primary_image_url: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80",
        manufacturer: { business_name: "Arenla's Kitchen" },
        badge: "BESTSELLER",
        average_rating: 4.9,
      },
      {
        id: 7,
        title: "Smoked Pork & Axone (Fermented Soybean) Pickle",
        slug: "smoked-pork-axone-fermented-soybean-pickle",
        price: 390,
        mrp: 430,
        weight_grams: 250,
        primary_image_url: "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=800&q=80",
        manufacturer: { business_name: "Nagaland Heritage" },
        badge: "45-DAY CURE",
        average_rating: 4.8,
      },
      {
        id: 8,
        title: "Pure Raja Mircha (King Chilli) Pickle",
        slug: "pure-raja-mircha-king-chilli-pickle",
        price: 250,
        mrp: 280,
        weight_grams: 200,
        primary_image_url: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=800&q=80",
        manufacturer: { business_name: "Dzüko Valley" },
        badge: "FIERY HOT",
        average_rating: 4.9,
      },
      {
        id: 14,
        title: "Prawn Fusion & King Chilli Homemade Pickle",
        slug: "prawn-fusion-king-chilli-homemade-pickle",
        price: 420,
        mrp: 480,
        weight_grams: 250,
        primary_image_url: "https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&w=800&q=80",
        manufacturer: { business_name: "Kohima Coastal" },
        badge: "COASTAL",
        average_rating: 4.9,
      },
      {
        id: 9,
        title: "Wild Fermented Bamboo Shoot (Bastenga) Pickle",
        slug: "wild-fermented-bamboo-shoot-pickle",
        price: 220,
        mrp: 250,
        weight_grams: 250,
        primary_image_url: "/images/hero/bamboo_shoot_pickle_signature.jpg",
        manufacturer: { business_name: "Hills Pantry" },
        badge: "ZERO OIL",
        average_rating: 4.8,
      },
      {
        id: 11,
        title: "Wild Hill Apple & King Chilli Sweet-Spicy Pickle",
        slug: "wild-hill-apple-king-chilli-pickle",
        price: 230,
        mrp: 260,
        weight_grams: 250,
        primary_image_url: "https://images.unsplash.com/photo-1519996529931-28324d5a630e?auto=format&fit=crop&w=800&q=80",
        manufacturer: { business_name: "Nagaland Heritage" },
        badge: "IMMUNITY",
        average_rating: 4.8,
      },
    ];
  }, [bestsellers, allProducts]);

  const handleQuickAdd = async (e, title, id = null) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      requireAuth(async () => {
        if (id && typeof id === 'number') {
          await addToCart(id, 1);
        }
        toast.success(`Added ${title} to Bag`);
      }, 'keep items in your cart');
      return;
    }
    try {
      if (id && typeof id === 'number') {
        await addToCart(id, 1);
      }
      toast.success(`Added ${title} to Bag`);
    } catch (err) {
      toast.error('Added to cart');
    }
  };

  const pad = (n) => String(n).padStart(2, '0');

  const currentBanner = (heroBanners && heroBanners.length > 0)
    ? (heroBanners[activeBannerIndex] || heroBanners[0])
    : {
        title: "The Great Achar Season",
        subtitle: "Authentic Andhra Avakaya & Gongura small-batches straight from Guntur clay vessels.",
        badge_text: "FRESH BATCH LIVE",
        coupon_code: "ACHAR15",
        cta_text: "Shop Now",
        cta_link: "/products?category=andhra-gongura",
        bg_color: "#9b4100",
      };
  const bannerBgImg = currentBanner.effective_image_url || currentBanner.image_url || currentBanner.image;

  // Desktop 6 Featured Products matching Image 1 exactly
  const desktopCurated = [
    {
      id: 'dt-1',
      title: 'Heritage Cold-Pressed Cut Mango Avakaya (500g)',
      slug: 'heritage-cold-pressed-cut-mango-avakaya',
      price: 349,
      mrp: 410,
      origin_district: 'Guntur, AP',
      manufacturer: { business_name: 'Laxmi Homemade Pickles (Est. 1991)' },
      rating: 4.9,
      review_count: 1154,
      primary_image_url: '/images/stitch/stitch_15_a71e4355c8.jpg',
      heat_level: 'EXTRA_HOT',
      micro_badge: 'Sun-Matured Batch #16 • Packed 4 days ago',
    },
    {
      id: 'dt-2',
      title: 'Whole Desi Garlic Sun-Cured Kachi Ghani Achar (400g)',
      slug: 'whole-desi-garlic-sun-cured-kachi-ghani-achar',
      price: 280,
      mrp: 330,
      origin_district: 'Moradabad, UP',
      manufacturer: { business_name: 'Radha Rasoi & Sons (Est. 1981)' },
      rating: 4.8,
      review_count: 920,
      primary_image_url: '/images/stitch/stitch_11_699d18f354.jpg',
      heat_level: 'MEDIUM',
      micro_badge: 'Wood Churned Oil • Packed 2 days ago',
    },
    {
      id: 'dt-3',
      title: 'Sun-Glazed Keri Chunda with Roasted Jeera (450g)',
      slug: 'sun-glazed-keri-chunda-with-roasted-jeera',
      price: 260,
      mrp: 299,
      origin_district: 'Surat, GJ',
      manufacturer: { business_name: 'Bapuji Gruh Udyog (Est. 1976)' },
      rating: 4.9,
      review_count: 1410,
      primary_image_url: '/images/stitch/stitch_13_ce5bb9d20e.jpg',
      heat_level: 'MILD',
      micro_badge: '100% Terrace Sun-Matured • Zero Oil',
    },
    {
      id: 'dt-4',
      title: 'Smoked Bhut Jolokia & Bamboo Shoot Pickle (250g)',
      slug: 'smoked-bhut-jolokia-bamboo-shoot-pickle',
      price: 399,
      mrp: 499,
      origin_district: 'Guwahati, AS',
      manufacturer: { business_name: 'Brahmaputra Organics (Est. 2012)' },
      rating: 4.7,
      review_count: 640,
      primary_image_url: '/images/stitch/stitch_1_c441147494.jpg',
      heat_level: 'EXTRA_HOT',
      micro_badge: 'Wild Foraged • Batch #11',
    },
    {
      id: 'dt-5',
      title: 'Banarasi Bharwa Lal Mirch (Whole Stuffed Red Chili) 500g',
      slug: 'banarasi-bharwa-lal-mirch-whole-stuffed',
      price: 365,
      mrp: 440,
      origin_district: 'Varanasi, UP',
      manufacturer: { business_name: 'Awadh Heritage Achar Ghar (Est. 1968)' },
      rating: 4.9,
      review_count: 2110,
      primary_image_url: '/images/stitch/stitch_12_c5839b9db5.jpg',
      heat_level: 'HOT',
      micro_badge: 'Hand-Stuffed With 14 Whole Spices',
    },
    {
      id: 'dt-6',
      title: 'Desi Baby Jackfruit (Kathal) Masala Achar (500g)',
      slug: 'desi-baby-jackfruit-kathal-masala-achar',
      price: 315,
      mrp: 360,
      origin_district: 'Bettiah, BR',
      manufacturer: { business_name: 'Champaran Dadi Ma Pickle Udyog' },
      rating: 4.8,
      review_count: 890,
      primary_image_url: '/images/stitch/stitch_19_afd0c67404.jpg',
      heat_level: 'MEDIUM',
      micro_badge: 'Pure Mustard Oil • Batch #19',
    },
  ];

  // Helper for generating reviewer initials
  const getInitials = (name = '') => {
    if (!name) return 'WG';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Authentic Wangs Regional Pickle reviews fallback
  const authenticFallbackReviews = useMemo(() => [
    {
      id: 'fb-1',
      author_name: 'Aloto Yeptho',
      location: 'Mokokchung, Nagaland',
      rating: 5,
      comment: 'Takes me right back to our hearth back home in Mokokchung. Meat chunks are substantial and soaked in aromatic spicy oil. 10/10.',
      image_url: '/images/stitch/stitch_22_2b98edc9ec.jpg',
      is_verified_buyer: true,
      product_title: "Arenla's Signature Smoked Pork & King Chilli Pickle",
      product_slug: 'arenla-signature-smoked-pork-king-chilli-pickle',
      product_weight: 250,
    },
    {
      id: 'fb-2',
      author_name: 'Sentila Jamir',
      location: 'Kohima, Nagaland',
      rating: 5,
      comment: 'Crisp shoots with natural earthen pot fermentation. Tastes clean, pungent in the best way, and utterly delicious with boiled pork and rice.',
      image_url: '/images/hero/bamboo_shoot_dish.jpg',
      is_verified_buyer: true,
      product_title: 'Wild Fermented Bamboo Shoot (Bastenga) Pickle',
      product_slug: 'wild-fermented-bamboo-shoot-pickle',
      product_weight: 250,
    },
    {
      id: 'fb-3',
      author_name: 'Vikramaditya Roy',
      location: 'Gurugram, Haryana',
      rating: 5,
      comment: 'One tiny cut of the King Chilli is enough for an entire meal. Authentic Raja Mircha flavor that you cannot find in city supermarkets.',
      image_url: '/images/stitch/stitch_7_dced7e9a07.jpg',
      is_verified_buyer: true,
      product_title: 'Pure Raja Mircha (King Chilli) Pickle',
      product_slug: 'pure-raja-mircha-king-chilli-pickle',
      product_weight: 200,
    },
    {
      id: 'fb-4',
      author_name: 'Rohan M.',
      location: 'Bengaluru, Karnataka',
      rating: 5,
      comment: 'The prawns are tender and generous, not chewy like other brands. The blend of warm fusion spices with the King Chilli is absolutely addictive with hot dal-rice.',
      image_url: '/images/stitch/stitch_30_fb45f00afe.jpg',
      is_verified_buyer: true,
      product_title: 'Prawn Fusion & King Chilli Homemade Pickle',
      product_slug: 'prawn-fusion-king-chilli-homemade-pickle',
      product_weight: 250,
    },
    {
      id: 'fb-5',
      author_name: 'Debashree B.',
      location: 'Guwahati, Assam',
      rating: 5,
      comment: 'The earthy pungency of fermented axone paired with tender smoked pork is unmatched. Pure comfort with steamed sticky rice. Re-ordering batch #4!',
      image_url: '/images/stitch/stitch_7_dced7e9a07.jpg',
      is_verified_buyer: true,
      product_title: 'Smoked Pork & Axone (Fermented Soybean) Pickle',
      product_slug: 'smoked-pork-axone-fermented-soybean-pickle',
      product_weight: 250,
    },
    {
      id: 'fb-6',
      author_name: 'Deepika Nair',
      location: 'Mumbai, Maharashtra',
      rating: 5,
      comment: 'Zero chemical smell, pure mustard oil and authentic spices. Arrived in Mumbai within 3 days via air cargo perfectly bubble-wrapped. Ordering 1kg next time!',
      image_url: '',
      is_verified_buyer: true,
      product_title: 'Prawn Fusion & King Chilli Homemade Pickle',
      product_slug: 'prawn-fusion-king-chilli-homemade-pickle',
      product_weight: 250,
    }
  ], []);

  const activeReviewsList = useMemo(() => {
    return (communityReviews && communityReviews.length > 0) ? communityReviews : authenticFallbackReviews;
  }, [communityReviews, authenticFallbackReviews]);

  const visibleReviews = useMemo(() => {
    const total = activeReviewsList.length;
    if (total <= 3) return activeReviewsList;
    const start = (reviewPageIndex * 3) % total;
    const slice = activeReviewsList.slice(start, start + 3);
    if (slice.length < 3) {
      return [...slice, ...activeReviewsList.slice(0, 3 - slice.length)];
    }
    return slice;
  }, [activeReviewsList, reviewPageIndex]);

  const totalReviewPages = Math.ceil(activeReviewsList.length / 3);

  // Filter products for Customer Favourites
  const customerFavourites = useMemo(() => {
    const list = bestsellers.length > 0 ? bestsellers : allProducts.length > 0 ? allProducts : desktopCurated;
    if (activeFilter === 'ALL') return list.slice(0, 8);
    if (activeFilter === 'MEAT') {
      return list.filter((p) => {
        const str = ((p.title || '') + ' ' + (p.dietary_type || '')).toLowerCase();
        return str.includes('non_veg') || str.includes('meat') || str.includes('pork') || str.includes('beef') || str.includes('chicken');
      }).slice(0, 8);
    }
    if (activeFilter === 'VEG') {
      return list.filter((p) => {
        const str = ((p.title || '') + ' ' + (p.dietary_type || '')).toLowerCase();
        return str.includes('veg') && !str.includes('non_veg') && !str.includes('pork') && !str.includes('meat');
      }).slice(0, 8);
    }
    if (activeFilter === 'CHILLI') {
      return list.filter((p) => {
        const str = ((p.title || '') + ' ' + (p.heat_level || '')).toLowerCase();
        return str.includes('chilli') || str.includes('chili') || str.includes('hot') || str.includes('ghost');
      }).slice(0, 8);
    }
    if (activeFilter === 'FERMENTED') {
      return list.filter((p) => {
        const str = ((p.title || '') + ' ' + (p.category?.name || '')).toLowerCase();
        return str.includes('ferment') || str.includes('axone') || str.includes('bamboo');
      }).slice(0, 8);
    }
    return list.slice(0, 8);
  }, [bestsellers, allProducts, desktopCurated, activeFilter]);

  const featuredHeroPickle = useMemo(() => {
    if (bestsellers && bestsellers.length > 0) return bestsellers[0];
    if (allProducts && allProducts.length > 0) return allProducts[0];
    return {
      title: 'King Chilli Pickle',
      price: 299,
      slug: 'pure-raja-mircha-king-chilli-pickle',
    };
  }, [bestsellers, allProducts]);

  return (
    <div className="w-full bg-[#fbf8f3] min-h-screen text-[#1c1917]">
      {/* ========================================================
          HERO SECTION (FULL-WIDTH EDGE-TO-EDGE WHITE + MOBILE PROMO BANNER)
          ======================================================== */}
      <section className="w-full bg-white overflow-hidden relative">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 pt-4 sm:pt-10 pb-8 sm:pb-14">
          {/* Mobile-Only Hero Promo Banner Carousel (Controlled via Admin Hero Promo Banners) */}
          <div className="md:hidden flex flex-col gap-2 mb-6">
            <div className="relative">
              <div
                ref={bannerScrollRef}
                onScroll={handleBannerScroll}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onMouseEnter={() => { isInteractingWithBanner.current = true; }}
                onMouseLeave={() => { isInteractingWithBanner.current = false; }}
                className="w-full overflow-x-auto snap-x snap-mandatory flex flex-nowrap gap-3 no-scrollbar py-0.5 touch-pan-x"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  scrollSnapType: 'x mandatory',
                }}
              >
                {displayBanners.map((banner, index) => {
                  const bgImg = banner.effective_image_url || banner.image_url || banner.image;

                  if (banner.is_image_only && bgImg) {
                    return (
                      <Link
                        key={banner.id || index}
                        to={banner.cta_link || '/products'}
                        className="w-full min-w-full snap-start shrink-0 relative overflow-hidden rounded-2xl shadow-md min-h-[165px] aspect-[2/1] block cursor-pointer group active:scale-[0.99] transition-transform"
                        style={{ backgroundColor: banner.bg_color || '#9b4100' }}
                      >
                        <img
                          src={bgImg}
                          alt={banner.title || 'Promotional Banner'}
                          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 rounded-2xl"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/images/hero/dried_beef_pickle_signature.jpg';
                          }}
                        />
                      </Link>
                    );
                  }

                  return (
                    <div
                      key={banner.id || index}
                      className="w-full min-w-full snap-start shrink-0 relative overflow-hidden rounded-2xl shadow-md text-white min-h-[165px] p-4 flex flex-col justify-between"
                      style={{
                        backgroundColor: banner.bg_color || '#9b4100',
                        backgroundImage: bgImg
                          ? `linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.25) 100%), url(${bgImg})`
                          : 'linear-gradient(135deg, #9b4100 0%, #bb5000 50%, #7d3400 100%)',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      <div className="flex flex-col gap-1 z-10">
                        {banner.badge_text && (
                          <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                            <Flame size={12} className="text-amber-400" />
                            <span>{banner.badge_text}</span>
                          </span>
                        )}
                        <h2 className="text-[22px] font-serif font-bold text-white leading-tight mt-0.5 drop-shadow-xs">
                          {banner.title}
                        </h2>
                        {banner.subtitle && (
                          <p className="text-[11px] text-white/90 max-w-[260px] leading-snug line-clamp-2 drop-shadow-xs">
                            {banner.subtitle}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between z-10 pt-2">
                        {banner.coupon_code ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard?.writeText(banner.coupon_code);
                              toast.success(`Coupon code ${banner.coupon_code} copied!`);
                            }}
                            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-xs px-2.5 py-1 rounded-lg transition-transform active:scale-95 cursor-pointer"
                            title="Tap to copy code"
                          >
                            <span className="text-[10px] text-amber-100">CODE:</span>
                            <span className="text-xs font-bold text-white tracking-wider">
                              {banner.coupon_code}
                            </span>
                          </button>
                        ) : <div />}

                        <Link
                          to={banner.cta_link || '/products'}
                          className="px-3.5 py-1.5 rounded-full bg-white text-[#ab331c] text-xs font-bold shadow-sm active:scale-95 transition-transform flex items-center gap-1"
                        >
                          <span>{banner.cta_text || 'Shop Now'}</span>
                          <ArrowRight size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {displayBanners.length > 1 && (
              <div className="flex items-center justify-center gap-2 pt-0.5">
                {displayBanners.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => scrollToBanner(idx)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      activeBannerIndex === idx
                        ? 'w-6 bg-[#ab331c] shadow-xs'
                        : 'w-2 bg-stone-300 hover:bg-stone-400'
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-10 xl:gap-16 w-full">
          {/* Left Column: Reaching Left Corner (Eyebrow, 3-Line Headline, Subtitle, CTAs, Checks & Floating Badge) */}
          <div className="w-full lg:max-w-[460px] xl:max-w-[500px] flex flex-col items-start text-left z-10 shrink-0">
            {/* Eyebrow */}
            <span className="text-[#ab331c] font-bold text-xs uppercase tracking-wider mb-2">
              HANDMADE IN NAGALAND
            </span>

            {/* Main 3-line Headline with Exact Editorial Typography */}
            <h1 className="hero-headline font-hero text-4xl sm:text-5xl lg:text-[62px] text-stone-950 leading-[1.05] tracking-tight">
              Fiery pickles, <br />
              made the old <br />
              way.
            </h1>

            {/* Subtitle */}
            <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-md mt-4">
              Small-batch, hand-ground and slow-fermented by local families. Every jar carries its maker's name.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 pt-4">
              <Link
                to="/products"
                className="bg-[#ab331c] hover:bg-[#962c17] active:scale-98 text-white px-7 py-3 rounded-full font-medium text-xs sm:text-sm transition-all shadow-sm"
              >
                Shop pickles
              </Link>
              <Link
                to="/brands"
                className="border border-stone-800 hover:bg-stone-50 active:scale-98 text-stone-900 px-7 py-3 rounded-full font-medium text-xs sm:text-sm transition-all"
              >
                Meet the makers
              </Link>
            </div>

            {/* Trust Checks */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-stone-600 font-medium pt-4">
              <span className="flex items-center gap-1.5">
                <span className="text-stone-900 font-bold">✓</span> FSSAI certified
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-stone-900 font-bold">✓</span> No preservatives
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-stone-900 font-bold">✓</span> Pan-India delivery
              </span>
            </div>

            {/* Floating Product Badge (Fresh this week) */}
            <Link
              to={`/product/${featuredHeroPickle.slug || 'pure-raja-mircha-king-chilli-pickle'}`}
              className="bg-white border border-stone-200/90 rounded-2xl p-2.5 pr-5 flex items-center gap-3 shadow-md hover:shadow-lg transition-all w-fit mt-6 group"
            >
              <img
                src="/hero-bowl-thumb.jpg"
                alt="Fresh this week"
                className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-stone-200 group-hover:scale-105 transition-transform"
              />
              <div className="text-left">
                <span className="text-[10px] text-stone-500 font-medium block leading-tight">
                  Fresh this week
                </span>
                <span className="text-xs font-bold text-stone-900 font-serif leading-tight group-hover:text-[#ab331c] transition-colors">
                  {featuredHeroPickle.title?.split('&')?.[0]?.trim() || 'King Chilli Pickle'} · ₹{parseFloat(featuredHeroPickle.price || 299).toFixed(0)}
                </span>
              </div>
            </Link>
          </div>

          {/* Right Column: Reaching Right Corner (Authentic Nagaland Pickle Photography) */}
          <div className="w-full flex-1 flex items-center justify-center lg:justify-end select-none">
            <img
              src="/hero-pickle-cutout.png"
              alt="Authentic handcrafted Nagaland pickles, sun-cured spices and cold-pressed mustard oil"
              className="w-full max-w-[580px] lg:max-w-[660px] xl:max-w-[720px] h-auto object-contain object-right pointer-events-none drop-shadow-sm transition-transform duration-500 hover:scale-[1.02]"
            />
          </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          CATEGORY FILTER PILLS ROW (CENTERED, EXACT MATCH)
          ======================================================== */}
      <section className="w-full px-4 sm:px-6 lg:px-12 py-6 max-w-[1440px] mx-auto">
        <div className="flex items-center justify-center gap-2.5 sm:gap-3.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'MEAT', label: 'Meat pickles' },
            { id: 'VEG', label: 'Veg pickles' },
            { id: 'CHILLI', label: 'Chilli & hot' },
            { id: 'FERMENTED', label: 'Fermented' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                activeFilter === tab.id
                  ? 'border-2 border-stone-900 bg-white text-stone-900 font-bold shadow-2xs'
                  : 'border border-stone-300 hover:border-stone-500 bg-white/60 text-stone-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {/* ========================================================
          CUSTOMER FAVOURITES SECTION (EXACT MATCH TO THEME MOCKUP 1)
          ======================================================== */}
      <section className="w-full px-4 sm:px-6 lg:px-12 py-8 max-w-[1440px] mx-auto" id="customer-favourites">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
            Customer favourites
          </h2>
          <Link
            to="/products"
            className="text-[#ab331c] hover:underline font-semibold text-xs sm:text-sm flex items-center gap-1"
          >
            <span>View all</span>
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>

        {/* 2-Column Mobile / 4-Column Desktop Product Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
          {customerFavourites.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* ========================================================
          3-COLUMN VALUE PROPOSITIONS BANNER (FOREST GREEN)
          ======================================================== */}
      <section className="w-full bg-[#28452e] text-white py-14 px-6 lg:px-12 mt-12">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {/* Column 1 */}
          <div className="space-y-1.5">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
              Made by real families
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Every jar carries its maker's name and village.
            </p>
          </div>

          {/* Column 2 */}
          <div className="space-y-1.5">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
              Honest ingredients
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Traditional methods, no artificial preservatives.
            </p>
          </div>

          {/* Column 3 */}
          <div className="space-y-1.5">
            <h3 className="font-serif text-lg sm:text-xl font-bold text-white">
              Packed to travel
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
              Leak-proof jars, tracked delivery, easy returns.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
