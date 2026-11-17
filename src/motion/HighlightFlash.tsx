import React, { useEffect, useState } from 'react';
import { useMotionTier } from './useMotionTier';

interface HighlightFlashProps {
  active?: boolean;
  color?: 'emerald' | 'amber' | 'blue' | 'rose';
  durationMs?: number;
  className?: string;
  onAnimationEnd?: () => void;
}

/**
 * GPU-Accelerated Realtime Mutation Flash Overlay
 * 
 * Uses an absolutely positioned overlay with opacity transition
 * to eliminate layout recalculations and box-shadow paint costs.
 */
export const HighlightFlash: React.FC<HighlightFlashProps> = ({
  active = false,
  color = 'emerald',
  durationMs = 750,
  className = '',
  onAnimationEnd
}) => {
  const { tier } = useMotionTier();
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (!active || tier === 'none') return;

    // Trigger flash: jump to 0.20 opacity immediately, then fade to 0
    setOpacity(0.20);
    const timer = setTimeout(() => {
      setOpacity(0);
      if (onAnimationEnd) {
        setTimeout(onAnimationEnd, durationMs);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [active, durationMs, tier, onAnimationEnd]);

  if (tier === 'none' || !active) return null;

  const bgColors = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    rose: 'bg-rose-500'
  };

  return (
    <div
      aria-hidden="true"
      style={{
        transition: `opacity ${durationMs}ms cubic-bezier(0.4, 0, 0.2, 1)`,
        opacity
      }}
      className={`pointer-events-none absolute inset-0 rounded-[inherit] z-10 ${bgColors[color]} ${className}`}
    />
  );
};
