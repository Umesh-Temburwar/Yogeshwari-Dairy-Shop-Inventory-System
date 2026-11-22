// ============================================================================
// SHARED DESIGN SYSTEM - STICKY ACTION BAR
// File: src/components/Common/UI/StickyActionBar.tsx
// ============================================================================

import React from 'react';

export interface StickyActionBarProps {
  children?: React.ReactNode;
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({
  children,
  leftContent,
  rightContent,
  className = '',
  onClick
}) => {
  return (
    <div
      className={`fixed left-0 right-0 z-30 px-3.5 sm:px-6 pointer-events-none transition-all duration-200 ease-out motion-reduce:transition-none bottom-[calc(env(safe-area-inset-bottom,0px)+4.5rem)] lg:bottom-5 max-w-xl mx-auto`}
    >
      <div
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={onClick}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
        className={`pointer-events-auto rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white shadow-xl shadow-emerald-950/20 border border-emerald-500/30 p-3 sm:p-3.5 flex items-center justify-between gap-3 active:scale-[0.98] transition-transform duration-150 cursor-pointer motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 ${className}`}
      >
        {children ? (
          children
        ) : (
          <>
            <div className="min-w-0 flex-1">{leftContent}</div>
            <div className="shrink-0">{rightContent}</div>
          </>
        )}
      </div>
    </div>
  );
};
