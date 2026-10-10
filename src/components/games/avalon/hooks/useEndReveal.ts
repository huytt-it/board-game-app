'use client';

import { useCallback, useState } from 'react';
import { serverNow } from '@/lib/serverClock';
import type { AvalonGameState } from '../types';
import { END } from '../table/timelines';

// The moment R of the end (ms after state.phaseStartedAt) from which the
// table turns the roles over and the end screen tells who won — shared by
// RoundTable and EndSection (table/timelines.ts END).
//
// R = the end of the assassination overlay when the Assassin struck, else 0.
// Tapping the overlay away (`skipOverlay`) brings R forward to that moment on
// this screen only: a decorative, local choice (ux-plan 2.2) — a reload goes
// back to the shared clock, which by then is usually past the overlay anyway.
export function useEndReveal(state: AvalonGameState): {
  revealAt: number;
  /** The Assassin struck: the overlay plays (until skipped). */
  assassination: boolean;
  skipped: boolean;
  skipOverlay: () => void;
} {
  const startedAt = state.phaseStartedAt ?? 0;
  const assassination = state.phase === 'end' && !!state.merlinTargetId;
  const [skip, setSkip] = useState<{ startedAt: number; at: number } | null>(null);
  const skippedAt = assassination && skip?.startedAt === startedAt ? skip.at : null;

  const skipOverlay = useCallback(() => {
    setSkip({ startedAt, at: Math.max(0, Math.round(serverNow() - startedAt)) });
  }, [startedAt]);

  return {
    revealAt: !assassination ? 0 : Math.min(skippedAt ?? END.overlayMs, END.overlayMs),
    assassination,
    skipped: skippedAt !== null,
    skipOverlay,
  };
}
