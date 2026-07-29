import { useReducedMotion as useFramerReducedMotion } from 'framer-motion';
import type { Transition, Variants } from 'framer-motion';

/** Respects `prefers-reduced-motion`; defaults to false when unset. */
export function useReducedMotion(): boolean {
  return useFramerReducedMotion() ?? false;
}

const easeOut = [0.22, 1, 0.36, 1] as const;

export const transitions = {
  fast: { duration: 0.15, ease: easeOut } satisfies Transition,
  page: { duration: 0.22, ease: easeOut } satisfies Transition,
  sidebar: { duration: 0.2, ease: easeOut } satisfies Transition,
} as const;

export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 4 },
};

export const staggerContainerVariants: Variants = {
  animate: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

/** Returns static variants when reduced motion is preferred. */
export function motionSafe<T extends Variants>(variants: T, reduced: boolean): T | undefined {
  return reduced ? undefined : variants;
}
