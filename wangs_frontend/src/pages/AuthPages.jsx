import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowRight, Mail, KeyRound, CheckCircle, ShieldCheck, AlertCircle, MapPin, X, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api } from '../api';

export default function AuthPage() {
  const { login, register, resetPassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [isLogin, setIsLogin] = useState(searchParams.get('tab') !== 'register');
  const [showForgotPassword, setShowForgotPassword] = useState(searchParams.get('tab') === 'forgot-password');

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetOtpCode, setResetOtpCode] = useState('');
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [resetConfirmPasswordVal, setResetConfirmPasswordVal] = useState('');
  const [resetOtpSent, setResetOtpSent] = useState(false);
  const [resetOtpLoading, setResetOtpLoading] = useState(false);
  const [resetTimer, setResetTimer] = useState(0);
  const [resetSubmitting, setResetSubmitting] = useState(false);

  // Account already exists state banner
  const [existingAccountEmail, setExistingAccountEmail] = useState('');

  // Customer registration OTP verification state
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);

  // Post-registration Address Popup modal state
  const [showAddressPopup, setShowAddressPopup] = useState(false);
  const [addressSavedSuccess, setAddressSavedSuccess] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [popupAddress, setPopupAddress] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    is_default: true,
  });

  // Standard form state (Clean & fast signup: No address fields required on signup)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Handle countdown timer for Password Reset OTP resend
  useEffect(() => {
    let interval = null;
    if (resetTimer > 0) {
      interval = setInterval(() => {
        setResetTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resetTimer]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Reset OTP verification if email is edited during registration
    if (name === 'email') {
      setExistingAccountEmail('');
      if (otpVerified) {
        setOtpVerified(false);
        setOtpSent(false);
        setOtpCode('');
      }
    }
  };

  const handleSendCustomerOtp = async (e) => {
    if (e) e.preventDefault();
    const email = (formData.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setError('Please provide a valid Gmail / email address to receive your verification OTP.');
      return;
    }
    setOtpLoading(true);
    setError('');
    setSuccessMsg('');
    setExistingAccountEmail('');

    try {
      const res = await api.sendOtp(email, 'REGISTER');
      setOtpSent(true);
      setOtpTimer(60);
      if (res?.delivered_via_email === false) {
        setError(res?.warning || 'Notice: Email delivery credentials are not yet configured in wangs_backend/.env.');
      } else {
        setSuccessMsg(res?.message || `A 6-digit OTP verification code has been dispatched to ${email}. Please check your Gmail inbox.`);
      }
    } catch (err) {
      const msg = err.message || '';
      if (err.account_exists || msg.toLowerCase().includes('already created') || msg.toLowerCase().includes('already exist')) {
        setExistingAccountEmail(email);
        setError(`An account is already created with this email (${email}). Please sign in or use "Forgot Password".`);
      } else {
        setError(msg || 'Failed to dispatch OTP email. Please verify your email and try again.');
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyCustomerOtp = async (e) => {
    if (e) e.preventDefault();
    const email = (formData.email || '').trim().toLowerCase();
    const code = (otpCode || '').trim();
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit OTP verification code.');
      return;
    }
    setOtpLoading(true);
    setError('');

    try {
      await api.verifyOtp(email, code, 'REGISTER');
      setOtpVerified(true);
      setSuccessMsg(`Email ${email} verified successfully! You can now complete registration.`);
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP code. Please check your inbox or request a new code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSendResetOtp = async (e) => {
    if (e) e.preventDefault();
    const email = (resetEmail || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setError('Please provide a valid email address to receive your password reset OTP.');
      return;
    }
    setResetOtpLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api.sendOtp(email, 'RESET_PASSWORD');
      setResetOtpSent(true);
      setResetTimer(60);
      if (res?.delivered_via_email === false) {
        setError(res?.warning || 'Notice: Email delivery credentials are not yet configured in wangs_backend/.env.');
      } else {
        setSuccessMsg(res?.message || `A 6-digit password reset OTP has been dispatched to ${email}. Please check your Gmail inbox.`);
      }
    } catch (err) {
      setError(err.message || 'Failed to dispatch password reset code. Please check your email.');
    } finally {
      setResetOtpLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    const email = (resetEmail || '').trim().toLowerCase();
    const code = (resetOtpCode || '').trim();
    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }
    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit verification code sent to your email.');
      return;
    }
    if (!resetPasswordVal || resetPasswordVal.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (resetPasswordVal !== resetConfirmPasswordVal) {
      setError('Passwords do not match. Please re-enter your password to confirm.');
      return;
    }

    setResetSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await resetPassword({
        email,
        otp_code: code,
        password: resetPasswordVal,
        confirm_password: resetConfirmPasswordVal
      });
      toast.success('Password has been successfully updated! You are now logged in.');
      if (res.user?.role === 'ADMIN') {
        navigate('/admin');
      } else if (res.user?.role === 'MANUFACTURER') {
        navigate('/manufacturer');
      } else {
        navigate('/account');
      }
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please check your OTP code and try again.');
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Direct password login (No OTP in login)
        const loggedInUser = await login(formData.username, formData.password);
        if (loggedInUser.role === 'ADMIN') {
          navigate('/admin');
        } else if (loggedInUser.role === 'MANUFACTURER') {
          navigate('/manufacturer');
        } else {
          navigate('/account');
        }
      } else {
        // Customer Sign Up: Email OTP verification is mandatory
        if (!otpVerified) {
          setError('Gmail / Email verification is mandatory. Please click "Send OTP" and enter the 6-digit code sent to your email.');
          setLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters.');
          setLoading(false);
          return;
        }
        if (formData.password !== formData.confirm_password) {
          setError('Passwords do not match. Please re-enter your password to confirm.');
          setLoading(false);
          return;
        }
        await register(formData);
        // Customer account successfully registered and authenticated!
        // Launch delivery address setup popup modal
        setPopupAddress({
          full_name: `${formData.first_name || ''} ${formData.last_name || ''}`.trim(),
          phone: formData.phone_number || '',
          address_line1: '',
          address_line2: '',
          city: '',
          state: '',
          postal_code: '',
          is_default: true,
        });
        setShowAddressPopup(true);
      }
    } catch (err) {
      const msg = err.message || '';
      if (err.account_exists || msg.toLowerCase().includes('already created') || msg.toLowerCase().includes('already exist')) {
        setExistingAccountEmail(formData.email);
        setError(`An account is already created with this email (${formData.email}). Please sign in or use "Forgot Password".`);
      } else {
        setError(msg || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSavePopupAddress = async (e) => {
    e.preventDefault();
    if (!popupAddress.address_line1 || !popupAddress.city || !popupAddress.state || !popupAddress.postal_code) {
      setAddressError('Please provide your street address, city, state, and 6-digit PIN code.');
      return;
    }
    if (popupAddress.postal_code.trim().length !== 6) {
      setAddressError('Please enter a valid 6-digit PIN code.');
      return;
    }
    setAddressLoading(true);
    setAddressError('');
    try {
      await api.createAddress(popupAddress);
      setAddressSavedSuccess(true);
      setTimeout(() => {
        setShowAddressPopup(false);
        navigate('/account');
      }, 1200);
    } catch (err) {
      setAddressError(err.message || 'Failed to save address. You can also add it during checkout.');
    } finally {
      setAddressLoading(false);
    }
  };

  const handleSkipAddress = () => {
    setShowAddressPopup(false);
    navigate('/account');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <div className="bg-white p-7 sm:p-9 rounded-3xl border border-stone-200/90 shadow-xl space-y-6">
        {/* Brand Crest Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-3 mb-2 group select-none">
            <img
              src="/logo.png"
              alt="Wangs"
              className="h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <span className="font-brand font-black text-2xl sm:text-[1.85rem] tracking-[0.14em] leading-none text-forest-950 uppercase group-hover:text-forest-800 transition-colors">
              Wangs
            </span>
          </Link>
          <p className="text-xs text-stone-500 font-medium">
            Artisanal Food & Handcrafted Pickles
          </p>
        </div>

        {/* Tab switch / Header */}
        {!showForgotPassword ? (
          <div className="grid grid-cols-2 bg-stone-100 p-1 rounded-2xl text-xs font-semibold text-stone-600">
            <button
              type="button"
              onClick={() => { setIsLogin(true); setError(''); setSuccessMsg(''); setExistingAccountEmail(''); }}
              className={`py-2.5 rounded-xl transition-all cursor-pointer ${isLogin ? 'bg-white text-forest-950 shadow-sm font-bold' : 'hover:text-stone-900'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setIsLogin(false); setError(''); setSuccessMsg(''); setExistingAccountEmail(''); }}
              className={`py-2.5 rounded-xl transition-all cursor-pointer ${!isLogin ? 'bg-white text-forest-950 shadow-sm font-bold' : 'hover:text-stone-900'}`}
            >
              Create Account
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between pb-1 border-b border-stone-100">
            <button
              type="button"
              onClick={() => { setShowForgotPassword(false); setError(''); setSuccessMsg(''); }}
              className="text-stone-500 hover:text-stone-900 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>← Back to Sign In</span>
            </button>
            <span className="text-[11px] font-semibold text-forest-800 bg-forest-50 px-2.5 py-0.5 rounded-full border border-forest-200">
              Password Recovery
            </span>
          </div>
        )}

        {/* Existing Account Notice Banner */}
        {existingAccountEmail && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 text-stone-900 text-xs rounded-2xl space-y-2.5 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950 text-xs">Account Already Created</p>
                <p className="text-stone-700 text-[11px] mt-0.5 leading-relaxed">
                  An account is already created with this email (<strong className="font-mono text-stone-900">{existingAccountEmail}</strong>).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-amber-200/80">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(true);
                  setShowForgotPassword(false);
                  setFormData((prev) => ({ ...prev, username: existingAccountEmail }));
                  setExistingAccountEmail('');
                  setError('');
                  setSuccessMsg('Please enter your password to sign in.');
                }}
                className="px-3.5 py-1.5 bg-forest-900 hover:bg-forest-950 text-white rounded-xl font-bold text-[11px] shadow-2xs transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Sign In Now</span>
                <ArrowRight size={12} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setResetEmail(existingAccountEmail);
                  setExistingAccountEmail('');
                  setError('');
                  setSuccessMsg('');
                }}
                className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-800 rounded-xl font-bold text-[11px] border border-stone-200 transition-all cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
          </div>
        )}

        {error && !existingAccountEmail && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-start gap-2">
            <CheckCircle size={15} className="flex-shrink-0 text-emerald-600 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. Password Reset Form */}
        {showForgotPassword && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
            <div className="text-center pb-1">
              <div className="w-12 h-12 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-2xs">
                <KeyRound size={22} />
              </div>
              <h2 className="font-serif font-bold text-lg text-stone-900">
                Reset Your Password
              </h2>
              <p className="text-stone-500 text-[11px] mt-1 max-w-xs mx-auto">
                Enter your registered email address to receive a secure 6-digit verification code.
              </p>
            </div>

            {/* Email + Send OTP Button */}
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Registered Email Address *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={16} className="absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800 font-medium"
                  />
                </div>
                <button
                  type="button"
                  disabled={resetOtpLoading || resetTimer > 0}
                  onClick={handleSendResetOtp}
                  className="px-3.5 py-2.5 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl transition-all disabled:opacity-50 shrink-0 cursor-pointer shadow-2xs"
                >
                  {resetOtpLoading ? 'Sending...' : resetTimer > 0 ? `Resend (${resetTimer}s)` : 'Send Code'}
                </button>
              </div>
            </div>

            {/* 6-Digit Verification Code */}
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                6-Digit Email Verification Code *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={resetOtpCode}
                onChange={(e) => setResetOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Enter 6-digit code from email"
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800 font-mono text-center tracking-widest text-sm"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                New Password (minimum 6 characters) *
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="password"
                  required
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800 font-medium"
                />
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Confirm New Password *
              </label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="password"
                  required
                  value={resetConfirmPasswordVal}
                  onChange={(e) => setResetConfirmPasswordVal(e.target.value)}
                  placeholder="Re-enter new password to confirm"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800 font-medium"
                />
              </div>
            </div>

            {/* Submit Reset */}
            <button
              type="submit"
              disabled={resetSubmitting}
              className="w-full py-3 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{resetSubmitting ? 'Resetting Password...' : 'Reset Password & Sign In'}</span>
              <ArrowRight size={15} />
            </button>

            {/* Back to Sign In */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                  setSuccessMsg('');
                }}
                className="text-stone-500 hover:text-stone-900 font-bold text-[11px] cursor-pointer"
              >
                ← Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* 2. Direct Password Login Form (No OTP in Login) */}
        {!showForgotPassword && isLogin && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Username or Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="text"
                  required
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Username or registered email"
                  autoComplete="username"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-800 font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-stone-700 font-semibold">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setResetEmail(formData.username.includes('@') ? formData.username : '');
                    setError('');
                    setSuccessMsg('');
                    setExistingAccountEmail('');
                  }}
                  className="text-[11px] text-forest-800 hover:text-forest-950 font-bold hover:underline cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3.5 top-3 text-stone-400" />
                <input
                  type="password"
                  required
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-forest-800/20 focus:border-forest-800 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight size={15} />
            </button>

            <div className="text-center pt-2">
              <p className="text-[11px] text-stone-500">
                Don’t have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsLogin(false); setShowForgotPassword(false); setError(''); setSuccessMsg(''); setExistingAccountEmail(''); }}
                  className="text-forest-900 font-bold hover:underline cursor-pointer"
                >
                  Create an Account
                </button>
              </p>
            </div>
          </form>
        )}

        {/* 3. Customer Sign Up Form (Mandatory Gmail / Email OTP) */}
        {!showForgotPassword && !isLogin && (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="e.g. Arenla"
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-semibold mb-1">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  placeholder="e.g. Ao"
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                />
              </div>
            </div>

            {/* Email OTP Verification Block */}
            <div>
              <label className="block text-stone-700 font-semibold mb-1">
                Gmail / Email Address *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail size={16} className="absolute left-3.5 top-3 text-stone-400" />
                  <input
                    type="email"
                    required
                    name="email"
                    disabled={otpVerified}
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. shopper@gmail.com"
                    className={`w-full pl-10 pr-3 py-2.5 bg-stone-50 border rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800 ${
                      otpVerified ? 'border-emerald-400 bg-emerald-50/50' : 'border-stone-200'
                    }`}
                  />
                </div>
                {!otpVerified ? (
                  <button
                    type="button"
                    disabled={otpLoading || !formData.email || !formData.email.includes('@')}
                    onClick={handleSendCustomerOtp}
                    className="px-3.5 py-2.5 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl text-xs whitespace-nowrap transition-colors disabled:opacity-50"
                  >
                    {otpLoading ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP'}
                  </button>
                ) : (
                  <span className="px-3.5 py-2.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-1.5 whitespace-nowrap">
                    <CheckCircle size={14} className="text-emerald-700" /> Verified
                  </span>
                )}
              </div>

              {/* OTP Code Entry Popover */}
              {otpSent && !otpVerified && (
                <div className="mt-2.5 p-3.5 bg-forest-50/80 border border-forest-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-forest-950">
                      Enter 6-digit OTP sent to {formData.email}:
                    </span>
                    {otpTimer > 0 && (
                      <span className="text-[10px] text-stone-500 font-medium">Resend in {otpTimer}s</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit OTP"
                      className="w-36 px-3 py-1.5 bg-white border border-forest-600 rounded-xl text-center font-mono text-xs font-bold tracking-wider text-stone-900"
                    />
                    <button
                      type="button"
                      disabled={otpLoading || otpCode.length !== 6}
                      onClick={handleVerifyCustomerOtp}
                      className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {otpLoading ? 'Verifying...' : 'Confirm OTP'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-stone-700 font-semibold mb-1">Mobile Phone *</label>
              <input
                type="tel"
                required
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
              />
            </div>

            {/* Delivery address info notice (not required during signup) */}
            <div className="bg-cream-50/80 border border-stone-200/80 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-stone-600">
              <MapPin size={16} className="text-forest-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-800">Delivery Address</span>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  No address needed now. You can set it in a quick popup right after signup or save it at checkout.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Create Password *
                </label>
                <input
                  type="password"
                  required
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Creating Account...' : 'Complete Registration'}</span>
              <ArrowRight size={15} />
            </button>
          </form>
        )}

        {/* Security badge footer */}
        <div className="pt-2 border-t border-stone-100 flex items-center justify-center gap-2 text-[11px] text-stone-500">
          <ShieldCheck size={14} className="text-forest-700" />
          <span>Secured with Gmail / Email OTP & 256-Bit SSL Encryption</span>
        </div>
      </div>

      {/* Post-Registration Address Setup Popup Modal */}
      {showAddressPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-white w-full max-w-lg rounded-3xl p-5 sm:p-7 shadow-2xl border border-stone-200 relative animate-scale-up max-h-[92vh] overflow-y-auto">
            <button
              onClick={handleSkipAddress}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-forest-100 flex items-center justify-center text-forest-800 shrink-0">
                <MapPin size={24} />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-stone-900">Welcome to Wangs!</h3>
                <p className="text-xs text-stone-500">Account verified and created successfully</p>
              </div>
            </div>

            {addressSavedSuccess ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle size={48} className="text-emerald-600 mx-auto" />
                <h4 className="font-bold text-base text-stone-900">Delivery Address Saved!</h4>
                <p className="text-xs text-stone-500">Taking you to your dashboard...</p>
              </div>
            ) : (
              <form onSubmit={handleSavePopupAddress} className="space-y-3.5 text-xs">
                <div className="bg-cream-50 p-3 rounded-xl border border-stone-200/70 text-stone-700">
                  <p className="font-medium text-stone-800 mb-0.5">Where should we deliver your pickles?</p>
                  <p className="text-[11px] text-stone-500">
                    You can set your primary address now for quick 1-click checkout, or skip and add it whenever you place an order.
                  </p>
                </div>

                {addressError && (
                  <div className="p-3 bg-red-50 text-red-700 rounded-xl flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{addressError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Street Address, House No. *</label>
                  <input
                    type="text"
                    required
                    value={popupAddress.address_line1}
                    onChange={(e) => setPopupAddress({ ...popupAddress, address_line1: e.target.value })}
                    placeholder="House / flat number and street name"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Apartment, Landmark, Ward (Optional)</label>
                  <input
                    type="text"
                    value={popupAddress.address_line2}
                    onChange={(e) => setPopupAddress({ ...popupAddress, address_line2: e.target.value })}
                    placeholder="e.g. Near Kohima War Cemetery or Landmark"
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">City / Town *</label>
                    <input
                      type="text"
                      required
                      value={popupAddress.city}
                      onChange={(e) => setPopupAddress({ ...popupAddress, city: e.target.value })}
                      placeholder="Kohima"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">State *</label>
                    <input
                      type="text"
                      required
                      value={popupAddress.state}
                      onChange={(e) => setPopupAddress({ ...popupAddress, state: e.target.value })}
                      placeholder="Nagaland"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">PIN (6 digits) *</label>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      maxLength={6}
                      value={popupAddress.postal_code}
                      onChange={(e) =>
                        setPopupAddress({
                          ...popupAddress,
                          postal_code: e.target.value.replace(/\D/g, '').slice(0, 6),
                        })
                      }
                      placeholder="797001"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono text-center text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-800"
                    />
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="submit"
                    disabled={addressLoading}
                    className="w-full py-3 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{addressLoading ? 'Saving Address...' : 'Save Delivery Address'}</span>
                    <ArrowRight size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipAddress}
                    className="w-full py-2 text-stone-500 hover:text-stone-800 font-medium rounded-xl text-center text-xs transition-colors"
                  >
                    I'll add it later at checkout &rarr;
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
