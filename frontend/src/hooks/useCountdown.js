import { useState, useEffect, useRef } from 'react';

/**
 * Live countdown hook. Returns time parts updated every second.
 * @param {Date | string | number} targetDate
 * @returns {{ days: number, hours: number, minutes: number, seconds: number, isPast: boolean, totalMs: number }}
 */
export function useCountdown(targetDate) {
  const calculateDiff = () => {
    const target = new Date(targetDate).getTime();
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, totalMs: 0 };
    }
    const totalSeconds = Math.floor(diff / 1000);
    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      isPast: false,
      totalMs: diff,
    };
  };

  const [time, setTime] = useState(calculateDiff);
  const intervalRef = useRef(null);

  useEffect(() => {
    setTime(calculateDiff());
    intervalRef.current = setInterval(() => {
      const next = calculateDiff();
      setTime(next);
      if (next.isPast) clearInterval(intervalRef.current);
    }, 1000);

    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate]);

  return time;
}
