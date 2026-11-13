import React from 'react';

export type StatusType = 'ok' | 'warn' | 'danger' | 'neutral';

export interface StatusBadgeProps {
  status: StatusType;
  label: React.ReactNode;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = '' }) => {
  const dotColor = {
    ok: 'bg-ok',
    warn: 'bg-warn',
    danger: 'bg-danger',
    neutral: 'bg-ink-3',
  }[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full bg-surface-2 text-[11px] font-medium text-ink-2 select-none border border-line/40 ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
