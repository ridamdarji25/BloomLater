import { useCountdown } from '@/hooks/useCountdown';
import { clsx } from 'clsx';

function TimeUnit({ value, label, className }) {
  const padded = String(value).padStart(2, '0');
  return (
    <div className={clsx('flex flex-col items-center gap-1', className)}>
      <span className="font-mono font-medium text-4xl sm:text-5xl tabular-nums leading-none">
        {padded}
      </span>
      <span className="font-mono text-label-sm uppercase tracking-wider opacity-50">
        {label}
      </span>
    </div>
  );
}

function Separator({ className }) {
  return (
    <span className={clsx('font-mono text-3xl sm:text-4xl font-light opacity-30 pb-5', className)}>:</span>
  );
}

/**
 * Large countdown display for the capsule detail page.
 */
export default function CapsuleCountdown({ unlockAt, className }) {
  const { days, hours, minutes, seconds, isPast } = useCountdown(unlockAt);

  if (isPast) {
    return (
      <div className={clsx('text-center', className)}>
        <p className="font-display font-bold text-3xl text-olive-500">Ready to open</p>
        <p className="font-mono text-label-md text-ink-600 mt-2 uppercase tracking-wider">
          The wait is over
        </p>
      </div>
    );
  }

  return (
    <div className={clsx('flex items-end justify-center gap-4 sm:gap-6', className)}>
      <TimeUnit value={days} label="Days" />
      <Separator />
      <TimeUnit value={hours} label="Hours" />
      <Separator />
      <TimeUnit value={minutes} label="Min" />
      <Separator />
      <TimeUnit value={seconds} label="Sec" />
    </div>
  );
}
