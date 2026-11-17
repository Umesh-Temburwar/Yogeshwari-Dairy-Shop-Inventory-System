/**
 * Toast System — Yogeshwari Dairy ERP
 * Non-blocking, non-intrusive toast notifications.
 * Replaces ALL blocking alert() calls across the app.
 *
 * Usage:
 *   import { useToast } from '../../animations/useToast';
 *   const toast = useToast();
 *   toast.success('Saved!');
 *   toast.error('Invalid quantity');
 *   toast.info('Syncing...');
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useId,
  type ReactNode,
} from 'react';
import React from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

interface ToastContextValue {
  add: (msg: string, variant: ToastVariant, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback((message: string, variant: ToastVariant, duration?: number) => {
    const id = `toast-${Date.now()}-${++counterRef.current}`;
    const ms = duration ?? (variant === 'error' ? 5000 : 3000);
    setToasts(prev => {
      // Max 4 toasts at a time — drop the oldest
      const next = prev.length >= 4 ? prev.slice(1) : prev;
      return [...next, { id, message, variant, duration: ms }];
    });
    setTimeout(() => remove(id), ms);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ add }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  const { add } = ctx;
  return {
    success: (msg: string, duration?: number) => add(msg, 'success', duration),
    error:   (msg: string, duration?: number) => add(msg, 'error', duration),
    info:    (msg: string, duration?: number) => add(msg, 'info', duration),
    warning: (msg: string, duration?: number) => add(msg, 'warning', duration),
  };
}

// ─── Toast Container ─────────────────────────────────────────────────────────

const ICONS: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error:   XCircle,
  info:    Info,
  warning: Info,
};

const STYLES: Record<ToastVariant, string> = {
  success: 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100',
  error:   'bg-red-50 dark:bg-red-950/80 border-red-300 dark:border-red-700 text-red-900 dark:text-red-100',
  info:    'bg-blue-50 dark:bg-blue-950/80 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100',
  warning: 'bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100',
};

const ICON_STYLES: Record<ToastVariant, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error:   'text-red-500 dark:text-red-400',
  info:    'text-blue-500 dark:text-blue-400',
  warning: 'text-amber-500 dark:text-amber-400',
};

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-24 lg:bottom-6 right-3 lg:right-6 z-[9999] flex flex-col gap-2 max-w-[calc(100vw-24px)] w-full sm:max-w-sm pointer-events-none"
    >
      {toasts.map(t => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const Icon = ICONS[toast.variant];
  return (
    <div
      role="alert"
      className={`animate-toast-enter pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-sm ${STYLES[toast.variant]}`}
    >
      <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${ICON_STYLES[toast.variant]}`} />
      <p className="flex-1 text-sm font-medium leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
