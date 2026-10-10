'use client';

import { useState, type CSSProperties } from 'react';
import { serverNow } from '@/lib/serverClock';
import type { AvalonGameState } from '../types';
import { usePhaseClock } from '../hooks/usePhaseClock';

// The pulse of the player the Assassin is aiming at: a red ring that beats twice
// ("lub-dub") and fades, over and over — quicker as the Assassin's time runs
// out. The speed is a step function of the phase clock (the same on every
// screen) and the beat itself is lined up with that clock too, so the rings on
// the table beat together. Only `transform` and `opacity` move; the avatar's
// letter is never touched (avalon.css `av-heartbeat`).
export function beatPeriodMs(remainingMs: number): number {
  if (remainingMs > 90_000) return 1400;
  if (remainingMs > 45_000) return 1100;
  if (remainingMs > 15_000) return 850;
  return 600;
}

export default function AimHeartbeat({ state }: { state: AvalonGameState }) {
  const { remaining, elapsed } = usePhaseClock(state);
  const period = beatPeriodMs(remaining);
  // Take the beat's offset when the speed changes, not on every tick: a CSS
  // animation keeps its own time, so it stays in step with the clock between
  // the changes.
  const [beat, setBeat] = useState(() => ({ period, delay: -(Math.max(0, elapsed) % period) }));
  if (beat.period !== period) {
    // Adjusting state while rendering: the beat quickened.
    setBeat({ period, delay: -(Math.max(0, serverNow() - (state.phaseStartedAt ?? serverNow())) % period) });
  }
  return (
    <span
      aria-hidden
      className="av-heartbeat"
      data-heartbeat={beat.period}
      style={{ '--beat': `${beat.period}ms`, animationDelay: `${Math.round(beat.delay)}ms` } as CSSProperties}
    />
  );
}
