/**
 * HighlightFlash — brief overlay flash for realtime row updates
 * Shows a translucent emerald overlay that fades out.
 * Used for: stock quantity updates, cart item added feedback.
 *
 * Usage:
 *   const { flash, FlashOverlay } = useHighlightFlash();
 *   <div className="relative">
 *     <FlashOverlay />
 *     ... content ...
 *   </div>
 *   // On update:
 *   flash();
 */
import React, { useCallback, useRef, useState } from 'react';

export function useHighlightFlash() {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback(() => {
    const tier = document.documentElement.getAttribute('data-motion') ?? 'full';
    if (tier === 'none') return;

    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
    timerRef.current = setTimeout(() => setVisible(false), 700);
  }, []);

  const FlashOverlay = () =>
    visible ? (
      <span
        aria-hidden="true"
        className="animate-highlight-flash absolute inset-0 rounded-[inherit] bg-emerald-400/20 dark:bg-emerald-500/20 pointer-events-none"
      />
    ) : null;

  return { flash, FlashOverlay };
}
