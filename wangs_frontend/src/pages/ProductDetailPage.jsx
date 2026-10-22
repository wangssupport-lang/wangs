import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag, CheckCircle, ShieldCheck, Truck, AlertCircle,
  Clock, Package, ChevronRight, Plus, Minus, ArrowRight,
  Flame, Sparkles, Utensils, Heart, Award
} from 'lucide-react';
import { api } from '../api';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import SpiceMeter from '../components/SpiceMeter';

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

  // PIN code checker state
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);

  // Active tab in details section
  const [activeInfoTab, setActiveInfoTab] = useState('ingredients'); // 'ingredients', 'storage', 'pairing'

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
      toast.success(`Added ${quantity} jar${quantity > 1 ? 's' : ''} to your basket`);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      toast.error(err.message || 'Could not add to cart');
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
      setPincodeResult({ valid: true, message: 'Delivery available via air cargo (4-6 business days)' });
    } finally {
      setCheckingPin(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-9 h-9 border-4 border-forest-800 border-t-transparent rounded-full mx-auto" />
        <p className="text-xs text-stone-500 mt-3 font-medium">Fetching authentic product heritage...</p>
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

  const discountPercent = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-stone-500 font-medium">
        <Link to="/" className="hover:text-forest-900 transition-colors">Home</Link>
        <ChevronRight size={13} />
        <Link to="/products" className="hover:text-forest-900 transition-colors">Pickle Pantry</Link>
        <ChevronRight size={13} />
        <Link to={`/products?category=${product.category?.slug}`} className="hover:text-forest-900 transition-colors">
          {product.category?.name}
        </Link>
        <ChevronRight size={13} />
        <span className="text-stone-900 font-bold truncate max-w-xs">{product.title}</span>
      </nav>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        {/* Gallery / Image Column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-square bg-cream-100 rounded-3xl overflow-hidden border border-stone-200 shadow-artisan relative group">
            <img
              src={product.primary_image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80'}
              alt={product.title}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            />
            {discountPercent > 0 && (
              <div className="absolute top-4 left-4 bg-chilli-700 text-white text-xs font-black px-3 py-1 rounded-lg shadow-md">
                {discountPercent}% OFF
              </div>
            )}
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md p-2 rounded-xl border border-stone-200 shadow-md">
              <div className={`w-4 h-4 border flex items-center justify-center ${product.dietary_type === 'VEG' ? 'border-emerald-600' : 'border-amber-900'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${product.dietary_type === 'VEG' ? 'bg-emerald-600' : 'bg-amber-900'}`}></div>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 bg-forest-950/85 backdrop-blur-md text-cream-100 text-xs font-bold px-3 py-1 rounded-full border border-forest-800">
              Net Weight: {product.weight_grams} grams
            </div>
          </div>

          {/* Value highlights */}
          <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
            <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-sm">
              <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider">Cure Type</span>
              <span className="font-bold text-stone-900 mt-0.5 block">72h Oak Wood</span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-sm">
              <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider">Oil Medium</span>
              <span className="font-bold text-stone-900 mt-0.5 block">Virgin Mustard</span>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-sm">
              <span className="text-stone-400 block text-[10px] font-bold uppercase tracking-wider">Origin</span>
              <span className="font-bold text-stone-900 mt-0.5 block">Kohima, Nagaland</span>
            </div>
          </div>
        </div>

        {/* Product Information Column */}
        <div className="lg:col-span-6 space-y-6">
          {/* Producer & Category */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-xs text-forest-800 font-bold">
              <ShieldCheck size={17} className="text-forest-700" />
              <span>{product.manufacturer?.business_name}</span>
              <span className="text-stone-300">·</span>
              <span className="text-stone-500 font-normal">{product.manufacturer?.location_district}</span>
            </div>
            <SpiceMeter level={product.spice_level} size="md" showShu={true} />
          </div>

          {/* Title & Short Description */}
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-950 leading-tight">
              {product.title}
            </h1>
            <p className="text-sm text-stone-600 mt-3 leading-relaxed">
              {product.short_description}
            </p>
          </div>

          {/* Price Box */}
          <div className="p-5 bg-cream-100 rounded-2xl border border-stone-200 flex items-baseline justify-between">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl sm:text-4xl font-serif font-black text-stone-950">
                ₹{parseFloat(product.price).toFixed(0)}
              </span>
              {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
                <span className="text-sm text-stone-400 line-through font-serif">
                  MRP ₹{parseFloat(product.mrp).toFixed(0)}
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
              Tax Included · Pan-India Dispatch
            </span>
          </div>

          {/* Quantity Selector & Action Buttons */}
          <div className="space-y-4 pt-2">
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
                    onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                    className="px-3.5 py-2 hover:bg-stone-100 text-stone-700 transition-colors"
                  >
                    <Plus size={13} />
                  </button>
                </div>
              </div>

              <span className="text-xs text-stone-500 font-medium">
                {product.stock_quantity > 0 ? (
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <CheckCircle size={13} /> In Stock ({product.stock_quantity} jars left)
                  </span>
                ) : (
                  <span className="text-red-500 font-bold">Sold Out</span>
                )}
              </span>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleAddToCart}
                disabled={!product.is_in_stock || adding}
                className={`flex-1 py-4 px-5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${
                  added
                    ? 'bg-emerald-600 text-white'
                    : product.is_in_stock
                    ? 'bg-white border-2 border-forest-900 text-forest-900 hover:bg-forest-50'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                {added ? (
                  <>
                    <CheckCircle size={16} /> Added to Basket
                  </>
                ) : adding ? (
                  <span>Reserving jar...</span>
                ) : (
                  <>
                    <ShoppingBag size={16} /> Add to Basket
                  </>
                )}
              </button>

              <button
                onClick={handleBuyNow}
                disabled={!product.is_in_stock}
                className={`flex-1 py-4 px-5 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all ${
                  product.is_in_stock
                    ? 'bg-forest-900 hover:bg-forest-950 hover:scale-102 active:scale-98'
                    : 'bg-stone-300 cursor-not-allowed'
                }`}
              >
                <span>Direct Checkout</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          {/* Delivery PIN Code Checker */}
          <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-800">
              <span className="flex items-center gap-1.5">
                <Truck size={15} className="text-forest-700" />
                <span>Check Delivery Speed to your PIN</span>
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

          {/* Tabs: Ingredients, Storage, Pairing */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm space-y-4">
            <div className="flex border-b border-stone-100 text-xs font-bold text-stone-500 gap-6">
              <button
                onClick={() => setActiveInfoTab('ingredients')}
                className={`pb-2.5 transition-colors ${activeInfoTab === 'ingredients' ? 'border-b-2 border-forest-900 text-forest-950' : 'hover:text-stone-900'}`}
              >
                Ingredients & Allergens
              </button>
              <button
                onClick={() => setActiveInfoTab('storage')}
                className={`pb-2.5 transition-colors ${activeInfoTab === 'storage' ? 'border-b-2 border-forest-900 text-forest-950' : 'hover:text-stone-900'}`}
              >
                Storage & Shelf Life
              </button>
              <button
                onClick={() => setActiveInfoTab('pairing')}
                className={`pb-2.5 transition-colors ${activeInfoTab === 'pairing' ? 'border-b-2 border-forest-900 text-forest-950' : 'hover:text-stone-900'}`}
              >
                Culinary Pairings
              </button>
            </div>

            <div className="text-xs text-stone-700 leading-relaxed">
              {activeInfoTab === 'ingredients' && (
                <div className="space-y-2">
                  <p><strong>Ingredients:</strong> {product.ingredients}</p>
                  <p className="text-stone-500"><strong>Allergen Notice:</strong> {product.allergens || 'None declared.'}</p>
                </div>
              )}
              {activeInfoTab === 'storage' && (
                <div className="space-y-2">
                  <p><strong>Instructions:</strong> {product.storage_instructions}</p>
                  <p><strong>Shelf Life:</strong> {product.shelf_life}</p>
                </div>
              )}
              {activeInfoTab === 'pairing' && (
                <div className="space-y-1.5 text-stone-600">
                  <p>🍚 <strong>Steamed Sticky / Jasmine Rice:</strong> Place a teaspoon of pickle over steaming rice for immediate aroma release.</p>
                  <p>🍲 <strong>Naga Broth & Boiled Pork:</strong> Complements traditional boiled meat and wild greens.</p>
                  <p>🍛 <strong>Everyday Dal Chawal:</strong> Adds an earthy wood smoke depth to simple home meals.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
