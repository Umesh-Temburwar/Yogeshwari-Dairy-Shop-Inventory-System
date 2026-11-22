// ============================================================================
// SHARED DESIGN SYSTEM - CHIP ROW
// File: src/components/Common/UI/ChipRow.tsx
// ============================================================================

import React, { useRef, useEffect } from 'react';

export interface ChipRowProps {
  children: React.ReactNode;
  className?: string;
  role?: string;
  'aria-label'?: string;
  fadeGradient?: boolean;
}

export const ChipRow: React.FC<ChipRowProps> = ({
  children,
  className = '',
  role = 'tablist',
  'aria-label': ariaLabel,
  fadeGradient = true
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active chip into view smoothly
  useEffect(() => {
    if (!containerRef.current) return;
    const activeChip = containerRef.current.querySelector('[aria-selected="true"]');
    if (activeChip && 'scrollIntoView' in activeChip) {
      activeChip.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [children]);

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        role={role}
        aria-label={ariaLabel}
        className={`flex items-center gap-1.5 overflow-x-auto snap-x snap-mandatory py-1 scroll-smooth no-scrollbar ${className}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>

      {fadeGradient && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50 dark:from-[#0B1210] to-transparent z-1"
        />
      )}
    </div>
  );
};
