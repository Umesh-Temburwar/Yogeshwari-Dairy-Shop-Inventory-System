/**
 * AnimatedList — stagger container for lists/grids
 * Wraps children and applies sequential entrance animation.
 * Only the FIRST maxItems children get stagger — rest appear instantly.
 *
 * Usage:
 *   <AnimatedList staggerMs={35} maxItems={8}>
 *     {items.map(item => <Card key={item.id} />)}
 *   </AnimatedList>
 */
import React, { useEffect, useRef, type ReactNode } from 'react';
import { STAGGER } from '../../animations/tokens';

interface AnimatedListProps {
  children: ReactNode;
  staggerMs?: number;
  maxItems?: number;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

export const AnimatedList: React.FC<AnimatedListProps> = ({
  children,
  staggerMs = STAGGER.step,
  maxItems = STAGGER.maxItems,
  className = '',
  as: Tag = 'div',
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const tier = document.documentElement.getAttribute('data-motion') ?? 'full';
    if (tier === 'none') return;

    const isReduced = tier === 'reduced';
    const childEls = Array.from(container.children) as HTMLElement[];

    const animations: Animation[] = [];

    childEls.slice(0, maxItems).forEach((el, i) => {
      const delay = isReduced ? 0 : i * staggerMs;
      const anim = el.animate(
        isReduced
          ? [{ opacity: 0 }, { opacity: 1 }]
          : [
              { opacity: 0, transform: 'translateY(8px)' },
              { opacity: 1, transform: 'translateY(0px)' },
            ],
        {
          duration: isReduced ? 120 : 180,
          delay,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          fill: 'backwards',
        }
      );
      animations.push(anim);
    });

    return () => animations.forEach(a => a.cancel());
  }, [staggerMs, maxItems]);

  return (
    // @ts-expect-error – dynamic tag typing
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
};
