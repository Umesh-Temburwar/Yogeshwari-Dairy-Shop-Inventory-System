/**
 * SuccessCheck — SVG stroke-draw checkmark animation
 * Draws a checkmark path using strokeDashoffset animation.
 * Used for: Sale confirmed, batch saved, stock update success.
 *
 * Usage:
 *   <SuccessCheck size={48} className="text-emerald-500" />
 */
import React, { useEffect, useRef } from 'react';

interface SuccessCheckProps {
  size?: number;
  className?: string;
  color?: string;
}

export const SuccessCheck: React.FC<SuccessCheckProps> = ({
  size = 48,
  className = '',
  color = '#10b981',
}) => {
  const pathRef = useRef<SVGPathElement>(null);
  const circleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const tier = document.documentElement.getAttribute('data-motion') ?? 'full';
    if (tier === 'none') return;

    const path = pathRef.current;
    const circle = circleRef.current;
    if (!path || !circle) return;

    // Circle first
    const circleLen = circle.getTotalLength?.() ?? 100;
    const circleAnim = circle.animate(
      [
        { strokeDasharray: `${circleLen}`, strokeDashoffset: `${circleLen}`, opacity: 0 },
        { strokeDasharray: `${circleLen}`, strokeDashoffset: '0', opacity: 1 },
      ],
      { duration: 300, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
    );

    // Checkmark after circle
    const pathLen = path.getTotalLength?.() ?? 30;
    const checkAnim = path.animate(
      [
        { strokeDasharray: `${pathLen}`, strokeDashoffset: `${pathLen}` },
        { strokeDasharray: `${pathLen}`, strokeDashoffset: '0' },
      ],
      { duration: 250, delay: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'backwards' }
    );

    return () => {
      circleAnim.cancel();
      checkAnim.cancel();
    };
  }, []);

  const r = size / 2;
  const cx = r;
  const cy = r;
  const radius = r - 3;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle
        ref={circleRef}
        cx={cx}
        cy={cy}
        r={radius}
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        ref={pathRef}
        d={`M ${r * 0.38} ${r} L ${r * 0.72} ${r * 1.35} L ${r * 1.52} ${r * 0.62}`}
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
