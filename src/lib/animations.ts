/**
 * Unified Animation Variants
 * 
 * Consistent Framer Motion animation presets for the entire app.
 * Import these instead of defining inline animation variants.
 */

import { Variants } from 'framer-motion';

// ============================================
// CONTAINER ANIMATIONS
// ============================================

/**
 * For page-level containers with staggered children
 */
export const containerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

/**
 * For faster container animations (used in modals, dropdowns)
 */
export const containerFastVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

// ============================================
// ITEM ANIMATIONS
// ============================================

/**
 * Standard item animation (fade up)
 */
export const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

/**
 * Fade in only (no movement)
 */
export const fadeInVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
};

/**
 * Slide in from right
 */
export const slideInRightVariants: Variants = {
  hidden: {
    opacity: 0,
    x: 20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

/**
 * Slide in from left
 */
export const slideInLeftVariants: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

/**
 * Scale up animation (for cards, modals)
 */
export const scaleInVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
};

// ============================================
// PAGE ANIMATIONS
// ============================================

/**
 * Page transition animation
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
  },
  enter: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeIn',
    },
  },
};

// ============================================
// HOVER ANIMATIONS (for whileHover)
// ============================================

export const hoverLift = {
  y: -2,
  transition: { type: 'spring', stiffness: 400, damping: 25 },
};

export const hoverScale = {
  scale: 1.02,
  transition: { type: 'spring', stiffness: 400, damping: 25 },
};

export const hoverGlow = {
  boxShadow: '0 0 20px hsl(217 91% 60% / 0.2)',
  transition: { duration: 0.2 },
};

// ============================================
// TAP ANIMATIONS (for whileTap)
// ============================================

export const tapScale = {
  scale: 0.98,
};

// ============================================
// UTILITY ANIMATIONS
// ============================================

/**
 * Shimmer/skeleton loading animation config
 */
export const shimmerTransition = {
  repeat: Infinity,
  duration: 1.5,
  ease: 'linear',
};

/**
 * Pulse animation for attention
 */
export const pulseVariants: Variants = {
  initial: {
    scale: 1,
  },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

// ============================================
// TRANSITION PRESETS
// ============================================

export const transitions = {
  spring: {
    type: 'spring',
    stiffness: 300,
    damping: 24,
  },
  springFast: {
    type: 'spring',
    stiffness: 400,
    damping: 25,
  },
  ease: {
    duration: 0.3,
    ease: 'easeOut',
  },
  easeFast: {
    duration: 0.2,
    ease: 'easeOut',
  },
} as const;
