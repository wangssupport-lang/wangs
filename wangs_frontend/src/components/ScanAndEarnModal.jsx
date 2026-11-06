import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera, QrCode, X, CheckCircle2, AlertCircle, Sparkles,
  ArrowRight, RefreshCw, KeyRound, Check, Gift
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ScanAndEarnModal({ isOpen, onClose, onSuccess }) {
  const { user, requireAuth } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'manual'
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanResult, setScanResult] = useState(null); // { success, already_claimed, message, product_name, order_number, credits_awarded, current_balance, confirmation_source }
  const [cameraRunning, setCameraRunning] = useState(false);

  const html5QrCodeRef = useRef(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScanResult(null);
      setManualToken('');
      setCameraError(null);
    } else {
      if (!user) {
        requireAuth(() => {}, 'claim your delivery reward');
      }
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !scanResult) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, scanResult]);

  const startCamera = async () => {
    if (isScanningRef.current) return;
    setCameraError(null);

    // Wait for DOM element
    setTimeout(async () => {
      const element = document.getElementById('qr-reader-container');
      if (!element) return;

      try {
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode('qr-reader-container');
        }

        const config = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        };

        await html5QrCodeRef.current.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            handleCodeScanned(decodedText);
          },
          () => {
            // scan failure callback (ignored for noisy frames)
          }
        );
        isScanningRef.current = true;
        setCameraRunning(true);
      } catch (err) {
        console.warn('Failed to start camera:', err);
        setCameraError(err.message || 'Camera permission denied or camera not accessible. Please enter code manually.');
        setCameraRunning(false);
      }
    }, 150);
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && isScanningRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping camera:', err);
      } finally {
        isScanningRef.current = false;
        setCameraRunning(false);
      }
    }
  };

  const cleanToken = (raw) => {
    let t = (raw || '').trim();
    if (t.includes('token=')) {
      t = t.split('token=')[1].split('&')[0];
    }
    return t;
  };

  const processClaimToken = async (tokenString) => {
    const token = cleanToken(tokenString);
    if (!token) {
      toast.error('Please enter a valid QR token.');
      return;
    }

    setLoading(true);
    await stopCamera();

    try {
      const res = await api.scanRewardQR(token);
      setScanResult(res);
      if (res.reward_awarded) {
        toast.success('Congratulations! 1 Wangs Credit awarded.');
      } else {
        toast.info(res.message);
      }
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      toast.error(err.message || 'Verification failed');
      // If error, let them retry
      if (activeTab === 'camera') {
        startCamera();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeScanned = (decodedText) => {
    if (loading || scanResult) return;
    processClaimToken(decodedText);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualToken.trim()) {
      processClaimToken(manualToken);
    }
  };

  const handleReset = () => {
    setScanResult(null);
    setManualToken('');
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 relative">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-rose-700 text-white p-5 sm:p-6 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-2 text-amber-200 text-xs font-black uppercase tracking-wider mb-1">
            <Sparkles size={14} />
            <span>Wangs Rewards</span>
          </div>
          <h3 className="font-serif font-bold text-xl text-white">Scan &amp; Earn Credits</h3>
          <p className="text-xs text-red-100 mt-1">
            Confirm your product delivery by scanning the package QR code and earn 1 Wangs Credit.
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {scanResult ? (
            /* Confirmation Screen */
            <div className="text-center space-y-4 py-2">
              <div className="w-16 h-16 mx-auto rounded-3xl flex items-center justify-center shadow-lg transition-transform animate-in zoom-in-90 bg-emerald-100 text-emerald-700 border-2 border-emerald-300">
                {scanResult.reward_awarded ? (
                  <Gift size={32} className="text-emerald-700 animate-bounce" />
                ) : (
                  <CheckCircle2 size={32} className="text-emerald-700" />
                )}
              </div>

              <div className="space-y-1.5">
                {scanResult.already_claimed ? (
                  <>
                    <h4 className="font-serif font-bold text-lg text-amber-900">
                      Already Redeemed
                    </h4>
                    <p className="text-xs font-semibold text-stone-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      This QR code has already been used. Rewards have already been claimed.
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="font-serif font-bold text-lg text-emerald-900">
                      Congratulations! Your product delivery is confirmed.
                    </h4>
                    <p className="text-base font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl py-2 px-3 inline-block">
                      You earned {scanResult.credits_awarded || 1} Wangs Credit!
                    </p>
                  </>
                )}
              </div>

              {/* Product and Order info */}
              <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200 text-left text-xs space-y-2">
                <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                  <span className="text-stone-500 font-medium">Product</span>
                  <span className="font-bold text-stone-900 text-right truncate max-w-[200px]">
                    {scanResult.product_name}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                  <span className="text-stone-500 font-medium">Order Number</span>
                  <span className="font-mono font-bold text-stone-900">
                    #{scanResult.order_number}
                  </span>
                </div>
                {scanResult.confirmation_source && (
                  <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                    <span className="text-stone-500 font-medium">Confirmation Method</span>
                    <span className="px-2 py-0.5 rounded-full bg-stone-200 text-stone-800 text-[10px] font-bold">
                      {scanResult.confirmation_source}
                    </span>
                  </div>
                )}
                {scanResult.current_balance !== undefined && (
                  <div className="flex justify-between items-center pt-1 text-sm">
                    <span className="text-stone-700 font-bold">Your Rewards Balance</span>
                    <span className="font-serif font-black text-red-600">
                      {scanResult.current_balance} Credits
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Scan Another Jar
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Active Scanner or Manual Form */
            <div className="space-y-4">
              {/* Tabs */}
              <div className="grid grid-cols-2 p-1 bg-stone-100 rounded-2xl text-xs font-bold text-stone-600">
                <button
                  type="button"
                  onClick={() => setActiveTab('camera')}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'camera' ? 'bg-white text-stone-900 shadow-xs' : 'hover:text-stone-900'
                  }`}
                >
                  <Camera size={14} />
                  <span>Camera Scanner</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('manual')}
                  className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'manual' ? 'bg-white text-stone-900 shadow-xs' : 'hover:text-stone-900'
                  }`}
                >
                  <KeyRound size={14} />
                  <span>Enter Code Manually</span>
                </button>
              </div>

              {activeTab === 'camera' ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border-2 border-stone-200">
                    <div id="qr-reader-container" className="w-full h-full" />
                    {loading && (
                      <div className="absolute inset-0 bg-stone-900/80 backdrop-blur-2xs flex flex-col items-center justify-center text-white p-4">
                        <RefreshCw size={28} className="animate-spin text-red-500 mb-2" />
                        <span className="text-xs font-bold">Verifying QR token...</span>
                      </div>
                    )}
                  </div>

                  {cameraError ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <p className="font-bold">Camera Access Issue</p>
                        <p className="text-[11px] text-amber-700 mt-0.5">{cameraError}</p>
                        <button
                          type="button"
                          onClick={() => setActiveTab('manual')}
                          className="mt-2 text-xs font-bold text-red-700 underline cursor-pointer"
                        >
                          Switch to manual code entry →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-stone-500 text-center">
                      Point your phone camera at the QR code printed on your product jar.
                    </p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Enter QR Token or URL
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. wng_qr_abc123 or paste full QR link"
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">
                      You can find the short alphanumeric token printed directly beneath the QR code label on your parcel.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !manualToken.trim()}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        <span>Confirm Delivery &amp; Claim Credit</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
