import { motion, useReducedMotion } from 'framer-motion';
import type { ElementType, ReactNode } from 'react';
import { fadeOnly, fadeUp, inViewport, staggerContainer } from '../../lib/motion';

type Tag = 'div' | 'section' | 'article' | 'li' | 'ul' | 'p' | 'span' | 'h2' | 'header' | 'footer';

interface RevealProps {
  children: ReactNode;
  as?: Tag;
  className?: string;
  /** extra delay in seconds (e.g. to offset a single element) */
  delay?: number;
}

/**
 * Standalone fade-up that triggers once as it scrolls into view.
 * Collapses to a plain fade when prefers-reduced-motion is set.
 */
export function Reveal({ children, as = 'div', className, delay = 0 }: RevealProps) {
  const reduce = useReducedMotion();
  const Comp = motion[as] as ElementType;
  const variants = reduce ? fadeOnly : fadeUp;

  return (
    <Comp
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={inViewport}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </Comp>
  );
}

/**
 * Container that staggers its <StaggerItem> children as the group scrolls in.
 */
export function Stagger({ children, as = 'div', className }: RevealProps) {
  const Comp = motion[as] as ElementType;
  return (
    <Comp
      className={className}
      variants={staggerContainer}
      initial="hidden"
      whileInView="show"
      viewport={inViewport}
    >
      {children}
    </Comp>
  );
}

/** Child of <Stagger>; animation is driven by the parent's timeline. */
export function StaggerItem({ children, as = 'div', className }: RevealProps) {
  const reduce = useReducedMotion();
  const Comp = motion[as] as ElementType;
  return (
    <Comp className={className} variants={reduce ? fadeOnly : fadeUp}>
      {children}
    </Comp>
  );
}
