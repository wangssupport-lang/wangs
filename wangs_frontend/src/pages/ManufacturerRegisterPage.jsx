import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, ShieldCheck, CheckCircle, AlertCircle, ArrowRight, Lock, Mail, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';

export default function ManufacturerRegisterPage() {
  const navigate = useNavigate();
  const { user, isAuthorizedToSell, isManufacturer } = useAuth();

  // Full onboarding form data (for authorized users)
  const [formData, setFormData] = useState({
    username: user ? user.username : '',
    email: user ? user.email : '',
    password: '',
    confirm_password: '',
    full_name: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '',
    business_name: '',
    brand_story: '',
    location_district: '',
    contact_email: user ? user.email : '',
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
    email: user ? user.email : '',
    phone: user?.phone_number || '',
    location_district: 'Kohima',
    fssai_number: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Resend OTP for seller email verification
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpDeliveredLive, setOtpDeliveredLive] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendEmailOtp = async () => {
    const emailToVerify = formData.contact_email || formData.email;
    if (!emailToVerify || !emailToVerify.includes('@')) {
      setErrorMsg('Please provide a valid contact email first.');
      return;
    }
    setOtpLoading(true);
    setErrorMsg('');
    try {
      const res = await api.sendOtp(emailToVerify, 'SELLER');
      setOtpSent(true);
      setOtpDeliveredLive(Boolean(res?.delivered_via_email));
    } catch (err) {
      setErrorMsg(err.message || 'Failed to dispatch email verification code via Resend.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!otpCode || otpCode.trim().length !== 6) {
      setErrorMsg('Enter the 6-digit verification code.');
      return;
    }
    setOtpLoading(true);
    setErrorMsg('');
    try {
      const emailToVerify = formData.contact_email || formData.email;
      await api.verifyOtp(emailToVerify, otpCode.trim(), 'SELLER');
      setOtpVerified(true);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleRequestAuthorization = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      await api.requestSellerAccess(requestData);
      setRequestSuccess(true);
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
      setSuccessMsg(res.message || 'Application submitted successfully! Our compliance team will review your details.');
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
          <div className="w-14 h-14 bg-forest-100 text-forest-800 rounded-2xl flex items-center justify-center mx-auto">
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
            className="inline-flex items-center gap-2 px-6 py-3 bg-forest-900 hover:bg-forest-950 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            <span>Open Manufacturer Dashboard</span>
            <ArrowRight size={15} />
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={requestData.email}
                    onChange={(e) => setRequestData({ ...requestData, email: e.target.value })}
                    placeholder="e.g. seller@brand.in"
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900"
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    FSSAI License # (if available)
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={requestData.fssai_number}
                    onChange={(e) => setRequestData({ ...requestData, fssai_number: e.target.value.replace(/\D/g, '').slice(0, 14) })}
                    placeholder="14-digit numeric code"
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-stone-900"
                  />
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
                className="w-full py-3 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
        <div className="w-16 h-16 bg-forest-100 text-forest-800 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-xs">
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

      {successMsg ? (
        <div className="bg-emerald-50 border border-emerald-200 p-8 rounded-3xl text-center space-y-3">
          <CheckCircle size={38} className="text-emerald-600 mx-auto" />
          <h3 className="font-serif font-bold text-xl text-emerald-900">Application Submitted</h3>
          <p className="text-xs text-emerald-800 max-w-md mx-auto">{successMsg}</p>
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
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-700"
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
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-700"
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
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Account Password *</label>
                <input
                  type="password"
                  required
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
              </div>
              <div>
                <label className="block text-stone-700 font-medium mb-1">Confirm Password *</label>
                <input
                  type="password"
                  required
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-700"
                />
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
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-700"
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
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-700"
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
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-700"
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
                    onChange={handleChange}
                    placeholder="orders@arenlafoods.in"
                    className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-700"
                  />
                  {!otpVerified ? (
                    <button
                      type="button"
                      disabled={otpLoading || !formData.contact_email}
                      onClick={handleSendEmailOtp}
                      className="px-3 py-2 bg-forest-800 text-white rounded-xl text-[11px] font-bold whitespace-nowrap disabled:opacity-50"
                    >
                      {otpSent ? 'Resend' : 'Verify Email'}
                    </button>
                  ) : (
                    <span className="px-3 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center gap-1 whitespace-nowrap">
                      <CheckCircle size={12} /> Verified
                    </span>
                  )}
                </div>

                {otpSent && !otpVerified && (
                  <div className="mt-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="6-digit OTP"
                        className="w-36 px-3 py-1.5 bg-white border border-forest-600 rounded-xl text-center font-mono text-sm font-bold tracking-widest focus:ring-2 focus:ring-forest-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={otpLoading}
                        onClick={handleVerifyEmailOtp}
                        className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        Confirm Code
                      </button>
                    </div>
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
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-700"
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
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-700"
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
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-forest-700 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Mandatory FSSAI Food Licensing */}
          <div className="p-6 bg-cream-50/80 rounded-2xl border-2 border-forest-800/30 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-forest-800" />
              <h3 className="font-serif font-bold text-sm text-forest-950">
                4. Mandatory FSSAI Food Safety Licensing
              </h3>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              In accordance with Food Safety and Standards Authority of India (FSSAI) regulations, all sellers on Wangs must hold an active 14-digit food business registration or license.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-forest-950 font-bold">
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
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-forest-800/40 rounded-xl font-mono text-sm tracking-wider text-forest-950 focus:border-forest-800 focus:outline-none"
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
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-forest-700 uppercase"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-forest-900 hover:bg-forest-950 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <span>{loading ? 'Submitting Application...' : 'Submit Seller Application'}</span>
            <ArrowRight size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
