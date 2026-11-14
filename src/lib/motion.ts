import { Variants, Transition } from 'motion/react';

// Transition presets optimized for 60fps on mobile Android WebView (GPU composite-only)
export const transitionFast: Transition = {
  duration: 0.16,
  ease: [0.16, 1, 0.3, 1] // Snappy ease-out
};

export const transitionSpring: Transition = {
  type: 'spring',
  damping: 28,
  stiffness: 320,
  mass: 0.8
};

export const transitionDrawer: Transition = {
  duration: 0.22,
  ease: [0.25, 1, 0.5, 1]
};

// Route & view transitions (fade + 8px slide-up)
export const fadeSlideVariants: Variants = {
  initial: {
    opacity: 0,
    y: 8
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitionFast
  },
  exit: {
    opacity: 0,
    y: -4,
    transition: { duration: 0.12, ease: 'easeIn' }
  }
};

// Backdrop overlay fade
export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.12 } }
};

// Desktop modal scale-in
export const modalScaleVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.98,
    y: 4
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitionFast
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 4,
    transition: { duration: 0.12, ease: 'easeIn' }
  }
};

// Mobile bottom-sheet slide up with spring
export const sheetUpVariants: Variants = {
  initial: {
    y: '100%',
    opacity: 0.9
  },
  animate: {
    y: 0,
    opacity: 1,
    transition: transitionSpring
  },
  exit: {
    y: '100%',
    opacity: 0.9,
    transition: { duration: 0.18, ease: [0.32, 0, 0.67, 0] }
  }
};

// Mobile sidebar drawer from left
export const drawerLeftVariants: Variants = {
  initial: {
    x: '-100%'
  },
  animate: {
    x: 0,
    transition: transitionDrawer
  },
  exit: {
    x: '-100%',
    transition: { duration: 0.18, ease: 'easeInOut' }
  }
};

// POS cart item insertion and removal (height collapse on exit)
export const cartItemVariants: Variants = {
  initial: {
    opacity: 0,
    x: 16,
    scale: 0.98
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.15, ease: 'easeOut' }
  },
  exit: {
    opacity: 0,
    height: 0,
    marginBottom: 0,
    paddingTop: 0,
    paddingBottom: 0,
    overflow: 'hidden',
    transition: { duration: 0.14, ease: 'easeInOut' }
  }
};

// Pop badge or micro-interaction
export const popVariants: Variants = {
  initial: { scale: 0.9, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: { duration: 0.14 } },
  exit: { scale: 0.9, opacity: 0, transition: { duration: 0.1 } }
};

// Toast notification slide-down
export const toastVariants: Variants = {
  initial: { opacity: 0, y: -16, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: transitionFast },
  exit: { opacity: 0, y: -12, scale: 0.96, transition: { duration: 0.12 } }
};
