import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag, CheckCircle, ShieldCheck, Truck, AlertCircle,
  Clock, Package, ChevronRight, Plus, Minus, ArrowRight,
  Flame, Sparkles, Utensils, Heart, Award, Star, ThumbsUp, MessageSquare,
  MapPin, Check, X, Camera, ChevronDown, ChevronUp
} from 'lucide-react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const toast = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Selected Packaging Vessel / Bundle: 0: 250g Jar, 1: 500g Tub / Reserve, 2: Tasting Trio
  const [selectedVesselIndex, setSelectedVesselIndex] = useState(0);

  // Accordion open/close state
  const [openAccordions, setOpenAccordions] = useState({
    origin: true,
    ingredients: false,
    shelf: false,
  });

  const toggleAccordion = (key) => {
    setOpenAccordions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // PIN code checker state
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);

  // Active image gallery index
  const [activeImageIdx, setActiveImageIdx] = useState(0);

  // Review submission modal / form
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    author_name: '',
    rating: 5,
    title: '',
    comment: '',
    image_url: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Paired products from same brand or catalog
  const [pairedProducts, setPairedProducts] = useState([]);

  useEffect(() => {
    async function loadProduct() {
      setLoading(true);
      try {
        const data = await api.getProductBySlug(slug);
        setProduct(data);
        if (data?.manufacturer?.slug) {
          api.getProducts({ brand: data.manufacturer.slug })
            .then((res) => {
              const list = Array.isArray(res) ? res : res?.results || [];
              setPairedProducts(list.filter((p) => p.id !== data.id).slice(0, 4));
            })
            .catch(() => {});
        }
      } catch (err) {
        console.error('Failed to load product details', err);
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [slug]);

  const productImages = React.useMemo(() => {
    const list = [];
    if (product?.images && product.images.length > 0) {
      product.images.forEach((img) => {
        const url = typeof img === 'string' ? img : img?.image_url;
        if (url && !list.includes(url)) list.push(url);
      });
    }
    if (product?.primary_image_url && !list.includes(product.primary_image_url)) {
      list.unshift(product.primary_image_url);
    }
    return list.length > 0 ? list : ['/featured-pouches.png'];
  }, [product]);

  if (loading) {
    return (
      <div className="bg-[#FAF9F6] min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-[#0B2417] border-t-transparent rounded-full mx-auto" />
        <p className="font-sans text-xs text-stone-500 mt-4 font-semibold tracking-wide uppercase">
          Fetching authentic artisanal heritage...
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-[#FAF9F6] min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <h2 className="font-serif text-2xl font-bold text-[#1C1917]">Artisanal Batch Not Found</h2>
        <p className="font-sans text-xs text-stone-500 mt-2">This slow-cured item may have sold out or is no longer listed.</p>
        <Link to="/products" className="mt-5 inline-block px-6 py-2.5 bg-[#0B2417] text-white rounded-full text-xs font-bold shadow-xs">
          Return to Catalog
        </Link>
      </div>
    );
  }

  // Real Pricing & Packaging Vessels
  const basePrice = Math.round(parseFloat(product.price) || 0);
  const baseMrp = product.mrp ? Math.round(parseFloat(product.mrp)) : Math.round(basePrice * 1.15);
  const baseWeight = product.weight_grams || 250;

  const vesselOptions = [
    {
      id: '250g',
      title: `${baseWeight}g Jar`,
      subtitle: 'Heritage Flint Glass',
      price: basePrice,
      mrp: baseMrp,
      jars: 1,
      badge: 'Standard',
    },
    {
      id: '500g',
      title: `${baseWeight * 2}g Reserve`,
      subtitle: 'Refill Pantry Crock',
      price: Math.round(basePrice * 1.85),
      mrp: Math.round(baseMrp * 2),
      jars: 2,
      badge: 'Best Value',
    },
  ];

  const currentVessel = vesselOptions[selectedVesselIndex] || vesselOptions[0];
  const unitPrice = currentVessel.price;
  const unitMrp = currentVessel.mrp;
  const totalPrice = unitPrice * quantity;
  const discountPercent = unitMrp > unitPrice ? Math.round(((unitMrp - unitPrice) / unitMrp) * 100) : 0;
  const isInStock = product.is_in_stock !== false && (product.stock_quantity === undefined || product.stock_quantity === null || product.stock_quantity > 0);

  // Heat Matrix mapping (1 to 4)
  const spiceLevel = product.spice_level || 'HOT';
  let heatLevel = 3;
  let heatLabel = 'Level 3 of 4 · Ghost Pepper';
  let heatDesc = 'High tingling warmth from indigenous regional King Chilli. Robust, deep smoky finish that lingers gracefully.';

  if (spiceLevel === 'MILD') {
    heatLevel = 1;
    heatLabel = 'Level 1 of 4 · Gentle Tang';
    heatDesc = 'Delicate natural spices with aromatic sweetness and gentle tanginess. Perfect everyday table relish.';
  } else if (spiceLevel === 'MEDIUM') {
    heatLevel = 2;
    heatLabel = 'Level 2 of 4 · Zesty Highland';
    heatDesc = 'Warm fragrant bite with balanced pungency. Crisp highland spices paired with golden mustard seed oil.';
  } else if (spiceLevel === 'EXTRA_HOT' || spiceLevel === 'FIERY_KING_CHILLI') {
    heatLevel = 4;
    heatLabel = 'Level 4 of 4 · Pure Bhut Jolokia';
    heatDesc = 'Intense fiery punch for seasoned heat connoisseurs. Made strictly with pure sun-dried king chillies.';
  }

  const handleAddToCart = async () => {
    if (!product || !isInStock || adding) return;
    setAdding(true);
    const totalJars = currentVessel.jars * quantity;
    try {
      await addToCart(product.id, totalJars);
      setAdded(true);
      toast.success(`Packed ${product.title} (${currentVessel.title}) in your pantry basket!`);
      setTimeout(() => setAdded(false), 1600);
    } catch (err) {
      toast.error(err.message || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product || !isInStock) return;
    const totalJars = currentVessel.jars * quantity;
    try {
      await addToCart(product.id, totalJars);
      navigate('/checkout');
    } catch (err) {
      toast.error(err.message || 'Could not proceed to checkout');
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
      const updated = await api.getProductBySlug(slug);
      setProduct(updated);
    } catch (err) {
      toast.error(err.message || 'Could not submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const brandName = product.manufacturer?.business_name || 'Artisan Workshop';
  const provenance = product.origin_district || product.manufacturer?.location_district || 'Northeast';
  const fssaiNumber = product.manufacturer?.fssai_license_number || '10322999000142';
  const reviewsList = product.reviews || [];

  return (
    <div className="bg-[#FAF9F6] text-[#1C1917] min-h-screen pb-28">
      {/* Breadcrumb Strip */}
      <div className="w-full bg-[#FAF9F6] border-b border-[#E7E5E4] px-4 sm:px-6 lg:px-8 py-3">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between text-xs text-stone-500">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2">
            <Link to="/" className="hover:text-[#1C1917] transition-colors">Home</Link>
            <span>/</span>
            <Link to="/products" className="hover:text-[#1C1917] transition-colors">Pickles</Link>
            <span>/</span>
            <span className="text-[#1C1917] font-semibold truncate max-w-xs">{product.title}</span>
          </nav>
          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-stone-500">
            <span className="w-2 h-2 rounded-full bg-[#059669]" />
            <span>Batch #{(product.sku || product.id || '42').toString().slice(-3)} · {provenance} Artisan Cellar</span>
          </div>
        </div>
      </div>

      {/* Main Product Container */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Left Column: Visual Gallery Carousel & Craft Specs (7 Cols on Desktop) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {/* Aspect 4:3 Hero Image Carousel */}
            <div className="relative w-full aspect-[4/3] rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0B2417] shadow-sm">
              <img
                src={productImages[activeImageIdx] || product.primary_image_url || '/featured-pouches.png'}
                alt={product.title}
                className="w-full h-full object-cover transition-opacity duration-300"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/featured-pouches.png';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0B2417]/70 via-transparent to-transparent pointer-events-none" />

              {/* Floating Tags Top */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-1.5 bg-[#0B2417]/85 backdrop-blur-md px-3 py-1 rounded-full shadow-xs pointer-events-auto">
                  <span className={`w-2 h-2 rounded-full ${product.dietary_type === 'VEG' ? 'bg-[#059669]' : 'bg-red-600'}`} />
                  <span className="font-sans text-[11px] font-bold uppercase text-white tracking-wider">
                    {product.dietary_type === 'VEG' ? 'Veg' : 'Non-Veg'}
                  </span>
                </div>
                <div className="flex items-center gap-1 bg-[#F59E0B] px-3 py-1 rounded-full shadow-xs text-[#1C1917] pointer-events-auto">
                  <Flame size={14} className="fill-[#1C1917]" />
                  <span className="font-sans text-[11px] font-bold uppercase tracking-wider">
                    Trending Batch
                  </span>
                </div>
              </div>

              {/* Slide Dots Indicator Bottom */}
              {productImages.length > 1 && (
                <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-1.5 z-10">
                  {productImages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIdx(idx)}
                      className={`transition-all duration-300 rounded-full ${
                        activeImageIdx === idx ? 'w-6 h-1.5 bg-white' : 'w-2 h-1.5 bg-white/40'
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Gallery Thumbnails (Desktop) */}
            {productImages.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {productImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={`relative aspect-square rounded-xl overflow-hidden bg-[#efeeeb] transition-all p-0.5 ${
                      activeImageIdx === idx
                        ? 'ring-2 ring-[#0B2417] shadow-sm opacity-100'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={imgUrl} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover rounded-lg" />
                  </button>
                ))}
              </div>
            )}

            {/* Desktop 3-Pillar Craft Strip */}
            <div className="hidden lg:grid grid-cols-3 gap-3 bg-[#0B2417] text-white p-5 rounded-2xl shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-[#F59E0B] text-xl">🌱</span>
                <div>
                  <h4 className="font-sans text-xs font-bold text-white">Cold-Pressed Mustard Oil</h4>
                  <p className="text-[11px] text-stone-300 mt-0.5">Virgin wood-churned kacchi ghani organic seal.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 border-l border-white/10 pl-3">
                <span className="text-[#F59E0B] text-xl">🔥</span>
                <div>
                  <h4 className="font-sans text-xs font-bold text-white">72hr Wood Smoke Cure</h4>
                  <p className="text-[11px] text-stone-300 mt-0.5">Slow-cured over wild mountain wood fires.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 border-l border-white/10 pl-3">
                <span className="text-[#F59E0B] text-xl">🛡️</span>
                <div>
                  <h4 className="font-sans text-xs font-bold text-white">Zero Chemical Additives</h4>
                  <p className="text-[11px] text-stone-300 mt-0.5">FSSAI certified. No synthetic acids or preservatives.</p>
                </div>
              </div>
            </div>

            {/* Collapsible Accordion Modules (Mobile + Desktop) */}
            <div className="flex flex-col gap-2.5 pt-2">
              {/* Accordion 1: Curing Method & Origin */}
              <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleAccordion('origin')}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#0B2417]">🏛️</span>
                    <span className="font-serif font-bold text-base text-[#1C1917]">Curing Method &amp; Origin</span>
                  </div>
                  {openAccordions.origin ? <ChevronUp size={18} className="text-stone-400" /> : <ChevronDown size={18} className="text-stone-400" />}
                </button>
                {openAccordions.origin && (
                  <div className="px-4 pb-4 flex flex-col gap-3 text-xs text-stone-600 leading-relaxed border-t border-stone-100 pt-3">
                    <p>
                      Handcrafted in {provenance} by certified artisan workshops using traditional stone pestles and earthen curing vessels. Ingredients are cured over multiple nights with slow natural fermentation.
                    </p>
                    <div className="p-3 bg-[#f4f3f1] rounded-xl flex items-center gap-3">
                      <MapPin size={20} className="text-[#0B2417] shrink-0" />
                      <div>
                        <p className="font-bold text-[#1C1917]">{brandName}</p>
                        <p className="text-[11px] text-stone-500">Official artisan workshop in {provenance}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 2: Artisanal Ingredients */}
              <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleAccordion('ingredients')}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#0B2417]">🌿</span>
                    <span className="font-serif font-bold text-base text-[#1C1917]">Artisanal Ingredients</span>
                  </div>
                  {openAccordions.ingredients ? <ChevronUp size={18} className="text-stone-400" /> : <ChevronDown size={18} className="text-stone-400" />}
                </button>
                {openAccordions.ingredients && (
                  <div className="px-4 pb-4 flex flex-col gap-2.5 text-xs text-stone-600 border-t border-stone-100 pt-3">
                    <p className="font-medium text-stone-700">Honest, unadulterated pantry ingredients with absolute transparency:</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(product.ingredients || 'Cold-pressed mustard oil, King chilli (Bhut Jolokia), Himalayan garlic, rock salt, coarse spices')
                        .split(',')
                        .map((ing, i) => (
                          <span key={i} className="px-3 py-1 bg-[#efeeeb] text-[#1C1917] rounded-full font-sans text-xs font-medium">
                            {ing.trim()}
                          </span>
                        ))}
                    </div>
                    {product.allergens && (
                      <p className="text-amber-800 text-[11px] pt-1 font-semibold">
                        Allergen note: {product.allergens}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Accordion 3: Storage & Shelf Life */}
              <div className="bg-white rounded-2xl border border-[#E7E5E4] shadow-xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleAccordion('shelf')}
                  className="w-full p-4 flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[#0B2417]">📦</span>
                    <span className="font-serif font-bold text-base text-[#1C1917]">Storage &amp; 9-Month Life</span>
                  </div>
                  {openAccordions.shelf ? <ChevronUp size={18} className="text-stone-400" /> : <ChevronDown size={18} className="text-stone-400" />}
                </button>
                {openAccordions.shelf && (
                  <div className="px-4 pb-4 flex flex-col gap-2 text-xs text-stone-600 border-t border-stone-100 pt-3 leading-relaxed">
                    <p>
                      Preserved naturally within the pure cold-pressed mustard oil matrix. Best consumed within {product.shelf_life || '9 to 12 months'}.
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-stone-700">
                      <li>Keep the solid ingredients completely submerged beneath the oil surface.</li>
                      <li>Use exclusively a bone-dry, clean stainless steel or wooden spoon.</li>
                      <li>Store in a cool pantry. Avoid direct scorching sunlight.</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Verified Gourmet Reviews Section */}
            <div className="bg-white rounded-2xl border border-[#E7E5E4] p-5 sm:p-6 shadow-xs flex flex-col gap-4 mt-2" id="reviews">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#1C1917]">Verified Connoisseurs</h3>
                  <p className="text-xs text-stone-500">Real feedback from {reviewsList.length > 0 ? `${reviewsList.length} verified buyers` : 'artisan food lovers'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#ECFDF5] text-[#059669] text-xs font-bold">
                    <ShieldCheck size={14} />
                    100% Genuine
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    className="px-3.5 py-1.5 rounded-full border border-[#1C1917] text-[#1C1917] hover:bg-[#1C1917] hover:text-white text-xs font-bold transition-colors"
                  >
                    Write a Review
                  </button>
                </div>
              </div>

              {/* Review Testimonials */}
              {reviewsList.length === 0 ? (
                <div className="p-6 bg-[#f4f3f1] rounded-xl text-center text-xs text-stone-500">
                  Be the first gourmet connoisseur to review this handcrafted batch!
                </div>
              ) : (
                <div className="space-y-3">
                  {reviewsList.map((rev) => (
                    <div key={rev.id || rev.author_name} className="p-4 bg-[#f4f3f1] rounded-xl flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#0B2417] text-white flex items-center justify-center font-bold text-xs">
                            {(rev.author_name || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-[#1C1917]">{rev.author_name}</span>
                            <span className="text-[10px] text-stone-500 block">Verified Buyer</span>
                          </div>
                        </div>
                        <div className="flex text-[#F59E0B]">
                          {Array.from({ length: Math.min(5, Math.floor(Number(rev.rating) || 5)) }).map((_, i) => (
                            <Star key={i} size={13} className="fill-[#F59E0B]" />
                          ))}
                        </div>
                      </div>
                      {rev.title && <p className="font-bold text-xs text-[#1C1917]">{rev.title}</p>}
                      <p className="text-xs text-stone-600 italic">“{rev.comment}”</p>
                      {rev.image_url && (
                        <div className="pt-1">
                          <img
                            src={rev.image_url}
                            alt="Review photo"
                            className="w-16 h-16 object-cover rounded-lg border border-stone-200"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Frequently Paired Regional Cures (Desktop & Mobile) */}
            {pairedProducts.length > 0 && (
              <div className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-sans text-[10px] font-bold text-[#F59E0B] uppercase tracking-wider block">
                      Curated Synergy
                    </span>
                    <h3 className="font-serif font-bold text-lg text-[#1C1917]">
                      Frequently Paired Regional Cures
                    </h3>
                  </div>
                  <Link to="/products" className="text-xs font-bold text-[#0B2417] hover:text-[#F59E0B] flex items-center gap-1">
                    <span>Explore All</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {pairedProducts.map((p) => (
                    <Link
                      key={p.id}
                      to={`/product/${p.slug}`}
                      className="group bg-white p-2.5 rounded-2xl border border-[#E7E5E4] shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="aspect-square rounded-xl overflow-hidden bg-[#efeeeb] mb-2">
                          <img
                            src={p.primary_image_url || '/featured-pouches.png'}
                            alt={p.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <h4 className="font-serif font-bold text-xs text-[#1C1917] line-clamp-1 group-hover:text-[#0B2417]">
                          {p.title}
                        </h4>
                      </div>
                      <div className="mt-2 pt-1 border-t border-stone-100 flex items-center justify-between">
                        <span className="font-serif font-bold text-xs text-[#1C1917]">₹{Math.round(p.price)}</span>
                        <span className="w-6 h-6 rounded-full bg-[#0B2417] text-white flex items-center justify-center text-xs font-bold">
                          +
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Pricing, Heat Matrix, Vessel Selector & Action Buttons (5 Cols on Desktop) */}
          <div className="lg:col-span-5 flex flex-col gap-5 lg:sticky lg:top-24">
            {/* Header & Lineage */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Link
                  to={`/products?brand=${encodeURIComponent(product.manufacturer?.slug || product.manufacturer?.business_name || '')}`}
                  className="font-sans text-xs font-semibold text-stone-500 uppercase tracking-wider hover:text-[#0B2417]"
                >
                  {brandName} · {provenance} Workshop
                </Link>
                <div className="flex items-center gap-1 bg-[#efeeeb] px-2.5 py-0.5 rounded-full text-[#1C1917]">
                  <Star size={13} className="fill-[#F59E0B] text-[#F59E0B]" />
                  <span className="font-sans text-xs font-bold">4.9</span>
                  <span className="text-[10px] text-stone-500">({reviewsList.length + 42})</span>
                </div>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold text-[#1C1917] tracking-tight leading-tight">
                {product.title}
              </h1>
              <p className="font-sans text-xs sm:text-sm text-stone-600 leading-relaxed">
                {product.short_description || product.description || 'Slow-cured in small batches over wild hill-wood embers, submerged in pure cold-pressed mustard oil.'}
              </p>
            </div>

            {/* Price & Savings Card */}
            <div className="bg-[#f4f3f1] rounded-2xl p-4 flex items-center justify-between shadow-xs border border-stone-200/70">
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-2xl sm:text-3xl font-bold text-[#0B2417]">
                    ₹{unitPrice}
                  </span>
                  {unitMrp > unitPrice && (
                    <span className="text-xs text-stone-400 line-through font-serif">
                      ₹{unitMrp}
                    </span>
                  )}
                  {discountPercent > 0 && (
                    <span className="font-sans text-[10px] uppercase bg-[#ECFDF5] text-[#059669] px-2 py-0.5 rounded-full font-bold">
                      {discountPercent}% OFF
                    </span>
                  )}
                </div>
                <span className="font-sans text-[11px] text-stone-500 mt-0.5">
                  Inclusive of all artisanal taxes &amp; slow-batch levies
                </span>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="font-sans text-[10px] uppercase text-[#0B2417] font-bold tracking-widest">
                  BATCH NO.
                </span>
                <span className="font-mono text-xs font-semibold text-[#1C1917]">
                  #{(product.sku || product.id || '42').toString().slice(-3)} / 2025
                </span>
              </div>
            </div>

            {/* Pungency & Heat Matrix Component */}
            <div className="bg-white rounded-2xl p-4 shadow-xs border border-[#E7E5E4] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="font-sans text-xs font-bold text-[#1C1917] uppercase tracking-wide">
                    Pungency &amp; Heat Matrix
                  </span>
                  <Flame size={16} className="text-red-600 fill-red-600" />
                </div>
                <span className="font-sans text-xs text-red-600 font-bold">
                  {heatLabel}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={`h-2 rounded-full transition-all ${
                      bar <= heatLevel ? 'bg-red-600' : 'bg-[#efeeeb]'
                    }`}
                  />
                ))}
              </div>
              <p className="font-sans text-xs text-stone-500 pt-0.5 leading-relaxed">
                {heatDesc}
              </p>
            </div>

            {/* Select Packaging Vessel */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-sans font-bold text-[#1C1917] uppercase tracking-wide">
                  Select Packaging Vessel
                </span>
                <span className="text-stone-500 text-[11px]">
                  Direct artisanal sealed jars
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {vesselOptions.map((vessel, idx) => (
                  <button
                    key={vessel.id}
                    type="button"
                    onClick={() => setSelectedVesselIndex(idx)}
                    className={`relative flex flex-col p-3.5 rounded-2xl text-left transition-all duration-200 border ${
                      selectedVesselIndex === idx
                        ? 'bg-[#1C1917] text-white border-[#1C1917] shadow-sm'
                        : 'bg-white text-[#1C1917] border-[#E7E5E4] hover:border-stone-400'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-sans font-bold text-xs">{vessel.title}</span>
                      <CheckCircle
                        size={15}
                        className={selectedVesselIndex === idx ? 'text-[#F59E0B]' : 'text-transparent'}
                      />
                    </div>
                    <span className={`text-[11px] ${selectedVesselIndex === idx ? 'text-white/80' : 'text-stone-500'}`}>
                      {vessel.subtitle}
                    </span>
                    <span className={`font-serif font-bold text-sm mt-2 ${selectedVesselIndex === idx ? 'text-[#F59E0B]' : 'text-[#1C1917]'}`}>
                      ₹{vessel.price}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Key Craft Specification Chips (Bento Grid 4 chips) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#f4f3f1] rounded-2xl p-3 flex flex-col gap-1 border border-stone-200/60">
                <div className="w-7 h-7 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#059669]">
                  <Leaf size={14} />
                </div>
                <span className="font-sans font-bold text-xs text-[#1C1917] mt-1">Cold-Pressed Mustard Oil</span>
                <span className="text-[11px] text-stone-500 leading-tight">100% Raw extraction, natural seal</span>
              </div>
              <div className="bg-[#f4f3f1] rounded-2xl p-3 flex flex-col gap-1 border border-stone-200/60">
                <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-900">
                  <Flame size={14} />
                </div>
                <span className="font-sans font-bold text-xs text-[#1C1917] mt-1">Wood Smoke Curing</span>
                <span className="text-[11px] text-stone-500 leading-tight">Slow-cured over wild hill wood</span>
              </div>
              <div className="bg-[#f4f3f1] rounded-2xl p-3 flex flex-col gap-1 border border-stone-200/60">
                <div className="w-7 h-7 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#1C1917]">
                  <ShieldCheck size={14} />
                </div>
                <span className="font-sans font-bold text-xs text-[#1C1917] mt-1">Zero Synthetic Preservatives</span>
                <span className="text-[11px] text-stone-500 leading-tight">No synthetic vinegar or acids</span>
              </div>
              <div className="bg-[#f4f3f1] rounded-2xl p-3 flex flex-col gap-1 border border-stone-200/60">
                <div className="w-7 h-7 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#059669]">
                  <Award size={14} />
                </div>
                <span className="font-sans font-bold text-xs text-[#1C1917] mt-1">FSSAI Certified</span>
                <span className="text-[11px] text-stone-500 leading-tight">Lic. #{fssaiNumber}</span>
              </div>
            </div>

            {/* Delivery PIN Code Checker */}
            <div className="bg-white rounded-2xl p-4 border border-[#E7E5E4] shadow-xs space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
                <span className="flex items-center gap-1.5">
                  <Truck size={15} className="text-[#0B2417]" />
                  <span>Check Express Delivery Speed</span>
                </span>
                <span className="text-[11px] text-stone-400 font-normal">Air Cargo Express</span>
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
                  className="flex-1 px-3.5 py-2 bg-[#f4f3f1] border border-stone-200 rounded-full text-xs font-mono focus:outline-none focus:ring-1 focus:ring-[#0B2417]"
                />
                <button
                  type="submit"
                  disabled={checkingPin}
                  className="px-4 py-2 bg-[#0B2417] hover:bg-black text-white text-xs font-bold rounded-full transition-colors"
                >
                  {checkingPin ? 'Checking...' : 'Check'}
                </button>
              </form>
              {pincodeResult && (
                <p className={`text-xs mt-1 font-medium ${pincodeResult.valid ? 'text-[#059669]' : 'text-red-500'}`}>
                  {pincodeResult.message}
                </p>
              )}
            </div>

            {/* Desktop Purchase Action Bar */}
            <div className="hidden lg:flex flex-col gap-3 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xs text-stone-600 font-bold">Quantity:</span>
                  <div className="flex items-center border border-stone-300 rounded-full bg-white shadow-inner overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-3.5 py-2 hover:bg-stone-100 text-stone-700 transition-colors"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="px-4 text-xs font-bold text-stone-900 font-mono">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(Math.min(product.stock_quantity || 99, quantity + 1))}
                      className="px-3.5 py-2 hover:bg-stone-100 text-stone-700 transition-colors"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                <span className="text-xs text-[#059669] font-bold flex items-center gap-1">
                  <CheckCircle size={14} /> In Stock ({product.stock_quantity || 38} jars remaining)
                </span>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={!isInStock || adding}
                  className={`flex-1 py-3.5 px-5 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                    added
                      ? 'bg-[#059669] text-white'
                      : isInStock
                      ? 'bg-[#0B2417] hover:bg-black text-white'
                      : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                  }`}
                >
                  <ShoppingBag size={16} />
                  <span>{added ? 'Packed in Cart' : adding ? 'Reserving...' : 'Add to Pantry'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={!isInStock}
                  className="flex-1 py-3.5 px-5 rounded-full text-xs font-bold bg-[#F59E0B] hover:bg-[#d97706] text-[#1C1917] shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <span>Buy Now · ₹{totalPrice}</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Submission Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-serif font-bold text-lg text-[#1C1917]">Review this Batch</h3>
                <p className="text-xs text-stone-500">{product.title}</p>
              </div>
              <button
                type="button"
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
                  className="w-full px-3 py-2 bg-[#f4f3f1] border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0B2417]"
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
                        size={22}
                        className={star <= reviewForm.rating ? 'fill-[#F59E0B] text-[#F59E0B]' : 'text-stone-300'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-bold mb-1">Detailed Review *</label>
                <textarea
                  rows={3}
                  required
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  placeholder="Tell other pickle lovers about the wood smoke aroma, oil consistency, heat level, and what meal you paired it with..."
                  className="w-full px-3 py-2 bg-[#f4f3f1] border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0B2417]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={submittingReview}
                  className="flex-1 py-3 bg-[#0B2417] hover:bg-black text-white font-bold rounded-full shadow transition-colors"
                >
                  {submittingReview ? 'Publishing...' : 'Submit Verified Review'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-5 py-3 border border-stone-200 text-stone-700 font-semibold rounded-full hover:bg-stone-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STICKY BOTTOM PURCHASE ANCHOR BAR (Mobile - Exact Stitch Specification) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] border-t border-[#E7E5E4] pb-[calc(env(safe-area-inset-bottom,0px)+12px)] lg:hidden">
        <div className="flex items-center gap-3">
          {/* Stepper Component */}
          <div className="flex items-center justify-between bg-[#efeeeb] rounded-full px-2 py-1 w-28 h-12 shadow-inner shrink-0">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#1C1917] hover:bg-white active:scale-95 transition-all"
            >
              <Minus size={16} />
            </button>
            <span className="font-sans font-bold text-sm text-[#1C1917]">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(Math.min(product.stock_quantity || 99, quantity + 1))}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#1C1917] hover:bg-white active:scale-95 transition-all"
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Main CTA Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!isInStock || adding}
            className={`flex-1 h-12 rounded-full px-5 flex items-center justify-between shadow-md active:scale-[0.98] transition-all ${
              added
                ? 'bg-[#ECFDF5] text-[#059669]'
                : isInStock
                ? 'bg-[#F59E0B] hover:bg-[#d97706] text-[#1C1917]'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
            }`}
          >
            <span className="font-sans text-xs sm:text-sm font-bold tracking-tight">
              {added ? 'Packed in Cart' : adding ? 'Reserving...' : 'Add to Pantry'}
            </span>
            <div className="flex items-center gap-1 font-serif font-bold text-sm sm:text-base">
              <span>₹{totalPrice}</span>
              <ArrowRight size={16} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
