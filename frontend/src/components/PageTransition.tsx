import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { pageVariants, transitions, useReducedMotion } from '@/lib/motion';

export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={cn(className)}
      initial={reduced ? false : 'initial'}
      animate="animate"
      exit={reduced ? undefined : 'exit'}
      variants={reduced ? undefined : pageVariants}
      transition={reduced ? { duration: 0 } : transitions.page}
    >
      {children}
    </motion.div>
  );
}
