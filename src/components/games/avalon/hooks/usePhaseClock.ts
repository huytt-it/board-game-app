'use client';

import { useEffect, useState } from 'react';
import { serverNow } from '@/lib/serverClock';
import { PHASE_TIMEOUTS_MS, type AvalonGameState } from '../types';

export interface PhaseClock {
  /** Server time, refreshed every second. */
  now: number;
  /** Milliseconds since the current phase started. */
  elapsed: number;
  /** Milliseconds left until the phase times out (never negative). */
  remaining: number;
}

// Countdown for the current phase on the shared server clock (not the device
// clock), so every player sees the same number. Ticks once per second.
export function usePhaseClock(
  state: AvalonGameState,
  timeoutMs: number = PHASE_TIMEOUTS_MS[state.phase]
): PhaseClock {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = now - (state.phaseStartedAt ?? now);
  const remaining = Math.max(0, timeoutMs - elapsed);
  return { now, elapsed, remaining };
}

/** `m:ss`, rounded down — e.g. 61_900 → "1:01". */
export function formatClock(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** `Ns`, rounded up — e.g. 29_100 → "30s". */
export function formatSecs(ms: number): string {
  return `${Math.ceil(ms / 1000)}s`;
}
