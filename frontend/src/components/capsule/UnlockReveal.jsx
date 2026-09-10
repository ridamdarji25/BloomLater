import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { clsx } from 'clsx';

/**
 * Wax seal crack → content reveal animation.
 * Stages:
 *   1. Sealed: shows wax seal SVG
 *   2. Cracking: seal animates cracks (CSS stroke-dashoffset)
 *   3. Revealed: content fades in
 *
 * @param {{ onOpen: () => void, isLoading: boolean, children: React.ReactNode }} props
 */
export default function UnlockReveal({ onOpen, isLoading, children }) {
  const [stage, setStage] = useState('sealed'); // 'sealed' | 'cracking' | 'revealed'
  const shouldReduce = useReducedMotion();

  const handleClick = async () => {
    if (isLoading || stage !== 'sealed') return;

    if (shouldReduce) {
      // Skip animation for reduced motion
      await onOpen();
      setStage('revealed');
      return;
    }

    setStage('cracking');
    // Animate crack for 900ms, then call API, then reveal
    setTimeout(async () => {
      await onOpen();
      setStage('revealed');
    }, 900);
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <AnimatePresence mode="wait">
        {stage === 'sealed' && (
          <motion.div
            key="seal"
            initial={{ scale: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeIn' }}
            className="flex flex-col items-center gap-6"
          >
            {/* Wax seal SVG */}
            <div className="relative">
              <svg
                width="160"
                height="160"
                viewBox="0 0 160 160"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-lg"
                aria-hidden="true"
              >
                {/* Outer seal ring */}
                <circle cx="80" cy="80" r="72" fill="#C4541A" />
                {/* Inner circle */}
                <circle cx="80" cy="80" r="58" fill="#A34416" />
                {/* Star/flower pattern */}
                {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                  <rect
                    key={angle}
                    x="78"
                    y="28"
                    width="4"
                    height="20"
                    rx="2"
                    fill="#C4541A"
                    transform={`rotate(${angle} 80 80)`}
                  />
                ))}
                {/* BL monogram */}
                <text
                  x="80"
                  y="87"
                  textAnchor="middle"
                  fontFamily="Georgia, serif"
                  fontStyle="italic"
                  fontSize="28"
                  fontWeight="600"
                  fill="#F5F0E8"
                  letterSpacing="-1"
                >
                  bl
                </text>
              </svg>
            </div>

            <div className="text-center">
              <p className="font-serif italic text-2xl text-ink-900/80 mb-1">
                sealed until the future is ready
              </p>
              <p className="font-mono text-label-md text-ink-600 uppercase tracking-wider">
                This capsule is ready to open
              </p>
            </div>

            <motion.button
              onClick={handleClick}
              disabled={isLoading}
              className="btn-rust btn-lg group"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <span>Break the Seal</span>
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          </motion.div>
        )}

        {stage === 'cracking' && (
          <motion.div
            key="cracking"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Cracking seal */}
            <svg
              width="160"
              height="160"
              viewBox="0 0 160 160"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Seal cracking open"
            >
              <circle cx="80" cy="80" r="72" fill="#C4541A" />
              <circle cx="80" cy="80" r="58" fill="#A34416" />
              <text
                x="80"
                y="87"
                textAnchor="middle"
                fontFamily="Georgia, serif"
                fontStyle="italic"
                fontSize="28"
                fontWeight="600"
                fill="#F5F0E8"
                letterSpacing="-1"
              >
                bl
              </text>
              {/* Crack lines — animated via stroke-dashoffset */}
              {[
                'M80 30 L72 55 L88 65 L75 90',
                'M80 30 L92 60 L76 68 L95 95',
                'M50 60 L70 75 L60 90',
              ].map((d, i) => (
                <motion.path
                  key={i}
                  d={d}
                  stroke="#F5F0E8"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.7 }}
                  transition={{ duration: 0.6, delay: i * 0.15, ease: 'easeOut' }}
                />
              ))}
            </svg>
            <p className="font-mono text-label-md text-ink-600 uppercase tracking-wider animate-pulse-slow">
              Breaking seal…
            </p>
          </motion.div>
        )}

        {stage === 'revealed' && (
          <motion.div
            key="revealed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="w-full"
          >
            {/* Success indicator */}
            <div className="flex items-center gap-3 mb-8 p-4 bg-olive-500/10 border border-olive-500/20 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-olive-500 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-cream-200" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="font-display font-bold text-sm text-olive-600">Capsule Opened</p>
                <p className="font-mono text-label-sm text-ink-600">
                  Sealed until this moment
                </p>
              </div>
            </div>

            {/* The actual content */}
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
