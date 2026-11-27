import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 7);
    setToasts((prev) => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toast = {
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration),
    info: (msg, duration) => addToast(msg, 'info', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed top-4 left-4 right-4 sm:top-auto sm:left-auto sm:bottom-6 sm:right-6 z-[120] flex flex-col gap-2.5 sm:max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl shadow-2xl backdrop-blur-md text-xs font-medium border transition-all duration-300 animate-in fade-in slide-in-from-top-2 sm:slide-in-from-bottom-2 ${
              t.type === 'success'
                ? 'bg-stone-900/95 text-white border-emerald-500/50'
                : t.type === 'error'
                ? 'bg-stone-900/95 text-rose-100 border-red-500/50'
                : 'bg-stone-900/95 text-white border-stone-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {t.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />}
              {t.type === 'error' && <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />}
              {t.type === 'info' && <Info size={16} className="text-amber-400 flex-shrink-0" />}
              <span className="leading-snug">{t.message}</span>
            </div>
            <button
              onClick={() => removeToast(t.id)}
              className="text-stone-400 hover:text-white p-0.5 ml-2 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      success: (msg) => console.log('Toast success:', msg),
      error: (msg) => console.error('Toast error:', msg),
      info: (msg) => console.log('Toast info:', msg),
    };
  }
  return context;
}
