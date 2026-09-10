import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import apiClient from '@/lib/apiClient';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import CapsuleCountdown from '@/components/capsule/CapsuleCountdown';
import UnlockReveal from '@/components/capsule/UnlockReveal';
import { formatDateTime, formatDate } from '@/utils/formatters';

function useCapsule(id) {
  return useQuery({
    queryKey: ['capsule', id],
    queryFn: async () => {
      const res = await apiClient.get(`/capsules/${id}`);
      return res.data.data.capsule;
    },
    enabled: !!id,
    refetchInterval: (data) => {
      // Refetch every 60s while sealed so status updates reflect cron job
      if (data?.status === 'sealed') return 60_000;
      return false;
    },
  });
}

function useOpenCapsule(id) {
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/capsules/${id}/open`);
      return res.data.data.capsule;
    },
    onSuccess: (capsule) => {
      queryClient.setQueryData(['capsule', id], capsule);
      queryClient.invalidateQueries({ queryKey: ['capsules'] });
      queryClient.invalidateQueries({ queryKey: ['capsuleStats'] });
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || 'Could not open capsule';
      toast.error(msg);
    },
  });
}

function useDeleteCapsule(id) {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async () => {
      await apiClient.delete(`/capsules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['capsules'] });
      queryClient.invalidateQueries({ queryKey: ['capsuleStats'] });
      toast.success('Capsule deleted');
      navigate('/vault');
    },
    onError: () => toast.error('Could not delete capsule'),
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function LockedState({ capsule }) {
  return (
    <div className="text-center py-16 px-6">
      {/* Sealed seal */}
      <div className="inline-flex mb-8">
        <svg width="120" height="120" viewBox="0 0 160 160" fill="none" aria-hidden="true">
          <circle cx="80" cy="80" r="72" fill="#C4541A" />
          <circle cx="80" cy="80" r="58" fill="#A34416" />
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
            <rect key={angle} x="78" y="28" width="4" height="20" rx="2" fill="#C4541A" transform={`rotate(${angle} 80 80)`} />
          ))}
          <text x="80" y="87" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="28" fontWeight="600" fill="#F5F0E8" letterSpacing="-1">bl</text>
        </svg>
      </div>

      <h2 className="font-display font-bold text-2xl text-ink-900 mb-2">
        This capsule is still sealed
      </h2>
      <p className="font-serif italic text-ink-700/60 text-lg mb-10">
        patience is the price of discovery
      </p>

      <CapsuleCountdown unlockAt={capsule.unlockAt} className="mb-10" />

      <p className="font-mono text-label-sm text-ink-600 uppercase tracking-wider">
        Unlocks {formatDateTime(capsule.unlockAt)}
      </p>
    </div>
  );
}

function OpenedContent({ capsule }) {
  return (
    <div>
      <div
        className="font-body text-ink-800 text-base sm:text-lg leading-relaxed whitespace-pre-wrap bg-cream-100 rounded-2xl p-6 sm:p-8 border border-ink-900/8"
        role="region"
        aria-label="Capsule message"
      >
        {capsule.message}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CapsulePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: capsule, isLoading, isError } = useCapsule(id);
  const { mutateAsync: openCapsule, isPending: isOpening } = useOpenCapsule(id);
  const { mutate: deleteCapsule, isPending: isDeleting } = useDeleteCapsule(id);

  const isOwner = user && capsule && capsule.owner?._id === user._id;
  // Also check by userId
  const isOwnerById = user && capsule && (capsule.owner?._id === user._id || capsule.owner === user._id);

  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-200 pt-24 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-ink-900/20 border-t-rust-500 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (isError || !capsule) {
    return (
      <div className="min-h-screen bg-cream-200 pt-24 flex flex-col items-center justify-center gap-4">
        <h1 className="font-display font-bold text-2xl text-ink-900">Capsule not found</h1>
        <p className="font-body text-ink-600">This capsule may have been deleted or doesn't exist.</p>
        <Link to="/vault" className="btn-ghost btn-sm mt-2">← Back to Vault</Link>
      </div>
    );
  }

  const statusConfig = {
    sealed: { pillClass: 'pill-sealed', label: 'SEALED' },
    unlockable: { pillClass: 'pill-unlockable', label: 'READY TO OPEN' },
    opened: { pillClass: 'pill-opened', label: 'OPENED' },
  }[capsule.status];

  return (
    <div className="min-h-screen bg-cream-200 pt-24 pb-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="pt-8 mb-8">
          <Link to="/vault" className="font-mono text-label-sm text-ink-600 hover:text-rust-500 transition-colors uppercase tracking-wider">
            ← Vault
          </Link>
        </div>

        {/* Capsule header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-wrap items-start gap-3 mb-4">
            <span className={statusConfig.pillClass}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {statusConfig.label}
            </span>
            {capsule.tags?.map((tag) => (
              <span key={tag} className="font-mono text-label-sm px-2 py-0.5 rounded border border-ink-900/15 text-ink-600 max-w-[120px] truncate" title={tag}>
                {tag}
              </span>
            ))}
          </div>

          <h1 className="text-display-md font-display font-extrabold text-ink-900 mb-2 leading-tight text-balance">
            {capsule.title}
          </h1>

          <div className="flex flex-wrap gap-x-6 gap-y-1 mt-3">
            <p className="font-mono text-label-sm text-ink-600">
              Created {formatDate(capsule.createdAt)}
            </p>
            <p className="font-mono text-label-sm text-ink-600">
              {capsule.status === 'opened' ? 'Opened ' + formatDate(capsule.openedAt) : 'Unlocks ' + formatDateTime(capsule.unlockAt)}
            </p>
          </div>
        </motion.div>

        {/* Main content area */}
        <div className="bg-cream-100 rounded-3xl border border-ink-900/8 overflow-hidden mb-8">
          <div className="p-6 sm:p-10">
            {capsule.status === 'sealed' && <LockedState capsule={capsule} />}

            {capsule.status === 'unlockable' && (
              <UnlockReveal onOpen={openCapsule} isLoading={isOpening}>
                <OpenedContent capsule={capsule} />
              </UnlockReveal>
            )}

            {capsule.status === 'opened' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="flex items-center gap-3 mb-8 p-4 bg-olive-500/8 border border-olive-500/15 rounded-xl">
                  <div className="w-7 h-7 rounded-full bg-olive-500 flex items-center justify-center shrink-0">
                    <svg className="w-3.5 h-3.5 text-cream-200" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="font-mono text-label-sm text-olive-700 uppercase tracking-wider">
                    Capsule opened · {capsule.openedAt ? formatDate(capsule.openedAt) : 'Today'}
                  </p>
                </div>
                <OpenedContent capsule={capsule} />
              </motion.div>
            )}
          </div>
        </div>

        {/* Actions */}
        {isOwnerById && (
          <div className="flex flex-wrap items-center gap-3">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn-ghost btn-sm text-ink-500 hover:text-rust-500 hover:border-rust-500/30"
              >
                Delete capsule
              </button>
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl border border-rust-500/20 bg-rust-500/5">
                <p className="font-mono text-label-sm text-rust-600">Delete permanently?</p>
                <button
                  onClick={() => deleteCapsule()}
                  disabled={isDeleting}
                  className="btn-sm font-mono text-label-sm bg-rust-500 text-cream-200 rounded-lg px-3 py-1.5 hover:bg-rust-600 transition-colors"
                >
                  {isDeleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="font-mono text-label-sm text-ink-600 hover:text-ink-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
