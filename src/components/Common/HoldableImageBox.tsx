import React, { useRef, useState } from 'react';

interface HoldableImageBoxProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  holdDurationMs?: number;
  onHold: () => void;
  onTap?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const MOVE_CANCEL_THRESHOLD_PX = 10;

/**
 * Mobile & Desktop Hold-to-Edit Product Image Container.
 * - Holding (~450ms) triggers haptic feedback and calls `onHold()` without firing a click/tap.
 * - Scrolling or dragging >10px cancels the hold cleanly so touch scrolling never misfires.
 * - Normal tap calls optional `onTap` (or bubbles cleanly to parent card click if omitted).
 */
export const HoldableImageBox: React.FC<HoldableImageBoxProps> = ({
  children,
  className = '',
  title,
  holdDurationMs = 450,
  onHold,
  onTap
}) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const didHoldRef = useRef(false);
  const [isHolding, setIsHolding] = useState(false);

  const clearHoldTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsHolding(false);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only respond to primary button / touch
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    didHoldRef.current = false;
    startPosRef.current = { x: e.clientX, y: e.clientY };
    setIsHolding(true);

    timerRef.current = setTimeout(() => {
      didHoldRef.current = true;
      setIsHolding(false);
      timerRef.current = null;
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(35);
        } catch {
          // Ignore unsupported vibrate
        }
      }
      onHold();
    }, holdDurationMs);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!startPosRef.current || !timerRef.current) return;
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    if (dx > MOVE_CANCEL_THRESHOLD_PX || dy > MOVE_CANCEL_THRESHOLD_PX) {
      clearHoldTimer();
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (didHoldRef.current) {
      e.preventDefault();
      e.stopPropagation();
      didHoldRef.current = false;
      return;
    }
    if (onTap) {
      onTap(e);
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearHoldTimer}
      onPointerCancel={clearHoldTimer}
      onPointerLeave={clearHoldTimer}
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
      title={title}
      className={`select-none ${isHolding ? 'scale-[0.97] ring-2 ring-emerald-500/60' : ''} transition-transform duration-150 ${className}`}
      style={{ WebkitTouchCallout: 'none' }}
    >
      {children}
    </div>
  );
};
