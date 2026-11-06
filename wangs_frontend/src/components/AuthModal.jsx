import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Lock, Mail, User, Phone, Eye, EyeOff, ShoppingBag, Heart, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function AuthModal() {
  const { user, authModalConfig, closeAuthModal, login, register } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState(authModalConfig?.initialTab || 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regFirstName, setRegFirstName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Update tab when modal opens with custom initialTab
  React.useEffect(() => {
    if (authModalConfig?.initialTab) {
      setActiveTab(authModalConfig.initialTab);
    }
    setErrorMsg('');
  }, [authModalConfig]);

  if (!authModalConfig || user) {
    return null;
  }

  const actionText = authModalConfig.actionText || 'proceed';

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const identifier = loginIdentifier.trim();
    if (!identifier || !loginPassword) {
      setErrorMsg('Please enter your email or username and password.');
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = await login(identifier, loginPassword);
      toast.success(`Welcome back, ${loggedInUser.first_name || loggedInUser.username || 'Pickle Lover'}!`);
      const cb = authModalConfig.onAuthenticated;
      closeAuthModal();
      if (typeof cb === 'function') {
        setTimeout(() => cb(loggedInUser), 50);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email/username or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const email = regEmail.trim().toLowerCase();
    const firstName = regFirstName.trim();
    const phone = regPhone.trim();

    if (!email) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const newUser = await register({
        first_name: firstName || email.split('@')[0],
        email,
        phone_number: phone,
        password: regPassword,
      });
      toast.success(`Welcome to Wangs, ${newUser.first_name || 'Artisan Foodie'}!`);
      const cb = authModalConfig.onAuthenticated;
      closeAuthModal();
      if (typeof cb === 'function') {
        setTimeout(() => cb(newUser), 50);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Could not create account. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs transition-opacity"
        onClick={closeAuthModal}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Top Header Strip */}
        <div className="bg-[#faf2ed] px-6 pt-6 pb-5 border-b border-[#dec0b3]/40 flex items-start justify-between relative">
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-2">
              <span className="font-serif text-2xl font-bold tracking-tight text-[#9b4100]">
                Wangs
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300">
                <Sparkles size={11} className="text-amber-700" />
                Artisan Marketplace
              </span>
            </div>
            <p className="text-xs text-stone-600 leading-snug pt-0.5">
              Please sign in or create an account to <strong className="text-stone-900 font-semibold">{actionText}</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={closeAuthModal}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-800 hover:bg-stone-200/60 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-100 bg-stone-50/70 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'login'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'register'
                ? 'bg-white text-stone-900 shadow-xs border border-stone-200/80'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error message banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-800 animate-in fade-in">
            <AlertCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMsg}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="p-6">
          {activeTab === 'login' ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="Enter your email or username"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#faf8f5] rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-[#9b4100] focus:ring-1 focus:ring-[#9b4100] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#faf8f5] rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-[#9b4100] focus:ring-1 focus:ring-[#9b4100] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#9b4100] hover:bg-[#803500] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In & Continue</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              <div className="pt-2 text-center space-y-2 border-t border-stone-100">
                <p className="text-[11px] text-stone-500">
                  Don't have an account yet?{' '}
                  <button
                    type="button"
                    onClick={() => { setActiveTab('register'); setErrorMsg(''); }}
                    className="font-bold text-[#9b4100] hover:underline"
                  >
                    Create Account
                  </button>
                </p>
                <p className="text-[11px] text-stone-400">
                  Need OTP sign-in or forgot password?{' '}
                  <Link
                    to="/login"
                    onClick={closeAuthModal}
                    className="text-stone-600 underline font-medium hover:text-[#9b4100]"
                  >
                    Use Full Sign-In Page
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                    placeholder="E.g. Priya Sharma"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#faf8f5] rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-[#9b4100] focus:ring-1 focus:ring-[#9b4100] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#faf8f5] rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-[#9b4100] focus:ring-1 focus:ring-[#9b4100] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#faf8f5] rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-[#9b4100] focus:ring-1 focus:ring-[#9b4100] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 mb-1">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#faf8f5] rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:border-[#9b4100] focus:ring-1 focus:ring-[#9b4100] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#9b4100] hover:bg-[#803500] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <span>Creating account...</span>
                ) : (
                  <>
                    <span>Sign Up & Continue</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>

              <div className="pt-2 text-center border-t border-stone-100">
                <p className="text-[11px] text-stone-500">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setActiveTab('login'); setErrorMsg(''); }}
                    className="font-bold text-[#9b4100] hover:underline"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </form>
          )}
        </div>

        {/* Trust Footer */}
        <div className="px-6 py-3 bg-stone-50 border-t border-stone-100 flex items-center justify-center gap-2 text-[10px] text-stone-500 font-medium">
          <ShieldCheck size={13} className="text-emerald-700" />
          <span>Safe & Secure Escrow · Verified Artisan Pickles</span>
        </div>
      </div>
    </div>
  );
}
