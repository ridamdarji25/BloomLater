import { formatDistanceToNow, format, differenceInDays, isAfter } from 'date-fns';

/**
 * Format a date for display (e.g. "Sep 4, 2027")
 * @param {Date | string} date
 * @returns {string}
 */
export function formatDate(date) {
  return format(new Date(date), 'MMM d, yyyy');
}

/**
 * Format a date with time (e.g. "Sep 4, 2027 at 3:42 PM")
 * @param {Date | string} date
 * @returns {string}
 */
export function formatDateTime(date) {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

/**
 * Relative time (e.g. "3 months from now", "2 days ago")
 * @param {Date | string} date
 * @returns {string}
 */
export function timeFromNow(date) {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Compact countdown string: "42d 11h 3m"
 * @param {{ days: number, hours: number, minutes: number, seconds: number, isPast: boolean }} countdown
 * @returns {string}
 */
export function formatCountdown({ days, hours, minutes, seconds, isPast }) {
  if (isPast) return 'Ready to open';
  if (days > 365) {
    const years = Math.floor(days / 365);
    const remDays = days % 365;
    return `${years}y ${remDays}d`;
  }
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

/**
 * Progress percent from createdAt → unlockAt (0–100)
 * @param {Date | string} createdAt
 * @param {Date | string} unlockAt
 * @returns {number}
 */
export function calcProgress(createdAt, unlockAt) {
  const total = new Date(unlockAt) - new Date(createdAt);
  if (total <= 0) return 100;
  const elapsed = Date.now() - new Date(createdAt);
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
}

/**
 * Abbreviate a number for display (e.g. 1234 → "1.2k")
 * @param {number} n
 * @returns {string}
 */
export function abbrevNum(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/**
 * Truncate a string to maxLen with ellipsis
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
export function truncate(str, maxLen = 60) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
}

/**
 * Format bytes to human-readable size
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
