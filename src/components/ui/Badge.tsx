import React, { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'surface' | 'accent' | 'ok' | 'warn' | 'danger';
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  className = '',
  children,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-surface-2 text-ink-2',
    surface: 'bg-surface shadow-card text-ink border border-line/40',
    accent: 'bg-accent text-accent-fg',
    ok: 'bg-ok/10 text-ok',
    warn: 'bg-warn/10 text-warn',
    danger: 'bg-danger/10 text-danger',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-full text-[11px] font-medium select-none ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
