// ============================================================================
// SHARED DESIGN SYSTEM - FILTER CHIP
// File: src/components/Common/UI/FilterChip.tsx
// ============================================================================

import React from 'react';

export interface FilterChipProps {
  label: string;
  active?: boolean;
  count?: number | string;
  countVariant?: 'default' | 'amber' | 'rose' | 'emerald';
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  role?: string;
  'aria-selected'?: boolean;
  title?: string;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  active = false,
  count,
  countVariant = 'default',
  icon,
  onClick,
  className = '',
  role = 'tab',
  'aria-selected': ariaSelected,
  title
}) => {
  // Determine count badge styling
  let countBadgeClasses = 'bg-slate-100 dark:bg-[#1E2E28] text-slate-500 dark:text-[#8FA69C]';
  if (active) {
    countBadgeClasses = 'bg-white/20 text-white';
  } else if (countVariant === 'amber') {
    countBadgeClasses = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-bold';
  } else if (countVariant === 'rose') {
    countBadgeClasses = 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 font-bold';
  } else if (countVariant === 'emerald') {
    countBadgeClasses = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold';
  }

  // Active / Inactive chip base classes
  const baseClasses = active
    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
    : countVariant === 'amber' && typeof count === 'number' && count > 0
    ? 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 border-amber-300/80 dark:border-amber-800/60 hover:border-amber-400'
    : 'bg-white dark:bg-[#131F1B] text-slate-700 dark:text-[#C4D4CE] border-slate-200 dark:border-[#24352F] hover:border-emerald-500/50';

  return (
    <button
      type="button"
      role={role}
      aria-selected={ariaSelected !== undefined ? ariaSelected : active}
      onClick={onClick}
      title={title}
      className={`snap-start shrink-0 h-9 px-3 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 border transition-all duration-150 active:scale-95 cursor-pointer whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${baseClasses} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
      {count !== undefined && count !== null && (
        <span
          className={`text-[11px] font-mono font-bold px-1.5 py-0.2 rounded-full leading-none transition-colors ${countBadgeClasses}`}
        >
          {typeof count === 'number' ? count.toLocaleString('en-IN') : count}
        </span>
      )}
    </button>
  );
};
