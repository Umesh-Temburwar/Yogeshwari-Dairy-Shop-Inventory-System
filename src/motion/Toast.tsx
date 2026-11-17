import React, { createContext, useContext, useState, useCallback, useId } from 'react';
import { useMotionTier } from './useMotionTier';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  durationMs?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, durationMs?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const { tier } = useMotionTier();

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = 'info', durationMs?: number) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const timeout = durationMs || (type === 'error' ? 5000 : 3000);

      setToasts((prev) => [...prev.slice(-3), { id, type, message, durationMs: timeout }]);

      setTimeout(() => {
        removeToast(id);
      }, timeout);
    },
    [removeToast]
  );

  const contextValue: ToastContextType = {
    toast: addToast,
    success: (msg: string) => addToast(msg, 'success'),
    error: (msg: string) => addToast(msg, 'error', 5000),
    info: (msg: string) => addToast(msg, 'info')
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Overlay Container - Safe Area Aware */}
      <div 
        aria-live="polite"
        className="fixed bottom-24 lg:bottom-6 left-3 right-3 lg:left-auto lg:right-6 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none"
      >
        {toasts.map((t) => {
          const isError = t.type === 'error';
          const isSuccess = t.type === 'success';

          return (
            <div
              key={t.id}
              style={{
                animation: tier !== 'none' 
                  ? 'toastEnter 220ms cubic-bezier(0.34, 1.4, 0.64, 1) forwards' 
                  : 'none'
              }}
              className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl flex items-center justify-between gap-3 text-xs font-bold border transition-all ${
                isError
                  ? 'bg-rose-900 text-rose-50 border-rose-700/80 shadow-rose-950/40'
                  : isSuccess
                  ? 'bg-emerald-900 text-emerald-50 border-emerald-700/80 shadow-emerald-950/40'
                  : 'bg-slate-900 dark:bg-[#1A2A25] text-white border-slate-700 dark:border-[#24352F]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isError && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                {!isError && !isSuccess && <Info className="w-4 h-4 text-sky-400 shrink-0" />}
                <span className="truncate leading-snug">{t.message}</span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Fallback if rendered outside provider
    return {
      toast: (msg) => console.log('[Toast]', msg),
      success: (msg) => console.log('[Toast Success]', msg),
      error: (msg) => console.error('[Toast Error]', msg),
      info: (msg) => console.log('[Toast Info]', msg)
    };
  }
  return ctx;
};
