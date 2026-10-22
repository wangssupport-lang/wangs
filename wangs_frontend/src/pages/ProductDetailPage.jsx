import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag, CheckCircle, ShieldCheck, Truck, AlertCircle,
  Clock, Package, ChevronRight, Plus, Minus, ArrowRight,
  Flame, Sparkles, MapPin, Check
} from 'lucide-react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import SpiceMeter from '../components/SpiceMeter';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  // Delivery check state
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);

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

  const handleAddToCart = async () => {
    if (!product || !product.is_in_stock || adding) return;
    setAdding(true);
    try {
      await addToCart(product.id, quantity);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      alert(err.message || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product || !product.is_in_stock) return;
    try {
      await addToCart(product.id, quantity);
      navigate('/checkout');
    } catch (err) {
      alert(err.message || 'Could not proceed to checkout');
    }
  };

  const handleCheckPincode = async (e) => {
    e.preventDefault();
    if (!pincode || pincode.length !== 6) {
      alert('Please enter a valid 6-digit PIN code');
      return;
    }
    setCheckingPin(true);
    try {
      const res = await api.checkPincode(pincode);
      setPincodeResult(res);
    } catch (err) {
      setPincodeResult({ valid: false, message: 'Could not verify PIN code' });
    } finally {
      setCheckingPin(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <div className="animate-spin w-9 h-9 border-4 border-forest-900 border-t-transparent rounded-full mx-auto" />
        <p className="text-xs text-stone-500 mt-4">Gathering authentic product batch details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-24 text-center">
        <h2 className="font-serif text-2xl font-bold text-stone-900">Product not found</h2>
        <p className="text-xs text-stone-500 mt-2">This artisanal batch may have sold out or is currently in curing.</p>
        <Link to="/products" className="mt-5 inline-block px-5 py-2.5 bg-forest-900 text-cream-50 rounded-xl text-xs font-semibold">
          Return to Catalog
        </Link>
      </div>
    );
  }

  const discountPercent = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-stone-500 mb-8 overflow-x-auto whitespace-nowrap">
        <Link to="/" className="hover:text-forest-900 transition-colors">Home</Link>
        <ChevronRight size={12} />
        <Link to="/products" className="hover:text-forest-900 transition-colors">Pickles</Link>
        <ChevronRight size={12} />
        <Link to={`/products?category=${product.category?.slug}`} className="hover:text-forest-900 transition-colors">
          {product.category?.name}
        </Link>
        <ChevronRight size={12} />
        <span className="text-stone-900 font-semibold truncate max-w-xs">{product.title}</span>
      </nav>

      {/* Main Product Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Left Image Showcase */}
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-square bg-cream-100 rounded-3xl overflow-hidden border border-stone-200/80 shadow-subtle relative group">
            <img
              src={product.primary_image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80'}
              alt={product.title}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            />

            {discountPercent > 0 && (
              <div className="absolute top-4 left-4 bg-chilli-700 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                {discountPercent}% OFF
              </div>
            )}

            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-1.5 rounded-lg border border-stone-200/80 shadow-sm">
              <div className={`w-4 h-4 border flex items-center justify-center ${product.dietary_type === 'VEG' ? 'border-emerald-600' : 'border-amber-900'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${product.dietary_type === 'VEG' ? 'bg-emerald-600' : 'bg-amber-900'}`} />
              </div>
            </div>

            {/* Bottom Stamp */}
            <div className="absolute bottom-4 left-4 right-4 bg-forest-950/85 backdrop-blur-md rounded-2xl p-3 text-cream-100 text-xs border border-forest-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-amber-300" />
                <span className="font-medium">{product.manufacturer?.location_district || 'Kohima, Nagaland'}</span>
              </div>
              <span className="font-mono text-cream-300 text-[11px] font-semibold">{product.weight_grams} Gram Jar</span>
            </div>
          </div>
        </div>

        {/* Right Info & Actions */}
        <div className="lg:col-span-6 space-y-6">
          {/* Producer Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4">
            <div className="flex items-center gap-2 text-xs text-forest-800 font-semibold">
              <ShieldCheck size={16} className="text-forest-700" />
              <span>{product.manufacturer?.business_name}</span>
              <span className="text-stone-300">·</span>
              <span className="text-stone-500 font-normal">FSSAI Registered Producer</span>
            </div>
            <SpiceMeter level={product.spice_level} showShu={true} size="md" />
          </div>

          {/* Title & Short Description */}
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 leading-tight">
              {product.title}
            </h1>
            <p className="text-sm text-stone-600 mt-3 leading-relaxed">
              {product.short_description}
            </p>
          </div>

          {/* Pricing Box */}
          <div className="p-5 bg-cream-100/80 rounded-2xl border border-stone-200 flex flex-wrap items-baseline justify-between gap-4">
            <div className="flex items-baseline gap-2.5">
              <span className="text-3xl sm:text-4xl font-serif font-bold text-stone-950">
                ₹{parseFloat(product.price).toFixed(0)}
              </span>
              {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
                <span className="text-sm text-stone-400 line-through">
                  ₹{parseFloat(product.mrp).toFixed(0)}
                </span>
              )}
            </div>
            <span className="text-xs text-emerald-800 font-bold bg-emerald-100/90 px-3 py-1 rounded-full">
              Tax Included · Flat ₹5 Platform Fee at Checkout
            </span>
          </div>

          {/* Quantity & CTA Buttons */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold text-stone-700">Quantity:</span>
              <div className="flex items-center border border-stone-300 rounded-xl bg-white shadow-subtle">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3.5 py-2 hover:bg-stone-50 text-stone-700 rounded-l-xl transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="px-4 text-xs font-bold text-stone-950">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                  className="px-3.5 py-2 hover:bg-stone-50 text-stone-700 rounded-r-xl transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>

              <span className="text-xs">
                {product.stock_quantity > 0 ? (
                  <span className="text-emerald-700 font-semibold">✓ In Stock ({product.stock_quantity} available)</span>
                ) : (
                  <span className="text-chilli-600 font-bold">Sold Out</span>
                )}
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!product.is_in_stock || adding}
                className={`flex-1 py-3.5 px-5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  added
                    ? 'bg-emerald-700 text-white'
                    : product.is_in_stock
                    ? 'bg-white border-2 border-forest-900 text-forest-950 hover:bg-forest-50'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                {added ? (
                  <>
                    <Check size={16} className="stroke-[3]" /> Added to Basket
                  </>
                ) : adding ? (
                  <span>Adding...</span>
                ) : (
                  <>
                    <ShoppingBag size={16} /> Add to Basket
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={!product.is_in_stock}
                className={`flex-1 py-3.5 px-5 rounded-xl text-xs font-bold text-cream-50 flex items-center justify-center gap-2 shadow-md transition-all ${
                  product.is_in_stock
                    ? 'bg-forest-900 hover:bg-forest-950 hover:shadow-lg active:scale-98'
                    : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                }`}
              >
                <span>Buy Now</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Delivery Availability Checker */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-stone-200 shadow-subtle space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
              <Truck size={16} className="text-forest-700" />
              <span>Check Delivery Serviceability by PIN Code</span>
            </div>
            <form onSubmit={handleCheckPincode} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter 6-digit PIN code"
                className="flex-1 px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-forest-700"
              />
              <button
                type="submit"
                disabled={checkingPin}
                className="px-5 py-2 bg-forest-900 hover:bg-forest-950 text-cream-50 text-xs font-semibold rounded-xl"
              >
                {checkingPin ? 'Checking...' : 'Check'}
              </button>
            </form>
            {pincodeResult && (
              <p className={`text-xs mt-1 ${pincodeResult.valid ? 'text-emerald-700 font-semibold' : 'text-chilli-600'}`}>
                {pincodeResult.message}
              </p>
            )}
          </div>

          {/* Detailed Product Specifications */}
          <div className="space-y-3 pt-2 text-xs text-stone-700">
            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-subtle space-y-1">
              <h4 className="font-serif font-bold text-stone-900 text-sm">Authentic Naga Ingredients</h4>
              <p className="text-stone-600 leading-relaxed">{product.ingredients}</p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-subtle space-y-1">
              <h4 className="font-serif font-bold text-stone-900 text-sm">Storage & Preservation Instructions</h4>
              <p className="text-stone-600 leading-relaxed">{product.storage_instructions}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-subtle">
                <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Shelf Life</span>
                <span className="font-bold text-stone-900">{product.shelf_life}</span>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-subtle">
                <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Allergen Declaration</span>
                <span className="font-bold text-stone-900 truncate block">{product.allergens || 'None'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
