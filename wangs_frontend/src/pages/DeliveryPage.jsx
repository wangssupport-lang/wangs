import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import {
  Package, MapPin, Navigation, QrCode, Phone, ExternalLink,
  CheckCircle2, Clock, AlertTriangle, Search, ArrowLeft, Camera,
  Check, Truck, Copy, MessageSquare, Compass, ShieldCheck, RefreshCw, X,
  Sparkles, CheckCircle, LogOut, User, Lock, Mail, Key, Shield,
  FileText, UploadCloud, ChevronRight, Ban, XCircle
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function DeliveryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { orderNumber: paramOrderNumber } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const {
    user,
    courierProfile,
    setCourierProfile,
    isAdmin,
    isCourier,
    isApprovedCourier,
    logout,
    refreshUser,
    loading: authLoading
  } = useAuth();

  // Auth & Registration Tabs: 'login' | 'register' | 'forgot'
  const [authTab, setAuthTab] = useState('login');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Login Form State
  const [loginForm, setLoginForm] = useState({
    username: '', // email or phone
    password: '',
  });

  // Courier Registration Form State
  const [regForm, setRegForm] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    password: '',
    confirm_password: '',
    courier_company: '',
    vehicle_type: 'BIKE',
    vehicle_number: '',
    service_area_city: '',
    address: '',
  });
  const [idDocFile, setIdDocFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1: request, 2: set new password

  const activeOrderParam = searchParams.get('order') || searchParams.get('track') || paramOrderNumber || '';

  const [orderIdInput, setOrderIdInput] = useState(activeOrderParam);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentParcels, setRecentParcels] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Scanner Modal & Camera State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerStatus, setScannerStatus] = useState('Initializing camera...');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Mark as Delivered State
  const [isMarkingDelivered, setIsMarkingDelivered] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [showDeliveredModal, setShowDeliveredModal] = useState(false);

  // Load Order by Identifier
  const loadOrder = async (identifier) => {
    if (!identifier || !identifier.trim()) return;
    const cleanId = cleanOrderIdentifier(identifier);
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDeliveryOrder(cleanId);
      setOrder(data);
      setOrderIdInput(data.order_number);
      // Update URL query without page reload
      setSearchParams({ order: data.order_number });
    } catch (err) {
      console.error('Failed to load delivery order:', err);
      setError(err.message || 'Parcel not found. Check order number or scan barcode again.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  // Load active dispatches queue
  const loadRecentParcels = async () => {
    if (!isApprovedCourier) return;
    setLoadingRecent(true);
    try {
      const data = await api.getActiveDeliveryOrders();
      setRecentParcels(data || []);
    } catch (err) {
      console.warn('Could not load recent parcels:', err);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    if (!isApprovedCourier) return;
    if (activeOrderParam) {
      loadOrder(activeOrderParam);
    } else {
      loadRecentParcels();
    }
  }, [activeOrderParam, isApprovedCourier]);

  // Clean raw QR code strings (extract order number from URL or raw text)
  const cleanOrderIdentifier = (raw) => {
    if (!raw) return '';
    let str = raw.trim();
    if (str.includes('order=')) {
      str = str.split('order=')[1].split('&')[0];
    } else if (str.includes('track=')) {
      str = str.split('track=')[1].split('&')[0];
    } else if (str.startsWith('DELIVERY:')) {
      const parts = str.split('|');
      str = parts[0].replace('DELIVERY:', '').trim();
    }
    return str;
  };

  // Handle Manual Form Search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (orderIdInput.trim()) {
      loadOrder(orderIdInput.trim());
    }
  };

  // Courier Sign In Handler
  const handleCourierLogin = async (e) => {
    e.preventDefault();
    if (!loginForm.username.trim() || !loginForm.password) {
      toast.error('Please enter your email/phone and password.');
      return;
    }
    setAuthSubmitting(true);
    try {
      const res = await api.courierLogin({
        username: loginForm.username.trim(),
        password: loginForm.password,
      });

      if (res.token) {
        localStorage.setItem('wangs_token', res.token);
        if (res.refresh) localStorage.setItem('wangs_refresh_token', res.refresh);
      }
      if (res.courier_profile) {
        localStorage.setItem('wangs_courier_profile', JSON.stringify(res.courier_profile));
        setCourierProfile(res.courier_profile);
      }

      await refreshUser();

      if (res.status === 'PENDING') {
        toast.info(res.message || 'Registration is pending administrator approval.');
      } else if (res.status === 'SUSPENDED') {
        toast.error('Your courier account is suspended. Please contact support.');
      } else if (res.status === 'REJECTED') {
        toast.error('Your application was not approved. Please contact support.');
      } else {
        toast.success('Welcome back, Courier Partner!');
      }
    } catch (err) {
      toast.error(err.message || 'Invalid credentials or login failed.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Courier Registration Handler
  const handleCourierRegister = async (e) => {
    e.preventDefault();
    if (!regForm.full_name.trim()) return toast.error('Full name is required.');
    if (!regForm.phone_number.trim() || regForm.phone_number.replace(/\D/g, '').length < 10) {
      return toast.error('A valid 10-digit mobile number is required.');
    }
    if (!regForm.email.trim()) return toast.error('Email address is required.');
    if (!regForm.password || regForm.password.length < 6) {
      return toast.error('Password must be at least 6 characters.');
    }
    if (regForm.password !== regForm.confirm_password) {
      return toast.error('Passwords do not match.');
    }

    setAuthSubmitting(true);
    try {
      let payload;
      if (idDocFile || photoFile) {
        payload = new FormData();
        Object.entries(regForm).forEach(([k, v]) => {
          if (v !== undefined && v !== null) payload.append(k, v);
        });
        if (idDocFile) payload.append('identity_document', idDocFile);
        if (photoFile) payload.append('profile_photo', photoFile);
      } else {
        payload = { ...regForm };
      }

      const res = await api.courierRegister(payload);
      if (res.token) {
        localStorage.setItem('wangs_token', res.token);
        if (res.refresh) localStorage.setItem('wangs_refresh_token', res.refresh);
      }
      if (res.courier_profile) {
        localStorage.setItem('wangs_courier_profile', JSON.stringify(res.courier_profile));
        setCourierProfile(res.courier_profile);
      }

      await refreshUser();
      toast.success(res.message || 'Your registration has been submitted. Please wait for administrator approval.');
    } catch (err) {
      toast.error(err.message || 'Registration failed. Please check your details.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Courier Forgot Password Request Handler
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      return toast.error('Please enter your registered email or phone.');
    }
    setAuthSubmitting(true);
    try {
      const res = await api.courierForgotPassword({ email_or_phone: forgotEmail.trim() });
      toast.success(res.message || 'Password reset instructions have been dispatched.');
      setForgotSent(true);
      if (res.reset_token) {
        setResetToken(res.reset_token);
        setResetStep(2);
      }
    } catch (err) {
      toast.error(err.message || 'Could not process password reset request.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Courier Reset Password Submit Handler
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetToken.trim()) return toast.error('Reset token or OTP is required.');
    if (!newPassword || newPassword.length < 6) return toast.error('Password must be at least 6 characters.');
    if (newPassword !== confirmNewPassword) return toast.error('Passwords do not match.');

    setAuthSubmitting(true);
    try {
      const res = await api.courierResetPassword({
        token: resetToken.trim(),
        new_password: newPassword,
      });
      toast.success(res.message || 'Password has been reset successfully! You can now log in.');
      setAuthTab('login');
      setResetStep(1);
      setForgotSent(false);
      setResetToken('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      toast.error(err.message || 'Password reset failed. Token may have expired.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // Handle Mark as Delivered
  const handleConfirmDelivery = async () => {
    if (!order) return;
    setIsMarkingDelivered(true);
    try {
      const res = await api.markDeliveryOrderDelivered(order.order_number, {
        notes: deliveryNotes,
        confirmation_method: 'MANUAL_SEARCH'
      });
      toast.success(`Order ${order.order_number} marked as Delivered!`);
      setShowDeliveredModal(false);
      setDeliveryNotes('');
      // Refresh current order data
      await loadOrder(order.order_number);
      await refreshUser();
    } catch (err) {
      toast.error(err.message || 'Failed to update delivery status.');
    } finally {
      setIsMarkingDelivered(false);
    }
  };

  const handleConfirmSingleUnit = async (unitId) => {
    if (!order) return;
    setIsMarkingDelivered(true);
    try {
      await api.markDeliveryOrderDelivered(order.order_number, {
        notes: deliveryNotes || 'Courier confirmed individual unit delivery',
        unit_ids: [unitId],
        confirmation_method: 'CAMERA_QR'
      });
      toast.success('Product unit delivery confirmed and credit awarded!');
      await loadOrder(order.order_number);
      await refreshUser();
    } catch (err) {
      toast.error(err.message || 'Failed to update unit delivery status.');
    } finally {
      setIsMarkingDelivered(false);
    }
  };

  // Start Camera QR Scanner
  const startScanner = async () => {
    setIsScannerOpen(true);
    setScannerStatus('Requesting camera access...');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setScannerStatus('Align QR code on parcel within frame');
        beginBarcodeDetection();
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setScannerStatus('Camera access denied or unavailable. You can enter the order number manually.');
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopScanner = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setIsScannerOpen(false);
  };

  // Run barcode / QR detection loop
  const beginBarcodeDetection = () => {
    if (!('BarcodeDetector' in window)) {
      setScannerStatus('Point camera at QR code or upload image/enter manually');
      return;
    }

    try {
      const barcodeDetector = new window.BarcodeDetector({
        formats: ['qr_code', 'code_128', 'code_39', 'ean_13']
      });

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const codes = await barcodeDetector.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const rawVal = codes[0].rawValue;
            if (rawVal) {
              stopScanner();
              toast.success('Parcel QR Code scanned successfully!');
              loadOrder(rawVal);
            }
          }
        } catch (scanErr) {
          // ignore detection frame skips
        }
      }, 350);
    } catch (e) {
      console.warn('BarcodeDetector error:', e);
    }
  };

  // Clean phone number for WhatsApp link
  const getCleanPhone = (phone) => {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  // ==========================================
  // VIEW CASE 1: Loading Auth State
  // ==========================================
  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Truck size={36} className="text-red-600 animate-bounce mx-auto" />
          <p className="text-xs font-bold text-stone-600">Verifying Courier Authorization...</p>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW CASE 2: Unauthenticated Visitor -> Courier Login & Registration
  // ==========================================
  if (!user) {
    return (
      <div className="min-h-screen bg-stone-100 text-stone-900 pb-16">
        {/* Top Header Bar */}
        <div className="bg-red-600 text-white shadow-md border-b border-red-700">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-red-700 text-white flex items-center justify-center font-bold shadow-inner">
                <Truck size={22} />
              </div>
              <div>
                <span className="font-bold text-base tracking-wide uppercase block leading-tight">Wangs Express</span>
                <span className="text-[11px] text-red-100">Delivery Fleet & Courier Partner Portal</span>
              </div>
            </div>
            <Link to="/" className="text-xs font-bold text-red-100 hover:text-white underline">
              Storefront
            </Link>
          </div>
        </div>

        {/* Portal Gateway Container */}
        <div className="max-w-md mx-auto px-4 pt-6 space-y-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xl space-y-5">
            {/* Tab Switcher */}
            <div className="flex p-1 bg-stone-100 rounded-2xl">
              <button
                type="button"
                onClick={() => setAuthTab('login')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  authTab === 'login'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthTab('register')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  authTab === 'register'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Courier Registration
              </button>
            </div>

            {/* TAB: SIGN IN */}
            {authTab === 'login' && (
              <form onSubmit={handleCourierLogin} className="space-y-4">
                <div className="space-y-1 text-center">
                  <h2 className="font-serif text-xl font-black text-stone-900">Courier Sign In</h2>
                  <p className="text-xs text-stone-500">
                    Enter your registered email address or mobile number to access active dispatches and QR scanner.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Email Address or Mobile Number
                    </label>
                    <div className="relative">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={loginForm.username}
                        onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                        placeholder="e.g. runner@wangs.in or 9862000000"
                        className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-stone-700">Password</label>
                      <button
                        type="button"
                        onClick={() => setAuthTab('forgot')}
                        className="text-[11px] font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="password"
                        required
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {authSubmitting ? 'Verifying Credentials...' : 'Sign In to Wangs Express'}
                </button>

                <div className="pt-2 text-center text-xs text-stone-500">
                  New to Wangs Express?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthTab('register')}
                    className="font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
                  >
                    Register as a Courier
                  </button>
                </div>
              </form>
            )}

            {/* TAB: REGISTER */}
            {authTab === 'register' && (
              <form onSubmit={handleCourierRegister} className="space-y-4">
                <div className="space-y-1 text-center">
                  <h2 className="font-serif text-xl font-black text-stone-900">Courier Registration</h2>
                  <p className="text-xs text-stone-500">
                    Apply to become a verified Wangs Express delivery partner in your district.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Full Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={regForm.full_name}
                      onChange={(e) => setRegForm({ ...regForm, full_name: e.target.value })}
                      placeholder="e.g. Temsu Jamir"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Mobile Number *</label>
                      <input
                        type="tel"
                        required
                        value={regForm.phone_number}
                        onChange={(e) => setRegForm({ ...regForm, phone_number: e.target.value })}
                        placeholder="10-digit mobile"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={regForm.email}
                        onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                        placeholder="courier@wangs.in"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Password *</label>
                      <input
                        type="password"
                        required
                        value={regForm.password}
                        onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                        placeholder="At least 6 chars"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Confirm Password *</label>
                      <input
                        type="password"
                        required
                        value={regForm.confirm_password}
                        onChange={(e) => setRegForm({ ...regForm, confirm_password: e.target.value })}
                        placeholder="Re-enter password"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Courier Company / Agency Name
                    </label>
                    <input
                      type="text"
                      value={regForm.courier_company}
                      onChange={(e) => setRegForm({ ...regForm, courier_company: e.target.value })}
                      placeholder="e.g. Wangs Express Hub, DTDC, or Independent Partner"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Vehicle Type *</label>
                      <select
                        value={regForm.vehicle_type}
                        onChange={(e) => setRegForm({ ...regForm, vehicle_type: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      >
                        <option value="BIKE">Motorcycle / Bike</option>
                        <option value="SCOOTER">Scooter / Moped</option>
                        <option value="EV">Electric 2W / EV</option>
                        <option value="VAN">Delivery Van</option>
                        <option value="TRUCK">Pickup Truck</option>
                        <option value="BICYCLE">Bicycle</option>
                        <option value="FOOT">On Foot Walker</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Vehicle Reg Number</label>
                      <input
                        type="text"
                        value={regForm.vehicle_number}
                        onChange={(e) => setRegForm({ ...regForm, vehicle_number: e.target.value })}
                        placeholder="e.g. NL-01-AB-1234"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Hub City / Service Area</label>
                    <input
                      type="text"
                      value={regForm.service_area_city}
                      onChange={(e) => setRegForm({ ...regForm, service_area_city: e.target.value })}
                      placeholder="e.g. Kohima, Dimapur, Mokokchung"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">Residential / Base Address</label>
                    <textarea
                      rows={2}
                      value={regForm.address}
                      onChange={(e) => setRegForm({ ...regForm, address: e.target.value })}
                      placeholder="Street, locality, landmark..."
                      className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Identity Document or Driving License (Optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setIdDocFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-stone-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-stone-100 file:text-stone-800 hover:file:bg-stone-200 cursor-pointer"
                    />
                    <p className="text-[10px] text-stone-400 mt-0.5">JPG, PNG, or PDF file</p>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Clock size={13} className="text-amber-700 shrink-0" />
                    <span>Administrator Approval Required</span>
                  </div>
                  <p>
                    All courier applications are reviewed by Wangs administration before portal access is granted.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={authSubmitting}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {authSubmitting ? 'Submitting Registration...' : 'Submit Courier Registration'}
                </button>

                <div className="pt-2 text-center text-xs text-stone-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthTab('login')}
                    className="font-bold text-red-600 hover:text-red-700 underline cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}

            {/* TAB: FORGOT PASSWORD */}
            {authTab === 'forgot' && (
              <div className="space-y-4">
                <div className="space-y-1 text-center">
                  <h2 className="font-serif text-xl font-black text-stone-900">Reset Courier Password</h2>
                  <p className="text-xs text-stone-500">
                    Recover access to your Wangs Express courier account.
                  </p>
                </div>

                {resetStep === 1 ? (
                  <form onSubmit={handleForgotRequest} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Registered Email Address or Mobile Number
                      </label>
                      <input
                        type="text"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. runner@wangs.in or 9862000000"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authSubmitting}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      {authSubmitting ? 'Requesting Reset...' : 'Send Password Reset Code'}
                    </button>

                    <div className="pt-1 text-center">
                      <button
                        type="button"
                        onClick={() => setResetStep(2)}
                        className="text-xs font-bold text-stone-600 hover:text-stone-900 underline"
                      >
                        I already have a reset token
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">
                        Reset Token / OTP Code
                      </label>
                      <input
                        type="text"
                        required
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        placeholder="Enter 6-digit code or reset token"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">New Password</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">Confirm New Password</label>
                      <input
                        type="password"
                        required
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={authSubmitting}
                      className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      {authSubmitting ? 'Updating Password...' : 'Save New Password & Sign In'}
                    </button>
                  </form>
                )}

                <div className="pt-2 text-center text-xs text-stone-500">
                  <button
                    type="button"
                    onClick={() => { setAuthTab('login'); setResetStep(1); }}
                    className="font-bold text-stone-700 hover:text-stone-900 underline cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW CASE 3: Authenticated but NOT Approved (PENDING / SUSPENDED / REJECTED)
  // ==========================================
  if (!isApprovedCourier) {
    const isPending = courierProfile?.status === 'PENDING' || (!courierProfile && user.role === 'COURIER');
    const isSuspended = courierProfile?.status === 'SUSPENDED';
    const isRejected = courierProfile?.status === 'REJECTED';

    return (
      <div className="min-h-screen bg-stone-100 text-stone-900 pb-16">
        <div className="bg-red-600 text-white shadow-md border-b border-red-700">
          <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-red-700 text-white flex items-center justify-center font-bold shadow-inner">
                <Truck size={22} />
              </div>
              <div>
                <span className="font-bold text-base tracking-wide uppercase block leading-tight">Wangs Express</span>
                <span className="text-[11px] text-red-100">Courier Account Status</span>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-700 hover:bg-red-800 text-xs font-bold cursor-pointer"
            >
              <LogOut size={13} /> Logout
            </button>
          </div>
        </div>

        <div className="max-w-md mx-auto px-4 pt-8 space-y-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xl space-y-5">
            {isPending && (
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner animate-pulse">
                  <Clock size={28} />
                </div>
                <div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase tracking-wide mb-2">
                    Application Pending Approval
                  </span>
                  <h2 className="font-serif text-xl font-bold text-stone-900">
                    Your Registration Has Been Submitted
                  </h2>
                  <p className="text-xs text-stone-600 mt-2 leading-relaxed">
                    Please wait for administrator approval. Our fleet dispatch team verifies all courier partner credentials before granting delivery portal access.
                  </p>
                </div>

                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-left text-xs space-y-2">
                  <div className="flex justify-between border-b border-stone-200/60 pb-1.5">
                    <span className="text-stone-500">Applicant:</span>
                    <strong className="text-stone-900">{courierProfile?.full_name || user.first_name || user.username}</strong>
                  </div>
                  <div className="flex justify-between border-b border-stone-200/60 pb-1.5">
                    <span className="text-stone-500">Phone:</span>
                    <span className="font-mono font-bold text-stone-800">{courierProfile?.phone_number || user.phone_number || 'Registered'}</span>
                  </div>
                  <div className="flex justify-between border-b border-stone-200/60 pb-1.5">
                    <span className="text-stone-500">Vehicle:</span>
                    <span className="font-mono font-bold text-stone-800">{courierProfile?.vehicle_type || 'BIKE'} ({courierProfile?.vehicle_number || 'N/A'})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Company:</span>
                    <span className="font-bold text-stone-800">{courierProfile?.courier_company || 'Independent'}</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={() => refreshUser()}
                    className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={14} />
                    <span>Check Approval Status</span>
                  </button>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {isSuspended && (
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mx-auto shadow-inner">
                  <Ban size={28} />
                </div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-900 border border-red-300 uppercase tracking-wide">
                  Account Suspended
                </span>
                <h2 className="font-serif text-xl font-bold text-stone-900">Delivery Privileges Suspended</h2>
                <p className="text-xs text-stone-600">
                  {courierProfile?.suspension_reason || 'Access has been suspended by the marketplace administrator.'}
                </p>
                <div className="pt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={logout}
                    className="px-5 py-2.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {isRejected && (
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-stone-200 text-stone-700 flex items-center justify-center mx-auto shadow-inner">
                  <XCircle size={28} />
                </div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-stone-200 text-stone-800 border border-stone-300 uppercase tracking-wide">
                  Application Declined
                </span>
                <h2 className="font-serif text-xl font-bold text-stone-900">Registration Not Approved</h2>
                <p className="text-xs text-stone-600">
                  {courierProfile?.rejection_reason || 'Your application did not satisfy fleet verification requirements.'}
                </p>
                <div className="pt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={logout}
                    className="px-5 py-2.5 bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}

            {!isPending && !isSuspended && !isRejected && (
              <div className="text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                  <AlertTriangle size={28} />
                </div>
                <h2 className="font-serif text-lg font-bold text-stone-900">Courier Account Required</h2>
                <p className="text-xs text-stone-600">
                  You are currently signed in as <strong>{user.username}</strong> ({user.role}). Delivery portal operations are restricted to approved courier personnel.
                </p>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => { logout(); setAuthTab('register'); }}
                    className="py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Register as Courier
                  </button>
                  <Link
                    to="/"
                    className="py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl text-center"
                  >
                    Return to Storefront
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW CASE 4: Authenticated & Approved Courier / Admin -> FULL PORTAL
  // ==========================================
  const courierDisplayName = courierProfile?.full_name || user.first_name || user.username;
  const courierVehicle = courierProfile?.vehicle_type || 'EXPRESS';

  return (
    <div className="min-h-screen bg-stone-100/90 text-stone-900 pb-16">
      {/* Top Header Bar for Delivery Fleet */}
      <div className="bg-red-600 text-white sticky top-0 z-30 shadow-md border-b border-red-700">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-700 text-white flex items-center justify-center font-bold shadow-inner">
              <Truck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm tracking-wide text-white uppercase">Wangs Express</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/20 text-white font-bold border border-white/30">
                  COURIER
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-700/80 text-emerald-100 border border-emerald-500/40 hidden sm:inline-flex items-center gap-1">
                  <ShieldCheck size={10} /> {courierDisplayName} ({courierVehicle})
                </span>
              </div>
              <p className="text-[10px] text-red-100">Direct Delivery & Customer Route Navigator</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startScanner}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-stone-50 text-red-600 font-bold text-xs shadow transition-all active:scale-95 cursor-pointer"
            >
              <QrCode size={16} />
              <span className="hidden sm:inline">Scan Pack QR</span>
            </button>

            {order && (
              <button
                type="button"
                onClick={() => {
                  setOrder(null);
                  setSearchParams({});
                  loadRecentParcels();
                }}
                className="p-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs transition-colors cursor-pointer"
                title="View All Parcels"
              >
                <ArrowLeft size={16} />
              </button>
            )}

            <button
              type="button"
              onClick={logout}
              className="p-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs transition-colors cursor-pointer"
              title="Logout from Courier Portal"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-4 sm:pt-6 space-y-4">
        {/* Quick Search & Barcode Input Card */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-stone-200/90 shadow-xs">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-center gap-2.5">
            <div className="relative flex-1 w-full">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                placeholder="Scan QR or enter Order # (e.g. WNG-20261026-0060E5) or AWB..."
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 sm:flex-initial px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Find Parcel'}
              </button>
              <button
                type="button"
                onClick={startScanner}
                className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl transition-colors shrink-0"
                title="Scan QR Code via Camera"
              >
                <Camera size={18} />
              </button>
            </div>
          </form>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs sm:text-sm flex items-start gap-3">
            <AlertTriangle size={18} className="shrink-0 text-red-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Parcel Not Found</p>
              <p className="text-red-700 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-stone-400 hover:text-stone-600"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Active Order Details View */}
        {order ? (
          <div className="space-y-4">
            {/* Order Status & Key Highlights Banner */}
            <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-black text-base text-stone-950">{order.order_number}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                      order.status === 'DELIVERED'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : order.status === 'DISPATCHED'
                        ? 'bg-purple-100 text-purple-900 border border-purple-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {order.status}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                      order.payment_status === 'PAID'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {order.payment_status === 'PAID' ? 'PREPAID' : `COD: ₹${order.total_amount}`}
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 flex items-center gap-2 flex-wrap">
                  <span>AWB: <strong className="font-mono text-stone-700">{order.tracking_number || 'WNG-AIR-PRIORITY'}</strong></span>
                  <span>·</span>
                  <span>Courier: <strong className="text-stone-700">{order.courier_partner}</strong></span>
                </div>
              </div>

              {/* Action: Mark as Delivered */}
              {order.status !== 'DELIVERED' ? (
                <button
                  type="button"
                  onClick={() => setShowDeliveredModal(true)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Mark as Delivered</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>Delivered to Customer</span>
                </div>
              )}
            </div>

            {/* Split Grid: Customer Address & Live Location Map */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Customer Destination & Contact Details */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
                  <MapPin size={18} className="text-red-600 shrink-0" />
                  <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">Delivery Destination</h3>
                </div>

                {/* Customer Contact */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2">
                  <div>
                    <span className="text-[10px] font-mono text-stone-500 uppercase block">Recipient</span>
                    <span className="text-sm font-bold text-stone-950">{order.customer_name}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-stone-200/60">
                    <div>
                      <span className="text-[10px] font-mono text-stone-500 uppercase block">Phone</span>
                      <span className="text-xs font-mono font-bold text-stone-900">{order.customer_phone}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${order.customer_phone}`}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors shadow-2xs"
                      >
                        <Phone size={13} />
                        <span>Call</span>
                      </a>
                      {order.customer_phone && (
                        <a
                          href={`https://wa.me/${getCleanPhone(order.customer_phone)}?text=Hello%20${encodeURIComponent(order.customer_name)},%20your%20Wangs%20artisan%20pickle%20parcel%20is%20arriving%20now!`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors shadow-2xs"
                        >
                          <MessageSquare size={13} />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Street Address */}
                <div className="space-y-1 text-xs text-stone-800 leading-relaxed">
                  <span className="text-[10px] font-mono text-stone-500 uppercase block">Delivery Address</span>
                  <p className="font-medium text-stone-900">{order.shipping_address_line1}</p>
                  {order.shipping_address_line2 && (
                    <p className="text-stone-700">{order.shipping_address_line2}</p>
                  )}
                  <p className="font-bold text-stone-900 pt-1">
                    {order.shipping_city}, {order.shipping_state} - <span className="bg-amber-100 text-amber-950 px-1.5 py-0.5 rounded font-mono">{order.shipping_postal_code}</span>
                  </p>
                </div>

                {/* Package & Logistics Details */}
                <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Courier Network:</span>
                    <span className="font-bold text-stone-900">{order.courier_partner || 'SwiftZone Express'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Delivery Method:</span>
                    <span className="font-bold text-stone-800">{order.shipping_delivery_method || 'Standard Delivery'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Packages:</span>
                    <span className="font-mono font-bold text-stone-900">
                      {order.shipping_package_count || 1} Box{(order.shipping_package_count || 1) > 1 ? 'es' : ''}
                    </span>
                  </div>
                  {order.shipping_estimated_delivery && (
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500">Delivery Window:</span>
                      <span className="text-stone-700 font-medium">{order.shipping_estimated_delivery}</span>
                    </div>
                  )}
                </div>

                {/* Dispatch Notes / Delivery Landmark */}
                {order.dispatch_notes && (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900">
                    <span className="font-bold block uppercase text-[9px] text-amber-800 mb-0.5">Delivery Instructions:</span>
                    <p className="whitespace-pre-line">{order.dispatch_notes}</p>
                  </div>
                )}

                {/* External GPS Navigation Buttons */}
                <div className="pt-2 space-y-2">
                  <a
                    href={order.maps_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.formatted_address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 transition-all shadow-xs"
                  >
                    <Navigation size={15} />
                    <span>Navigate in Google Maps (GPS)</span>
                    <ExternalLink size={13} />
                  </a>

                  <a
                    href={`https://maps.apple.com/?q=${encodeURIComponent(order.formatted_address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Compass size={14} />
                    <span>Open in Apple Maps</span>
                  </a>
                </div>
              </div>

              {/* Customer Location in Map */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <Navigation size={18} className="text-red-600 shrink-0" />
                    <div>
                      <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">Live Customer Map Location</h3>
                      <p className="text-[10px] text-stone-500">Destination coordinates: {order.coordinates?.lat.toFixed(4)}, {order.coordinates?.lng.toFixed(4)}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-stone-100 text-stone-700 text-[10px] font-mono rounded font-bold">
                    {order.shipping_city}
                  </span>
                </div>

                {/* Embedded Interactive Map */}
                <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
                  <iframe
                    title="Customer Delivery Destination Map"
                    className="w-full h-full border-0"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${(order.coordinates?.lng || 94.1086) - 0.035}%2C${(order.coordinates?.lat || 25.6751) - 0.025}%2C${(order.coordinates?.lng || 94.1086) + 0.035}%2C${(order.coordinates?.lat || 25.6751) + 0.025}&layer=mapnik&marker=${order.coordinates?.lat || 25.6751}%2C${order.coordinates?.lng || 94.1086}`}
                  />
                  <div className="absolute top-2 left-2 bg-white px-2.5 py-1 rounded-lg text-[10px] font-bold text-stone-900 shadow-sm border border-stone-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span>Customer Destination Marker</span>
                  </div>
                </div>

                {/* Quick Map Location Footer Strip */}
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 text-stone-700">
                    <Compass size={14} className="text-red-600" />
                    <span className="text-[11px] font-medium truncate max-w-xs">{order.formatted_address}</span>
                  </div>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(order.formatted_address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-red-600 hover:text-red-700 font-bold text-[11px] inline-flex items-center gap-1 underline"
                  >
                    <span>Get Turn-by-Turn Route</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>

            {/* Customer Products in Parcel */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-red-600" />
                  <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">
                    Customer Products in Parcel ({order.total_items_count || order.items?.length || 0} Units)
                  </h3>
                </div>
                <span className="text-xs font-mono font-bold text-red-600">
                  Total Value: ₹{order.total_amount}
                </span>
              </div>

              {/* Products List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {order.items?.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-start gap-3 relative"
                  >
                    {item.product_image ? (
                      <img
                        src={item.product_image}
                        alt={item.product_title}
                        className="w-14 h-14 rounded-lg object-cover border border-stone-200 shrink-0 bg-white"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-stone-200 flex items-center justify-center shrink-0 text-stone-400">
                        <Package size={22} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-0.5 text-xs">
                      <h4 className="font-bold text-stone-900 leading-snug truncate" title={item.product_title}>
                        {item.product_title}
                      </h4>
                      {item.brand_name && (
                        <p className="text-[10px] text-stone-500 truncate">{item.brand_name}</p>
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-stone-600 pt-0.5">
                        <span className="font-semibold text-stone-900">Qty: {item.quantity}</span>
                        <span>·</span>
                        <span>{item.weight_grams}g Pack</span>
                      </div>
                      <div className="flex items-center justify-between gap-1 pt-1 font-mono">
                        <span className="text-[10px] text-stone-500">₹{item.unit_price} each</span>
                        <span className="font-bold text-red-600">₹{item.subtotal}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Packaging Advisory */}
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-[11px] text-stone-800 flex items-center gap-2.5">
                <Package size={18} className="text-forest-800 shrink-0" />
                <div>
                  <span className="font-bold uppercase tracking-wider text-forest-950">Food Package: </span>
                  <span>Authentic artisanal food package. Handle with care and verify tamper-evident seal is intact upon customer handoff.</span>
                </div>
              </div>
            </div>

            {/* Individual Product Units & Wangs Rewards Confirmation */}
            {order.units && order.units.length > 0 && (
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-xs space-y-4">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} className="text-amber-500" />
                    <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">
                      Individual Product Units &amp; Wangs Rewards Confirmation ({order.units.length} Units)
                    </h3>
                  </div>
                  <span className="text-[11px] text-stone-500 font-semibold bg-stone-100 px-2.5 py-1 rounded-full">
                    Dual Confirmation Supported
                  </span>
                </div>

                <div className="space-y-2.5">
                  {order.units.map((u) => {
                    const source = u.confirmation_source;
                    const sourceLabel = u.confirmation_source_display || (source === 'CUSTOMER_QR' ? 'Customer QR Scan' : source === 'COURIER' ? 'Courier Confirmation' : source === 'BOTH' ? 'Both Confirmed' : 'Pending');

                    return (
                      <div key={u.id} className="p-3 bg-stone-50/80 rounded-xl border border-stone-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900">{u.product_title}</span>
                            <span className="font-mono text-[10px] text-stone-500 bg-stone-200/60 px-1.5 py-0.5 rounded">
                              Unit #{u.unit_index} · {u.unit_uid}
                            </span>
                          </div>
                          <div className="text-[11px] text-stone-500">
                            {u.is_delivered ? (
                              <span className="text-emerald-700 font-semibold">
                                ✓ Confirmed Delivered {u.delivered_at ? new Date(u.delivered_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            ) : (
                              <span className="text-amber-700 font-semibold">Pending Delivery</span>
                            )}
                            {u.reward_awarded && (
                              <span className="ml-2 text-stone-600">· 1 Wangs Credit Awarded</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Confirmation Source Badge */}
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            source === 'BOTH'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : source === 'CUSTOMER_QR'
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                              : source === 'COURIER'
                              ? 'bg-blue-100 text-blue-900 border border-blue-200'
                              : 'bg-stone-200 text-stone-600'
                          }`}>
                            {u.is_delivered && <CheckCircle size={11} />}
                            <span>{sourceLabel}</span>
                          </span>

                          {!u.is_delivered && (
                            <button
                              type="button"
                              disabled={isMarkingDelivered}
                              onClick={() => handleConfirmSingleUnit(u.id)}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold rounded-lg shadow-2xs transition-colors cursor-pointer"
                            >
                              Mark Delivered
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Empty or Fleet Overview: Recent Active Dispatches */
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-stone-200/90 shadow-xs text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-red-600 text-white flex items-center justify-center mx-auto shadow-md">
                <QrCode size={34} />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h2 className="text-lg sm:text-xl font-serif font-bold text-stone-900">
                  Scan Parcel QR Code
                </h2>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Scan the delivery QR code on any item's packing label to view customer products, address, and live map navigation.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={startScanner}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 inline-flex items-center gap-2 cursor-pointer"
                >
                  <Camera size={18} />
                  <span>Open Camera Scanner</span>
                </button>
              </div>
            </div>

            {/* Recent / Active Out-for-Delivery Parcels */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/90 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <Truck size={17} className="text-red-600" />
                  <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">
                    Recent Dispatches & Delivery Queue
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={loadRecentParcels}
                  className="p-1 text-stone-400 hover:text-stone-700 transition-colors"
                  title="Refresh Queue"
                >
                  <RefreshCw size={14} className={loadingRecent ? 'animate-spin' : ''} />
                </button>
              </div>

              {recentParcels.length > 0 ? (
                <div className="divide-y divide-stone-100">
                  {recentParcels.map((p) => (
                    <div
                      key={p.order_number}
                      onClick={() => loadOrder(p.order_number)}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-stone-50/80 px-2 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-stone-900">{p.order_number}</span>
                          <span
                            className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase ${
                              p.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600">
                          <strong>{p.customer_name}</strong> · {p.shipping_city} ({p.shipping_postal_code})
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-stone-900 block">₹{p.total_amount}</span>
                        <span className="text-[10px] text-stone-400">{p.items_count} items</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 text-center py-4">
                  {loadingRecent ? 'Loading dispatch queue...' : 'No orders in queue. Scan parcel QR code to inspect.'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Camera QR Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-stone-900 text-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-700 flex flex-col">
            <div className="p-4 border-b border-stone-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-amber-400" />
                <h3 className="font-bold text-sm uppercase tracking-wide">Scan Pack QR Code</h3>
              </div>
              <button
                type="button"
                onClick={stopScanner}
                className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Video Viewfinder */}
            <div className="relative bg-black w-full aspect-square flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Reticle */}
              <div className="absolute inset-8 border-2 border-dashed border-amber-400 rounded-2xl pointer-events-none flex items-center justify-center">
                <div className="w-16 h-16 border-2 border-amber-400/60 rounded-lg animate-pulse" />
              </div>

              <div className="absolute bottom-3 left-3 right-3 bg-stone-900/95 px-3 py-1.5 rounded-xl text-center text-xs text-cream-100 shadow-md">
                {scannerStatus}
              </div>
            </div>

            {/* Fallback Manual / File Upload in Modal */}
            <div className="p-4 bg-stone-950 space-y-3 text-xs">
              <p className="text-stone-400 text-center text-[11px]">
                Align parcel QR code in the box, or enter order number below:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. WNG-20261026-0060E5"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      stopScanner();
                      loadOrder(e.target.value.trim());
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl font-mono text-white placeholder-stone-500 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <button
                  type="button"
                  onClick={stopScanner}
                  className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mark Delivered Modal */}
      {showDeliveredModal && order && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 size={26} />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-900">Confirm Parcel Delivery</h3>
              <p className="text-xs text-stone-500">
                You are marking order <strong>{order.order_number}</strong> as delivered to <strong>{order.customer_name}</strong>.
              </p>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1 text-stone-700">
              <p><MapPin size={13} className="inline text-stone-600 mr-1" /><strong>Destination:</strong> {order.formatted_address}</p>
              <p><Package size={13} className="inline text-stone-600 mr-1" /><strong>Products:</strong> {order.total_items_count} items</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Delivery Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="e.g. Handed over to recipient, security gate, or signature collected..."
                className="w-full p-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeliveredModal(false)}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isMarkingDelivered}
                onClick={handleConfirmDelivery}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isMarkingDelivered ? (
                  <span>Updating...</span>
                ) : (
                  <>
                    <Check size={14} />
                    <span>Confirm Delivered</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
