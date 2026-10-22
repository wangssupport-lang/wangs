import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ShoppingBag, CheckCircle, ShieldCheck, Truck, AlertCircle,
  Clock, Package, ChevronRight, Plus, Minus, ArrowRight
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

  // PIN code checker state
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
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-forest-800 border-t-transparent rounded-full mx-auto" />
        <p className="text-xs text-stone-500 mt-3">Loading authentic product details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="font-serif text-2xl font-bold text-stone-900">Product not found</h2>
        <p className="text-xs text-stone-500 mt-2">This pickle batch may have sold out or is no longer listed.</p>
        <Link to="/products" className="mt-4 inline-block px-4 py-2 bg-forest-800 text-white rounded-lg text-xs font-semibold">
          Return to Catalog
        </Link>
      </div>
    );
  }

  const discountPercent = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-stone-500 mb-6">
        <Link to="/" className="hover:text-forest-800">Home</Link>
        <ChevronRight size={12} />
        <Link to="/products" className="hover:text-forest-800">Pickles</Link>
        <ChevronRight size={12} />
        <Link to={`/products?category=${product.category?.slug}`} className="hover:text-forest-800">
          {product.category?.name}
        </Link>
        <ChevronRight size={12} />
        <span className="text-stone-900 font-medium truncate max-w-xs">{product.title}</span>
      </nav>

      {/* Main Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Gallery / Image Column */}
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-square bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-md relative">
            <img
              src={product.primary_image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1000&q=80'}
              alt={product.title}
              className="w-full h-full object-cover object-center"
            />
            {discountPercent > 0 && (
              <div className="absolute top-4 left-4 bg-chilli-700 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow">
                {discountPercent}% OFF
              </div>
            )}
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm p-1.5 rounded-lg border border-stone-200 shadow">
              <div className={`w-4 h-4 border flex items-center justify-center ${product.dietary_type === 'VEG' ? 'border-emerald-600' : 'border-amber-800'}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${product.dietary_type === 'VEG' ? 'bg-emerald-600' : 'bg-amber-800'}`}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Information Column */}
        <div className="lg:col-span-6 space-y-6">
          {/* Producer & Category */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-1.5 text-xs text-forest-800 font-semibold">
              <ShieldCheck size={16} className="text-forest-700" />
              <span>{product.manufacturer?.business_name}</span>
              <span className="text-stone-400">·</span>
              <span className="text-stone-500 font-normal">{product.manufacturer?.location_district}</span>
            </div>
            <SpiceMeter level={product.spice_level} size="md" />
          </div>

          {/* Title & Short Description */}
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 leading-snug">
              {product.title}
            </h1>
            <p className="text-xs text-stone-500 mt-1">
              Net Weight: <strong className="text-stone-800 font-semibold">{product.weight_grams} grams</strong>
            </p>
            <p className="text-sm text-stone-600 mt-3 leading-relaxed">
              {product.short_description}
            </p>
          </div>

          {/* Pricing */}
          <div className="p-4 bg-cream-100/70 rounded-xl border border-stone-200/80 flex items-baseline gap-3">
            <span className="text-3xl font-serif font-bold text-stone-950">
              ₹{parseFloat(product.price).toFixed(0)}
            </span>
            {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
              <span className="text-sm text-stone-400 line-through">
                MRP ₹{parseFloat(product.mrp).toFixed(0)}
              </span>
            )}
            <span className="text-xs text-emerald-800 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded">
              Inclusive of all taxes
            </span>
          </div>

          {/* Quantity & CTA Buttons */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              <span className="text-xs text-stone-600 font-medium">Quantity:</span>
              <div className="flex items-center border border-stone-300 rounded-lg bg-white">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-1.5 hover:bg-stone-100 text-stone-700 rounded-l"
                >
                  <Minus size={14} />
                </button>
                <span className="px-4 text-xs font-bold text-stone-900">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                  className="px-3 py-1.5 hover:bg-stone-100 text-stone-700 rounded-r"
                >
                  <Plus size={14} />
                </button>
              </div>
              <span className="text-xs text-stone-500">
                {product.stock_quantity > 0 ? (
                  <span className="text-emerald-700 font-medium">✓ In Stock ({product.stock_quantity} available)</span>
                ) : (
                  <span className="text-red-500 font-bold">Sold Out</span>
                )}
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAddToCart}
                disabled={!product.is_in_stock || adding}
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  added
                    ? 'bg-emerald-600 text-white'
                    : product.is_in_stock
                    ? 'bg-white border-2 border-forest-800 text-forest-800 hover:bg-forest-50'
                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                }`}
              >
                {added ? (
                  <>
                    <CheckCircle size={16} /> Added to Basket
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
                className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md transition-all ${
                  product.is_in_stock
                    ? 'bg-forest-800 hover:bg-forest-900 hover:shadow-lg'
                    : 'bg-stone-300 cursor-not-allowed'
                }`}
              >
                <span>Buy Now</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>

          {/* Delivery PIN code check */}
          <div className="p-4 bg-white rounded-xl border border-stone-200 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-800">
              <Truck size={15} className="text-forest-700" />
              <span>Check Delivery Availability & Estimated Time</span>
            </div>
            <form onSubmit={handleCheckPincode} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Enter 6-digit PIN code"
                className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-forest-700"
              />
              <button
                type="submit"
                disabled={checkingPin}
                className="px-4 py-1.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-medium rounded-lg"
              >
                {checkingPin ? 'Checking...' : 'Check'}
              </button>
            </form>
            {pincodeResult && (
              <p className={`text-xs mt-1 ${pincodeResult.valid ? 'text-emerald-700 font-medium' : 'text-red-500'}`}>
                {pincodeResult.message}
              </p>
            )}
          </div>

          {/* Specifications Accordion / Cards */}
          <div className="space-y-3 pt-2 text-xs text-stone-700">
            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
              <h4 className="font-semibold text-stone-900 mb-1">Authentic Ingredients</h4>
              <p className="text-stone-600 leading-relaxed">{product.ingredients}</p>
            </div>

            <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
              <h4 className="font-semibold text-stone-900 mb-1">Storage & Usage Instructions</h4>
              <p className="text-stone-600 leading-relaxed">{product.storage_instructions}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <span className="text-stone-500 block text-[11px]">Shelf Life</span>
                <span className="font-semibold text-stone-900">{product.shelf_life}</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-lg border border-stone-200">
                <span className="text-stone-500 block text-[11px]">Allergen Notice</span>
                <span className="font-semibold text-stone-900 truncate block">{product.allergens || 'None'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
