import React from 'react';

export interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: 'ok' | 'warn' | 'danger' | 'neutral';
  icon?: React.ReactNode;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  delta,
  deltaType = 'ok',
  icon,
  subtitle,
  onClick,
  className = '',
}) => {
  const deltaColors = {
    ok: 'text-ok',
    warn: 'text-warn',
    danger: 'text-danger',
    neutral: 'text-ink-3',
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-surface shadow-card p-4 border border-line/40 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-pop active:scale-[.99]' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-ink-3 truncate">{label}</span>
        {icon && <span className="text-ink-3/70 flex-shrink-0">{icon}</span>}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums text-ink">{value}</span>
        {delta && (
          <span className={`text-xs font-medium ${deltaColors[deltaType]} shrink-0`}>
            {delta}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-[11px] text-ink-3 truncate">{subtitle}</p>}
    </div>
  );
};

export default KpiCard;
