import React, { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function DeleteAccountCard({ accountLabel = 'Account' }) {
  const { logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const handleDelete = async (e) => {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== 'DELETE') {
      toast.error('Please type DELETE to confirm.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.deleteMyAccount({ confirm_text: 'DELETE' });
      toast.success(res.message || 'Your account has been removed.');
      setOpen(false);
      logout();
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Could not remove account');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-red-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h4 className="font-serif font-bold text-sm text-red-900 flex items-center gap-2">
            <Trash2 size={15} className="text-red-600" />
            <span>Remove {accountLabel}</span>
          </h4>
          <p className="text-xs text-stone-500 max-w-xl leading-relaxed">
            Permanently deactivate and remove your {accountLabel.toLowerCase()} from Wangs. Historical order and financial audit records remain preserved as required by compliance.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setConfirmText(''); setOpen(true); }}
          className="px-4 py-2 rounded-xl border border-red-300 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white text-xs font-semibold transition-colors shrink-0 cursor-pointer self-start sm:self-center"
        >
          Remove {accountLabel}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/60 backdrop-blur-xs p-4">
          <form onSubmit={handleDelete} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-serif text-lg font-bold text-stone-900">Confirm {accountLabel} Removal</h4>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  This action cannot be undone. You will be logged out immediately and your profile will be permanently removed.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Type <span className="font-mono text-red-700">DELETE</span> to confirm
              </label>
              <input
                type="text"
                required
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs font-mono focus:outline-none focus:border-red-500"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || confirmText.trim().toUpperCase() !== 'DELETE'}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-40 cursor-pointer"
              >
                {busy ? 'Removing...' : `Remove ${accountLabel}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
