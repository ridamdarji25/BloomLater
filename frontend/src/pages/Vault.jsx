import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import CapsuleCard from '@/components/capsule/CapsuleCard';
import ScrollReveal from '@/components/motion/ScrollReveal';
import { useAuth } from '@/hooks/useAuth';
import apiClient from '@/lib/apiClient';
import { clsx } from 'clsx';

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'sealed', label: 'Sealed' },
  { value: 'unlockable', label: 'Ready to open' },
  { value: 'opened', label: 'Opened' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'unlockSoon', label: 'Unlocking soon' },
];

function useCapsules({ page, status, sort }) {
  return useQuery({
    queryKey: ['capsules', { page, status, sort }],
    queryFn: async () => {
      const res = await apiClient.get('/capsules', {
        params: { page, status, sort, limit: 12 },
      });
      return res.data.data;
    },
    keepPreviousData: true,
  });
}

function useCapsuleStats() {
  return useQuery({
    queryKey: ['capsuleStats'],
    queryFn: async () => {
      const res = await apiClient.get('/capsules/stats');
      return res.data.data.stats;
    },
  });
}

function StatsBar({ stats }) {
  if (!stats) return null;
  const items = [
    { label: 'Total Capsules', value: stats.total },
    { label: 'Sealed', value: stats.sealed },
    { label: 'Ready to Open', value: stats.unlockable },
    { label: 'Opened', value: stats.opened },
  ];
  return (
    <div className="flex flex-wrap gap-8 mb-10 p-6 bg-cream-100/60 rounded-2xl border border-ink-900/10">
      {items.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-0.5">
          <span className="font-display font-extrabold text-3xl text-ink-900">{value}</span>
          <span className="font-body font-medium text-sm text-ink-600">{label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Vault() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useCapsules({ page, status: statusFilter, sort });
  const { data: stats } = useCapsuleStats();

  const capsules = data?.capsules || [];
  const pagination = data?.pagination;

  const handleFilterChange = (value) => {
    setStatusFilter(value);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-cream-200 pt-24 pb-20">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-10">
        {/* Header */}
        <div className="mb-10 pt-4">
          <h1 className="text-display-lg font-display font-extrabold text-ink-900 mb-2">
            {user?.displayName ? `${user.displayName}'s Vault` : 'My Vault'}
          </h1>
          <p className="font-serif italic text-ink-700/80 text-xl">
            every sealed moment, waiting
          </p>
        </div>

        <StatsBar stats={stats} />

        {/* Filters + controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          {/* Status filter pills */}
          <div
            role="group"
            aria-label="Filter by status"
            className="flex flex-wrap gap-2"
          >
            {STATUS_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => handleFilterChange(value)}
                aria-pressed={statusFilter === value}
                className={clsx(
                  'font-body text-sm font-semibold px-4 py-2 rounded-full border transition-all duration-200',
                  statusFilter === value
                    ? 'bg-ink-900 text-cream-200 border-ink-900'
                    : 'border-ink-900/20 text-ink-800 hover:border-ink-900/40 bg-cream-100/50'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Sort + New capsule */}
          <div className="flex items-center gap-3">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="font-body text-sm font-medium bg-cream-100/50 border border-ink-900/20 rounded-xl px-3.5 py-2 text-ink-800 focus:outline-none focus:border-rust-500"
              aria-label="Sort capsules"
            >
              {SORT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <Link to="/create" className="btn-rust btn-sm font-semibold">
              + New Capsule
            </Link>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-auto-fill-md gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 rounded-2xl bg-ink-900/5 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-20">
            <p className="font-body text-ink-700 mb-4">Failed to load capsules.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-ghost btn-sm"
            >
              Retry
            </button>
          </div>
        ) : capsules.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24 border-2 border-dashed border-ink-900/10 rounded-3xl"
          >
            <p className="font-display font-bold text-2xl text-ink-900 mb-2">
              {statusFilter === 'all' ? 'Your vault is empty' : `No ${statusFilter} capsules`}
            </p>
            <p className="font-serif italic text-ink-600 mb-8">
              the right moment to begin is always now
            </p>
            <Link to="/create" className="btn-rust">
              Seal your first capsule
            </Link>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <motion.div
              layout
              className="grid grid-auto-fill-md gap-4"
            >
              {capsules.map((capsule, i) => (
                <ScrollReveal key={capsule._id} delay={i * 0.05}>
                  <CapsuleCard capsule={capsule} />
                </ScrollReveal>
              ))}
            </motion.div>
          </AnimatePresence>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12" role="navigation" aria-label="Pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost btn-sm disabled:opacity-40"
              aria-label="Previous page"
            >
              ← Prev
            </button>
            <span className="font-mono text-label-sm text-ink-600">
              {page} / {pagination.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="btn-ghost btn-sm disabled:opacity-40"
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
