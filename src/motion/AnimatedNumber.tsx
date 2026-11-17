import React, { useEffect, useRef, useState } from 'react';
import { useMotionTier } from './useMotionTier';
import { MOTION_DURATIONS } from './tokens';

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}

/**
 * Tabular Numeric Tweening Component
 * Prevents horizontal layout shifts using tabular-nums font property
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = MOTION_DURATIONS.number,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = ''
}) => {
  const { tier } = useMotionTier();
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // If reduced tier or same value, update instantly
    if (tier === 'none' || tier === 'reduced' || Math.abs(prevValueRef.current - value) < 0.0001) {
      setDisplayValue(value);
      prevValueRef.current = value;
      return;
    }

    const startVal = prevValueRef.current;
    const endVal = value;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Snappy cubic ease-out curve: 1 - (1 - progress)^3
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (endVal - startVal) * easeOut;

      setDisplayValue(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endVal);
        prevValueRef.current = endVal;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [value, duration, tier]);

  const formatted = decimals > 0 
    ? displayValue.toFixed(decimals) 
    : Math.round(displayValue).toLocaleString('en-IN');

  return (
    <span className={`inline-block tabular-nums font-mono ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  );
};
