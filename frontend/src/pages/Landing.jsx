import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SectionWrapper from '@/components/layout/SectionWrapper';
import ScrollReveal from '@/components/motion/ScrollReveal';
import CursorDot from '@/components/motion/CursorDot';
import Footer from '@/components/layout/Footer';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/apiClient';

// Live capsule count from server (public stat)
function useTotalCapsules() {
  return useQuery({
    queryKey: ['publicStats'],
    queryFn: async () => {
      // We don't expose a public stats endpoint, so we use a fixed demo number
      // In production, add GET /api/stats/public
      return { total: 2847, today: 12 };
    },
    staleTime: Infinity,
  });
}

const FEATURES = [
  {
    title: 'Write & Seal',
    body: 'Compose a message — a letter to your future self, a wish for someone you love, a prediction about the world. Set a date. Seal it.',
  },
  {
    title: 'Cryptologically Locked',
    body: 'Your capsule\'s content is withheld at the server level until the unlock date. No peeking, not even by the platform.',
  },
  {
    title: 'Open When Ready',
    body: 'On the unlock date, break the seal. A cinematic reveal. Read what you — or someone else — wrote in a different moment of time.',
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col">
      <CursorDot />

      {/* ─── 01 / HERO (Cream Block) ─────────────────────────────────────────── */}
      <SectionWrapper accent="cream" id="hero">
        <div className="px-6 sm:px-10 lg:px-16 py-24 sm:py-32 flex flex-col justify-center max-w-7xl mx-auto w-full">
          <div className="max-w-4xl">
            <motion.h1
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
              className="text-display-2xl font-display font-extrabold text-ink-900 leading-[0.98] tracking-tight mb-6"
            >
              Write today.
              <br />
              <span className="text-rust-500">Open tomorrow.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="serif-accent text-2xl sm:text-3xl text-ink-800 mb-8 max-w-2xl"
            >
              sealed until the future is ready
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="font-body text-lg text-ink-700 max-w-xl mb-10 leading-relaxed text-pretty"
            >
              BloomLater is a digital time capsule. Seal a message with a future unlock date.
              It stays cryptographically locked until that moment arrives — then reveals itself with a cinematic opening.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="flex flex-wrap gap-4"
            >
              {isAuthenticated ? (
                <>
                  <Link to="/create" className="btn-rust btn-lg">
                    Seal a capsule
                  </Link>
                  <Link to="/vault" className="btn-ghost btn-lg">
                    My vault
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/register" className="btn-rust btn-lg">
                    Start for free
                  </Link>
                  <Link to="/login" className="btn-ghost btn-lg">
                    Sign in
                  </Link>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </SectionWrapper>

      {/* ─── 02 / HOW IT WORKS (Ink Block) ───────────────────────────────────── */}
      <SectionWrapper accent="ink" id="how-it-works">
        <div className="px-6 sm:px-10 lg:px-16 py-24 sm:py-32 max-w-7xl mx-auto w-full flex flex-col justify-center">
          <ScrollReveal className="mb-16">
            <h2 className="text-display-xl text-cream-200 font-display font-extrabold">
              Three steps.<br />
              <span className="text-rust-500">One moment preserved.</span>
            </h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={f.title} delay={i * 0.12} className="h-full">
                <div className="border border-cream-200/15 bg-ink-900/50 rounded-2xl p-8 h-full min-h-[260px] flex flex-col justify-between hover:border-cream-200/30 transition-colors duration-300">
                  <div>
                    <h3 className="font-display font-bold text-2xl text-cream-200 mb-4">
                      {f.title}
                    </h3>
                    <p className="font-body text-cream-200/70 text-base leading-relaxed text-pretty">
                      {f.body}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </SectionWrapper>

      {/* ─── 03 / THE VAULT (Rust Block) ─────────────────────────────────────── */}
      <SectionWrapper accent="rust" id="vault-preview">
        <div className="px-6 sm:px-10 lg:px-16 py-24 sm:py-32 max-w-7xl mx-auto w-full flex flex-col justify-center">
          <div className="flex flex-col lg:flex-row lg:items-center gap-12 lg:gap-20">
            <ScrollReveal className="lg:flex-1">
              <h2 className="text-display-xl font-display font-extrabold text-cream-200 mb-6">
                Every capsule.<br />Exactly on time.
              </h2>
              <p className="font-body text-cream-200/80 text-lg leading-relaxed max-w-md text-pretty mb-10">
                Your vault keeps all your sealed capsules organized. Watch countdowns tick in real time.
                Get notified the moment a capsule becomes ready to open.
              </p>
              <Link
                to={isAuthenticated ? '/vault' : '/register'}
                className="btn bg-cream-200 text-ink-900 hover:bg-cream-100 btn-lg font-semibold"
              >
                {isAuthenticated ? 'Open my vault' : 'Create your vault'}
              </Link>
            </ScrollReveal>

            {/* Mini preview card */}
            <ScrollReveal delay={0.2} className="lg:flex-1">
              <div className="bg-ink-900 rounded-2xl p-8 max-w-md mx-auto lg:mx-0 shadow-2xl border border-cream-200/10">
                <div className="flex items-center justify-between mb-6">
                  <span className="font-body font-semibold text-sm text-cream-200/80">Digital Time Capsule</span>
                  <span className="px-3 py-1 rounded-full bg-cream-200 text-ink-900 font-body font-bold text-xs uppercase tracking-wider">
                    SEALED
                  </span>
                </div>
                <h4 className="font-display font-bold text-cream-200 text-xl mb-4">
                  A letter to my future self
                </h4>
                <p className="font-display text-4xl font-extrabold text-cream-200 mb-2 tabular-nums">
                  365d 0h 0m
                </p>
                <p className="font-body text-sm text-cream-200/60 mb-6">
                  Unlocks Sep 4, 2027
                </p>
                <div className="progress-track text-cream-200">
                  <div className="progress-fill bg-cream-200" style={{ width: '0%' }} />
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </SectionWrapper>

      {/* ─── 04 / ABOUT (Cream Block) ────────────────────────────────────────── */}
      <SectionWrapper accent="cream" id="about">
        <div className="px-6 sm:px-10 lg:px-16 py-24 sm:py-32 max-w-7xl mx-auto w-full flex flex-col justify-center">
          <div className="max-w-3xl">
            <ScrollReveal>
              <h2 className="text-display-lg font-display font-extrabold text-ink-900 mb-8">
                Some thoughts need time<br />to become true.
              </h2>
              <p className="serif-accent text-2xl mb-8 leading-relaxed text-ink-900">
                "the most honest letter you'll ever write is the one you seal today and forget about."
              </p>
              <div className="space-y-5 text-ink-700 text-lg leading-relaxed font-body text-pretty">
                <p>
                  BloomLater was built for the thoughts that don't belong in the present.
                  The wish you have for your child on their 18th birthday. The prediction about where
                  technology will be in five years. The promise you want to keep — to yourself.
                </p>
                <p>
                  A time capsule isn't just a record. It's a conversation between who you are now
                  and who you'll become. BloomLater makes that conversation possible.
                </p>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.15} className="mt-12">
              <Link to="/register" className="btn-primary btn-lg">
                Write your first capsule
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </SectionWrapper>

      {/* ─── 05 / CTA (Olive/Green Block - Equal Height) ──────────────────────── */}
      <SectionWrapper accent="olive" id="cta">
        <div className="px-6 sm:px-10 lg:px-16 py-24 sm:py-32 text-center max-w-7xl mx-auto w-full flex flex-col justify-center items-center">
          <ScrollReveal>
            <h2 className="text-display-xl font-display font-extrabold text-cream-200 mb-6">
              Begin sealing<br />memories today.
            </h2>
            <p className="serif-accent text-2xl text-cream-200/90 mb-12">
              bloom later. always on time.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register" className="btn bg-cream-200 text-ink-900 hover:bg-cream-100 btn-lg font-semibold">
                Create a free account
              </Link>
              <Link to="/login" className="btn border border-cream-200/40 text-cream-200 hover:bg-cream-200/10 btn-lg">
                Sign in
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </SectionWrapper>

      <Footer />
    </div>
  );
}
