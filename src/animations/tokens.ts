/**
 * Motion Tokens — Yogeshwari Dairy ERP
 * Single source-of-truth for all animation durations and easing curves.
 * CSS variables are set in index.css; these TS constants mirror them for JS-driven animations.
 *
 * GOLDEN RULE: Motion must be FELT, not WAITED FOR.
 * No animation blocks, delays, or queues a user action.
 */

// ─── Durations (ms) ─────────────────────────────────────────────────────────
export const DUR = {
  instant: 80,    // press, toggle, checkbox, chip
  micro:   120,   // small UI: dropdown, tooltip, tab indicator, input focus
  small:   160,   // card/list-item enter, badge change
  medium:  220,   // modal, sheet, page transition
  large:   320,   // success check, number tween start
  number:  600,   // AnimatedNumber RAF tween
} as const;

// ─── Easing (CSS cubic-bezier strings) ───────────────────────────────────────
export const EASE = {
  enter:      'cubic-bezier(0.16, 1, 0.3, 1)',    // fast-out slow-in (Expo ease-out)
  exit:       'cubic-bezier(0.4, 0, 1, 1)',         // ease-in (Quart)
  standard:   'cubic-bezier(0.4, 0, 0.2, 1)',       // Material standard
  press:      'cubic-bezier(0.2, 0, 0, 1)',          // immediate snap
  spring:     'cubic-bezier(0.34, 1.4, 0.64, 1)',   // slight overshoot for spring feel
  decelerate: 'cubic-bezier(0, 0, 0.2, 1)',          // ease-out (entering screen)
} as const;

// ─── Stagger ─────────────────────────────────────────────────────────────────
export const STAGGER = {
  step: 35,      // ms between each staggered child
  maxItems: 8,   // only first N items get stagger — beyond this instant
} as const;

// ─── Motion Tiers ────────────────────────────────────────────────────────────
export type MotionTier = 'full' | 'reduced' | 'none';
