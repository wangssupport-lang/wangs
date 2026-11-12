import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles, CheckCircle2, AlertCircle, Gift, ArrowRight,
  RefreshCw, Package, ShieldCheck, Camera, LogIn
} from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ScanAndEarnModal from '../components/ScanAndEarnModal';

export default function RewardsScanPage() {
  const [searchParams] = useSearchParams();
  const rawToken = searchParams.get('token') || searchParams.get('unboxing') || searchParams.get('order') || '';
  const navigate = useNavigate();
  const toast = useToast();
  const { user, requireAuth } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewInfo, setPreviewInfo] = useState(null);
  const [claimResult, setClaimResult] = useState(null);
  const [showScannerModal, setShowScannerModal] = useState(false);

  const cleanToken = (raw) => {
    if (!raw) return '';
    let t = raw.trim();
    if (t.includes('unboxing=')) return t.split('unboxing=')[1].split('&')[0].trim();
    if (t.includes('token=')) return t.split('token=')[1].split('&')[0].trim();
    if (t.includes('order=')) return t.split('order=')[1].split('&')[0].trim();
    const matchOrder = t.match(/(WNG-\d{8}-[A-Za-z0-9]+)/i);
    if (matchOrder) return matchOrder[1].toUpperCase();
    const matchToken = t.match(/(WNG-QR-[A-Za-z0-9_\-]+)/i);
    if (matchToken) return matchToken[1];
    return t;
  };

  const token = cleanToken(rawToken);

  useEffect(() => {
    if (!token) return;

    if (user) {
      // User is logged in, attempt to claim directly
      claimReward(token);
    } else {
      // User is not logged in, fetch public preview details
      previewToken(token);
    }
  }, [token, user]);

  const previewToken = async (tok) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.verifyRewardToken(tok);
      setPreviewInfo(data);
    } catch (err) {
      setError(err.message || 'Invalid or expired QR token.');
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (tok) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.scanRewardQR(tok);
      setClaimResult(res);
      if (res.reward_awarded) {
        toast.success('Congratulations! 1 Wangs Credit awarded.');
      } else {
        toast.info(res.message);
      }
    } catch (err) {
      setError(err.message || 'Could not verify QR code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignInAndClaim = () => {
    requireAuth(() => {
      claimReward(token);
    }, 'claim your delivery reward and credits');
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
      {/* Brand Header */}
      <div className="text-center space-y-2 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-black uppercase tracking-wider">
          <Sparkles size={14} className="text-red-600" />
          <span>Wangs Rewards</span>
        </div>
        <h1 className="font-serif font-black text-3xl sm:text-4xl text-stone-900">
          Delivery Confirmation
        </h1>
        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
          Scan &amp; verify your Wangs artisanal pickles to earn loyalty credits for future orders.
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw size={36} className="animate-spin text-red-600 mx-auto" />
            <h3 className="font-serif font-bold text-base text-stone-900">Verifying Product Unit...</h3>
            <p className="text-xs text-stone-500">Checking cryptographically secure token with Wangs Registry</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 space-y-4">
            <div className="w-14 h-14 bg-red-100 text-red-700 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle size={28} />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif font-bold text-lg text-stone-900">Verification Issue</h3>
              <p className="text-xs text-stone-600 max-w-sm mx-auto">{error}</p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
              <button
                type="button"
                onClick={() => setShowScannerModal(true)}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Scan Another QR Code
              </button>
              <Link
                to="/account"
                className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-colors text-center"
              >
                Go to My Account
              </Link>
            </div>
          </div>
        ) : claimResult ? (
          /* Success / Already claimed State */
          <div className="text-center space-y-6 py-2">
            <div className="w-20 h-20 mx-auto rounded-3xl flex items-center justify-center shadow-lg bg-emerald-100 text-emerald-700 border-2 border-emerald-300">
              {claimResult.reward_awarded ? (
                <Gift size={40} className="animate-bounce" />
              ) : (
                <CheckCircle2 size={40} />
              )}
            </div>

            <div className="space-y-2">
              {claimResult.already_claimed ? (
                <>
                  <h2 className="font-serif font-bold text-xl text-amber-900">
                    Already Claimed
                  </h2>
                  <p className="text-xs font-semibold text-stone-700 bg-amber-50 border border-amber-200 rounded-xl p-3 max-w-md mx-auto">
                    This QR code has already been used. Rewards have already been claimed.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-serif font-bold text-2xl text-emerald-950">
                    Congratulations! Your product delivery is confirmed.
                  </h2>
                  <p className="text-lg font-black text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl py-2 px-4 inline-block">
                    You earned {claimResult.credits_awarded || 1} Wangs Credit!
                  </p>
                </>
              )}
            </div>

            <div className="bg-stone-50 rounded-2xl p-4 sm:p-5 border border-stone-200 text-left text-xs space-y-3 max-w-md mx-auto">
              <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                <span className="text-stone-500 font-medium">Delivered Product</span>
                <span className="font-bold text-stone-900 text-right truncate max-w-[220px]">
                  {claimResult.product_name}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                <span className="text-stone-500 font-medium">Order Number</span>
                <span className="font-mono font-bold text-stone-900">
                  #{claimResult.order_number}
                </span>
              </div>
              {claimResult.current_balance !== undefined && (
                <div className="flex justify-between items-center pt-1 text-sm font-bold">
                  <span className="text-stone-700">Updated Wallet Balance</span>
                  <span className="font-serif font-black text-red-600">
                    {claimResult.current_balance} Credits
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                to="/account"
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md transition-all text-center"
              >
                View My Rewards Wallet
              </Link>
              <Link
                to="/products"
                className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs transition-colors text-center"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : previewInfo ? (
          /* Preview State (User Not Logged In) */
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-amber-100 text-amber-800 border-2 border-amber-300 flex items-center justify-center">
              <Package size={32} />
            </div>

            <div className="space-y-1">
              <h2 className="font-serif font-bold text-xl text-stone-900">
                Confirm Delivery for {previewInfo.product_name}
              </h2>
              <p className="text-xs text-stone-600">
                Order #{previewInfo.order_number} · Unit #{previewInfo.unit_index}
              </p>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 space-y-1">
              <p className="font-bold flex items-center justify-center gap-1.5">
                <Sparkles size={14} className="text-emerald-700" />
                <span>Earn 1 Wangs Credit with this scan</span>
              </p>
              <p className="text-[11px] text-emerald-800">
                Sign in to your customer account to confirm receipt and receive this credit into your wallet.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignInAndClaim}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <LogIn size={15} />
              <span>Sign In to Claim 1 Wangs Credit</span>
            </button>
          </div>
        ) : (
          /* Standalone Landing when opened without ?token= */
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-stone-100 text-stone-700 flex items-center justify-center border border-stone-200">
              <Camera size={32} className="text-red-600" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-serif font-bold text-xl text-stone-900">
                Ready to Scan Your Product?
              </h2>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Open your device camera or enter the QR code manually to confirm delivery and earn 1 Wangs Credit per unit.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowScannerModal(true)}
              className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Camera size={15} />
              <span>Open Scanner / Enter Code</span>
            </button>
          </div>
        )}
      </div>

      <ScanAndEarnModal
        isOpen={showScannerModal}
        onClose={() => setShowScannerModal(false)}
        onSuccess={(res) => {
          setClaimResult(res);
          setShowScannerModal(false);
        }}
      />
    </div>
  );
}
