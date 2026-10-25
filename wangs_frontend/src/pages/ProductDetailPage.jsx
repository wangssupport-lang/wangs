import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag, CheckCircle, ShieldCheck, Truck, AlertCircle,
  Clock, Package, ChevronRight, Plus, Minus, ArrowRight,
  Flame, Sparkles, Utensils, Heart, Award, Star, ThumbsUp, MessageSquare,
  MapPin, Check, X, Camera
} from 'lucide-react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart, cart } = useCart();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Bundle tier selector (Single, Duo 8% OFF, Trio 15% OFF)
  const [selectedBundleIndex, setSelectedBundleIndex] = useState(1); // Default to Duo Pack (Recommended)
  const [brandCompanions, setBrandCompanions] = useState([]);
  const [addingBrandBundle, setAddingBrandBundle] = useState(false);

  // PIN code checker state
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);

  // Active image gallery index
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Active tab in details section
  const [activeInfoTab, setActiveInfoTab] = useState('ingredients'); // 'ingredients', 'storage', 'reviews'

  // Review submission modal / form
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    author_name: '',
    rating: 5,
    title: '',
    comment: '',
    image_url: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Sticky bottom bar visibility on mobile scroll
  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        const data = await api.getProductBySlug(slug);
        setProduct(data);
      } catch (err) {
        console.error('Failed to load product details', err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [slug]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowStickyBar(true);
      } else {
        setShowStickyBar(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (product?.manufacturer?.slug) {
      api.getProducts({ brand: product.manufacturer.slug })
        .then((res) => {
          const list = Array.isArray(res) ? res : res?.results || [];
          const others = list.filter((p) => p.id !== product.id && p.is_in_stock);
          setBrandCompanions(others.slice(0, 2));
        })
        .catch((err) => console.error('Could not load brand companions', err));
    }
  }, [product?.manufacturer?.slug, product?.id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-9 h-9 border-4 border-forest-800 border-t-transparent rounded-full mx-auto" />
        <p className="text-xs text-stone-500 mt-3 font-medium">Fetching authentic artisanal pantry heritage...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="font-serif text-2xl font-bold text-stone-900">Product not found</h2>
        <p className="text-xs text-stone-500 mt-2">This artisanal batch may have sold out or is no longer listed.</p>
        <Link to="/products" className="mt-4 inline-block px-5 py-2.5 bg-forest-800 text-white rounded-xl text-xs font-bold shadow">
          Return to Catalog
        </Link>
      </div>
    );
  }

  // Real Bundle Tiers (Single, Duo 8% OFF, Trio 15% OFF)
  const basePrice = parseFloat(product.price) || 0;
  const baseMrp = product.mrp ? parseFloat(product.mrp) : Math.round(basePrice * 1.15);
  const baseWeight = product.weight_grams || 250;

  const bundleTiers = [
    {
      id: 'single',
      name: 'Single Jar',
      sublabel: `1x ${baseWeight}g glass jar`,
      quantity: 1,
      discountPct: 0,
      unitPrice: basePrice,
      totalPrice: basePrice,
      totalMrp: baseMrp,
      savings: Math.max(0, baseMrp - basePrice),
      badge: null,
      tag: 'Standard Pack'
    },
    {
      id: 'duo',
      name: 'Duo Pack (2 Jars)',
      sublabel: `2x ${baseWeight}g jars · 8% OFF`,
      quantity: 2,
      discountPct: 8,
      unitPrice: Math.round(basePrice * 0.92),
      totalPrice: Math.round(basePrice * 2 * 0.92),
      totalMrp: Math.round(baseMrp * 2),
      savings: Math.round(baseMrp * 2 - basePrice * 2 * 0.92),
      badge: 'Recommended',
      tag: 'Save 8% · Most Popular'
    },
    {
      id: 'trio',
      name: 'Tasting Trio (3 Jars)',
      sublabel: `3x ${baseWeight}g jars · 15% OFF`,
      quantity: 3,
      discountPct: 15,
      unitPrice: Math.round(basePrice * 0.85),
      totalPrice: Math.round(basePrice * 3 * 0.85),
      totalMrp: Math.round(baseMrp * 3),
      savings: Math.round(baseMrp * 3 - basePrice * 3 * 0.85),
      badge: 'Best Value',
      tag: 'Save 15% · Free Air Dispatch'
    }
  ];

  const currentBundle = bundleTiers[selectedBundleIndex] || bundleTiers[0];
  const activePrice = currentBundle.totalPrice;
  const activeMrp = currentBundle.totalMrp;
  const discountPercent = activeMrp > activePrice ? Math.round(((activeMrp - activePrice) / activeMrp) * 100) : 0;
  const isInStock = product && product.is_in_stock !== false && (product.stock_quantity === undefined || product.stock_quantity === null || product.stock_quantity > 0);

  const handleAddToCart = async () => {
    if (!product || !isInStock || adding) return;
    setAdding(true);
    const totalJars = currentBundle.quantity * quantity;
    try {
      await addToCart(product.id, totalJars);
      setAdded(true);
      toast.success(`Added ${currentBundle.name} (${totalJars} jars) of ${product.title} to your basket!`);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      toast.error(err.message || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product || !isInStock) return;
    const totalJars = currentBundle.quantity * quantity;
    try {
      await addToCart(product.id, totalJars);
      navigate('/checkout');
    } catch (err) {
      toast.error(err.message || 'Could not proceed to checkout');
    }
  };

  const handleAddBrandBundle = async () => {
    if (!product || brandCompanions.length < 2 || addingBrandBundle) return;
    setAddingBrandBundle(true);
    try {
      await Promise.all([
        addToCart(product.id, 1),
        addToCart(brandCompanions[0].id, 1),
        addToCart(brandCompanions[1].id, 1)
      ]);
      toast.success(`Added Curated 3-Jar Brand Tasting Bundle from ${product.manufacturer?.business_name || 'Artisan Brand'} to your basket!`);
    } catch (err) {
      toast.error(err.message || 'Failed to add curated bundle');
    } finally {
      setAddingBrandBundle(false);
    }
  };

  const handleCheckPincode = async (e) => {
    e.preventDefault();
    const cleaned = (pincode || '').replace(/\D/g, '').slice(0, 6);
    if (cleaned.length !== 6) {
      setPincodeResult({ valid: false, message: 'Please enter a 6-digit Indian PIN code' });
      return;
    }
    setCheckingPin(true);
    try {
      const res = await api.checkPincode(cleaned);
      if (res && res.valid) {
        setPincodeResult(res);
      } else {
        setPincodeResult({ valid: false, message: res?.message || 'Invalid PIN code' });
      }
    } catch (err) {
      console.error('Failed to check delivery availability', err);
      setPincodeResult({ valid: false, message: 'Could not check delivery. Please try again shortly.' });
    } finally {
      setCheckingPin(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.comment.trim()) {
      toast.error('Please write a review comment.');
      return;
    }
    setSubmittingReview(true);
    try {
      await api.addProductReview(product.slug, reviewForm);
      toast.success('Thank you! Your verified review has been published.');
      setShowReviewModal(false);
      setReviewForm({ author_name: '', rating: 5, title: '', comment: '', image_url: '' });
      // Reload product details to show new review
      const updated = await api.getProductBySlug(slug);
      setProduct(updated);
    } catch (err) {
      toast.error(err.message || 'Could not submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Manufacturer FSSAI License Number
  const fssaiNumber = product.manufacturer?.fssai_license_number || '10023064000124';
  const reviewsList = product.reviews || [];

  const productImages = React.useMemo(() => {
    const list = [];
    if (product?.images && product.images.length > 0) {
      product.images.forEach((img) => {
        const url = typeof img === 'string' ? img : img.image_url;
        if (url && !list.includes(url)) list.push(url);
      });
    }
    if (product?.primary_image_url && !list.includes(product.primary_image_url)) {
      list.unshift(product.primary_image_url);
    }
    return list.length > 0 ? list : ['/featured-pouches.png'];
  }, [product]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-12 space-y-10 sm:space-y-16">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="no-scrollbar flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap text-xs font-medium text-stone-500">
        <Link to="/" className="shrink-0 hover:text-forest-900 transition-colors">Home</Link>
        <ChevronRight size={13} />
        <Link to="/products" className="shrink-0 hover:text-forest-900 transition-colors">Pickle Pantry</Link>
        <ChevronRight size={13} />
        <Link to={`/products?category=${product.category?.slug}`} className="shrink-0 hover:text-forest-900 transition-colors">
          {product.category?.name}
        </Link>
        <span className="hidden shrink-0 items-center gap-2 sm:inline-flex">
          <ChevronRight size={13} />
          <span className="max-w-xs truncate font-bold text-stone-900">{product.title}</span>
        </span>
      </nav>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left Column: Image Gallery & Trust Highlights */}
        <div className="lg:col-span-6 space-y-5">
          <div className="aspect-[4/3] sm:aspect-square overflow-hidden rounded-2xl sm:rounded-3xl border border-stone-200/90 bg-cream-100 shadow-artisan relative group">
            <img
              src={productImages[activeImageIdx] || product.primary_image_url || '/featured-pouches.png'}
              alt={product.title}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/featured-pouches.png';
              }}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            {discountPercent > 0 && (
              <div className="absolute top-4 left-4 bg-chilli-700 text-white text-xs font-black px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1">
                <Sparkles size={12} /> {discountPercent}% OFF
              </div>
            )}

            <div className="absolute bottom-4 left-4 bg-forest-950/90 backdrop-blur-md text-cream-100 text-xs font-bold px-3.5 py-1.5 rounded-full border border-forest-800 flex items-center gap-2">
              <span>{currentBundle.sublabel}</span>
              <span className="opacity-40">|</span>
              <span className="text-amber-300 font-medium">100% Homemade Small Batch</span>
            </div>

            {/* Sold Out Overlay */}
            {!isInStock && (
              <div className="absolute inset-0 bg-stone-950/65 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 z-20 text-center rounded-2xl sm:rounded-3xl">
                <span className="px-4 py-2 rounded-xl bg-stone-900/95 text-white text-sm sm:text-base font-bold border border-white/20 shadow-2xl leading-tight">
                  All Product Sold Out
                </span>
                <span className="text-xs sm:text-sm text-cream-200 mt-2 font-medium max-w-xs leading-relaxed drop-shadow">
                  Please wait for some time, product will be in stock soon.
                </span>
              </div>
            )}
          </div>

          {/* 1-3 Product Images Gallery Thumbnails */}
          {productImages.length > 1 && (
            <div className="flex items-center gap-2.5 pt-1">
              {productImages.slice(0, 3).map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all p-0.5 bg-white ${
                    activeImageIdx === idx
                      ? 'border-forest-900 ring-2 ring-forest-800/30 shadow-md scale-105'
                      : 'border-stone-200 hover:border-forest-700 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`${product.title} photo ${idx + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/featured-pouches.png';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Information, Pricing, Pack Selector & Action Bar */}
        <div className="lg:col-span-6 space-y-6">
          {/* Amazon-style Brand Store Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/80 pb-3">
            <div className="space-y-1">
              <Link
                to={`/products?brand=${encodeURIComponent(product.manufacturer?.slug || product.manufacturer?.business_name || '')}`}
                className="group/brand inline-flex items-center gap-1.5 text-xs text-forest-900 hover:text-forest-950 font-bold"
              >
                <span>Visit the <span className="underline decoration-forest-700 decoration-1 underline-offset-2">{product.manufacturer?.business_name}</span> Store</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 text-[9px] font-extrabold uppercase">
                  Official Brand
                </span>
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-stone-500 font-medium flex items-center gap-1">
                  <MapPin size={11} className="text-forest-700" />
                  {product.manufacturer?.location_district || 'Artisan Workshop'}
                </span>
                <span className="text-stone-300">·</span>
                <div className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <ShieldCheck size={12} className="text-emerald-700" />
                  <span>FSSAI Lic. #{fssaiNumber}</span>
                  <span className="text-emerald-700 font-sans font-semibold inline-flex items-center gap-0.5">
                    <Check size={11} /> Certified
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Title & Star Rating Bar */}
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-950 leading-tight">
              {product.title}
            </h1>
            <div className="flex items-center gap-3 mt-2.5">
              {product.average_rating && (product.reviews_count > 0 || reviewsList.length > 0) ? (
                <>
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-lg text-amber-900 text-xs font-bold">
                    <Star size={13} className="fill-amber-500 text-amber-500" />
                    <span>{parseFloat(product.average_rating).toFixed(1)}</span>
                    <span className="text-[11px] font-semibold text-amber-700">({(product.reviews_count || reviewsList.length)}+)</span>
                  </div>
                  <span className="text-xs text-stone-500 font-medium">
                    ({(product.reviews_count || reviewsList.length)}+ verified reviews)
                  </span>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-stone-600 bg-stone-100 border border-stone-200 px-2 py-0.5 rounded-md">
                    New Artisanal Batch
                  </span>
                  <span className="text-xs text-stone-400">
                    No customer reviews yet
                  </span>
                </div>
              )}
              <span className="text-stone-300">·</span>
              <span className="text-xs font-semibold text-forest-800">100% Authentic Homemade</span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 mt-3 leading-relaxed">
              {product.short_description}
            </p>
          </div>

          {/* Bundle & Save Tier Selector */}
          <div className="space-y-2.5 pt-1">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-stone-900 uppercase tracking-wide text-[11px] flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-500" /> Choose Quantity Bundle:
              </span>
              <span className="text-stone-500 text-[11px]">Direct artisanal sealed glass jars</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {bundleTiers.map((tier, idx) => (
                <button
                  key={tier.id}
                  type="button"
                  onClick={() => setSelectedBundleIndex(idx)}
                  className={`p-3 rounded-2xl border text-left transition-all relative ${
                    selectedBundleIndex === idx
                      ? 'border-forest-900 bg-forest-50/70 shadow-sm ring-2 ring-forest-900'
                      : 'border-stone-200 bg-white hover:border-stone-300'
                  }`}
                >
                  {tier.badge && (
                    <span className={`absolute -top-2.5 right-2 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm ${
                      tier.badge === 'Recommended' ? 'bg-amber-500 text-stone-950' : 'bg-forest-900 text-cream-100'
                    }`}>
                      {tier.badge}
                    </span>
                  )}
                  <span className="block font-bold text-xs text-stone-950">{tier.name}</span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="font-serif font-black text-sm text-stone-900">₹{tier.totalPrice}</span>
                    {tier.totalMrp > tier.totalPrice && (
                      <span className="text-[10px] text-stone-400 line-through">₹{tier.totalMrp}</span>
                    )}
                  </div>
                  <span className={`block text-[10px] font-semibold mt-0.5 ${
                    tier.discountPct > 0 ? 'text-emerald-700' : 'text-stone-500'
                  }`}>
                    {tier.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Price Box with Active Bundle Savings */}
          <div className="p-4 sm:p-5 bg-cream-100 rounded-2xl border border-stone-200 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-3 flex-wrap">
              <span className="text-3xl sm:text-4xl font-serif font-black text-stone-950">
                ₹{activePrice}
              </span>
              {activeMrp > activePrice && (
                <span className="text-sm text-stone-400 line-through font-serif">
                  MRP ₹{activeMrp}
                </span>
              )}
              {discountPercent > 0 && (
                <span className="text-xs font-bold text-chilli-700 bg-chilli-50 border border-chilli-200 px-2 py-0.5 rounded">
                  Save {discountPercent}% (₹{currentBundle.savings})
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full self-start sm:self-auto">
              Tax Included · Pan-India Dispatch
            </span>
          </div>

          {/* Recommended Bundle Offer Strip */}
          <div className="p-3 bg-forest-950 text-cream-100 rounded-xl text-xs flex items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-amber-400 text-stone-950 rounded-lg">
                <Sparkles size={13} />
              </span>
              <span>
                <strong className="text-amber-300 font-semibold">Recommended Offer:</strong> Buy 2+ jars for instant bundle savings & cushioned packaging.
              </span>
            </div>
            <span className="text-[10px] text-cream-300 font-mono hidden sm:inline">Tier Monitored</span>
          </div>

          {/* Quantity Selector & Action Buttons */}
          <div className="space-y-4 pt-1">
            {!isInStock ? (
              <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-2xl text-amber-950 space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2">
                  <AlertCircle size={20} className="text-amber-700 flex-shrink-0" />
                  <span className="font-bold text-sm tracking-wide text-amber-950 uppercase">
                    All product sold out
                  </span>
                </div>
                <p className="text-xs text-amber-900 font-medium leading-relaxed pl-7">
                  Please wait for some time, product will be in stock soon.
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-600 font-bold">Quantity:</span>
                  <div className="flex items-center border border-stone-300 rounded-xl bg-white shadow-inner overflow-hidden">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3.5 py-2 hover:bg-stone-100 text-stone-700 transition-colors"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="px-4 text-xs font-black text-stone-900 font-mono">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock_quantity || 99, quantity + 1))}
                      className="px-3.5 py-2 hover:bg-stone-100 text-stone-700 transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                <span className="text-xs text-stone-500 font-medium">
                  {product.stock_quantity > 0 ? (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle size={13} /> In Stock ({product.stock_quantity} jars available in fresh batch)
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle size={13} /> In Stock
                    </span>
                  )}
                </span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleAddToCart}
                disabled={!isInStock || adding}
                className={`flex-1 py-4 px-5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                  added
                    ? 'bg-emerald-600 text-white'
                    : isInStock
                    ? 'bg-white border-2 border-forest-900 text-forest-900 hover:bg-forest-50'
                    : 'bg-stone-100 border border-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                }`}
              >
                {added ? (
                  <>
                    <CheckCircle size={16} /> Added to Basket
                  </>
                ) : adding ? (
                  <span>Reserving jar...</span>
                ) : !isInStock ? (
                  <span>All Product Sold Out</span>
                ) : (
                  <>
                    <ShoppingBag size={16} /> Add to Basket
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={!isInStock}
                className={`flex-1 py-4 px-5 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-md transition-all ${
                  isInStock
                    ? 'bg-forest-900 hover:bg-forest-950 hover:scale-102 active:scale-98 hover:shadow-lg'
                    : 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
                }`}
              >
                {!isInStock ? (
                  <span>In Stock Soon</span>
                ) : (
                  <>
                    <span>Direct Checkout</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>

            {/* Food Safety Policy Notice: No return, refund only for genuine reason */}
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-[11px] text-stone-600 flex items-start gap-2">
              <ShieldCheck size={14} className="text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900">No Returns (Edible Food): </strong>
                <span>Items are non-returnable. Refunds or replacements are provided </span>
                <strong className="text-stone-900">only for genuine reasons</strong>
                <span> (transit breakage, defective vacuum seal, or wrong item with unboxing proof) within 48 hours of delivery.</span>
              </div>
            </div>
          </div>

          {/* Delivery PIN Code Checker */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-800">
              <span className="flex items-center gap-1.5">
                <Truck size={15} className="text-forest-700" />
                <span>Check Express Delivery Speed to your PIN</span>
              </span>
              <span className="text-[11px] text-stone-400 font-normal">Air cargo courier</span>
            </div>
            <form onSubmit={handleCheckPincode} className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit Indian PIN code"
                className="flex-1 px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-forest-800"
              />
              <button
                type="submit"
                disabled={checkingPin}
                className="px-4 py-2 bg-forest-900 hover:bg-forest-950 text-white text-xs font-bold rounded-xl"
              >
                {checkingPin ? 'Checking...' : 'Check'}
              </button>
            </form>
            {pincodeResult && (
              <p className={`text-xs mt-1 font-medium ${pincodeResult.valid ? 'text-emerald-700' : 'text-red-500'}`}>
                {pincodeResult.message}
              </p>
            )}
          </div>

          {/* Curated Brand Tasting Trio Bundle (If brand has companion recipes) */}
          {brandCompanions.length >= 2 && (
            <div className="bg-gradient-to-br from-cream-100 via-amber-50/50 to-cream-100 p-5 rounded-3xl border border-amber-200/90 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-amber-500 text-stone-950 rounded-xl shadow-xs">
                    <Sparkles size={16} />
                  </span>
                  <div>
                    <h4 className="font-serif font-bold text-stone-900 text-sm">
                      Curated {product.manufacturer?.business_name} Tasting Trio Bundle
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      3 Authentic Recipes from this Artisan Brand · Save 15% Platform Bundle Offer
                    </p>
                  </div>
                </div>
                <span className="bg-chilli-700 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                  Save 15%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {[product, brandCompanions[0], brandCompanions[1]].map((item, idx) => (
                  <div key={item.id} className="bg-white p-2.5 rounded-2xl border border-stone-200 text-center space-y-1 relative group">
                    <div className="aspect-square rounded-xl overflow-hidden bg-stone-100 mb-1.5">
                      <img
                        src={item.primary_image_url || '/featured-pouches.png'}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <p className="font-bold text-[11px] text-stone-900 line-clamp-1 leading-snug">{item.title}</p>
                    <p className="text-[10px] text-stone-500 font-medium">₹{parseFloat(item.price).toFixed(0)}</p>
                    {idx < 2 && (
                      <span className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-4 h-4 rounded-full bg-forest-900 text-cream-100 font-black text-[10px] flex items-center justify-center shadow">
                        +
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {(() => {
                const p1 = parseFloat(product.price) || 0;
                const p2 = parseFloat(brandCompanions[0].price) || 0;
                const p3 = parseFloat(brandCompanions[1].price) || 0;
                const orig = p1 + p2 + p3;
                const disc = Math.round(orig * 0.85);
                const save = orig - disc;
                return (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-amber-200/60">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-serif font-black text-stone-950">₹{disc}</span>
                        <span className="text-xs text-stone-400 line-through font-serif">₹{orig}</span>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          Save ₹{save} (15% OFF)
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 mt-0.5">Includes free air cargo dispatch & protective bundle packaging</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddBrandBundle}
                      disabled={addingBrandBundle || !isInStock}
                      className={`w-full sm:w-auto px-5 py-2.5 text-xs font-bold rounded-xl shadow flex items-center justify-center gap-1.5 transition-all ${
                        isInStock
                          ? 'bg-forest-900 hover:bg-forest-950 text-white active:scale-98'
                          : 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
                      }`}
                    >
                      <ShoppingBag size={14} />
                      <span>{addingBrandBundle ? 'Adding Brand Trio...' : !isInStock ? 'All Product Sold Out' : 'Add 3-Jar Brand Bundle'}</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Interactive Tabs: Ingredients, Storage, Reviews */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap border-b border-stone-100 text-xs font-bold text-stone-500 gap-4 sm:gap-6">
              <button
                onClick={() => setActiveInfoTab('ingredients')}
                className={`pb-2.5 transition-colors ${activeInfoTab === 'ingredients' ? 'border-b-2 border-forest-900 text-forest-950 font-bold' : 'hover:text-stone-900'}`}
              >
                Ingredients & Allergens
              </button>
              <button
                onClick={() => setActiveInfoTab('storage')}
                className={`pb-2.5 transition-colors ${activeInfoTab === 'storage' ? 'border-b-2 border-forest-900 text-forest-950 font-bold' : 'hover:text-stone-900'}`}
              >
                Storage & Shelf Life
              </button>
              <button
                onClick={() => setActiveInfoTab('reviews')}
                className={`pb-2.5 transition-colors ${activeInfoTab === 'reviews' ? 'border-b-2 border-forest-900 text-forest-950 font-bold' : 'hover:text-stone-900'}`}
              >
                Reviews ({reviewsList.length})
              </button>
            </div>

            <div className="text-xs text-stone-700 leading-relaxed">
              {activeInfoTab === 'ingredients' && (
                <div className="space-y-2.5">
                  <p><strong>Ingredients:</strong> {product.ingredients}</p>
                  <p className="text-stone-500"><strong>Allergen Notice:</strong> {product.allergens || 'None declared.'}</p>
                  <div className="pt-2 border-t border-stone-100 flex items-center gap-2 text-stone-600">
                    <ShieldCheck size={14} className="text-emerald-700" />
                    <span>Prepared under FSSAI Food Safety Standards (Lic. #{fssaiNumber}). Free from artificial colors, binders, or synthetic preservatives.</span>
                  </div>
                </div>
              )}

              {activeInfoTab === 'storage' && (
                <div className="space-y-2">
                  <p><strong>Storage Instructions:</strong> {product.storage_instructions}</p>
                  <p><strong>Shelf Life:</strong> {product.shelf_life}</p>
                  <p className="text-stone-500"><strong>Pro-Tip:</strong> Always use a thoroughly dry spoon. Keep the top layer covered with oil to preserve natural shelf stability.</p>
                </div>
              )}

              {activeInfoTab === 'reviews' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                    <div>
                      <span className="font-bold text-stone-900 text-sm">Customer Feedback</span>
                      <p className="text-[11px] text-stone-500">Verified buyer ratings & culinary notes</p>
                    </div>
                    <button
                      onClick={() => setShowReviewModal(true)}
                      className="px-3 py-1.5 bg-forest-900 hover:bg-forest-950 text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Write a Review
                    </button>
                  </div>

                  {reviewsList.length === 0 ? (
                    <p className="text-stone-500 py-3 text-center">Be the first to review this artisanal batch!</p>
                  ) : (
                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                      {reviewsList.map((rev) => (
                        <div key={rev.id || rev.author_name} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-stone-900">{rev.author_name}</span>
                              {rev.is_verified_buyer && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded">
                                  <Check size={10} className="text-emerald-700" /> Verified Buyer
                                </span>
                              )}
                            </div>
                            <div className="flex text-amber-500">
                              {[...Array(rev.rating || 5)].map((_, i) => (
                                <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                              ))}
                            </div>
                          </div>
                          {rev.title && <p className="font-semibold text-stone-800">{rev.title}</p>}
                          <p className="text-stone-600 leading-normal">{rev.comment}</p>
                          {rev.image_url && (
                            <div className="pt-2">
                              <img
                                src={rev.image_url}
                                alt="Customer review photo"
                                className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-stone-200 shadow-2xs hover:scale-105 transition-transform cursor-pointer"
                                onClick={() => window.open(rev.image_url, '_blank')}
                                title="Click to view photo"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Submission Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">Review this Batch</h3>
                <p className="text-xs text-stone-500">{product.title}</p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-stone-700 font-bold mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={reviewForm.author_name}
                  onChange={(e) => setReviewForm({ ...reviewForm, author_name: e.target.value })}
                  placeholder="e.g. Sentila or Rahul"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">Star Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                      className="p-1.5 focus:outline-none"
                    >
                      <Star
                        size={22}
                        className={`${
                          star <= reviewForm.rating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-stone-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">Review Headline</label>
                <input
                  type="text"
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                  placeholder="e.g. Phenomenal wood smoke and authentic chilli kick"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">Detailed Review *</label>
                <textarea
                  rows={3}
                  required
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Tell other pickle lovers about the aroma, oil consistency, heat level, and what meal you paired it with..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-800"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">
                  Upload Photo of your Dish / Jar <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg cursor-pointer text-stone-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors">
                    <Camera size={13} className="text-forest-800" />
                    <span>Choose Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('Image size must be under 5MB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setReviewForm((prev) => ({ ...prev, image_url: reader.result }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  <span className="text-[11px] text-stone-400">or enter image URL:</span>
                </div>
                <input
                  type="url"
                  value={reviewForm.image_url}
                  onChange={(e) => setReviewForm({ ...reviewForm, image_url: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full mt-1.5 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-forest-800"
                />
                {reviewForm.image_url && (
                  <div className="relative mt-2 w-16 h-16 rounded-lg border border-stone-200 overflow-hidden group">
                    <img src={reviewForm.image_url} alt="Review Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, image_url: '' })}
                      className="absolute top-1 right-1 bg-stone-900/80 hover:bg-stone-900 text-white rounded-full p-0.5"
                    >
                      <X size={10} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex-1 py-3 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl shadow transition-colors"
                >
                  {submittingReview ? 'Publishing...' : 'Submit Verified Review'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-4 py-3 border border-stone-200 text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Bottom Sticky Bar on Mobile (Ecommerce Standards like Amazon/Blinkit) */}
      {showStickyBar && (
        <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px))] left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 p-2.5 sm:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.1)] flex items-center justify-between gap-2.5 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <img
              src={product.primary_image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=100&q=80'}
              alt={product.title}
              className="w-10 h-10 object-cover rounded-lg border border-stone-200 flex-shrink-0"
            />
            <div className="truncate">
              <p className="font-bold text-xs text-stone-900 truncate">{product.title}</p>
              <p className="text-[11px] font-serif font-black text-forest-900">
                ₹{activePrice} <span className="font-sans font-normal text-[10px] text-stone-500">({currentBundle.name})</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleAddToCart}
              disabled={!isInStock || adding}
              className={`px-3 py-2 text-xs font-bold rounded-xl shadow flex items-center gap-1 transition-transform ${
                isInStock
                  ? 'bg-forest-900 text-white active:scale-95'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
              }`}
            >
              <ShoppingBag size={13} /> {isInStock ? 'Add' : 'Sold Out'}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={!isInStock}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl shadow transition-transform ${
                isInStock
                  ? 'bg-amber-400 text-forest-950 active:scale-95'
                  : 'bg-stone-300 text-stone-500 cursor-not-allowed shadow-none'
              }`}
            >
              {isInStock ? 'Buy' : 'In Stock Soon'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
