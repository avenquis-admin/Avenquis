/**
 * Avenquis Control Panel - Premium Motion System & Interaction Constants
 * 
 * Elegant, subtle, professional, smooth, premium SaaS motion direction.
 * GPU-friendly (opacity & transform), strict ease-out curves, no bounce or gaming effects.
 * Honors prefers-reduced-motion automatically.
 */

import { useReducedMotion } from 'motion/react';

// Refined cubic-bezier curve (Fast initial response, buttery smooth deceleration)
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.4, 0, 0.2, 1] as const;

// Transition durations in seconds
export const DURATION = {
  instant: 0.12,
  micro: 0.18,       // 150-220ms: buttons, chips, row hovers
  card: 0.24,        // 200-300ms: cards, dropdowns, menus
  modal: 0.28,       // 250-350ms: dialogs, drawers
  page: 0.38,        // 300-450ms: page entrance, major sections
} as const;

// Standard page entrance variants (soft fade + 10-12px upward slide)
export const pageEntranceVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.page,
      ease: EASE_OUT,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.18,
      ease: 'easeIn',
    },
  },
};

// Staggered section container (avoids animating every small child, staggers major blocks)
export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.03,
    },
  },
};

export const staggerItemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32,
      ease: EASE_OUT,
    },
  },
};

// Modal dialog variants
export const modalBackdropVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.22, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.16, ease: 'easeIn' },
  },
};

export const modalPanelVariants = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: DURATION.modal, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    y: 4,
    transition: { duration: 0.16, ease: 'easeIn' },
  },
};

// Slide-over drawer variants (slides in from right)
export const drawerPanelVariants = {
  hidden: { x: '100%', opacity: 0.7 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.32, ease: EASE_OUT },
  },
  exit: {
    x: '100%',
    opacity: 0.7,
    transition: { duration: 0.24, ease: 'easeInOut' },
  },
};

// Mobile sidebar slide-in from left
export const mobileSidebarVariants = {
  hidden: { x: -280, opacity: 0.8 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.28, ease: EASE_OUT },
  },
  exit: {
    x: -280,
    opacity: 0.8,
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
};

// Dropdown / Popover scale-in
export const dropdownVariants = {
  hidden: { opacity: 0, scale: 0.96, y: -4 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.18, ease: EASE_OUT },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: -2,
    transition: { duration: 0.14, ease: 'easeIn' },
  },
};

// Hook to check for reduced motion
export function useIsReducedMotion(): boolean {
  const shouldReduce = useReducedMotion();
  return Boolean(shouldReduce);
}
