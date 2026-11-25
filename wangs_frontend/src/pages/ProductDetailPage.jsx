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
import { PickleLoadingScreen } from '../components/PickleCharacterIllustration';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { resolveProductImage } from '../utils/image';
import ProductCard from '../components/ProductCard';
import SeoHead from '../components/SeoHead';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { user, requireAuth } = useAuth();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('250 g');
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Recommendations
  const [recommendations, setRecommendations] = useState([]);

  // Active thumbnail index
  const [activeThumbIdx, setActiveThumbIdx] = useState(0);

  // Reviews modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    author_name: '',
    location: '',
    rating: 5,
    title: '',
    comment: '',
    image_url: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      setImageError(false);
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
    // Load recommendations
    api.getProducts({ is_active: true })
      .then((res) => {
        const list = Array.isArray(res) ? res : res?.results || [];
        const others = list.filter((p) => p.slug !== slug);
        setRecommendations(others.slice(0, 3));
      })
      .catch((err) => console.error('Could not load recommendations', err));
  }, [slug]);

  if (loading) {
    return <PickleLoadingScreen minHeight="min-h-[60vh]" message="Loading jar details..." />;
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-stone-900">Product not found</h2>
        <p className="text-stone-600 text-sm">The artisanal batch you are looking for may have concluded.</p>
        <Link
          to="/"
          className="inline-block px-6 py-2.5 bg-[#ab331c] text-white rounded-full text-xs font-semibold hover:bg-[#962c17] transition-colors"
        >
          Return to Marketplace
        </Link>
      </div>
    );
  }

  const inStock = product.is_in_stock !== false && (product.stock_quantity === undefined || product.stock_quantity > 0);

  // Category & Styling resolution
  const categoryKey = (product.category?.slug || product.category?.name || product.title || '').toLowerCase();
  
  let pastelBg = 'bg-[#fde8e8]'; // Default rose
  let jarColor = '#b93822';
  let defaultTag = 'Small batch';

  if (categoryKey.includes('chilli') || categoryKey.includes('hot') || categoryKey.includes('bhoot') || categoryKey.includes('raja')) {
    pastelBg = 'bg-[#fde8e8]';
    jarColor = '#b93822';
    defaultTag = 'Very hot · Small batch';
  } else if (categoryKey.includes('bamboo') || categoryKey.includes('veg') || categoryKey.includes('green')) {
    pastelBg = 'bg-[#e2ede2]';
    jarColor = '#496e4c';
    defaultTag = 'Fermented · Small batch';
  } else if (categoryKey.includes('pork') || categoryKey.includes('meat') || categoryKey.includes('smoked') || categoryKey.includes('beef') || categoryKey.includes('chicken')) {
    pastelBg = 'bg-[#f7ebd2]';
    jarColor = '#c87820';
    defaultTag = 'Smoked · Small batch';
  } else if (categoryKey.includes('axone') || categoryKey.includes('ferment') || categoryKey.includes('soybean')) {
    pastelBg = 'bg-[#ede6dc]';
    jarColor = '#7a4e32';
    defaultTag = 'Fermented · Small batch';
  }

  const basePrice = parseFloat(product.price || 299);
  const displayPrice = selectedSize === '500 g' ? Math.round(basePrice * 1.85) : basePrice;

  const makerName = product.manufacturer?.business_name || product.manufacturer?.name || 'Apeno Kikon';
  const village = product.manufacturer?.location_district || 'Khonoma, Nagaland';
  const rating = product.average_rating ? parseFloat(product.average_rating).toFixed(1) : '4.9';
  const reviewsCount = product.reviews_count || product.reviews?.length || 18;

  const handleAddToCart = async () => {
    if (!inStock || adding) return;

    if (!user) {
      requireAuth(async () => {
        setAdding(true);
        try {
          await addToCart(product.id, quantity);
          setAdded(true);
          toast.success(`Added ${quantity} jar(s) of ${product.title} to cart`);
          setTimeout(() => setAdded(false), 1800);
        } catch (err) {
          toast.error(err.message || 'Could not add to cart');
        } finally {
          setAdding(false);
        }
      }, 'keep items in your cart');
      return;
    }

    setAdding(true);
    try {
      await addToCart(product.id, quantity);
      setAdded(true);
      toast.success(`Added ${quantity} jar(s) of ${product.title} to cart`);
      setTimeout(() => setAdded(false), 1800);
    } catch (err) {
      toast.error(err.message || 'Could not add to cart');
    } finally {
      setAdding(false);
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
      setReviewForm({ author_name: '', location: '', rating: 5, title: '', comment: '', image_url: '' });
      const updated = await api.getProductBySlug(slug);
      setProduct(updated);
    } catch (err) {
      toast.error(err.message || 'Could not submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const reviewsList = product.reviews || [];
  const rawDescription = (product.description || '').replace(/\s+/g, ' ').trim();
  const seoDescription = rawDescription
    ? (rawDescription.length > 155 ? `${rawDescription.slice(0, 152)}...` : rawDescription)
    : `Buy ${product.title} online at Wangs. Authentic regional pickle and food product from independent makers.`;
  const productImageRaw = product.primary_image_url || product.images?.[0]?.image_url || product.image_url || '';
  const seoImage = productImageRaw ? resolveProductImage(productImageRaw) : undefined;
  const canonicalProductUrl = `https://wangs.in/product/${product.slug || slug}`;
  const numericPrice = Number(product.selling_price ?? product.price ?? 0);

  const productStructuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://wangs.in/' },
          { '@type': 'ListItem', position: 2, name: 'Pickles', item: 'https://wangs.in/products' },
          { '@type': 'ListItem', position: 3, name: product.title, item: canonicalProductUrl },
        ],
      },
      {
        '@type': 'Product',
        name: product.title,
        description: seoDescription,
        sku: product.slug || slug,
        ...(seoImage ? { image: [seoImage] } : {}),
        ...(product.manufacturer?.business_name
          ? { brand: { '@type': 'Brand', name: product.manufacturer.business_name } }
          : {}),
        ...(numericPrice > 0
          ? {
              offers: {
                '@type': 'Offer',
                url: canonicalProductUrl,
                priceCurrency: 'INR',
                price: numericPrice.toFixed(2),
                availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
              },
            }
          : {}),
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-12 sm:space-y-16">
      <SeoHead
        title={`${product.title} | Buy Online at Wangs`}
        description={seoDescription}
        canonicalPath={`/product/${product.slug || slug}`}
        image={seoImage}
        ogType="product"
        structuredData={productStructuredData}
      />
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-stone-500">
        <Link to="/" className="hover:text-stone-900 transition-colors">Home</Link>
        <span className="text-stone-400">/</span>
        <Link to="/products" className="hover:text-stone-900 transition-colors">Pickles</Link>
        <span className="text-stone-400">/</span>
        <span className="text-stone-900 font-semibold truncate max-w-[170px] sm:max-w-xs">{product.title}</span>
      </nav>

      {/* Main Product Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 lg:gap-14 items-start">
        {/* Left Column: Pastel Jar Container & Thumbnails */}
        <div className="lg:col-span-6 space-y-3 sm:space-y-4">
          <div className={`${pastelBg} rounded-2xl sm:rounded-3xl p-6 sm:p-14 flex items-center justify-center min-h-[260px] sm:min-h-[460px] relative overflow-hidden transition-colors duration-500`}>
            {/* Visual Jar Representation */}
            {product.primary_image_url && !imageError ? (
              <img
                src={resolveProductImage(product.primary_image_url)}
                alt={product.title}
                onError={() => setImageError(true)}
                className="max-h-[340px] w-auto object-contain drop-shadow-xl hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="relative w-44 h-56 flex items-center justify-center">
                {/* Jar Lid */}
                <div className="absolute top-0 w-28 h-5 bg-[#2a2725] rounded-t-sm shadow-md z-10" />
                {/* Jar Neck Ring */}
                <div className="absolute top-4 w-30 h-2 bg-[#3a3532] rounded-xs z-10" />
                {/* Jar Body */}
                <div
                  className="w-40 h-50 rounded-3xl shadow-lg relative overflow-hidden flex flex-col items-center justify-center border border-black/5"
                  style={{ backgroundColor: jarColor }}
                >
                  <div className="absolute inset-y-0 left-0 w-4 bg-white/15" />
                  <div className="absolute inset-y-0 right-0 w-3 bg-black/10" />
                  <div className="w-24 h-16 bg-[#fbf8f3] rounded-sm shadow-sm flex flex-col items-center justify-center p-1.5 text-center border border-stone-200/80">
                    <span className="font-logo text-xs text-stone-900 leading-tight">
                      Wangs
                    </span>
                    <span className="text-[9px] text-stone-600 truncate w-full">
                      Heritage
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Sold Out Overlay */}
            {!inStock && (
              <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-6 text-center rounded-3xl">
                <span className="px-5 py-2.5 rounded-full bg-stone-950/90 text-white text-sm font-bold border border-white/20 shadow-xl">
                  Batch Sold Out
                </span>
              </div>
            )}
          </div>

          {/* 3 Pastel Thumbnails Below */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveThumbIdx(0)}
              className={`w-20 h-20 rounded-2xl ${pastelBg} flex items-center justify-center border-2 transition-all p-2 ${
                activeThumbIdx === 0 ? 'border-[#ab331c] ring-2 ring-[#ab331c]/20' : 'border-transparent opacity-80 hover:opacity-100'
              }`}
            >
              <div className="w-8 h-12 rounded-lg shadow-2xs" style={{ backgroundColor: jarColor }} />
            </button>
            <button
              type="button"
              onClick={() => setActiveThumbIdx(1)}
              className={`w-20 h-20 rounded-2xl bg-[#f7ebd2] flex items-center justify-center border-2 transition-all p-2 ${
                activeThumbIdx === 1 ? 'border-[#ab331c] ring-2 ring-[#ab331c]/20' : 'border-transparent opacity-80 hover:opacity-100'
              }`}
            >
              <div className="w-8 h-12 rounded-lg bg-[#c87820] shadow-2xs" />
            </button>
            <button
              type="button"
              onClick={() => setActiveThumbIdx(2)}
              className={`w-20 h-20 rounded-2xl bg-[#e2ede2] flex items-center justify-center border-2 transition-all p-2 ${
                activeThumbIdx === 2 ? 'border-[#ab331c] ring-2 ring-[#ab331c]/20' : 'border-transparent opacity-80 hover:opacity-100'
              }`}
            >
              <div className="w-8 h-12 rounded-lg bg-[#496e4c] shadow-2xs" />
            </button>
          </div>
        </div>

        {/* Right Column: Title, Maker, Price, Description, Size, CTA & Trust */}
        <div className="lg:col-span-6 space-y-6">
          {/* Pill Tag */}
          <div className="inline-block bg-[#f6df9d] text-stone-900 text-xs px-3.5 py-1 rounded-full font-medium tracking-tight">
            {defaultTag}
          </div>

          {/* Title & Maker Subtitle */}
          <div className="space-y-2">
            <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-bold text-stone-900 leading-tight">
              {product.title}
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 font-medium">
              Made by {makerName} · {village} · ★ {rating} ({reviewsCount} reviews)
            </p>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
              ₹{displayPrice}
            </span>
            {selectedSize === '500 g' && (
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Value Pack Savings
              </span>
            )}
          </div>

          {/* Product Description */}
          <p className="text-stone-600 text-sm leading-relaxed">
            {product.description || product.short_description || 'Handcrafted in traditional earthen martabans with sun-cured spices and cold-pressed mustard oil. Matured slowly under ambient hill sunlight.'}
          </p>

          {/* Size Pills */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider">
              Size
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedSize('250 g')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  selectedSize === '250 g'
                    ? 'border-2 border-[#ab331c] text-[#ab331c] bg-white shadow-xs'
                    : 'border border-stone-300 text-stone-700 bg-white hover:border-stone-400'
                }`}
              >
                250 g
              </button>
              <button
                type="button"
                onClick={() => setSelectedSize('500 g')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  selectedSize === '500 g'
                    ? 'border-2 border-[#ab331c] text-[#ab331c] bg-white shadow-xs'
                    : 'border border-stone-300 text-stone-700 bg-white hover:border-stone-400'
                }`}
              >
                500 g
              </button>
            </div>
          </div>

          {/* Quantity Box + Add to Cart Pill Button */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center border border-stone-300 rounded-xl bg-white px-2 py-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="p-2 text-stone-600 hover:text-stone-900 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>
              <span className="w-8 text-center font-bold text-stone-900 text-sm">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="p-2 text-stone-600 hover:text-stone-900 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!inStock || adding}
              className={`flex-1 py-3.5 px-8 rounded-full font-semibold text-sm sm:text-base text-white text-center transition-all shadow-sm ${
                !inStock
                  ? 'bg-stone-300 cursor-not-allowed text-stone-500'
                  : added
                  ? 'bg-emerald-700 hover:bg-emerald-800'
                  : 'bg-[#ab331c] hover:bg-[#962c17] active:scale-98'
              }`}
            >
              {added ? '✓ Added to cart' : adding ? 'Adding...' : !inStock ? 'Sold out' : 'Add to cart'}
            </button>
          </div>

          {/* Trust Card */}
          <div className="bg-white border border-stone-200/90 rounded-2xl p-5 space-y-3.5 text-xs text-stone-700 shadow-xs">
            <div className="grid grid-cols-2 gap-2 font-medium">
              <div className="flex items-center gap-1.5 text-stone-800">
                <Check size={14} className="text-[#ab331c] shrink-0" strokeWidth={2.5} />
                <span>FSSAI certified</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-800">
                <Check size={14} className="text-[#ab331c] shrink-0" strokeWidth={2.5} />
                <span>No preservatives</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-800">
                <Check size={14} className="text-[#ab331c] shrink-0" strokeWidth={2.5} />
                <span>Leak-proof packing</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-800">
                <Check size={14} className="text-[#ab331c] shrink-0" strokeWidth={2.5} />
                <span>Easy returns</span>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-100 text-stone-500 text-[11px] leading-relaxed">
              <p>
                <strong className="text-stone-700 font-semibold">Ingredients:</strong> {product.ingredients || 'Fresh regional chillies, wood-pressed mustard oil, sea salt, natural spices.'}
              </p>
              <p className="mt-1">
                <strong className="text-stone-700 font-semibold">Shelf life:</strong> {product.shelf_life || '12 months from packing'} · Store in cool dry place, use dry spoon.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews Section */}
      <div className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4 border-b border-stone-100 pb-4">
          <div>
            <h3 className="font-serif font-bold text-2xl text-stone-900">Customer Reviews</h3>
            <p className="text-xs text-stone-500 mt-0.5">Verified culinary ratings & batch notes</p>
          </div>
          <button
            type="button"
            onClick={() => setShowReviewModal(true)}
            className="px-4 py-2 rounded-full border border-[#ab331c] text-[#ab331c] hover:bg-[#ab331c] hover:text-white text-xs font-semibold transition-colors"
          >
            Write a Review
          </button>
        </div>

        {reviewsList.length === 0 ? (
          <p className="text-stone-500 text-xs py-4 text-center">
            No customer reviews yet. Be the first to taste and review this batch!
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviewsList.slice(0, 4).map((rev, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-stone-900">{rev.author_name}</span>
                  <div className="flex text-amber-500">
                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                      <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                {rev.title && <p className="font-semibold text-xs text-stone-800">{rev.title}</p>}
                <p className="text-xs text-stone-600">{rev.comment}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* "You may also like" Section */}
      {recommendations.length > 0 && (
        <div className="space-y-6 pt-4">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            You may also like
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
            {recommendations.map((rec) => (
              <ProductCard key={rec.id} product={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">Write a Review</h3>
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
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#ab331c]"
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
                      className="p-1 focus:outline-none"
                    >
                      <Star
                        size={20}
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
                <label className="block text-stone-700 font-bold mb-1">Review</label>
                <textarea
                  rows={3}
                  required
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Share details of the aroma, texture, heat level..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#ab331c]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex-1 py-3 bg-[#ab331c] hover:bg-[#962c17] text-white font-bold rounded-xl transition-colors"
                >
                  {submittingReview ? 'Submitting...' : 'Submit Review'}
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
    </div>
  );
}
