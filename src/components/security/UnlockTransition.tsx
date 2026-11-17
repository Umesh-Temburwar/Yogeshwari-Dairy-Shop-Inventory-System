import { useCallback, useEffect, useRef, useState } from "react";
import "./unlock-transition.css";

export type UnlockPhase = "idle" | "opening" | "granted" | "exiting" | "done";

/**
 * Timeline (ms):
 *   0    → lock opens                      (350)
 *   350  → checkmark + "Access Granted!"   (500)
 *   850  → onReveal() fires: dashboard mounts underneath, overlay fades out
 *   1400 → overlay removed
 *
 * Reduced motion: same order, shorter, opacity only (handled in CSS).
 */
const FULL = { granted: 350, reveal: 850, done: 1400 };
const REDUCED = { granted: 120, reveal: 500, done: 800 };

export function useUnlockTransition(onReveal: () => void) {
  const [phase, setPhase] = useState<UnlockPhase>("idle");
  const started = useRef(false); // blocks duplicate unlocks
  const timers = useRef<number[]>([]);
  const revealRef = useRef(onReveal);
  revealRef.current = onReveal;

  const play = useCallback(() => {
    if (started.current) return;
    started.current = true;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = reduced ? REDUCED : FULL;

    setPhase("opening");
    timers.current = [
      window.setTimeout(() => setPhase("granted"), t.granted),
      window.setTimeout(() => {
        setPhase("exiting");
        revealRef.current(); // flip your "unlocked" state here
      }, t.reveal),
      window.setTimeout(() => setPhase("done"), t.done),
    ];
  }, []);

  // Allow re-lock / sign-out to reset
  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    started.current = false;
    setPhase("idle");
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  return { phase, play, reset };
}

export function UnlockOverlay({ phase }: { phase: UnlockPhase }) {
  if (phase === "idle" || phase === "done") return null;

  return (
    <div
      className="unlock-overlay"
      data-phase={phase}
      role="status"
      aria-live="polite"
    >
      <div className="unlock-stack">
        <svg className="unlock-lock" viewBox="0 0 64 64" aria-hidden="true">
          <circle className="unlock-ring" cx="32" cy="32" r="31" />
          <path
            className="unlock-shackle"
            d="M22 29 V22 a10 10 0 0 1 20 0 V29"
          />
          <rect className="unlock-body" x="14" y="29" width="36" height="25" rx="6" />
          <circle className="unlock-keyhole" cx="32" cy="40" r="2.6" />
          <path className="unlock-check" d="M24.5 41.5 l5 5 10-11" />
        </svg>

        <div>
          <p className="unlock-title">Access Granted!</p>
          <p className="unlock-sub">Welcome to Yogeshwari Dairy POS</p>
        </div>
      </div>
    </div>
  );
}
