import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Store,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Lock,
  Mail,
  Clock,
  Sparkles,
  Eye,
  EyeOff,
  FileText,
  Landmark,
  UploadCloud,
  Camera,
  Trash2,
  RefreshCw,
  Check,
  User,
  Phone,
  MapPin,
  Building2,
  Maximize2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { compressImageFile } from '../utils/image';

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

  // Multi-step registration flow: 1 = Contact & Credentials, 2 = Regulatory & Story, 3 = Bank & Passbook
  const [currentStep, setCurrentStep] = useState(1);

  // Full onboarding form data (for authorized users)
  const [formData, setFormData] = useState({
    username: user && user.role !== 'ADMIN' ? user.username : '',
    email: user && user.role !== 'ADMIN' ? user.email : '',
    password: '',
    confirm_password: '',
    full_name: user && user.role !== 'ADMIN' ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '',
    business_name: '',
    brand_story: '',
    location_district: 'Kohima',
    contact_email: user && user.role !== 'ADMIN' ? user.email : '',
    contact_phone: user?.phone_number || '',
    business_address: '',
    postal_code: '',
    fssai_license_number: '',
    gst_number: '',
    compliance_notes: '',
    bank_account_holder: '',
    bank_account_number: '',
    bank_confirm_account_number: '',
    bank_ifsc_code: '',
    bank_name: '',
    bank_passbook_image: '',
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
    bank_confirm_account_number: '',
    bank_ifsc_code: '',
    bank_name: '',
    bank_passbook_image: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [uploadingPassbook, setUploadingPassbook] = useState(false);
  const [passbookPreviewModal, setPassbookPreviewModal] = useState(null);

  const [showMfgPassword, setShowMfgPassword] = useState(false);
  const [showMfgConfirmPassword, setShowMfgConfirmPassword] = useState(false);
  const [showReqPassword, setShowReqPassword] = useState(false);
  const [showReqConfirmPassword, setShowReqConfirmPassword] = useState(false);

  const [appSubmitSuccess, setAppSubmitSuccess] = useState('');
  const [otpNotice, setOtpNotice] = useState('');
  const [reqOtpNotice, setReqOtpNotice] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(false);

  // File input refs for passbook upload
  const reqPassbookInputRef = useRef(null);
  const mfgPassbookInputRef = useRef(null);

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

  // Passbook image file compression and attachment
  const handlePassbookSelect = async (e, formType = 'request') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, JPEG, PNG, or WebP).');
      return;
    }

    setUploadingPassbook(true);
    setErrorMsg('');
    try {
      // Compress to crisp 1200px max dimension, quality 0.82 (~40-70KB)
      const compressedDataUrl = await compressImageFile(file, 1200, 0.82);
      if (formType === 'request') {
        setRequestData((prev) => ({ ...prev, bank_passbook_image: compressedDataUrl }));
      } else {
        setFormData((prev) => ({ ...prev, bank_passbook_image: compressedDataUrl }));
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to process passbook image. Please select a clearer photo.');
    } finally {
      setUploadingPassbook(false);
      e.target.value = '';
    }
  };

  const handleRemovePassbook = (formType = 'request') => {
    if (formType === 'request') {
      setRequestData((prev) => ({ ...prev, bank_passbook_image: '' }));
      if (reqPassbookInputRef.current) reqPassbookInputRef.current.value = '';
    } else {
      setFormData((prev) => ({ ...prev, bank_passbook_image: '' }));
      if (mfgPassbookInputRef.current) mfgPassbookInputRef.current.value = '';
    }
  };

  // OTP Handlers for Full Authorized Onboarding
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
      setOtpCode('');
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

  // OTP Handlers for Request Seller Authorization
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
      setReqOtpExpiryTimer(600);
      setReqOtpCode('');
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
      setReqOtpNotice(`Email ${emailToVerify} verified successfully! You can now proceed to step 2.`);
    } catch (err) {
      setErrorMsg(err.message || 'Invalid or expired verification code. Please check your inbox or request a new code.');
    } finally {
      setReqOtpLoading(false);
    }
  };

  // Step Validation for Request Access Form
  const validateRequestStep = (step) => {
    setErrorMsg('');
    if (step === 1) {
      if (!requestData.business_name?.trim()) {
        setErrorMsg('Please enter your Brand or Workshop Name.');
        return false;
      }
      if (!requestData.email?.trim() || !requestData.email.includes('@')) {
        setErrorMsg('Please provide a valid Contact Email.');
        return false;
      }
      if (!reqOtpVerified) {
        setErrorMsg('Email verification is mandatory. Please click "Send OTP" and confirm the 6-digit code sent to your email.');
        return false;
      }
      if (!requestData.password || requestData.password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        return false;
      }
      if (requestData.password !== requestData.confirm_password) {
        setErrorMsg('Passwords do not match. Please verify your password confirmation.');
        return false;
      }
      if (!requestData.phone?.trim() || requestData.phone.replace(/\D/g, '').length < 10) {
        setErrorMsg('Please enter a valid 10-digit Phone or WhatsApp contact number.');
        return false;
      }
      if (!requestData.location_district?.trim()) {
        setErrorMsg('Please specify your District or Town.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      const fssai = (requestData.fssai_number || '').trim();
      if (!fssai || fssai.length !== 14 || !/^\d{14}$/.test(fssai)) {
        setErrorMsg('A valid 14-digit FSSAI Food Business License / Registration Number is mandatory. Please enter exactly 14 numeric digits.');
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!requestData.bank_account_holder?.trim()) {
        setErrorMsg('Account holder name is required for payout settlement banking.');
        return false;
      }
      if (!requestData.bank_name?.trim()) {
        setErrorMsg('Bank name is required for payout settlement banking.');
        return false;
      }
      const acctNum = (requestData.bank_account_number || '').trim();
      if (!acctNum || acctNum.length < 6) {
        setErrorMsg('Please enter a valid bank account number (minimum 6 digits).');
        return false;
      }
      if (requestData.bank_confirm_account_number && requestData.bank_confirm_account_number !== acctNum) {
        setErrorMsg('Bank Account Numbers do not match. Please re-check both account number fields.');
        return false;
      }
      const ifsc = (requestData.bank_ifsc_code || '').trim().toUpperCase();
      if (!ifsc || ifsc.length !== 11) {
        setErrorMsg('A valid 11-character Indian Financial System Code (IFSC) is mandatory (e.g. SBIN0000214).');
        return false;
      }
      // STRICT MANDATORY PASSBOOK CHECK
      if (!requestData.bank_passbook_image) {
        setErrorMsg('MANDATORY: A clear photo or scan of your Bank Passbook first page or Cancelled Cheque is strictly required to verify your payout account.');
        return false;
      }
      return true;
    }
    return true;
  };

  // Step Validation for Full Onboarding Form
  const validateMfgStep = (step) => {
    setErrorMsg('');
    if (step === 1) {
      if (!formData.full_name?.trim()) {
        setErrorMsg('Please enter your Full Name.');
        return false;
      }
      if (!formData.username?.trim()) {
        setErrorMsg('Please choose a desired username.');
        return false;
      }
      if (!formData.business_name?.trim()) {
        setErrorMsg('Please enter your Business or Brand Name.');
        return false;
      }
      if (!formData.contact_email?.trim() || !formData.contact_email.includes('@')) {
        setErrorMsg('Please enter a valid Contact Email.');
        return false;
      }
      if (!otpVerified) {
        setErrorMsg('Email verification is mandatory. Please click "Verify Email" to confirm the 6-digit OTP code.');
        return false;
      }
      if (formData.password && formData.password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return false;
      }
      if (formData.password && formData.password !== formData.confirm_password) {
        setErrorMsg('Passwords do not match. Please re-enter your password to confirm.');
        return false;
      }
      if (!formData.contact_phone?.trim()) {
        setErrorMsg('Please enter a contact phone number.');
        return false;
      }
      if (!formData.business_address?.trim()) {
        setErrorMsg('Production workshop address is required.');
        return false;
      }
      if (!formData.postal_code?.trim() || formData.postal_code.length !== 6) {
        setErrorMsg('Please enter a valid 6-digit postal code.');
        return false;
      }
      return true;
    }

    if (step === 2) {
      const fssai = (formData.fssai_license_number || '').trim();
      if (!fssai || fssai.length !== 14 || !/^\d{14}$/.test(fssai)) {
        setErrorMsg('A valid 14-digit FSSAI Food Business License Number is mandatory. Please enter exactly 14 numeric digits.');
        return false;
      }
      return true;
    }

    if (step === 3) {
      if (!formData.bank_account_holder?.trim()) {
        setErrorMsg('Account holder name is required for payout settlements.');
        return false;
      }
      if (!formData.bank_name?.trim()) {
        setErrorMsg('Bank name is required.');
        return false;
      }
      const acctNum = (formData.bank_account_number || '').trim();
      if (!acctNum || acctNum.length < 6) {
        setErrorMsg('Please enter a valid bank account number.');
        return false;
      }
      if (formData.bank_confirm_account_number && formData.bank_confirm_account_number !== acctNum) {
        setErrorMsg('Bank Account Numbers do not match. Please re-check both account number fields.');
        return false;
      }
      const ifsc = (formData.bank_ifsc_code || '').trim().toUpperCase();
      if (!ifsc || ifsc.length !== 11) {
        setErrorMsg('A valid 11-character IFSC code is mandatory (e.g. SBIN0000214).');
        return false;
      }
      // STRICT MANDATORY PASSBOOK CHECK
      if (!formData.bank_passbook_image) {
        setErrorMsg('MANDATORY: A clear photo or scan of your Bank Passbook first page or Cancelled Cheque is strictly required to verify your payout account.');
        return false;
      }
      return true;
    }
    return true;
  };

  // Submit Request Access
  const handleRequestAuthorization = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!validateRequestStep(1) || !validateRequestStep(2) || !validateRequestStep(3)) {
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

  // Submit Full Onboarding Application
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    if (!validateMfgStep(1) || !validateMfgStep(2) || !validateMfgStep(3)) {
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

  // Render Step Stepper Bar
  const renderStepper = (activeStep, onStepClick, isRequestFlow = true) => {
    const steps = [
      { id: 1, title: 'Identity & Contact', subtitle: 'User details & login', icon: User },
      { id: 2, title: 'FSSAI & Story', subtitle: 'Food licensing & craft', icon: ShieldCheck },
      { id: 3, title: 'Bank & Passbook', subtitle: 'Payouts & document', icon: Landmark },
    ];

    return (
      <div className="mb-8">
        <div className="grid grid-cols-3 gap-2 sm:gap-4 relative">
          {steps.map((st, idx) => {
            const isCompleted = activeStep > st.id;
            const isCurrent = activeStep === st.id;
            const StepIcon = st.icon;

            return (
              <button
                type="button"
                key={st.id}
                onClick={() => {
                  if (st.id < activeStep) {
                    onStepClick(st.id);
                  } else if (st.id > activeStep) {
                    const isValid = isRequestFlow
                      ? validateRequestStep(activeStep)
                      : validateMfgStep(activeStep);
                    if (isValid) onStepClick(st.id);
                  }
                }}
                className={`flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-2 p-2.5 sm:p-3.5 rounded-2xl border transition-all text-left ${
                  isCurrent
                    ? 'bg-amber-50/80 border-[#9b4100] shadow-sm ring-1 ring-[#9b4100]/20'
                    : isCompleted
                    ? 'bg-emerald-50/60 border-emerald-200 text-stone-700 hover:bg-emerald-50'
                    : 'bg-stone-50 border-stone-200/80 opacity-60 text-stone-500'
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs transition-colors ${
                    isCurrent
                      ? 'bg-[#9b4100] text-white shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {isCompleted ? <Check size={14} /> : st.id}
                </div>
                <div className="min-w-0">
                  <span
                    className={`block font-serif font-bold text-xs leading-snug truncate ${
                      isCurrent ? 'text-[#9b4100]' : isCompleted ? 'text-emerald-950' : 'text-stone-700'
                    }`}
                  >
                    {st.title}
                  </span>
                  <span className="hidden sm:block text-[10px] text-stone-500 truncate">
                    {st.subtitle}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Passbook Upload Component
  const renderPassbookUploader = (passbookImage, formType = 'request') => {
    const inputRef = formType === 'request' ? reqPassbookInputRef : mfgPassbookInputRef;

    return (
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <label className="block text-stone-900 font-bold text-xs flex items-center gap-1.5">
            <Landmark size={14} className="text-[#9b4100]" />
            <span>Bank Passbook / Cancelled Cheque Photo *</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200">
              Mandatory
            </span>
          </label>
          <span className="text-[10.5px] text-stone-500">
            JPG, PNG, WebP (auto-compressed)
          </span>
        </div>

        <input
          type="file"
          ref={inputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePassbookSelect(e, formType)}
        />

        {passbookImage ? (
          <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-2xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <CheckCircle size={18} className="text-emerald-700" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-950 text-xs">
                    Bank Passbook Document Attached
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Document verified and ready for settlement review
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPassbookPreviewModal(passbookImage)}
                  className="px-2.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 font-bold text-[11px] rounded-lg border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                  title="View enlarged document"
                >
                  <Maximize2 size={12} />
                  <span>Preview</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRemovePassbook(formType)}
                  className="px-2.5 py-1.5 bg-white hover:bg-red-50 text-red-700 font-bold text-[11px] rounded-lg border border-red-200 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Remove document"
                >
                  <Trash2 size={12} />
                  <span>Remove</span>
                </button>
              </div>
            </div>

            {/* Thumbnail preview */}
            <div
              onClick={() => setPassbookPreviewModal(passbookImage)}
              className="relative group rounded-xl overflow-hidden border border-emerald-200 bg-white cursor-pointer hover:border-emerald-400 transition-all shadow-inner max-h-48 flex items-center justify-center p-2"
            >
              <img
                src={passbookImage}
                alt="Uploaded Bank Passbook"
                className="max-h-44 w-auto object-contain rounded-lg transition-transform group-hover:scale-[1.01]"
              />
              <div className="absolute inset-0 bg-stone-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold">
                <Maximize2 size={16} />
                <span>Click to Inspect Full Photo</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10.5px] text-emerald-800/90 pt-1 border-t border-emerald-200/80">
              <span>Account Number & IFSC must match the fields above.</span>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="font-bold underline hover:text-emerald-950 cursor-pointer"
              >
                Change Photo
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all hover:border-[#9b4100] hover:bg-amber-50/40 ${
              uploadingPassbook ? 'bg-amber-50/50 border-amber-300' : 'border-stone-300 bg-stone-50/70'
            }`}
          >
            {uploadingPassbook ? (
              <div className="space-y-2 py-4">
                <RefreshCw size={24} className="text-[#9b4100] animate-spin mx-auto" />
                <p className="font-bold text-xs text-stone-900">Compressing & optimizing passbook photo...</p>
                <p className="text-[11px] text-stone-500">Ensuring numbers and IFSC remain crisp and legible.</p>
              </div>
            ) : (
              <div className="space-y-2 py-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-100/80 text-[#9b4100] border border-amber-200 flex items-center justify-center mx-auto shadow-xs">
                  <Camera size={22} />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-xs sm:text-sm text-stone-900">
                    Upload Bank Passbook or Cancelled Cheque
                  </h4>
                  <p className="text-[11px] text-stone-600 max-w-md mx-auto mt-1 leading-relaxed">
                    Take a clear photo of your bank passbook first page or cancelled cheque.
                    Make sure <strong>Account Holder Name, Account Number, and IFSC Code</strong> are clearly visible.
                  </p>
                </div>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-[#9b4100] font-bold text-xs rounded-xl border border-stone-200 shadow-xs hover:bg-stone-50 transition-colors">
                    <UploadCloud size={14} />
                    <span>Choose Photo / Take Picture</span>
                  </span>
                </div>
                <p className="text-[10px] text-stone-400 mt-1">
                  Upload is strictly confidential and used solely for direct weekly sales disbursements.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    );
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
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#9b4100] hover:bg-[#803300] text-white font-bold text-xs rounded-xl shadow-md transition-all"
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
            Thank you for applying to sell on Wangs! Our culinary curation and compliance team is reviewing your brand information, FSSAI credentials, and settlement bank passbook. Once authorized, you will receive an invitation email and direct access to your Seller Portal.
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

  // PASSBOOK PREVIEW LIGHTBOX MODAL
  const renderPreviewModal = () => {
    if (!passbookPreviewModal) return null;
    return (
      <div
        className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4"
        onClick={() => setPassbookPreviewModal(null)}
      >
        <div
          className="bg-white rounded-3xl p-5 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl border border-stone-200"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <Landmark size={18} className="text-[#9b4100]" />
              <h3 className="font-serif font-bold text-sm text-stone-900">
                Uploaded Bank Passbook / Cheque Preview
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setPassbookPreviewModal(null)}
              className="text-stone-400 hover:text-stone-700 text-lg font-bold px-2 py-1 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="bg-stone-50 rounded-2xl p-2 border border-stone-200 flex items-center justify-center">
            <img
              src={passbookPreviewModal}
              alt="Bank Passbook Full Preview"
              className="max-h-[65vh] w-auto object-contain rounded-xl"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-stone-500">
              Check that Account Holder, Number, and IFSC match your form.
            </span>
            <button
              type="button"
              onClick={() => setPassbookPreviewModal(null)}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>
      </div>
    );
  };

  // =========================================================================
  // VIEW 1: REQUEST SELLER AUTHORIZATION (When !isAuthorizedToSell)
  // Progressive Multi-Step Registration Flow
  // =========================================================================
  if (!isAuthorizedToSell) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        {renderPreviewModal()}

        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-stone-200/90 shadow-xl space-y-6">
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-50 text-amber-800 border border-amber-200 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Store size={28} className="text-[#9b4100]" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#9b4100] bg-amber-100/70 px-3.5 py-1 rounded-full">
              Artisan Collective · Seller Registration
            </span>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900 mt-2">
              Join Wangs as an Artisan Seller
            </h1>
            <p className="text-xs text-stone-600 mt-1.5 leading-relaxed max-w-lg mx-auto">
              Follow the 3 quick steps below to verify your contact, regulatory FSSAI license, and settlement bank passbook.
            </p>
          </div>

          {requestSuccess ? (
            <div className="p-8 bg-emerald-50 border border-emerald-200 rounded-3xl text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle size={32} />
              </div>
              <h3 className="font-serif font-bold text-lg text-emerald-950">
                Registration & Authorization Request Submitted!
              </h3>
              <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                Thank you! Your seller details, FSSAI compliance, and bank passbook document have been safely delivered to our administration team.
                You will receive an email confirmation once reviewed.
              </p>
              <div className="pt-3">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#9b4100] hover:bg-[#803300] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  <span>Back to Storefront</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {/* Stepper Header */}
              {renderStepper(currentStep, setCurrentStep, true)}

              {/* Status and Error Messages */}
              {errorMsg && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl flex items-center gap-2.5 text-xs">
                  <AlertCircle size={16} className="shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {reqOtpNotice && (
                <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-2.5 text-xs">
                  <CheckCircle size={16} className="shrink-0 text-emerald-600" />
                  <span>{reqOtpNotice}</span>
                </div>
              )}

              {/* ========================================================= */}
              {/* STEP 1: USER CONTACT & ACCOUNT DETAILS */}
              {/* ========================================================= */}
              {currentStep === 1 && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700">
                    <p className="font-semibold text-stone-900">Step 1: Contact & Account Identity</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Enter your brand information and verify your email to secure your seller portal.
                    </p>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Brand or Artisan Kitchen Name *
                    </label>
                    <div className="relative">
                      <Store size={16} className="absolute left-3.5 top-3 text-stone-400" />
                      <input
                        type="text"
                        required
                        value={requestData.business_name}
                        onChange={(e) => setRequestData({ ...requestData, business_name: e.target.value })}
                        placeholder="e.g. Dzüko Valley Slow Pickles"
                        className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
                      />
                    </div>
                  </div>

                  {/* Contact Email with Live Email OTP Verification */}
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Contact Email * (Receives Verification Code)
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
                          className={`w-full pl-10 pr-3 py-2.5 bg-stone-50 border rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9b4100] ${
                            reqOtpVerified ? 'border-emerald-400 bg-emerald-50/50' : 'border-stone-200'
                          }`}
                        />
                      </div>
                      {!reqOtpVerified ? (
                        <button
                          type="button"
                          disabled={reqOtpLoading || !requestData.email || !requestData.email.includes('@')}
                          onClick={handleSendRequestOtp}
                          className="px-4 py-2.5 bg-[#9b4100] hover:bg-[#803300] text-white font-bold rounded-xl text-xs whitespace-nowrap transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          {reqOtpLoading ? 'Sending...' : reqOtpSent ? 'Resend OTP' : 'Send OTP'}
                        </button>
                      ) : (
                        <span className="px-4 py-2.5 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-1.5 whitespace-nowrap shadow-xs">
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

                    {/* OTP Code Entry Popover */}
                    {reqOtpSent && !reqOtpVerified && (
                      <div className="mt-2.5 p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5">
                        <div className="flex items-start gap-2">
                          <Sparkles size={15} className="text-[#9b4100] mt-0.5 shrink-0" />
                          <div className="text-[12px] text-stone-900 leading-relaxed">
                            Verification code sent directly to: <strong className="font-mono text-[#9b4100] bg-white px-1.5 py-0.5 rounded border border-amber-200">{requestData.email}</strong>. Please check that Gmail/email inbox (and spam folder).
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-amber-200/60">
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
                            className="w-36 px-3 py-2 bg-white border border-[#9b4100] rounded-xl text-center font-mono text-sm font-bold tracking-widest text-stone-900 shadow-inner"
                          />
                          <button
                            type="button"
                            disabled={reqOtpLoading || reqOtpExpiryTimer <= 0 || reqOtpCode.length !== 6}
                            onClick={handleVerifyRequestOtp}
                            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
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
                        Seller Account Password *
                      </label>
                      <div className="relative">
                        <Lock size={16} className="absolute left-3.5 top-3 text-stone-400" />
                        <input
                          type={showReqPassword ? 'text' : 'password'}
                          required
                          value={requestData.password}
                          onChange={(e) => setRequestData({ ...requestData, password: e.target.value })}
                          placeholder="Min. 6 characters"
                          className="w-full pl-10 pr-11 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
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
                          className={`w-full pl-10 pr-11 py-2.5 bg-stone-50 border rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9b4100] ${
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
                      <div className="relative">
                        <Phone size={16} className="absolute left-3.5 top-3 text-stone-400" />
                        <input
                          type="tel"
                          required
                          value={requestData.phone}
                          onChange={(e) => setRequestData({ ...requestData, phone: e.target.value })}
                          placeholder="+91 94360 12345"
                          className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-stone-700 font-semibold mb-1">
                        District / Town *
                      </label>
                      <div className="relative">
                        <MapPin size={16} className="absolute left-3.5 top-3 text-stone-400" />
                        <input
                          type="text"
                          required
                          value={requestData.location_district}
                          onChange={(e) => setRequestData({ ...requestData, location_district: e.target.value })}
                          placeholder="Kohima, Mokokchung, Dimapur..."
                          className="w-full pl-10 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 1 Navigation */}
                  <div className="pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (validateRequestStep(1)) {
                          setCurrentStep(2);
                        }
                      }}
                      className="w-full sm:w-auto px-6 py-3 bg-[#9b4100] hover:bg-[#803300] text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Proceed to Step 2: FSSAI Compliance</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* STEP 2: REGULATORY FSSAI & BRAND STORY */}
              {/* ========================================================= */}
              {currentStep === 2 && (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-stone-700">
                    <p className="font-semibold text-stone-900">Step 2: Regulatory Compliance & Brand Heritage</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Food safety registration protects buyers and ensures authentic artisan standards across India.
                    </p>
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
                      className={`w-full px-3 py-2.5 bg-stone-50 border rounded-xl font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9b4100] ${
                        requestData.fssai_number?.length === 14 ? 'border-emerald-400 bg-emerald-50/30' : 'border-stone-200'
                      }`}
                    />
                    <p className="text-[11px] text-stone-500 mt-1">
                      Mandatory 14-digit Food Safety and Standards Authority of India (FSSAI) license or registration number.
                    </p>
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Pickle Specialties, Heritage Recipes & Wood-smoking Methods
                    </label>
                    <textarea
                      rows={3}
                      value={requestData.message}
                      onChange={(e) => setRequestData({ ...requestData, message: e.target.value })}
                      placeholder="e.g. Wood-smoked pork pickle, fermented bamboo shoot, pure Naga King Chilli (Raja Mircha), heirloom family recipe handed down since 1994..."
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
                    />
                  </div>

                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 flex items-start gap-2.5">
                    <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-stone-600 leading-relaxed">
                      <strong className="text-stone-900">100% Authentic Curation Guarantee:</strong> All jars sold under your label are dispatched with food-grade sealing and batch testing compliance.
                    </div>
                  </div>

                  {/* Step 2 Navigation */}
                  <div className="pt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to Contact</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (validateRequestStep(2)) {
                          setCurrentStep(3);
                        }
                      }}
                      className="px-6 py-2.5 bg-[#9b4100] hover:bg-[#803300] text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>Proceed to Step 3: Bank & Passbook</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* STEP 3: SETTLEMENT BANK & MANDATORY PASSBOOK PHOTO */}
              {/* ========================================================= */}
              {currentStep === 3 && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-stone-700">
                    <p className="font-semibold text-stone-900">Step 3: Payout Settlement & Bank Passbook Verification</p>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Weekly earnings from your sold jars are directly transferred via NEFT/RTGS into this verified account.
                    </p>
                  </div>

                  <div className="p-4 bg-stone-50/90 rounded-2xl border border-stone-200/90 space-y-3.5">
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
                          placeholder="As printed in passbook"
                          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
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
                          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
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
                          className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
                        />
                      </div>
                      <div>
                        <label className="block text-stone-700 font-semibold mb-1">
                          Confirm Account Number *
                        </label>
                        <input
                          type="text"
                          required
                          value={requestData.bank_confirm_account_number}
                          onChange={(e) => setRequestData({ ...requestData, bank_confirm_account_number: e.target.value.replace(/\s+/g, '') })}
                          placeholder="Re-enter bank account number"
                          className={`w-full px-3 py-2 bg-white border rounded-xl font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9b4100] ${
                            requestData.bank_confirm_account_number && requestData.bank_account_number === requestData.bank_confirm_account_number
                              ? 'border-emerald-500 bg-emerald-50/20'
                              : 'border-stone-200'
                          }`}
                        />
                      </div>
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
                        className={`w-full px-3 py-2 bg-white border rounded-xl font-mono uppercase text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9b4100] ${
                          requestData.bank_ifsc_code?.length === 11 ? 'border-emerald-400 bg-emerald-50/20' : 'border-stone-200'
                        }`}
                      />
                    </div>
                  </div>

                  {/* MANDATORY PASSBOOK PHOTO UPLOAD */}
                  {renderPassbookUploader(requestData.bank_passbook_image, 'request')}

                  {/* Step 3 Navigation & Final Submission */}
                  <div className="pt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(2)}
                      className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Back to FSSAI</span>
                    </button>
                    <button
                      type="button"
                      disabled={loading || uploadingPassbook}
                      onClick={handleRequestAuthorization}
                      className="px-6 py-3 bg-[#9b4100] hover:bg-[#803300] text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
                    >
                      <span>{loading ? 'Submitting Application...' : 'Submit Seller Application'}</span>
                      <CheckCircle size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: FULL SELLER ONBOARDING (When isAuthorizedToSell is true)
  // Progressive Multi-Step Registration Flow
  // =========================================================================
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {renderPreviewModal()}

      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Store size={30} className="text-[#9b4100]" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-full uppercase tracking-wider mb-2">
          <ShieldCheck size={13} /> Admin Authorization Granted
        </div>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
          Seller Onboarding & Registration
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-2">
          Complete your 3-step profile to finalize settlement banking and activate your Wangs artisan shop.
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
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-stone-200/90 shadow-xl text-xs space-y-6">
          {/* Stepper Header */}
          {renderStepper(currentStep, setCurrentStep, false)}

          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 1: USER ACCOUNT & BUSINESS IDENTITY */}
          {/* ========================================================= */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700">
                <p className="font-semibold text-stone-900">Step 1: Account Credentials & Workshop Location</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Set up your seller login credentials and physical production kitchen address.
                </p>
              </div>

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
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
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
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
                  />
                </div>
              </div>

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
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
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
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
                  />
                </div>
              </div>

              {/* Public Contact Email with Live Email OTP */}
              <div>
                <label className="block text-stone-700 font-medium mb-1">
                  Public Contact Email * (Must be verified via OTP)
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
                    className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
                  />
                  {!otpVerified ? (
                    <button
                      type="button"
                      disabled={otpLoading || !formData.contact_email || otpResendTimer > 0}
                      onClick={handleSendEmailOtp}
                      className="px-4 py-2 bg-[#9b4100] hover:bg-[#803300] text-white rounded-xl text-[11px] font-bold whitespace-nowrap disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
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
                    <span className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-[11px] font-bold flex items-center gap-1.5 whitespace-nowrap shadow-xs">
                      <CheckCircle size={13} /> Verified
                    </span>
                  )}
                </div>

                {/* Domain Typo Alert */}
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
                  <div className="mt-2.5 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-stone-700">
                        Code sent to: <strong className="font-mono text-[#9b4100] bg-white px-1.5 py-0.5 rounded border border-amber-200">{formData.contact_email}</strong>
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
                        className="w-36 px-3 py-2 bg-white border border-[#9b4100] rounded-xl text-center font-mono text-sm font-bold tracking-widest text-stone-900 shadow-inner focus:outline-none"
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
                  </div>
                )}
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      className="w-full pl-3 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9b4100] text-stone-900"
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
                      className="w-full pl-3 pr-10 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9b4100] text-stone-900"
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
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
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
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9b4100] font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    if (validateMfgStep(1)) {
                      setCurrentStep(2);
                    }
                  }}
                  className="px-6 py-2.5 bg-[#9b4100] hover:bg-[#803300] text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Step 2: FSSAI Compliance</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: REGULATORY FSSAI & BRAND STORY */}
          {/* ========================================================= */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-stone-700">
                <p className="font-semibold text-stone-900">Step 2: Mandatory FSSAI Licensing & Brand Heritage</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Enter your 14-digit FSSAI food business registration number and tell us your artisan story.
                </p>
              </div>

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
                    maxLength={14}
                    name="fssai_license_number"
                    value={formData.fssai_license_number}
                    onChange={(e) => setFormData({ ...formData, fssai_license_number: e.target.value.replace(/\D/g, '').slice(0, 14) })}
                    placeholder="e.g. 10023064000124"
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl font-mono text-sm tracking-wider text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
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
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl font-mono text-stone-900 focus:outline-none focus:ring-1 focus:ring-[#9b4100] uppercase"
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
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
                />
              </div>

              {/* Policy handbook */}
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-[#9b4100] shrink-0" />
                  <span className="text-[11px]">Official Seller Rules & Policy Handbook</span>
                </div>
                <a
                  href="/documents/wangs_seller_rules.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-[#9b4100] hover:underline"
                >
                  Download PDF
                </a>
              </div>

              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back to Account</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (validateMfgStep(2)) {
                      setCurrentStep(3);
                    }
                  }}
                  className="px-6 py-2.5 bg-[#9b4100] hover:bg-[#803300] text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Proceed to Step 3: Bank & Passbook</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: SETTLEMENT BANK & MANDATORY PASSBOOK PHOTO */}
          {/* ========================================================= */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-stone-700">
                <p className="font-semibold text-stone-900">Step 3: Payout Settlement & Bank Passbook Verification</p>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Disbursements are wired directly to this account every Monday. Passbook photo is strictly required.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Account Holder Name *</label>
                  <input
                    type="text"
                    required
                    name="bank_account_holder"
                    value={formData.bank_account_holder}
                    onChange={handleChange}
                    placeholder="As printed in bank passbook"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Bank Name *</label>
                  <input
                    type="text"
                    required
                    name="bank_name"
                    value={formData.bank_name}
                    onChange={handleChange}
                    placeholder="e.g. State Bank of India Kohima"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Account Number *</label>
                  <input
                    type="text"
                    required
                    name="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_account_number: e.target.value.replace(/\s+/g, '') })}
                    placeholder="Bank account number"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 font-medium mb-1">Confirm Account Number *</label>
                  <input
                    type="text"
                    required
                    name="bank_confirm_account_number"
                    value={formData.bank_confirm_account_number}
                    onChange={(e) => setFormData({ ...formData, bank_confirm_account_number: e.target.value.replace(/\s+/g, '') })}
                    placeholder="Re-enter bank account number"
                    className={`w-full px-3 py-2 bg-stone-50 border rounded-xl font-mono focus:outline-none focus:ring-1 focus:ring-[#9b4100] ${
                      formData.bank_confirm_account_number && formData.bank_account_number === formData.bank_confirm_account_number
                        ? 'border-emerald-500 bg-emerald-50/20'
                        : 'border-stone-200'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-stone-700 font-medium mb-1">IFSC Code (11 Chars) *</label>
                <input
                  type="text"
                  required
                  maxLength={11}
                  name="bank_ifsc_code"
                  value={formData.bank_ifsc_code}
                  onChange={(e) => setFormData({ ...formData, bank_ifsc_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11) })}
                  placeholder="e.g. SBIN0000214"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono uppercase focus:outline-none focus:ring-1 focus:ring-[#9b4100]"
                />
              </div>

              {/* MANDATORY PASSBOOK PHOTO UPLOAD */}
              {renderPassbookUploader(formData.bank_passbook_image, 'mfg')}

              <div className="pt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Back to FSSAI</span>
                </button>
                <button
                  type="button"
                  disabled={loading || uploadingPassbook}
                  onClick={handleSubmit}
                  className="px-8 py-3.5 bg-[#9b4100] hover:bg-[#803300] text-white font-bold rounded-xl shadow-lg transition-all flex items-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Submitting Application...' : 'Submit Seller Application'}</span>
                  <CheckCircle size={17} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
