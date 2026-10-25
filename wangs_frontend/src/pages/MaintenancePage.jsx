import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, RefreshCw, ShieldCheck, Mail, Phone, Lock, CheckCircle2, ArrowRight } from 'lucide-react';
import { api } from '../api';

export default function MaintenancePage({ message }) {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [notifyFeedback, setNotifyFeedback] = useState('');
  const [checkingNow, setCheckingNow] = useState(false);

  const displayMessage = message || "We're currently fine-tuning our pantry inventory and performing scheduled system maintenance. We'll be back shortly!";

  // Background auto-polling: checks platform status every 15 seconds
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const settings = await api.getPlatformSettings();
        if (settings && settings.is_maintenance_mode === false) {
          // Maintenance mode turned off by admin, auto-reload to restore full storefront
          window.location.reload();
        }
      } catch (err) {
        // Silently swallow errors during polling
      }
    };

    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleManualCheck = async () => {
    setCheckingNow(true);
    try {
      const settings = await api.getPlatformSettings();
      if (settings && settings.is_maintenance_mode === false) {
        window.location.reload();
        return;
      }
      setTimeout(() => setCheckingNow(false), 600);
    } catch {
      setTimeout(() => setCheckingNow(false), 600);
    }
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setNotifyFeedback('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setNotifyFeedback('');
    try {
      const res = await api.subscribeMaintenanceNotify(email.trim());
      setSubscribed(true);
      setNotifyFeedback(res.message || "You're on the priority list! We'll alert you the moment we reopen.");
    } catch (err) {
      setNotifyFeedback(err.message || 'Unable to register email. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-950 via-forest-900 to-[#0e2c1a] text-cream-50 flex flex-col justify-between p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none">
      {/* Background radial gold aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[38rem] h-[38rem] rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <img
            src="/logo-white.png"
            alt="Wangs"
            className="h-8 w-auto sm:h-9 sm:w-auto object-contain"
          />
          <span className="font-brand font-black text-2xl sm:text-[1.85rem] tracking-[0.14em] leading-none text-white uppercase">
            Wangs
          </span>
        </div>
      </header>

      {/* Center Hero Card */}
      <main className="relative z-10 max-w-xl mx-auto w-full my-auto py-8 text-center space-y-6">
        {/* Animated Status Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400/15 border border-amber-400/35 text-amber-300 text-xs font-bold shadow-xs">
          <Wrench size={14} className="text-amber-400 animate-spin [animation-duration:8s]" />
          <span className="uppercase tracking-wider">Scheduled Maintenance & Restock</span>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
            Website Under Maintenance. <br />
            <span className="text-amber-400">We'll Be Right Back.</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed max-w-md mx-auto pt-1">
            {displayMessage}
          </p>
        </div>

        {/* Notify Me Email Form */}
        <div className="pt-2 max-w-md mx-auto w-full">
          {subscribed ? (
            <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
              <span>{notifyFeedback}</span>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-2">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email for opening alert..."
                  disabled={submitting}
                  className="w-full px-4 py-2.5 rounded-xl bg-forest-900/90 border border-forest-700/80 text-white placeholder-stone-400 text-xs focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50"
                  required
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto whitespace-nowrap inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-forest-950 font-bold text-xs shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-60"
                >
                  <span>{submitting ? 'Subscribing...' : 'Notify Me'}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
              {notifyFeedback && (
                <p className="text-[11px] text-amber-300/90 text-left pl-1">{notifyFeedback}</p>
              )}
            </form>
          )}
        </div>

        {/* Orders Guaranteed Assurance Banner */}
        <div className="pt-2 max-w-md mx-auto w-full">
          <div className="p-3.5 rounded-2xl bg-forest-900/60 border border-forest-800 backdrop-blur-md text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-amber-300 font-bold text-xs">
              <ShieldCheck size={16} />
              <span>Orders Guaranteed</span>
            </div>
            <p className="text-[11px] text-stone-400 leading-normal">
              All placed orders are safely confirmed, packed, and being dispatched on schedule.
            </p>
          </div>
        </div>

        {/* Auto-Polling Live Status Bar */}
        <div className="pt-2 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleManualCheck}
            disabled={checkingNow}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-forest-900/80 hover:bg-forest-800 border border-forest-700 text-stone-300 hover:text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <RefreshCw size={13} className={`text-amber-400 ${checkingNow ? 'animate-spin' : ''}`} />
            <span>{checkingNow ? 'Checking status...' : 'Check If Storefront Is Live'}</span>
          </button>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Auto-checks every 15s · Reopens automatically when ready</span>
          </div>
        </div>
      </main>

      {/* Footer Support Info */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full text-center text-[11px] text-stone-400 py-3 border-t border-forest-900/80 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>© {new Date().getFullYear()} Wangs Marketplace · Verified Artisanal Producers</span>
        <div className="flex items-center gap-4 text-stone-300">
          <span className="flex items-center gap-1">
            <Mail size={12} className="text-amber-400" /> wangssupport@gmail.com
          </span>
          <span className="flex items-center gap-1">
            <Phone size={12} className="text-amber-400" /> +91 94360 00000
          </span>
        </div>
      </footer>
    </div>
  );
}
