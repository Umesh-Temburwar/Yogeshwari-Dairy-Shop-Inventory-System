import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  className = '',
  showCloseButton = true,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Sheet panel */}
      <div
        className={`relative z-10 w-full rounded-t-3xl bg-surface shadow-pop border-t border-line p-4 sm:p-5 max-h-[88dvh] flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))] transition-transform ${className}`}
      >
        {/* Drag handle */}
        <div className="mx-auto h-1 w-9 rounded-full bg-line mb-3 shrink-0" />

        {(title || showCloseButton) && (
          <div className="flex items-start justify-between pb-3 border-b border-line/40 shrink-0">
            <div>
              {title && <h3 className="text-base font-semibold text-ink tracking-tight">{title}</h3>}
              {subtitle && <p className="text-xs text-ink-3 mt-0.5">{subtitle}</p>}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg text-ink-3 hover:text-ink hover:bg-surface-2 grid place-items-center transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className="overflow-y-auto flex-1 py-2 text-ink">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BottomSheet;
