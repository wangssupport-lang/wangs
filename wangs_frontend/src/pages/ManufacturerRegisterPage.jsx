import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, ShieldCheck, CheckCircle, AlertCircle, ArrowRight, Lock, Mail, Clock, Sparkles, Eye, EyeOff, FileText, Landmark } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

function checkEmailTypo(email) {
  if (!email || !email.includes('@')) return null;
  const parts = email.split('@');
  if (parts.length !== 2) return null;
  const domain = parts[1].toLowerCase().trim();
  const commonTypos = {
    'gmial.com': 'gmail.com',
    'gamil.com': 'gmail.com',
    'gmaill.com': 'gmail.com',
    'gemail.com': 'gmail.com',
    'gmai.com': 'gmail.com',
    'yaho.com': 'yahoo.com',
    'yahooo.com': 'yahoo.com',
    'hotmial.com': 'hotmail.com',
    'outlok.com': 'outlook.com',
  };
  if (commonTypos[domain]) {
    return `${parts[0]}@${commonTypos[domain]}`;
  }
  return null;
}

function formatCountdown(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '00:00';
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export default function ManufacturerRegisterPage() {
  const navigate = useNavigate();
  const { user, isAuthorizedToSell, isManufacturer, allowSellerRegistration, refreshUser } = useAuth();

  // Full onboarding form data (for authorized users)
  const [formData, setFormData] = useState({
    username: user && user.role !== 'ADMIN' ? user.username : '',
    email: user && user.role !== 'ADMIN' ? user.email : '',
    password: '',
    confirm_password: '',
    full_name: user && user.role !== 'ADMIN' ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '',
    business_name: '',
    brand_story: '',
    location_district: '',
    contact_email: user && user.role !== 'ADMIN' ? user.email : '',
    contact_phone: user?.phone_number || '',
    business_address: '',
    postal_code: '',
    fssai_license_number: '',
    gst_number: '',
    compliance_notes: '',
    bank_account_holder: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_name: '',
  });

  // Request Access form data (for unauthorized users)
  const [requestData, setRequestData] = useState({
    business_name: '',
    email: user && user.role !== 'ADMIN' ? user.email : '',
    password: '',
    confirm_password: '',
    phone: user?.phone_number || '',
    location_district: 'Kohima',
    fssai_number: '',
    bank_account_holder: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_name: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [showMfgPassword, setShowMfgPassword] = useState(false);
  const [showMfgConfirmPassword, setShowMfgConfirmPassword] = useState(false);
  const [showReqPassword, setShowReqPassword] = useState(false);
  const [showReqConfirmPassword, setShowReqConfirmPassword] = useState(false);
  const [appSubmitSuccess, setAppSubmitSuccess] = useState('');
  const [otpNotice, setOtpNotice] = useState('');
  const [reqOtpNotice, setReqOtpNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Resend OTP for seller email verification (authorized onboarding)
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpDeliveredLive, setOtpDeliveredLive] = useState(false);
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  const [otpExpiryTimer, setOtpExpiryTimer] = useState(0);

  // Dedicated OTP verification state for "Request Seller Authorization" form
  const [reqOtpSent, setReqOtpSent] = useState(false);
  const [reqOtpCode, setReqOtpCode] = useState('');
  const [reqOtpVerified, setReqOtpVerified] = useState(false);
  const [reqOtpLoading, setReqOtpLoading] = useState(false);
  const [reqOtpTimer, setReqOtpTimer] = useState(0);
  const [reqOtpExpiryTimer, setReqOtpExpiryTimer] = useState(0);

  // Timer countdown for producer onboarding OTP
  useEffect(() => {
    let interval = null;
    if (otpResendTimer > 0) {
      interval = setInterval(() => {
        setOtpResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpResendTimer]);

  useEffect(() => {
    let interval = null;
    if (otpExpiryTimer > 0) {
      interval = setInterval(() => {
        setOtpExpiryTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpExpiryTimer]);

  // Timer countdown for request OTP resend
  useEffect(() => {
    let interval = null;
    if (reqOtpTimer > 0) {
      interval = setInterval(() => {
        setReqOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [reqOtpTimer]);

  useEffect(() => {
    let interval = null;
    if (reqOtpExpiryTimer > 0) {
      interval = setInterval(() => {
        setReqOtpExpiryTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [reqOtpExpiryTimer]);

  // Sync user details when authenticated
  useEffect(() => {
    if (user && user.role !== 'ADMIN') {
      const email = user.email || '';
      const phone = user.phone_number || '';
      const fullName = (user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '');

      setRequestData((prev) => ({
        ...prev,
        email: prev.email || email,
        phone: prev.phone || phone,
        business_name: prev.business_name || fullName,
      }));

      setFormData((prev) => ({
        ...prev,
        username: prev.username || user.username || '',
        email: prev.email || email,
        contact_email: prev.contact_email || email,
        contact_phone: prev.contact_phone || phone,
        full_name: prev.full_name || fullName,
      }));

      if (email) {
        setReqOtpVerified(true);
      }
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendEmailOtp = async () => {
    const emailToVerify = (formData.contact_email || formData.email || '').trim().toLowerCase();
    if (!emailToVerify || !emailToVerify.includes('@')) {
      setErrorMsg('Please provide a valid contact email first.');
      return;
    }
    setOtpLoading(true);
    setErrorMsg('');
    setOtpNotice('');
    try {
      const res = await api.sendOtp(emailToVerify, 'SELLER');
      setOtpSent(true);
      setOtpResendTimer(60);
      setOtpExpiryTimer(600); // 10 minutes
      setOtpCode(''); // Always require manual entry from inbox
      setOtpDeliveredLive(Boolean(res?.delivered_via_email));
      setOtpNotice(res?.message || `A 6-digit verification code has been dispatched to ${emailToVerify}. Please check your inbox and spam folder.`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to dispatch email verification code. Please check your email.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (otpExpiryTimer <= 0) {
      setErrorMsg('Verification code has expired. Please click "Resend Code" to get a fresh code.');
      return;
    }
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMsg('Enter the 6-digit verification code.');
      return;
    }
    setOtpLoading(true);
    setErrorMsg('');
    try {
      const emailToVerify = (formData.contact_email || formData.email || '').trim().toLowerCase();
      await api.verifyOtp(emailToVerify, otpCode.trim(), 'SELLER');
      setOtpVerified(true);
      setOtpNotice(`Email ${emailToVerify} verified successfully!`);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSendRequestOtp = async (e) => {
    if (e) e.preventDefault();
    const emailToVerify = (requestData.email || '').trim().toLowerCase();
    if (!emailToVerify || !emailToVerify.includes('@')) {
      setErrorMsg('Please enter a valid Gmail / Email address to receive your verification code.');
      return;
    }
    setReqOtpLoading(true);
    setErrorMsg('');
    setReqOtpNotice('');
    try {
      const res = await api.sendOtp(emailToVerify, 'SELLER_REQUEST');
      setReqOtpSent(true);
      setReqOtpTimer(60);
      setReqOtpExpiryTimer(600); // 10 minutes
      setReqOtpCode(''); // Always require manual entry from inbox
      setReqOtpNotice(res?.message || `A 6-digit verification code has been dispatched directly to your entered email (${emailToVerify}). Please check that inbox (and spam folder).`);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to dispatch verification email. Please check your email and try again.');
    } finally {
      setReqOtpLoading(false);
    }
  };

  const handleVerifyRequestOtp = async (e) => {
    if (e) e.preventDefault();
    if (reqOtpExpiryTimer <= 0) {
      setErrorMsg('Verification code has expired. Please click "Resend OTP" to get a fresh code.');
      return;
    }
    if (!reqOtpCode || reqOtpCode.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }
    setReqOtpLoading(true);
    setErrorMsg('');
    try {
      const emailToVerify = (requestData.email || '').trim().toLowerCase();
      await api.verifyOtp(emailToVerify, reqOtpCode.trim(), 'SELLER_REQUEST');
      setReqOtpVerified(true);
      setReqOtpNotice(`Email ${emailToVerify} verified successfully! You can now submit your seller request.`);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired verification code. Please check your inbox or request a new code.');
    } finally {
      setReqOtpLoading(false);
    }
  };

  const handleRequestAuthorization = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!reqOtpVerified) {
      setErrorMsg('Gmail / Email verification is mandatory. Please click "Send OTP" and enter the 6-digit code sent to your email.');
      return;
    }

    if (!requestData.password || requestData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (requestData.password !== requestData.confirm_password) {
      setErrorMsg('Passwords do not match. Please re-enter your password to confirm.');
      return;
    }

    const fssai = (requestData.fssai_number || '').trim();
    if (!fssai || fssai.length !== 14 || !/^\d{14}$/.test(fssai)) {
      setErrorMsg('A valid 14-digit FSSAI Food Business License / Registration Number is mandatory. Please enter exactly 14 numeric digits.');
      return;
    }

    if (!requestData.bank_account_holder?.trim()) {
      setErrorMsg('Account holder name is required for payout settlement banking.');
      return;
    }

    if (!requestData.bank_name?.trim()) {
      setErrorMsg('Bank name is required for payout settlement banking.');
      return;
    }

    const acctNum = (requestData.bank_account_number || '').trim();
    if (!acctNum || acctNum.length < 6) {
      setErrorMsg('Please enter a valid bank account number (minimum 6 digits).');
      return;
    }

    const ifsc = (requestData.bank_ifsc_code || '').trim().toUpperCase();
    if (!ifsc || ifsc.length !== 11) {
      setErrorMsg('A valid 11-character Indian Financial System Code (IFSC) is mandatory (e.g. SBIN0000214).');
      return;
    }

    setLoading(true);
    try {
      await api.requestSellerAccess(requestData);
      try {
        localStorage.setItem('wangs_is_registered_seller', 'true');
        window.dispatchEvent(new Event('wangs_seller_status_changed'));
      } catch {}
      setRequestSuccess(true);
      if (refreshUser) refreshUser();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit seller access request.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!otpVerified) {
      setErrorMsg('Gmail / Email verification is mandatory. Please click "Verify Email" to receive and confirm the 6-digit OTP code before submitting your seller registration.');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    if (formData.password && formData.password !== formData.confirm_password) {
      setErrorMsg('Passwords do not match. Please re-enter your password to confirm.');
      return;
    }

    const fssai = (formData.fssai_license_number || '').trim();
    if (!fssai || fssai.length !== 14 || !/^\d{14}$/.test(fssai)) {
      setErrorMsg('A valid 14-digit FSSAI Food Business License Number is mandatory to create a seller account. Please enter exactly 14 numeric digits.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.registerManufacturer(formData);
      try {
        localStorage.setItem('wangs_is_registered_seller', 'true');
        window.dispatchEvent(new Event('wangs_seller_status_changed'));
      } catch {}
      setAppSubmitSuccess(res.message || 'Application submitted successfully! Our compliance team will review your details.');
      setTimeout(() => {
        navigate('/manufacturer');
      }, 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit application. Please check input fields.');
    } finally {
      setLoading(false);
    }
  };

  // If user is already an approved manufacturer, give shortcut to dashboard
  if (isManufacturer) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-md space-y-4">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <Store size={28} />
          </div>
          <h2 className="font-serif font-bold text-2xl text-stone-900">
            You Already Have an Active Seller Account
          </h2>
          <p className="text-xs text-stone-600">
            Your artisanal brand account is active. Access your orders, inventory, and settlements in the portal.
          </p>
          <Link
            to="/manufacturer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <span>Open Manufacturer Dashboard</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    );
  }

  // IF USER ALREADY SUBMITTED AN APPLICATION THAT IS CURRENTLY UNDER REVIEW:
  if (user?.has_pending_seller_request || user?.seller_request_status === 'PENDING') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
        <div className="bg-white p-7 sm:p-10 rounded-3xl border border-amber-200/90 shadow-xl space-y-6 text-center">
          <div className="w-16 h-16 bg-amber-50 text-amber-700 border border-amber-200 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
            <Clock size={28} className="animate-pulse" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800 bg-amber-100/80 px-3 py-1 rounded-full">
            Application Received · Under Administrator Review
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-2">
            Your Seller Application is Being Processed
          </h1>
          <p className="text-xs text-stone-600 max-w-lg mx-auto leading-relaxed">
            Thank you for applying to sell on Wangs! Our culinary curation and compliance team is reviewing your brand information and FSSAI credentials. Once authorized, you will receive an invitation email and direct access to your Seller Portal.
          </p>

          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 text-left max-w-md mx-auto space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-stone-200/60">
              <span className="text-stone-500">Applicant / Brand:</span>
              <span className="font-bold text-stone-800">{user?.seller_request_details?.business_name || user?.first_name || 'Artisan Producer'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-stone-200/60">
              <span className="text-stone-500">Contact Email:</span>
              <span className="font-mono text-stone-800">{user?.email}</span>
            </div>
            {user?.seller_request_details?.location_district && (
              <div className="flex justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-500">District:</span>
                <span className="font-medium text-stone-800">{user.seller_request_details.location_district}</span>
              </div>
            )}
            {user?.seller_request_details?.fssai_number && (
              <div className="flex justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-500">FSSAI Number:</span>
                <span className="font-mono text-stone-800">{user.seller_request_details.fssai_number}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-stone-500">Application Status:</span>
              <span className="font-bold text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full text-[11px] border border-amber-300">
                Awaiting Administrator Review
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/customer/account"
              className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors"
            >
              Go to Account
            </Link>
            <Link
              to="/"
              className="px-6 py-2.5 bg-[#9b4100] hover:bg-[#803300] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // IF SELLER REGISTRATION IS PAUSED BY ADMIN: Show onboarding closed notice
  if (!allowSellerRegistration && !isAuthorizedToSell) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-stone-200 shadow-xl space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-700 border border-amber-200 rounded-3xl flex items-center justify-center mx-auto mb-2">
            <Lock size={28} />
          </div>
          <h1 className="font-serif text-2xl font-bold text-stone-900">
            Producer Onboarding Paused
          </h1>
          <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
            New seller applications are currently paused while our culinary curation team processes active batch reviews. Please check back soon or return to the storefront.
          </p>
          <Link
            to="/"
            className="inline-block mt-4 px-6 py-2.5 bg-[#9b4100] text-white text-xs font-bold rounded-full shadow-sm hover:bg-[#bf550d] transition-all"
          >
            Return to Storefront
          </Link>
        </div>
      </div>
    );
  }

  // IF NOT AUTHORIZED BY ADMIN: Show restricted authorization gate
  if (!isAuthorizedToSell) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
        <div className="bg-white p-7 sm:p-10 rounded-3xl border border-stone-200/90 shadow-xl space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-700 border border-amber-200 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Lock size={28} />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-800 bg-amber-100/70 px-3 py-1 rounded-full">
              Exclusive Producer Collective · Admin Authorization Required
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-3">
              Sell with Us on Wangs
            </h1>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed max-w-lg mx-auto">
              To protect culinary authenticity and consumer trust, Wangs operates a curated marketplace.
              Seller onboarding is restricted to licensed producers and requires <strong>prior administrator authorization</strong>.
            </p>
          </div>

          {requestSuccess ? (
            <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <CheckCircle size={32} className="text-emerald-600 mx-auto" />
              <h3 className="font-serif font-bold text-base text-emerald-900">
                Authorization Request Submitted
              </h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                Thank you! Your seller application request has been delivered to the Wangs Administrator.
                Once reviewed and authorized, you will receive an invitation email to complete onboarding.
              </p>
              <Link
                to="/"
                className="inline-block mt-3 px-5 py-2 bg-emerald-800 text-white text-xs font-bold rounded-xl"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRequestAuthorization} className="space-y-4 text-xs pt-2">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-xs">
                <p className="font-semibold text-stone-900">Are you a handcrafted pickle brand or regional artisan seller?</p>
                <p className="mt-0.5 text-stone-500">
                  Fill in the quick details below to request authorization from the marketplace admin.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {reqOtpNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
                  <CheckCircle size={15} className="flex-shrink-0 text-emerald-600" />
                  <span>{reqOtpNotice}</span>
                </div>
              )}

              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Brand or Producer Name *
                </label>
                <input
                  type="text"
                  required
                  value={requestData.business_name}
                  onChange={(e) => setRequestData({ ...requestData, business_name: e.target.value })}
                  placeholder="e.g. Dzüko Valley Slow Pickles"
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
                />
              </div>

              {/* Contact Email with Live Email OTP Verification */}
              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Contact Email *
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail size={16} className="absolute left-3.5 top-3 text-stone-400" />
                    <input
                      type="email"
                      required
                      disabled={reqOtpVerified}
                      value={requestData.email}
                      onChange={(e) => {
                        setRequestData({ ...requestData, email: e.target.value });
                        if (reqOtpVerified) {
                          setReqOtpVerified(false);
                          setReqOtpSent(false);
                          setReqOtpCode('');
                        }
                      }}
                      placeholder="e.g. seller@brand.in or your_email@gmail.com"
                      className={`w-full pl-10 pr-3 py-2.5 bg-stone-50 border rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-red-600 ${
                        reqOtpVerified ? 'border-emerald-400 bg-emerald-50/50' : 'border-stone-200'
                      }`}
                    />
                  </div>
                  {!reqOtpVerified ? (
                    <button
                      type="button"
                      disabled={reqOtpLoading || !requestData.email || !requestData.email.includes('@')}
                      onClick={handleSendRequestOtp}
                      className="px-3.5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs whitespace-nowrap transition-colors disabled:opacity-50"
                    >
                      {reqOtpLoading ? 'Sending...' : reqOtpSent ? 'Resend OTP' : 'Send OTP'}
                    </button>
                  ) : (
                    <span className="px-3.5 py-2.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-1.5 whitespace-nowrap">
                      <CheckCircle size={14} className="text-emerald-700" /> Verified
                    </span>
                  )}
                </div>

                {/* Domain Typo Alert */}
                {(() => {
                  const typoSuggestion = checkEmailTypo(requestData.email);
                  if (typoSuggestion && !reqOtpVerified) {
                    return (
                      <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
                        <span>Did you mean <strong>{typoSuggestion}</strong>?</span>
                        <button
                          type="button"
                          onClick={() => setRequestData({ ...requestData, email: typoSuggestion })}
                          className="font-bold underline text-amber-950 hover:text-amber-800 ml-2"
                        >
                          Correct it
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* OTP Code Entry Popover with Explicit Recipient Target */}
                {reqOtpSent && !reqOtpVerified && (
                  <div className="mt-2.5 p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-2.5">
                    <div className="flex items-start gap-2">
                      <Sparkles size={15} className="text-red-600 mt-0.5 shrink-0" />
                      <div className="text-[12px] text-stone-900 leading-relaxed">
                        Verification code sent directly to: <strong className="font-mono text-red-600 bg-white px-1.5 py-0.5 rounded border border-red-200">{requestData.email}</strong>. Please check that Gmail/email inbox (and spam folder).
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-red-200/60">
                      <span className="text-[11px] font-semibold text-stone-900">
                        Enter 6-digit code:
                      </span>
                      <div className="flex items-center gap-2">
                        {reqOtpExpiryTimer > 0 ? (
                          <span className="flex items-center gap-1 text-[10.5px] text-amber-800 font-semibold bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                            <Clock size={11} />
                            Expires in: {formatCountdown(reqOtpExpiryTimer)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded border border-red-200">
                            Code Expired
                          </span>
                        )}
                        {reqOtpTimer > 0 && (
                          <span className="text-[10px] text-stone-500 font-medium">Resend in {reqOtpTimer}s</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={reqOtpCode}
                        onChange={(e) => setReqOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit OTP"
                        className="w-36 px-3 py-2 bg-white border border-red-500 rounded-xl text-center font-mono text-sm font-bold tracking-widest text-stone-900 shadow-inner"
                      />
                      <button
                        type="button"
                        disabled={reqOtpLoading || reqOtpExpiryTimer <= 0 || reqOtpCode.length !== 6}
                        onClick={handleVerifyRequestOtp}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
                      >
                        {reqOtpLoading ? 'Verifying...' : 'Confirm OTP'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Account Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3 text-stone-400" />
                    <input
                      type={showReqPassword ? 'text' : 'password'}
                      required
                      value={requestData.password}
                      onChange={(e) => setRequestData({ ...requestData, password: e.target.value })}
                      placeholder="Min. 6 characters"
                      className="w-full pl-10 pr-11 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowReqPassword(!showReqPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer transition-colors"
                      title={showReqPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showReqPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3 text-stone-400" />
                    <input
                      type={showReqConfirmPassword ? 'text' : 'password'}
                      required
                      value={requestData.confirm_password}
                      onChange={(e) => setRequestData({ ...requestData, confirm_password: e.target.value })}
                      placeholder="Re-enter password"
                      className={`w-full pl-10 pr-11 py-2.5 bg-stone-50 border rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-red-600 ${
                        requestData.confirm_password && requestData.password === requestData.confirm_password
                          ? 'border-emerald-500 bg-emerald-50/20'
                          : 'border-stone-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowReqConfirmPassword(!showReqConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer transition-colors"
                      title={showReqConfirmPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showReqConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={requestData.phone}
                    onChange={(e) => setRequestData({ ...requestData, phone: e.target.value })}
                    placeholder="+91 94360 12345"
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    District / Town
                  </label>
                  <input
                    type="text"
                    value={requestData.location_district}
                    onChange={(e) => setRequestData({ ...requestData, location_district: e.target.value })}
                    placeholder="Kohima, Mokokchung, Dimapur..."
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-stone-700 font-semibold">
                    FSSAI License / Registration # (14 Digits) *
                  </label>
                  <span className={`text-[11px] font-mono font-bold ${requestData.fssai_number?.length === 14 ? 'text-emerald-700' : 'text-stone-400'}`}>
                    {requestData.fssai_number?.length || 0}/14
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={14}
                  value={requestData.fssai_number}
                  onChange={(e) => setRequestData({ ...requestData, fssai_number: e.target.value.replace(/\D/g, '').slice(0, 14) })}
                  placeholder="Enter 14-digit numeric FSSAI registration code"
                  className={`w-full px-3 py-2.5 bg-stone-50 border rounded-xl font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-red-600 ${
                    requestData.fssai_number?.length === 14 ? 'border-emerald-400 bg-emerald-50/30' : 'border-stone-200'
                  }`}
                />
                <p className="text-[11px] text-stone-500 mt-1">
                  Mandatory 14-digit Food Safety and Standards Authority of India (FSSAI) license number.
                </p>
              </div>

              {/* Payout Settlement Banking Details */}
              <div className="p-4 bg-stone-50/90 rounded-2xl border border-stone-200/90 space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-100/90 border border-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                    <Landmark size={14} className="text-amber-800" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-stone-900 text-xs">
                      Payout Settlement Bank Account *
                    </h4>
                    <p className="text-[10.5px] text-stone-500">
                      Disbursements for sold pickle jars are transferred weekly via direct NEFT/RTGS
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={requestData.bank_account_holder}
                      onChange={(e) => setRequestData({ ...requestData, bank_account_holder: e.target.value })}
                      placeholder="As per bank passbook"
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={requestData.bank_name}
                      onChange={(e) => setRequestData({ ...requestData, bank_name: e.target.value })}
                      placeholder="e.g. State Bank of India, HDFC"
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Bank Account Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={requestData.bank_account_number}
                      onChange={(e) => setRequestData({ ...requestData, bank_account_number: e.target.value.replace(/\s+/g, '') })}
                      placeholder="Enter bank account number"
                      className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-stone-700 font-semibold">
                        IFSC Code (11 Chars) *
                      </label>
                      <span className={`text-[10px] font-mono font-bold ${requestData.bank_ifsc_code?.length === 11 ? 'text-emerald-700' : 'text-stone-400'}`}>
                        {requestData.bank_ifsc_code?.length || 0}/11
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={requestData.bank_ifsc_code}
                      onChange={(e) => setRequestData({ ...requestData, bank_ifsc_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })}
                      placeholder="e.g. SBIN0000214"
                      className={`w-full px-3 py-2 bg-white border rounded-xl font-mono uppercase text-stone-900 focus:outline-none focus:ring-1 focus:ring-red-600 ${
                        requestData.bank_ifsc_code?.length === 11 ? 'border-emerald-400 bg-emerald-50/20' : 'border-stone-200'
                      }`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-semibold mb-1">
                  Tell us briefly about your pickles and recipes
                </label>
                <textarea
                  rows={2}
                  value={requestData.message}
                  onChange={(e) => setRequestData({ ...requestData, message: e.target.value })}
                  placeholder="Wood-smoked pork, pure Raja Mircha, fermented bamboo shoot, family recipe since 1994..."
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Submitting Request...' : 'Request Seller Authorization'}</span>
                <ArrowRight size={15} />
              </button>

              <p className="text-center text-[11px] text-stone-400">
                Are you an admin? Sign in to your admin account to authorize sellers.
              </p>
            </form>
          )}
        </div>
      </div>
    );
  }

  // IF AUTHORIZED BY ADMIN: Show full onboarding registration form
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Store size={30} />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full uppercase tracking-wider mb-2">
          <ShieldCheck size={13} /> Admin Authorization Granted
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
          Seller Onboarding & Registration
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-2">
          Your account is pre-authorized by the administrator. Complete your verified FSSAI profile to start listing your handcrafted pickles.
        </p>
      </div>

      {appSubmitSuccess ? (
        <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-3xl text-center space-y-3">
          <CheckCircle size={38} className="text-emerald-600 mx-auto" />
          <h3 className="font-serif font-bold text-xl text-emerald-900">Application Submitted</h3>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">{appSubmitSuccess}</p>
          <p className="text-xs text-stone-500">Redirecting to your manufacturer workspace...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-stone-200/90 shadow-lg text-xs">
          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: User Account Credentials */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-sm text-stone-900 border-b border-stone-100 pb-2">
              1. Seller Account Credentials
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-700 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="e.g. Arenla Ao"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Desired Username *</label>
                <input
                  type="text"
                  required
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="e.g. arenla_craft"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-700 font-medium mb-1">Account Email *</label>
                <input
                  type="email"
                  required
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="seller@wangs.in"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Account Password *</label>
                <div className="relative">
                  <input
                    type={showMfgPassword ? 'text' : 'password'}
                    required
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 6 characters"
                    className="w-full pl-3 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 text-stone-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMfgPassword(!showMfgPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer transition-colors"
                    title={showMfgPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showMfgPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showMfgConfirmPassword ? 'text' : 'password'}
                    required
                    name="confirm_password"
                    value={formData.confirm_password}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="w-full pl-3 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 text-stone-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMfgConfirmPassword(!showMfgConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer transition-colors"
                    title={showMfgConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showMfgConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Business & Brand Story */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-sm text-stone-900 border-b border-stone-100 pb-2">
              2. Business Details & Brand Story
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-700 font-medium mb-1">Business / Brand Name *</label>
                <input
                  type="text"
                  required
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  placeholder="e.g. Arenla's Heritage Foods"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">District / Region *</label>
                <input
                  type="text"
                  required
                  name="location_district"
                  value={formData.location_district}
                  onChange={handleChange}
                  placeholder="e.g. Kohima, Mokokchung, Wokha"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-700 font-medium mb-1">Brand Story & Heritage</label>
              <textarea
                rows={3}
                name="brand_story"
                value={formData.brand_story}
                onChange={handleChange}
                placeholder="Share your culinary heritage, wood-smoking methods, heirloom chillies, and values..."
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>
          </div>

          {/* Section 3: Contact & Email Verification (Resend OTP) */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-sm text-stone-900 border-b border-stone-100 pb-2">
              3. Producer Contact & Verification
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-700 font-medium mb-1">
                  Public Contact Email *
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    required
                    name="contact_email"
                    value={formData.contact_email}
                    onChange={(e) => {
                      handleChange(e);
                      if (otpVerified || otpSent) {
                        setOtpVerified(false);
                        setOtpSent(false);
                        setOtpCode('');
                        setOtpResendTimer(0);
                        setOtpExpiryTimer(0);
                      }
                    }}
                    placeholder="orders@arenlafoods.in"
                    className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600"
                  />
                  {!otpVerified ? (
                    <button
                      type="button"
                      disabled={otpLoading || !formData.contact_email || otpResendTimer > 0}
                      onClick={handleSendEmailOtp}
                      className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-bold whitespace-nowrap disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      {otpLoading ? (
                        'Sending...'
                      ) : otpSent ? (
                        otpResendTimer > 0 ? (
                          <>
                            <Clock size={12} className="animate-spin" />
                            <span>Resend in {otpResendTimer}s</span>
                          </>
                        ) : (
                          'Resend Code'
                        )
                      ) : (
                        'Verify Email'
                      )}
                    </button>
                  ) : (
                    <span className="px-3.5 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap shadow-xs">
                      <CheckCircle size={13} /> Verified
                    </span>
                  )}
                </div>

                {/* Typo Suggestion for Public Contact Email */}
                {(() => {
                  const typoSuggestion = checkEmailTypo(formData.contact_email);
                  if (typoSuggestion && !otpVerified) {
                    return (
                      <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900">
                        <span>Did you mean <strong>{typoSuggestion}</strong>?</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, contact_email: typoSuggestion });
                            setOtpSent(false);
                            setOtpVerified(false);
                            setOtpCode('');
                          }}
                          className="font-bold underline text-amber-950 hover:text-amber-800 ml-2 cursor-pointer"
                        >
                          Correct it
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}

                {otpSent && !otpVerified && (
                  <div className="mt-2.5 p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-700">
                        Code sent to: <strong className="font-mono text-red-700 bg-white px-1.5 py-0.5 rounded border border-red-200">{formData.contact_email}</strong>
                      </span>
                      {otpExpiryTimer > 0 ? (
                        <span className="flex items-center gap-1 text-amber-800 font-semibold bg-amber-100/80 px-2 py-0.5 rounded border border-amber-200">
                          <Clock size={11} />
                          Expires in: {formatCountdown(otpExpiryTimer)}
                        </span>
                      ) : (
                        <span className="text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded border border-red-200">
                          Code Expired
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit OTP"
                        className="w-36 px-3 py-2 bg-white border border-red-500 rounded-xl text-center font-mono text-sm font-bold tracking-widest text-stone-900 shadow-inner focus:ring-2 focus:ring-red-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={otpLoading || otpExpiryTimer <= 0 || otpCode.length !== 6}
                        onClick={handleVerifyEmailOtp}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        {otpLoading ? 'Verifying...' : 'Confirm Code'}
                      </button>
                    </div>

                    {otpExpiryTimer === 0 ? (
                      <p className="text-[11px] text-red-700 font-medium">
                        Your 6-digit verification code has expired. Please click "Resend Code" to receive a fresh code.
                      </p>
                    ) : (
                      <p className="text-[10.5px] text-stone-600">
                        Didn't receive it? Please check your <strong>Spam / Promotions</strong> folder. Code is valid for 10 minutes.
                      </p>
                    )}
                  </div>
                )}

                {otpNotice && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs">
                    <CheckCircle size={15} className="text-emerald-600 shrink-0" />
                    <span>{otpNotice}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">Contact Phone *</label>
                <input
                  type="tel"
                  required
                  name="contact_phone"
                  value={formData.contact_phone}
                  onChange={handleChange}
                  placeholder="+91 94360 12345"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-stone-700 font-medium mb-1">Production Facility / Workshop Address *</label>
                <input
                  type="text"
                  required
                  name="business_address"
                  value={formData.business_address}
                  onChange={handleChange}
                  placeholder="Sector / Ward / Village / Landmark"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Postal Code (PIN) *</label>
                <input
                  type="text"
                  required
                  name="postal_code"
                  maxLength={6}
                  value={formData.postal_code}
                  onChange={(e) => setFormData({ ...formData, postal_code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  placeholder="797001"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Mandatory FSSAI Food Licensing */}
          <div className="p-6 bg-stone-50 rounded-2xl border-2 border-red-500/30 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-red-600" />
              <h3 className="font-serif font-bold text-sm text-stone-900">
                4. Mandatory FSSAI Food Safety Licensing
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              In accordance with Food Safety and Standards Authority of India (FSSAI) regulations, all sellers on Wangs must hold an active 14-digit food business registration or license.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-stone-900 font-bold">
                    FSSAI License / Registration # (14 Digits) *
                  </label>
                  <span className={`text-[11px] font-mono font-bold ${formData.fssai_license_number?.length === 14 ? 'text-emerald-700' : 'text-stone-400'}`}>
                    {formData.fssai_license_number?.length || 0}/14
                  </span>
                </div>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={14}
                  name="fssai_license_number"
                  value={formData.fssai_license_number}
                  onChange={(e) => setFormData({ ...formData, fssai_license_number: e.target.value.replace(/\D/g, '').slice(0, 14) })}
                  placeholder="e.g. 10023064000124"
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-red-500/40 rounded-xl font-mono text-sm tracking-wider text-stone-900 focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">GSTIN Number (Optional)</label>
                <input
                  type="text"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleChange}
                  placeholder="e.g. 13AABCA1234Z1Z5"
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-red-600 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Escrow Payout Banking */}
          <div className="space-y-4">
            <h3 className="font-serif font-bold text-sm text-stone-900 border-b border-stone-100 pb-2">
              5. Payout Settlement Banking
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-700 font-medium mb-1">Account Holder Name</label>
                <input
                  type="text"
                  name="bank_account_holder"
                  value={formData.bank_account_holder}
                  onChange={handleChange}
                  placeholder="As per bank passbook"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Account Number</label>
                <input
                  type="text"
                  name="bank_account_number"
                  value={formData.bank_account_number}
                  onChange={handleChange}
                  placeholder="Account number"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-stone-700 font-medium mb-1">IFSC Code</label>
                <input
                  type="text"
                  name="bank_ifsc_code"
                  value={formData.bank_ifsc_code}
                  onChange={handleChange}
                  placeholder="e.g. SBIN0000214"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Bank Name</label>
                <input
                  type="text"
                  name="bank_name"
                  value={formData.bank_name}
                  onChange={handleChange}
                  placeholder="State Bank of India Kohima"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Marketplace Seller Policy Summary */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-stone-700 text-xs space-y-2">
            <div>
              <span className="font-bold text-stone-900 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-600" /> Platform Multi-Jar Bundle Rule (10% Discount)
              </span>
              <p className="text-[11px] text-stone-600 leading-relaxed mt-1">
                Customers can build flexible bundles containing 2 to 4 products exclusively from your brand and receive a 10% bundle discount. Customers can add or cut recipes within the 2–4 jar range.
              </p>
            </div>
            <div className="pt-1 border-t border-amber-200/80">
              <a
                href="/documents/wangs_seller_rules.pdf"
                target="_blank"
                rel="noopener noreferrer"
                download="wangs_seller_rules.pdf"
                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 font-bold text-[11px] hover:underline"
              >
                <FileText size={13} className="text-red-600 inline mr-1" />
                <span>Download Official Seller Rules & Policy Handbook (PDF)</span>
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
          >
            <span>{loading ? 'Submitting Application...' : 'Submit Seller Application'}</span>
            <ArrowRight size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
