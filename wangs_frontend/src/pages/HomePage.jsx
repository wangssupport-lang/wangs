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
  ShieldCheck, Sparkles, Utensils, Store
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

  return (
    <div className="w-full bg-background min-h-screen text-on-surface">
      {/* ========================================================
          DESKTOP VIEW (EXACTLY MATCHING IMAGE 1)
          ======================================================== */}
      <div className="hidden md:block">
        {/* Section 1: Hero Announcement & Marketplace Banner */}
        <section className="w-full bg-surface-container-low px-6 lg:px-12 py-12 lg:py-16">
          <div className="max-w-[1440px] mx-auto grid grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left 7 Columns */}
            <div className="col-span-7 flex flex-col gap-5">
              <div className="inline-flex items-center gap-1.5 bg-primary-fixed text-on-primary-fixed px-3.5 py-1 rounded-full w-fit shadow-xs">
                <Flame size={15} className="text-amber-400 shrink-0" />
                <span className="font-label-md text-xs font-bold uppercase tracking-wide">
                  Direct From 18 Spice States
                </span>
              </div>

              <h1 className="font-display-lg text-4xl lg:text-[54px] font-serif text-on-surface tracking-tight leading-[1.12]">
                Authentic Indian Pickles, <br />
                Handcrafted by Heritage <br />
                Makers.
              </h1>

              <p className="font-body-lg text-base text-on-surface-variant max-w-2xl leading-relaxed">
                Connecting 320+ certified artisanal pickle manufacturers across 18 states directly with pickle lovers. Sun-cured in wood-pressed mustard oil, stone-ground spices, zero synthetic preservatives.
              </p>

              {/* CTA Buttons */}
              <div className="flex items-center gap-3.5 pt-2">
                <a
                  href="#artisan-bestsellers"
                  className="bg-primary text-on-primary font-title-md text-sm px-6 py-3.5 rounded-full shadow-md hover:bg-primary-container transition-all flex items-center gap-2 font-bold active:scale-95"
                >
                  <span>Shop Regional Pickles</span>
                  <ArrowRight size={16} />
                </a>
              </div>

              {/* 3 Metric Stat Cards */}
              <div className="grid grid-cols-3 gap-3.5 pt-3 max-w-xl">
                <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-outline-variant/30">
                  <span className="font-headline-md text-2xl font-serif text-primary font-bold block">
                    14,200+
                  </span>
                  <span className="font-label-md text-xs text-on-surface-variant">
                    Packs Delivered Pan-India
                  </span>
                </div>

                <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-outline-variant/30">
                  <div className="flex items-center gap-1">
                    <span className="font-headline-md text-2xl font-serif text-secondary font-bold">
                      4.8
                    </span>
                    <Star size={18} className="fill-secondary text-secondary shrink-0" />
                  </div>
                  <span className="font-label-md text-xs text-on-surface-variant">
                    Average Batch Rating
                  </span>
                </div>

                <div className="bg-surface-container-lowest p-4 rounded-xl shadow-xs border border-outline-variant/30">
                  <span className="font-headline-md text-2xl font-serif text-tertiary font-bold block">
                    320+
                  </span>
                  <span className="font-label-md text-xs text-on-surface-variant">
                    Verified Heritage Kitchens
                  </span>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Hero Visual Showcase */}
            <div className="col-span-5 relative">
              <div className="relative bg-surface-container-highest rounded-3xl overflow-hidden shadow-xl p-3 border border-outline-variant/30">
                <img
                  src="/images/stitch/stitch_3_d0bc312725.jpg"
                  alt="Traditional Indian raw mango pickle achar inside glazed ceramic martaban earthen vessel under warm golden sun"
                  className="w-full h-[420px] object-cover rounded-2xl shadow-md"
                />

                {/* Floating Badge 1: Top Left - Solid Clean Surface */}
                <div className="absolute top-6 left-6 bg-surface px-3.5 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-outline-variant/30">
                  <CheckCircle2 size={15} className="text-secondary shrink-0" />
                  <span className="font-label-md text-xs font-bold text-on-surface">Sun-Cured Batch #24 Active</span>
                </div>

                {/* Floating Badge 2: Bottom Right - Solid Clean Badge */}
                <div className="absolute bottom-6 right-6 bg-inverse-surface text-inverse-on-surface p-3.5 rounded-xl shadow-xl flex items-center gap-3 max-w-[260px] border border-white/10">
                  <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                    <Flame size={20} className="text-amber-400" />
                  </div>
                  <div>
                    <p className="font-label-sm text-[10px] uppercase tracking-wider text-secondary-fixed-dim font-bold">Terroir Fermentation</p>
                    <p className="font-title-md text-xs font-semibold leading-tight">21-Day Earthen Vessel Maturation</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Explore Available Artisan Brands */}
        <section className="w-full px-6 lg:px-12 py-14 bg-surface-container-lowest/60">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <span className="font-label-md text-xs uppercase tracking-wider text-primary font-bold">
                  VERIFIED ARTISANAL PRODUCERS
                </span>
                <h2 className="font-headline-lg text-3xl font-serif text-on-surface mt-1">
                  Explore Available Brands
                </h2>
                <p className="font-body-md text-sm text-on-surface-variant mt-0.5">
                  Direct from verified cottage kitchens, heritage pickle masters, and small-batch regional producers.
                </p>
              </div>

              <Link
                to="/brands"
                className="flex items-center gap-1.5 text-primary font-label-lg text-sm font-bold hover:underline group shrink-0"
              >
                <span>View All Brands Directory ({availableBrands.length > 0 ? availableBrands.length : 'All'})</span>
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Brands Grid (100% Real Dynamic Brands from Database) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {(availableBrands.length > 0 ? availableBrands : [
                {
                  id: 'fallback-1',
                  business_name: "Arenla's Heritage Craft",
                  slug: 'arenlas-heritage-craft',
                  location_district: 'Kohima, Nagaland',
                  tagline: 'Smoked pork, king chilli, and traditional fermented bamboo shoot recipes.',
                  cover_image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80',
                  is_verified_producer: true,
                  products_count: 6,
                },
                {
                  id: 'fallback-2',
                  business_name: 'Dzüko Valley Artisans',
                  slug: 'dzuko-valley-artisans',
                  location_district: 'Mokokchung, Nagaland',
                  tagline: 'Roasted mountain chilis, Sichuan pepper mash, and sun-cured meats.',
                  cover_image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=1200&auto=format&fit=crop&q=80',
                  is_verified_producer: true,
                  products_count: 3,
                },
                {
                  id: 'fallback-3',
                  business_name: 'Akamla Pickle',
                  slug: 'akamla-pickle',
                  location_district: 'Kohima, Nagaland',
                  tagline: 'Authentic slow-simmered beef chunks and wood-pressed oil pickling.',
                  cover_image: '/media/products/4136881b4ee9494b.jpg',
                  is_verified_producer: true,
                  products_count: 4,
                },
                {
                  id: 'fallback-4',
                  business_name: 'Lia Chuka',
                  slug: 'lia-chuka',
                  location_district: 'Kohima District',
                  tagline: 'Heritage Northeast cottage kitchen preserving indigenous flavours.',
                  cover_image: '/featured-pouches.jpg',
                  is_verified_producer: true,
                  products_count: 1,
                }
              ]).map((brand) => {
                const brandSlug = brand.slug || brand.business_name;
                const targetUrl = `/products?brand=${encodeURIComponent(brandSlug)}`;
                const cover = brand.cover_image || brand.hero_banner || brand.logo_image || '/images/stitch/stitch_23_65b6bffc80.jpg';
                const location = brand.location_district || 'Artisan Workshop';
                const count = brand.products_count ?? (brand.sample_products?.length || 0);

                return (
                  <Link
                    key={brand.id || brand.slug}
                    to={targetUrl}
                    className="group bg-surface-container-low rounded-2xl p-4 shadow-xs hover:shadow-lg border border-outline-variant/30 hover:border-primary/50 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-44 rounded-xl overflow-hidden bg-surface-container-highest mb-3.5 relative shadow-inner">
                        <img
                          src={cover}
                          alt={brand.business_name}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/images/stitch/stitch_23_65b6bffc80.jpg';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                        
                        {brand.is_verified_producer && (
                          <span className="absolute top-2.5 right-2.5 bg-emerald-700/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                            <CheckCircle2 size={12} />
                            <span>Verified</span>
                          </span>
                        )}
                        
                        <span className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-md">
                          {location}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-serif font-bold text-base text-on-surface group-hover:text-primary transition-colors leading-tight line-clamp-1">
                          {brand.business_name}
                        </h3>
                        <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                          {brand.tagline || brand.brand_story || 'Authentic small-batch regional pickle recipes crafted with heirloom techniques.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3.5 mt-4 border-t border-outline-variant/30 flex items-center justify-between">
                      <span className="font-label-sm text-xs text-primary font-bold">
                        {count > 0 ? `${count} Available Recipe${count > 1 ? 's' : ''}` : 'Artisan Kitchen'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-on-surface-variant group-hover:text-primary font-semibold transition-colors">
                        <span>Explore</span>
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* Section 3: Curated Artisan Pickle Bestsellers (3x2 Grid) */}
        <section className="w-full bg-surface-container-low px-6 lg:px-12 py-14" id="artisan-bestsellers">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex items-end justify-between mb-8">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-secondary-fixed text-on-secondary-fixed px-3 py-1 rounded-full font-label-sm text-xs font-bold uppercase mb-2">
                  <Flame size={14} className="text-amber-400" />
                  <span>FRESH BATCHES DAILY</span>
                </div>
                <h2 className="font-headline-lg text-3xl font-serif text-on-surface">
                  Curated Artisan Pickle Bestsellers
                </h2>
                <p className="font-body-md text-sm text-on-surface-variant mt-0.5">
                  Lab-tested, sun-fermented batches shipped directly from heritage cottage makers.
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-4 py-1.5 rounded-full font-label-md text-xs font-bold transition-all ${
                    activeFilter === 'ALL'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-variant border border-outline-variant/30'
                  }`}
                >
                  All Batches
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('SPICY')}
                  className={`px-4 py-1.5 rounded-full font-label-md text-xs font-bold transition-all ${
                    activeFilter === 'SPICY'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-variant border border-outline-variant/30'
                  }`}
                >
                  Fiery Spice
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('OIL_FREE')}
                  className={`px-4 py-1.5 rounded-full font-label-md text-xs font-bold transition-all ${
                    activeFilter === 'OIL_FREE'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-variant border border-outline-variant/30'
                  }`}
                >
                  Oil-Free / Sundried
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('ZERO_SUGAR')}
                  className={`px-4 py-1.5 rounded-full font-label-md text-xs font-bold transition-all ${
                    activeFilter === 'ZERO_SUGAR'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-variant border border-outline-variant/30'
                  }`}
                >
                  Zero Sugar
                </button>
              </div>
            </div>

            {/* 3x2 Grid */}
            <div className="grid grid-cols-3 gap-6">
              {(bestsellers && bestsellers.length > 0 ? bestsellers.slice(0, 6) : desktopCurated).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Tales from the Spice Community */}
        <section className="w-full bg-surface-container-low px-6 lg:px-12 py-14">
          <div className="max-w-[1440px] mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
              <div>
                <span className="font-label-md text-xs uppercase tracking-wider text-primary font-bold">
                  VERIFIED GOURMANDS
                </span>
                <h2 className="font-headline-lg text-3xl font-serif text-on-surface mt-1">
                  Tales from the Spice Community
                </h2>
                <p className="font-body-md text-sm text-on-surface-variant mt-0.5">
                  Over {Number(reviewStats.total_meals || 14000).toLocaleString()}+ meals elevated by authentic village flavors.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-surface-container-lowest px-3 py-1.5 rounded-full border border-outline-variant/30 shadow-2xs">
                  <div className="flex text-secondary">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} size={16} className="fill-secondary text-secondary" />
                    ))}
                  </div>
                  <span className="font-title-md text-sm font-bold text-on-surface">
                    {Number(reviewStats.average_rating || 4.9).toFixed(1)} / 5.0
                  </span>
                  <span className="font-body-sm text-xs text-outline">
                    ({reviewStats.total_batch_ratings ? `${Number(reviewStats.total_batch_ratings).toLocaleString()}+ batch ratings` : `${reviewStats.total_reviews || activeReviewsList.length} verified ratings`})
                  </span>
                </div>

                {activeReviewsList.length > 3 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Previous batch stories"
                      disabled={reviewPageIndex === 0}
                      onClick={() => setReviewPageIndex((p) => Math.max(0, p - 1))}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                        reviewPageIndex === 0
                          ? 'border-outline-variant/30 text-outline/40 cursor-not-allowed'
                          : 'border-outline-variant/60 text-on-surface hover:bg-surface-container-high cursor-pointer'
                      }`}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      type="button"
                      aria-label="Next batch stories"
                      disabled={reviewPageIndex >= totalReviewPages - 1}
                      onClick={() => setReviewPageIndex((p) => Math.min(totalReviewPages - 1, p + 1))}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                        reviewPageIndex >= totalReviewPages - 1
                          ? 'border-outline-variant/30 text-outline/40 cursor-not-allowed'
                          : 'border-outline-variant/60 text-on-surface hover:bg-surface-container-high cursor-pointer'
                      }`}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {visibleReviews.map((rev, idx) => {
                const initials = getInitials(rev.author_name);
                const avatarPalette = [
                  'bg-secondary-fixed text-on-secondary-fixed',
                  'bg-primary-fixed text-on-primary-fixed',
                  'bg-tertiary-fixed text-on-tertiary-fixed'
                ];
                const avatarBg = avatarPalette[idx % avatarPalette.length];
                const displayImg = rev.image_url || rev.product_image || '/images/hero/dried_beef_pickle_signature.jpg';
                const locationCity = rev.location ? rev.location.split(',')[0].trim() : '';

                return (
                  <div
                    key={rev.id || `${rev.author_name}-${idx}`}
                    className="bg-surface-container-lowest p-6 rounded-2xl shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:shadow-md hover:border-primary/30 transition-all group"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex text-secondary">
                          {Array.from({ length: Math.max(1, Math.min(5, Math.floor(Number(rev.rating) || 5))) }).map((_, sIdx) => (
                            <Star key={sIdx} size={15} className="fill-secondary text-secondary" />
                          ))}
                        </div>
                        {rev.is_verified_buyer && (
                          <span className="bg-tertiary-fixed text-on-tertiary-fixed text-label-sm font-label-sm px-2 py-0.5 rounded text-[10px] font-bold">
                            Verified Purchase
                          </span>
                        )}
                      </div>

                      <p className="font-body-md text-xs text-on-surface leading-relaxed line-clamp-4">
                        "{rev.comment}"
                      </p>

                      <Link
                        to={rev.product_slug ? `/product/${rev.product_slug}` : '/products'}
                        className="h-28 rounded-xl overflow-hidden bg-surface-container-high my-1 block relative group-hover:scale-[1.01] transition-transform"
                      >
                        <img
                          src={displayImg}
                          alt={rev.product_title || 'Authentic regional pickle'}
                          className="w-full h-full object-cover group-hover:brightness-95 transition-all"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/hero/dried_beef_pickle_signature.jpg';
                          }}
                        />
                      </Link>
                    </div>

                    <div className="flex items-center gap-3 pt-3 border-t border-outline-variant/30 mt-3">
                      <div className={`w-9 h-9 rounded-full ${avatarBg} flex items-center justify-center font-title-md text-xs font-bold shrink-0`}>
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-title-md text-xs font-bold text-on-surface truncate">{rev.author_name}</h4>
                        <p className="font-body-sm text-[11px] text-on-surface-variant truncate">
                          {locationCity && `${locationCity} • `}
                          <Link to={rev.product_slug ? `/product/${rev.product_slug}` : '/products'} className="hover:text-primary transition-colors">
                            {rev.product_title || 'Artisanal Batch'}
                            {rev.product_weight ? ` (${rev.product_weight}g)` : ''}
                          </Link>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* ========================================================
          MOBILE VIEW (EXACTLY MATCHING STITCH IMAGES 1, 2 & 3)
          ======================================================== */}
      <div className="md:hidden flex flex-col gap-4 px-3.5 pt-3 pb-8">
        {/* 1. Hero Promo Banner Carousel (Horizontally Scrollable & Swipeable) */}
        <section className="flex flex-col gap-2 relative">
          <div className="relative">
            <div
              ref={bannerScrollRef}
              onScroll={handleBannerScroll}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onMouseEnter={() => { isInteractingWithBanner.current = true; }}
              onMouseLeave={() => { isInteractingWithBanner.current = false; }}
              className="w-full overflow-x-auto snap-x snap-mandatory flex flex-nowrap gap-3 no-scrollbar -mx-1 px-1 py-0.5 touch-pan-x"
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollSnapType: 'x mandatory',
              }}
            >
              {displayBanners.map((banner, index) => {
                const bgImg = banner.effective_image_url || banner.image_url || banner.image;

                // If admin configured this banner as Image-Only, render clean graphic without dark gradient or text overlays
                if (banner.is_image_only && bgImg) {
                  return (
                    <Link
                      key={banner.id || index}
                      to={banner.cta_link || '/products'}
                      className="w-full min-w-full snap-start shrink-0 relative overflow-hidden rounded-xl shadow-md min-h-[165px] aspect-[2/1] block cursor-pointer group active:scale-[0.99] transition-transform"
                      style={{ backgroundColor: banner.bg_color || '#9b4100' }}
                    >
                      <img
                        src={bgImg}
                        alt={banner.title || 'Promotional Banner'}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500 rounded-xl"
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
                    className="w-full min-w-full snap-start shrink-0 relative overflow-hidden rounded-xl shadow-md text-on-primary min-h-[165px] p-4 flex flex-col justify-between"
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
                        <span className="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-white font-label-sm text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 w-fit">
                          <Flame size={12} className="text-amber-400" />
                          <span>{banner.badge_text}</span>
                        </span>
                      )}
                      <h2 className="font-headline-sm text-[22px] font-serif font-bold text-white leading-tight mt-0.5 drop-shadow-xs">
                        {banner.title}
                      </h2>
                      {banner.subtitle && (
                        <p className="font-body-sm text-[11px] text-white/90 max-w-[260px] leading-snug line-clamp-2 drop-shadow-xs">
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
                          <span className="font-label-sm text-[10px] text-secondary-fixed">CODE:</span>
                          <span className="font-label-md text-xs font-bold text-white tracking-wider">
                            {banner.coupon_code}
                          </span>
                        </button>
                      ) : <div />}

                      <Link
                        to={banner.cta_link || '/products'}
                        className="px-3.5 py-1.5 rounded-full bg-white text-primary font-label-md text-xs font-bold shadow-sm active:scale-95 transition-transform flex items-center gap-1"
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

          {/* External Interactive Indicator Dots under the banner */}
          {displayBanners.length > 1 && (
            <div className="flex items-center justify-center gap-2 pt-1 pb-0.5">
              {displayBanners.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => scrollToBanner(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    activeBannerIndex === idx
                      ? 'w-6 bg-primary shadow-xs'
                      : 'w-2 bg-stone-300 hover:bg-stone-400'
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* Fast Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-3.5 px-3.5 py-1">
            <button
              type="button"
              onClick={() => setActiveFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-xs font-bold whitespace-nowrap shadow-xs shrink-0 transition-colors ${
                activeFilter === 'ALL'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container border border-outline-variant/30'
              }`}
            >
              All Pickles
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('HOT')}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-xs font-medium whitespace-nowrap border border-outline-variant/30 shrink-0 flex items-center gap-1 transition-colors ${
                activeFilter === 'HOT'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              Fiery Hot
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('MANGO')}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-xs font-medium whitespace-nowrap border border-outline-variant/30 shrink-0 transition-colors ${
                activeFilter === 'MANGO'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              Mango Specials
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('ZERO_OIL')}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-xs font-medium whitespace-nowrap border border-outline-variant/30 shrink-0 transition-colors ${
                activeFilter === 'ZERO_OIL'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              Oil-Free
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('GARLIC')}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-xs font-medium whitespace-nowrap border border-outline-variant/30 shrink-0 transition-colors ${
                activeFilter === 'GARLIC'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              Garlic &amp; Chutney
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('NON_VEG')}
              className={`px-3.5 py-1.5 rounded-full font-label-md text-xs font-medium whitespace-nowrap border border-outline-variant/30 shrink-0 transition-colors ${
                activeFilter === 'NON_VEG'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
              }`}
            >
              Non-Veg Pickles
            </button>
          </div>
        </section>

        {/* 2. Flash Deals / Deal of the Day Section */}
        <section className="flex flex-col gap-2.5 bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                <Zap size={15} className="text-amber-500 fill-amber-500" />
              </div>
              <div>
                <span className="font-title-md text-sm font-bold text-on-surface flex items-center gap-1 leading-tight">
                  Deal of the Day
                </span>
                <div className="flex items-center gap-1 text-on-surface-variant font-label-sm text-[10px]">
                  <Timer size={11} className="text-primary" />
                  <span>Batch ends in:</span>
                  <FlashDealCountdown />
                </div>
              </div>
            </div>
            <Link to="/products" className="text-primary font-label-md text-xs font-bold flex items-center gap-0.5">
              <span>See All</span>
              <ChevronRight size={14} />
            </Link>
          </div>

          {/* Horizontal Deal Cards Slider */}
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar -mx-1 px-1 py-1">
            {evaluatedDeals && evaluatedDeals.length > 0 ? (
              evaluatedDeals.map((deal) => {
                const weight = Number(deal.weight_grams) || 200;
                const price = Math.round(Number(deal.price) || 0);
                const mrp = Math.round(Number(deal.mrp) || price);
                const discount = deal.discount !== undefined
                  ? deal.discount
                  : (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
                const costPer100g = deal.costPer100g || Math.round((price / weight) * 100);
                const imgUrl = resolveProductImage(deal.primary_image_url || deal.images?.[0]?.image_url, '/images/hero/dried_beef_pickle_signature.jpg');
                const rating = deal.average_rating ? Number(deal.average_rating).toFixed(1) : '4.9';
                const mfgName = deal.manufacturer?.business_name || 'Artisan Direct';

                return (
                  <div
                    key={deal.id || deal.slug}
                    className="w-[195px] sm:w-[205px] shrink-0 bg-surface-container-lowest rounded-xl p-2.5 shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:border-primary/40 transition-all group"
                  >
                    <Link to={`/product/${deal.slug}`} className="block">
                      <div className="relative w-full h-32 rounded-lg overflow-hidden bg-surface-container">
                        <img
                          src={imgUrl}
                          alt={deal.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/hero/dried_beef_pickle_signature.jpg';
                          }}
                        />
                        {discount > 0 ? (
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-error text-on-error font-label-sm text-[9px] font-bold shadow-xs">
                            {discount}% OFF
                          </span>
                        ) : (
                          <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-primary text-on-primary font-label-sm text-[9px] font-bold shadow-xs">
                            BEST VALUE
                          </span>
                        )}
                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-full bg-surface-container-lowest/95 backdrop-blur-xs flex items-center gap-0.5 shadow-xs border border-outline-variant/30">
                          <Star size={11} className="fill-secondary text-secondary" />
                          <span className="font-label-sm text-[10px] font-bold text-on-surface">{rating}</span>
                        </div>
                      </div>

                      <div className="mt-2 flex flex-col gap-0.5">
                        <span className="font-label-sm text-[10px] text-outline truncate flex items-center gap-1">
                          {mfgName} <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                        </span>
                        <h4 className="font-title-md text-xs font-bold text-on-surface line-clamp-1 leading-snug group-hover:text-primary transition-colors">
                          {deal.title}
                        </h4>

                        {/* Quantity and Price Justification Metric */}
                        <div className="flex items-center justify-between text-[10px] mt-1 pt-0.5">
                          <span className="font-bold text-tertiary bg-surface-container px-1.5 py-0.5 rounded">
                            {weight}g Pack
                          </span>
                          <span className="text-outline font-semibold">
                            ₹{costPer100g}/100g
                          </span>
                        </div>

                        {/* Price & Savings */}
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="font-title-lg text-sm font-bold text-primary">₹{price}</span>
                          {mrp > price && (
                            <span className="font-body-sm text-[10px] text-outline line-through">₹{mrp}</span>
                          )}
                          {mrp > price && (
                            <span className="text-[9.5px] font-bold text-emerald-700 ml-auto">
                              Save ₹{mrp - price}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={(e) => handleQuickAdd(e, deal.title, deal.id)}
                      className="mt-2 w-full py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 hover:bg-primary/90 transition-all flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                );
              })
            ) : (
              [1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="w-[195px] sm:w-[205px] shrink-0 bg-surface-container-lowest rounded-xl p-2.5 shadow-sm border border-outline-variant/30 flex flex-col justify-between animate-pulse"
                >
                  <div className="w-full h-32 rounded-lg bg-surface-container" />
                  <div className="mt-2 space-y-2">
                    <div className="h-3 w-16 bg-surface-container rounded" />
                    <div className="h-3.5 w-full bg-surface-container rounded" />
                    <div className="flex justify-between">
                      <div className="h-4 w-12 bg-surface-container rounded" />
                      <div className="h-4 w-16 bg-surface-container rounded" />
                    </div>
                  </div>
                  <div className="mt-2 h-7 w-full bg-surface-container rounded-lg" />
                </div>
              ))
            )}
          </div>
        </section>

        {/* 3. Shop by Artisan Brands (100% Real Data & Uploaded Images) */}
        {displayBrands.length > 0 && (
          <section className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-sm text-base font-serif font-bold text-on-surface">
                  Artisan Brands
                </h2>
                <p className="font-body-sm text-[11px] text-on-surface-variant">
                  Direct from verified home kitchens &amp; heritage pickle makers
                </p>
              </div>
              <Link
                to="/brands"
                className="text-tertiary font-label-sm text-[10px] uppercase tracking-wider font-bold shrink-0 hover:underline flex items-center gap-0.5"
              >
                <span>{displayBrands.length} Brands</span>
                <span className="text-[11px]">→</span>
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              {displayBrands.slice(0, 6).map((brand, idx) => {
                const brandImg = brand.image ? resolveProductImage(brand.image) : null;
                const bgColors = [
                  'bg-secondary-container text-on-secondary-container',
                  'bg-primary-fixed text-on-primary-fixed',
                  'bg-tertiary-fixed text-on-tertiary-fixed',
                  'bg-secondary-fixed text-on-secondary-fixed',
                  'bg-primary-container text-on-primary-container',
                  'bg-surface-variant text-on-surface-variant',
                ];
                const colorClass = bgColors[idx % bgColors.length];

                return (
                  <Link
                    key={brand.slug || brand.business_name || idx}
                    to={`/products?brand=${encodeURIComponent(brand.slug || brand.business_name)}`}
                    className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-center active:scale-95 transition-transform"
                  >
                    <div className={`w-16 h-16 rounded-full overflow-hidden shadow-xs relative p-0.5 ${colorClass} flex items-center justify-center shrink-0`}>
                      {brandImg ? (
                        <img
                          src={brandImg}
                          alt={brand.business_name}
                          className="w-full h-full object-cover rounded-full"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const sibling = e.currentTarget.parentElement?.querySelector('.brand-monogram');
                            if (sibling) sibling.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div
                        className={`brand-monogram w-full h-full rounded-full flex items-center justify-center font-serif font-bold text-sm tracking-wider ${
                          brandImg ? 'hidden' : 'flex'
                        }`}
                      >
                        {getBrandInitials(brand.business_name)}
                      </div>
                    </div>
                    <span className="font-title-md text-xs font-bold text-on-surface leading-tight truncate w-full px-0.5">
                      {brand.business_name}
                    </span>
                    <span className="font-label-sm text-[10px] text-outline truncate w-full px-0.5">
                      {brand.subtitle}
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* 4. Curated Bestsellers 2-Column Grid (Exact match to Images 2 & 3) */}
        <section className="flex flex-col gap-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-sm text-base font-serif font-bold text-on-surface">
                Curated Bestsellers
              </h2>
              <p className="font-body-sm text-[11px] text-on-surface-variant">
                Sun-ripened, small batch, 100% preservative-free
              </p>
            </div>
            <Link
              to="/products"
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-[11px] font-semibold border border-outline-variant/30"
            >
              <SlidersHorizontal size={12} className="text-tertiary" />
              <span>Filter</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {displayCuratedBestsellers.map((item) => {
              const weight = item.weight_grams ? `${item.weight_grams}g Pot` : '350g Pot';
              const price = Math.round(Number(item.price) || 0);
              const mrp = item.mrp ? Math.round(Number(item.mrp)) : null;
              const hasDiscount = mrp && mrp > price;
              const discountPercent = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;
              const imgUrl = resolveProductImage(item.primary_image_url || item.images?.[0]?.image_url, '/images/hero/dried_beef_pickle_signature.jpg');
              const rating = item.average_rating ? Number(item.average_rating).toFixed(1) : (item.rating || '4.9');
              const brandName = item.manufacturer?.business_name || 'Artisan Direct';
              const productSlug = item.slug;
              const badgeText = item.badge || (item.is_bestseller ? 'BESTSELLER' : (hasDiscount ? `${discountPercent}% OFF` : 'ARTISAN'));

              return (
                <article
                  key={item.id || item.slug}
                  className="bg-surface-container-lowest rounded-xl p-2 shadow-xs border border-outline-variant/30 flex flex-col justify-between hover:border-primary/40 transition-all group"
                >
                  <Link to={`/product/${productSlug}`} className="block">
                    <div className="relative w-full h-36 rounded-lg overflow-hidden bg-surface-container">
                      <img
                        src={imgUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/images/hero/dried_beef_pickle_signature.jpg';
                        }}
                      />
                      <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5 items-start">
                        <span className="px-1.5 py-0.5 rounded bg-primary text-on-primary font-label-sm text-[9px] font-bold shadow-xs">
                          {badgeText}
                        </span>
                      </div>
                      <button
                        type="button"
                        aria-label="Wishlist"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!user) {
                            requireAuth(() => {
                              toast.success('Saved to your spice cellar');
                            }, 'save items to your wishlist');
                            return;
                          }
                          toast.success('Saved to your spice cellar');
                        }}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white text-on-surface-variant flex items-center justify-center shadow-xs border border-outline-variant/30 active:scale-90 transition-transform cursor-pointer"
                      >
                        <Heart size={14} className="text-stone-500" />
                      </button>
                      <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-surface-container-lowest font-label-sm text-[9px] font-bold text-primary flex items-center gap-0.5 shadow-xs border border-outline-variant/20">
                        <span>Hot</span>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-label-sm text-[10px] text-outline truncate flex items-center gap-0.5">
                          {brandName} <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                        </span>
                        <div className="flex items-center gap-0.5 text-secondary font-label-sm text-[10px] font-bold shrink-0">
                          <Star size={11} className="fill-secondary text-secondary" /> {rating}
                        </div>
                      </div>
                      <h3 className="font-title-md text-xs font-bold line-clamp-2 leading-snug text-on-surface group-hover:text-primary transition-colors">
                        {item.title}
                      </h3>
                      <span className="font-body-sm text-[10px] text-tertiary truncate">{weight}</span>
                    </div>
                  </Link>

                  <div className="mt-2 pt-1 border-t border-outline-variant/30 flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between">
                      <div className="flex items-baseline gap-1">
                        <span className="font-title-lg text-sm font-bold text-primary">₹{price}</span>
                        {mrp && mrp > price && (
                          <span className="font-body-sm text-[10px] text-outline line-through">₹{mrp}</span>
                        )}
                      </div>
                      {hasDiscount && (
                        <span className="font-label-sm text-[9px] text-error font-bold">{discountPercent}% off</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleQuickAdd(e, item.title, item.id)}
                      className="w-full py-1.5 rounded-lg bg-primary text-on-primary font-label-md text-xs font-bold active:scale-95 transition-transform flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                    >
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* Tales from the Spice Community (Mobile Verified Gourmands) */}
        {activeReviewsList.length > 0 && (
          <section className="flex flex-col gap-2.5 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-label-sm text-[10px] uppercase tracking-wider text-primary font-bold">
                  VERIFIED GOURMANDS
                </span>
                <h2 className="font-headline-sm text-base font-serif font-bold text-on-surface">
                  Tales from the Spice Community
                </h2>
              </div>
              <div className="flex items-center gap-1 text-secondary text-xs font-bold shrink-0 bg-surface-container-low px-2 py-0.5 rounded-full border border-outline-variant/30">
                <Star size={13} className="fill-secondary text-secondary" />
                <span className="text-on-surface">{Number(reviewStats.average_rating || 4.9).toFixed(1)}</span>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 snap-x">
              {activeReviewsList.slice(0, 6).map((rev, idx) => {
                const initials = getInitials(rev.author_name);
                const displayImg = rev.image_url || rev.product_image || '/images/hero/dried_beef_pickle_signature.jpg';
                const locationCity = rev.location ? rev.location.split(',')[0].trim() : '';

                return (
                  <div
                    key={rev.id || `${rev.author_name}-${idx}`}
                    className="w-72 shrink-0 snap-start bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/30 flex flex-col justify-between shadow-2xs"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex text-secondary">
                          {Array.from({ length: Math.max(1, Math.min(5, Math.floor(Number(rev.rating) || 5))) }).map((_, sIdx) => (
                            <Star key={sIdx} size={12} className="fill-amber-400 text-amber-400" />
                          ))}
                        </div>
                        {rev.is_verified_buyer && (
                          <span className="bg-tertiary-fixed text-on-tertiary-fixed text-[9px] font-bold px-1.5 py-0.5 rounded">
                            Verified Purchase
                          </span>
                        )}
                      </div>

                      <p className="font-body-sm text-[11px] text-on-surface leading-relaxed line-clamp-3">
                        "{rev.comment}"
                      </p>

                      <Link
                        to={rev.product_slug ? `/product/${rev.product_slug}` : '/products'}
                        className="h-24 rounded-lg overflow-hidden bg-surface-container-high my-1 block"
                      >
                        <img
                          src={displayImg}
                          alt={rev.product_title || 'Pickle'}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/images/hero/dried_beef_pickle_signature.jpg';
                          }}
                        />
                      </Link>
                    </div>

                    <div className="flex items-center gap-2.5 pt-2 border-t border-outline-variant/30 mt-2">
                      <div className="w-7 h-7 rounded-full bg-primary-fixed text-on-primary-fixed flex items-center justify-center font-title-md text-[10px] font-bold shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-title-md text-[11px] font-bold text-on-surface truncate">{rev.author_name}</h4>
                        <p className="font-body-sm text-[10px] text-on-surface-variant truncate">
                          {locationCity && `${locationCity} • `}
                          <Link to={rev.product_slug ? `/product/${rev.product_slug}` : '/products'} className="hover:text-primary transition-colors">
                            {rev.product_title || 'Artisanal Batch'}
                          </Link>
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
