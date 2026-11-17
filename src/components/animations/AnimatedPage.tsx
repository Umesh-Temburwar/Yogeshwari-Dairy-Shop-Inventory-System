/**
 * AnimatedPage — view transition wrapper
 * Wraps each major view/page with a smooth fade + subtle Y-lift entrance.
 * Re-mounts when viewKey changes (matches App.tsx key={activeView}).
 *
 * Respects data-motion tier:
 *   full    → opacity + translateY 8px over 220ms, ease-enter
 *   reduced → opacity only, 120ms
 *   none    → instant (0ms)
 */
import React, { useEffect, useRef, type ReactNode } from 'react';

interface AnimatedPageProps {
  children: ReactNode;
  className?: string;
}

export const AnimatedPage: React.FC<AnimatedPageProps> = ({ children, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const tier = document.documentElement.getAttribute('data-motion') ?? 'full';
    if (tier === 'none') return;

    const isReduced = tier === 'reduced';

    // Use Web Animations API — GPU-composited, zero layout thrash
    const anim = el.animate(
      isReduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: 'translateY(10px)' },
            { opacity: 1, transform: 'translateY(0px)' },
          ],
      {
        duration: isReduced ? 120 : 220,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'backwards',
      }
    );

    return () => anim.cancel();
  }, []);

  return (
    <div ref={ref} className={`w-full ${className}`}>
      {children}
    </div>
  );
};
