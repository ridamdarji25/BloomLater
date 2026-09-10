import { Link } from 'react-router-dom';
import { clsx } from 'clsx';
import { useCountdown } from '@/hooks/useCountdown';
import { formatCountdown, calcProgress, formatDate } from '@/utils/formatters';

const STATUS_CONFIG = {
  sealed: {
    pillClass: 'px-3 py-1 rounded-full bg-cream-200 text-ink-900 font-body font-bold text-xs uppercase tracking-wide flex items-center gap-1.5',
    label: 'SEALED',
    dot: 'bg-ink-900',
    cardBg: 'bg-ink-900',
    textColor: 'text-cream-200',
    subColor: 'text-cream-200/70',
    tagColor: 'bg-cream-200/10 text-cream-200/90 border-cream-200/20',
    barColor: 'bg-cream-200',
  },
  unlockable: {
    pillClass: 'px-3 py-1 rounded-full bg-ink-900 text-cream-200 font-body font-bold text-xs uppercase tracking-wide flex items-center gap-1.5',
    label: 'READY',
    dot: 'bg-cream-200',
    cardBg: 'bg-mustard-500',
    textColor: 'text-ink-900',
    subColor: 'text-ink-900/75',
    tagColor: 'bg-ink-900/10 text-ink-900 border-ink-900/20',
    barColor: 'bg-ink-900',
  },
  opened: {
    pillClass: 'px-3 py-1 rounded-full bg-cream-200 text-ink-900 font-body font-bold text-xs uppercase tracking-wide flex items-center gap-1.5',
    label: 'OPENED',
    dot: 'bg-ink-900',
    cardBg: 'bg-olive-500',
    textColor: 'text-cream-200',
    subColor: 'text-cream-200/80',
    tagColor: 'bg-cream-200/10 text-cream-200/90 border-cream-200/20',
    barColor: 'bg-cream-200',
  },
};

function CountdownDisplay({ unlockAt, status, textColor, subColor }) {
  const countdown = useCountdown(unlockAt);

  if (status !== 'sealed') {
    return (
      <p className={clsx('font-body text-base font-medium mt-2', subColor)}>
        {status === 'unlockable' ? 'Ready to open' : 'Opened'}
      </p>
    );
  }

  return (
    <p className={clsx('font-display text-3xl font-bold mt-2 tabular-nums', textColor)}>
      {formatCountdown(countdown)}
    </p>
  );
}

export default function CapsuleCard({ capsule }) {
  const config = STATUS_CONFIG[capsule.status] || STATUS_CONFIG.sealed;
  const progress = calcProgress(capsule.createdAt, capsule.unlockAt);

  return (
    <Link
      to={`/capsule/${capsule._id}`}
      className={clsx('capsule-card rounded-2xl block transition-transform duration-200 hover:-translate-y-1', config.cardBg)}
      aria-label={`View capsule: ${capsule.title}`}
    >
      <article className="p-6 flex flex-col h-full min-h-[230px]">
        {/* Top row: status pill */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <span className="font-body text-sm font-semibold opacity-70">Digital Time Capsule</span>
          <span className={config.pillClass}>
            <span className={clsx('w-1.5 h-1.5 rounded-full', config.dot)} aria-hidden="true" />
            {config.label}
          </span>
        </div>

        {/* Title */}
        <h3
          className={clsx('font-display font-bold text-xl leading-snug truncate-2 flex-1 min-w-0 mb-2', config.textColor)}
          title={capsule.title}
        >
          {capsule.title}
        </h3>

        {/* Countdown / status */}
        <CountdownDisplay
          unlockAt={capsule.unlockAt}
          status={capsule.status}
          textColor={config.textColor}
          subColor={config.subColor}
        />

        {/* Unlock date */}
        <p className={clsx('font-body text-sm mt-1 font-medium', config.subColor)}>
          {capsule.status === 'sealed' ? 'Unlocks ' : 'Unlocked '}
          {formatDate(capsule.unlockAt)}
        </p>

        {/* Progress bar */}
        <div className="mt-4">
          <div className={clsx('progress-track', config.textColor)}>
            <div
              className={clsx('progress-fill', config.barColor)}
              style={{ width: `${progress}%` }}
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${progress}% of time elapsed`}
            />
          </div>
        </div>

        {/* Tags */}
        {capsule.tags && capsule.tags.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-hidden">
            {capsule.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={clsx(
                  'font-body text-xs font-medium px-2.5 py-0.5 rounded-full border shrink-0 max-w-[100px] truncate',
                  config.tagColor
                )}
                title={tag}
              >
                {tag}
              </span>
            ))}
            {capsule.tags.length > 3 && (
              <span className={clsx('font-body text-xs font-semibold self-center', config.subColor)}>
                +{capsule.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </article>
    </Link>
  );
}

