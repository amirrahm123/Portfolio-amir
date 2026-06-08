import type { Variants } from 'framer-motion';

// Shared, restrained motion primitives. Small offsets, soft easing, once-only.
// All consumed through <Reveal>, which also honours prefers-reduced-motion.

const EASE = [0.22, 1, 0.36, 1] as const;

/** Container that staggers its direct <Reveal> children on scroll-in. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

/** Gentle fade + small upward drift. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: EASE },
  },
};

/** No-movement variant used when the user prefers reduced motion. */
export const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.3, ease: EASE } },
};

/** Standard whileInView viewport config: trigger once, a bit before fully in. */
export const inViewport = { once: true, amount: 0.25, margin: '0px 0px -10% 0px' } as const;
