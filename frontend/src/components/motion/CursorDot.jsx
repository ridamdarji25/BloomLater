import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * A subtle cursor-following dot decoration in the hero section.
 * Renders a small circle that lags behind the actual cursor.
 */
export default function CursorDot() {
  const dotRef = useRef(null);
  const posRef = useRef({ x: -100, y: -100 });
  const animRef = useRef(null);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (shouldReduce) return;

    const dot = dotRef.current;
    if (!dot) return;

    const onMove = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', onMove, { passive: true });

    let currentX = -100;
    let currentY = -100;

    const animate = () => {
      // Lerp toward real cursor position (lag effect)
      currentX += (posRef.current.x - currentX) * 0.12;
      currentY += (posRef.current.y - currentY) * 0.12;
      dot.style.transform = `translate(${currentX - 8}px, ${currentY - 8}px)`;
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMove);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [shouldReduce]);

  if (shouldReduce) return null;

  return (
    <div
      ref={dotRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[9999] w-4 h-4 rounded-full
                 border border-rust-500/60 mix-blend-multiply will-change-transform"
      style={{ transition: 'opacity 0.2s' }}
    />
  );
}
