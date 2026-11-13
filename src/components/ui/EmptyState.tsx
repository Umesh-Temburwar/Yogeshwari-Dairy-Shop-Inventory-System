import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl bg-surface/50 border border-line/30 ${className}`}>
      {icon && <div className="mb-3 text-ink-3/70 p-3 rounded-xl bg-surface-2">{icon}</div>}
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      {description && <p className="mt-1 text-xs text-ink-3 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
