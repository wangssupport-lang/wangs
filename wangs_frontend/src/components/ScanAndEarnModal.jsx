import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera, QrCode, X, CheckCircle2, AlertCircle, Sparkles,
  ArrowRight, RefreshCw, KeyRound, Check, Gift, Zap, ZapOff,
  Image as ImageIcon, UploadCloud, RotateCcw
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

// Synthesize pleasant success chime using Web Audio API
const playSuccessSound = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Ignore audio errors on un-interacted browsers
  }
};

export default function ScanAndEarnModal({ isOpen, onClose, onSuccess, initialToken = '' }) {
  const { user, requireAuth } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'manual'
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [cameraRunning, setCameraRunning] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState(null);

  const html5QrCodeRef = useRef(null);
  const isScanningRef = useRef(false);
  const fileInputRef = useRef(null);

  // Clean raw QR code or full URL into a clean token or order identifier
  const cleanToken = (raw) => {
    if (!raw) return '';
    let t = raw.trim();
    if (t.includes('unboxing=')) {
      return t.split('unboxing=')[1].split('&')[0].trim();
    }
    if (t.includes('token=')) {
      return t.split('token=')[1].split('&')[0].trim();
    }
    if (t.includes('order=')) {
      return t.split('order=')[1].split('&')[0].trim();
    }
    const matchOrder = t.match(/(WNG-\d{8}-[A-Za-z0-9]+)/i);
    if (matchOrder) {
      return matchOrder[1].toUpperCase();
    }
    const matchToken = t.match(/(WNG-QR-[A-Za-z0-9_\-]+)/i);
    if (matchToken) {
      return matchToken[1];
    }
    const matchUnit = t.match(/(WNG-U-[A-Za-z0-9_\-]+)/i);
    if (matchUnit) {
      return matchUnit[1];
    }
    return t;
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setScanResult(null);
      setManualToken('');
      setCameraError(null);
      setTorchOn(false);
      setHasTorch(false);
    } else {
      if (!user) {
        requireAuth(() => {}, 'claim your delivery reward');
      } else if (initialToken) {
        // Auto-claim if initialToken provided
        processClaimToken(initialToken);
      }
    }
  }, [isOpen, user, initialToken]);

  useEffect(() => {
    if (isOpen && activeTab === 'camera' && !scanResult && !initialToken) {
      startCamera(selectedCameraId);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, scanResult, selectedCameraId]);

  const startCamera = async (cameraId = null) => {
    if (isScanningRef.current) return;
    setCameraError(null);

    // Short timeout to guarantee container DOM presence
    setTimeout(async () => {
      const element = document.getElementById('qr-reader-container');
      if (!element) return;

      try {
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode('qr-reader-container', {
            verbose: false,
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true,
            },
          });
        }

        // Enumerate video devices
        try {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            setAvailableCameras(devices);
          }
        } catch {
          // Camera enumeration fallback
        }

        const config = {
          fps: 24, // Fast scan rate for instant recognition
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minEdge * 0.82);
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
        };

        const cameraSource = cameraId ? { deviceId: { exact: cameraId } } : { facingMode: 'environment' };

        await html5QrCodeRef.current.start(
          cameraSource,
          config,
          (decodedText) => {
            handleCodeScanned(decodedText);
          },
          () => {
            // Ignore scan noise
          }
        );

        isScanningRef.current = true;
        setCameraRunning(true);

        // Check if flashlight / torch is supported on active video track
        try {
          const track = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
          if (track && track.torchFeature && track.torchFeature().isSupported()) {
            setHasTorch(true);
          }
        } catch {
          setHasTorch(false);
        }
      } catch (err) {
        console.warn('Failed to start camera:', err);
        setCameraError(
          err.message?.includes('Permission')
            ? 'Camera permission was denied. Please allow camera access in your browser settings, or enter the code manually.'
            : 'Unable to access rear camera. You can upload a photo of the QR code or enter the code manually.'
        );
        setCameraRunning(false);
      }
    }, 120);
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
        setTorchOn(false);
        setHasTorch(false);
      }
    }
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !cameraRunning) return;
    try {
      const nextState = !torchOn;
      const track = html5QrCodeRef.current.getRunningTrackCameraCapabilities();
      if (track && track.torchFeature) {
        await track.torchFeature().apply(nextState);
        setTorchOn(nextState);
      }
    } catch (e) {
      console.warn('Torch toggle not supported on this track:', e);
      toast.info('Flashlight is not available on this device');
    }
  };

  const processClaimToken = async (tokenString) => {
    const token = cleanToken(tokenString);
    if (!token) {
      toast.error('Please enter a valid QR code or order number.');
      return;
    }

    setLoading(true);
    await stopCamera();

    try {
      const res = await api.scanRewardQR(token);
      setScanResult(res);

      // Positive feedback
      playSuccessSound();
      if (navigator.vibrate) {
        navigator.vibrate([60, 40, 60]);
      }

      if (res.reward_awarded) {
        toast.success('Congratulations! 1 Wangs Credit awarded.');
      } else {
        toast.info(res.message);
      }
      if (onSuccess) {
        onSuccess(res);
      }
    } catch (err) {
      toast.error(err.message || 'Verification failed. Please check the code.');
      // If error, let them retry
      if (activeTab === 'camera') {
        startCamera(selectedCameraId);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCodeScanned = (decodedText) => {
    if (loading || scanResult) return;
    processClaimToken(decodedText);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('qr-reader-container', {
          verbose: false,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        });
      }
      const decoded = await html5QrCodeRef.current.scanFile(file, true);
      if (decoded) {
        processClaimToken(decoded);
      } else {
        toast.error('Could not detect a clear QR code in this image. Please try another photo.');
      }
    } catch (err) {
      toast.error('Could not read QR code from image: ' + (err.message || 'Please ensure the QR code is clearly visible and in focus.'));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      startCamera(selectedCameraId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
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
            <span>Wangs Rewards &middot; 1 Credit Earn</span>
          </div>
          <h3 className="font-serif font-bold text-xl text-white">Scan &amp; Earn Credits</h3>
          <p className="text-xs text-red-100 mt-1 leading-relaxed">
            Scan the package QR code printed on your parcel label or packaging seal to confirm delivery and earn 1 Wangs Credit.
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
                      This QR code has already been confirmed. Rewards have already been credited to your wallet.
                    </p>
                  </>
                ) : (
                  <>
                    <h4 className="font-serif font-bold text-lg text-emerald-900">
                      Delivery Confirmed!
                    </h4>
                    <p className="text-base font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl py-2 px-4 inline-block shadow-2xs">
                      🎉 You earned {scanResult.credits_awarded || 1} Wangs Credit!
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
                  <span className="text-stone-500 font-medium">Order Reference</span>
                  <span className="font-mono font-bold text-stone-900">
                    #{scanResult.order_number}
                  </span>
                </div>
                {scanResult.confirmation_source && (
                  <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                    <span className="text-stone-500 font-medium">Verified Via</span>
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
                  {/* Camera Viewport with Targeting Overlay */}
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border-2 border-stone-200 shadow-inner group">
                    <div id="qr-reader-container" className="w-full h-full" />

                    {/* Camera Control Overlay: Flashlight & Camera Switch */}
                    {cameraRunning && (
                      <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                        {hasTorch && (
                          <button
                            type="button"
                            onClick={toggleTorch}
                            className={`p-2 rounded-full backdrop-blur-md transition-all cursor-pointer ${
                              torchOn
                                ? 'bg-amber-400 text-stone-950 ring-2 ring-amber-300'
                                : 'bg-stone-900/60 text-white hover:bg-stone-900/80'
                            }`}
                            title={torchOn ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
                          >
                            {torchOn ? <Zap size={16} /> : <ZapOff size={16} />}
                          </button>
                        )}

                        {availableCameras.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const currIdx = availableCameras.findIndex((c) => c.id === selectedCameraId);
                              const nextIdx = (currIdx + 1) % availableCameras.length;
                              setSelectedCameraId(availableCameras[nextIdx].id);
                            }}
                            className="p-2 rounded-full bg-stone-900/60 hover:bg-stone-900/80 text-white backdrop-blur-md transition-all cursor-pointer"
                            title="Switch Camera"
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Active Laser Sweep Animation */}
                    {cameraRunning && !loading && (
                      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                        <div className="w-[82%] h-[82%] relative">
                          <div className="absolute inset-0 border-2 border-white/50 rounded-2xl" />
                          <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"
                               style={{
                                 animation: 'scanSweep 2.2s ease-in-out infinite alternate',
                               }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Loading Overlay */}
                    {loading && (
                      <div className="absolute inset-0 bg-stone-950/85 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 z-30">
                        <RefreshCw size={32} className="animate-spin text-red-500 mb-2" />
                        <span className="text-sm font-bold">Verifying parcel code...</span>
                        <span className="text-xs text-stone-400 mt-1">Claiming Wangs reward credit</span>
                      </div>
                    )}
                  </div>

                  {cameraError ? (
                    <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
                      <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <p className="font-bold">Camera Access Issue</p>
                        <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">{cameraError}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="font-bold text-red-700 underline cursor-pointer"
                          >
                            Upload Photo Instead →
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveTab('manual')}
                            className="font-bold text-stone-700 underline cursor-pointer"
                          >
                            Enter Code Manually →
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
                      <span className="text-[11px]">
                        Point at QR code on parcel label or package seal.
                      </span>

                      {/* Photo Upload Fallback */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-700 hover:text-red-700 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                        title="Scan from a photo in your gallery"
                      >
                        <ImageIcon size={12} className="text-stone-500" />
                        <span>Upload Photo</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleManualSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Enter QR Token or Order Number
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. WNG-20261111-ABC123 or WNG-QR-..."
                      value={manualToken}
                      onChange={(e) => setManualToken(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-red-600/30 focus:border-red-600"
                    />
                    <p className="text-[10px] text-stone-500 mt-1.5 leading-relaxed">
                      💡 Tip: You can enter the <strong>Order Number</strong> (e.g. <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-700">WNG-20261111-XXXXXX</code>) printed on your parcel slip, or the token printed beneath the jar QR label.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !manualToken.trim()}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
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
