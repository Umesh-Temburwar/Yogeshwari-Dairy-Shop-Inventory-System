// ============================================================================
// SHARED DESIGN SYSTEM - STATUS BADGE
// File: src/components/Common/UI/StatusBadge.tsx
// ============================================================================

import React from 'react';

export type StatusBadgeTone =
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'red'
  | 'slate'
  | 'blue'
  | 'purple'
  | 'cyan';

export interface StatusBadgeProps {
  label: string;
  tone?: StatusBadgeTone;
  pulse?: boolean;
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  tone = 'slate',
  pulse = false,
  icon,
  className = '',
  size = 'md'
}) => {
  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  let dotColor = 'bg-slate-500';

  switch (tone) {
    case 'emerald':
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60';
      dotColor = 'bg-emerald-500';
      break;
    case 'amber':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60';
      dotColor = 'bg-amber-500';
      break;
    case 'rose':
    case 'red':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60';
      dotColor = 'bg-rose-500';
      break;
    case 'blue':
    case 'cyan':
      colorClasses = 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800/60';
      dotColor = 'bg-sky-500';
      break;
    case 'purple':
      colorClasses = 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800/60';
      dotColor = 'bg-purple-500';
      break;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold border tracking-tight leading-none ${colorClasses} ${sizeClasses} ${className}`}
    >
      {pulse ? (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`} />
        </span>
      ) : (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
    </span>
  );
};
