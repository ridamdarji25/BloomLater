import { clsx } from 'clsx';
import { motion } from 'framer-motion';

/**
 * Section wrapper with the numbered mono label in the top-left corner.
 * e.g. <SectionWrapper number="01" label="HERO" accent="rust">...</SectionWrapper>
 */
export default function SectionWrapper({
  children,
  accent = 'cream',        // 'cream' | 'ink' | 'rust' | 'olive' | 'mustard'
  className = '',
  id,
}) {
  const bgMap = {
    cream: 'bg-cream-200',
    ink: 'bg-ink-900',
    rust: 'bg-rust-500',
    olive: 'bg-olive-500',
    mustard: 'bg-mustard-500',
  };

  return (
    <section
      id={id}
      className={clsx(bgMap[accent], 'relative w-full overflow-hidden min-h-[80vh] flex flex-col justify-center', className)}
    >
      {/* Section content */}
      <div className="relative z-10 w-full">{children}</div>
    </section>
  );
}

