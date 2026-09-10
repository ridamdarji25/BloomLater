import { motion, useReducedMotion } from 'framer-motion';

const variants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0 },
};

/**
 * Wraps children in a Framer Motion div that fades/slides in once when scrolled into view.
 * Respects prefers-reduced-motion.
 */
export default function ScrollReveal({
  children,
  delay = 0,
  duration = 0.55,
  className = '',
  once = true,
  amount = 0.15,
}) {
  const shouldReduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={shouldReduce ? {} : variants}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}
