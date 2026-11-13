import React from 'react';

export interface KbdProps {
  children: React.ReactNode;
  className?: string;
}

export const Kbd: React.FC<KbdProps> = ({ children, className = '' }) => {
  return (
    <kbd
      className={`inline-flex items-center justify-center min-w-[18px] h-5 px-1.5 rounded text-[10px] font-mono font-medium bg-surface-2 text-ink-3 border border-line/60 select-none shadow-xs ${className}`}
    >
      {children}
    </kbd>
  );
};

export default Kbd;
