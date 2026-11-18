import React, { useState, useEffect } from 'react';
import { MoreVertical, X } from 'lucide-react';

export interface MoreMenuAction {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  onClick: () => void;
  tone?: 'default' | 'primary' | 'danger';
}

export interface CompactStatItem {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: 'neutral' | 'emerald' | 'amber' | 'rose';
  valueClassName?: string;
  onClick?: () => void;
}

interface CompactPageHeaderProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  primaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    ariaLabel?: string;
    className?: string;
  };
  secondaryAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    ariaLabel?: string;
  };
  moreActions?: MoreMenuAction[];
  moreTitle?: string;
}

/**
 * Unified Mobile-First Compact Page Header (~40px tall, matches Inventory redesign)
 * - Row 1: Icon + concise title + optional More (⋮) bottom sheet + round primary CTA
 * - Eliminates bulky hero boxes and secondary Quick Action rows on 360px screens
 */
export const CompactPageHeader: React.FC<CompactPageHeaderProps> = ({
  title,
  subtitle,
  icon,
  primaryAction,
  secondaryAction,
  moreActions,
  moreTitle = 'Actions & Exports'
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    if (!isMoreOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMoreOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMoreOpen]);

  const hasMore = Boolean(moreActions && moreActions.length > 0);

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-100/90 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/40 flex items-center justify-center shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h1 className="text-[16px] sm:text-lg font-bold text-slate-900 dark:text-[#E7F0EC] tracking-tight truncate leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="hidden sm:block text-[11px] text-slate-500 dark:text-[#8FA69C] truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              aria-label={secondaryAction.ariaLabel || secondaryAction.label}
              className="h-9 px-3 rounded-full bg-white dark:bg-[#131F1B] hover:bg-slate-100 dark:hover:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#E7F0EC] text-xs font-bold inline-flex items-center gap-1 active:scale-[0.97] transition-transform cursor-pointer"
            >
              {secondaryAction.icon}
              <span>{secondaryAction.label}</span>
            </button>
          )}

          {hasMore && (
            <button
              type="button"
              onClick={() => setIsMoreOpen(true)}
              aria-label="More actions"
              title={moreTitle}
              className="w-9 h-9 rounded-full bg-white dark:bg-[#131F1B] hover:bg-slate-100 dark:hover:bg-[#1A2A25] border border-slate-200 dark:border-[#24352F] text-slate-700 dark:text-[#E7F0EC] flex items-center justify-center active:scale-[0.97] transition-transform cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          )}

          {primaryAction && (
            <button
              type="button"
              disabled={primaryAction.disabled}
              onClick={primaryAction.onClick}
              aria-label={primaryAction.ariaLabel || primaryAction.label}
              className={`h-9 px-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white text-xs font-bold inline-flex items-center gap-1 shadow-xs transition-transform disabled:opacity-50 cursor-pointer ${
                primaryAction.className || ''
              }`}
            >
              {primaryAction.icon}
              <span className="truncate max-w-[120px] sm:max-w-none">{primaryAction.label}</span>
            </button>
          )}
        </div>
      </div>

      {/* Slide-up More Actions Bottom Sheet */}
      {isMoreOpen && moreActions && (
        <div
          className="fixed inset-0 z-[105] bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150 motion-reduce:animate-none"
          onClick={() => setIsMoreOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={moreTitle}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-sm bg-white dark:bg-[#131F1B] text-slate-900 dark:text-[#E7F0EC] border-t sm:border border-slate-200 dark:border-[#24352F] rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-200 ease-out motion-reduce:animate-none pb-[env(safe-area-inset-bottom,0px)]"
          >
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-[#2C4139]" />
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-[#24352F]">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{moreTitle}</h2>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                aria-label="Close actions menu"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1A2A25] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 grid grid-cols-1 gap-1.5">
              {moreActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  onClick={() => {
                    setIsMoreOpen(false);
                    action.onClick();
                  }}
                  className={`w-full min-h-[44px] px-3.5 rounded-xl text-left text-xs font-bold inline-flex items-center gap-2.5 border transition-colors active:scale-[0.98] cursor-pointer ${
                    action.tone === 'primary'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'
                      : action.tone === 'danger'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50'
                      : 'bg-slate-50 dark:bg-[#1A2A25] hover:bg-slate-100 dark:hover:bg-[#223630] text-slate-800 dark:text-[#E7F0EC] border-slate-200/80 dark:border-[#24352F]'
                  }`}
                >
                  <span className="shrink-0">{action.icon}</span>
                  <span className="min-w-0 flex-1 py-1.5">
                    <span className="block truncate leading-tight">{action.label}</span>
                    {action.description && (
                      <span
                        className={`block text-[10px] font-medium truncate mt-0.5 ${
                          action.tone === 'primary'
                            ? 'text-emerald-100'
                            : 'text-slate-500 dark:text-[#8FA69C]'
                        }`}
                      >
                        {action.description}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface CompactStatStripProps {
  items: CompactStatItem[];
  columns?: 2 | 3 | 4;
}

/**
 * Slim Mobile-First Summary Stat Strip (saves ~80px vertical height vs bloated KPI tiles)
 */
export const CompactStatStrip: React.FC<CompactStatStripProps> = ({
  items,
  columns = 3
}) => {
  const gridClass =
    columns === 4
      ? 'grid-cols-2 sm:grid-cols-4'
      : columns === 2
      ? 'grid-cols-2'
      : 'grid-cols-3';

  const toneValueClass = (tone?: CompactStatItem['tone']): string => {
    switch (tone) {
      case 'emerald':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'amber':
        return 'text-amber-600 dark:text-amber-400';
      case 'rose':
        return 'text-rose-600 dark:text-rose-400';
      default:
        return 'text-slate-900 dark:text-white';
    }
  };

  return (
    <div className={`grid ${gridClass} gap-1.5 sm:gap-2.5`}>
      {items.map((item, idx) => {
        const content = (
          <>
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8FA69C] block truncate">
              {item.label}
            </span>
            <span
              className={`text-[15px] sm:text-lg font-bold tabular-nums leading-tight block mt-0.5 truncate ${
                item.valueClassName || toneValueClass(item.tone)
              }`}
            >
              {item.value}
            </span>
            {item.sublabel && (
              <span className="text-[10px] text-slate-400 dark:text-[#7F988E] block truncate mt-0.5">
                {item.sublabel}
              </span>
            )}
          </>
        );

        if (item.onClick) {
          return (
            <button
              key={idx}
              type="button"
              onClick={item.onClick}
              className="px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200/80 dark:border-[#24352F] text-left hover:border-emerald-500/60 active:scale-[0.98] transition-all cursor-pointer min-w-0"
            >
              {content}
            </button>
          );
        }

        return (
          <div
            key={idx}
            className="px-2.5 py-2 sm:px-3.5 sm:py-2.5 rounded-xl bg-white dark:bg-[#131F1B] border border-slate-200/80 dark:border-[#24352F] min-w-0"
          >
            {content}
          </div>
        );
      })}
    </div>
  );
};
