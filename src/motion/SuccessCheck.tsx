import React from 'react';
import { useMotionTier } from './useMotionTier';

interface SuccessCheckProps {
  size?: number;
  className?: string;
}

/**
 * Verified Action Success Checkmark with GPU SVG Stroke Draw
 */
export const SuccessCheck: React.FC<SuccessCheckProps> = ({
  size = 24,
  className = 'text-emerald-500'
}) => {
  const { tier } = useMotionTier();

  if (tier === 'none') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path
        d="M20 6L9 17l-5-5"
        style={{
          strokeDasharray: 30,
          strokeDashoffset: 0,
          animation: 'strokeDraw 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      />
    </svg>
  );
};
