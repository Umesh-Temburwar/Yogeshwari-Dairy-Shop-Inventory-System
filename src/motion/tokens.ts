/**
 * Motion Design Tokens & Constants
 * Yogeshwari Dairy Shop ERP / POS
 * 
 * Strict Budget:
 * - Pure GPU properties (transform, opacity)
 * - Maximum stagger: 8 items (<= 280ms total)
 * - Durations strictly under limits
 */

export const MOTION_DURATIONS = {
  instant: 100, // press, toggle, checkbox, chip (80-120ms)
  small: 150,   // dropdown, tab indicator, input focus (120-180ms)
  medium: 220,  // card/list enter, modal enter, toast (180-260ms)
  pageEnter: 180, // route enter (<= 200ms)
  pageExit: 100,  // route exit (<= 120ms)
  number: 350,  // counter / price number tween
  shimmer: 1600 // skeleton shimmer cycle (1.4-1.8s)
} as const;

export const MOTION_EASINGS = {
  // Snappy enter for newly mounted elements (modals, pages, popovers)
  enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
  // Accelerating fast exit
  exit: 'cubic-bezier(0.4, 0, 1, 1)',
  // Balanced state changes between positions
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
  // Tactile press curve
  press: 'cubic-bezier(0.2, 0, 0, 1)',
  // Critically damped spring (toasts only, no visible overshoot)
  spring: 'cubic-bezier(0.34, 1.4, 0.64, 1)'
} as const;

export const MOTION_DISTANCES = {
  entranceDesktopY: 6,
  entranceMobileY: 4,
  modalInitialScale: 0.97,
  buttonPressScale: 0.97,
  cardPressScale: 0.985,
  staggerStepMs: 35,
  staggerMaxItems: 8,
  staggerMaxWindowMs: 280
} as const;

/**
 * Standardized reusable Tailwind utility classes for tactile interaction
 */
export const MOTION_CLASSES = {
  // Tactile press on buttons with zero hover jank on touch
  buttonPress: 'transition-transform duration-100 ease-out active:scale-[0.97]',
  // Subtle card press
  cardPress: 'transition-transform duration-100 ease-out active:scale-[0.985]',
  // Fine pointer hover lift (disabled on mobile touch devices via @media (hover: hover))
  cardHover: 'hover:translate-y-[-1.5px] transition-all duration-150 ease-out',
  // Smooth tab indicator
  tabIndicator: 'transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]',
  // High-visibility focus ring
  focusRing: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 transition-shadow duration-150',
  // Non-blocking content cross-fade
  contentFade: 'transition-opacity duration-150 ease-out'
} as const;
