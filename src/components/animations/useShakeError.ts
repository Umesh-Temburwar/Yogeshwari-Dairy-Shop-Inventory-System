/**
 * useShakeError — attaches an error-shake animation to an element ref
 * Call shake() after a validation failure.
 *
 * Usage:
 *   const { shakeRef, shake } = useShakeError<HTMLDivElement>();
 *   <div ref={shakeRef}>...</div>
 *   // On error: shake();
 */
import { useRef, useCallback } from 'react';

export function useShakeError<T extends HTMLElement = HTMLElement>() {
  const shakeRef = useRef<T>(null);

  const shake = useCallback(() => {
    const el = shakeRef.current;
    if (!el) return;
    const tier = document.documentElement.getAttribute('data-motion') ?? 'full';
    if (tier === 'none') return;

    el.animate(
      [
        { transform: 'translateX(0)' },
        { transform: 'translateX(-4px)' },
        { transform: 'translateX(4px)' },
        { transform: 'translateX(-3px)' },
        { transform: 'translateX(3px)' },
        { transform: 'translateX(-1px)' },
        { transform: 'translateX(0)' },
      ],
      { duration: 320, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' }
    );
  }, []);

  return { shakeRef, shake };
}
